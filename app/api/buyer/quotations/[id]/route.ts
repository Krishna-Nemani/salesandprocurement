import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, QuotationStatus } from "@prisma/client";

// GET /api/buyer/quotations/[id] - Get a specific quotation
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

    const quotationId = params.id;

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: true,
        rfq: {
          select: {
            rfqId: true,
            projectName: true,
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

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // Check ownership - quotation must be sent to this buyer
    if (quotation.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This quotation was not sent to your company" },
        { status: 403 }
      );
    }

    return NextResponse.json(quotation);
  } catch (error) {
    console.error("Error fetching quotation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/buyer/quotations/[id] - Accept or reject a quotation
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

    const quotationId = params.id;
    const body = await request.json();
    const { action } = body; // "accept" or "reject"

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingQuotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    if (existingQuotation.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This quotation was not sent to your company" },
        { status: 403 }
      );
    }

    // Only allow accept/reject if status is not already ACCEPTED or REJECTED
    if (existingQuotation.status === QuotationStatus.ACCEPTED || existingQuotation.status === QuotationStatus.REJECTED) {
      return NextResponse.json(
        { error: `Cannot ${action} quotation with status ${existingQuotation.status}` },
        { status: 400 }
      );
    }

    // Update quotation status
    const newStatus = action === "accept" ? QuotationStatus.ACCEPTED : QuotationStatus.REJECTED;

    const updatedQuotation = await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: newStatus,
      },
      include: {
        items: true,
        rfq: {
          select: {
            rfqId: true,
            projectName: true,
          },
        },
      },
    });

    return NextResponse.json(updatedQuotation);
  } catch (error) {
    console.error("Error updating quotation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

