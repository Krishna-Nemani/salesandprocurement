import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { generateRfqPdf } from "@/lib/pdf-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rfq = await prisma.rFQ.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        buyerCompany: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    // Check if RFQ was sent to this seller
    const sellerCompany = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });

    const isAuthorized =
      rfq.sellerCompanyId === session.user.companyId ||
      (sellerCompany &&
        rfq.sellerCompanyName &&
        rfq.sellerCompanyName.toLowerCase() === sellerCompany.name.toLowerCase());

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate PDF with buyer's company logo (since buyer created the RFQ)
    const pdfBlob = await generateRfqPdf({
      rfq,
      companyLogoUrl: rfq.buyerCompany?.logoUrl || null,
      companyName: rfq.buyerCompany?.name || rfq.buyerCompanyName,
    });

    // Convert blob to buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="RFQ-${rfq.rfqId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating RFQ PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

