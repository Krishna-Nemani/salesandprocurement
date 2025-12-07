import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SellerInvoiceViewPage } from "@/components/seller/invoice-view-page";
import { CompanyType } from "@prisma/client";

export default async function SellerInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
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
    },
  });

  if (!invoice) {
    redirect("/seller/invoices");
  }

  // Verify ownership
  if (invoice.sellerCompanyId !== session.user.companyId) {
    redirect("/seller/invoices");
  }

  // Serialize Decimal values
  const serializedInvoice = {
    ...invoice,
    sumOfSubTotal: Number(invoice.sumOfSubTotal),
    discountPercentage: invoice.discountPercentage ? Number(invoice.discountPercentage) : null,
    additionalCharges: invoice.additionalCharges ? Number(invoice.additionalCharges) : null,
    taxPercentage: invoice.taxPercentage ? Number(invoice.taxPercentage) : null,
    totalAmount: Number(invoice.totalAmount),
    items: invoice.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })),
  };

  return <SellerInvoiceViewPage invoice={serializedInvoice as any} />;
}

