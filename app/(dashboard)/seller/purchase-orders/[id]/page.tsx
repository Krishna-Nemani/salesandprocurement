import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { SellerPurchaseOrderViewPage } from "@/components/seller/purchase-order-view-page";

export default async function SellerPurchaseOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
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
        },
      },
    },
  });

  if (!purchaseOrder) {
    redirect("/seller/purchase-orders");
  }

  // Get seller's company name for matching
  const sellerCompany = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  });

  // Check ownership - PO must be sent to this seller
  const isOwner =
    purchaseOrder.sellerCompanyId === session.user.companyId ||
    (purchaseOrder.sellerCompanyId === null &&
      sellerCompany &&
      purchaseOrder.sellerCompanyName?.toLowerCase() === sellerCompany.name.toLowerCase());

  if (!isOwner) {
    redirect("/seller/purchase-orders");
  }

  return <SellerPurchaseOrderViewPage purchaseOrder={purchaseOrder} />;
}

