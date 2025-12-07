import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { SellerSalesOrderFormPage } from "@/components/seller/sales-order-form-page";

export default async function NewSellerSalesOrderPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  return <SellerSalesOrderFormPage />;
}

