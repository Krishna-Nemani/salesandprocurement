import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { AddressType } from "@prisma/client";

// PUT /api/company/addresses/[id] - Update an existing address
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

    // First, verify the address belongs to the current company
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    if (existingAddress.companyId !== session.user.companyId) {
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

    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: updateData,
    });

    return NextResponse.json(updatedAddress);
  } catch (error) {
    console.error("Error updating address:", error);

    // Handle Prisma not found error
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/company/addresses/[id] - Delete an address
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

    // First, verify the address belongs to the current company
    const existingAddress = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    if (existingAddress.companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: Address does not belong to your company" },
        { status: 403 }
      );
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    return NextResponse.json(
      { message: "Address deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting address:", error);

    // Handle Prisma not found error
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

