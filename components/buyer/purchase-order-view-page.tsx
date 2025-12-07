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
import { ArrowLeft } from "lucide-react";
import { PurchaseOrder, PurchaseOrderItem, POStatus } from "@prisma/client";
import { formatDate, getCurrencySymbol, formatCurrency } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface PurchaseOrderViewPageProps {
  purchaseOrder: PurchaseOrder & {
    items: PurchaseOrderItem[];
    contract?: {
      contractId: string;
    } | null;
    quotation?: {
      quoteId: string;
    } | null;
    buyerCompany?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
}

export function BuyerPurchaseOrderViewPage({ purchaseOrder: po }: PurchaseOrderViewPageProps) {
  const router = useRouter();


  // Calculate totals
  const subTotal = po.items.reduce((sum, item) => sum + Number(item.subTotal), 0);
  const discountPercentage = po.discountPercentage ? Number(po.discountPercentage) : 0;
  const discount = (subTotal * discountPercentage) / 100;
  const afterDiscount = subTotal - discount;
  const additionalCharges = po.additionalCharges ? Number(po.additionalCharges) : 0;
  const taxPercentage = po.taxPercentage ? Number(po.taxPercentage) : 0;
  const tax = (afterDiscount * taxPercentage) / 100;
  const total = Number(po.totalAmount);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/purchase-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Purchase Order</h1>
            <p className="text-muted-foreground mt-1">{po.poId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentViewActions
            pdfUrl={`/api/pdf/purchase-order/${po.id}`}
            filename={`PO-${po.poId}.pdf`}
          />
        </div>
      </div>

      {/* Purchase Order Document */}
      <div id="po-document" className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase text-center">PURCHASE ORDER</h2>
        </div>

        {/* Purchase Order Details - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          {/* PO By (Buyer) */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">PO By</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Company Name:</strong> {po.buyerCompanyName}</p>
                {po.buyerContactName && (
                  <p><strong>Contact Name:</strong> {po.buyerContactName}</p>
                )}
                {po.buyerEmail && (
                  <p><strong>Email:</strong> {po.buyerEmail}</p>
                )}
                {po.buyerPhone && (
                  <p><strong>Phone:</strong> {po.buyerPhone}</p>
                )}
                {po.buyerAddress && (
                  <p><strong>Address:</strong> {po.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PO To (Seller) */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">PO To</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Company Name:</strong> {po.sellerCompanyName}</p>
                {po.sellerContactName && (
                  <p><strong>Contact Name:</strong> {po.sellerContactName}</p>
                )}
                {po.sellerEmail && (
                  <p><strong>Email:</strong> {po.sellerEmail}</p>
                )}
                {po.sellerPhone && (
                  <p><strong>Phone:</strong> {po.sellerPhone}</p>
                )}
                {po.sellerAddress && (
                  <p><strong>Address:</strong> {po.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PO Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">PO Info</h3>
              <div className="space-y-1 text-sm">
                <p><strong>PO ID:</strong> {po.poId}</p>
                {po.contract?.contractId && (
                  <p><strong>Contract ID:</strong> {po.contract.contractId}</p>
                )}
                {po.quotation?.quoteId && (
                  <p><strong>Quote ID:</strong> {po.quotation.quoteId}</p>
                )}
                <p><strong>Date Issued:</strong> {formatDate(po.poIssuedDate)}</p>
                <p><strong>Exp Del Date:</strong> {formatDate(po.expectedDeliveryDate)}</p>
                {po.deliveryAddress && (
                  <p><strong>Del Address:</strong> {po.deliveryAddress}</p>
                )}
                <p><strong>Currency:</strong> {po.currency} - {getCurrencySymbol(po.currency)}</p>
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
                {po.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.productDescription || "-"}</TableCell>
                    <TableCell>{item.sku || "-"}</TableCell>
                    <TableCell>{item.hsnCode || "-"}</TableCell>
                    <TableCell>{item.uom || "-"}</TableCell>
                    <TableCell>{Number(item.quantity).toLocaleString()}</TableCell>
                    <TableCell>{getCurrencySymbol(po.currency)} {Number(item.unitPrice).toLocaleString()}</TableCell>
                    <TableCell>{getCurrencySymbol(po.currency)} {Number(item.subTotal).toLocaleString()}</TableCell>
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
              <span>{getCurrencySymbol(po.currency)} {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                <span>{getCurrencySymbol(po.currency)} {additionalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              <span>{getCurrencySymbol(po.currency)} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Miscellaneous */}
        {(po.paymentTerms || po.deliveryTerms || po.notes) && (
          <div className="space-y-4">
            <div className="bg-gray-200 p-4 print:bg-gray-200">
              <h3 className="text-lg font-semibold uppercase">Miscellaneous</h3>
            </div>
            <div className="space-y-4">
              {po.paymentTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Payment Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{po.paymentTerms}</p>
                </div>
              )}
              {po.deliveryTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Delivery Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{po.deliveryTerms}</p>
                </div>
              )}
              {po.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature */}
        {po.signatureUrl && (
          <div className="space-y-2">
            <h4 className="font-semibold">Acknowledgement (Signature)</h4>
            {po.signatureByName && (
              <p className="text-sm"><strong>Signed by:</strong> {po.signatureByName}</p>
            )}
            <div className="mt-2">
              <img
                src={po.signatureUrl}
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

