"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
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
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import { DeliveryNote, DeliveryNoteItem } from "@prisma/client";
import { DatePicker } from "@/components/ui/date-picker";

const SHIPPING_METHODS = [
  "Ship",
  "Truck",
  "Air",
  "Sea",
  "Rail",
  "Courier",
  "Other",
];

const dnSchema = z.object({
  delDate: z.string().min(1, "Delivery date is required"),
  shippingMethod: z.string().optional(),
  shippingDate: z.string().optional(),
  carrierName: z.string().optional(),
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
  notes: z.string().optional(),
  signatureByName: z.string().optional(),
});

type DNFormData = z.infer<typeof dnSchema>;

interface DeliveryNoteFormPageProps {
  deliveryNote?: DeliveryNote & {
    items: DeliveryNoteItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
    salesOrder?: {
      soId: string;
    } | null;
  } | null;
}

export function SellerDeliveryNoteFormPage({
  deliveryNote,
}: DeliveryNoteFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderIdFromQuery = searchParams.get("purchaseOrderId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(
    deliveryNote?.purchaseOrderId || purchaseOrderIdFromQuery || null
  );
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [salesOrder, setSalesOrder] = useState<any>(null);
  const [existingDeliveryNotes, setExistingDeliveryNotes] = useState<any[]>([]);
  const [remainingQuantities, setRemainingQuantities] = useState<Record<string, number>>({});
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    deliveryNote?.signatureUrl || null
  );
  const [items, setItems] = useState<
    Array<{
      serialNumber: number;
      productName: string;
      productDescription?: string;
      sku?: string;
      hsnCode?: string;
      uom?: string;
      quantity: number; // Original quantity from PO
      quantityDelivered: number; // Quantity being delivered
    }>
  >(
    deliveryNote?.items && deliveryNote.items.length > 0
      ? deliveryNote.items.map((item, idx) => ({
          serialNumber: idx + 1,
          productName: item.productName,
          productDescription: item.productDescription || "",
          sku: item.sku || "",
          hsnCode: item.hsnCode || "",
          uom: item.uom || "",
          quantity: Number(item.quantity),
          quantityDelivered: Number(item.quantityDelivered),
        }))
      : []
  );

  const form = useForm<DNFormData>({
    resolver: zodResolver(dnSchema),
    defaultValues: {
      delDate: deliveryNote?.delDate
        ? new Date(deliveryNote.delDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      shippingMethod: deliveryNote?.shippingMethod || "",
      shippingDate: deliveryNote?.shippingDate
        ? new Date(deliveryNote.shippingDate).toISOString().split("T")[0]
        : "",
      carrierName: deliveryNote?.carrierName || "",
      sellerCompanyName: deliveryNote?.sellerCompanyName || "",
      sellerContactName: deliveryNote?.sellerContactName || "",
      sellerEmail: deliveryNote?.sellerEmail || "",
      sellerPhone: deliveryNote?.sellerPhone || "",
      sellerAddress: deliveryNote?.sellerAddress || "",
      buyerCompanyName: deliveryNote?.buyerCompanyName || "",
      buyerContactName: deliveryNote?.buyerContactName || "",
      buyerEmail: deliveryNote?.buyerEmail || "",
      buyerPhone: deliveryNote?.buyerPhone || "",
      buyerAddress: deliveryNote?.buyerAddress || "",
      notes: deliveryNote?.notes || "",
      signatureByName: deliveryNote?.signatureByName || "",
    },
  });

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
    if (selectedPOId && !deliveryNote) {
      // Fetch purchase order
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

            // Buyer details
            form.setValue("buyerCompanyName", data.buyerCompanyName || "");
            form.setValue("buyerContactName", data.buyerContactName || "");
            form.setValue("buyerEmail", data.buyerEmail || "");
            form.setValue("buyerPhone", data.buyerPhone || "");
            form.setValue("buyerAddress", data.buyerAddress || "");

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
                  quantity: Number(item.quantity) || 0,
                  quantityDelivered: 0, // User will enter this
                }))
              );
            }

            // Check if there's a related sales order
            if (data.salesOrders && Array.isArray(data.salesOrders) && data.salesOrders.length > 0) {
              setSalesOrder(data.salesOrders[0]);
            }
          }
        })
        .catch(console.error);

      // Fetch existing delivery notes for this PO to calculate remaining quantities
      fetch(`/api/seller/delivery-notes?purchaseOrderId=${selectedPOId}`)
        .then((res) => res.json())
        .then((dns) => {
          setExistingDeliveryNotes(dns || []);
        })
        .catch(console.error);
    }
  }, [selectedPOId, deliveryNote, form]);

  // Calculate remaining quantities when purchaseOrder and existingDeliveryNotes are available
  useEffect(() => {
    if (purchaseOrder?.items && existingDeliveryNotes.length >= 0 && !deliveryNote && selectedPOId) {
      const remaining: Record<string, number> = {};
      
      purchaseOrder.items.forEach((poItem: any) => {
        const poItemKey = poItem.id || poItem.productName;
        const totalQuantity = Math.round((Number(poItem.quantity) || 0) * 100) / 100;
        
        // Sum all delivered quantities for this item across all delivery notes
        let totalDelivered = 0;
        existingDeliveryNotes.forEach((dn: any) => {
          dn.items?.forEach((dnItem: any) => {
            // Match by product name and SKU if available
            if (
              dnItem.productName === poItem.productName &&
              (!poItem.sku || dnItem.sku === poItem.sku)
            ) {
              totalDelivered += Math.round((Number(dnItem.quantityDelivered) || 0) * 100) / 100;
            }
          });
        });
        
        remaining[poItemKey] = Math.max(0, Math.round((totalQuantity - totalDelivered) * 100) / 100);
      });
      
      setRemainingQuantities(remaining);
    }
  }, [purchaseOrder, existingDeliveryNotes, deliveryNote, selectedPOId]);

  // Auto-fill seller details when company loads
  useEffect(() => {
    if (company && !deliveryNote && !purchaseOrder) {
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
  }, [company, form, deliveryNote, purchaseOrder]);

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
        quantityDelivered: 0,
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

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === "quantityDelivered") {
      // Round to 2 decimal places to avoid precision issues
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      const roundedValue = isNaN(numValue) ? 0 : Math.round(numValue * 100) / 100;
      newItems[index] = { ...newItems[index], [field]: roundedValue };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
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

  const handleSubmit = async (data: DNFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate PO selection
      if (!selectedPOId && !deliveryNote) {
        setError("Please select a Purchase Order");
        setIsSubmitting(false);
        return;
      }

      // Validate products
      const validProducts = items.filter((item) => item.productName.trim() !== "");
      if (validProducts.length === 0) {
        setError("At least one product is required");
        setIsSubmitting(false);
        return;
      }

      // Calculate remaining quantities if this is a new DN (not editing)
      let remainingQtyMap: Record<string, number> = {};
      if (!deliveryNote && selectedPOId && purchaseOrder?.items) {
        // Calculate total delivered so far for each PO item
        purchaseOrder.items.forEach((poItem: any) => {
          const poItemKey = poItem.id || poItem.productName;
          const totalQuantity = Math.round((Number(poItem.quantity) || 0) * 100) / 100;
          
          let totalDelivered = 0;
          existingDeliveryNotes.forEach((dn: any) => {
            dn.items?.forEach((dnItem: any) => {
              if (
                dnItem.productName === poItem.productName &&
                (!poItem.sku || dnItem.sku === poItem.sku)
              ) {
                totalDelivered += Math.round((Number(dnItem.quantityDelivered) || 0) * 100) / 100;
              }
            });
          });
          
          remainingQtyMap[poItemKey] = Math.max(0, Math.round((totalQuantity - totalDelivered) * 100) / 100);
        });
      }

      // Validate quantity delivered
      for (const item of validProducts) {
        // Round to 2 decimal places
        const roundedQty = Math.round(item.quantityDelivered * 100) / 100;
        
        if (!roundedQty || roundedQty <= 0) {
          setError("Quantity Delivered must be greater than 0 for all products");
          setIsSubmitting(false);
          return;
        }
        
        // Check against remaining quantity (for partial deliveries)
        const poItem = purchaseOrder?.items?.find((poItem: any) => 
          poItem.productName === item.productName &&
          (!item.sku || poItem.sku === item.sku)
        );
        
        if (poItem && !deliveryNote) {
          const poItemKey = poItem.id || poItem.productName;
          const remainingQty = remainingQtyMap[poItemKey] ?? Math.round((Number(poItem.quantity) || 0) * 100) / 100;
          
          if (roundedQty > remainingQty) {
            setError(`Quantity Delivered (${roundedQty.toFixed(2)}) cannot exceed remaining quantity (${remainingQty.toFixed(2)}) for ${item.productName}`);
            setIsSubmitting(false);
            return;
          }
        } else if (roundedQty > item.quantity) {
          setError(`Quantity Delivered (${roundedQty.toFixed(2)}) cannot exceed Quantity (${item.quantity.toFixed(2)}) for ${item.productName}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Upload signature if a new file was selected
      let signatureUrl = deliveryNote?.signatureUrl || null;
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

      const method = deliveryNote ? "PUT" : "POST";
      const url = deliveryNote
        ? `/api/seller/delivery-notes/${deliveryNote.id}`
        : "/api/seller/delivery-notes";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          purchaseOrderId: selectedPOId || deliveryNote?.purchaseOrderId,
          salesOrderId: salesOrder?.id || deliveryNote?.salesOrderId || null,
          signatureUrl,
          items: validProducts.map(item => ({
            ...item,
            quantity: Math.round(item.quantity * 100) / 100,
            quantityDelivered: Math.round(item.quantityDelivered * 100) / 100,
          })),
        }),
      });

      const responseData = await response.json().catch(() => ({ error: "Unknown error" }));

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            `Failed to ${deliveryNote ? "update" : "create"} delivery note`
        );
      }

      alert(`Delivery note ${deliveryNote ? "updated" : "created"} successfully!`);
      router.push("/seller/delivery-notes");
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
          onClick={() => router.push("/seller/delivery-notes")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {deliveryNote ? "Edit Delivery Note" : "Create New Delivery Note"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {deliveryNote
              ? "Update delivery note details"
              : "Select a purchase order to create a delivery note"}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Delivery Note ID</FormLabel>
                  <Input
                    value={deliveryNote?.dnId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <FormLabel>PO ID</FormLabel>
                  {deliveryNote ? (
                    <Input
                      value={deliveryNote.purchaseOrder?.poId || "Auto-Generated"}
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
                <div>
                  <FormLabel>SO ID</FormLabel>
                  <Input
                    value={salesOrder?.soId || deliveryNote?.salesOrder?.soId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <FormField
                  control={form.control}
                  name="delDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Del Date *</FormLabel>
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
                <FormField
                  control={form.control}
                  name="shippingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Shipping Method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SHIPPING_METHODS.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shippingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Date</FormLabel>
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
                <FormField
                  control={form.control}
                  name="carrierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrier Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seller Details */}
          <Card>
            <CardHeader>
              <CardTitle>Seller Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sellerCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller Company Name *</FormLabel>
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
              </div>
            </CardContent>
          </Card>

          {/* Ship To (Buyer Details) */}
          <Card>
            <CardHeader>
              <CardTitle>Ship To</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buyerCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer Company Name *</FormLabel>
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
              </div>
            </CardContent>
          </Card>

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
                      <TableHead>Quantity</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Quantity Delivered *</TableHead>
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
                              value={item.quantity ? item.quantity.toFixed(2) : "0.00"}
                              disabled
                              readOnly
                              className="w-20 bg-muted"
                            />
                          </TableCell>
                          <TableCell>
                            {(() => {
                              // Calculate remaining quantity
                              const poItem = purchaseOrder?.items?.find((poItem: any) => 
                                poItem.productName === item.productName &&
                                (!item.sku || poItem.sku === item.sku)
                              );
                              
                              if (poItem && !deliveryNote) {
                                const poItemKey = poItem.id || poItem.productName;
                                const totalQuantity = Number(poItem.quantity) || 0;
                                const remaining = remainingQuantities[poItemKey] ?? totalQuantity;
                                return (
                                  <Input
                                    type="number"
                                    value={remaining.toFixed(2)}
                                    disabled
                                    readOnly
                                    className="w-24 bg-blue-50 dark:bg-blue-900/20"
                                    title="Remaining quantity to be delivered"
                                  />
                                );
                              }
                              return (
                                <Input
                                  type="number"
                                  value={item.quantity ? item.quantity.toFixed(2) : "0.00"}
                                  disabled
                                  readOnly
                                  className="w-24 bg-muted"
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantityDelivered !== undefined && item.quantityDelivered !== null ? item.quantityDelivered.toFixed(2) : ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                // Round to 2 decimal places
                                const roundedValue = Math.round(value * 100) / 100;
                                handleItemChange(
                                  index,
                                  "quantityDelivered",
                                  roundedValue
                                );
                              }}
                              placeholder="0.00"
                              className="w-24"
                              min="0"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRow(index)}
                              disabled={items.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {items.length > 0 && (
                  <div className="p-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddRow}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Row
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Miscellaneous */}
          <Card>
            <CardHeader>
              <CardTitle>Miscellaneous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
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

          {/* Signature By */}
          <Card>
            <CardHeader>
              <CardTitle>Signature & Acknowledgement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="signatureByName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signature By</FormLabel>
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
                        className="h-20 w-auto border rounded"
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
              onClick={() => router.push("/seller/delivery-notes")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting
                ? deliveryNote
                  ? "Updating..."
                  : "Creating..."
                : deliveryNote
                  ? "Update Delivery Note"
                  : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

