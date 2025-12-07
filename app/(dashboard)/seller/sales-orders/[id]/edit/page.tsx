import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { SellerSalesOrderFormPage } from "@/components/seller/sales-order-form-page";

export default async function EditSellerSalesOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      purchaseOrder: {
        select: {
          poId: true,
        },
      },
    },
  });

  if (!salesOrder) {
    redirect("/seller/sales-orders");
  }

  // Check ownership - SO must belong to this seller
  if (salesOrder.sellerCompanyId !== session.user.companyId) {
    redirect("/seller/sales-orders");
  }

  return <SellerSalesOrderFormPage salesOrder={salesOrder} />;
}

