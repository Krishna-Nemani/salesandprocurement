import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { AddressType } from "@prisma/client";

// GET /api/party/addresses/[id] - Get a single party address
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

    const addressId = params.id;

    const address = await prisma.partyAddress.findUnique({
      where: { id: addressId },
      include: {
        sellerBuyer: true,
        buyerSeller: true,
      },
    });

    if (!address) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (address.sellerBuyer && address.sellerBuyer.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (address.buyerSeller && address.buyerSeller.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(address);
  } catch (error) {
    console.error("Error fetching party address:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/party/addresses/[id] - Update a party address
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

    const addressId = params.id;
    const body = await request.json();

    // First, verify the address belongs to a party owned by the current company
    const existingAddress = await prisma.partyAddress.findUnique({
      where: { id: addressId },
      include: {
        sellerBuyer: true,
        buyerSeller: true,
      },
    });

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingAddress.sellerBuyer && existingAddress.sellerBuyer.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: Address does not belong to your company" },
        { status: 403 }
      );
    }

    if (existingAddress.buyerSeller && existingAddress.buyerSeller.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: Address does not belong to your company" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: {
      type?: AddressType;
      line1?: string;
      line2?: string | null;
      postalCode?: string;
    } = {};

    if (body.type !== undefined) {
      const validTypes: AddressType[] = [
        "COMPANY",
        "HEADQUARTERS",
        "BILLING",
        "SHIPPING",
        "WAREHOUSE",
        "OTHER",
      ];
      if (validTypes.includes(body.type)) {
        updateData.type = body.type;
      }
    }
    if (body.line1 !== undefined) updateData.line1 = body.line1;
    if (body.line2 !== undefined) updateData.line2 = body.line2 || null;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode;

    const updatedAddress = await prisma.partyAddress.update({
      where: { id: addressId },
      data: updateData,
    });

    return NextResponse.json(updatedAddress);
  } catch (error) {
    console.error("Error updating party address:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/party/addresses/[id] - Delete a party address
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

    const addressId = params.id;

    // First, verify the address belongs to a party owned by the current company
    const existingAddress = await prisma.partyAddress.findUnique({
      where: { id: addressId },
      include: {
        sellerBuyer: true,
        buyerSeller: true,
      },
    });

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingAddress.sellerBuyer && existingAddress.sellerBuyer.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: Address does not belong to your company" },
        { status: 403 }
      );
    }

    if (existingAddress.buyerSeller && existingAddress.buyerSeller.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: Address does not belong to your company" },
        { status: 403 }
      );
    }

    await prisma.partyAddress.delete({
      where: { id: addressId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting party address:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

