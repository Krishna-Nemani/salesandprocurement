import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, PLStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializePackingList(pl: any): any {
  return {
    ...pl,
    totalGrossWeight: pl.totalGrossWeight ? Number(pl.totalGrossWeight) : null,
    totalNetWeight: pl.totalNetWeight ? Number(pl.totalNetWeight) : null,
    items: pl.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
      netWeight: item.netWeight ? Number(item.netWeight) : null,
    })) || [],
  };
}

// GET /api/seller/packing-lists - Get all packing lists for the current seller company
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
    const status = searchParams.get("status") as PLStatus | null;
    const purchaseOrderId = searchParams.get("purchaseOrderId");

    const where: any = {
      sellerCompanyId: session.user.companyId,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }

    if (search) {
      where.OR = [
        { plId: { contains: search, mode: "insensitive" } },
        { buyerCompanyName: { contains: search, mode: "insensitive" } },
        { purchaseOrder: { poId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const packingLists = await prisma.packingList.findMany({
      where,
      include: {
        items: true,
        purchaseOrder: {
          select: {
            poId: true,
          },
        },
        deliveryNote: {
          select: {
            dnId: true,
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
    const serializedPLs = packingLists.map(serializePackingList);

    return NextResponse.json(serializedPLs);
  } catch (error) {
    console.error("Error fetching packing lists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/seller/packing-lists - Create a new packing list
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
      purchaseOrderId,
      deliveryNoteId,
      salesOrderId,
      packingDate,
      shipmentTrackingId,
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
      status,
    } = body;

    // Validate required fields
    if (!purchaseOrderId) {
      return NextResponse.json(
        { error: "Purchase Order ID is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Verify the PO exists and belongs to this seller
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: {
        id: true,
        sellerCompanyId: true,
        sellerCompanyName: true,
        buyerCompanyId: true,
        buyerCompanyName: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Verify the PO was sent to this seller
    if (
      purchaseOrder.sellerCompanyId &&
      purchaseOrder.sellerCompanyId !== session.user.companyId
    ) {
      return NextResponse.json(
        { error: "Forbidden: This purchase order was not sent to your company" },
        { status: 403 }
      );
    }

    // If sellerCompanyId is null, check by name (case-insensitive)
    if (
      !purchaseOrder.sellerCompanyId &&
      purchaseOrder.sellerCompanyName
    ) {
      const sellerCompany = await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { name: true },
      });

      if (
        !sellerCompany ||
        purchaseOrder.sellerCompanyName.toLowerCase() !==
          sellerCompany.name.toLowerCase()
      ) {
        return NextResponse.json(
          { error: "Forbidden: This purchase order was not sent to your company" },
          { status: 403 }
        );
      }
    }

    // Verify delivery note if provided
    if (deliveryNoteId) {
      const deliveryNote = await prisma.deliveryNote.findUnique({
        where: { id: deliveryNoteId },
        select: {
          id: true,
          sellerCompanyId: true,
          purchaseOrderId: true,
        },
      });

      if (!deliveryNote) {
        return NextResponse.json(
          { error: "Delivery note not found" },
          { status: 404 }
        );
      }

      if (deliveryNote.sellerCompanyId !== session.user.companyId) {
        return NextResponse.json(
          { error: "Forbidden: This delivery note does not belong to your company" },
          { status: 403 }
        );
      }

      if (deliveryNote.purchaseOrderId !== purchaseOrderId) {
        return NextResponse.json(
          { error: "Delivery note does not match the purchase order" },
          { status: 400 }
        );
      }
    }

    // Verify sales order if provided
    if (salesOrderId) {
      const salesOrder = await prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
        select: {
          id: true,
          sellerCompanyId: true,
          purchaseOrderId: true,
        },
      });

      if (!salesOrder) {
        return NextResponse.json(
          { error: "Sales order not found" },
          { status: 404 }
        );
      }

      if (salesOrder.sellerCompanyId !== session.user.companyId) {
        return NextResponse.json(
          { error: "Forbidden: This sales order does not belong to your company" },
          { status: 403 }
        );
      }

      if (salesOrder.purchaseOrderId !== purchaseOrderId) {
        return NextResponse.json(
          { error: "Sales order does not match the purchase order" },
          { status: 400 }
        );
      }
    }

    // Get company for ID generation
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: {
        name: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Generate PL ID (e.g., "MARPL0001")
    const companyInitials = company.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, "X");

    const count = await prisma.packingList.count({
      where: { sellerCompanyId: session.user.companyId },
    });
    const plId = `${companyInitials}PL${String(count + 1).padStart(4, "0")}`;

    // Calculate totals
    const totalGrossWeight = items.reduce(
      (sum: number, item: any) => sum + (Number(item.grossWeight) || 0),
      0
    );
    const totalNetWeight = items.reduce(
      (sum: number, item: any) => sum + (Number(item.netWeight) || 0),
      0
    );
    const totalNoOfPackages = items.reduce(
      (sum: number, item: any) => sum + (Number(item.noOfPackages) || 0),
      0
    );

    // Create Packing List and items in a transaction
    const packingList = await prisma.$transaction(async (tx) => {
      const newPL = await tx.packingList.create({
        data: {
          plId,
          purchaseOrderId,
          deliveryNoteId: deliveryNoteId || null,
          salesOrderId: salesOrderId || null,
          sellerCompanyId: session.user.companyId,
          buyerCompanyId: purchaseOrder.buyerCompanyId || null,
          packingDate: new Date(packingDate),
          shipmentTrackingId: shipmentTrackingId || null,
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
          totalGrossWeight: totalGrossWeight > 0 ? totalGrossWeight : null,
          totalNetWeight: totalNetWeight > 0 ? totalNetWeight : null,
          totalNoOfPackages: totalNoOfPackages > 0 ? totalNoOfPackages : null,
          notes: notes || null,
          signatureByName: signatureByName || null,
          signatureUrl: signatureUrl || null,
          status: (status as PLStatus) || PLStatus.RECEIVED,
        },
      });

      // Create items
      await tx.packingListItem.createMany({
        data: items.map((item: any) => ({
          packingListId: newPL.id,
          serialNumber: item.serialNumber,
          productName: item.productName,
          sku: item.sku || null,
          hsnCode: item.hsnCode || null,
          uom: item.uom || null,
          quantity: Math.round((parseFloat(item.quantity) || 0) * 100) / 100,
          packageType: item.packageType || null,
          grossWeight:
            item.grossWeight && item.grossWeight > 0
              ? Math.round((parseFloat(item.grossWeight) || 0) * 100) / 100
              : null,
          netWeight:
            item.netWeight && item.netWeight > 0
              ? Math.round((parseFloat(item.netWeight) || 0) * 100) / 100
              : null,
          noOfPackages: item.noOfPackages ? parseInt(item.noOfPackages) : null,
          dimensions: item.dimensions || null,
        })),
      });

      return newPL;
    });

    // Fetch the created packing list with relations
    const createdPL = await prisma.packingList.findUnique({
      where: { id: packingList.id },
      include: {
        items: true,
        purchaseOrder: {
          select: {
            poId: true,
          },
        },
        deliveryNote: {
          select: {
            dnId: true,
          },
        },
        salesOrder: {
          select: {
            soId: true,
          },
        },
      },
    });

    const serializedPL = serializePackingList(createdPL);

    return NextResponse.json(serializedPL, { status: 201 });
  } catch (error) {
    console.error("Error creating packing list:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

