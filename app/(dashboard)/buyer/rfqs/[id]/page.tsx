import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { RFQViewPage } from "@/components/buyer/rfq-view-page";

export default async function ViewRFQPage({
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

  const rfq = await prisma.rFQ.findUnique({
    where: { id: params.id },
    include: { 
      items: true,
      buyerCompany: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!rfq || rfq.buyerCompanyId !== session.user.companyId) {
    redirect("/buyer/rfqs");
  }

  return <RFQViewPage rfq={rfq} />;
}

