import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { AddressType } from "@prisma/client";

// POST /api/party/addresses - Create a new address for a party (SellerBuyer or BuyerSeller)
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
      sellerBuyerId,
      buyerSellerId,
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

    // Must have exactly one party ID
    if (!sellerBuyerId && !buyerSellerId) {
      return NextResponse.json(
        { error: "Either sellerBuyerId or buyerSellerId must be provided" },
        { status: 400 }
      );
    }

    if (sellerBuyerId && buyerSellerId) {
      return NextResponse.json(
        { error: "Cannot specify both sellerBuyerId and buyerSellerId" },
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

    // Verify party ownership
    if (sellerBuyerId) {
      const sellerBuyer = await prisma.sellerBuyer.findUnique({
        where: { id: sellerBuyerId },
      });

      if (!sellerBuyer) {
        return NextResponse.json(
          { error: "SellerBuyer not found" },
          { status: 404 }
        );
      }

      if (sellerBuyer.sellerCompanyId !== session.user.companyId) {
        return NextResponse.json(
          { error: "Forbidden: Party does not belong to your company" },
          { status: 403 }
        );
      }
    }

    if (buyerSellerId) {
      const buyerSeller = await prisma.buyerSeller.findUnique({
        where: { id: buyerSellerId },
      });

      if (!buyerSeller) {
        return NextResponse.json(
          { error: "BuyerSeller not found" },
          { status: 404 }
        );
      }

      if (buyerSeller.buyerCompanyId !== session.user.companyId) {
        return NextResponse.json(
          { error: "Forbidden: Party does not belong to your company" },
          { status: 403 }
        );
      }
    }

    const address = await prisma.partyAddress.create({
      data: {
        sellerBuyerId: sellerBuyerId || null,
        buyerSellerId: buyerSellerId || null,
        type: addressType,
        line1,
        line2: line2 || null,
        postalCode,
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error("Error creating party address:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

