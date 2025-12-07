import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, ContractStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializeContract(contract: any): any {
  return {
    ...contract,
    agreedTotalValue: contract.agreedTotalValue ? Number(contract.agreedTotalValue) : null,
    items: contract.items?.map((item: any) => ({
      ...item,
      quantity: item.quantity ? Number(item.quantity) : null,
      unitPrice: Number(item.unitPrice),
    })) || [],
  };
}

// GET /api/buyer/contracts - Get all contracts received by the current buyer company
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
    const status = searchParams.get("status") as ContractStatus | "ALL" | null;

    const where: any = {
      buyerCompanyId: session.user.companyId,
    };

    // Filter by status
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Search functionality
    if (search) {
      where.OR = [
        { contractId: { contains: search, mode: "insensitive" } },
        { sellerCompanyName: { contains: search, mode: "insensitive" } },
        { quotation: { quoteId: { contains: search, mode: "insensitive" } } },
        { rfq: { rfqId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        quotation: {
          select: {
            quoteId: true,
          },
        },
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
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize Decimal values to numbers
    const serializedContracts = contracts.map(serializeContract);

    return NextResponse.json(serializedContracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

