import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { BuyerQuotationViewPage } from "@/components/buyer/quotation-view-page";

export default async function ViewBuyerQuotationPage({
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

  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: {
      items: true,
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
          logoUrl: true,
        },
      },
    },
  });

  if (!quotation) {
    redirect("/buyer/quotations");
  }

  // Check ownership - quotation must be sent to this buyer
  if (quotation.buyerCompanyId !== session.user.companyId) {
    redirect("/buyer/quotations");
  }

  return <BuyerQuotationViewPage quotation={quotation} />;
}

