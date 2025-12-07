"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { ArrowLeft, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Quotation, QuotationItem, QuotationStatus } from "@prisma/client";
import { formatDate, formatCurrency, getCurrencySymbol } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface BuyerQuotationViewPageProps {
  quotation: Quotation & {
    items: QuotationItem[];
    rfq?: {
      rfqId: string;
      projectName?: string | null;
    } | null;
    sellerCompany?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
}

export function BuyerQuotationViewPage({ quotation }: BuyerQuotationViewPageProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);


  const handleCreatePurchaseOrder = () => {
    router.push(`/buyer/purchase-orders/new?quotationId=${quotation.id}`);
  };

  const handleAccept = async () => {
    if (!confirm("Are you sure you want to accept this quotation?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept quotation");
      }

      alert("Quotation accepted successfully!");
      router.refresh();
    } catch (error) {
      console.error("Error accepting quotation:", error);
      alert(error instanceof Error ? error.message : "Failed to accept quotation");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this quotation?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject quotation");
      }

      alert("Quotation rejected successfully!");
      router.refresh();
    } catch (error) {
      console.error("Error rejecting quotation:", error);
      alert(error instanceof Error ? error.message : "Failed to reject quotation");
    } finally {
      setIsProcessing(false);
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

  // Show Accept/Reject buttons for any status except ACCEPTED or REJECTED
  const canAcceptOrReject = quotation.status !== QuotationStatus.ACCEPTED && quotation.status !== QuotationStatus.REJECTED;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/quotations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Quotation</h1>
            <p className="text-muted-foreground mt-1">{quotation.quoteId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canAcceptOrReject && (
            <>
              <Button
                variant="default"
                onClick={handleAccept}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {quotation.status === QuotationStatus.ACCEPTED && (
            <Button
              variant="default"
              onClick={handleCreatePurchaseOrder}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Purchase Order
            </Button>
          )}
          <DocumentViewActions
            pdfUrl={`/api/pdf/quotation/${quotation.id}`}
            filename={`Quotation-${quotation.quoteId}.pdf`}
          />
        </div>
      </div>

      {/* Quotation Document */}
      <div id="quotation-document" className="bg-white print:bg-white space-y-6 print:space-y-4">
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

