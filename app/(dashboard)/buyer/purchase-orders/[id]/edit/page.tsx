import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { BuyerPurchaseOrderFormPage } from "@/components/buyer/purchase-order-form-page";

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.BUYER) {
    redirect("/");
  }

  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      contract: {
        select: {
          contractId: true,
        },
      },
      quotation: {
        select: {
          quoteId: true,
        },
      },
    },
  });

  if (!purchaseOrder) {
    redirect("/buyer/purchase-orders");
  }

  // Check ownership
  if (purchaseOrder.buyerCompanyId !== session.user.companyId) {
    redirect("/buyer/purchase-orders");
  }

  return <BuyerPurchaseOrderFormPage purchaseOrder={purchaseOrder} />;
}

