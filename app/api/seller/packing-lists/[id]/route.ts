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

// GET /api/seller/packing-lists/[id] - Get a specific packing list
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const packingList = await prisma.packingList.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        purchaseOrder: {
          include: {
            items: true,
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

    if (!packingList) {
      return NextResponse.json(
        { error: "Packing list not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (packingList.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This packing list does not belong to your company" },
        { status: 403 }
      );
    }

    const serializedPL = serializePackingList(packingList);

    return NextResponse.json(serializedPL);
  } catch (error) {
    console.error("Error fetching packing list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/seller/packing-lists/[id] - Update a packing list
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify the packing list exists and belongs to this seller
    const existingPL = await prisma.packingList.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        sellerCompanyId: true,
        status: true,
      },
    });

    if (!existingPL) {
      return NextResponse.json(
        { error: "Packing list not found" },
        { status: 404 }
      );
    }

    if (existingPL.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This packing list does not belong to your company" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

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

    // Update packing list and items in a transaction
    const packingList = await prisma.$transaction(async (tx) => {
      // Update packing list
      const updatedPL = await tx.packingList.update({
        where: { id: params.id },
        data: {
          packingDate: packingDate ? new Date(packingDate) : undefined,
          shipmentTrackingId: shipmentTrackingId !== undefined ? shipmentTrackingId : undefined,
          carrierName: carrierName !== undefined ? carrierName : undefined,
          sellerCompanyName: sellerCompanyName !== undefined ? sellerCompanyName : undefined,
          sellerContactName: sellerContactName !== undefined ? sellerContactName : undefined,
          sellerEmail: sellerEmail !== undefined ? sellerEmail : undefined,
          sellerPhone: sellerPhone !== undefined ? sellerPhone : undefined,
          sellerAddress: sellerAddress !== undefined ? sellerAddress : undefined,
          buyerCompanyName: buyerCompanyName !== undefined ? buyerCompanyName : undefined,
          buyerContactName: buyerContactName !== undefined ? buyerContactName : undefined,
          buyerEmail: buyerEmail !== undefined ? buyerEmail : undefined,
          buyerPhone: buyerPhone !== undefined ? buyerPhone : undefined,
          buyerAddress: buyerAddress !== undefined ? buyerAddress : undefined,
          totalGrossWeight: totalGrossWeight > 0 ? totalGrossWeight : null,
          totalNetWeight: totalNetWeight > 0 ? totalNetWeight : null,
          totalNoOfPackages: totalNoOfPackages > 0 ? totalNoOfPackages : null,
          notes: notes !== undefined ? notes : undefined,
          signatureByName: signatureByName !== undefined ? signatureByName : undefined,
          signatureUrl: signatureUrl !== undefined ? signatureUrl : undefined,
          status: status ? (status as PLStatus) : undefined,
        },
      });

      // Delete existing items
      await tx.packingListItem.deleteMany({
        where: { packingListId: params.id },
      });

      // Create new items
      await tx.packingListItem.createMany({
        data: items.map((item: any) => ({
          packingListId: params.id,
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

      return updatedPL;
    });

    // Fetch the updated packing list with relations
    const updatedPL = await prisma.packingList.findUnique({
      where: { id: params.id },
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

    const serializedPL = serializePackingList(updatedPL);

    return NextResponse.json(serializedPL);
  } catch (error) {
    console.error("Error updating packing list:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/seller/packing-lists/[id] - Delete a packing list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify the packing list exists and belongs to this seller
    const packingList = await prisma.packingList.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        sellerCompanyId: true,
      },
    });

    if (!packingList) {
      return NextResponse.json(
        { error: "Packing list not found" },
        { status: 404 }
      );
    }

    if (packingList.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This packing list does not belong to your company" },
        { status: 403 }
      );
    }

    // Delete packing list (items will be cascade deleted)
    await prisma.packingList.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Packing list deleted successfully" });
  } catch (error) {
    console.error("Error deleting packing list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

