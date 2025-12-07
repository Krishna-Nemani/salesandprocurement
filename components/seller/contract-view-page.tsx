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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Contract, ContractItem, ContractStatus } from "@prisma/client";
import { formatDate, getCurrencySymbol } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface ContractViewPageProps {
  contract: Contract & {
    items: ContractItem[];
    quotation?: {
      quoteId: string;
    } | null;
    rfq?: {
      rfqId: string;
    } | null;
  };
}

export function SellerContractViewPage({ contract }: ContractViewPageProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [sellerResponse, setSellerResponse] = useState("");


  const handleReplyToSuggestions = async () => {
    if (!sellerResponse.trim()) {
      alert("Please provide your response");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/seller/contracts/${contract.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sellerResponse: sellerResponse.trim(),
          status: ContractStatus.SENT, // Change status back to SENT after responding
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit response");
      }

      alert("Response submitted successfully!");
      setShowReplyDialog(false);
      setSellerResponse("");
      router.refresh();
    } catch (error) {
      console.error("Error submitting response:", error);
      alert(error instanceof Error ? error.message : "Failed to submit response");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/seller/contracts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Contract</h1>
            <p className="text-muted-foreground mt-1">{contract.contractId}</p>
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

      {/* Contract Document */}
      <div className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase text-center">CONTRACT</h2>
        </div>

        {/* Contract Details - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          {/* Seller */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Seller</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Company Name:</strong> {contract.sellerCompanyName}</p>
                {contract.sellerContactName && (
                  <p><strong>Contact Name:</strong> {contract.sellerContactName}</p>
                )}
                {contract.sellerEmail && (
                  <p><strong>Email:</strong> {contract.sellerEmail}</p>
                )}
                {contract.sellerPhone && (
                  <p><strong>Phone:</strong> {contract.sellerPhone}</p>
                )}
                {contract.sellerAddress && (
                  <p><strong>Address:</strong> {contract.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Buyer */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Buyer</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Company Name:</strong> {contract.buyerCompanyName}</p>
                {contract.buyerContactName && (
                  <p><strong>Contact Name:</strong> {contract.buyerContactName}</p>
                )}
                {contract.buyerEmail && (
                  <p><strong>Email:</strong> {contract.buyerEmail}</p>
                )}
                {contract.buyerPhone && (
                  <p><strong>Phone:</strong> {contract.buyerPhone}</p>
                )}
                {contract.buyerAddress && (
                  <p><strong>Address:</strong> {contract.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contract Info */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Contract Info</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Contract ID:</strong> {contract.contractId}</p>
                {contract.quotation?.quoteId && (
                  <p><strong>Quote ID:</strong> {contract.quotation.quoteId}</p>
                )}
                {contract.rfq?.rfqId && (
                  <p><strong>RFQ ID:</strong> {contract.rfq.rfqId}</p>
                )}
                <p><strong>Eff Date:</strong> {formatDate(contract.effectiveDate)}</p>
                <p><strong>End Date:</strong> {formatDate(contract.endDate)}</p>
                <p><strong>Currency:</strong> {contract.currency} - {getCurrencySymbol(contract.currency)}</p>
                <p><strong>Agreed Value:</strong> {getCurrencySymbol(contract.currency)} {Number(contract.agreedTotalValue).toLocaleString()}</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {contract.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.productDescription || "-"}</TableCell>
                    <TableCell>{item.sku || "-"}</TableCell>
                    <TableCell>{item.hsnCode || "-"}</TableCell>
                    <TableCell>{item.uom || "-"}</TableCell>
                    <TableCell>{Number(item.quantity).toLocaleString()}</TableCell>
                    <TableCell>{getCurrencySymbol(contract.currency)} {Number(item.unitPrice).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Terms */}
        {(contract.pricingTerms || contract.paymentTerms || contract.deliveryTerms || 
          contract.confidentiality || contract.indemnity || contract.terminationConditions || 
          contract.disputeResolution || contract.governingLaw) && (
          <div className="space-y-4">
            <div className="bg-gray-200 p-4 print:bg-gray-200">
              <h3 className="text-lg font-semibold uppercase">Terms</h3>
            </div>
            <div className="space-y-4">
              {contract.pricingTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Pricing Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{contract.pricingTerms}</p>
                </div>
              )}
              {contract.paymentTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Payment Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{contract.paymentTerms}</p>
                </div>
              )}
              {contract.deliveryTerms && (
                <div>
                  <h4 className="font-semibold mb-2">Delivery Terms</h4>
                  <p className="text-sm whitespace-pre-wrap">{contract.deliveryTerms}</p>
                </div>
              )}
              {contract.confidentiality && (
                <div>
                  <h4 className="font-semibold mb-2">Confidentiality</h4>
                  <p className="text-sm whitespace-pre-wrap">{contract.confidentiality}</p>
                </div>
              )}
              {contract.indemnity && (
                <div>
                  <h4 className="font-semibold mb-2">Indemnity</h4>
                  <p className="text-sm whitespace-pre-wrap">{contract.indemnity}</p>
                </div>
              )}
              {contract.terminationConditions && (
                <div>
                  <h4 className="font-semibold mb-2">Termination Conditions</h4>
                  <p className="text-sm whitespace-pre-wrap">{contract.terminationConditions}</p>
                </div>
              )}
              {contract.disputeResolution && (
                <div>
                  <h4 className="font-semibold mb-2">Dispute Resolution</h4>
                  <p className="text-sm whitespace-pre-wrap">{contract.disputeResolution}</p>
                </div>
              )}
              {contract.governingLaw && (
                <div>
                  <h4 className="font-semibold mb-2">Governing Law</h4>
                  <p className="text-sm whitespace-pre-wrap">{contract.governingLaw}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature */}
        {contract.signatureUrl && (
          <div className="space-y-2">
            <h4 className="font-semibold">Acknowledgement (Signature)</h4>
            {contract.signatureByName && (
              <p className="text-sm"><strong>Signed by:</strong> {contract.signatureByName}</p>
            )}
            <div className="mt-2">
              <img
                src={contract.signatureUrl}
                alt="Signature"
                className="h-20 w-auto border rounded"
              />
            </div>
          </div>
        )}

        {/* Buyer Suggestions (if any) */}
        {contract.buyerSuggestions && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-orange-600">Buyer Suggestions / Changes Requested</h4>
              {!contract.sellerResponse && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReplyDialog(true)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Reply to Suggestions
                </Button>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{contract.buyerSuggestions}</p>
            {contract.buyerResponseDate && (
              <p className="text-xs text-muted-foreground">
                Response Date: {formatDate(contract.buyerResponseDate)}
              </p>
            )}

            {/* Seller Response (if any) */}
            {contract.sellerResponse && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="font-semibold text-blue-600 mb-2">Your Response</h5>
                <p className="text-sm whitespace-pre-wrap">{contract.sellerResponse}</p>
                {contract.sellerResponseDate && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Response Date: {formatDate(contract.sellerResponseDate)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply to Suggestions Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Buyer Suggestions</DialogTitle>
            <DialogDescription>
              Please provide your response to the buyer's suggestions. You can accept, modify, or decline their requested changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buyer's Suggestions:</label>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md text-sm whitespace-pre-wrap">
                {contract.buyerSuggestions}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Your Response:</label>
              <Textarea
                value={sellerResponse}
                onChange={(e) => setSellerResponse(e.target.value)}
                placeholder="Enter your response to the buyer's suggestions..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReplyDialog(false);
                setSellerResponse("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReplyToSuggestions}
              disabled={isProcessing || !sellerResponse.trim()}
            >
              {isProcessing ? "Submitting..." : "Submit Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

