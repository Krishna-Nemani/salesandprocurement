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
import { Quotation, QuotationItem, AddressType } from "@prisma/client";
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

const quotationSchema = z
  .object({
    quoteDateIssued: z.string().min(1, "Quote date issued is required"),
    quoteValidityDate: z.string().min(1, "Quote validity date is required"),
    currency: z.string().min(1, "Currency is required"),
    sellerCompanyName: z.string().min(1, "Seller company name is required"),
    sellerContactName: z.string().min(1, "Seller contact name is required"),
    sellerEmail: z.string().email("Invalid email format").min(1, "Seller email is required"),
    sellerPhone: z
      .string()
      .min(1, "Seller phone is required")
      .refine((val) => {
        if (!val || val === "") return false;
        const cleaned = val.replace(/[\s()-]/g, "");
        return /^\+?[1-9]\d{1,14}$/.test(cleaned);
      }, {
        message: "Phone number must include country code (e.g., +1, +91)",
      }),
    sellerAddressType: z.nativeEnum(AddressType).optional(),
    sellerCountry: z.string().optional(),
    sellerState: z.string().optional(),
    sellerCity: z.string().optional(),
    sellerAddress: z.string().optional(),
    sellerPreferredCurrency: z.string().optional(),
    buyerCompanyName: z.string().min(1, "Buyer company name is required"),
    buyerContactName: z.string().optional(),
    buyerEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
    buyerPhone: z.string().optional(),
    buyerAddressType: z.nativeEnum(AddressType).optional(),
    buyerCountry: z.string().optional(),
    buyerState: z.string().optional(),
    buyerCity: z.string().optional(),
    buyerAddress: z.string().optional(),
    buyerPreferredCurrency: z.string().optional(),
    discountPercentage: z.string().optional(),
    additionalCharges: z.string().optional(),
    taxPercentage: z.string().optional(),
    paymentTerms: z.string().optional(),
    deliveryTerms: z.string().optional(),
    termsAndConditions: z.string().optional(),
    notes: z.string().optional(),
    signatureByName: z.string().optional(),
  })
  .refine((data) => {
    // Validity date must be after issue date
    if (data.quoteDateIssued && data.quoteValidityDate) {
      const issueDate = new Date(data.quoteDateIssued);
      const validityDate = new Date(data.quoteValidityDate);
      return validityDate > issueDate;
    }
    return true;
  }, {
    message: "Validity date must be after the issue date",
    path: ["quoteValidityDate"],
  });

type QuotationFormData = z.infer<typeof quotationSchema>;

interface QuotationFormPageProps {
  quotation?: Quotation & { items: QuotationItem[]; rfq?: { rfqId: string } | null } | null;
  rfqId?: string | null; // If creating from RFQ
}

