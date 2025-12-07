import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyProfileClient } from "@/components/company/company-profile-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function CompanyProfilePage() {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/auth/signin");
  }

  // Load company with addresses
  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    include: {
      addresses: true,
    },
  });

  if (!company) {
    return (
      <div className="p-6">
        <p className="text-destructive">Company not found</p>
      </div>
    );
  }

  const addresses = company.addresses || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your company information and addresses
        </p>
      </div>

      <CompanyProfileClient company={company} addresses={addresses} />
    </div>
  );
}
