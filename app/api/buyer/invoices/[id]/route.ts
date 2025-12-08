import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, InvoiceStatus } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

// GET /api/buyer/invoices/[id] - Get a specific invoice
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

    // Check if user belongs to a BUYER company
    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
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
    if (invoice.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This invoice was not sent to your company" },
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

// PATCH /api/buyer/invoices/[id] - Accept, reject, or make payment on an invoice
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

    // Check if user belongs to a BUYER company
    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    // Verify the invoice exists and belongs to this buyer
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        buyerCompanyId: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        paymentReceiptUrl: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This invoice was not sent to your company" },
        { status: 403 }
      );
    }

    // Handle file upload for payment receipt
    let paymentReceiptUrl: string | null = null;
    let action: string;
    let paymentAmount: string | null = null;
    
    // Check if request has form data (file upload for partial payment)
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const receiptFile = formData.get("receipt") as File | null;
      action = formData.get("action") as string;
      paymentAmount = formData.get("paymentAmount") as string | null;

      if (receiptFile && (action === "partial_pay" || action === "pay")) {
        // Validate file type (image or PDF)
        const isValidType = receiptFile.type.match(/^image\/(jpeg|jpg|png)$/) || receiptFile.type === "application/pdf";
        if (!isValidType) {
          return NextResponse.json(
            { error: "Payment receipt must be a JPG, PNG, or PDF file" },
            { status: 400 }
          );
        }

        // Validate file size (5MB)
        if (receiptFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: "Payment receipt must be less than 5MB" },
            { status: 400 }
          );
        }

        // Upload receipt file
        const bytes = await receiptFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), "public", "uploads", "receipts");
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = receiptFile.name.split(".").pop() || (receiptFile.type.includes("pdf") ? "pdf" : "jpg");
        const filename = `receipt_${params.id}_${timestamp}.${extension}`;
        const filepath = join(uploadsDir, filename);

        // Write file
        await writeFile(filepath, buffer);

        // Return the public URL
        paymentReceiptUrl = `/uploads/receipts/${filename}`;
      }
    } else {
      // Handle JSON request (for accept/reject actions)
      const body = await request.json();
      action = body.action;
      paymentAmount = body.paymentAmount || null;
    }

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    let newStatus: InvoiceStatus;
    let paidAmount: number = Number(invoice.paidAmount) || 0;
    let remainingAmount: number = Number(invoice.remainingAmount) || Number(invoice.totalAmount);

    switch (action) {
      case "accept":
        // Accept invoice - change status to PENDING (ready for payment)
        if (invoice.status === InvoiceStatus.DRAFT) {
          newStatus = InvoiceStatus.PENDING;
        } else {
          return NextResponse.json(
            { error: "Invoice cannot be accepted in its current status" },
            { status: 400 }
          );
        }
        break;

      case "reject":
        // Reject invoice - keep as DRAFT (buyer hasn't accepted)
        if (invoice.status === InvoiceStatus.DRAFT) {
          newStatus = InvoiceStatus.DRAFT;
        } else if (invoice.status === InvoiceStatus.PENDING) {
          newStatus = InvoiceStatus.DRAFT;
        } else {
          return NextResponse.json(
            { error: "Invoice cannot be rejected in its current status" },
            { status: 400 }
          );
        }
        break;

      case "pay":
        // Full payment - change status to PAID
        if (invoice.status === InvoiceStatus.PENDING || invoice.status === InvoiceStatus.OVERDUE) {
          newStatus = InvoiceStatus.PAID;
          paidAmount = Number(invoice.totalAmount);
          remainingAmount = 0;
        } else if (invoice.status === InvoiceStatus.PAID) {
          return NextResponse.json(
            { error: "Invoice is already paid" },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { error: "Invoice cannot be paid in its current status" },
            { status: 400 }
          );
        }
        break;

      case "partial_pay":
        // Partial payment - keep status as PENDING or OVERDUE
        if (!paymentAmount || Number(paymentAmount) <= 0) {
          return NextResponse.json(
            { error: "Payment amount is required and must be greater than 0" },
            { status: 400 }
          );
        }

        const paymentAmt = Number(paymentAmount);
        const totalAmt = Number(invoice.totalAmount);
        const currentPaid = Number(invoice.paidAmount) || 0;

        if (paymentAmt >= totalAmt - currentPaid) {
          // If payment amount covers remaining balance, treat as full payment
          newStatus = InvoiceStatus.PAID;
          paidAmount = totalAmt;
          remainingAmount = 0;
        } else {
          // Partial payment - keep current status (PENDING or OVERDUE)
          newStatus = invoice.status;
          paidAmount = currentPaid + paymentAmt;
          remainingAmount = totalAmt - paidAmount;
        }

        // Require receipt for partial payment
        if (!paymentReceiptUrl) {
          return NextResponse.json(
            { error: "Payment receipt is required for partial payment" },
            { status: 400 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        paidAmount: Math.round(paidAmount * 100) / 100,
        remainingAmount: Math.round(remainingAmount * 100) / 100,
        paymentReceiptUrl: paymentReceiptUrl || invoice.paymentReceiptUrl || null,
      },
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
