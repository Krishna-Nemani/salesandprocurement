import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, DNStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializeDeliveryNote(dn: any): any {
  return {
    ...dn,
    items: dn.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      quantityDelivered: Number(item.quantityDelivered),
    })) || [],
  };
}

// GET /api/buyer/delivery-notes - Get all delivery notes sent to the current buyer company
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
      where.status = statusParam as DNStatus;
    }

    if (search) {
      where.OR = [
        { dnId: { contains: search, mode: "insensitive" } },
        { sellerCompanyName: { contains: search, mode: "insensitive" } },
        { purchaseOrder: { poId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const deliveryNotes = await prisma.deliveryNote.findMany({
      where,
      include: {
        items: true,
        purchaseOrder: {
          select: {
            poId: true,
          },
        },
        salesOrder: {
          select: {
            soId: true,
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
    const serializedDNs = deliveryNotes.map(serializeDeliveryNote);

    return NextResponse.json(serializedDNs);
  } catch (error) {
    console.error("Error fetching delivery notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

