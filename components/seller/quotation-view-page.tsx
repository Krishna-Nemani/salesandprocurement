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
import { ArrowLeft, Printer, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Quotation, QuotationItem, QuotationStatus } from "@prisma/client";
import { formatDate, formatCurrency } from "@/lib/utils/formatting";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface QuotationViewPageProps {
  quotation: Quotation & {
    items: QuotationItem[];
    rfq?: {
      rfqId: string;
    } | null;
  };
}

export function SellerQuotationViewPage({ quotation }: QuotationViewPageProps) {
  const router = useRouter();

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: QuotationStatus) => {
    const colors: Record<QuotationStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
      APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      ACCEPTED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      SENT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    };

    const labels: Record<QuotationStatus, string> = {
      DRAFT: "Draft",
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      ACCEPTED: "Accepted",
      SENT: "Sent",
    };

    return (
      <Badge className={colors[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹",
      JPY: "¥",
      CNY: "¥",
      AUD: "A$",
      CAD: "C$",
      CHF: "CHF",
      SGD: "S$",
    };
    return symbols[currency] || currency;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/pdf/quotation/${quotation.id}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quotation-${quotation.quoteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  // Calculate totals
  const subTotal = quotation.items.reduce((sum, item) => sum + Number(item.subTotal), 0);
  const discountPercentage = quotation.discountPercentage ? Number(quotation.discountPercentage) : 0;
  const discount = (subTotal * discountPercentage) / 100;
  const afterDiscount = subTotal - discount;
  const additionalCharges = quotation.additionalCharges ? Number(quotation.additionalCharges) : 0;
  const taxPercentage = quotation.taxPercentage ? Number(quotation.taxPercentage) : 0;
  const tax = (afterDiscount * taxPercentage) / 100;
  const total = Number(quotation.totalAmount);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/seller/quotations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Quotation</h1>
            <p className="text-muted-foreground mt-1">{quotation.quoteId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Quotation Document */}
      <div className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase text-center">QUOTATION</h2>
        </div>

        {/* Quotation Details - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          {/* Quote By (Seller) */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Quote By</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Company Name:</strong> {quotation.sellerCompanyName}</p>
                {quotation.sellerContactName && (
                  <p><strong>Contact Name:</strong> {quotation.sellerContactName}</p>
                )}
                {quotation.sellerEmail && (
                  <p><strong>Email:</strong> {quotation.sellerEmail}</p>
                )}
                {quotation.sellerPhone && (
                  <p><strong>Phone:</strong> {quotation.sellerPhone}</p>
                )}
                {quotation.sellerAddress && (
                  <p><strong>Address:</strong> {quotation.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quote To (Buyer) */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Quote To</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Company Name:</strong> {quotation.buyerCompanyName}</p>
                {quotation.buyerContactName && (
                  <p><strong>Contact Name:</strong> {quotation.buyerContactName}</p>
                )}
                {quotation.buyerEmail && (
                  <p><strong>Email:</strong> {quotation.buyerEmail}</p>
                )}
                {quotation.buyerPhone && (
                  <p><strong>Phone:</strong> {quotation.buyerPhone}</p>
                )}
                {quotation.buyerAddress && (
                  <p><strong>Address:</strong> {quotation.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quote Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Quote Info</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Quote ID:</strong> {quotation.quoteId}</p>
                {quotation.rfq?.rfqId && (
                  <p><strong>RFQ ID:</strong> {quotation.rfq.rfqId}</p>
                )}
                <p><strong>Date Issued:</strong> {formatDate(quotation.quoteDateIssued)}</p>
                <p><strong>Due Date:</strong> {formatDate(quotation.quoteValidityDate)}</p>
                <p><strong>Currency:</strong> {quotation.currency} - {getCurrencySymbol(quotation.currency)}</p>
                {quotation.rfq?.rfqId && (
                  <p><strong>RFQ Valid Date:</strong> {formatDate(quotation.quoteDateIssued)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List of Products / Services */}
        <div>
          <div className="bg-gray-200 p-3 print:bg-gray-200 mb-4">
            <h3 className="font-bold text-lg uppercase">List of Products / Services</h3>
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
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Sub Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.productDescription || "-"}</TableCell>
                    <TableCell>{item.sku || "-"}</TableCell>
                    <TableCell>{item.hsnCode || "-"}</TableCell>
                    <TableCell>{item.uom || "-"}</TableCell>
                    <TableCell className="text-right">{Number(item.quantity).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {getCurrencySymbol(quotation.currency)}{Number(item.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {getCurrencySymbol(quotation.currency)}{Number(item.subTotal).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary of Totals */}
        <div className="flex justify-end">
          <div className="w-full md:w-1/3 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Sum of Sub Total:</span>
              <span>{getCurrencySymbol(quotation.currency)}{subTotal.toFixed(2)}</span>
            </div>
            {discountPercentage > 0 && (
              <div className="flex justify-between">
                <span className="font-medium">Disc Percentage:</span>
                <span>{discountPercentage}%</span>
              </div>
            )}
            {additionalCharges > 0 && (
              <div className="flex justify-between">
                <span className="font-medium">Add&apos;l Charges:</span>
                <span>{getCurrencySymbol(quotation.currency)}{additionalCharges.toFixed(2)}</span>
              </div>
            )}
            {taxPercentage > 0 && (
              <div className="flex justify-between">
                <span className="font-medium">Tax Percentage:</span>
                <span>{taxPercentage}%</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-lg">
              <span>Total:</span>
              <span>{getCurrencySymbol(quotation.currency)}{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Miscellaneous */}
        {(quotation.paymentTerms || quotation.deliveryTerms || quotation.termsAndConditions || quotation.notes) && (
          <div>
            <div className="bg-gray-200 p-3 print:bg-gray-200 mb-4">
              <h3 className="font-bold text-lg uppercase">Miscellaneous</h3>
            </div>
            <div className="space-y-4">
              {quotation.paymentTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Payment Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{quotation.paymentTerms}</p>
                </div>
              )}
              {quotation.deliveryTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Delivery Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{quotation.deliveryTerms}</p>
                </div>
              )}
              {quotation.termsAndConditions && (
                <div>
                  <h4 className="font-semibold mb-2">Terms and Conditions</h4>
                  <p className="text-sm whitespace-pre-wrap">{quotation.termsAndConditions}</p>
                </div>
              )}
              {quotation.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{quotation.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acknowledgement (Signature) */}
        {quotation.signatureUrl && (
          <div>
            <h4 className="font-semibold mb-2">Acknowledgement (Signature)</h4>
            <div className="border rounded p-4 bg-gray-50 print:bg-gray-50">
              <img
                src={quotation.signatureUrl}
                alt="Signature"
                className="h-20 w-auto"
              />
              {quotation.signatureByName && (
                <p className="mt-2 text-sm font-medium">{quotation.signatureByName}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

