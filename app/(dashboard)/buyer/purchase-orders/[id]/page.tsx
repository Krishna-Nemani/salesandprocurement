import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { BuyerPurchaseOrderViewPage } from "@/components/buyer/purchase-order-view-page";

export default async function BuyerPurchaseOrderPage({
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
      buyerCompany: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
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

  return <BuyerPurchaseOrderViewPage purchaseOrder={purchaseOrder} />;
}

