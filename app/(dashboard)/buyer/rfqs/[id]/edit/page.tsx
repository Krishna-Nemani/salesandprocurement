import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { RFQFormPage } from "@/components/buyer/rfq-form-page";

export default async function EditRFQPage({
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
    include: { items: true },
  });

  if (!rfq || rfq.buyerCompanyId !== session.user.companyId) {
    redirect("/buyer/rfqs");
  }

  return <RFQFormPage rfq={rfq} />;
}

