import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { QuotationFormPage } from "@/components/seller/quotation-form-page";

export default async function EditQuotationPage({
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
    },
  });

  if (!quotation) {
    redirect("/seller/quotations");
  }

  // Check ownership
  if (quotation.sellerCompanyId !== session.user.companyId) {
    redirect("/seller/quotations");
  }

  return <QuotationFormPage quotation={quotation} />;
}

