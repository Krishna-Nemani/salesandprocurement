import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, SOStatus } from "@prisma/client";

// Helper function to serialize Decimal values to numbers
function serializeSalesOrder(so: any): any {
  return {
    ...so,
    discountPercentage: so.discountPercentage ? Number(so.discountPercentage) : null,
    additionalCharges: so.additionalCharges ? Number(so.additionalCharges) : null,
    taxPercentage: so.taxPercentage ? Number(so.taxPercentage) : null,
    totalAmount: Number(so.totalAmount),
    items: so.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })) || [],
  };
}

// GET /api/seller/sales-orders/[id] - Get a specific sales order
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

    const soId = params.id;

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: soId },
      include: {
        items: true,
        purchaseOrder: {
          select: {
            poId: true,
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

    if (!salesOrder) {
      return NextResponse.json(
        { error: "Sales order not found" },
        { status: 404 }
      );
    }

    // Check ownership - SO must belong to this seller
    if (salesOrder.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This sales order does not belong to your company" },
        { status: 403 }
      );
    }

    // Serialize Decimal values to numbers
    const serializedSO = serializeSalesOrder(salesOrder);

    return NextResponse.json(serializedSO);
  } catch (error) {
    console.error("Error fetching sales order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/seller/sales-orders/[id] - Update an existing sales order
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

    const soId = params.id;
    const body = await request.json();

    // Verify ownership
    const existingSO = await prisma.salesOrder.findUnique({
      where: { id: soId },
    });

    if (!existingSO) {
      return NextResponse.json(
        { error: "Sales order not found" },
        { status: 404 }
      );
    }

    if (existingSO.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This sales order does not belong to your company" },
        { status: 403 }
      );
    }

    const {
      soCreatedDate,
      plannedShipDate,
      currency,
      sellerCompanyName,
      sellerContactName,
      sellerEmail,
      sellerPhone,
      sellerAddressType,
      sellerCountry,
      sellerState,
      sellerCity,
      sellerAddress,
      buyerCompanyName,
      buyerContactName,
      buyerEmail,
      buyerPhone,
      buyerAddressType,
      buyerCountry,
      buyerState,
      buyerCity,
      buyerAddress,
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
    if (soCreatedDate && plannedShipDate) {
      const createdDate = new Date(soCreatedDate);
      const shipDate = new Date(plannedShipDate);
      
      if (shipDate < createdDate) {
        return NextResponse.json(
          { error: "Planned ship date must be on or after the SO created date" },
          { status: 400 }
        );
      }
    }

    // Update sales order and items in a transaction
    const salesOrder = await prisma.$transaction(async (tx) => {
      // Update sales order
      const updateData: any = {};
      if (soCreatedDate !== undefined) updateData.soCreatedDate = new Date(soCreatedDate);
      if (plannedShipDate !== undefined) updateData.plannedShipDate = new Date(plannedShipDate);
      if (currency !== undefined) updateData.currency = currency;
      if (sellerCompanyName !== undefined) updateData.sellerCompanyName = sellerCompanyName;
      if (sellerContactName !== undefined) updateData.sellerContactName = sellerContactName;
      if (sellerEmail !== undefined) updateData.sellerEmail = sellerEmail;
      if (sellerPhone !== undefined) updateData.sellerPhone = sellerPhone;
      if (sellerAddressType !== undefined) updateData.sellerAddressType = sellerAddressType;
      if (sellerCountry !== undefined) updateData.sellerCountry = sellerCountry;
      if (sellerState !== undefined) updateData.sellerState = sellerState;
      if (sellerCity !== undefined) updateData.sellerCity = sellerCity;
      if (sellerAddress !== undefined) updateData.sellerAddress = sellerAddress;
      if (buyerCompanyName !== undefined) updateData.buyerCompanyName = buyerCompanyName;
      if (buyerContactName !== undefined) updateData.buyerContactName = buyerContactName;
      if (buyerEmail !== undefined) updateData.buyerEmail = buyerEmail;
      if (buyerPhone !== undefined) updateData.buyerPhone = buyerPhone;
      if (buyerAddressType !== undefined) updateData.buyerAddressType = buyerAddressType;
      if (buyerCountry !== undefined) updateData.buyerCountry = buyerCountry;
      if (buyerState !== undefined) updateData.buyerState = buyerState;
      if (buyerCity !== undefined) updateData.buyerCity = buyerCity;
      if (buyerAddress !== undefined) updateData.buyerAddress = buyerAddress;
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

      const updatedSO = await tx.salesOrder.update({
        where: { id: soId },
        data: updateData,
      });

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await tx.salesOrderItem.deleteMany({
          where: { salesOrderId: soId },
        });

        // Create new items
        if (items.length > 0) {
          await tx.salesOrderItem.createMany({
            data: items.map((item: any, index: number) => ({
              salesOrderId: soId,
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

      // Return updated sales order with items
      return await tx.salesOrder.findUnique({
        where: { id: soId },
        include: {
          items: true,
          purchaseOrder: {
            select: {
              poId: true,
            },
          },
        },
      });
    });

    // Serialize Decimal values to numbers
    const serializedSO = serializeSalesOrder(salesOrder);

    return NextResponse.json(serializedSO);
  } catch (error) {
    console.error("Error updating sales order:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/seller/sales-orders/[id] - Delete a sales order
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

    const soId = params.id;

    // Verify ownership
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: soId },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: "Sales order not found" },
        { status: 404 }
      );
    }

    if (salesOrder.sellerCompanyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Forbidden: This sales order does not belong to your company" },
        { status: 403 }
      );
    }

    // Delete sales order (items will be cascade deleted)
    await prisma.salesOrder.delete({
      where: { id: soId },
    });

    return NextResponse.json({ message: "Sales order deleted successfully" });
  } catch (error) {
    console.error("Error deleting sales order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

