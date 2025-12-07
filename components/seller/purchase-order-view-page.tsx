"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { PurchaseOrder, PurchaseOrderItem, POStatus } from "@prisma/client";
import { formatDate, getCurrencySymbol, formatCurrency } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface SellerPurchaseOrderViewPageProps {
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
    } | null;
  };
}

export function SellerPurchaseOrderViewPage({ purchaseOrder: initialPO }: SellerPurchaseOrderViewPageProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [poStatus, setPoStatus] = useState<POStatus>(initialPO.status);
  
  // Sync local state with prop when it changes
  useEffect(() => {
    setPoStatus(initialPO.status);
  }, [initialPO.status]);
  
  const purchaseOrder = {
    ...initialPO,
    status: poStatus,
  };


  const handleCreateSalesOrder = () => {
    router.push(`/seller/sales-orders/new?purchaseOrderId=${purchaseOrder.id}`);
  };

  const handleAccept = async () => {
    if (!confirm("Are you sure you want to accept this purchase order?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/seller/purchase-orders/${purchaseOrder.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept purchase order");
      }

      const updatedPO = await response.json();
      
      // Immediately update local state to hide buttons
      setPoStatus(updatedPO.status as POStatus);
      
      alert("Purchase order accepted successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error accepting purchase order:", error);
      alert(error instanceof Error ? error.message : "Failed to accept purchase order");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this purchase order?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/seller/purchase-orders/${purchaseOrder.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject purchase order");
      }

      const updatedPO = await response.json();
      
      // Immediately update local state to hide buttons
      setPoStatus(updatedPO.status as POStatus);
      
      alert("Purchase order rejected successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error rejecting purchase order:", error);
      alert(error instanceof Error ? error.message : "Failed to reject purchase order");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate totals
  const subTotal = purchaseOrder.items.reduce((sum, item) => sum + Number(item.subTotal), 0);
  const discountPercentage = purchaseOrder.discountPercentage ? Number(purchaseOrder.discountPercentage) : 0;
  const discount = (subTotal * discountPercentage) / 100;
  const afterDiscount = subTotal - discount;
  const additionalCharges = purchaseOrder.additionalCharges ? Number(purchaseOrder.additionalCharges) : 0;
  const taxPercentage = purchaseOrder.taxPercentage ? Number(purchaseOrder.taxPercentage) : 0;
  const tax = (afterDiscount * taxPercentage) / 100;
  const total = Number(purchaseOrder.totalAmount);

  // Show Accept/Reject buttons for PENDING or DRAFT status
  const canAcceptOrReject = purchaseOrder.status === POStatus.PENDING || purchaseOrder.status === POStatus.DRAFT;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/seller/purchase-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Purchase Order</h1>
            <p className="text-muted-foreground mt-1">{purchaseOrder.poId}</p>
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
          {purchaseOrder.status === POStatus.APPROVED && (
            <Button
              variant="default"
              onClick={handleCreateSalesOrder}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Sales Order
            </Button>
          )}
          <DocumentViewActions
            pdfUrl={`/api/pdf/purchase-order/${purchaseOrder.id}`}
            filename={`PO-${purchaseOrder.poId}.pdf`}
          />
        </div>
      </div>

      {/* Purchase Order Document */}
      <div className="bg-white print:bg-white space-y-6 print:space-y-4">
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
                <p><strong>Company Name:</strong> {purchaseOrder.buyerCompanyName}</p>
                {purchaseOrder.buyerContactName && (
                  <p><strong>Contact Name:</strong> {purchaseOrder.buyerContactName}</p>
                )}
                {purchaseOrder.buyerEmail && (
                  <p><strong>Email:</strong> {purchaseOrder.buyerEmail}</p>
                )}
                {purchaseOrder.buyerPhone && (
                  <p><strong>Phone:</strong> {purchaseOrder.buyerPhone}</p>
                )}
                {purchaseOrder.buyerAddress && (
                  <p><strong>Address:</strong> {purchaseOrder.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PO To (Seller) */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">PO To</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Company Name:</strong> {purchaseOrder.sellerCompanyName}</p>
                {purchaseOrder.sellerContactName && (
                  <p><strong>Contact Name:</strong> {purchaseOrder.sellerContactName}</p>
                )}
                {purchaseOrder.sellerEmail && (
                  <p><strong>Email:</strong> {purchaseOrder.sellerEmail}</p>
                )}
                {purchaseOrder.sellerPhone && (
                  <p><strong>Phone:</strong> {purchaseOrder.sellerPhone}</p>
                )}
                {purchaseOrder.sellerAddress && (
                  <p><strong>Address:</strong> {purchaseOrder.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PO Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">PO Info</h3>
              <div className="space-y-1 text-sm">
                <p><strong>PO ID:</strong> {purchaseOrder.poId}</p>
                {purchaseOrder.contract?.contractId && (
                  <p><strong>Contract ID:</strong> {purchaseOrder.contract.contractId}</p>
                )}
                {purchaseOrder.quotation?.quoteId && (
                  <p><strong>Quote ID:</strong> {purchaseOrder.quotation.quoteId}</p>
                )}
                <p><strong>Date Issued:</strong> {formatDate(purchaseOrder.poIssuedDate)}</p>
                <p><strong>Exp Del Date:</strong> {formatDate(purchaseOrder.expectedDeliveryDate)}</p>
                {purchaseOrder.deliveryAddress && (
                  <p><strong>Del Address:</strong> {purchaseOrder.deliveryAddress}</p>
                )}
                <p><strong>Currency:</strong> {purchaseOrder.currency} - {getCurrencySymbol(purchaseOrder.currency)}</p>
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
                {purchaseOrder.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.productDescription || "-"}</TableCell>
                    <TableCell>{item.sku || "-"}</TableCell>
                    <TableCell>{item.hsnCode || "-"}</TableCell>
                    <TableCell>{item.uom || "-"}</TableCell>
                    <TableCell>{Number(item.quantity).toLocaleString()}</TableCell>
                    <TableCell>{getCurrencySymbol(purchaseOrder.currency)} {Number(item.unitPrice).toLocaleString()}</TableCell>
                    <TableCell>{getCurrencySymbol(purchaseOrder.currency)} {Number(item.subTotal).toLocaleString()}</TableCell>
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
              <span>{getCurrencySymbol(purchaseOrder.currency)} {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                <span>{getCurrencySymbol(purchaseOrder.currency)} {additionalCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              <span>{getCurrencySymbol(purchaseOrder.currency)} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Miscellaneous */}
        {(purchaseOrder.paymentTerms || purchaseOrder.deliveryTerms || purchaseOrder.notes) && (
          <div className="space-y-4">
            <div className="bg-gray-200 p-4 print:bg-gray-200">
              <h3 className="text-lg font-semibold uppercase">Miscellaneous</h3>
            </div>
            <div className="space-y-4">
              {purchaseOrder.paymentTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Payment Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{purchaseOrder.paymentTerms}</p>
                </div>
              )}
              {purchaseOrder.deliveryTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Delivery Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{purchaseOrder.deliveryTerms}</p>
                </div>
              )}
              {purchaseOrder.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{purchaseOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature */}
        {purchaseOrder.signatureUrl && (
          <div className="space-y-2">
            <h4 className="font-semibold">Acknowledgement (Signature)</h4>
            {purchaseOrder.signatureByName && (
              <p className="text-sm"><strong>Signed by:</strong> {purchaseOrder.signatureByName}</p>
            )}
            <div className="mt-2">
              <img
                src={purchaseOrder.signatureUrl}
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

