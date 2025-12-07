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
import { PackingList, PackingListItem } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface SellerPackingListViewPageProps {
  packingList: PackingList & {
    items: PackingListItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
    deliveryNote?: {
      dnId: string;
    } | null;
    salesOrder?: {
      soId: string;
    } | null;
  };
}

export function SellerPackingListViewPage({ packingList: pl }: SellerPackingListViewPageProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/seller/packing-lists")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Packing List</h1>
            <p className="text-muted-foreground mt-1">{pl.plId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentViewActions
            pdfUrl={`/api/pdf/packing-list/${pl.id}`}
            filename={`PL-${pl.plId}.pdf`}
          />
        </div>
      </div>

      {/* Packing List Document */}
      <div className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase text-center">PACKING LIST</h2>
        </div>

        {/* Packing List Details - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          {/* Seller Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Seller</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{pl.sellerCompanyName}</strong></p>
                {pl.sellerContactName && (
                  <p>{pl.sellerContactName}</p>
                )}
                {pl.sellerEmail && (
                  <p>Email: {pl.sellerEmail}</p>
                )}
                {pl.sellerPhone && (
                  <p>Phone: {pl.sellerPhone}</p>
                )}
                {pl.sellerAddress && (
                  <p>Address: {pl.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ship To (Buyer Info) */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Ship To</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{pl.buyerCompanyName}</strong></p>
                {pl.buyerContactName && (
                  <p>{pl.buyerContactName}</p>
                )}
                {pl.buyerEmail && (
                  <p>Email: {pl.buyerEmail}</p>
                )}
                {pl.buyerPhone && (
                  <p>Phone: {pl.buyerPhone}</p>
                )}
                {pl.buyerAddress && (
                  <p>Address: {pl.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Details */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Document Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Packing List ID:</strong> {pl.plId}</p>
                {pl.deliveryNote?.dnId && (
                  <p><strong>DN ID:</strong> {pl.deliveryNote.dnId}</p>
                )}
                {pl.purchaseOrder?.poId && (
                  <p><strong>PO ID:</strong> {pl.purchaseOrder.poId}</p>
                )}
                <p><strong>Packing Date:</strong> {formatDate(pl.packingDate)}</p>
                {pl.shipmentTrackingId && (
                  <p><strong>Shipment Tracking ID:</strong> {pl.shipmentTrackingId}</p>
                )}
                {pl.carrierName && (
                  <p><strong>Carrier Name:</strong> {pl.carrierName}</p>
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
                  {pl.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    pl.items.map((item, index) => (
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
            {pl.items.length > 0 && (
              <div className="p-4 border-t bg-gray-50 print:bg-gray-50">
                <div className="flex justify-end gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total Gross Weight (In KG):</span>
                    <span className="text-sm font-semibold">
                      {pl.totalGrossWeight ? Number(pl.totalGrossWeight).toFixed(2) : "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total Net Weight (In KG):</span>
                    <span className="text-sm font-semibold">
                      {pl.totalNetWeight ? Number(pl.totalNetWeight).toFixed(2) : "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total No of Packages:</span>
                    <span className="text-sm font-semibold">
                      {pl.totalNoOfPackages || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Miscellaneous */}
        {pl.notes && (
          <Card>
            <CardContent className="p-0">
              <div className="bg-gray-200 p-3 print:bg-gray-200">
                <h3 className="font-semibold text-sm uppercase">Miscellaneous</h3>
              </div>
              <div className="p-4">
                <p className="text-sm whitespace-pre-wrap">{pl.notes}</p>
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
              {pl.signatureByName && (
                <p className="text-sm mb-2"><strong>Signature By:</strong> {pl.signatureByName}</p>
              )}
              {pl.signatureUrl && (
                <div className="mt-2">
                  <img
                    src={pl.signatureUrl}
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

