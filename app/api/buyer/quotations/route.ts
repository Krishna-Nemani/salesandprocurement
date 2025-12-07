import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, QuotationStatus } from "@prisma/client";

// GET /api/buyer/quotations - Get all quotations received by the current buyer company
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
    const status = searchParams.get("status") as QuotationStatus | "ALL" | null;
    const dateRange = searchParams.get("dateRange") || "all"; // all, 7days, 30days

    const where: any = {
      buyerCompanyId: session.user.companyId,
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
        startDate = new Date(0); // All time
      }
      
      where.quoteDateIssued = {
        gte: startDate,
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        { quoteId: { contains: search, mode: "insensitive" } },
        { sellerCompanyName: { contains: search, mode: "insensitive" } },
        ...(search.match(/^RFQ-/i) ? [{ rfq: { rfqId: { contains: search, mode: "insensitive" } } }] : []),
      ];
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        rfq: {
          select: {
            rfqId: true,
            projectName: true,
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

    return NextResponse.json(quotations);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

