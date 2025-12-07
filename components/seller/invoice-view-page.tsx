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
import { Invoice, InvoiceItem } from "@prisma/client";

interface SellerInvoiceViewPageProps {
  invoice: Invoice & {
    items: InvoiceItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
  };
}

export function SellerInvoiceViewPage({ invoice }: SellerInvoiceViewPageProps) {
  const router = useRouter();


  // Calculate financials
  const sumOfSubTotal = Number(invoice.sumOfSubTotal);
  const discountPercentage = invoice.discountPercentage ? Number(invoice.discountPercentage) : 0;
  const discountAmount = (sumOfSubTotal * discountPercentage) / 100;
  const amountAfterDiscount = sumOfSubTotal - discountAmount;
  const additionalCharges = invoice.additionalCharges ? Number(invoice.additionalCharges) : 0;
  const taxPercentage = invoice.taxPercentage ? Number(invoice.taxPercentage) : 0;
  const taxAmount = (amountAfterDiscount * taxPercentage) / 100;
  const totalAmount = Number(invoice.totalAmount);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/seller/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice</h1>
            <p className="text-muted-foreground mt-1">{invoice.invoiceId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentViewActions
            pdfUrl={`/api/pdf/invoice/${invoice.id}`}
            filename={`Invoice-${invoice.invoiceId}.pdf`}
          />
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase text-center">INVOICE</h2>
        </div>

        {/* Invoice Details - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          {/* Seller Details */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Seller Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{invoice.sellerCompanyName}</strong></p>
                {invoice.sellerContactName && (
                  <p>{invoice.sellerContactName}</p>
                )}
                {invoice.sellerEmail && (
                  <p>Email: {invoice.sellerEmail}</p>
                )}
                {invoice.sellerPhone && (
                  <p>Phone: {invoice.sellerPhone}</p>
                )}
                {invoice.sellerAddress && (
                  <p>Address: {invoice.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bill To */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Bill To</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{invoice.buyerCompanyName}</strong></p>
                {invoice.buyerContactName && (
                  <p>{invoice.buyerContactName}</p>
                )}
                {invoice.buyerEmail && (
                  <p>Email: {invoice.buyerEmail}</p>
                )}
                {invoice.buyerPhone && (
                  <p>Phone: {invoice.buyerPhone}</p>
                )}
                {invoice.buyerAddress && (
                  <p>Address: {invoice.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ship To */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Ship To</h3>
              <div className="space-y-1 text-sm">
                {invoice.shipToCompanyName ? (
                  <>
                    <p><strong>{invoice.shipToCompanyName}</strong></p>
                    {invoice.shipToContactName && (
                      <p>{invoice.shipToContactName}</p>
                    )}
                    {invoice.shipToEmail && (
                      <p>Email: {invoice.shipToEmail}</p>
                    )}
                    {invoice.shipToPhone && (
                      <p>Phone: {invoice.shipToPhone}</p>
                    )}
                    {invoice.shipToAddress && (
                      <p>Address: {invoice.shipToAddress}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Same as Bill To</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Details */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-sm uppercase mb-3">Document Details</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Invoice ID:</strong> {invoice.invoiceId}</p>
              {invoice.purchaseOrder?.poId && (
                <p><strong>PO ID:</strong> {invoice.purchaseOrder.poId}</p>
              )}
              <p><strong>Invoice Date:</strong> {formatDate(invoice.invoiceDate)}</p>
            </div>
          </CardContent>
        </Card>

        {/* List of Products / Services */}
        <Card>
          <CardContent className="p-0">
            <div className="bg-gray-200 p-3 print:bg-gray-200">
              <h3 className="font-semibold text-sm uppercase">List of Products / Services</h3>
            </div>
            <div className="overflow-x-auto">
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
                  {invoice.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.serialNumber}</TableCell>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.productDescription || "-"}</TableCell>
                        <TableCell>{item.sku || "-"}</TableCell>
                        <TableCell>{item.hsnCode || "-"}</TableCell>
                        <TableCell>{item.uom || "-"}</TableCell>
                        <TableCell>{Number(item.quantity).toFixed(2)}</TableCell>
                        <TableCell>₹ {Number(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell>₹ {Number(item.subTotal).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {invoice.items.length > 0 && (
              <div className="p-4 border-t bg-gray-50 print:bg-gray-50">
                <div className="flex justify-end gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Sum of Sub Total:</span>
                    <span className="text-sm font-semibold">₹ {sumOfSubTotal.toFixed(2)}</span>
                  </div>
                  {discountPercentage > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Disc Percentage:</span>
                      <span className="text-sm font-semibold">{discountPercentage.toFixed(2)}%</span>
                    </div>
                  )}
                  {additionalCharges > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Add'l Charges:</span>
                      <span className="text-sm font-semibold">₹ {additionalCharges.toFixed(2)}</span>
                    </div>
                  )}
                  {taxPercentage > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Tax Percentage:</span>
                      <span className="text-sm font-semibold">{taxPercentage.toFixed(2)}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total:</span>
                    <span className="text-lg font-bold">₹ {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.termsAndConditions && (
          <Card>
            <CardContent className="p-0">
              <div className="bg-gray-200 p-3 print:bg-gray-200">
                <h3 className="font-semibold text-sm uppercase">Notes</h3>
              </div>
              <div className="p-4">
                <p className="text-sm whitespace-pre-wrap">{invoice.termsAndConditions}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature & Acknowledgement */}
        <Card>
          <CardContent className="p-0">
            <div className="bg-gray-200 p-3 print:bg-gray-200">
              <h3 className="font-semibold text-sm uppercase">Acknowledgement (Signature)</h3>
            </div>
            <div className="p-4">
              {invoice.signatureByName && (
                <p className="text-sm mb-2"><strong>Signature By:</strong> {invoice.signatureByName}</p>
              )}
              {invoice.signatureUrl && (
                <div className="mt-2">
                  <img
                    src={invoice.signatureUrl}
                    alt="Signature"
                    className="h-24 w-auto border rounded"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

