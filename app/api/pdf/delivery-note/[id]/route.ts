import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { generateDeliveryNotePdf } from "@/lib/pdf-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { error: "Delivery Note not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (deliveryNote.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdfBlob = await generateDeliveryNotePdf({
      deliveryNote,
      companyLogoUrl: deliveryNote.sellerCompany?.logoUrl || null,
      companyName: deliveryNote.sellerCompany?.name || deliveryNote.sellerCompanyName,
    });

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="DN-${deliveryNote.dnId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating Delivery Note PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

