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

// GET /api/seller/contracts/[id] - Get a specific contract
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

    const contractId = params.id;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
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

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (contract.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This contract does not belong to your company" },
        { status: 403 }
      );
    }

    // Serialize Decimal values to numbers
    const serializedContract = serializeContract(contract);

    return NextResponse.json(serializedContract);
  } catch (error) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/seller/contracts/[id] - Update an existing contract
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

    const contractId = params.id;
    const body = await request.json();

    // Verify ownership
    const existingContract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!existingContract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    if (existingContract.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This contract does not belong to your company" },
        { status: 403 }
      );
    }

    const {
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
      status,
      sellerResponse,
    } = body;

    // Validate dates if provided
    if (effectiveDate && endDate) {
      const effDate = new Date(effectiveDate);
      const endDateObj = new Date(endDate);
      
      if (endDateObj <= effDate) {
        return NextResponse.json(
          { error: "End date must be after the effective date" },
          { status: 400 }
        );
      }
    }

    // Update contract and items in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      // Update contract
      const updateData: any = {};
      if (effectiveDate !== undefined) updateData.effectiveDate = new Date(effectiveDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (currency !== undefined) updateData.currency = currency;
      if (agreedTotalValue !== undefined) updateData.agreedTotalValue = parseFloat(agreedTotalValue);
      if (sellerCompanyName !== undefined) updateData.sellerCompanyName = sellerCompanyName;
      if (sellerContactName !== undefined) updateData.sellerContactName = sellerContactName;
      if (sellerEmail !== undefined) updateData.sellerEmail = sellerEmail;
      if (sellerPhone !== undefined) updateData.sellerPhone = sellerPhone;
      if (sellerAddressType !== undefined) updateData.sellerAddressType = sellerAddressType;
      if (sellerCountry !== undefined) updateData.sellerCountry = sellerCountry;
      if (sellerState !== undefined) updateData.sellerState = sellerState;
      if (sellerCity !== undefined) updateData.sellerCity = sellerCity;
      if (sellerAddress !== undefined) updateData.sellerAddress = sellerAddress;
      if (buyerCompanyName !== undefined) updateData.buyerCompanyName = buyerCompanyName;
      if (buyerContactName !== undefined) updateData.buyerContactName = buyerContactName;
      if (buyerEmail !== undefined) updateData.buyerEmail = buyerEmail;
      if (buyerPhone !== undefined) updateData.buyerPhone = buyerPhone;
      if (buyerAddressType !== undefined) updateData.buyerAddressType = buyerAddressType;
      if (buyerCountry !== undefined) updateData.buyerCountry = buyerCountry;
      if (buyerState !== undefined) updateData.buyerState = buyerState;
      if (buyerCity !== undefined) updateData.buyerCity = buyerCity;
      if (buyerAddress !== undefined) updateData.buyerAddress = buyerAddress;
      if (pricingTerms !== undefined) updateData.pricingTerms = pricingTerms;
      if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
      if (deliveryTerms !== undefined) updateData.deliveryTerms = deliveryTerms;
      if (confidentiality !== undefined) updateData.confidentiality = confidentiality;
      if (indemnity !== undefined) updateData.indemnity = indemnity;
      if (terminationConditions !== undefined) updateData.terminationConditions = terminationConditions;
      if (disputeResolution !== undefined) updateData.disputeResolution = disputeResolution;
      if (governingLaw !== undefined) updateData.governingLaw = governingLaw;
      if (signatureByName !== undefined) updateData.signatureByName = signatureByName;
      if (signatureUrl !== undefined) updateData.signatureUrl = signatureUrl;
      if (status !== undefined) updateData.status = status;
      if (sellerResponse !== undefined) {
        updateData.sellerResponse = sellerResponse;
        updateData.sellerResponseDate = new Date();
      }

      const updatedContract = await tx.contract.update({
        where: { id: contractId },
        data: updateData,
      });

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await tx.contractItem.deleteMany({
          where: { contractId },
        });

        // Create new items
        if (items.length > 0) {
          await tx.contractItem.createMany({
            data: items.map((item: any, index: number) => ({
              contractId,
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
      }

      // Return updated contract with items
      return await tx.contract.findUnique({
        where: { id: contractId },
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

    return NextResponse.json(serializedContract);
  } catch (error) {
    console.error("Error updating contract:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/seller/contracts/[id] - Delete a contract
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

    const contractId = params.id;

    // Verify ownership
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    if (contract.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This contract does not belong to your company" },
        { status: 403 }
      );
    }

    // Delete contract (items will be cascade deleted)
    await prisma.contract.delete({
      where: { id: contractId },
    });

    return NextResponse.json({ message: "Contract deleted successfully" });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

