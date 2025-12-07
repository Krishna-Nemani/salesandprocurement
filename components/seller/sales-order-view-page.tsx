"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { SalesOrder, SalesOrderItem, SOStatus } from "@prisma/client";

interface SellerSalesOrderViewPageProps {
  salesOrder: SalesOrder & {
    items: SalesOrderItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
  };
}

export function SellerSalesOrderViewPage({ salesOrder: so }: SellerSalesOrderViewPageProps) {
  const router = useRouter();


  // Calculate totals
  const subTotal = so.items.reduce((sum, item) => sum + Number(item.subTotal), 0);
  const discountPercentage = so.discountPercentage ? Number(so.discountPercentage) : 0;
  const discount = (subTotal * discountPercentage) / 100;
  const afterDiscount = subTotal - discount;
  const additionalCharges = so.additionalCharges ? Number(so.additionalCharges) : 0;
  const taxPercentage = so.taxPercentage ? Number(so.taxPercentage) : 0;
  const tax = (afterDiscount * taxPercentage) / 100;
  const total = Number(so.totalAmount);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/seller/sales-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sales Order</h1>
            <p className="text-muted-foreground mt-1">{so.soId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentViewActions
            pdfUrl={`/api/pdf/sales-order/${salesOrder.id}`}
            filename={`SO-${salesOrder.soId}.pdf`}
          />
        </div>
      </div>

      {/* Sales Order Document */}
      <div className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase text-center">SALES ORDER</h2>
        </div>

        {/* Sales Order Details - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          {/* Seller Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Seller</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Company Name:</strong> {so.sellerCompanyName}</p>
                {so.sellerContactName && (
                  <p><strong>Contact Name:</strong> {so.sellerContactName}</p>
                )}
                {so.sellerEmail && (
                  <p><strong>Email:</strong> {so.sellerEmail}</p>
                )}
                {so.sellerPhone && (
                  <p><strong>Phone:</strong> {so.sellerPhone}</p>
                )}
                {so.sellerAddress && (
                  <p><strong>Address:</strong> {so.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Buyer Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Buyer</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Company Name:</strong> {so.buyerCompanyName}</p>
                {so.buyerContactName && (
                  <p><strong>Contact Name:</strong> {so.buyerContactName}</p>
                )}
                {so.buyerEmail && (
                  <p><strong>Email:</strong> {so.buyerEmail}</p>
                )}
                {so.buyerPhone && (
                  <p><strong>Phone:</strong> {so.buyerPhone}</p>
                )}
                {so.buyerAddress && (
                  <p><strong>Address:</strong> {so.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SO Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">SO Info</h3>
              <div className="space-y-1 text-sm">
                <p><strong>SO ID:</strong> {so.soId}</p>
                {so.purchaseOrder?.poId && (
                  <p><strong>PO ID:</strong> {so.purchaseOrder.poId}</p>
                )}
                <p><strong>Date Created:</strong> {formatDate(so.soCreatedDate)}</p>
                <p><strong>Currency:</strong> {so.currency} - {getCurrencySymbol(so.currency)}</p>
                <p><strong>Pln'd Ship Date:</strong> {formatDate(so.plannedShipDate)}</p>
                {so.deliveryAddress && (
                  <p><strong>Del Address:</strong> {so.deliveryAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List of Products / Services */}
        <div className="space-y-4">
          <div className="bg-gray-200 p-4 print:bg-gray-200">
            <h3 className="text-lg font-semibold uppercase">List of Products / Services</h3>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Product Description</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Sub Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {so.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.productDescription || "-"}</TableCell>
                    <TableCell>{item.sku || "-"}</TableCell>
                    <TableCell>{item.hsnCode || "-"}</TableCell>
                    <TableCell>{item.uom || "-"}</TableCell>
                    <TableCell>{Number(item.quantity).toLocaleString()}</TableCell>
                    <TableCell>{getCurrencySymbol(so.currency)} {Number(item.unitPrice).toLocaleString()}</TableCell>
                    <TableCell>{getCurrencySymbol(so.currency)} {Number(item.subTotal).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="flex justify-end">
          <div className="w-full md:w-1/2 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Sum of Sub Total:</span>
              <span>{getCurrencySymbol(so.currency)} {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {discountPercentage > 0 && (
              <div className="flex justify-between">
                <span>Disc Percentage:</span>
                <span>{discountPercentage}%</span>
              </div>
            )}
            {additionalCharges > 0 && (
              <div className="flex justify-between">
                <span>Add'l Charges:</span>
                <span>{getCurrencySymbol(so.currency)} {additionalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {taxPercentage > 0 && (
              <div className="flex justify-between">
                <span>Tax Percentage:</span>
                <span>{taxPercentage}%</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total:</span>
              <span>{getCurrencySymbol(so.currency)} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Miscellaneous */}
        {(so.paymentTerms || so.deliveryTerms || so.notes) && (
          <div className="space-y-4">
            <div className="bg-gray-200 p-4 print:bg-gray-200">
              <h3 className="text-lg font-semibold uppercase">Miscellaneous</h3>
            </div>
            <div className="space-y-4">
              {so.paymentTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Payment Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{so.paymentTerms}</p>
                </div>
              )}
              {so.deliveryTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Delivery Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{so.deliveryTerms}</p>
                </div>
              )}
              {so.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{so.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature */}
        {so.signatureUrl && (
          <div className="space-y-2">
            <h4 className="font-semibold">Acknowledgement (Signature)</h4>
            {so.signatureByName && (
              <p className="text-sm"><strong>Signed by:</strong> {so.signatureByName}</p>
            )}
            <div className="mt-2">
              <img
                src={so.signatureUrl}
                alt="Signature"
                className="h-20 w-auto border rounded"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

