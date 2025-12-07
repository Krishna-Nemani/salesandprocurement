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
import { ArrowLeft, CheckCircle2, X, CreditCard, Download } from "lucide-react";
import { Invoice, InvoiceItem, InvoiceStatus } from "@prisma/client";
import { formatDate, formatCurrency } from "@/lib/utils/formatting";
import { getStatusBadge } from "@/lib/utils/status-badges";
import { DocumentViewActions } from "@/components/shared/document-view-actions";

interface BuyerInvoiceViewPageProps {
  invoice: Invoice & {
    items: InvoiceItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
    paidAmount?: number | null;
    remainingAmount?: number | null;
    paymentReceiptUrl?: string | null;
    sellerCompany?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
}

export function BuyerInvoiceViewPage({ invoice: initialInvoice }: BuyerInvoiceViewPageProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>(initialInvoice.status);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(
    initialInvoice.paymentReceiptUrl || null
  );
  const [paidAmount, setPaidAmount] = useState<number>(initialInvoice.paidAmount || 0);
  const [remainingAmount, setRemainingAmount] = useState<number>(
    initialInvoice.remainingAmount || Number(initialInvoice.totalAmount)
  );
  
  // Sync local state with prop when it changes
  useEffect(() => {
    setInvoiceStatus(initialInvoice.status);
    setPaidAmount(initialInvoice.paidAmount || 0);
    setRemainingAmount(initialInvoice.remainingAmount || Number(initialInvoice.totalAmount));
    setReceiptPreview(initialInvoice.paymentReceiptUrl || null);
  }, [initialInvoice.status, initialInvoice.paidAmount, initialInvoice.remainingAmount, initialInvoice.paymentReceiptUrl, initialInvoice.totalAmount]);

  const invoice = {
    ...initialInvoice,
    status: invoiceStatus,
    paidAmount,
    remainingAmount,
    paymentReceiptUrl: receiptPreview,
  };


  const handleAccept = async () => {
    if (!confirm("Are you sure you want to accept this invoice?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept invoice");
      }

      const updatedInvoice = await response.json();
      
      // Immediately update local state
      setInvoiceStatus(updatedInvoice.status as InvoiceStatus);
      
      alert("Invoice accepted successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error accepting invoice:", error);
      alert(error instanceof Error ? error.message : "Failed to accept invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this invoice?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/buyer/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject invoice");
      }

      const updatedInvoice = await response.json();
      
      // Immediately update local state
      setInvoiceStatus(updatedInvoice.status as InvoiceStatus);
      
      alert("Invoice rejected successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error rejecting invoice:", error);
      alert(error instanceof Error ? error.message : "Failed to reject invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (image or PDF)
      const isValidType = file.type.match(/^image\/(jpeg|jpg|png)$/) || file.type === "application/pdf";
      if (!isValidType) {
        alert("Payment receipt must be a JPG, PNG, or PDF file");
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Payment receipt must be less than 5MB");
        return;
      }

      setReceiptFile(file);
      
      if (file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        // Preview image
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For PDF, just set the file name
        setReceiptPreview(file.name);
      }
    }
  };

