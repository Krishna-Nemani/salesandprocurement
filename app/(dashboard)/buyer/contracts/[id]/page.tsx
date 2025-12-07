import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BuyerContractViewPage } from "@/components/buyer/contract-view-page";

export default async function BuyerContractPage({
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
      sellerCompany: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!contract) {
    redirect("/buyer/contracts");
  }

  // Check ownership - contract must be sent to this buyer
  if (contract.buyerCompanyId !== session.user.companyId) {
    redirect("/buyer/contracts");
  }

  return <BuyerContractViewPage contract={contract} />;
}

