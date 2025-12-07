import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { BuyerPackingListViewPage } from "@/components/buyer/packing-list-view-page";

export default async function BuyerPackingListPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.companyType !== CompanyType.BUYER) {
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
      sellerCompany: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!packingList) {
    redirect("/buyer/packing-lists");
  }

  // Verify ownership - PL must be sent to this buyer
  if (packingList.buyerCompanyId !== session.user.companyId) {
    redirect("/buyer/packing-lists");
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

  return <BuyerPackingListViewPage packingList={serializedPL as any} />;
}

