import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { generateSalesOrderPdf } from "@/lib/pdf-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const salesOrder = await prisma.salesOrder.findUnique({
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

    if (!salesOrder) {
      return NextResponse.json(
        { error: "Sales Order not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (salesOrder.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdfBlob = await generateSalesOrderPdf({
      salesOrder,
      companyLogoUrl: salesOrder.sellerCompany?.logoUrl || null,
      companyName: salesOrder.sellerCompany?.name || salesOrder.sellerCompanyName,
    });

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SO-${salesOrder.soId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating Sales Order PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

