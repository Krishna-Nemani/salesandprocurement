import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { BuyerQuotationListClient } from "@/components/buyer/quotation-list-client";

export default async function BuyerQuotationsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.BUYER) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quotations Received</h1>
      </div>
      <BuyerQuotationListClient />
    </div>
  );
}
