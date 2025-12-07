import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";
import { BuyerDeliveryNoteViewPage } from "@/components/buyer/delivery-note-view-page";

export default async function BuyerDeliveryNotePage({
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
      sellerCompany: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!deliveryNote) {
    redirect("/buyer/delivery-notes");
  }

  // Check ownership - DN must be sent to this buyer
  if (deliveryNote.buyerCompanyId !== session.user.companyId) {
    redirect("/buyer/delivery-notes");
  }

  return <BuyerDeliveryNoteViewPage deliveryNote={deliveryNote} />;
}

