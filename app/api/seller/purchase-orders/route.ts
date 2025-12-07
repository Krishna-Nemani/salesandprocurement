import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, POStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializePurchaseOrder(po: any): any {
  return {
    ...po,
    discountPercentage: po.discountPercentage ? Number(po.discountPercentage) : null,
    additionalCharges: po.additionalCharges ? Number(po.additionalCharges) : null,
    taxPercentage: po.taxPercentage ? Number(po.taxPercentage) : null,
    totalAmount: Number(po.totalAmount),
    items: po.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })) || [],
  };
}

// GET /api/seller/purchase-orders - Get all purchase orders sent to the current seller company
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") as POStatus | null;
    const dateRange = searchParams.get("dateRange") || "all";

    // Get seller's company name for matching
    const sellerCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });

    const where: any = {
      OR: [
        // Match by sellerCompanyId if set
        { sellerCompanyId: session.user.companyId },
        // Match by seller company name if sellerCompanyId is not set
        ...(sellerCompany
          ? [
              {
                sellerCompanyId: null,
                sellerCompanyName: {
                  equals: sellerCompany.name,
                  mode: "insensitive",
                },
              },
            ]
          : []),
      ],
    };

    // Filter by status
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Filter by date range
    if (dateRange !== "all") {
      const now = new Date();
      let startDate: Date;
      
      if (dateRange === "7days") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "30days") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(0);
      }
      
      where.createdAt = {
        gte: startDate,
      };
    }

    // Search by PO ID or buyer company name
    if (search) {
      where.OR = [
        ...where.OR,
        { poId: { contains: search, mode: "insensitive" } },
        { buyerCompanyName: { contains: search, mode: "insensitive" } },
      ];
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: true,
        contract: {
          select: {
            contractId: true,
          },
        },
        quotation: {
          select: {
            quoteId: true,
          },
        },
        buyerCompany: {
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
    const serializedPOs = purchaseOrders.map(serializePurchaseOrder);

    return NextResponse.json(serializedPOs);
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

