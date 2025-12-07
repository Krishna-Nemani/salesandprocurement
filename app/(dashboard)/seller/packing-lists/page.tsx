import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { SellerPackingListListClient } from "@/components/seller/packing-list-list-client";

export default async function SellerPackingListsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  return <SellerPackingListListClient />;
}
