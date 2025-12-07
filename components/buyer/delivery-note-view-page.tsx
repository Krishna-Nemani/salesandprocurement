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
import { ArrowLeft, CheckCircle2, MessageSquare, X } from "lucide-react";
import { DeliveryNote, DeliveryNoteItem, DNStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface BuyerDeliveryNoteViewPageProps {
  deliveryNote: DeliveryNote & {
    items: DeliveryNoteItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
    salesOrder?: {
      soId: string;
    } | null;
    sellerCompany?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
}

export function BuyerDeliveryNoteViewPage({ deliveryNote: initialDN }: BuyerDeliveryNoteViewPageProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [dnStatus, setDnStatus] = useState<DNStatus>(initialDN.status);
  
  // Sync local state with prop when it changes
  useEffect(() => {
    setDnStatus(initialDN.status);
  }, [initialDN.status]);
  
  const deliveryNote = {
    ...initialDN,
    status: dnStatus,
  };


  const handleAcknowledge = async () => {
    if (!confirm("Are you sure you want to acknowledge this delivery note?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/delivery-notes/${deliveryNote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "acknowledge" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to acknowledge delivery note");
      }

      const updatedDN = await response.json();
      
      // Immediately update local state to hide buttons
      setDnStatus(updatedDN.status as DNStatus);
      
      alert("Delivery note acknowledged successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error acknowledging delivery note:", error);
      alert(error instanceof Error ? error.message : "Failed to acknowledge delivery note");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispute = async () => {
    if (!confirm("Are you sure you want to dispute this delivery note?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/delivery-notes/${deliveryNote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "dispute" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to dispute delivery note");
      }

      const updatedDN = await response.json();
      
      // Immediately update local state to hide buttons
      setDnStatus(updatedDN.status as DNStatus);
      
      alert("Delivery note disputed successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error disputing delivery note:", error);
      alert(error instanceof Error ? error.message : "Failed to dispute delivery note");
    } finally {
      setIsProcessing(false);
    }
  };

  // Show Acknowledge/Dispute buttons for PENDING or IN_TRANSIT status
  const canRespond = deliveryNote.status === DNStatus.PENDING || deliveryNote.status === DNStatus.IN_TRANSIT;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/delivery-notes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Delivery Note</h1>
            <p className="text-muted-foreground mt-1">{deliveryNote.dnId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentViewActions
            pdfUrl={`/api/pdf/delivery-note/${deliveryNote.id}`}
            filename={`DN-${deliveryNote.dnId}.pdf`}
          />
        </div>
      </div>

      {/* Delivery Note Document */}
      <div id="dn-document" className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase text-center">DELIVERY NOTE</h2>
        </div>

        {/* Delivery Note Details - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          {/* Seller Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Seller</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{deliveryNote.sellerCompanyName}</strong></p>
                {deliveryNote.sellerContactName && (
                  <p>{deliveryNote.sellerContactName}</p>
                )}
                {deliveryNote.sellerEmail && (
                  <p>Email: {deliveryNote.sellerEmail}</p>
                )}
                {deliveryNote.sellerPhone && (
                  <p>Phone: {deliveryNote.sellerPhone}</p>
                )}
                {deliveryNote.sellerAddress && (
                  <p>Address: {deliveryNote.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ship To (Buyer Info) */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Ship To</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{deliveryNote.buyerCompanyName}</strong></p>
                {deliveryNote.buyerContactName && (
                  <p>{deliveryNote.buyerContactName}</p>
                )}
                {deliveryNote.buyerEmail && (
                  <p>Email: {deliveryNote.buyerEmail}</p>
                )}
                {deliveryNote.buyerPhone && (
                  <p>Phone: {deliveryNote.buyerPhone}</p>
                )}
                {deliveryNote.buyerAddress && (
                  <p>Address: {deliveryNote.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Details */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Document Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Delivery Note ID:</strong> {deliveryNote.dnId}</p>
                {deliveryNote.purchaseOrder?.poId && (
                  <p><strong>PO ID:</strong> {deliveryNote.purchaseOrder.poId}</p>
                )}
                {deliveryNote.salesOrder?.soId && (
                  <p><strong>SO ID:</strong> {deliveryNote.salesOrder.soId}</p>
                )}
                <p><strong>Del Date:</strong> {formatDate(deliveryNote.delDate)}</p>
                {deliveryNote.shippingMethod && (
                  <p><strong>Shipping Method:</strong> {deliveryNote.shippingMethod}</p>
                )}
                {deliveryNote.shippingDate && (
                  <p><strong>Shipping Date:</strong> {formatDate(deliveryNote.shippingDate)}</p>
                )}
                {deliveryNote.carrierName && (
                  <p><strong>Carrier Name:</strong> {deliveryNote.carrierName}</p>
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
                  <TableHead>Quantity Delivered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryNote.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.productDescription || "-"}</TableCell>
                    <TableCell>{item.sku || "-"}</TableCell>
                    <TableCell>{item.hsnCode || "-"}</TableCell>
                    <TableCell>{item.uom || "-"}</TableCell>
                    <TableCell>{Number(item.quantity).toLocaleString()}</TableCell>
                    <TableCell>{Number(item.quantityDelivered).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Miscellaneous */}
        {deliveryNote.notes && (
          <div className="space-y-4">
            <div className="bg-gray-200 p-4 print:bg-gray-200">
              <h3 className="text-lg font-semibold uppercase">Miscellaneous</h3>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Notes</h4>
              <p className="text-sm whitespace-pre-wrap">{deliveryNote.notes}</p>
            </div>
          </div>
        )}

        {/* Signature */}
        {deliveryNote.signatureUrl && (
          <div className="space-y-2">
            <h4 className="font-semibold">Acknowledgement (Signature)</h4>
            {deliveryNote.signatureByName && (
              <p className="text-sm"><strong>Signed by:</strong> {deliveryNote.signatureByName}</p>
            )}
            <div className="mt-2">
              <img
                src={deliveryNote.signatureUrl}
                alt="Signature"
                className="h-20 w-auto border rounded"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canRespond && (
          <div className="flex items-center justify-end gap-2 print:hidden">
            <Button
              variant="outline"
              onClick={() => router.push("/buyer/delivery-notes")}
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleDispute}
              disabled={isProcessing}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Dispute
            </Button>
            <Button
              variant="default"
              onClick={handleAcknowledge}
              disabled={isProcessing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Acknowledge
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

