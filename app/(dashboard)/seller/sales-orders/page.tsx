import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { SellerSalesOrderListClient } from "@/components/seller/sales-order-list-client";

export default async function SellerSalesOrdersPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  return <SellerSalesOrderListClient />;
}

