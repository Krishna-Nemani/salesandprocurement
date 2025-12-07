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
import { SalesOrder, SalesOrderItem, AddressType } from "@prisma/client";
import { DatePicker } from "@/components/ui/date-picker";

// ISO Currency list
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
];

// Countries list
const COUNTRIES = [
  { code: "USA", name: "United States" },
  { code: "IND", name: "India" },
  { code: "GBR", name: "United Kingdom" },
  { code: "CAN", name: "Canada" },
  { code: "AUS", name: "Australia" },
  { code: "DEU", name: "Germany" },
  { code: "FRA", name: "France" },
  { code: "JPN", name: "Japan" },
  { code: "CHN", name: "China" },
];

const soSchema = z
  .object({
    soCreatedDate: z.string().min(1, "SO created date is required"),
    plannedShipDate: z.string().min(1, "Planned ship date is required"),
    currency: z.string().min(1, "Currency is required"),
    sellerCompanyName: z.string().min(1, "Seller company name is required"),
    sellerContactName: z.string().optional(),
    sellerEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
    sellerPhone: z.string().optional(),
    sellerAddressType: z.nativeEnum(AddressType).optional(),
    sellerCountry: z.string().optional(),
    sellerState: z.string().optional(),
    sellerCity: z.string().optional(),
    sellerAddress: z.string().optional(),
    buyerCompanyName: z.string().min(1, "Buyer company name is required"),
    buyerContactName: z.string().optional(),
    buyerEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
    buyerPhone: z.string().optional(),
    buyerAddressType: z.nativeEnum(AddressType).optional(),
    buyerCountry: z.string().optional(),
    buyerState: z.string().optional(),
    buyerCity: z.string().optional(),
    buyerAddress: z.string().optional(),
    deliveryAddressType: z.nativeEnum(AddressType).optional(),
    deliveryCountry: z.string().optional(),
    deliveryState: z.string().optional(),
    deliveryCity: z.string().optional(),
    deliveryAddress: z.string().optional(),
    discountPercentage: z.string().optional(),
    additionalCharges: z.string().optional(),
    taxPercentage: z.string().optional(),
    paymentTerms: z.string().optional(),
    deliveryTerms: z.string().optional(),
    notes: z.string().optional(),
    signatureByName: z.string().optional(),
  })
  .refine((data) => {
    // Planned ship date must be on or after SO created date
    if (data.soCreatedDate && data.plannedShipDate) {
      const createdDate = new Date(data.soCreatedDate);
      const shipDate = new Date(data.plannedShipDate);
      return shipDate >= createdDate;
    }
    return true;
  }, {
    message: "Planned ship date must be on or after the SO created date",
    path: ["plannedShipDate"],
  });

type SOFormData = z.infer<typeof soSchema>;

interface SalesOrderFormPageProps {
  salesOrder?: SalesOrder & {
    items: SalesOrderItem[];
    purchaseOrder?: {
      poId: string;
    } | null;
  } | null;
  purchaseOrderId?: string | null; // If creating from purchase order
}

