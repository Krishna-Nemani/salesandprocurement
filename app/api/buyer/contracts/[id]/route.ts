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

// GET /api/buyer/contracts/[id] - Get a specific contract
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

    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
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
        sellerCompany: {
          select: {
            id: true,
            name: true,
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

    // Check ownership - contract must be sent to this buyer
    if (contract.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This contract was not sent to your company" },
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

// PATCH /api/buyer/contracts/[id] - Accept, reject, or suggest changes to a contract
export async function PATCH(
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

    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const contractId = params.id;
    const body = await request.json();
    const { action, suggestions } = body; // action: "accept", "reject", or "suggest_changes"

    if (!action || !["accept", "reject", "suggest_changes"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept', 'reject', or 'suggest_changes'" },
        { status: 400 }
      );
    }

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

    if (existingContract.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This contract was not sent to your company" },
        { status: 403 }
      );
    }

    // Only allow actions if status is not already APPROVED or REJECTED (unless suggesting changes)
    if (action !== "suggest_changes" && (existingContract.status === ContractStatus.APPROVED || existingContract.status === ContractStatus.REJECTED)) {
      return NextResponse.json(
        { error: `Cannot ${action} contract with status ${existingContract.status}` },
        { status: 400 }
      );
    }

    // Update contract status
    let newStatus: ContractStatus;
    let updateData: any = {};

    if (action === "accept") {
      newStatus = ContractStatus.APPROVED;
    } else if (action === "reject") {
      newStatus = ContractStatus.REJECTED;
    } else {
      // suggest_changes
      newStatus = ContractStatus.PENDING_CHANGES;
      if (suggestions) {
        updateData.buyerSuggestions = suggestions;
        updateData.buyerResponseDate = new Date();
      }
    }

    updateData.status = newStatus;

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: updateData,
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

    // Serialize Decimal values to numbers
    const serializedContract = serializeContract(updatedContract);

    return NextResponse.json(serializedContract);
  } catch (error) {
    console.error("Error updating contract status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

