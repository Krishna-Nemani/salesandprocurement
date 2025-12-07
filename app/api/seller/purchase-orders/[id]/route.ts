import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, POStatus } from "@prisma/client";

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

// GET /api/seller/purchase-orders/[id] - Get a specific purchase order
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

    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const poId = params.id;

    // Get seller's company name for matching
    const sellerCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
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
        buyerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        salesOrders: {
          select: {
            id: true,
            soId: true,
          },
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Check ownership - PO must be sent to this seller
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

    // Serialize Decimal values to numbers
    const serializedPO = serializePurchaseOrder(purchaseOrder);

    return NextResponse.json(serializedPO);
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/seller/purchase-orders/[id] - Accept or reject a purchase order
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

    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const poId = params.id;
    const body = await request.json();
    const { action } = body; // "accept" or "reject"

    if (!action || (action !== "accept" && action !== "reject")) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    // Get seller's company name for matching
    const sellerCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });

    // Verify ownership
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const isOwner =
      existingPO.sellerCompanyId === session.user.companyId ||
      (existingPO.sellerCompanyId === null &&
        sellerCompany &&
        existingPO.sellerCompanyName?.toLowerCase() === sellerCompany.name.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { error: "Forbidden: This purchase order was not sent to your company" },
        { status: 403 }
      );
    }

    // Only allow actions if status is not already APPROVED or REJECTED
    if (existingPO.status === POStatus.APPROVED || existingPO.status === POStatus.REJECTED) {
      return NextResponse.json(
        { error: `Cannot ${action} purchase order with status ${existingPO.status}` },
        { status: 400 }
      );
    }

    // Update purchase order status
    let newStatus: POStatus;
    if (action === "accept") {
      newStatus = POStatus.APPROVED;
    } else {
      newStatus = POStatus.REJECTED;
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: newStatus },
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

    // Serialize Decimal values to numbers
    const serializedPO = serializePurchaseOrder(updatedPO);

    return NextResponse.json(serializedPO);
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

