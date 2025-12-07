import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, RFQStatus } from "@prisma/client";

// GET /api/seller/rfqs/[id] - Get a specific RFQ
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

    const rfqId = params.id;

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        items: true,
        buyerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    // Check if RFQ was sent to this seller (by ID or by company name)
    const sellerCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });

    const isAuthorized =
      rfq.sellerCompanyId === session.user.companyId ||
      (sellerCompany &&
        rfq.sellerCompanyName &&
        rfq.sellerCompanyName.toLowerCase() === sellerCompany.name.toLowerCase());

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: This RFQ was not sent to your company" },
        { status: 403 }
      );
    }

    return NextResponse.json(rfq);
  } catch (error) {
    console.error("Error fetching RFQ:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/seller/rfqs/[id] - Approve or decline an RFQ
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

    const rfqId = params.id;
    const body = await request.json();
    const { action } = body; // "approve" or "decline"

    if (!action || !["approve", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'decline'" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingRFQ = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });

    if (!existingRFQ) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    // Check authorization (by ID or by company name)
    const sellerCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });

    const isAuthorized =
      existingRFQ.sellerCompanyId === session.user.companyId ||
      (sellerCompany &&
        existingRFQ.sellerCompanyName &&
        existingRFQ.sellerCompanyName.toLowerCase() === sellerCompany.name.toLowerCase());

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: This RFQ was not sent to your company" },
        { status: 403 }
      );
    }

    // Update RFQ status
    const newStatus = action === "approve" ? RFQStatus.APPROVED : RFQStatus.REJECTED;

    const updatedRFQ = await prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        status: newStatus,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(updatedRFQ);
  } catch (error) {
    console.error("Error updating RFQ status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

