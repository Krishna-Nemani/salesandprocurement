import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, DNStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializeDeliveryNote(dn: any): any {
  return {
    ...dn,
    items: dn.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      quantityDelivered: Number(item.quantityDelivered),
    })) || [],
  };
}

// GET /api/seller/delivery-notes/[id] - Get a specific delivery note
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const dnId = params.id;

    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: dnId },
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
        buyerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!deliveryNote) {
      return NextResponse.json(
        { error: "Delivery note not found" },
        { status: 404 }
      );
    }

    // Check ownership - DN must belong to this seller
    if (deliveryNote.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This delivery note does not belong to your company" },
        { status: 403 }
      );
    }

    // Serialize Decimal values to numbers
    const serializedDN = serializeDeliveryNote(deliveryNote);

    return NextResponse.json(serializedDN);
  } catch (error) {
    console.error("Error fetching delivery note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/seller/delivery-notes/[id] - Update an existing delivery note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const dnId = params.id;
    const body = await request.json();

    // Verify ownership
    const existingDN = await prisma.deliveryNote.findUnique({
      where: { id: dnId },
    });

    if (!existingDN) {
      return NextResponse.json(
        { error: "Delivery note not found" },
        { status: 404 }
      );
    }

    if (existingDN.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This delivery note does not belong to your company" },
        { status: 403 }
      );
    }

    const {
      delDate,
      shippingMethod,
      shippingDate,
      carrierName,
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddress,
      buyerCompanyName,
      buyerContactName,
      buyerEmail,
      buyerPhone,
      buyerAddress,
      notes,
      signatureByName,
      signatureUrl,
      items,
      status,
    } = body;

    // Update delivery note and items in a transaction
    const deliveryNote = await prisma.$transaction(async (tx) => {
      // Update delivery note
      const updateData: any = {};
      if (delDate !== undefined) updateData.delDate = new Date(delDate);
      if (shippingMethod !== undefined) updateData.shippingMethod = shippingMethod;
      if (shippingDate !== undefined) updateData.shippingDate = shippingDate ? new Date(shippingDate) : null;
      if (carrierName !== undefined) updateData.carrierName = carrierName;
      if (sellerCompanyName !== undefined) updateData.sellerCompanyName = sellerCompanyName;
      if (sellerContactName !== undefined) updateData.sellerContactName = sellerContactName;
      if (sellerEmail !== undefined) updateData.sellerEmail = sellerEmail;
      if (sellerPhone !== undefined) updateData.sellerPhone = sellerPhone;
      if (sellerAddress !== undefined) updateData.sellerAddress = sellerAddress;
      if (buyerCompanyName !== undefined) updateData.buyerCompanyName = buyerCompanyName;
      if (buyerContactName !== undefined) updateData.buyerContactName = buyerContactName;
      if (buyerEmail !== undefined) updateData.buyerEmail = buyerEmail;
      if (buyerPhone !== undefined) updateData.buyerPhone = buyerPhone;
      if (buyerAddress !== undefined) updateData.buyerAddress = buyerAddress;
      if (notes !== undefined) updateData.notes = notes;
      if (signatureByName !== undefined) updateData.signatureByName = signatureByName;
      if (signatureUrl !== undefined) updateData.signatureUrl = signatureUrl;
      if (status !== undefined) updateData.status = status;

      const updatedDN = await tx.deliveryNote.update({
        where: { id: dnId },
        data: updateData,
      });

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await tx.deliveryNoteItem.deleteMany({
          where: { deliveryNoteId: dnId },
        });

        // Create new items
        if (items.length > 0) {
          await tx.deliveryNoteItem.createMany({
            data: items.map((item: any, index: number) => ({
              deliveryNoteId: dnId,
              serialNumber: index + 1,
              productName: item.productName || "",
              productDescription: item.productDescription || null,
              sku: item.sku || null,
              hsnCode: item.hsnCode || null,
              uom: item.uom || null,
              quantity: Math.round((parseFloat(item.quantity) || 0) * 100) / 100,
              quantityDelivered: Math.round((parseFloat(item.quantityDelivered) || 0) * 100) / 100,
            })),
          });
        }
      }

      // Return updated delivery note with items
      return await tx.deliveryNote.findUnique({
        where: { id: dnId },
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
    });

    // Serialize Decimal values to numbers
    const serializedDN = serializeDeliveryNote(deliveryNote);

    return NextResponse.json(serializedDN);
  } catch (error) {
    console.error("Error updating delivery note:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/seller/delivery-notes/[id] - Delete a delivery note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.companyType !== CompanyType.SELLER) {
      return NextResponse.json(
        { error: "Forbidden: Only seller companies can access this resource" },
        { status: 403 }
      );
    }

    const dnId = params.id;

    // Verify ownership
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: dnId },
    });

    if (!deliveryNote) {
      return NextResponse.json(
        { error: "Delivery note not found" },
        { status: 404 }
      );
    }

    if (deliveryNote.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This delivery note does not belong to your company" },
        { status: 403 }
      );
    }

    // Delete delivery note (items will be cascade deleted)
    await prisma.deliveryNote.delete({
      where: { id: dnId },
    });

    return NextResponse.json({ message: "Delivery note deleted successfully" });
  } catch (error) {
    console.error("Error deleting delivery note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

