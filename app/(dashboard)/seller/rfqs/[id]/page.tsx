import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { SellerRFQViewPage } from "@/components/seller/rfq-view-page";

export default async function ViewSellerRFQPage({
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

  const rfq = await prisma.rFQ.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      buyerCompany: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!rfq) {
    redirect("/seller/rfqs");
  }

  // Check if RFQ was sent to this seller (by ID or by company name)
  const sellerCompany = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  });

  const isAuthorized =
    rfq.sellerCompanyId === session.user.companyId ||
    (sellerCompany &&
      rfq.sellerCompanyName &&
      rfq.sellerCompanyName.toLowerCase() === sellerCompany.name.toLowerCase());

  if (!isAuthorized) {
    redirect("/seller/rfqs");
  }

  return <SellerRFQViewPage rfq={rfq} />;
}

