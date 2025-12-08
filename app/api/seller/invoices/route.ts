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
    items: inv.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })) || [],
  };
}

// GET /api/seller/invoices - Get all invoices for the current seller company
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
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = {
      sellerCompanyId: session.user.companyId,
    };

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as InvoiceStatus;
    }

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }

    if (search) {
      where.OR = [
        { invoiceId: { contains: search, mode: "insensitive" } },
        { buyerCompanyName: { contains: search, mode: "insensitive" } },
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
        buyerCompanyName: true,
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

// POST /api/seller/invoices - Create a new invoice
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
      purchaseOrderId,
      invoiceDate,
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddress,
      buyerCompanyName,
      buyerContactName,
      buyerEmail,
      buyerPhone,
      buyerAddress,
      shipToCompanyName,
      shipToContactName,
      shipToEmail,
      shipToPhone,
      shipToAddress,
      items,
      discountPercentage,
      additionalCharges,
      taxPercentage,
      termsAndConditions,
      signatureByName,
      signatureUrl,
      status,
    } = body;

    // Validate required fields
    if (!purchaseOrderId) {
      return NextResponse.json(
        { error: "Purchase Order ID is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Verify the PO exists and belongs to this seller
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: {
        id: true,
        sellerCompanyId: true,
        sellerCompanyName: true,
        buyerCompanyId: true,
        buyerCompanyName: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Verify the PO was sent to this seller
    if (
      purchaseOrder.sellerCompanyId &&
      purchaseOrder.sellerCompanyId !== session.user.companyId
    ) {
      return NextResponse.json(
        { error: "Forbidden: This purchase order was not sent to your company" },
        { status: 403 }
      );
    }

    // If sellerCompanyId is null, check by name (case-insensitive)
    if (
      !purchaseOrder.sellerCompanyId &&
      purchaseOrder.sellerCompanyName
    ) {
      const sellerCompany = await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { name: true },
      });

      if (
        !sellerCompany ||
        purchaseOrder.sellerCompanyName.toLowerCase() !==
          sellerCompany.name.toLowerCase()
      ) {
        return NextResponse.json(
          { error: "Forbidden: This purchase order was not sent to your company" },
          { status: 403 }
        );
      }
    }

    // Get company for ID generation
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: {
        name: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Generate Invoice ID (e.g., "MARINV0001")
    const companyInitials = company.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, "X");

    const count = await prisma.invoice.count({
      where: { sellerCompanyId: session.user.companyId },
    });
    const invoiceId = `${companyInitials}INV${String(count + 1).padStart(4, "0")}`;

    // Calculate financials
    const sumOfSubTotal = items.reduce(
      (sum: number, item: any) => {
        const subTotal = Number(item.subTotal) || 0;
        return sum + subTotal;
      },
      0
    );

    const discountPercent = discountPercentage ? Number(discountPercentage) : 0;
    const discountAmount = discountPercent > 0
      ? (sumOfSubTotal * discountPercent) / 100
      : 0;

    const amountAfterDiscount = sumOfSubTotal - discountAmount;
    
    const taxPercent = taxPercentage ? Number(taxPercentage) : 0;
    const taxAmount = taxPercent > 0
      ? (amountAfterDiscount * taxPercent) / 100
      : 0;

    const additionalChargesNum = additionalCharges ? Number(additionalCharges) : 0;
    const totalAmount = Math.round(
      (amountAfterDiscount + additionalChargesNum + taxAmount) * 100
    ) / 100;

    // Create Invoice and items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceId,
          purchaseOrderId,
          sellerCompanyId: session.user.companyId,
          buyerCompanyId: purchaseOrder.buyerCompanyId || null,
          invoiceDate: new Date(invoiceDate),
          sellerCompanyName,
          sellerContactName: sellerContactName || null,
          sellerEmail: sellerEmail || null,
          sellerPhone: sellerPhone || null,
          sellerAddress: sellerAddress || null,
          buyerCompanyName,
          buyerContactName: buyerContactName || null,
          buyerEmail: buyerEmail || null,
          buyerPhone: buyerPhone || null,
          buyerAddress: buyerAddress || null,
          shipToCompanyName: shipToCompanyName || null,
          shipToContactName: shipToContactName || null,
          shipToEmail: shipToEmail || null,
          shipToPhone: shipToPhone || null,
          shipToAddress: shipToAddress || null,
          sumOfSubTotal: Math.round(sumOfSubTotal * 100) / 100,
          discountPercentage: discountPercentage
            ? Math.round((Number(discountPercentage) || 0) * 100) / 100
            : null,
          additionalCharges: additionalCharges
            ? Math.round((Number(additionalCharges) || 0) * 100) / 100
            : null,
          taxPercentage: taxPercentage
            ? Math.round((Number(taxPercentage) || 0) * 100) / 100
            : null,
          totalAmount: Math.round(totalAmount * 100) / 100,
          termsAndConditions: termsAndConditions || null,
          signatureByName: signatureByName || null,
          signatureUrl: signatureUrl || null,
          status: (status as InvoiceStatus) || InvoiceStatus.DRAFT,
        },
      });

      // Create items
      await tx.invoiceItem.createMany({
        data: items.map((item: any) => ({
          invoiceId: newInvoice.id,
          serialNumber: item.serialNumber,
          productName: item.productName,
          productDescription: item.productDescription || null,
          sku: item.sku || null,
          hsnCode: item.hsnCode || null,
          uom: item.uom || null,
          quantity: Math.round((parseFloat(item.quantity) || 0) * 100) / 100,
          unitPrice: Math.round((parseFloat(item.unitPrice) || 0) * 100) / 100,
          subTotal: Math.round((parseFloat(item.subTotal) || 0) * 100) / 100,
        })),
      });

      return newInvoice;
    });

    // Fetch the created invoice with relations
    const createdInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: true,
        purchaseOrder: {
          select: {
            poId: true,
          },
        },
      },
    });

    const serializedInvoice = serializeInvoice(createdInvoice);

    return NextResponse.json(serializedInvoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

