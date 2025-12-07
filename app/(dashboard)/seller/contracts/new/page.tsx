import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { ContractFormPage } from "@/components/seller/contract-form-page";

export default async function NewContractPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  return <ContractFormPage />;
}

