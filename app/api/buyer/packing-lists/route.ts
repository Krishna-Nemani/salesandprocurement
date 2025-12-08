import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, PLStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializePackingList(pl: any): any {
  return {
    ...pl,
    totalGrossWeight: pl.totalGrossWeight ? Number(pl.totalGrossWeight) : null,
    totalNetWeight: pl.totalNetWeight ? Number(pl.totalNetWeight) : null,
    items: pl.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
      netWeight: item.netWeight ? Number(item.netWeight) : null,
    })) || [],
  };
}

// GET /api/buyer/packing-lists - Get all packing lists received by the current buyer company
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const statusParam = searchParams.get("status");

    const where: any = {
      buyerCompanyId: session.user.companyId,
    };

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as PLStatus;
    }

    if (search) {
      where.OR = [
        { plId: { contains: search, mode: "insensitive" } },
        { sellerCompanyName: { contains: search, mode: "insensitive" } },
        { purchaseOrder: { poId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const packingLists = await prisma.packingList.findMany({
      where,
      include: {
        items: true,
        purchaseOrder: {
          select: {
            poId: true,
          },
        },
        deliveryNote: {
          select: {
            dnId: true,
          },
        },
        sellerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize Decimal values to numbers
    const serializedPLs = packingLists.map(serializePackingList);

    return NextResponse.json(serializedPLs);
  } catch (error) {
    console.error("Error fetching packing lists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