  const handlePayment = async () => {
    if (paymentType === "partial") {
      const amount = parseFloat(paymentAmount);
      if (!amount || amount <= 0) {
        alert("Please enter a valid payment amount");
        return;
      }
      if (amount >= remainingAmount) {
        alert(`Partial payment amount cannot be greater than or equal to remaining amount (₹${remainingAmount.toFixed(2)}). Use full payment instead.`);
        return;
      }
      if (!receiptFile) {
        alert("Payment receipt is required for partial payment");
        return;
      }
    }

    if (!confirm(paymentType === "full" ? "Are you sure you want to make full payment for this invoice?" : `Are you sure you want to make a payment of ₹${paymentAmount}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      let response: Response;

      if (paymentType === "partial" && receiptFile) {
        // Send FormData with receipt file
        const formData = new FormData();
        formData.append("action", "partial_pay");
        formData.append("paymentAmount", paymentAmount);
        formData.append("receipt", receiptFile);

        response = await fetch(`/api/buyer/invoices/${invoice.id}`, {
          method: "PATCH",
          body: formData,
        });
      } else {
        // Send JSON for full payment
        const formData = new FormData();
        formData.append("action", "pay");
        if (receiptFile) {
          formData.append("receipt", receiptFile);
        }

        response = await fetch(`/api/buyer/invoices/${invoice.id}`, {
          method: "PATCH",
          body: formData,
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process payment");
      }

      const updatedInvoice = await response.json();
      
      // Immediately update local state
      setInvoiceStatus(updatedInvoice.status as InvoiceStatus);
      setPaidAmount(updatedInvoice.paidAmount || 0);
      setRemainingAmount(updatedInvoice.remainingAmount || 0);
      if (updatedInvoice.paymentReceiptUrl) {
        setReceiptPreview(updatedInvoice.paymentReceiptUrl);
      }
      
      setShowPaymentModal(false);
      setPaymentAmount("");
      setReceiptFile(null);
      
      alert(paymentType === "full" ? "Payment processed successfully!" : "Partial payment processed successfully!");
      
      // Refresh server component to sync with database
      router.refresh();
    } catch (error) {
      console.error("Error processing payment:", error);
      alert(error instanceof Error ? error.message : "Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const canRespond = () => {
    return invoiceStatus === InvoiceStatus.DRAFT || invoiceStatus === InvoiceStatus.PENDING;
  };

  const canPay = () => {
    return invoiceStatus === InvoiceStatus.PENDING || invoiceStatus === InvoiceStatus.OVERDUE;
  };

  const isPaid = () => {
    return invoiceStatus === InvoiceStatus.PAID;
  };

  // Calculate financials
  const sumOfSubTotal = Number(invoice.sumOfSubTotal);
  const discountPercentage = invoice.discountPercentage ? Number(invoice.discountPercentage) : 0;
  const discountAmount = (sumOfSubTotal * discountPercentage) / 100;
  const amountAfterDiscount = sumOfSubTotal - discountAmount;
  const additionalCharges = invoice.additionalCharges ? Number(invoice.additionalCharges) : 0;
  const taxPercentage = invoice.taxPercentage ? Number(invoice.taxPercentage) : 0;
  const taxAmount = (amountAfterDiscount * taxPercentage) / 100;
  const totalAmount = Number(invoice.totalAmount);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice</h1>
            <p className="text-muted-foreground mt-1">{invoice.invoiceId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentViewActions
            pdfUrl={`/api/pdf/invoice/${invoice.id}`}
            filename={`Invoice-${invoice.invoiceId}.pdf`}
          />
        </div>
      </div>

      {/* Invoice Document */}
      <div id="invoice-document" className="bg-white print:bg-white space-y-6 print:space-y-4">
        {/* Document Header Bar */}
        <div className="bg-gray-200 p-4 print:bg-gray-200">
          <h2 className="text-2xl font-bold uppercase text-center">INVOICE</h2>
        </div>

        {/* Invoice Details - Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          {/* Seller Details */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Seller Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{invoice.sellerCompanyName}</strong></p>
                {invoice.sellerContactName && (
                  <p>{invoice.sellerContactName}</p>
                )}
                {invoice.sellerEmail && (
                  <p>Email: {invoice.sellerEmail}</p>
                )}
                {invoice.sellerPhone && (
                  <p>Phone: {invoice.sellerPhone}</p>
                )}
                {invoice.sellerAddress && (
                  <p>Address: {invoice.sellerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bill To */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Bill To</h3>
              <div className="space-y-1 text-sm">
                <p><strong>{invoice.buyerCompanyName}</strong></p>
                {invoice.buyerContactName && (
                  <p>{invoice.buyerContactName}</p>
                )}
                {invoice.buyerEmail && (
                  <p>Email: {invoice.buyerEmail}</p>
                )}
                {invoice.buyerPhone && (
                  <p>Phone: {invoice.buyerPhone}</p>
                )}
                {invoice.buyerAddress && (
                  <p>Address: {invoice.buyerAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ship To */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm uppercase mb-3">Ship To</h3>
              <div className="space-y-1 text-sm">
                {invoice.shipToCompanyName ? (
                  <>
                    <p><strong>{invoice.shipToCompanyName}</strong></p>
                    {invoice.shipToContactName && (
                      <p>{invoice.shipToContactName}</p>
                    )}
                    {invoice.shipToEmail && (
                      <p>Email: {invoice.shipToEmail}</p>
                    )}
                    {invoice.shipToPhone && (
                      <p>Phone: {invoice.shipToPhone}</p>
                    )}
                    {invoice.shipToAddress && (
                      <p>Address: {invoice.shipToAddress}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Same as Bill To</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Details */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-sm uppercase mb-3">Document Details</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Invoice ID:</strong> {invoice.invoiceId}</p>
              {invoice.purchaseOrder?.poId && (
                <p><strong>PO ID:</strong> {invoice.purchaseOrder.poId}</p>
              )}
              <p><strong>Invoice Date:</strong> {formatDate(invoice.invoiceDate)}</p>
            </div>
          </CardContent>
        </Card>

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
                  {invoice.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.serialNumber}</TableCell>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.productDescription || "-"}</TableCell>
                        <TableCell>{item.sku || "-"}</TableCell>
                        <TableCell>{item.hsnCode || "-"}</TableCell>
                        <TableCell>{item.uom || "-"}</TableCell>
                        <TableCell>{Number(item.quantity).toFixed(2)}</TableCell>
                        <TableCell>₹ {Number(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell>₹ {Number(item.subTotal).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {invoice.items.length > 0 && (
              <div className="p-4 border-t bg-gray-50 print:bg-gray-50">
                <div className="flex justify-end gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Sum of Sub Total:</span>
                    <span className="text-sm font-semibold">₹ {sumOfSubTotal.toFixed(2)}</span>
                  </div>
                  {discountPercentage > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Disc Percentage:</span>
                      <span className="text-sm font-semibold">{discountPercentage.toFixed(2)}%</span>
                    </div>
                  )}
                  {additionalCharges > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Add&apos;l Charges:</span>
                      <span className="text-sm font-semibold">₹ {additionalCharges.toFixed(2)}</span>
                    </div>
                  )}
                  {taxPercentage > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Tax Percentage:</span>
                      <span className="text-sm font-semibold">{taxPercentage.toFixed(2)}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total:</span>
                    <span className="text-lg font-bold">₹ {totalAmount.toFixed(2)}</span>
                  </div>
                  {paidAmount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Paid Amount:</span>
                      <span className="text-sm font-semibold text-green-600">₹ {paidAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {remainingAmount > 0 && remainingAmount < totalAmount && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Remaining Amount:</span>
                      <span className="text-sm font-semibold text-red-600">₹ {remainingAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.termsAndConditions && (
          <Card>
            <CardContent className="p-0">
              <div className="bg-gray-200 p-3 print:bg-gray-200">
                <h3 className="font-semibold text-sm uppercase">Notes</h3>
              </div>
              <div className="p-4">
                <p className="text-sm whitespace-pre-wrap">{invoice.termsAndConditions}</p>
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
              {invoice.signatureByName && (
                <p className="text-sm mb-2"><strong>Signature By:</strong> {invoice.signatureByName}</p>
              )}
              {invoice.signatureUrl && (
                <div className="mt-2">
                  <img
                    src={invoice.signatureUrl}
                    alt="Signature"
                    className="h-24 w-auto border rounded"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Receipt */}
        {invoice.paymentReceiptUrl && (
          <Card>
            <CardContent className="p-0">
              <div className="bg-gray-200 p-3 print:bg-gray-200">
                <h3 className="font-semibold text-sm uppercase">Payment Receipt</h3>
              </div>
              <div className="p-4">
                {invoice.paymentReceiptUrl.match(/\.(jpg|jpeg|png)$/i) ? (
                  <div className="mt-2">
                    <img
                      src={invoice.paymentReceiptUrl}
                      alt="Payment Receipt"
                      className="max-w-full h-auto border rounded"
                    />
                  </div>
                ) : (
                  <div className="mt-2">
                    <a
                      href={invoice.paymentReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      View Payment Receipt (PDF)
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => router.push("/buyer/invoices")}>
          Close
        </Button>
        
        {canRespond() && (
          <>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
            >
              <X className="mr-2 h-4 w-4" />
              {isProcessing ? "Processing..." : "Reject"}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isProcessing ? "Processing..." : "Acknowledge"}
            </Button>
          </>
        )}

        {canPay() && (
          <Button
            onClick={() => setShowPaymentModal(true)}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {invoice.status === InvoiceStatus.OVERDUE ? "Pay Now" : "Pay"}
          </Button>
        )}

        {isPaid() && (
          <Button variant="outline" disabled>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Paid
          </Button>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Make Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="full"
                      checked={paymentType === "full"}
                      onChange={(e) => {
                        setPaymentType(e.target.value as "full" | "partial");
                        setPaymentAmount("");
                      }}
                      className="mr-2"
                    />
                    Full Payment (₹{remainingAmount.toFixed(2)})
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="partial"
                      checked={paymentType === "partial"}
                      onChange={(e) => setPaymentType(e.target.value as "full" | "partial")}
                      className="mr-2"
                    />
                    Partial Payment
                  </label>
                </div>
              </div>
              {paymentType === "partial" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={remainingAmount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Remaining Amount: ₹{remainingAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Receipt * (Image or PDF)</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={handleReceiptUpload}
                      className="w-full px-3 py-2 border rounded-md cursor-pointer"
                    />
                    {receiptPreview && receiptFile && receiptFile.type.match(/^image\/(jpeg|jpg|png)$/) && (
                      <div className="mt-2">
                        <img
                          src={receiptPreview}
                          alt="Receipt preview"
                          className="max-w-full h-32 border rounded"
                        />
                      </div>
                    )}
                    {receiptPreview && receiptFile && receiptFile.type === "application/pdf" && (
                      <p className="text-sm text-muted-foreground mt-2">
                        PDF: {receiptFile.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload payment receipt (JPG, PNG, or PDF, max 5MB)
                    </p>
                  </div>
                </>
              )}
              {paymentType === "full" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Receipt (Optional)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={handleReceiptUpload}
                    className="w-full px-3 py-2 border rounded-md cursor-pointer"
                  />
                  {receiptPreview && receiptFile && receiptFile.type.match(/^image\/(jpeg|jpg|png)$/) && (
                    <div className="mt-2">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="max-w-full h-32 border rounded"
                      />
                    </div>
                  )}
                  {receiptPreview && receiptFile && receiptFile.type === "application/pdf" && (
                    <p className="text-sm text-muted-foreground mt-2">
                      PDF: {receiptFile.name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload payment receipt (JPG, PNG, or PDF, max 5MB) - Optional
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount("");
                    setPaymentType("full");
                    setReceiptFile(null);
                    setReceiptPreview(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing || (paymentType === "partial" && (!paymentAmount || !receiptFile))}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? "Processing..." : "Confirm Payment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

