import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { SellerDeliveryNoteFormPage } from "@/components/seller/delivery-note-form-page";

export default async function NewSellerDeliveryNotePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  return <SellerDeliveryNoteFormPage />;
}

