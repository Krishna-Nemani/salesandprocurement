import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, RFQStatus } from "@prisma/client";

// GET /api/seller/rfqs - Get all RFQs sent to the current seller company
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
    const statusParam = searchParams.get("status");
    const dateRange = searchParams.get("dateRange") || "all"; // all, 7days, 30days, etc.

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
                sellerCompanyName: sellerCompany.name,
              },
            ]
          : []),
      ],
    };

    // Filter by status
    if (statusParam && statusParam !== "ALL") {
      if (statusParam === "RESPONDED") {
        // Responded includes both APPROVED and REJECTED
        where.status = {
          in: [RFQStatus.APPROVED, RFQStatus.REJECTED],
        };
      } else {
        where.status = statusParam as RFQStatus;
      }
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
      
      where.dateIssued = {
        gte: startDate,
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        { rfqId: { contains: search, mode: "insensitive" } },
        { projectName: { contains: search, mode: "insensitive" } },
        { buyerCompanyName: { contains: search, mode: "insensitive" } },
      ];
    }

    const rfqs = await prisma.rFQ.findMany({
      where,
      include: {
        items: true,
        buyerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        dateIssued: "desc",
      },
    });

    return NextResponse.json(rfqs);
  } catch (error) {
    console.error("Error fetching RFQs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

