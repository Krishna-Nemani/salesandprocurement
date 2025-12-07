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
import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import { PackingList, PackingListItem, PLStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface BuyerPackingListViewPageProps {
  packingList: PackingList & {
    items: PackingListItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
    deliveryNote?: {
      dnId: string;
    } | null;
    sellerCompany?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
}

export function BuyerPackingListViewPage({ packingList: initialPL }: BuyerPackingListViewPageProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [plStatus, setPlStatus] = useState<PLStatus>(initialPL.status);
  
  // Sync local state with prop when it changes
  useEffect(() => {
    setPlStatus(initialPL.status);
  }, [initialPL.status]);
  
  const packingList = {
    ...initialPL,
    status: plStatus,
  };


  const handleAcknowledge = async () => {
    if (!confirm("Are you sure you want to acknowledge this packing list?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/packing-lists/${packingList.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "acknowledge" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to acknowledge packing list");
      }

      const updatedPL = await response.json();
      
      // Immediately update local state to hide buttons
      setPlStatus(updatedPL.status as PLStatus);
      
      alert("Packing list acknowledged successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error acknowledging packing list:", error);
      alert(error instanceof Error ? error.message : "Failed to acknowledge packing list");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this packing list?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/packing-lists/${packingList.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject packing list");
      }

      const updatedPL = await response.json();
      
      // Immediately update local state to hide buttons
      setPlStatus(updatedPL.status as PLStatus);
      
      alert("Packing list rejected successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error rejecting packing list:", error);
      alert(error instanceof Error ? error.message : "Failed to reject packing list");
    } finally {
      setIsProcessing(false);
    }
  };

  const canRespond = () => {
    return plStatus === PLStatus.PENDING || plStatus === PLStatus.RECEIVED || plStatus === PLStatus.APPROVED;
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/packing-lists")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Packing List</h1>
            <p className="text-muted-foreground mt-1">{packingList.plId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentViewActions
            pdfUrl={`/api/pdf/packing-list/${packingList.id}`}
            filename={`PL-${packingList.plId}.pdf`}
          />
        </div>
      </div>

      {/* Packing List Document */}
      <div id="pl-document" className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase text-center">PACKING LIST</h2>
        </div>

        {/* Packing List Details - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          {/* Seller Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Seller Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{packingList.sellerCompanyName}</strong></p>
                {packingList.sellerContactName && (
                  <p>{packingList.sellerContactName}</p>
                )}
                {packingList.sellerEmail && (
                  <p>Email: {packingList.sellerEmail}</p>
                )}
                {packingList.sellerPhone && (
                  <p>Phone: {packingList.sellerPhone}</p>
                )}
                {packingList.sellerAddress && (
                  <p>Address: {packingList.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ship To (Buyer Info) */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Ship To</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{packingList.buyerCompanyName}</strong></p>
                {packingList.buyerContactName && (
                  <p>{packingList.buyerContactName}</p>
                )}
                {packingList.buyerEmail && (
                  <p>Email: {packingList.buyerEmail}</p>
                )}
                {packingList.buyerPhone && (
                  <p>Phone: {packingList.buyerPhone}</p>
                )}
                {packingList.buyerAddress && (
                  <p>Address: {packingList.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Details */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Document Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Packing List ID:</strong> {packingList.plId}</p>
                {packingList.deliveryNote?.dnId && (
                  <p><strong>DN ID:</strong> {packingList.deliveryNote.dnId}</p>
                )}
                {packingList.purchaseOrder?.poId && (
                  <p><strong>PO ID:</strong> {packingList.purchaseOrder.poId}</p>
                )}
                <p><strong>Packing Date:</strong> {formatDate(packingList.packingDate)}</p>
                {packingList.shipmentTrackingId && (
                  <p><strong>Shipment Tracking ID:</strong> {packingList.shipmentTrackingId}</p>
                )}
                {packingList.carrierName && (
                  <p><strong>Carrier Name:</strong> {packingList.carrierName}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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
                    <TableHead>SKU</TableHead>
                    <TableHead>HSN Code</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Package Type</TableHead>
                    <TableHead>Gross Weight (In KG)</TableHead>
                    <TableHead>Net Weight (In KG)</TableHead>
                    <TableHead>No of Packages</TableHead>
                    <TableHead>Dimensions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packingList.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    packingList.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.serialNumber}</TableCell>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.sku || "-"}</TableCell>
                        <TableCell>{item.hsnCode || "-"}</TableCell>
                        <TableCell>{item.uom || "-"}</TableCell>
                        <TableCell>{Number(item.quantity).toFixed(2)}</TableCell>
                        <TableCell>{item.packageType || "-"}</TableCell>
                        <TableCell>{item.grossWeight ? Number(item.grossWeight).toFixed(2) : "-"}</TableCell>
                        <TableCell>{item.netWeight ? Number(item.netWeight).toFixed(2) : "-"}</TableCell>
                        <TableCell>{item.noOfPackages || "-"}</TableCell>
                        <TableCell>{item.dimensions || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {packingList.items.length > 0 && (
              <div className="p-4 border-t bg-gray-50 print:bg-gray-50">
                <div className="flex justify-end gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total Gross Weight (In KG):</span>
                    <span className="text-sm font-semibold">
                      {packingList.totalGrossWeight ? Number(packingList.totalGrossWeight).toFixed(2) : "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total Net Weight (In KG):</span>
                    <span className="text-sm font-semibold">
                      {packingList.totalNetWeight ? Number(packingList.totalNetWeight).toFixed(2) : "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total No of Packages:</span>
                    <span className="text-sm font-semibold">
                      {packingList.totalNoOfPackages || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Miscellaneous */}
        {packingList.notes && (
          <Card>
            <CardContent className="p-0">
              <div className="bg-gray-200 p-3 print:bg-gray-200">
                <h3 className="font-semibold text-sm uppercase">Miscellaneous</h3>
              </div>
              <div className="p-4">
                <h4 className="font-semibold mb-2">Notes</h4>
                <p className="text-sm whitespace-pre-wrap">{packingList.notes}</p>
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
              {packingList.signatureByName && (
                <p className="text-sm mb-2"><strong>Signature By:</strong> {packingList.signatureByName}</p>
              )}
              {packingList.signatureUrl && (
                <div className="mt-2">
                  <img
                    src={packingList.signatureUrl}
                    alt="Signature"
                    className="h-24 w-auto border rounded"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {canRespond() && (
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => router.push("/buyer/packing-lists")}>
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <X className="mr-2 h-4 w-4" />
            {isProcessing ? "Processing..." : "Reject"}
          </Button>
          <Button
            onClick={handleAcknowledge}
            disabled={isProcessing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isProcessing ? "Processing..." : "Acknowledge"}
          </Button>
        </div>
      )}

      {!canRespond() && (
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => router.push("/buyer/packing-lists")}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}