export function SellerSalesOrderFormPage({
  salesOrder,
  purchaseOrderId: initialPurchaseOrderId,
}: SalesOrderFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderIdFromQuery = searchParams.get("purchaseOrderId");
  const purchaseOrderId = initialPurchaseOrderId || purchaseOrderIdFromQuery;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [companyAddresses, setCompanyAddresses] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    salesOrder?.signatureUrl || null
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
    salesOrder?.items && salesOrder.items.length > 0
      ? salesOrder.items.map((item, idx) => ({
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
      : [
          {
            serialNumber: 1,
            productName: "",
            productDescription: "",
            sku: "",
            hsnCode: "",
            uom: "",
            quantity: 0,
            unitPrice: 0,
            subTotal: 0,
          },
        ]
  );

  const form = useForm<SOFormData>({
    resolver: zodResolver(soSchema),
    defaultValues: {
      soCreatedDate: salesOrder?.soCreatedDate
        ? new Date(salesOrder.soCreatedDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      plannedShipDate: salesOrder?.plannedShipDate
        ? new Date(salesOrder.plannedShipDate).toISOString().split("T")[0]
        : "",
      currency: salesOrder?.currency || "USD",
      sellerCompanyName: salesOrder?.sellerCompanyName || "",
      sellerContactName: salesOrder?.sellerContactName || "",
      sellerEmail: salesOrder?.sellerEmail || "",
      sellerPhone: salesOrder?.sellerPhone || "",
      sellerAddressType: salesOrder?.sellerAddressType || undefined,
      sellerCountry: salesOrder?.sellerCountry || "",
      sellerState: salesOrder?.sellerState || "",
      sellerCity: salesOrder?.sellerCity || "",
      sellerAddress: salesOrder?.sellerAddress || "",
      buyerCompanyName: salesOrder?.buyerCompanyName || "",
      buyerContactName: salesOrder?.buyerContactName || "",
      buyerEmail: salesOrder?.buyerEmail || "",
      buyerPhone: salesOrder?.buyerPhone || "",
      buyerAddressType: salesOrder?.buyerAddressType || undefined,
      buyerCountry: salesOrder?.buyerCountry || "",
      buyerState: salesOrder?.buyerState || "",
      buyerCity: salesOrder?.buyerCity || "",
      buyerAddress: salesOrder?.buyerAddress || "",
      deliveryAddressType: salesOrder?.deliveryAddressType || undefined,
      deliveryCountry: salesOrder?.deliveryCountry || "",
      deliveryState: salesOrder?.deliveryState || "",
      deliveryCity: salesOrder?.deliveryCity || "",
      deliveryAddress: salesOrder?.deliveryAddress || "",
      discountPercentage: salesOrder?.discountPercentage?.toString() || "",
      additionalCharges: salesOrder?.additionalCharges?.toString() || "",
      taxPercentage: salesOrder?.taxPercentage?.toString() || "",
      paymentTerms: salesOrder?.paymentTerms || "",
      deliveryTerms: salesOrder?.deliveryTerms || "",
      notes: salesOrder?.notes || "",
      signatureByName: salesOrder?.signatureByName || "",
    },
  });

  // Watch form values for totals calculation
  const discountPercentage = form.watch("discountPercentage");
  const additionalCharges = form.watch("additionalCharges");
  const taxPercentage = form.watch("taxPercentage");

  // Calculate totals
  const totals = useMemo(() => {
    const subTotal = items.reduce((sum, item) => sum + (item.subTotal || 0), 0);
    const discountPercent = parseFloat(discountPercentage || "0");
    const discount = (subTotal * discountPercent) / 100;
    const afterDiscount = subTotal - discount;
    const additional = parseFloat(additionalCharges || "0");
    const taxPercent = parseFloat(taxPercentage || "0");
    const tax = (afterDiscount * taxPercent) / 100;
    const total = afterDiscount + additional + tax;

    return {
      subTotal,
      discount,
      afterDiscount,
      additionalCharges: additional,
      tax,
      total,
    };
  }, [items, discountPercentage, additionalCharges, taxPercentage]);

  // Fetch company data and buyers
  useEffect(() => {
    fetch("/api/company/me")
      .then((res) => res.json())
      .then((data) => {
        setCompany(data);
        setCompanyAddresses(data.addresses || []);
      })
      .catch(console.error);

    // Fetch buyers for selection
    fetch("/api/seller/buyers")
      .then((res) => res.json())
      .then((data) => setBuyers(data))
      .catch(console.error);

    // Fetch Purchase Order if purchaseOrderId is provided
    if (purchaseOrderId && !salesOrder) {
      fetch(`/api/seller/purchase-orders/${purchaseOrderId}`)
        .then((res) => res.json())
        .then((data) => {
          setPurchaseOrder(data);
          // Pre-fill buyer details from PO
          if (data) {
            // Set selectedBuyerId if PO has buyerCompanyId
            if (data.buyerCompanyId) {
              setSelectedBuyerId(data.buyerCompanyId);
            }

            form.setValue("buyerCompanyName", data.buyerCompanyName || "");
            form.setValue("buyerContactName", data.buyerContactName || "");
            form.setValue("buyerEmail", data.buyerEmail || "");
            form.setValue("buyerPhone", data.buyerPhone || "");
            form.setValue("buyerAddressType", data.buyerAddressType || undefined);
            form.setValue("buyerCountry", data.buyerCountry || "");
            form.setValue("buyerState", data.buyerState || "");
            form.setValue("buyerCity", data.buyerCity || "");
            form.setValue("buyerAddress", data.buyerAddress || "");
            form.setValue("deliveryAddressType", data.deliveryAddressType || undefined);
            form.setValue("deliveryCountry", data.deliveryCountry || "");
            form.setValue("deliveryState", data.deliveryState || "");
            form.setValue("deliveryCity", data.deliveryCity || "");
            form.setValue("deliveryAddress", data.deliveryAddress || "");
            form.setValue("currency", data.currency || "USD");
            form.setValue("discountPercentage", data.discountPercentage?.toString() || "");
            form.setValue("additionalCharges", data.additionalCharges?.toString() || "");
            form.setValue("taxPercentage", data.taxPercentage?.toString() || "");

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
                  unitPrice: Number(item.unitPrice) || 0,
                  subTotal: Number(item.subTotal) || 0,
                }))
              );
            }
          }
        })
        .catch(console.error);
    }
  }, [purchaseOrderId, salesOrder, form]);

  // Auto-fill seller details when company loads
  useEffect(() => {
    if (company && !salesOrder) {
      form.setValue("sellerCompanyName", company.name || "");
      form.setValue("sellerContactName", company.pocName || "");
      form.setValue("sellerEmail", company.email || "");
      form.setValue("sellerPhone", company.phone || "");
      form.setValue("sellerCountry", company.country || "");
      form.setValue("sellerState", company.state || "");
      form.setValue("sellerCity", company.city || "");
    }
  }, [company, form, salesOrder]);

  // Handle seller address type selection
  const handleSellerAddressTypeChange = (addressType: AddressType) => {
    form.setValue("sellerAddressType", addressType);
    const selectedAddress = companyAddresses.find((addr) => addr.type === addressType);
    if (selectedAddress) {
      const addressParts = [
        selectedAddress.line1,
        selectedAddress.line2,
        selectedAddress.postalCode,
      ].filter(Boolean);
      form.setValue("sellerAddress", addressParts.join(", "));
    }
  };

  // Handle buyer selection
  const handleBuyerSelect = (buyerId: string) => {
    setSelectedBuyerId(buyerId);
    const buyer = buyers.find((b) => b.id === buyerId);
    if (buyer) {
      form.setValue("buyerCompanyName", buyer.name || "");
      form.setValue("buyerContactName", buyer.contactName || "");
      form.setValue("buyerEmail", buyer.email || "");
      form.setValue("buyerPhone", buyer.phone || "");
      if (buyer.addresses && buyer.addresses.length > 0) {
        const firstAddress = buyer.addresses[0];
        form.setValue("buyerAddressType", firstAddress.type);
        const addressParts = [
          firstAddress.line1,
          firstAddress.line2,
          firstAddress.postalCode,
        ].filter(Boolean);
        form.setValue("buyerAddress", addressParts.join(", "));
      }
    }
  };

  // Handle delivery address type selection - auto-fill address (defaults to buyer address)
  const handleDeliveryAddressTypeChange = (addressType: AddressType) => {
    form.setValue("deliveryAddressType", addressType);
    const selectedAddress = companyAddresses.find((addr) => addr.type === addressType);
    if (selectedAddress) {
      const addressParts = [
        selectedAddress.line1,
        selectedAddress.line2,
        selectedAddress.postalCode,
      ].filter(Boolean);
      form.setValue("deliveryAddress", addressParts.join(", "));
      form.setValue("deliveryCountry", company?.country || "");
      form.setValue("deliveryState", company?.state || "");
      form.setValue("deliveryCity", company?.city || "");
    }
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

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Calculate subTotal if quantity or unitPrice changes
    if (field === "quantity" || field === "unitPrice") {
      const quantity = parseFloat(newItems[index].quantity.toString()) || 0;
      const unitPrice = parseFloat(newItems[index].unitPrice.toString()) || 0;
      newItems[index].subTotal = quantity * unitPrice;
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

  const handleSubmit = async (data: SOFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate products
      const validProducts = items.filter((item) => item.productName.trim() !== "");
      if (validProducts.length === 0) {
        setError("At least one product is required");
        setIsSubmitting(false);
        return;
      }

      // Validate product fields
      for (const item of validProducts) {
        if (!item.uom || item.uom.trim() === "") {
          setError("UoM (Unit of Measure) is required for all products");
          setIsSubmitting(false);
          return;
        }
        if (!item.quantity || item.quantity <= 0) {
          setError("Quantity must be greater than 0 for all products");
          setIsSubmitting(false);
          return;
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          setError("Unit price must be greater than 0 for all products");
          setIsSubmitting(false);
          return;
        }
      }

      // Upload signature if a new file was selected
      let signatureUrl = salesOrder?.signatureUrl || null;
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

      const method = salesOrder ? "PUT" : "POST";
      const url = salesOrder
        ? `/api/seller/sales-orders/${salesOrder.id}`
        : "/api/seller/sales-orders";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          purchaseOrderId: purchaseOrderId || null,
          signatureUrl,
          items: validProducts,
          totalAmount: totals.total,
          selectedBuyerId: selectedBuyerId || null,
        }),
      });

      const responseData = await response.json().catch(() => ({ error: "Unknown error" }));

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            `Failed to ${salesOrder ? "update" : "create"} sales order`
        );
      }

      alert(`Sales order ${salesOrder ? "updated" : "created"} successfully!`);
      router.push("/seller/sales-orders");
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
          onClick={() => router.push("/seller/sales-orders")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {salesOrder ? "Edit Sales Order" : "Create New Sales Order"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {salesOrder
              ? "Update sales order details"
              : purchaseOrderId
                ? "Create sales order from purchase order"
                : "Fill in the details to create a new sales order"}
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
                  <FormLabel>SO ID</FormLabel>
                  <Input
                    value={salesOrder?.soId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <FormLabel>PO ID</FormLabel>
                  <Input
                    value={
                      purchaseOrder?.poId ||
                      salesOrder?.purchaseOrder?.poId ||
                      (purchaseOrderId ? "Auto-Generated" : "-")
                    }
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <FormField
                  control={form.control}
                  name="soCreatedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SO Created Date *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => {
                            field.onChange(date ? date.toISOString().split("T")[0] : "");
                          }}
                          placeholder="Select Date"
                          maxDate={new Date()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.code} - {currency.name}
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
                  name="deliveryAddressType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleDeliveryAddressTypeChange(value as AddressType);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Delivery Address" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companyAddresses.length > 0 ? (
                            companyAddresses.map((addr) => (
                              <SelectItem key={addr.id} value={addr.type}>
                                {addr.type} - {addr.line1}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No addresses in address book
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>Address</FormLabel>
                  <Input
                    value={form.watch("deliveryAddress") || ""}
                    disabled
                    readOnly
                    className="bg-muted"
                    placeholder="Delivery Address is autofilled"
                  />
                </div>
                <FormField
                  control={form.control}
                  name="plannedShipDate"
                  render={({ field }) => {
                    const createdDate = form.watch("soCreatedDate");
                    const minDate = createdDate
                      ? new Date(createdDate)
                      : new Date();

                    return (
                      <FormItem>
                        <FormLabel>Planned Ship Date *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => {
                              field.onChange(date ? date.toISOString().split("T")[0] : "");
                            }}
                            placeholder="Select Date"
                            minDate={minDate}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                      <FormLabel>Seller Contact Name</FormLabel>
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
                      <FormLabel>Seller Email</FormLabel>
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
                      <FormLabel>Seller Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellerAddressType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller Address Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleSellerAddressTypeChange(value as AddressType);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Address Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companyAddresses.length > 0 ? (
                            companyAddresses.map((addr) => (
                              <SelectItem key={addr.id} value={addr.type}>
                                {addr.type} - {addr.line1}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No addresses in address book
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>Seller Address</FormLabel>
                  <Input
                    value={form.watch("sellerAddress") || ""}
                    placeholder="Auto Fill by Address Type"
                    onChange={(e) => form.setValue("sellerAddress", e.target.value)}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="sellerCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller Country</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
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
                  name="sellerState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller State</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select State" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CA">California</SelectItem>
                          <SelectItem value="NY">New York</SelectItem>
                          <SelectItem value="TX">Texas</SelectItem>
                          <SelectItem value="FL">Florida</SelectItem>
                          <SelectItem value="KA">Karnataka</SelectItem>
                          <SelectItem value="MH">Maharashtra</SelectItem>
                          <SelectItem value="TN">Tamil Nadu</SelectItem>
                          <SelectItem value="TS">Telangana</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellerCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller City</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select City" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="New York">New York</SelectItem>
                          <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                          <SelectItem value="Chicago">Chicago</SelectItem>
                          <SelectItem value="Mumbai">Mumbai</SelectItem>
                          <SelectItem value="Delhi">Delhi</SelectItem>
                          <SelectItem value="Bangalore">Bangalore</SelectItem>
                          <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                          <SelectItem value="Chennai">Chennai</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Buyer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Buyer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!purchaseOrderId && (
                <div>
                  <FormLabel>Select Buyer</FormLabel>
                  <Select
                    onValueChange={handleBuyerSelect}
                    value={selectedBuyerId || ""}
                    disabled={!!purchaseOrderId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {buyers.map((buyer) => (
                        <SelectItem key={buyer.id} value={buyer.id}>
                          {buyer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                      <FormLabel>Buyer Contact Name</FormLabel>
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
                      <FormLabel>Buyer Email</FormLabel>
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
                      <FormLabel>Buyer Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyerAddressType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer Address Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Address Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(AddressType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>Buyer Address</FormLabel>
                  <Input
                    value={form.watch("buyerAddress") || ""}
                    placeholder="Auto Fill by Address Type"
                    onChange={(e) => form.setValue("buyerAddress", e.target.value)}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="buyerCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer Country</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
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
                  name="buyerState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer State</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select State" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CA">California</SelectItem>
                          <SelectItem value="NY">New York</SelectItem>
                          <SelectItem value="TX">Texas</SelectItem>
                          <SelectItem value="FL">Florida</SelectItem>
                          <SelectItem value="KA">Karnataka</SelectItem>
                          <SelectItem value="MH">Maharashtra</SelectItem>
                          <SelectItem value="TN">Tamil Nadu</SelectItem>
                          <SelectItem value="TS">Telangana</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyerCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer City</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select City" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="New York">New York</SelectItem>
                          <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                          <SelectItem value="Chicago">Chicago</SelectItem>
                          <SelectItem value="Mumbai">Mumbai</SelectItem>
                          <SelectItem value="Delhi">Delhi</SelectItem>
                          <SelectItem value="Bangalore">Bangalore</SelectItem>
                          <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                          <SelectItem value="Chennai">Chennai</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <TableHead>UoM *</TableHead>
                      <TableHead>Quantity *</TableHead>
                      <TableHead>Unit Price *</TableHead>
                      <TableHead>Sub Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
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
                            value={item.quantity || ""}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="w-20"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0.00"
                            className="w-24"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
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
                            disabled={items.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
                    Add Row
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Percentage</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Eg: 10%"
                          min="0"
                          max="100"
                          step="0.01"
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
                      <FormLabel>Additional Charges</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Input"
                          min="0"
                          step="0.01"
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
                      <FormLabel>Tax Percentage</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Eg: 10%"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>Total Amount</FormLabel>
                  <Input
                    value={totals.total.toFixed(2)}
                    disabled
                    readOnly
                    className="bg-muted"
                    placeholder="Auto-Populate"
                  />
                </div>
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
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
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
              <FormField
                control={form.control}
                name="deliveryTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Terms</FormLabel>
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
              onClick={() => router.push("/seller/sales-orders")}
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
                ? salesOrder
                  ? "Updating..."
                  : "Creating..."
                : salesOrder
                  ? "Update Sales Order"
                  : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

