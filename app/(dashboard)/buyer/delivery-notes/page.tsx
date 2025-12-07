import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { BuyerDeliveryNoteListClient } from "@/components/buyer/delivery-note-list-client";

export default async function BuyerDeliveryNotesPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.BUYER) {
    redirect("/");
  }

  return <BuyerDeliveryNoteListClient />;
}
