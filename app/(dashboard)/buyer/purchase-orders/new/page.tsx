import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { BuyerPurchaseOrderFormPage } from "@/components/buyer/purchase-order-form-page";

export default async function NewPurchaseOrderPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.BUYER) {
    redirect("/");
  }

  return <BuyerPurchaseOrderFormPage />;
}

