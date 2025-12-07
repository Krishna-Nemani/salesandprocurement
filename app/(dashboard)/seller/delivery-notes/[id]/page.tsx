import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { SellerDeliveryNoteViewPage } from "@/components/seller/delivery-note-view-page";

export default async function SellerDeliveryNotePage({
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

  const deliveryNote = await prisma.deliveryNote.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      purchaseOrder: {
        select: {
          poId: true,
        },
      },
      salesOrder: {
        select: {
          soId: true,
        },
      },
    },
  });

  if (!deliveryNote) {
    redirect("/seller/delivery-notes");
  }

  // Check ownership - DN must belong to this seller
  if (deliveryNote.sellerCompanyId !== session.user.companyId) {
    redirect("/seller/delivery-notes");
  }

  return <SellerDeliveryNoteViewPage deliveryNote={deliveryNote} />;
}

