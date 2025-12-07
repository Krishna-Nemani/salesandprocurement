import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { SellerQuotationViewPage } from "@/components/seller/quotation-view-page";

export default async function ViewQuotationPage({
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

  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: {
      items: true,
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

  if (!quotation) {
    redirect("/seller/quotations");
  }

  // Check ownership
  if (quotation.sellerCompanyId !== session.user.companyId) {
    redirect("/seller/quotations");
  }

  return <SellerQuotationViewPage quotation={quotation} />;
}

