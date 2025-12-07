import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { BuyerPurchaseOrderListClient } from "@/components/buyer/purchase-order-list-client";

export default async function BuyerPurchaseOrdersPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.BUYER) {
    redirect("/");
  }

  return <BuyerPurchaseOrderListClient />;
}
