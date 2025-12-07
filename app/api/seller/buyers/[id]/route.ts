import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, PartyStatus } from "@prisma/client";

// GET /api/seller/buyers/[id] - Get a specific buyer
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

    const buyerId = params.id;

    const buyer = await prisma.sellerBuyer.findUnique({
      where: { id: buyerId },
      include: { addresses: true },
    });

    if (!buyer) {
      return NextResponse.json(
        { error: "Buyer not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (buyer.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This buyer does not belong to your company" },
        { status: 403 }
      );
    }

    return NextResponse.json(buyer);
  } catch (error) {
    console.error("Error fetching buyer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/seller/buyers/[id] - Update a buyer
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

    const buyerId = params.id;
    const body = await request.json();

    // First, verify the buyer belongs to the current company
    const existingBuyer = await prisma.sellerBuyer.findUnique({
      where: { id: buyerId },
    });

    if (!existingBuyer) {
      return NextResponse.json(
        { error: "Buyer not found" },
        { status: 404 }
      );
    }

    if (existingBuyer.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This buyer does not belong to your company" },
        { status: 403 }
      );
    }

    // Build update data - only allow updating specific fields
    const updateData: {
      name?: string;
      contactName?: string | null;
      email?: string | null;
      phone?: string | null;
      status?: PartyStatus;
      notes?: string | null;
    } = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.contactName !== undefined) updateData.contactName = body.contactName || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses: PartyStatus[] = [
        PartyStatus.ACTIVE,
        PartyStatus.PENDING,
        PartyStatus.INACTIVE,
      ];
      if (validStatuses.includes(body.status as PartyStatus)) {
        updateData.status = body.status as PartyStatus;
      }
    }

    const updatedBuyer = await prisma.sellerBuyer.update({
      where: { id: buyerId },
      data: updateData,
    });

    return NextResponse.json(updatedBuyer);
  } catch (error) {
    console.error("Error updating buyer:", error);

    // Handle Prisma not found error
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Buyer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/seller/buyers/[id] - Delete a buyer
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

    const buyerId = params.id;

    // First, verify the buyer belongs to the current company
    const existingBuyer = await prisma.sellerBuyer.findUnique({
      where: { id: buyerId },
    });

    if (!existingBuyer) {
      return NextResponse.json(
        { error: "Buyer not found" },
        { status: 404 }
      );
    }

    if (existingBuyer.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This buyer does not belong to your company" },
        { status: 403 }
      );
    }

    await prisma.sellerBuyer.delete({
      where: { id: buyerId },
    });

    return NextResponse.json(
      { message: "Buyer deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting buyer:", error);

    // Handle Prisma not found error
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Buyer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

