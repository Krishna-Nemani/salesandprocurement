import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, PartyStatus } from "@prisma/client";

// GET /api/buyer/sellers/[id] - Get a specific seller
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

    const sellerId = params.id;

    const seller = await prisma.buyerSeller.findUnique({
      where: { id: sellerId },
      include: { addresses: true },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (seller.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This seller does not belong to your company" },
        { status: 403 }
      );
    }

    return NextResponse.json(seller);
  } catch (error) {
    console.error("Error fetching seller:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/buyer/sellers/[id] - Update a seller
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

    // Check if user belongs to a BUYER company
    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const sellerId = params.id;
    const body = await request.json();

    // First, verify the seller belongs to the current company
    const existingSeller = await prisma.buyerSeller.findUnique({
      where: { id: sellerId },
    });

    if (!existingSeller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    if (existingSeller.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This seller does not belong to your company" },
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

    const updatedSeller = await prisma.buyerSeller.update({
      where: { id: sellerId },
      data: updateData,
    });

    return NextResponse.json(updatedSeller);
  } catch (error) {
    console.error("Error updating seller:", error);

    // Handle Prisma not found error
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/buyer/sellers/[id] - Delete a seller
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

    // Check if user belongs to a BUYER company
    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const sellerId = params.id;

    // First, verify the seller belongs to the current company
    const existingSeller = await prisma.buyerSeller.findUnique({
      where: { id: sellerId },
    });

    if (!existingSeller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    if (existingSeller.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This seller does not belong to your company" },
        { status: 403 }
      );
    }

    await prisma.buyerSeller.delete({
      where: { id: sellerId },
    });

    return NextResponse.json(
      { message: "Seller deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting seller:", error);

    // Handle Prisma not found error
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

