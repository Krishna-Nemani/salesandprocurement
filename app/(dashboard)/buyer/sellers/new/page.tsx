import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { SellerFormPage } from "@/components/buyer/seller-form-page";

export default async function NewSellerPage() {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/auth/signin");
  }

  // Check if user belongs to a BUYER company
  if (session.user.companyType !== CompanyType.BUYER) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">403 Forbidden</h1>
          <p className="text-muted-foreground">
            Only buyer companies can access this page.
          </p>
        </div>
      </div>
    );
  }

  return <SellerFormPage />;
}

