"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Invoice, InvoiceItem, InvoiceStatus } from "@prisma/client";
import { DatePicker } from "@/components/ui/date-picker";

const invoiceSchema = z.object({
  invoiceDate: z.string().min(1, "Invoice date is required"),
  sellerCompanyName: z.string().min(1, "Seller company name is required"),
  sellerContactName: z.string().optional(),
  sellerEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  sellerPhone: z.string().optional(),
  sellerAddress: z.string().optional(),
  buyerCompanyName: z.string().min(1, "Buyer company name is required"),
  buyerContactName: z.string().optional(),
  buyerEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  buyerPhone: z.string().optional(),
  buyerAddress: z.string().optional(),
  shipToCompanyName: z.string().optional(),
  shipToContactName: z.string().optional(),
  shipToEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  shipToPhone: z.string().optional(),
  shipToAddress: z.string().optional(),
  discountPercentage: z.string().optional(),
  additionalCharges: z.string().optional(),
  taxPercentage: z.string().optional(),
  termsAndConditions: z.string().optional(),
  signatureByName: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormPageProps {
  invoice?: Invoice & {
    items: InvoiceItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
  } | null;
}

export function SellerInvoiceFormPage({ invoice }: InvoiceFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderIdFromQuery = searchParams.get("purchaseOrderId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(
    invoice?.purchaseOrderId || purchaseOrderIdFromQuery || null
  );
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    invoice?.signatureUrl || null
  );
  const [items, setItems] = useState<
    Array<{
      serialNumber: number;
      productName: string;
      productDescription?: string;
      sku?: string;
      hsnCode?: string;
      uom?: string;
      quantity: number;
      unitPrice: number;
      subTotal: number;
    }>
  >(
    invoice?.items && invoice.items.length > 0
      ? invoice.items.map((item, idx) => ({
          serialNumber: idx + 1,
          productName: item.productName,
          productDescription: item.productDescription || "",
          sku: item.sku || "",
          hsnCode: item.hsnCode || "",
          uom: item.uom || "",
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          subTotal: Number(item.subTotal),
        }))
      : []
  );

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceDate: invoice?.invoiceDate
        ? new Date(invoice.invoiceDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      sellerCompanyName: invoice?.sellerCompanyName || "",
      sellerContactName: invoice?.sellerContactName || "",
      sellerEmail: invoice?.sellerEmail || "",
      sellerPhone: invoice?.sellerPhone || "",
      sellerAddress: invoice?.sellerAddress || "",
      buyerCompanyName: invoice?.buyerCompanyName || "",
      buyerContactName: invoice?.buyerContactName || "",
      buyerEmail: invoice?.buyerEmail || "",
      buyerPhone: invoice?.buyerPhone || "",
      buyerAddress: invoice?.buyerAddress || "",
      shipToCompanyName: invoice?.shipToCompanyName || "",
      shipToContactName: invoice?.shipToContactName || "",
      shipToEmail: invoice?.shipToEmail || "",
      shipToPhone: invoice?.shipToPhone || "",
      shipToAddress: invoice?.shipToAddress || "",
      discountPercentage: invoice?.discountPercentage
        ? String(Number(invoice.discountPercentage))
        : "",
      additionalCharges: invoice?.additionalCharges
        ? String(Number(invoice.additionalCharges))
        : "",
      taxPercentage: invoice?.taxPercentage
        ? String(Number(invoice.taxPercentage))
        : "",
      termsAndConditions: invoice?.termsAndConditions || "",
      signatureByName: invoice?.signatureByName || "",
    },
  });

  // Calculate financials
  const financials = useMemo(() => {
    const sumOfSubTotal = items.reduce((sum, item) => sum + item.subTotal, 0);
    const discountPercentage = parseFloat(form.watch("discountPercentage") || "0");
    const discountAmount = (sumOfSubTotal * discountPercentage) / 100;
    const amountAfterDiscount = sumOfSubTotal - discountAmount;
    const additionalCharges = parseFloat(form.watch("additionalCharges") || "0");
    const taxPercentage = parseFloat(form.watch("taxPercentage") || "0");
    const taxAmount = (amountAfterDiscount * taxPercentage) / 100;
    const totalAmount = amountAfterDiscount + additionalCharges + taxAmount;

    return {
      sumOfSubTotal: Math.round(sumOfSubTotal * 100) / 100,
      discountPercentage,
      discountAmount: Math.round(discountAmount * 100) / 100,
      amountAfterDiscount: Math.round(amountAfterDiscount * 100) / 100,
      additionalCharges: Math.round(additionalCharges * 100) / 100,
      taxPercentage,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }, [items, form.watch("discountPercentage"), form.watch("additionalCharges"), form.watch("taxPercentage")]);

  // Fetch company data and purchase orders
  useEffect(() => {
    fetch("/api/company/me")
      .then((res) => res.json())
      .then((data) => {
        setCompany(data);
      })
      .catch(console.error);

    // Fetch purchase orders for selection
    fetch("/api/seller/purchase-orders")
      .then((res) => res.json())
      .then((data) => {
        // Filter to only show approved POs
        const approvedPOs = data.filter((po: any) => 
          po.status === "APPROVED" || po.status === "PENDING"
        );
        setPurchaseOrders(approvedPOs);
      })
      .catch(console.error);
  }, []);

  // Fetch purchase order when selected
  useEffect(() => {
    if (selectedPOId && !invoice) {
      fetch(`/api/seller/purchase-orders/${selectedPOId}`)
        .then((res) => res.json())
        .then((data) => {
          setPurchaseOrder(data);

          // Pre-fill form from PO
          if (data) {
            // Seller details
            form.setValue("sellerCompanyName", data.sellerCompanyName || "");
            form.setValue("sellerContactName", data.sellerContactName || "");
            form.setValue("sellerEmail", data.sellerEmail || "");
            form.setValue("sellerPhone", data.sellerPhone || "");
            form.setValue("sellerAddress", data.sellerAddress || "");

            // Buyer details (Bill To)
            form.setValue("buyerCompanyName", data.buyerCompanyName || "");
            form.setValue("buyerContactName", data.buyerContactName || "");
            form.setValue("buyerEmail", data.buyerEmail || "");
            form.setValue("buyerPhone", data.buyerPhone || "");
            form.setValue("buyerAddress", data.buyerAddress || "");

            // Ship To (default to buyer details)
            form.setValue("shipToCompanyName", data.buyerCompanyName || "");
            form.setValue("shipToContactName", data.buyerContactName || "");
            form.setValue("shipToEmail", data.buyerEmail || "");
            form.setValue("shipToPhone", data.buyerPhone || "");
            form.setValue("shipToAddress", data.buyerAddress || "");

            // Pre-fill items from PO
            if (data.items && data.items.length > 0) {
              setItems(
                data.items.map((item: any, idx: number) => ({
                  serialNumber: idx + 1,
                  productName: item.productName || "",
                  productDescription: item.productDescription || "",
                  sku: item.sku || "",
                  hsnCode: item.hsnCode || "",
                  uom: item.uom || "",
                  quantity: Math.round((Number(item.quantity) || 0) * 100) / 100,
                  unitPrice: Math.round((Number(item.unitPrice) || 0) * 100) / 100,
                  subTotal: Math.round((Number(item.subTotal) || 0) * 100) / 100,
                }))
              );
            }

            // Pre-fill financials from PO
            if (data.discountPercentage) {
              form.setValue("discountPercentage", String(Number(data.discountPercentage)));
            }
            if (data.additionalCharges) {
              form.setValue("additionalCharges", String(Number(data.additionalCharges)));
            }
            if (data.taxPercentage) {
              form.setValue("taxPercentage", String(Number(data.taxPercentage)));
            }
          }
        })
        .catch(console.error);
    }
  }, [selectedPOId, invoice, form]);

  // Auto-fill seller details when company loads
  useEffect(() => {
    if (company && !invoice && !purchaseOrder) {
      form.setValue("sellerCompanyName", company.name || "");
      form.setValue("sellerContactName", company.pocName || "");
      form.setValue("sellerEmail", company.email || "");
      form.setValue("sellerPhone", company.phone || "");
      if (company.addresses && company.addresses.length > 0) {
        const firstAddress = company.addresses[0];
        const addressParts = [
          firstAddress.line1,
          firstAddress.line2,
          firstAddress.postalCode,
        ].filter(Boolean);
        form.setValue("sellerAddress", addressParts.join(", "));
      }
    }
  }, [company, form, invoice, purchaseOrder]);

  const handleItemChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === "quantity" || field === "unitPrice") {
      const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
      item[field] = Math.round(numValue * 100) / 100;
      item.subTotal = Math.round((item.quantity * item.unitPrice) * 100) / 100;
    } else {
      (item as any)[field] = value;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleAddRow = () => {
    setItems([
      ...items,
      {
        serialNumber: items.length + 1,
        productName: "",
        productDescription: "",
        sku: "",
        hsnCode: "",
        uom: "",
        quantity: 0,
        unitPrice: 0,
        subTotal: 0,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      alert("At least one product is required");
      return;
    }
    const newItems = items.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      serialNumber: idx + 1,
    }));
    setItems(newItems);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        setError("Signature must be a JPG or PNG file");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Signature must be less than 2MB");
        return;
      }
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (data: InvoiceFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate items
      if (items.length === 0) {
        setError("At least one product is required");
        setIsSubmitting(false);
        return;
      }

      const validProducts = items.filter(
        (item) => item.productName.trim() !== ""
      );

      if (validProducts.length === 0) {
        setError("At least one product with a name is required");
        setIsSubmitting(false);
        return;
      }

      // Validate quantities and prices
      for (const item of validProducts) {
        if (item.quantity <= 0) {
          setError(`Quantity must be greater than 0 for ${item.productName}`);
          setIsSubmitting(false);
          return;
        }
        if (item.unitPrice < 0) {
          setError(`Unit price cannot be negative for ${item.productName}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Upload signature if a new file was selected
      let signatureUrl = invoice?.signatureUrl || null;
      if (signatureFile) {
        const formData = new FormData();
        formData.append("signature", signatureFile);

        const uploadResponse = await fetch("/api/rfq/signature", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload signature");
        }

        const uploadData = await uploadResponse.json();
        signatureUrl = uploadData.signatureUrl;
      }

      const method = invoice ? "PUT" : "POST";
      const url = invoice
        ? `/api/seller/invoices/${invoice.id}`
        : "/api/seller/invoices";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          purchaseOrderId: selectedPOId || invoice?.purchaseOrderId,
          signatureUrl,
          items: validProducts.map(item => ({
            ...item,
            quantity: Math.round(item.quantity * 100) / 100,
            unitPrice: Math.round(item.unitPrice * 100) / 100,
            subTotal: Math.round(item.subTotal * 100) / 100,
          })),
          status: invoice?.status || InvoiceStatus.DRAFT,
        }),
      });

      const responseData = await response.json().catch(() => ({ error: "Unknown error" }));

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            `Failed to ${invoice ? "update" : "create"} invoice`
        );
      }

      alert(`Invoice ${invoice ? "updated" : "created"} successfully!`);
      router.push("/seller/invoices");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/seller/invoices")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {invoice ? "Edit Invoice" : "Create New Invoice"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {invoice
              ? "Update invoice details"
              : "Select a purchase order to create an invoice"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Document Details */}
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FormLabel>Invoice ID</FormLabel>
                  <Input
                    value={invoice?.invoiceId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <FormLabel>PO ID</FormLabel>
                  {invoice ? (
                    <Input
                      value={invoice.purchaseOrder?.poId || "Auto-Generated"}
                      disabled
                      readOnly
                      className="bg-muted"
                    />
                  ) : (
                    <Select
                      value={selectedPOId || ""}
                      onValueChange={(value) => {
                        setSelectedPOId(value);
                        setPurchaseOrder(null);
                        setItems([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Purchase Order" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchaseOrders.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.poId} - {po.buyerCompanyName || ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Date *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => {
                            field.onChange(date ? date.toISOString().split("T")[0] : "");
                          }}
                          placeholder="Select Date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seller Details, Bill To, Ship To - Three Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Seller Details */}
            <Card>
              <CardHeader>
                <CardTitle>Seller Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="sellerCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellerContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Bill To */}
            <Card>
              <CardHeader>
                <CardTitle>Bill To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="buyerCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyerContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Ship To */}
            <Card>
              <CardHeader>
                <CardTitle>Ship To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="shipToCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipToContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipToEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipToPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shipToAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* List of Products / Services */}
          <Card>
            <CardHeader>
              <CardTitle>List of Products / Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Product Name *</TableHead>
                      <TableHead>Product Description</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>UoM</TableHead>
                      <TableHead>Quantity *</TableHead>
                      <TableHead>Unit Price *</TableHead>
                      <TableHead>Sub Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          {selectedPOId ? "Loading products from purchase order..." : "Please select a Purchase Order first"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.serialNumber}</TableCell>
                          <TableCell>
                            <Input
                              value={item.productName}
                              onChange={(e) =>
                                handleItemChange(index, "productName", e.target.value)
                              }
                              placeholder="Product Name"
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.productDescription || ""}
                              onChange={(e) =>
                                handleItemChange(index, "productDescription", e.target.value)
                              }
                              placeholder="Description"
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.sku || ""}
                              onChange={(e) => handleItemChange(index, "sku", e.target.value)}
                              placeholder="SKU"
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.hsnCode || ""}
                              onChange={(e) =>
                                handleItemChange(index, "hsnCode", e.target.value)
                              }
                              placeholder="HSN Code"
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.uom || ""}
                              onChange={(e) => handleItemChange(index, "uom", e.target.value)}
                              placeholder="UoM"
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantity !== undefined && item.quantity !== null ? item.quantity : ""}
                              onChange={(e) =>
                                handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)
                              }
                              placeholder="0.00"
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitPrice !== undefined && item.unitPrice !== null ? item.unitPrice : ""}
                              onChange={(e) =>
                                handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)
                              }
                              placeholder="0.00"
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.subTotal.toFixed(2)}
                              disabled
                              readOnly
                              className="w-24 bg-muted"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRow(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddRow}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary of Charges */}
          <Card>
            <CardHeader>
              <CardTitle>Summary of Charges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sum of Sub Total:</p>
                  <p className="text-lg font-semibold">₹ {financials.sumOfSubTotal.toFixed(2)}</p>
                </div>
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disc Percentage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          placeholder="0.00"
                          onChange={(e) => {
                            field.onChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Add'l Charges (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          placeholder="0.00"
                          onChange={(e) => {
                            field.onChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Percentage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          placeholder="0.00"
                          onChange={(e) => {
                            field.onChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold">Total:</p>
                  <p className="text-2xl font-bold">₹ {financials.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="termsAndConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Input Text Box (Word Formatting Tool)"
                        rows={6}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Signature */}
          <Card>
            <CardHeader>
              <CardTitle>Signature By</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="signatureByName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input text</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Input text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <FormLabel>Acknowledgement (Signature)</FormLabel>
                <div className="mt-2 space-y-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleSignatureUpload}
                    className="cursor-pointer"
                  />
                  {signaturePreview && (
                    <div className="mt-2">
                      <img
                        src={signaturePreview}
                        alt="Signature preview"
                        className="h-24 w-auto border rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/seller/invoices")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

