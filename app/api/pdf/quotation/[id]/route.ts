import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { generateQuotationPdf } from "@/lib/pdf-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        sellerCompany: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // Check ownership - quotation must be created by this seller
    if (quotation.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate PDF
    const pdfBlob = await generateQuotationPdf({
      quotation,
      companyLogoUrl: quotation.sellerCompany?.logoUrl || null,
      companyName: quotation.sellerCompany?.name || quotation.sellerCompanyName,
    });

    // Convert blob to buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quotation-${quotation.quoteId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating Quotation PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to generate PDF", details: errorMessage },
      { status: 500 }
    );
  }
}

