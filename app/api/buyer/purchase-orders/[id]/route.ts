import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, POStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializePurchaseOrder(po: any): any {
  return {
    ...po,
    discountPercentage: po.discountPercentage ? Number(po.discountPercentage) : null,
    additionalCharges: po.additionalCharges ? Number(po.additionalCharges) : null,
    taxPercentage: po.taxPercentage ? Number(po.taxPercentage) : null,
    totalAmount: Number(po.totalAmount),
    items: po.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })) || [],
  };
}

// GET /api/buyer/purchase-orders/[id] - Get a specific purchase order
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

    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const poId = params.id;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        items: true,
        contract: {
          select: {
            contractId: true,
          },
        },
        quotation: {
          select: {
            quoteId: true,
          },
        },
        sellerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Check ownership - PO must belong to this buyer
    if (purchaseOrder.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This purchase order does not belong to your company" },
        { status: 403 }
      );
    }

    // Serialize Decimal values to numbers
    const serializedPO = serializePurchaseOrder(purchaseOrder);

    return NextResponse.json(serializedPO);
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/buyer/purchase-orders/[id] - Update an existing purchase order
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

    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const poId = params.id;
    const body = await request.json();

    // Verify ownership
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (existingPO.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This purchase order does not belong to your company" },
        { status: 403 }
      );
    }

    const {
      poIssuedDate,
      expectedDeliveryDate,
      currency,
      buyerCompanyName,
      buyerContactName,
      buyerEmail,
      buyerPhone,
      buyerAddressType,
      buyerCountry,
      buyerState,
      buyerCity,
      buyerAddress,
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddressType,
      sellerCountry,
      sellerState,
      sellerCity,
      sellerAddress,
      deliveryAddressType,
      deliveryCountry,
      deliveryState,
      deliveryCity,
      deliveryAddress,
      discountPercentage,
      additionalCharges,
      taxPercentage,
      totalAmount,
      paymentTerms,
      deliveryTerms,
      notes,
      signatureByName,
      signatureUrl,
      items,
      status,
    } = body;

    // Validate dates if provided
    if (poIssuedDate && expectedDeliveryDate) {
      const issuedDate = new Date(poIssuedDate);
      const deliveryDate = new Date(expectedDeliveryDate);
      
      if (deliveryDate <= issuedDate) {
        return NextResponse.json(
          { error: "Expected delivery date must be after the PO issued date" },
          { status: 400 }
        );
      }
    }

    // Update purchase order and items in a transaction
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      // Update purchase order
      const updateData: any = {};
      if (poIssuedDate !== undefined) updateData.poIssuedDate = new Date(poIssuedDate);
      if (expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = new Date(expectedDeliveryDate);
      if (currency !== undefined) updateData.currency = currency;
      if (buyerCompanyName !== undefined) updateData.buyerCompanyName = buyerCompanyName;
      if (buyerContactName !== undefined) updateData.buyerContactName = buyerContactName;
      if (buyerEmail !== undefined) updateData.buyerEmail = buyerEmail;
      if (buyerPhone !== undefined) updateData.buyerPhone = buyerPhone;
      if (buyerAddressType !== undefined) updateData.buyerAddressType = buyerAddressType;
      if (buyerCountry !== undefined) updateData.buyerCountry = buyerCountry;
      if (buyerState !== undefined) updateData.buyerState = buyerState;
      if (buyerCity !== undefined) updateData.buyerCity = buyerCity;
      if (buyerAddress !== undefined) updateData.buyerAddress = buyerAddress;
      if (sellerCompanyName !== undefined) updateData.sellerCompanyName = sellerCompanyName;
      if (sellerContactName !== undefined) updateData.sellerContactName = sellerContactName;
      if (sellerEmail !== undefined) updateData.sellerEmail = sellerEmail;
      if (sellerPhone !== undefined) updateData.sellerPhone = sellerPhone;
      if (sellerAddressType !== undefined) updateData.sellerAddressType = sellerAddressType;
      if (sellerCountry !== undefined) updateData.sellerCountry = sellerCountry;
      if (sellerState !== undefined) updateData.sellerState = sellerState;
      if (sellerCity !== undefined) updateData.sellerCity = sellerCity;
      if (sellerAddress !== undefined) updateData.sellerAddress = sellerAddress;
      if (deliveryAddressType !== undefined) updateData.deliveryAddressType = deliveryAddressType;
      if (deliveryCountry !== undefined) updateData.deliveryCountry = deliveryCountry;
      if (deliveryState !== undefined) updateData.deliveryState = deliveryState;
      if (deliveryCity !== undefined) updateData.deliveryCity = deliveryCity;
      if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress;
      if (discountPercentage !== undefined) updateData.discountPercentage = discountPercentage ? parseFloat(discountPercentage) : null;
      if (additionalCharges !== undefined) updateData.additionalCharges = additionalCharges ? parseFloat(additionalCharges) : null;
      if (taxPercentage !== undefined) updateData.taxPercentage = taxPercentage ? parseFloat(taxPercentage) : null;
      if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount) || 0;
      if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
      if (deliveryTerms !== undefined) updateData.deliveryTerms = deliveryTerms;
      if (notes !== undefined) updateData.notes = notes;
      if (signatureByName !== undefined) updateData.signatureByName = signatureByName;
      if (signatureUrl !== undefined) updateData.signatureUrl = signatureUrl;
      if (status !== undefined) updateData.status = status;

      const updatedPO = await tx.purchaseOrder.update({
        where: { id: poId },
        data: updateData,
      });

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: poId },
        });

        // Create new items
        if (items.length > 0) {
          await tx.purchaseOrderItem.createMany({
            data: items.map((item: any, index: number) => ({
              purchaseOrderId: poId,
              serialNumber: index + 1,
              productName: item.productName || "",
              productDescription: item.productDescription || null,
              sku: item.sku || null,
              hsnCode: item.hsnCode || null,
              uom: item.uom || null,
              quantity: parseFloat(item.quantity) || 0,
              unitPrice: parseFloat(item.unitPrice) || 0,
              subTotal: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
            })),
          });
        }
      }

      // Return updated purchase order with items
      return await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: {
          items: true,
          contract: {
            select: {
              contractId: true,
            },
          },
          quotation: {
            select: {
              quoteId: true,
            },
          },
        },
      });
    });

    // Serialize Decimal values to numbers
    const serializedPO = serializePurchaseOrder(purchaseOrder);

    return NextResponse.json(serializedPO);
  } catch (error) {
    console.error("Error updating purchase order:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/buyer/purchase-orders/[id] - Delete a purchase order
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

    if (session.user.companyType !== CompanyType.BUYER) {
      return NextResponse.json(
        { error: "Forbidden: Only buyer companies can access this resource" },
        { status: 403 }
      );
    }

    const poId = params.id;

    // Verify ownership
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (purchaseOrder.buyerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This purchase order does not belong to your company" },
        { status: 403 }
      );
    }

    // Delete purchase order (items will be cascade deleted)
    await prisma.purchaseOrder.delete({
      where: { id: poId },
    });

    return NextResponse.json({ message: "Purchase order deleted successfully" });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

