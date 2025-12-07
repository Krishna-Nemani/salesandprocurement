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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, FileText } from "lucide-react";
import { Contract, ContractItem, ContractStatus } from "@prisma/client";
import { formatDate, getCurrencySymbol, formatCurrency } from "@/lib/utils/formatting";
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
    sellerCompany?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
}

export function BuyerContractViewPage({ contract: initialContract }: ContractViewPageProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [suggestions, setSuggestions] = useState("");
  // Local state to track contract status - updated immediately after API calls
  const [contractStatus, setContractStatus] = useState<ContractStatus>(initialContract.status);
  
  // Sync local state with prop when it changes (e.g., after router.refresh())
  useEffect(() => {
    setContractStatus(initialContract.status);
  }, [initialContract.status]);
  
  // Use local status if available, otherwise fall back to prop
  const contract = {
    ...initialContract,
    status: contractStatus,
  };


  const handleAccept = async () => {
    if (!confirm("Are you sure you want to accept this contract?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/contracts/${contract.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept contract");
      }

      const updatedContract = await response.json();
      
      // Immediately update local state to hide buttons
      setContractStatus(updatedContract.status as ContractStatus);
      
      alert("Contract accepted successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error accepting contract:", error);
      alert(error instanceof Error ? error.message : "Failed to accept contract");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this contract?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/contracts/${contract.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject contract");
      }

      const updatedContract = await response.json();
      
      // Immediately update local state to hide buttons
      setContractStatus(updatedContract.status as ContractStatus);
      
      alert("Contract rejected successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error rejecting contract:", error);
      alert(error instanceof Error ? error.message : "Failed to reject contract");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestChanges = async () => {
    if (!suggestions.trim()) {
      alert("Please provide your suggestions or changes");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/contracts/${contract.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "suggest_changes",
          suggestions: suggestions.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit suggestions");
      }

      const updatedContract = await response.json();
      
      // Update local state if status changed
      if (updatedContract.status) {
        setContractStatus(updatedContract.status as ContractStatus);
      }
      
      alert("Suggestions submitted successfully!");
      setShowSuggestDialog(false);
      setSuggestions("");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error submitting suggestions:", error);
      alert(error instanceof Error ? error.message : "Failed to submit suggestions");
    } finally {
      setIsProcessing(false);
    }
  };

  // Show Accept/Reject/Suggest buttons for any status except APPROVED or REJECTED
  const canRespond = contract.status !== ContractStatus.APPROVED && contract.status !== ContractStatus.REJECTED;
  
  // Show Create PO button for accepted contracts (APPROVED, SIGNED)
  const canCreatePO = contract.status === ContractStatus.APPROVED || contract.status === ContractStatus.SIGNED;
  
  const handleCreatePO = () => {
    router.push(`/buyer/purchase-orders/new?contractId=${contract.id}`);
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/contracts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Contract</h1>
            <p className="text-muted-foreground mt-1">{contract.contractId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRespond && (
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
              <Button
                variant="outline"
                onClick={() => setShowSuggestDialog(true)}
                disabled={isProcessing}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Suggest Changes
              </Button>
            </>
          )}
          {canCreatePO && (
            <Button
              variant="default"
              onClick={handleCreatePO}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Create PO
            </Button>
          )}
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
      <div id="contract-document" className="bg-white print:bg-white space-y-6 print:space-y-4">
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
            <h4 className="font-semibold text-orange-600">Your Suggestions / Changes Requested</h4>
            <p className="text-sm whitespace-pre-wrap">{contract.buyerSuggestions}</p>
            {contract.buyerResponseDate && (
              <p className="text-xs text-muted-foreground">
                Response Date: {formatDate(contract.buyerResponseDate)}
              </p>
            )}

            {/* Seller Response (if any) */}
            {contract.sellerResponse && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="font-semibold text-blue-600 mb-2">Seller's Response</h5>
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

      {/* Suggest Changes Dialog */}
      <Dialog open={showSuggestDialog} onOpenChange={setShowSuggestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest Changes to Contract</DialogTitle>
            <DialogDescription>
              Please provide your suggestions or changes for this contract. The seller will be notified and can update the contract accordingly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="Enter your suggestions or changes here..."
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuggestDialog(false);
                setSuggestions("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSuggestChanges}
              disabled={isProcessing || !suggestions.trim()}
            >
              {isProcessing ? "Submitting..." : "Submit Suggestions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

