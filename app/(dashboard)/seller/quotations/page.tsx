import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { SellerQuotationListClient } from "@/components/seller/quotation-list-client";

export default async function SellerQuotationsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Quotations</h1>
      </div>
      <SellerQuotationListClient />
    </div>
  );
}
