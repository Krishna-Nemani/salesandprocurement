"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { RFQ, RFQItem, RFQStatus } from "@prisma/client";
import { formatDate, getCurrencySymbol } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface RFQViewPageProps {
  rfq: RFQ & { 
    items: RFQItem[];
    buyerCompany?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
}

export function RFQViewPage({ rfq }: RFQViewPageProps) {
  const router = useRouter();


  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/rfqs")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Request for Quotation</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentViewActions
            pdfUrl={`/api/pdf/rfq/${rfq.id}`}
            filename={`RFQ-${rfq.rfqId}.pdf`}
          />
        </div>
      </div>

      {/* RFQ Document */}
      <div id="rfq-document" className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase">REQUEST FOR QUOTATION</h2>
        </div>

        {/* RFQ Details */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>RFQ Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">RFQ ID</p>
                <p className="font-semibold">{rfq.rfqId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date Issued</p>
                <p className="font-semibold">{formatDate(rfq.dateIssued)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-semibold">{formatDate(rfq.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Currency</p>
                <p className="font-semibold">
                  {rfq.currency} - {getCurrencySymbol(rfq.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Project Name</p>
              <p className="font-semibold">{rfq.projectName}</p>
            </div>
            {rfq.projectDescription && (
              <div>
                <p className="text-sm text-muted-foreground">Project Description</p>
                <p className="whitespace-pre-wrap">{rfq.projectDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Party Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buyer Details */}
          <Card className="print:border-0 print:shadow-none">
            <CardHeader>
              <CardTitle>Buyer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Buyer Company Name</p>
                <p className="font-semibold">{rfq.buyerCompanyName}</p>
              </div>
              {rfq.buyerContactName && (
                <div>
                  <p className="text-sm text-muted-foreground">Buyer Contact Name</p>
                  <p>{rfq.buyerContactName}</p>
                </div>
              )}
              {rfq.buyerEmail && (
                <div>
                  <p className="text-sm text-muted-foreground">Buyer Email</p>
                  <p>{rfq.buyerEmail}</p>
                </div>
              )}
              {rfq.buyerPhone && (
                <div>
                  <p className="text-sm text-muted-foreground">Buyer Phone</p>
                  <p>{rfq.buyerPhone}</p>
                </div>
              )}
              {rfq.buyerAddress && (
                <div>
                  <p className="text-sm text-muted-foreground">Buyer Address</p>
                  <p>{rfq.buyerAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seller Details */}
          <Card className="print:border-0 print:shadow-none">
            <CardHeader>
              <CardTitle>Seller Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rfq.sellerCompanyName && (
                <div>
                  <p className="text-sm text-muted-foreground">Seller Company Name</p>
                  <p className="font-semibold">{rfq.sellerCompanyName}</p>
                </div>
              )}
              {rfq.sellerContactName && (
                <div>
                  <p className="text-sm text-muted-foreground">Seller Contact Name</p>
                  <p>{rfq.sellerContactName}</p>
                </div>
              )}
              {rfq.sellerEmail && (
                <div>
                  <p className="text-sm text-muted-foreground">Seller Email</p>
                  <p>{rfq.sellerEmail}</p>
                </div>
              )}
              {rfq.sellerPhone && (
                <div>
                  <p className="text-sm text-muted-foreground">Seller Phone</p>
                  <p>{rfq.sellerPhone}</p>
                </div>
              )}
              {rfq.sellerAddress && (
                <div>
                  <p className="text-sm text-muted-foreground">Seller Address</p>
                  <p>{rfq.sellerAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* List of Products / Services */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>List of Products / Services</CardTitle>
          </CardHeader>
          <CardContent>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.productDescription || "Content"}</TableCell>
                    <TableCell>{item.sku || "Content"}</TableCell>
                    <TableCell>{item.hsnCode || "Content"}</TableCell>
                    <TableCell>{item.uom || "Content"}</TableCell>
                    <TableCell>{Number(item.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Miscellaneous */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>Miscellaneous</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rfq.technicalRequirements && (
              <div>
                <p className="text-sm font-semibold mb-2">Technical Requirements</p>
                <p className="whitespace-pre-wrap text-sm">{rfq.technicalRequirements}</p>
              </div>
            )}
            {rfq.deliveryRequirements && (
              <div>
                <p className="text-sm font-semibold mb-2">Delivery Requirements</p>
                <p className="whitespace-pre-wrap text-sm">{rfq.deliveryRequirements}</p>
              </div>
            )}
            {rfq.termsAndConditions && (
              <div>
                <p className="text-sm font-semibold mb-2">Terms and Conditions</p>
                <p className="whitespace-pre-wrap text-sm">{rfq.termsAndConditions}</p>
              </div>
            )}
            {rfq.notes && (
              <div>
                <p className="text-sm font-semibold mb-2">Notes</p>
                <p className="whitespace-pre-wrap text-sm">{rfq.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle>Signature By</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rfq.signatureByName && (
              <div>
                <p className="text-sm text-muted-foreground">Name of the user</p>
                <p>{rfq.signatureByName}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Acknowledgement (Signature)</p>
              {rfq.signatureUrl ? (
                <img src={rfq.signatureUrl} alt="Signature" className="h-20 w-auto" />
              ) : (
                <div className="border rounded p-4 bg-gray-100 text-center text-gray-500">
                  LOGO
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

