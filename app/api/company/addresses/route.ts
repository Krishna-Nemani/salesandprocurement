import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { AddressType } from "@prisma/client";

// POST /api/company/addresses - Create a new address for the current company
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      type,
      line1,
      line2,
      postalCode,
    } = body;

    // Validate required fields
    if (!line1 || !postalCode) {
      return NextResponse.json(
        { error: "Missing required fields: line1, postalCode" },
        { status: 400 }
      );
    }

    // Validate address type
    const validTypes: AddressType[] = [
      "COMPANY",
      "HEADQUARTERS",
      "BILLING",
      "SHIPPING",
      "WAREHOUSE",
      "OTHER",
    ];
    const addressType = (type || "COMPANY") as AddressType;
    
    if (!validTypes.includes(addressType)) {
      return NextResponse.json(
        { error: "Invalid address type" },
        { status: 400 }
      );
    }

    const address = await prisma.address.create({
      data: {
        companyId: session.user.companyId,
        type: addressType,
        line1,
        line2: line2 || null,
        postalCode,
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

