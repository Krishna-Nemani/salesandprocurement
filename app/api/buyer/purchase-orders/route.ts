import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, POStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Helper function to serialize Decimal values to numbers
function serializePurchaseOrder(po: any): any {
  return {
    ...po,
    discountPercentage: po.discountPercentage ? Number(po.discountPercentage) : null,
    additionalCharges: po.additionalCharges ? Number(po.additionalCharges) : null,
    taxPercentage: po.taxPercentage ? Number(po.taxPercentage) : null,
    totalAmount: Number(po.totalAmount),
    items: po.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })) || [],
  };
}

// GET /api/buyer/purchase-orders - Get all purchase orders for the current buyer company
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user belongs to a BUYER company
    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const statusParam = searchParams.get("status");

    const where: any = {
      buyerCompanyId: session.user.companyId,
    };

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as POStatus;
    }

    if (search) {
      where.OR = [
        { poId: { contains: search, mode: "insensitive" } },
        { sellerCompanyName: { contains: search, mode: "insensitive" } },
        { contract: { contractId: { contains: search, mode: "insensitive" } } },
        { quotation: { quoteId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: true,
        contract: {
          select: {
            contractId: true,
          },
        },
        quotation: {
          select: {
            quoteId: true,
          },
        },
        sellerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize Decimal values to numbers
    const serializedPOs = purchaseOrders.map(serializePurchaseOrder);

    return NextResponse.json(serializedPOs);
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/buyer/purchase-orders - Create a new purchase order
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user belongs to a BUYER company
    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      contractId, // Optional - Contract ID if this is from a contract
      quotationId, // Optional - Quotation ID if this is from a quotation
      poIssuedDate,
      expectedDeliveryDate,
      currency,
      buyerCompanyName,
      buyerContactName,
      buyerEmail,
      buyerPhone,
      buyerAddressType,
      buyerCountry,
      buyerState,
      buyerCity,
      buyerAddress,
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddressType,
      sellerCountry,
      sellerState,
      sellerCity,
      sellerAddress,
      deliveryAddressType,
      deliveryCountry,
      deliveryState,
      deliveryCity,
      deliveryAddress,
      discountPercentage,
      additionalCharges,
      taxPercentage,
      totalAmount,
      paymentTerms,
      deliveryTerms,
      notes,
      signatureByName,
      signatureUrl,
      items,
      selectedSellerId, // Optional - seller company ID if creating standalone PO
    } = body;

    // Validate required fields
    if (!poIssuedDate || !expectedDeliveryDate || !buyerCompanyName || !sellerCompanyName || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: poIssuedDate, expectedDeliveryDate, buyerCompanyName, sellerCompanyName, items" },
        { status: 400 }
      );
    }

    // Validate dates
    const issuedDate = new Date(poIssuedDate);
    const deliveryDate = new Date(expectedDeliveryDate);
    
    if (deliveryDate <= issuedDate) {
      return NextResponse.json(
        { error: "Expected delivery date must be after the PO issued date" },
        { status: 400 }
      );
    }

    // Get buyer's company profile for auto-fill
    const buyerCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      include: {
        addresses: true,
      },
    });

    if (!buyerCompany) {
      return NextResponse.json(
        { error: "Buyer company not found" },
        { status: 404 }
      );
    }

    // Get seller's company ID if selectedSellerId is provided
    let sellerCompanyId: string | null = null;
    if (selectedSellerId) {
      const sellerCompany = await prisma.company.findUnique({
        where: { id: selectedSellerId },
        select: { id: true },
      });
      if (sellerCompany) {
        sellerCompanyId = sellerCompany.id;
      }
    }

    // Get Contract if contractId is provided
    let contract: any = null;
    if (contractId) {
      contract = await prisma.contract.findUnique({
        where: { id: contractId },
        select: { id: true, contractId: true, sellerCompanyId: true, quotationId: true },
      });
      if (!contract) {
        return NextResponse.json(
          { error: "Contract not found" },
          { status: 404 }
        );
      }
      // Use Contract's sellerCompanyId if available
      if (contract.sellerCompanyId && !sellerCompanyId) {
        sellerCompanyId = contract.sellerCompanyId;
      }
    }

    // Get Quotation if quotationId is provided
    let quotation: any = null;
    if (quotationId) {
      quotation = await prisma.quotation.findUnique({
        where: { id: quotationId },
        select: { id: true, quoteId: true, sellerCompanyId: true },
      });
      if (!quotation) {
        return NextResponse.json(
          { error: "Quotation not found" },
          { status: 404 }
        );
      }
      // Use Quotation's sellerCompanyId if available
      if (quotation.sellerCompanyId && !sellerCompanyId) {
        sellerCompanyId = quotation.sellerCompanyId;
      }
    }

    // Generate PO ID
    const companyInitials = buyerCompany.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 3);
    
    const count = await prisma.purchaseOrder.count({
      where: { buyerCompanyId: session.user.companyId },
    });
    const poId = `${companyInitials}PO-${String(count + 1).padStart(3, "0")}`;

    // Create Purchase Order and items in a transaction
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const newPO = await tx.purchaseOrder.create({
        data: {
          poId,
          contractId: contract?.id || null,
          quotationId: quotation?.id || null,
          buyerCompanyId: session.user.companyId,
          sellerCompanyId: sellerCompanyId || null,
          poIssuedDate: issuedDate,
          expectedDeliveryDate: deliveryDate,
          currency: currency || "USD",
          buyerCompanyName,
          buyerContactName: buyerContactName || null,
          buyerEmail: buyerEmail || null,
          buyerPhone: buyerPhone || null,
          buyerAddressType: buyerAddressType || null,
          buyerCountry: buyerCountry || null,
          buyerState: buyerState || null,
          buyerCity: buyerCity || null,
          buyerAddress: buyerAddress || null,
          sellerCompanyName,
          sellerContactName: sellerContactName || null,
          sellerEmail: sellerEmail || null,
          sellerPhone: sellerPhone || null,
          sellerAddressType: sellerAddressType || null,
          sellerCountry: sellerCountry || null,
          sellerState: sellerState || null,
          sellerCity: sellerCity || null,
          sellerAddress: sellerAddress || null,
          deliveryAddressType: deliveryAddressType || null,
          deliveryCountry: deliveryCountry || null,
          deliveryState: deliveryState || null,
          deliveryCity: deliveryCity || null,
          deliveryAddress: deliveryAddress || null,
          discountPercentage: discountPercentage ? parseFloat(discountPercentage) : null,
          additionalCharges: additionalCharges ? parseFloat(additionalCharges) : null,
          taxPercentage: taxPercentage ? parseFloat(taxPercentage) : null,
          totalAmount: parseFloat(totalAmount) || 0,
          paymentTerms: paymentTerms || null,
          deliveryTerms: deliveryTerms || null,
          notes: notes || null,
          signatureByName: signatureByName || null,
          signatureUrl: signatureUrl || null,
          status: POStatus.DRAFT,
        },
      });

      // Create items
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.purchaseOrderItem.createMany({
          data: items.map((item: any, index: number) => ({
            purchaseOrderId: newPO.id,
            serialNumber: index + 1,
            productName: item.productName || "",
            productDescription: item.productDescription || null,
            sku: item.sku || null,
            hsnCode: item.hsnCode || null,
            uom: item.uom || null,
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice) || 0,
            subTotal: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
          })),
        });
      }

      // Return Purchase Order with items
      return await tx.purchaseOrder.findUnique({
        where: { id: newPO.id },
        include: {
          items: true,
          contract: {
            select: {
              contractId: true,
            },
          },
          quotation: {
            select: {
              quoteId: true,
            },
          },
        },
      });
    });

    // Serialize Decimal values to numbers
    const serializedPO = serializePurchaseOrder(purchaseOrder);

    return NextResponse.json(serializedPO, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

