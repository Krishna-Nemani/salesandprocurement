import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { CompanyType } from "@prisma/client";
import { BuyerFormPage } from "@/components/seller/buyer-form-page";

export default async function NewBuyerPage() {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/auth/signin");
  }

  // Check if user belongs to a SELLER company
  if (session.user.companyType !== CompanyType.SELLER) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">403 Forbidden</h1>
          <p className="text-muted-foreground">
            Only seller companies can access this page.
          </p>
        </div>
      </div>
    );
  }

  return <BuyerFormPage />;
}

