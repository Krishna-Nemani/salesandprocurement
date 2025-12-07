import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { BuyerPackingListListClient } from "@/components/buyer/packing-list-list-client";

export default async function BuyerPackingListsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.BUYER) {
    redirect("/");
  }

  return <BuyerPackingListListClient />;
}
