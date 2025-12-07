import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, PartyStatus } from "@prisma/client";

// GET /api/buyer/sellers - Get all sellers for the current buyer company
export async function GET() {
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

    const sellers = await prisma.buyerSeller.findMany({
      where: {
        buyerCompanyId: session.user.companyId,
      },
      include: {
        addresses: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(sellers);
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/buyer/sellers - Create a new seller for the current buyer company
export async function POST(request: NextRequest) {
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
    let sellerStatus: PartyStatus = PartyStatus.ACTIVE;
    if (status) {
      const validStatuses: PartyStatus[] = [
        PartyStatus.ACTIVE,
        PartyStatus.PENDING,
        PartyStatus.INACTIVE,
      ];
      if (validStatuses.includes(status as PartyStatus)) {
        sellerStatus = status as PartyStatus;
      }
    }

    // Create seller and addresses in a transaction
    const seller = await prisma.$transaction(async (tx) => {
      const newSeller = await tx.buyerSeller.create({
        data: {
          buyerCompanyId: session.user.companyId,
          name,
          contactName: contactName || null,
          email: email || null,
          phone: phone || null,
          status: sellerStatus,
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
            buyerSellerId: newSeller.id,
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

      // Return seller with addresses
      return await tx.buyerSeller.findUnique({
        where: { id: newSeller.id },
        include: { addresses: true },
      });
    });

    return NextResponse.json(seller, { status: 201 });
  } catch (error) {
    console.error("Error creating seller:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

