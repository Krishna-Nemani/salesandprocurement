import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, InvoiceStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializeInvoice(inv: any): any {
  return {
    ...inv,
    sumOfSubTotal: Number(inv.sumOfSubTotal),
    discountPercentage: inv.discountPercentage ? Number(inv.discountPercentage) : null,
    additionalCharges: inv.additionalCharges ? Number(inv.additionalCharges) : null,
    taxPercentage: inv.taxPercentage ? Number(inv.taxPercentage) : null,
    totalAmount: Number(inv.totalAmount),
    paidAmount: inv.paidAmount ? Number(inv.paidAmount) : null,
    remainingAmount: inv.remainingAmount ? Number(inv.remainingAmount) : null,
    items: inv.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })) || [],
  };
}

// GET /api/buyer/invoices - Get all invoices received by the current buyer company
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = {
      buyerCompanyId: session.user.companyId,
    };

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as InvoiceStatus;
    }

    if (search) {
      where.OR = [
        { invoiceId: { contains: search, mode: "insensitive" } },
        { sellerCompanyName: { contains: search, mode: "insensitive" } },
        { purchaseOrder: { poId: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.invoice.count({ where });

    // Fetch invoices with pagination - don't include items for list view
    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceId: true,
        sellerCompanyName: true,
        invoiceDate: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        purchaseOrder: {
          select: {
            poId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: skip,
    });

    // Serialize Decimal values to numbers
    const serializedInvoices = invoices.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
    }));

    return NextResponse.json({
      data: serializedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

