import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, DNStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializeDeliveryNote(dn: any): any {
  return {
    ...dn,
    items: dn.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      quantityDelivered: Number(item.quantityDelivered),
    })) || [],
  };
}

// GET /api/seller/delivery-notes - Get all delivery notes for the current seller company
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
    const purchaseOrderId = searchParams.get("purchaseOrderId");

    const where: any = {
      sellerCompanyId: session.user.companyId,
    };

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as DNStatus;
    }

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }

    if (search) {
      where.OR = [
        { dnId: { contains: search, mode: "insensitive" } },
        { buyerCompanyName: { contains: search, mode: "insensitive" } },
        { purchaseOrder: { poId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const deliveryNotes = await prisma.deliveryNote.findMany({
      where,
      include: {
        items: true,
        purchaseOrder: {
          select: {
            poId: true,
          },
        },
        salesOrder: {
          select: {
            soId: true,
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
    const serializedDNs = deliveryNotes.map(serializeDeliveryNote);

    return NextResponse.json(serializedDNs);
  } catch (error) {
    console.error("Error fetching delivery notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/seller/delivery-notes - Create a new delivery note
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
      purchaseOrderId, // Required - Purchase Order ID
      salesOrderId, // Optional - Sales Order ID
      delDate,
      shippingMethod,
      shippingDate,
      carrierName,
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddress,
      buyerCompanyName,
      buyerContactName,
      buyerEmail,
      buyerPhone,
      buyerAddress,
      notes,
      signatureByName,
      signatureUrl,
      items,
    } = body;

    // Validate required fields
    if (!purchaseOrderId || !delDate || !sellerCompanyName || !buyerCompanyName || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: purchaseOrderId, delDate, sellerCompanyName, buyerCompanyName, items" },
        { status: 400 }
      );
    }

    // Get seller's company profile
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

    // Get Purchase Order and verify ownership
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: {
        id: true,
        poId: true,
        buyerCompanyId: true,
        sellerCompanyId: true,
        sellerCompanyName: true,
        status: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Verify the PO was sent to this seller
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

    // Get buyer's company ID
    let buyerCompanyId: string | null = purchaseOrder.buyerCompanyId || null;

    // Get Sales Order if salesOrderId is provided
    let salesOrder: any = null;
    if (salesOrderId) {
      salesOrder = await prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
        select: { id: true, soId: true, sellerCompanyId: true },
      });
      if (!salesOrder) {
        return NextResponse.json(
          { error: "Sales order not found" },
          { status: 404 }
        );
      }
      // Verify the SO belongs to this seller
      if (salesOrder.sellerCompanyId !== session.user.companyId) {
        return NextResponse.json(
          { error: "Forbidden: This sales order does not belong to your company" },
          { status: 403 }
        );
      }
    }

    // Generate DN ID
    const companyInitials = sellerCompany.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 3);
    
    const count = await prisma.deliveryNote.count({
      where: { sellerCompanyId: session.user.companyId },
    });
    const dnId = `${companyInitials}DN${String(count + 1).padStart(3, "0")}`;

    // Create Delivery Note and items in a transaction
    const deliveryNote = await prisma.$transaction(async (tx) => {
      const newDN = await tx.deliveryNote.create({
        data: {
          dnId,
          purchaseOrderId,
          salesOrderId: salesOrder?.id || null,
          sellerCompanyId: session.user.companyId,
          buyerCompanyId: buyerCompanyId || null,
          delDate: new Date(delDate),
          shippingMethod: shippingMethod || null,
          shippingDate: shippingDate ? new Date(shippingDate) : null,
          carrierName: carrierName || null,
          sellerCompanyName,
          sellerContactName: sellerContactName || null,
          sellerEmail: sellerEmail || null,
          sellerPhone: sellerPhone || null,
          sellerAddress: sellerAddress || null,
          buyerCompanyName,
          buyerContactName: buyerContactName || null,
          buyerEmail: buyerEmail || null,
          buyerPhone: buyerPhone || null,
          buyerAddress: buyerAddress || null,
          notes: notes || null,
          signatureByName: signatureByName || null,
          signatureUrl: signatureUrl || null,
          status: DNStatus.PENDING,
        },
      });

      // Create items
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.deliveryNoteItem.createMany({
          data: items.map((item: any, index: number) => ({
            deliveryNoteId: newDN.id,
            serialNumber: index + 1,
            productName: item.productName || "",
            productDescription: item.productDescription || null,
            sku: item.sku || null,
            hsnCode: item.hsnCode || null,
            uom: item.uom || null,
            quantity: Math.round((parseFloat(item.quantity) || 0) * 100) / 100,
            quantityDelivered: Math.round((parseFloat(item.quantityDelivered) || 0) * 100) / 100,
          })),
        });
      }

      // Return Delivery Note with items
      return await tx.deliveryNote.findUnique({
        where: { id: newDN.id },
        include: {
          items: true,
          purchaseOrder: {
            select: {
              poId: true,
            },
          },
          salesOrder: {
            select: {
              soId: true,
            },
          },
        },
      });
    });

    // Serialize Decimal values to numbers
    const serializedDN = serializeDeliveryNote(deliveryNote);

    return NextResponse.json(serializedDN, { status: 201 });
  } catch (error) {
    console.error("Error creating delivery note:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

