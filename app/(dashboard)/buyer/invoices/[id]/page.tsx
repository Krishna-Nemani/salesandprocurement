import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BuyerInvoiceViewPage } from "@/components/buyer/invoice-view-page";
import { CompanyType } from "@prisma/client";

export default async function BuyerInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.BUYER) {
    redirect("/");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      purchaseOrder: {
        select: {
          poId: true,
        },
      },
      sellerCompany: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!invoice) {
    redirect("/buyer/invoices");
  }

  // Verify ownership
  if (invoice.buyerCompanyId !== session.user.companyId) {
    redirect("/buyer/invoices");
  }

  // Serialize Decimal values
  const serializedInvoice = {
    ...invoice,
    sumOfSubTotal: Number(invoice.sumOfSubTotal),
    discountPercentage: invoice.discountPercentage ? Number(invoice.discountPercentage) : null,
    additionalCharges: invoice.additionalCharges ? Number(invoice.additionalCharges) : null,
    taxPercentage: invoice.taxPercentage ? Number(invoice.taxPercentage) : null,
    totalAmount: Number(invoice.totalAmount),
    paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
    remainingAmount: invoice.remainingAmount ? Number(invoice.remainingAmount) : null,
    items: invoice.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })),
  };

  return <BuyerInvoiceViewPage invoice={serializedInvoice as any} />;
}