export function QuotationFormPage({ quotation, rfqId: initialRfqId }: QuotationFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rfqIdFromQuery = searchParams.get("rfqId");
  const rfqId = initialRfqId || rfqIdFromQuery;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [companyAddresses, setCompanyAddresses] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [rfq, setRfq] = useState<any>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(quotation?.signatureUrl || null);
  const [items, setItems] = useState<Array<{
    serialNumber: number;
    productName: string;
    productDescription?: string;
    sku?: string;
    hsnCode?: string;
    uom?: string;
    quantity: number;
    unitPrice: number;
    subTotal: number;
  }>>(
    quotation?.items && quotation.items.length > 0
      ? quotation.items.map((item, idx) => ({
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

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      quoteDateIssued: quotation?.quoteDateIssued
        ? new Date(quotation.quoteDateIssued).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      quoteValidityDate: quotation?.quoteValidityDate
        ? new Date(quotation.quoteValidityDate).toISOString().split("T")[0]
        : "",
      currency: quotation?.currency || "USD",
      sellerCompanyName: quotation?.sellerCompanyName || "",
      sellerContactName: quotation?.sellerContactName || "",
      sellerEmail: quotation?.sellerEmail || "",
      sellerPhone: quotation?.sellerPhone || "",
      sellerAddressType: quotation?.sellerAddressType || undefined,
      sellerCountry: quotation?.sellerCountry || "",
      sellerState: quotation?.sellerState || "",
      sellerCity: quotation?.sellerCity || "",
      sellerAddress: quotation?.sellerAddress || "",
      sellerPreferredCurrency: quotation?.sellerPreferredCurrency || "",
      buyerCompanyName: quotation?.buyerCompanyName || "",
      buyerContactName: quotation?.buyerContactName || "",
      buyerEmail: quotation?.buyerEmail || "",
      buyerPhone: quotation?.buyerPhone || "",
      buyerAddressType: quotation?.buyerAddressType || undefined,
      buyerCountry: quotation?.buyerCountry || "",
      buyerState: quotation?.buyerState || "",
      buyerCity: quotation?.buyerCity || "",
      buyerAddress: quotation?.buyerAddress || "",
      buyerPreferredCurrency: quotation?.buyerPreferredCurrency || "",
      discountPercentage: quotation?.discountPercentage?.toString() || "",
      additionalCharges: quotation?.additionalCharges?.toString() || "",
      taxPercentage: quotation?.taxPercentage?.toString() || "",
      paymentTerms: quotation?.paymentTerms || "",
      deliveryTerms: quotation?.deliveryTerms || "",
      termsAndConditions: quotation?.termsAndConditions || "",
      notes: quotation?.notes || "",
      signatureByName: quotation?.signatureByName || "",
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

    // Fetch RFQ if rfqId is provided
    if (rfqId && !quotation) {
      fetch(`/api/seller/rfqs/${rfqId}`)
        .then((res) => res.json())
        .then((data) => {
          setRfq(data);
          // Pre-fill buyer details from RFQ
          if (data) {
            form.setValue("buyerCompanyName", data.buyerCompanyName || "");
            form.setValue("buyerContactName", data.buyerContactName || "");
            form.setValue("buyerEmail", data.buyerEmail || "");
            form.setValue("buyerPhone", data.buyerPhone || "");
            form.setValue("buyerAddressType", data.buyerAddressType || undefined);
            form.setValue("buyerCountry", data.buyerCountry || "");
            form.setValue("buyerState", data.buyerState || "");
            form.setValue("buyerCity", data.buyerCity || "");
            form.setValue("buyerAddress", data.buyerAddress || "");
            form.setValue("buyerPreferredCurrency", data.currency || "");
            form.setValue("currency", data.currency || "USD");
            
            // Pre-fill items from RFQ
            if (data.items && data.items.length > 0) {
              setItems(data.items.map((item: any, idx: number) => ({
                serialNumber: idx + 1,
                productName: item.productName || "",
                productDescription: item.productDescription || "",
                sku: item.sku || "",
                hsnCode: item.hsnCode || "",
                uom: item.uom || "",
                quantity: Number(item.quantity) || 0,
                unitPrice: 0,
                subTotal: 0,
              })));
            }
          }
        })
        .catch(console.error);
    }
  }, [rfqId]);

  // Auto-fill seller details when company loads
  useEffect(() => {
    if (company && !quotation) {
      form.setValue("sellerCompanyName", company.name || "");
      form.setValue("sellerContactName", company.pocName || "");
      form.setValue("sellerEmail", company.email || "");
      form.setValue("sellerPhone", company.phone || "");
      form.setValue("sellerCountry", company.country || "");
      form.setValue("sellerState", company.state || "");
      form.setValue("sellerCity", company.city || "");
    }
  }, [company, form, quotation]);

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

  const handleSubmit = async (data: QuotationFormData) => {
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
      let signatureUrl = quotation?.signatureUrl || null;
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

      const method = quotation ? "PUT" : "POST";
      const url = quotation ? `/api/seller/quotations/${quotation.id}` : "/api/seller/quotations";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          rfqId: rfqId || null,
          signatureUrl,
          items: validProducts,
          totalAmount: totals.total,
          selectedBuyerId: selectedBuyerId || null,
        }),
      });

      const responseData = await response.json().catch(() => ({ error: "Unknown error" }));

      if (!response.ok) {
        throw new Error(
          responseData.error || `Failed to ${quotation ? "update" : "create"} quotation`
        );
      }

      alert(`Quotation ${quotation ? "updated" : "created"} successfully!`);
      router.push("/seller/quotations");
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
        <Button variant="ghost" size="icon" onClick={() => router.push("/seller/quotations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {quotation ? "Edit Quotation" : "Create New Quotation"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {quotation ? "Update quotation details" : rfqId ? "Create quotation from RFQ" : "Fill in the details to create a new quotation"}
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
                  <FormLabel>Quote ID</FormLabel>
                  <Input
                    value={quotation?.quoteId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <FormLabel>RFQ Reference No</FormLabel>
                  <Input
                    value={rfq?.rfqId || quotation?.rfq?.rfqId || (rfqId ? "Auto-Generated" : "-")}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <FormField
                  control={form.control}
                  name="quoteDateIssued"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote Date Issued *</FormLabel>
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
                  name="quoteValidityDate"
                  render={({ field }) => {
                    const issueDate = form.watch("quoteDateIssued");
                    const minDate = issueDate
                      ? new Date(new Date(issueDate).getTime() + 24 * 60 * 60 * 1000)
                      : new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
                    
                    return (
                      <FormItem>
                        <FormLabel>Quote Validity Date *</FormLabel>
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
                      <FormLabel>Seller Contact Name *</FormLabel>
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
                      <FormLabel>Seller Email *</FormLabel>
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
                      <FormLabel>Seller Phone *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+1234567890" />
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
                <FormField
                  control={form.control}
                  name="sellerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Auto Fill by Address Type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sellerPreferredCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller Preferred Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.code} - {curr.symbol}
                            </SelectItem>
                          ))}
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
              {!rfqId && (
                <div className="md:col-span-2">
                  <FormLabel>Select Buyer</FormLabel>
                  <Select onValueChange={handleBuyerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a buyer from your buyer list" />
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
                        <Input {...field} placeholder="+1234567890" />
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
                          <SelectItem value="COMPANY">Company</SelectItem>
                          <SelectItem value="HEADQUARTERS">Headquarters</SelectItem>
                          <SelectItem value="BILLING">Billing</SelectItem>
                          <SelectItem value="SHIPPING">Shipping</SelectItem>
                          <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Auto Fill by Address Type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
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
                      <FormControl>
                        <Input {...field} placeholder="Input text" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buyerPreferredCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer Preferred Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.code} - {curr.symbol}
                            </SelectItem>
                          ))}
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
                      <TableHead className="w-16">S.No</TableHead>
                      <TableHead>Product Name *</TableHead>
                      <TableHead>Product Description</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>UoM *</TableHead>
                      <TableHead>Quantity *</TableHead>
                      <TableHead>Unit Price *</TableHead>
                      <TableHead>Sub Total</TableHead>
                      <TableHead className="w-16"></TableHead>
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
                            className="w-full"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.productDescription}
                            onChange={(e) =>
                              handleItemChange(index, "productDescription", e.target.value)
                            }
                            placeholder="Content"
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.sku}
                            onChange={(e) =>
                              handleItemChange(index, "sku", e.target.value)
                            }
                            placeholder="Content"
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.hsnCode}
                            onChange={(e) =>
                              handleItemChange(index, "hsnCode", e.target.value)
                            }
                            placeholder="Content"
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.uom}
                            onChange={(e) =>
                              handleItemChange(index, "uom", e.target.value)
                            }
                            placeholder="Content"
                            className="w-full"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="w-full"
                            min="0"
                            step="0.01"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="w-full"
                            min="0"
                            step="0.01"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.subTotal.toFixed(2)}
                            disabled
                            readOnly
                            className="w-full bg-muted"
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
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddRow}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
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
                          placeholder="Eg: 10 %"
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
                          placeholder="Eg: 10 %"
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
                        rows={4}
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
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="termsAndConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms and Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Input Text Box (Word Formatting Tool)"
                        rows={4}
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
                        rows={4}
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
              <CardTitle>Signature By</CardTitle>
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
                    className="hidden"
                    id="signature-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("signature-upload")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Your Digital Sign
                  </Button>
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/seller/quotations")}
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

