import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { SellerPurchaseOrderListClient } from "@/components/seller/purchase-order-list-client";

export default async function SellerPurchaseOrdersPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  return <SellerPurchaseOrderListClient />;
}
