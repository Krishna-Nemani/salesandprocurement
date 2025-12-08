import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, SOStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Helper function to serialize Decimal values to numbers
function serializeSalesOrder(so: any): any {
  return {
    ...so,
    discountPercentage: so.discountPercentage ? Number(so.discountPercentage) : null,
    additionalCharges: so.additionalCharges ? Number(so.additionalCharges) : null,
    taxPercentage: so.taxPercentage ? Number(so.taxPercentage) : null,
    totalAmount: Number(so.totalAmount),
    items: so.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })) || [],
  };
}

// GET /api/seller/sales-orders - Get all sales orders for the current seller company
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user belongs to a SELLER company
    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const statusParam = searchParams.get("status");

    const where: any = {
      sellerCompanyId: session.user.companyId,
    };

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as SOStatus;
    }

    if (search) {
      where.OR = [
        { soId: { contains: search, mode: "insensitive" } },
        { buyerCompanyName: { contains: search, mode: "insensitive" } },
        { purchaseOrder: { poId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where,
      include: {
        items: true,
        purchaseOrder: {
          select: {
            poId: true,
          },
        },
        buyerCompany: {
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
    const serializedSOs = salesOrders.map(serializeSalesOrder);

    return NextResponse.json(serializedSOs);
  } catch (error) {
    console.error("Error fetching sales orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/seller/sales-orders - Create a new sales order
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user belongs to a SELLER company
    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      purchaseOrderId, // Optional - Purchase Order ID if this is from a PO
      soCreatedDate,
      plannedShipDate,
      currency,
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddressType,
      sellerCountry,
      sellerState,
      sellerCity,
      sellerAddress,
      buyerCompanyName,
      buyerContactName,
      buyerEmail,
      buyerPhone,
      buyerAddressType,
      buyerCountry,
      buyerState,
      buyerCity,
      buyerAddress,
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
      selectedBuyerId, // Optional - buyer company ID if creating standalone SO
    } = body;

    // Validate required fields
    if (!soCreatedDate || !plannedShipDate || !sellerCompanyName || !buyerCompanyName || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: soCreatedDate, plannedShipDate, sellerCompanyName, buyerCompanyName, items" },
        { status: 400 }
      );
    }

    // Validate dates
    const createdDate = new Date(soCreatedDate);
    const shipDate = new Date(plannedShipDate);
    
    if (shipDate < createdDate) {
      return NextResponse.json(
        { error: "Planned ship date must be on or after the SO created date" },
        { status: 400 }
      );
    }

    // Get seller's company profile for auto-fill
    const sellerCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      include: {
        addresses: true,
      },
    });

    if (!sellerCompany) {
      return NextResponse.json(
        { error: "Seller company not found" },
        { status: 404 }
      );
    }

    // Get buyer's company ID if selectedBuyerId is provided
    let buyerCompanyId: string | null = null;
    if (selectedBuyerId) {
      const buyerCompany = await prisma.company.findUnique({
        where: { id: selectedBuyerId },
        select: { id: true },
      });
      if (buyerCompany) {
        buyerCompanyId = buyerCompany.id;
      }
    }

    // Get Purchase Order if purchaseOrderId is provided
    let purchaseOrder: any = null;
    if (purchaseOrderId) {
      purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        select: { 
          id: true, 
          poId: true, 
          buyerCompanyId: true, 
          sellerCompanyId: true,
          sellerCompanyName: true,
          status: true 
        },
      });
      if (!purchaseOrder) {
        return NextResponse.json(
          { error: "Purchase order not found" },
          { status: 404 }
        );
      }
      
      // Verify the PO was sent to this seller
      // Check both by sellerCompanyId and by sellerCompanyName (in case PO was sent by name)
      const isOwner =
        purchaseOrder.sellerCompanyId === session.user.companyId ||
        (purchaseOrder.sellerCompanyId === null &&
          sellerCompany &&
          purchaseOrder.sellerCompanyName?.toLowerCase() === sellerCompany.name.toLowerCase());
      
      if (!isOwner) {
        return NextResponse.json(
          { error: "Forbidden: This purchase order was not sent to your company" },
          { status: 403 }
        );
      }
      
      // Use PO's buyerCompanyId if available
      if (purchaseOrder.buyerCompanyId && !buyerCompanyId) {
        buyerCompanyId = purchaseOrder.buyerCompanyId;
      }
    }

    // Generate SO ID
    const companyInitials = sellerCompany.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 3);
    
    const count = await prisma.salesOrder.count({
      where: { sellerCompanyId: session.user.companyId },
    });
    const soId = `${companyInitials}SO-${String(count + 1).padStart(3, "0")}`;

    // Create Sales Order and items in a transaction
    const salesOrder = await prisma.$transaction(async (tx) => {
      const newSO = await tx.salesOrder.create({
        data: {
          soId,
          purchaseOrderId: purchaseOrder?.id || null,
          sellerCompanyId: session.user.companyId,
          buyerCompanyId: buyerCompanyId || null,
          soCreatedDate: createdDate,
          plannedShipDate: shipDate,
          currency: currency || "USD",
          sellerCompanyName,
          sellerContactName: sellerContactName || null,
          sellerEmail: sellerEmail || null,
          sellerPhone: sellerPhone || null,
          sellerAddressType: sellerAddressType || null,
          sellerCountry: sellerCountry || null,
          sellerState: sellerState || null,
          sellerCity: sellerCity || null,
          sellerAddress: sellerAddress || null,
          buyerCompanyName,
          buyerContactName: buyerContactName || null,
          buyerEmail: buyerEmail || null,
          buyerPhone: buyerPhone || null,
          buyerAddressType: buyerAddressType || null,
          buyerCountry: buyerCountry || null,
          buyerState: buyerState || null,
          buyerCity: buyerCity || null,
          buyerAddress: buyerAddress || null,
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
          status: SOStatus.DRAFT,
        },
      });

      // Create items
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.salesOrderItem.createMany({
          data: items.map((item: any, index: number) => ({
            salesOrderId: newSO.id,
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

      // Return Sales Order with items
      return await tx.salesOrder.findUnique({
        where: { id: newSO.id },
        include: {
          items: true,
          purchaseOrder: {
            select: {
              poId: true,
            },
          },
        },
      });
    });

    // Serialize Decimal values to numbers
    const serializedSO = serializeSalesOrder(salesOrder);

    return NextResponse.json(serializedSO, { status: 201 });
  } catch (error) {
    console.error("Error creating sales order:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

