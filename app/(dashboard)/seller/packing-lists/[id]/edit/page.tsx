import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { SellerPackingListFormPage } from "@/components/seller/packing-list-form-page";

export default async function EditPackingListPage({
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

  const packingList = await prisma.packingList.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      purchaseOrder: {
        select: {
          poId: true,
        },
      },
      deliveryNote: {
        select: {
          dnId: true,
        },
      },
      salesOrder: {
        select: {
          soId: true,
        },
      },
    },
  });

  if (!packingList) {
    redirect("/seller/packing-lists");
  }

  // Verify ownership
  if (packingList.sellerCompanyId !== session.user.companyId) {
    redirect("/seller/packing-lists");
  }

  // Serialize Decimal values
  const serializedPL = {
    ...packingList,
    totalGrossWeight: packingList.totalGrossWeight ? Number(packingList.totalGrossWeight) : null,
    totalNetWeight: packingList.totalNetWeight ? Number(packingList.totalNetWeight) : null,
    items: packingList.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
      netWeight: item.netWeight ? Number(item.netWeight) : null,
    })),
  };

  return <SellerPackingListFormPage packingList={serializedPL as any} />;
}

