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

// GET /api/seller/invoices/[id] - Get a specific invoice
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

    // Check if user belongs to a SELLER company
    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        purchaseOrder: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (invoice.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This invoice does not belong to your company" },
        { status: 403 }
      );
    }

    const serializedInvoice = serializeInvoice(invoice);

    return NextResponse.json(serializedInvoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/seller/invoices/[id] - Update an invoice
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

    // Check if user belongs to a SELLER company
    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    // Verify the invoice exists and belongs to this seller
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        sellerCompanyId: true,
        status: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (existingInvoice.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This invoice does not belong to your company" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

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

    // Update invoice and items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: params.id },
        data: {
          invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
          sellerCompanyName: sellerCompanyName !== undefined ? sellerCompanyName : undefined,
          sellerContactName: sellerContactName !== undefined ? sellerContactName : undefined,
          sellerEmail: sellerEmail !== undefined ? sellerEmail : undefined,
          sellerPhone: sellerPhone !== undefined ? sellerPhone : undefined,
          sellerAddress: sellerAddress !== undefined ? sellerAddress : undefined,
          buyerCompanyName: buyerCompanyName !== undefined ? buyerCompanyName : undefined,
          buyerContactName: buyerContactName !== undefined ? buyerContactName : undefined,
          buyerEmail: buyerEmail !== undefined ? buyerEmail : undefined,
          buyerPhone: buyerPhone !== undefined ? buyerPhone : undefined,
          buyerAddress: buyerAddress !== undefined ? buyerAddress : undefined,
          shipToCompanyName: shipToCompanyName !== undefined ? shipToCompanyName : undefined,
          shipToContactName: shipToContactName !== undefined ? shipToContactName : undefined,
          shipToEmail: shipToEmail !== undefined ? shipToEmail : undefined,
          shipToPhone: shipToPhone !== undefined ? shipToPhone : undefined,
          shipToAddress: shipToAddress !== undefined ? shipToAddress : undefined,
          sumOfSubTotal: Math.round(sumOfSubTotal * 100) / 100,
          discountPercentage: discountPercentage !== undefined
            ? Math.round((Number(discountPercentage) || 0) * 100) / 100
            : undefined,
          additionalCharges: additionalCharges !== undefined
            ? Math.round((Number(additionalCharges) || 0) * 100) / 100
            : undefined,
          taxPercentage: taxPercentage !== undefined
            ? Math.round((Number(taxPercentage) || 0) * 100) / 100
            : undefined,
          totalAmount: Math.round(totalAmount * 100) / 100,
          termsAndConditions: termsAndConditions !== undefined ? termsAndConditions : undefined,
          signatureByName: signatureByName !== undefined ? signatureByName : undefined,
          signatureUrl: signatureUrl !== undefined ? signatureUrl : undefined,
          status: status ? (status as InvoiceStatus) : undefined,
        },
      });

      // Delete existing items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: params.id },
      });

      // Create new items
      await tx.invoiceItem.createMany({
        data: items.map((item: any) => ({
          invoiceId: params.id,
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

      return updatedInvoice;
    });

    // Fetch the updated invoice with relations
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        purchaseOrder: {
          select: {
            poId: true,
          },
        },
      },
    });

    const serializedInvoice = serializeInvoice(updatedInvoice);

    return NextResponse.json(serializedInvoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/seller/invoices/[id] - Delete an invoice
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

    // Check if user belongs to a SELLER company
    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    // Verify the invoice exists and belongs to this seller
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        sellerCompanyId: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This invoice does not belong to your company" },
        { status: 403 }
      );
    }

    // Delete invoice (items will be cascade deleted)
    await prisma.invoice.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

