import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, QuotationStatus } from "@prisma/client";

// GET /api/seller/quotations - Get all quotations for the current seller company
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
    const status = searchParams.get("status") as QuotationStatus | "ALL" | null;
    const dateRange = searchParams.get("dateRange") || "all"; // all, 7days, 30days

    const where: any = {
      sellerCompanyId: session.user.companyId,
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
        { buyerCompanyName: { contains: search, mode: "insensitive" } },
        ...(search.match(/^RFQ-/i) ? [{ rfq: { rfqId: { contains: search, mode: "insensitive" } } }] : []),
      ];
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        rfq: {
          select: {
            rfqId: true,
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

// POST /api/seller/quotations - Create a new quotation
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
      rfqId, // Optional - RFQ ID if this is a reply to an RFQ
      quoteDateIssued,
      quoteValidityDate,
      currency,
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddressType,
      sellerCountry,
      sellerState,
      sellerCity,
      sellerAddress,
      sellerPreferredCurrency,
      buyerCompanyName,
      buyerContactName,
      buyerEmail,
      buyerPhone,
      buyerAddressType,
      buyerCountry,
      buyerState,
      buyerCity,
      buyerAddress,
      buyerPreferredCurrency,
      discountPercentage,
      additionalCharges,
      taxPercentage,
      totalAmount,
      paymentTerms,
      deliveryTerms,
      termsAndConditions,
      notes,
      signatureByName,
      signatureUrl,
      items,
      selectedBuyerId, // Optional - buyer company ID if creating standalone quotation
    } = body;

    // Validate required fields
    if (!quoteValidityDate || !buyerCompanyName || !sellerCompanyName || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: quoteValidityDate, buyerCompanyName, sellerCompanyName, items" },
        { status: 400 }
      );
    }

    // Validate dates
    const issueDate = quoteDateIssued ? new Date(quoteDateIssued) : new Date();
    const validityDate = new Date(quoteValidityDate);
    
    if (validityDate <= issueDate) {
      return NextResponse.json(
        { error: "Validity date must be after the issue date" },
        { status: 400 }
      );
    }

    // Get buyer's company ID (for standalone quotations or if not from RFQ)
    let buyerCompanyId: string | null = null;
    if (buyerCompanyName) {
      // Try to find buyer company by name
      const buyerCompany = await prisma.company.findFirst({
        where: {
          name: {
            equals: buyerCompanyName,
            mode: "insensitive",
          },
          type: "BUYER",
        },
        select: { id: true },
      });
      if (buyerCompany) {
        buyerCompanyId = buyerCompany.id;
      }
    }

    // Get RFQ if rfqId is provided
    let rfq: any = null;
    if (rfqId) {
      rfq = await prisma.rFQ.findUnique({
        where: { id: rfqId },
        select: { id: true, rfqId: true, buyerCompanyId: true },
      });
      if (!rfq) {
        return NextResponse.json(
          { error: "RFQ not found" },
          { status: 404 }
        );
      }
      // Use RFQ's buyerCompanyId if available
      if (rfq.buyerCompanyId) {
        buyerCompanyId = rfq.buyerCompanyId;
      }
    }

    // Generate Quote ID
    // Get company name initials for quote ID prefix
    const sellerCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });
    
    const companyInitials = sellerCompany?.name
      ? sellerCompany.name
          .split(" ")
          .map((word) => word[0])
          .join("")
          .toUpperCase()
          .substring(0, 3)
      : "QUO";
    
    const count = await prisma.quotation.count({
      where: { sellerCompanyId: session.user.companyId },
    });
    const quoteId = `${companyInitials}QUO-${String(count + 1).padStart(3, "0")}`;

    // Calculate total amount if not provided
    let calculatedTotal = 0;
    if (items && Array.isArray(items)) {
      const subTotal = items.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.subTotal) || 0);
      }, 0);
      
      const discount = discountPercentage ? (subTotal * parseFloat(discountPercentage)) / 100 : 0;
      const afterDiscount = subTotal - discount;
      const additional = parseFloat(additionalCharges) || 0;
      const tax = taxPercentage ? (afterDiscount * parseFloat(taxPercentage)) / 100 : 0;
      calculatedTotal = afterDiscount + additional + tax;
    }

    // Create Quotation and items in a transaction
    const quotation = await prisma.$transaction(async (tx) => {
      const newQuotation = await tx.quotation.create({
        data: {
          quoteId,
          rfqId: rfq?.id || null,
          sellerCompanyId: session.user.companyId,
          buyerCompanyId: buyerCompanyId || null,
          quoteDateIssued: issueDate,
          quoteValidityDate: validityDate,
          currency: currency || "USD",
          sellerCompanyName,
          sellerContactName: sellerContactName || null,
          sellerEmail: sellerEmail || null,
          sellerPhone: sellerPhone || null,
          sellerAddressType: sellerAddressType || null,
          sellerCountry: sellerCountry || null,
          sellerState: sellerState || null,
          sellerCity: sellerCity || null,
          sellerAddress: sellerAddress || null,
          sellerPreferredCurrency: sellerPreferredCurrency || null,
          buyerCompanyName,
          buyerContactName: buyerContactName || null,
          buyerEmail: buyerEmail || null,
          buyerPhone: buyerPhone || null,
          buyerAddressType: buyerAddressType || null,
          buyerCountry: buyerCountry || null,
          buyerState: buyerState || null,
          buyerCity: buyerCity || null,
          buyerAddress: buyerAddress || null,
          buyerPreferredCurrency: buyerPreferredCurrency || null,
          discountPercentage: discountPercentage ? parseFloat(discountPercentage) : null,
          additionalCharges: additionalCharges ? parseFloat(additionalCharges) : null,
          taxPercentage: taxPercentage ? parseFloat(taxPercentage) : null,
          totalAmount: totalAmount ? parseFloat(totalAmount) : calculatedTotal,
          paymentTerms: paymentTerms || null,
          deliveryTerms: deliveryTerms || null,
          termsAndConditions: termsAndConditions || null,
          notes: notes || null,
          signatureByName: signatureByName || null,
          signatureUrl: signatureUrl || null,
          status: QuotationStatus.SENT, // Set to SENT so buyers can see it
        },
      });

      // Create items
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.quotationItem.createMany({
          data: items.map((item: any, index: number) => ({
            quotationId: newQuotation.id,
            serialNumber: index + 1,
            productName: item.productName || "",
            productDescription: item.productDescription || null,
            sku: item.sku || null,
            hsnCode: item.hsnCode || null,
            uom: item.uom || null,
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice) || 0,
            subTotal: parseFloat(item.subTotal) || 0,
          })),
        });
      }

      // Return Quotation with items
      return await tx.quotation.findUnique({
        where: { id: newQuotation.id },
        include: {
          items: true,
          rfq: {
            select: {
              rfqId: true,
            },
          },
        },
      });
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error("Error creating quotation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

