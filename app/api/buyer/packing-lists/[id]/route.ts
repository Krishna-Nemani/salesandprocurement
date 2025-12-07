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

// GET /api/buyer/packing-lists/[id] - Get a specific packing list
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

    // Check if user belongs to a BUYER company
    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
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
        sellerCompany: {
          select: {
            id: true,
            name: true,
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

    // Verify ownership - PL must be sent to this buyer
    if (packingList.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This packing list was not sent to your company" },
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

// PATCH /api/buyer/packing-lists/[id] - Acknowledge or reject a packing list
export async function PATCH(
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

    // Check if user belongs to a BUYER company
    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    // Verify the packing list exists and was sent to this buyer
    const existingPL = await prisma.packingList.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        buyerCompanyId: true,
        status: true,
      },
    });

    if (!existingPL) {
      return NextResponse.json(
        { error: "Packing list not found" },
        { status: 404 }
      );
    }

    if (existingPL.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This packing list was not sent to your company" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, suggestions } = body; // action: "acknowledge" or "reject"

    if (!action || (action !== "acknowledge" && action !== "reject")) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'acknowledge' or 'reject'" },
        { status: 400 }
      );
    }

    // Determine new status
    const newStatus = action === "acknowledge" ? PLStatus.ACKNOWLEDGED : PLStatus.REJECTED;

    // Update packing list status
    const updatedPL = await prisma.packingList.update({
      where: { id: params.id },
      data: {
        status: newStatus,
      },
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

