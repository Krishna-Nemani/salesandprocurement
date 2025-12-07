import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, RFQStatus } from "@prisma/client";

// GET /api/buyer/rfqs - Get all RFQs for the current buyer company
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
    const status = searchParams.get("status") as RFQStatus | null;

    const where: any = {
      buyerCompanyId: session.user.companyId,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { projectName: { contains: search, mode: "insensitive" } },
        { rfqId: { contains: search, mode: "insensitive" } },
      ];
    }

    const rfqs = await prisma.rFQ.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
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

// POST /api/buyer/rfqs - Create a new RFQ
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      dateIssued,
      dueDate,
      currency,
      projectName,
      projectDescription,
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
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddressType,
      sellerCountry,
      sellerState,
      sellerCity,
      sellerAddress,
      technicalRequirements,
      deliveryRequirements,
      termsAndConditions,
      notes,
      signatureByName,
      signatureUrl,
      items,
      selectedSellerId,
    } = body;

    // Get seller's company ID if a seller was selected
    let sellerCompanyId: string | null = null;
    if (selectedSellerId && sellerCompanyName) {
      // Try to find the seller's company by name
      const sellerCompany = await prisma.company.findFirst({
        where: {
          name: {
            equals: sellerCompanyName,
            mode: "insensitive",
          },
          type: "SELLER",
        },
        select: { id: true },
      });
      if (sellerCompany) {
        sellerCompanyId = sellerCompany.id;
      }
    }

    // Validate required fields
    if (!dueDate) {
      return NextResponse.json(
        { error: "Due date is required" },
        { status: 400 }
      );
    }

    // Validate dateIssued is not in the future
    const issueDate = dateIssued ? new Date(dateIssued) : new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (issueDate > today) {
      return NextResponse.json(
        { error: "Date issued cannot be a future date" },
        { status: 400 }
      );
    }

    // Validate dueDate is after issueDate
    const dueDateObj = new Date(dueDate);
    if (dueDateObj <= issueDate) {
      return NextResponse.json(
        { error: "Due date must be after the issue date" },
        { status: 400 }
      );
    }

    // Generate RFQ ID
    const count = await prisma.rFQ.count({
      where: { buyerCompanyId: session.user.companyId },
    });
    const rfqId = `RFQ-${String(count + 1).padStart(4, "0")}`;

    // Create RFQ and items in a transaction
    const rfq = await prisma.$transaction(async (tx) => {
      const newRFQ = await tx.rFQ.create({
        data: {
          rfqId,
          buyerCompanyId: session.user.companyId,
          sellerCompanyId: sellerCompanyId || null,
          dateIssued: issueDate,
          dueDate: dueDateObj,
          currency: currency || "USD",
          projectName,
          projectDescription: projectDescription || null,
          buyerCompanyName: buyerCompanyName || "",
          buyerContactName: buyerContactName || null,
          buyerEmail: buyerEmail || null,
          buyerPhone: buyerPhone || null,
          buyerAddressType: buyerAddressType || null,
          buyerCountry: buyerCountry || null,
          buyerState: buyerState || null,
          buyerCity: buyerCity || null,
          buyerAddress: buyerAddress || null,
          buyerPreferredCurrency: buyerPreferredCurrency || null,
          sellerCompanyName: sellerCompanyName || null,
          sellerContactName: sellerContactName || null,
          sellerEmail: sellerEmail || null,
          sellerPhone: sellerPhone || null,
          sellerAddressType: sellerAddressType || null,
          sellerCountry: sellerCountry || null,
          sellerState: sellerState || null,
          sellerCity: sellerCity || null,
          sellerAddress: sellerAddress || null,
          technicalRequirements: technicalRequirements || null,
          deliveryRequirements: deliveryRequirements || null,
          termsAndConditions: termsAndConditions || null,
          notes: notes || null,
          signatureByName: signatureByName || null,
          signatureUrl: signatureUrl || null,
          status: RFQStatus.DRAFT,
        },
      });

      // Create items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.rFQItem.createMany({
          data: items.map((item: any, index: number) => ({
            rfqId: newRFQ.id,
            serialNumber: index + 1,
            productName: item.productName || "",
            productDescription: item.productDescription || null,
            sku: item.sku || null,
            hsnCode: item.hsnCode || null,
            uom: item.uom || null,
            quantity: item.quantity || 0,
          })),
        });
      }

      // Return RFQ with items
      return await tx.rFQ.findUnique({
        where: { id: newRFQ.id },
        include: { items: true },
      });
    });

    return NextResponse.json(rfq, { status: 201 });
  } catch (error) {
    console.error("Error creating RFQ:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

