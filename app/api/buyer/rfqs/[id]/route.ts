import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, RFQStatus } from "@prisma/client";

// GET /api/buyer/rfqs/[id] - Get a specific RFQ
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

    const rfqId = params.id;

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { items: true },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (rfq.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This RFQ does not belong to your company" },
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

// PUT /api/buyer/rfqs/[id] - Update an RFQ
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

    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const rfqId = params.id;
    const body = await request.json();

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

    if (existingRFQ.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This RFQ does not belong to your company" },
        { status: 403 }
      );
    }

    // Update RFQ and items in a transaction
    const updatedRFQ = await prisma.$transaction(async (tx) => {
      // Validate dates if provided
      if (body.dateIssued) {
        const issueDate = new Date(body.dateIssued);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (issueDate > today) {
          throw new Error("Date issued cannot be a future date");
        }
      }

      if (body.dueDate && body.dateIssued) {
        const dueDate = new Date(body.dueDate);
        const issueDate = new Date(body.dateIssued);
        if (dueDate <= issueDate) {
          throw new Error("Due date must be after the issue date");
        }
      }

      // Update RFQ
      const rfq = await tx.rFQ.update({
        where: { id: rfqId },
        data: {
          dateIssued: body.dateIssued ? new Date(body.dateIssued) : undefined,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          currency: body.currency,
          projectName: body.projectName,
          projectDescription: body.projectDescription,
          buyerCompanyName: body.buyerCompanyName,
          buyerContactName: body.buyerContactName,
          buyerEmail: body.buyerEmail,
          buyerPhone: body.buyerPhone,
          buyerAddressType: body.buyerAddressType,
          buyerCountry: body.buyerCountry,
          buyerState: body.buyerState,
          buyerCity: body.buyerCity,
          buyerAddress: body.buyerAddress,
          buyerPreferredCurrency: body.buyerPreferredCurrency,
          sellerCompanyName: body.sellerCompanyName,
          sellerContactName: body.sellerContactName,
          sellerEmail: body.sellerEmail,
          sellerPhone: body.sellerPhone,
          sellerAddressType: body.sellerAddressType,
          sellerCountry: body.sellerCountry,
          sellerState: body.sellerState,
          sellerCity: body.sellerCity,
          sellerAddress: body.sellerAddress,
          technicalRequirements: body.technicalRequirements,
          deliveryRequirements: body.deliveryRequirements,
          termsAndConditions: body.termsAndConditions,
          notes: body.notes,
          signatureByName: body.signatureByName,
          signatureUrl: body.signatureUrl,
          status: body.status ? (body.status as RFQStatus) : undefined,
        },
      });

      // Update items if provided
      if (body.items && Array.isArray(body.items)) {
        // Delete existing items
        await tx.rFQItem.deleteMany({
          where: { rfqId: rfqId },
        });

        // Create new items
        if (body.items.length > 0) {
          await tx.rFQItem.createMany({
            data: body.items.map((item: any, index: number) => ({
              rfqId: rfqId,
              serialNumber: index + 1,
              productName: item.productName || "",
              productDescription: item.productDescription || null,
              sku: item.sku || null,
              hsnCode: item.hsnCode || null,
              uom: item.uom || null,
              quantity: item.quantity || 0,
            })),
          });
        }
      }

      // Return updated RFQ with items
      return await tx.rFQ.findUnique({
        where: { id: rfqId },
        include: { items: true },
      });
    });

    return NextResponse.json(updatedRFQ);
  } catch (error) {
    console.error("Error updating RFQ:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/buyer/rfqs/[id] - Delete an RFQ
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

    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const rfqId = params.id;

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

    if (existingRFQ.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This RFQ does not belong to your company" },
        { status: 403 }
      );
    }

    await prisma.rFQ.delete({
      where: { id: rfqId },
    });

    return NextResponse.json(
      { message: "RFQ deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting RFQ:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

