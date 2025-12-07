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

// GET /api/buyer/delivery-notes/[id] - Get a specific delivery note
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

    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const dnId = params.id;

    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: dnId },
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
        sellerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!deliveryNote) {
      return NextResponse.json(
        { error: "Delivery note not found" },
        { status: 404 }
      );
    }

    // Check ownership - DN must be sent to this buyer
    if (deliveryNote.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This delivery note was not sent to your company" },
        { status: 403 }
      );
    }

    // Serialize Decimal values to numbers
    const serializedDN = serializeDeliveryNote(deliveryNote);

    return NextResponse.json(serializedDN);
  } catch (error) {
    console.error("Error fetching delivery note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/buyer/delivery-notes/[id] - Acknowledge or dispute a delivery note
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

    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const dnId = params.id;
    const body = await request.json();
    const { action } = body; // "acknowledge" or "dispute"

    if (!action || (action !== "acknowledge" && action !== "dispute")) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'acknowledge' or 'dispute'" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingDN = await prisma.deliveryNote.findUnique({
      where: { id: dnId },
    });

    if (!existingDN) {
      return NextResponse.json(
        { error: "Delivery note not found" },
        { status: 404 }
      );
    }

    if (existingDN.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This delivery note was not sent to your company" },
        { status: 403 }
      );
    }

    // Only allow actions if status is not already ACKNOWLEDGED or DISPUTED
    if (existingDN.status === DNStatus.ACKNOWLEDGED || existingDN.status === DNStatus.DISPUTED) {
      return NextResponse.json(
        { error: `Cannot ${action} delivery note with status ${existingDN.status}` },
        { status: 400 }
      );
    }

    // Update delivery note status
    let newStatus: DNStatus;
    if (action === "acknowledge") {
      newStatus = DNStatus.ACKNOWLEDGED;
    } else {
      newStatus = DNStatus.DISPUTED;
    }

    const updatedDN = await prisma.deliveryNote.update({
      where: { id: dnId },
      data: { status: newStatus },
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

    // Serialize Decimal values to numbers
    const serializedDN = serializeDeliveryNote(updatedDN);

    return NextResponse.json(serializedDN);
  } catch (error) {
    console.error("Error updating delivery note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

