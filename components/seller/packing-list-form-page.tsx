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
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import { PackingList, PackingListItem } from "@prisma/client";
import { DatePicker } from "@/components/ui/date-picker";

const PACKAGE_TYPES = ["Carton", "Box", "Pallet", "Bag", "Container", "Other"];

const plSchema = z.object({
  packingDate: z.string().min(1, "Packing date is required"),
  shipmentTrackingId: z.string().optional(),
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

type PLFormData = z.infer<typeof plSchema>;

interface PackingListFormPageProps {
  packingList?: PackingList & {
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
  } | null;
}

export function SellerPackingListFormPage({
  packingList,
}: PackingListFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderIdFromQuery = searchParams.get("purchaseOrderId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(
    packingList?.purchaseOrderId || purchaseOrderIdFromQuery || null
  );
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [deliveryNote, setDeliveryNote] = useState<any>(null);
  const [salesOrder, setSalesOrder] = useState<any>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    packingList?.signatureUrl || null
  );
  const [items, setItems] = useState<
    Array<{
      serialNumber: number;
      productName: string;
      sku?: string;
      hsnCode?: string;
      uom?: string;
      quantity: number;
      packageType?: string;
      grossWeight?: number;
      netWeight?: number;
      noOfPackages?: number;
      dimensions?: string;
    }>
  >(
    packingList?.items && packingList.items.length > 0
      ? packingList.items.map((item, idx) => ({
          serialNumber: idx + 1,
          productName: item.productName,
          sku: item.sku || "",
          hsnCode: item.hsnCode || "",
          uom: item.uom || "",
          quantity: Number(item.quantity),
          packageType: item.packageType || "",
          grossWeight: item.grossWeight ? Number(item.grossWeight) : undefined,
          netWeight: item.netWeight ? Number(item.netWeight) : undefined,
          noOfPackages: item.noOfPackages || undefined,
          dimensions: item.dimensions || "",
        }))
      : []
  );

  const form = useForm<PLFormData>({
    resolver: zodResolver(plSchema),
    defaultValues: {
      packingDate: packingList?.packingDate
        ? new Date(packingList.packingDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      shipmentTrackingId: packingList?.shipmentTrackingId || "",
      carrierName: packingList?.carrierName || "",
      sellerCompanyName: packingList?.sellerCompanyName || "",
      sellerContactName: packingList?.sellerContactName || "",
      sellerEmail: packingList?.sellerEmail || "",
      sellerPhone: packingList?.sellerPhone || "",
      sellerAddress: packingList?.sellerAddress || "",
      buyerCompanyName: packingList?.buyerCompanyName || "",
      buyerContactName: packingList?.buyerContactName || "",
      buyerEmail: packingList?.buyerEmail || "",
      buyerPhone: packingList?.buyerPhone || "",
      buyerAddress: packingList?.buyerAddress || "",
      notes: packingList?.notes || "",
      signatureByName: packingList?.signatureByName || "",
    },
  });

  // Calculate totals
  const totals = useMemo(() => {
    return {
      totalGrossWeight: items.reduce(
        (sum, item) => sum + (item.grossWeight || 0),
        0
      ),
      totalNetWeight: items.reduce(
        (sum, item) => sum + (item.netWeight || 0),
        0
      ),
      totalNoOfPackages: items.reduce(
        (sum, item) => sum + (item.noOfPackages || 0),
        0
      ),
    };
  }, [items]);

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
    if (selectedPOId && !packingList) {
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
                  sku: item.sku || "",
                  hsnCode: item.hsnCode || "",
                  uom: item.uom || "",
                  quantity: Math.round((Number(item.quantity) || 0) * 100) / 100,
                  packageType: "",
                  grossWeight: undefined,
                  netWeight: undefined,
                  noOfPackages: undefined,
                  dimensions: "",
                }))
              );
            }

            // Check if there's a related sales order
            if (data.salesOrders && Array.isArray(data.salesOrders) && data.salesOrders.length > 0) {
              setSalesOrder(data.salesOrders[0]);
            }

            // Check if there's a related delivery note
            if (data.deliveryNotes && Array.isArray(data.deliveryNotes) && data.deliveryNotes.length > 0) {
              setDeliveryNote(data.deliveryNotes[0]);
            }
          }
        })
        .catch(console.error);
    }
  }, [selectedPOId, packingList, form]);

  // Auto-fill seller details when company loads
  useEffect(() => {
    if (company && !packingList && !purchaseOrder) {
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
  }, [company, form, packingList, purchaseOrder]);

  const handleAddRow = () => {
    setItems([
      ...items,
      {
        serialNumber: items.length + 1,
        productName: "",
        sku: "",
        hsnCode: "",
        uom: "",
        quantity: 0,
        packageType: "",
        grossWeight: undefined,
        netWeight: undefined,
        noOfPackages: undefined,
        dimensions: "",
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
    if (field === "grossWeight" || field === "netWeight") {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      const roundedValue = isNaN(numValue) ? 0 : Math.round(numValue * 100) / 100;
      newItems[index] = { ...newItems[index], [field]: roundedValue };
    } else if (field === "noOfPackages") {
      const intValue = typeof value === "string" ? parseInt(value) : value;
      newItems[index] = { ...newItems[index], [field]: isNaN(intValue) ? undefined : intValue };
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

  const handleSubmit = async (data: PLFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate PO selection
      if (!selectedPOId && !packingList) {
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

      // Upload signature if a new file was selected
      let signatureUrl = packingList?.signatureUrl || null;
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
        signatureUrl = uploadData.url;
      }

      // Generate shipment tracking ID if not provided
      let shipmentTrackingId = data.shipmentTrackingId;
      if (!shipmentTrackingId && !packingList) {
        const companyInitials = company?.name
          ? company.name
              .split(" ")
              .map((word: string) => word[0])
              .join("")
              .toUpperCase()
              .slice(0, 3)
              .padEnd(3, "X")
          : "XXX";
        shipmentTrackingId = `${companyInitials}SHPID${String(Date.now()).slice(-6)}`;
      }

      const requestBody = {
        ...data,
        purchaseOrderId: selectedPOId || packingList?.purchaseOrderId,
        deliveryNoteId: deliveryNote?.id || packingList?.deliveryNoteId || null,
        salesOrderId: salesOrder?.id || packingList?.salesOrderId || null,
        shipmentTrackingId,
        signatureUrl,
        items: validProducts.map((item) => ({
          ...item,
          quantity: Math.round(item.quantity * 100) / 100,
          grossWeight: item.grossWeight ? Math.round(item.grossWeight * 100) / 100 : null,
          netWeight: item.netWeight ? Math.round(item.netWeight * 100) / 100 : null,
        })),
      };

      const url = packingList
        ? `/api/seller/packing-lists/${packingList.id}`
        : "/api/seller/packing-lists";
      const method = packingList ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            `Failed to ${packingList ? "update" : "create"} packing list`
        );
      }

      alert(`Packing list ${packingList ? "updated" : "created"} successfully!`);
      router.push("/seller/packing-lists");
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
          onClick={() => router.push("/seller/packing-lists")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {packingList ? "Edit Packing List" : "Create New Packing List"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {packingList
              ? "Update packing list details"
              : "Select a purchase order to create a packing list"}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <FormLabel>Packing List ID</FormLabel>
                  <Input
                    value={packingList?.plId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <FormLabel>DN ID</FormLabel>
                  <Input
                    value={deliveryNote?.dnId || packingList?.deliveryNote?.dnId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <FormLabel>PO ID</FormLabel>
                  {packingList ? (
                    <Input
                      value={packingList.purchaseOrder?.poId || "Auto-Generated"}
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
                        <SelectValue placeholder="Select PO" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchaseOrders.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.poId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <FormLabel>SO ID</FormLabel>
                  <Input
                    value={salesOrder?.soId || packingList?.salesOrder?.soId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <FormField
                  control={form.control}
                  name="packingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Packing Date *</FormLabel>
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
                <div>
                  <FormLabel>Shipment Tracking ID</FormLabel>
                  <Input
                    value={form.watch("shipmentTrackingId") || "Auto-gen"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
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
                    <FormItem className="md:col-span-2">
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
                    <FormItem className="md:col-span-2">
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
                      <TableHead>SKU</TableHead>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>UoM</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Package Type</TableHead>
                      <TableHead>Gross Weight (In KG)</TableHead>
                      <TableHead>Net Weight (In KG)</TableHead>
                      <TableHead>No of Packages</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
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
                            <Select
                              value={item.packageType || ""}
                              onValueChange={(value) =>
                                handleItemChange(index, "packageType", value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {PACKAGE_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.grossWeight !== undefined && item.grossWeight !== null ? item.grossWeight.toFixed(2) : ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                handleItemChange(index, "grossWeight", value);
                              }}
                              placeholder="0.00"
                              className="w-24"
                              min="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.netWeight !== undefined && item.netWeight !== null ? item.netWeight.toFixed(2) : ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                handleItemChange(index, "netWeight", value);
                              }}
                              placeholder="0.00"
                              className="w-24"
                              min="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.noOfPackages !== undefined && item.noOfPackages !== null ? item.noOfPackages : ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseInt(e.target.value) || undefined;
                                handleItemChange(index, "noOfPackages", value);
                              }}
                              placeholder="0"
                              className="w-24"
                              min="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.dimensions || ""}
                              onChange={(e) =>
                                handleItemChange(index, "dimensions", e.target.value)
                              }
                              placeholder="e.g., 10x10x10 cm"
                              className="w-32"
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
                  <div className="p-4 border-t space-y-2">
                    <div className="flex justify-end gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Total Gross Weight (In KG):</span>
                        <Input
                          value={totals.totalGrossWeight.toFixed(2)}
                          disabled
                          readOnly
                          className="w-32 bg-muted"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Total Net Weight (In KG):</span>
                        <Input
                          value={totals.totalNetWeight.toFixed(2)}
                          disabled
                          readOnly
                          className="w-32 bg-muted"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Total No of Packages:</span>
                        <Input
                          value={totals.totalNoOfPackages}
                          disabled
                          readOnly
                          className="w-32 bg-muted"
                        />
                      </div>
                    </div>
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
                        className="h-24 w-auto border rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/seller/packing-lists")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : packingList ? "Update" : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

