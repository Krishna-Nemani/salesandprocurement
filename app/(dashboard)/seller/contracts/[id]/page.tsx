import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SellerContractViewPage } from "@/components/seller/contract-view-page";

export default async function SellerContractPage({
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

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
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
        },
      },
    },
  });

  if (!contract) {
    redirect("/seller/contracts");
  }

  // Check ownership - contract must belong to this seller
  if (contract.sellerCompanyId !== session.user.companyId) {
    redirect("/seller/contracts");
  }

  return <SellerContractViewPage contract={contract} />;
}

