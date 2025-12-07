import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { SellerDeliveryNoteListClient } from "@/components/seller/delivery-note-list-client";

export default async function SellerDeliveryNotesPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  return <SellerDeliveryNoteListClient />;
}
