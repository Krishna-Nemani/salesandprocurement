import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, PartyStatus } from "@prisma/client";

// GET /api/seller/buyers - Get all buyers for the current seller company
export async function GET() {
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

    const buyers = await prisma.sellerBuyer.findMany({
      where: {
        sellerCompanyId: session.user.companyId,
      },
      include: {
        addresses: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(buyers, {
      headers: {
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=240',
      },
    });
  } catch (error) {
    console.error("Error fetching buyers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/seller/buyers - Create a new buyer for the current seller company
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      name,
      contactName,
      email,
      phone,
      status,
      notes,
      addresses,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate status if provided
    let buyerStatus: PartyStatus = PartyStatus.ACTIVE;
    if (status) {
      const validStatuses: PartyStatus[] = [
        PartyStatus.ACTIVE,
        PartyStatus.PENDING,
        PartyStatus.INACTIVE,
      ];
      if (validStatuses.includes(status as PartyStatus)) {
        buyerStatus = status as PartyStatus;
      }
    }

    // Create buyer and addresses in a transaction
    const buyer = await prisma.$transaction(async (tx) => {
      const newBuyer = await tx.sellerBuyer.create({
        data: {
          sellerCompanyId: session.user.companyId,
          name,
          contactName: contactName || null,
          email: email || null,
          phone: phone || null,
          status: buyerStatus,
          notes: notes || null,
        },
      });

      // Create addresses if provided
      if (addresses && Array.isArray(addresses) && addresses.length > 0) {
        // Validate and filter addresses
        const validAddresses = addresses
          .filter((addr: any) => {
            if (!addr || !addr.type || !addr.line1 || !addr.postalCode) {
              console.warn("Invalid address data:", addr);
              return false;
            }
            // Validate address type enum
            const validTypes = ["COMPANY", "HEADQUARTERS", "BILLING", "SHIPPING", "WAREHOUSE", "OTHER"];
            if (!validTypes.includes(addr.type)) {
              console.warn("Invalid address type:", addr.type);
              return false;
            }
            return true;
          })
          .map((addr: any) => ({
            sellerBuyerId: newBuyer.id,
            type: addr.type as any,
            line1: addr.line1.trim(),
            line2: addr.line2?.trim() || null,
            postalCode: addr.postalCode.trim(),
          }));
        
        if (validAddresses.length > 0) {
          await tx.partyAddress.createMany({
            data: validAddresses,
          });
        }
      }

      // Return buyer with addresses
      return await tx.sellerBuyer.findUnique({
        where: { id: newBuyer.id },
        include: { addresses: true },
      });
    });

    return NextResponse.json(buyer, { status: 201 });
  } catch (error) {
    console.error("Error creating buyer:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

