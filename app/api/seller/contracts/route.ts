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

// GET /api/seller/contracts - Get all contracts for the current seller company
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
    const status = searchParams.get("status") as ContractStatus | "ALL" | null;
    const buyerFilter = searchParams.get("buyer") || "";

    const where: any = {
      sellerCompanyId: session.user.companyId,
    };

    // Filter by status
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Filter by buyer
    if (buyerFilter && buyerFilter !== "ALL") {
      where.buyerCompanyName = {
        contains: buyerFilter,
        mode: "insensitive",
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        { contractId: { contains: search, mode: "insensitive" } },
        { buyerCompanyName: { contains: search, mode: "insensitive" } },
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

// POST /api/seller/contracts - Create a new contract
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
      quotationId, // Optional - Quotation ID if this is from a quotation
      rfqId, // Optional - RFQ ID if this is from an RFQ
      effectiveDate,
      endDate,
      currency,
      agreedTotalValue,
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddressType,
      sellerCountry,
      sellerState,
      sellerCity,
      sellerAddress,
      buyerCompanyName,
      buyerContactName,
      buyerEmail,
      buyerPhone,
      buyerAddressType,
      buyerCountry,
      buyerState,
      buyerCity,
      buyerAddress,
      pricingTerms,
      paymentTerms,
      deliveryTerms,
      confidentiality,
      indemnity,
      terminationConditions,
      disputeResolution,
      governingLaw,
      signatureByName,
      signatureUrl,
      items,
      selectedBuyerId, // Optional - buyer company ID if creating standalone contract
    } = body;

    // Validate required fields
    if (!effectiveDate || !endDate || !buyerCompanyName || !sellerCompanyName || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: effectiveDate, endDate, buyerCompanyName, sellerCompanyName, items" },
        { status: 400 }
      );
    }

    // Validate dates
    const effDate = new Date(effectiveDate);
    const endDateObj = new Date(endDate);
    
    if (endDateObj <= effDate) {
      return NextResponse.json(
        { error: "End date must be after the effective date" },
        { status: 400 }
      );
    }

    // Get buyer's company ID
    let buyerCompanyId: string | null = null;
    if (buyerCompanyName) {
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

    // Get Quotation if quotationId is provided
    let quotation: any = null;
    if (quotationId) {
      quotation = await prisma.quotation.findUnique({
        where: { id: quotationId },
        select: { id: true, quoteId: true, buyerCompanyId: true, rfqId: true },
      });
      if (!quotation) {
        return NextResponse.json(
          { error: "Quotation not found" },
          { status: 404 }
        );
      }
      // Use Quotation's buyerCompanyId and rfqId if available
      if (quotation.buyerCompanyId) {
        buyerCompanyId = quotation.buyerCompanyId;
      }
      if (quotation.rfqId && !rfqId) {
        // Use quotation's rfqId if not explicitly provided
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

    // Generate Contract ID
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
      : "CON";
    
    const count = await prisma.contract.count({
      where: { sellerCompanyId: session.user.companyId },
    });
    const contractId = `${companyInitials}CON-${String(count + 1).padStart(3, "0")}`;

    // Create Contract and items in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      const newContract = await tx.contract.create({
        data: {
          contractId,
          quotationId: quotation?.id || null,
          rfqId: rfq?.id || quotation?.rfqId || null,
          sellerCompanyId: session.user.companyId,
          buyerCompanyId: buyerCompanyId || null,
          effectiveDate: effDate,
          endDate: endDateObj,
          currency: currency || "USD",
          agreedTotalValue: agreedTotalValue ? parseFloat(agreedTotalValue) : 0,
          sellerCompanyName,
          sellerContactName: sellerContactName || null,
          sellerEmail: sellerEmail || null,
          sellerPhone: sellerPhone || null,
          sellerAddressType: sellerAddressType || null,
          sellerCountry: sellerCountry || null,
          sellerState: sellerState || null,
          sellerCity: sellerCity || null,
          sellerAddress: sellerAddress || null,
          buyerCompanyName,
          buyerContactName: buyerContactName || null,
          buyerEmail: buyerEmail || null,
          buyerPhone: buyerPhone || null,
          buyerAddressType: buyerAddressType || null,
          buyerCountry: buyerCountry || null,
          buyerState: buyerState || null,
          buyerCity: buyerCity || null,
          buyerAddress: buyerAddress || null,
          pricingTerms: pricingTerms || null,
          paymentTerms: paymentTerms || null,
          deliveryTerms: deliveryTerms || null,
          confidentiality: confidentiality || null,
          indemnity: indemnity || null,
          terminationConditions: terminationConditions || null,
          disputeResolution: disputeResolution || null,
          governingLaw: governingLaw || null,
          signatureByName: signatureByName || null,
          signatureUrl: signatureUrl || null,
          status: ContractStatus.DRAFT,
        },
      });

      // Create items
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.contractItem.createMany({
          data: items.map((item: any, index: number) => ({
            contractId: newContract.id,
            serialNumber: index + 1,
            productName: item.productName || "",
            productDescription: item.productDescription || null,
            sku: item.sku || null,
            hsnCode: item.hsnCode || null,
            uom: item.uom || null,
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice) || 0,
          })),
        });
      }

      // Return Contract with items
      return await tx.contract.findUnique({
        where: { id: newContract.id },
        include: {
          items: true,
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
        },
      });
    });

    // Serialize Decimal values to numbers
    const serializedContract = serializeContract(contract);

    return NextResponse.json(serializedContract, { status: 201 });
  } catch (error) {
    console.error("Error creating contract:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

