import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, QuotationStatus } from "@prisma/client";

// GET /api/seller/quotations/[id] - Get a specific quotation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const quotationId = params.id;

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: true,
        rfq: {
          select: {
            rfqId: true,
            projectName: true,
          },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (quotation.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This quotation does not belong to your company" },
        { status: 403 }
      );
    }

    return NextResponse.json(quotation);
  } catch (error) {
    console.error("Error fetching quotation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/seller/quotations/[id] - Update an existing quotation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const quotationId = params.id;
    const body = await request.json();

    // Verify ownership
    const existingQuotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!existingQuotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    if (existingQuotation.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This quotation does not belong to your company" },
        { status: 403 }
      );
    }

    const {
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
      status,
    } = body;

    // Validate dates if provided
    if (quoteDateIssued && quoteValidityDate) {
      const issueDate = new Date(quoteDateIssued);
      const validityDate = new Date(quoteValidityDate);
      
      if (validityDate <= issueDate) {
        return NextResponse.json(
          { error: "Validity date must be after the issue date" },
          { status: 400 }
        );
      }
    }

    // Calculate total amount if items are provided
    let calculatedTotal = existingQuotation.totalAmount;
    if (items && Array.isArray(items)) {
      const subTotal = items.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.subTotal) || 0);
      }, 0);
      
      const discount = discountPercentage !== undefined ? (subTotal * parseFloat(discountPercentage)) / 100 : 0;
      const afterDiscount = subTotal - discount;
      const additional = additionalCharges ? parseFloat(additionalCharges) : 0;
      const tax = taxPercentage !== undefined ? (afterDiscount * parseFloat(taxPercentage)) / 100 : 0;
      calculatedTotal = afterDiscount + additional + tax;
    }

    // Update quotation and items in a transaction
    const quotation = await prisma.$transaction(async (tx) => {
      // Update quotation
      const updateData: any = {};
      if (quoteDateIssued !== undefined) updateData.quoteDateIssued = new Date(quoteDateIssued);
      if (quoteValidityDate !== undefined) updateData.quoteValidityDate = new Date(quoteValidityDate);
      if (currency !== undefined) updateData.currency = currency;
      if (sellerCompanyName !== undefined) updateData.sellerCompanyName = sellerCompanyName;
      if (sellerContactName !== undefined) updateData.sellerContactName = sellerContactName;
      if (sellerEmail !== undefined) updateData.sellerEmail = sellerEmail;
      if (sellerPhone !== undefined) updateData.sellerPhone = sellerPhone;
      if (sellerAddressType !== undefined) updateData.sellerAddressType = sellerAddressType;
      if (sellerCountry !== undefined) updateData.sellerCountry = sellerCountry;
      if (sellerState !== undefined) updateData.sellerState = sellerState;
      if (sellerCity !== undefined) updateData.sellerCity = sellerCity;
      if (sellerAddress !== undefined) updateData.sellerAddress = sellerAddress;
      if (sellerPreferredCurrency !== undefined) updateData.sellerPreferredCurrency = sellerPreferredCurrency;
      if (buyerCompanyName !== undefined) updateData.buyerCompanyName = buyerCompanyName;
      if (buyerContactName !== undefined) updateData.buyerContactName = buyerContactName;
      if (buyerEmail !== undefined) updateData.buyerEmail = buyerEmail;
      if (buyerPhone !== undefined) updateData.buyerPhone = buyerPhone;
      if (buyerAddressType !== undefined) updateData.buyerAddressType = buyerAddressType;
      if (buyerCountry !== undefined) updateData.buyerCountry = buyerCountry;
      if (buyerState !== undefined) updateData.buyerState = buyerState;
      if (buyerCity !== undefined) updateData.buyerCity = buyerCity;
      if (buyerAddress !== undefined) updateData.buyerAddress = buyerAddress;
      if (buyerPreferredCurrency !== undefined) updateData.buyerPreferredCurrency = buyerPreferredCurrency;
      if (discountPercentage !== undefined) updateData.discountPercentage = discountPercentage ? parseFloat(discountPercentage) : null;
      if (additionalCharges !== undefined) updateData.additionalCharges = additionalCharges ? parseFloat(additionalCharges) : null;
      if (taxPercentage !== undefined) updateData.taxPercentage = taxPercentage ? parseFloat(taxPercentage) : null;
      if (totalAmount !== undefined || items) updateData.totalAmount = totalAmount ? parseFloat(totalAmount) : calculatedTotal;
      if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
      if (deliveryTerms !== undefined) updateData.deliveryTerms = deliveryTerms;
      if (termsAndConditions !== undefined) updateData.termsAndConditions = termsAndConditions;
      if (notes !== undefined) updateData.notes = notes;
      if (signatureByName !== undefined) updateData.signatureByName = signatureByName;
      if (signatureUrl !== undefined) updateData.signatureUrl = signatureUrl;
      if (status !== undefined) updateData.status = status;

      const updatedQuotation = await tx.quotation.update({
        where: { id: quotationId },
        data: updateData,
      });

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await tx.quotationItem.deleteMany({
          where: { quotationId },
        });

        // Create new items
        if (items.length > 0) {
          await tx.quotationItem.createMany({
            data: items.map((item: any, index: number) => ({
              quotationId,
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
      }

      // Return updated quotation with items
      return await tx.quotation.findUnique({
        where: { id: quotationId },
        include: {
          items: true,
          rfq: {
            select: {
              rfqId: true,
              projectName: true,
            },
          },
        },
      });
    });

    return NextResponse.json(quotation);
  } catch (error) {
    console.error("Error updating quotation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/seller/quotations/[id] - Delete a quotation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const quotationId = params.id;

    // Verify ownership
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    if (quotation.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This quotation does not belong to your company" },
        { status: 403 }
      );
    }

    // Delete quotation (items will be cascade deleted)
    await prisma.quotation.delete({
      where: { id: quotationId },
    });

    return NextResponse.json({ message: "Quotation deleted successfully" });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

