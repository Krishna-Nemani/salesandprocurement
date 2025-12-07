import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { generatePackingListPdf } from "@/lib/pdf-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { error: "Packing List not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (packingList.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdfBlob = await generatePackingListPdf({
      packingList,
      companyLogoUrl: packingList.sellerCompany?.logoUrl || null,
      companyName: packingList.sellerCompany?.name || packingList.sellerCompanyName,
    });

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PL-${packingList.plId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating Packing List PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

