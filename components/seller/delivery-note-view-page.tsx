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
import { DeliveryNote, DeliveryNoteItem } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface SellerDeliveryNoteViewPageProps {
  deliveryNote: DeliveryNote & {
    items: DeliveryNoteItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
    salesOrder?: {
      soId: string;
    } | null;
  };
}

export function SellerDeliveryNoteViewPage({ deliveryNote: dn }: SellerDeliveryNoteViewPageProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/seller/delivery-notes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Delivery Note</h1>
            <p className="text-muted-foreground mt-1">{dn.dnId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentViewActions
            pdfUrl={`/api/pdf/delivery-note/${dn.id}`}
            filename={`DN-${dn.dnId}.pdf`}
          />
        </div>
      </div>

      {/* Delivery Note Document */}
      <div className="bg-white print:bg-white space-y-6 print:space-y-4">
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
                <p><strong>{dn.sellerCompanyName}</strong></p>
                {dn.sellerContactName && (
                  <p>{dn.sellerContactName}</p>
                )}
                {dn.sellerEmail && (
                  <p>Email: {dn.sellerEmail}</p>
                )}
                {dn.sellerPhone && (
                  <p>Phone: {dn.sellerPhone}</p>
                )}
                {dn.sellerAddress && (
                  <p>Address: {dn.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ship To (Buyer Info) */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Ship To</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{dn.buyerCompanyName}</strong></p>
                {dn.buyerContactName && (
                  <p>{dn.buyerContactName}</p>
                )}
                {dn.buyerEmail && (
                  <p>Email: {dn.buyerEmail}</p>
                )}
                {dn.buyerPhone && (
                  <p>Phone: {dn.buyerPhone}</p>
                )}
                {dn.buyerAddress && (
                  <p>Address: {dn.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Details */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Document Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Delivery Note ID:</strong> {dn.dnId}</p>
                {dn.purchaseOrder?.poId && (
                  <p><strong>PO ID:</strong> {dn.purchaseOrder.poId}</p>
                )}
                {dn.salesOrder?.soId && (
                  <p><strong>SO ID:</strong> {dn.salesOrder.soId}</p>
                )}
                <p><strong>Del Date:</strong> {formatDate(dn.delDate)}</p>
                {dn.shippingMethod && (
                  <p><strong>Shipping Method:</strong> {dn.shippingMethod}</p>
                )}
                {dn.shippingDate && (
                  <p><strong>Shipping Date:</strong> {formatDate(dn.shippingDate)}</p>
                )}
                {dn.carrierName && (
                  <p><strong>Carrier Name:</strong> {dn.carrierName}</p>
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
                {dn.items.map((item) => (
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
        {dn.notes && (
          <div className="space-y-4">
            <div className="bg-gray-200 p-4 print:bg-gray-200">
              <h3 className="text-lg font-semibold uppercase">Miscellaneous</h3>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Notes</h4>
              <p className="text-sm whitespace-pre-wrap">{dn.notes}</p>
            </div>
          </div>
        )}

        {/* Signature */}
        {dn.signatureUrl && (
          <div className="space-y-2">
            <h4 className="font-semibold">Acknowledgement (Signature)</h4>
            {dn.signatureByName && (
              <p className="text-sm"><strong>Signed by:</strong> {dn.signatureByName}</p>
            )}
            <div className="mt-2">
              <img
                src={dn.signatureUrl}
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

