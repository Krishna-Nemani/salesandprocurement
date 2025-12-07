"use client";

import { useRouter } from "next/navigation";
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
import { RFQ, RFQItem, AddressType } from "@prisma/client";
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

// Countries list (simplified - can be expanded)
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

const rfqSchema = z
  .object({
    dateIssued: z.string().min(1, "Date issued is required"),
    dueDate: z.string().min(1, "Due date is required"),
    currency: z.string().min(1, "Currency is required"),
    projectName: z.string().max(150, "Project name must be at most 150 characters").optional(),
    projectDescription: z.string().optional(),
    buyerCompanyName: z.string().min(1, "Buyer company name is required"),
    buyerContactName: z.string().min(1, "Buyer contact name is required"),
    buyerEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
    buyerPhone: z
      .string()
      .min(1, "Buyer phone is required")
      .refine((val) => {
        if (!val || val === "") return false;
        const cleaned = val.replace(/[\s()-]/g, "");
        return /^\+?[1-9]\d{1,14}$/.test(cleaned);
      }, {
        message: "Phone number must include country code (e.g., +1, +91)",
      }),
    buyerAddressType: z.nativeEnum(AddressType).optional(),
    buyerCountry: z.string().optional(),
    buyerState: z.string().optional(),
    buyerCity: z.string().optional(),
    buyerAddress: z.string().optional(),
    buyerPreferredCurrency: z.string().optional(),
    sellerCompanyName: z.string().optional(),
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
    technicalRequirements: z.string().optional(),
    deliveryRequirements: z.string().optional(),
    termsAndConditions: z.string().optional(),
    notes: z.string().optional(),
    signatureByName: z.string().optional(),
  })
  .refine((data) => {
    // Due date must be after issue date
    if (data.dateIssued && data.dueDate) {
      const issueDate = new Date(data.dateIssued);
      const dueDate = new Date(data.dueDate);
      return dueDate > issueDate;
    }
    return true;
  }, {
    message: "Due date must be after the issue date",
    path: ["dueDate"],
  })
  .refine((data) => {
    // Date issued cannot be future date
    if (data.dateIssued) {
      const issueDate = new Date(data.dateIssued);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return issueDate <= today;
    }
    return true;
  }, {
    message: "Date issued cannot be a future date",
    path: ["dateIssued"],
  });

type RFQFormData = z.infer<typeof rfqSchema>;

interface RFQFormPageProps {
  rfq?: RFQ & { items: RFQItem[] } | null;
}

export function RFQFormPage({ rfq }: RFQFormPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [companyAddresses, setCompanyAddresses] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(rfq?.signatureUrl || null);
  const [items, setItems] = useState<Array<{
    serialNumber: number;
    productName: string;
    productDescription?: string;
    sku?: string;
    hsnCode?: string;
    uom?: string;
    quantity: number;
  }>>(
    rfq?.items && rfq.items.length > 0
      ? rfq.items.map((item, idx) => ({
          serialNumber: idx + 1,
          productName: item.productName,
          productDescription: item.productDescription || "",
          sku: item.sku || "",
          hsnCode: item.hsnCode || "",
          uom: item.uom || "",
          quantity: Number(item.quantity),
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
          },
        ]
  );

  // Fetch company data for auto-fill
  useEffect(() => {
    fetch("/api/company/me")
      .then((res) => res.json())
      .then((data) => {
        setCompany(data);
        setCompanyAddresses(data.addresses || []);
      })
      .catch(console.error);

    // Fetch sellers for selection
    fetch("/api/buyer/sellers")
      .then((res) => res.json())
      .then((data) => setSellers(data))
      .catch(console.error);
  }, []);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const form = useForm<RFQFormData>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      dateIssued: rfq?.dateIssued
        ? new Date(rfq.dateIssued).toISOString().split("T")[0]
        : getTodayDate(),
      dueDate: rfq?.dueDate ? new Date(rfq.dueDate).toISOString().split("T")[0] : "",
      currency: rfq?.currency || "USD",
      projectName: rfq?.projectName || "",
      projectDescription: rfq?.projectDescription || "",
      buyerCompanyName: rfq?.buyerCompanyName || "",
      buyerContactName: rfq?.buyerContactName || "",
      buyerEmail: rfq?.buyerEmail || "",
      buyerPhone: rfq?.buyerPhone || "",
      buyerAddressType: rfq?.buyerAddressType || undefined,
      buyerCountry: rfq?.buyerCountry || "",
      buyerState: rfq?.buyerState || "",
      buyerCity: rfq?.buyerCity || "",
      buyerAddress: rfq?.buyerAddress || "",
      buyerPreferredCurrency: rfq?.buyerPreferredCurrency || "",
      sellerCompanyName: rfq?.sellerCompanyName || "",
      sellerContactName: rfq?.sellerContactName || "",
      sellerEmail: rfq?.sellerEmail || "",
      sellerPhone: rfq?.sellerPhone || "",
      sellerAddressType: rfq?.sellerAddressType || undefined,
      sellerCountry: rfq?.sellerCountry || "",
      sellerState: rfq?.sellerState || "",
      sellerCity: rfq?.sellerCity || "",
      sellerAddress: rfq?.sellerAddress || "",
      technicalRequirements: rfq?.technicalRequirements || "",
      deliveryRequirements: rfq?.deliveryRequirements || "",
      termsAndConditions: rfq?.termsAndConditions || "",
      notes: rfq?.notes || "",
      signatureByName: rfq?.signatureByName || "",
    },
  });

  // Auto-fill buyer details when company loads
  useEffect(() => {
    if (company && !rfq) {
      form.setValue("buyerCompanyName", company.name || "");
      form.setValue("buyerContactName", company.pocName || "");
      form.setValue("buyerEmail", company.email || "");
      form.setValue("buyerPhone", company.phone || "");
      form.setValue("buyerCountry", company.country || "");
      form.setValue("buyerState", company.state || "");
      form.setValue("buyerCity", company.city || "");
    }
  }, [company, form, rfq]);

  // Auto-fill preferred currency from RFQ currency
  useEffect(() => {
    const currency = form.watch("currency");
    if (currency && !form.getValues("buyerPreferredCurrency")) {
      form.setValue("buyerPreferredCurrency", currency);
    }
  }, [form.watch("currency")]);

  // Handle buyer address type selection - auto-fill address
  const handleBuyerAddressTypeChange = (addressType: AddressType) => {
    form.setValue("buyerAddressType", addressType);
    const selectedAddress = companyAddresses.find((addr) => addr.type === addressType);
    if (selectedAddress) {
      const addressParts = [
        selectedAddress.line1,
        selectedAddress.line2,
        selectedAddress.postalCode,
      ].filter(Boolean);
      form.setValue("buyerAddress", addressParts.join(", "));
    }
  };

  // Handle seller address type selection - auto-fill address (from seller's addresses if available)
  const handleSellerAddressTypeChange = (addressType: AddressType, sellerId?: string) => {
    form.setValue("sellerAddressType", addressType);
    if (sellerId) {
      const seller = sellers.find((s) => s.id === sellerId);
      if (seller && seller.addresses) {
        const selectedAddress = seller.addresses.find((addr: any) => addr.type === addressType);
        if (selectedAddress) {
          const addressParts = [
            selectedAddress.line1,
            selectedAddress.line2,
            selectedAddress.postalCode,
          ].filter(Boolean);
          form.setValue("sellerAddress", addressParts.join(", "));
        }
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
    setItems(newItems);
  };

  const handleSellerSelect = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    const seller = sellers.find((s) => s.id === sellerId);
    if (seller) {
      form.setValue("sellerCompanyName", seller.name || "");
      form.setValue("sellerContactName", seller.contactName || "");
      form.setValue("sellerEmail", seller.email || "");
      form.setValue("sellerPhone", seller.phone || "");
      // Auto-fill address if seller has addresses
      if (seller.addresses && seller.addresses.length > 0) {
        const firstAddress = seller.addresses[0];
        form.setValue("sellerAddressType", firstAddress.type);
        const addressParts = [
          firstAddress.line1,
          firstAddress.line2,
          firstAddress.postalCode,
        ].filter(Boolean);
        form.setValue("sellerAddress", addressParts.join(", "));
      }
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        setError("Signature must be a JPG or PNG file");
        return;
      }
      // Validate file size (2MB)
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

  const handleSubmit = async (data: RFQFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate products - minimum 1 product required
      const validProducts = items.filter((item) => item.productName.trim() !== "");
      if (validProducts.length === 0) {
        setError("At least one product is required");
        setIsSubmitting(false);
        return;
      }

      // Validate product mandatory fields
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
      }

      // Upload signature if a new file was selected
      let signatureUrl = rfq?.signatureUrl || null;
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

      const method = rfq ? "PUT" : "POST";
      const url = rfq ? `/api/buyer/rfqs/${rfq.id}` : "/api/buyer/rfqs";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          signatureUrl,
          items: validProducts,
        }),
      });

      const responseData = await response.json().catch(() => ({ error: "Unknown error" }));

      if (!response.ok) {
        throw new Error(
          responseData.error || `Failed to ${rfq ? "update" : "create"} RFQ`
        );
      }

      alert(`RFQ ${rfq ? "updated" : "created"} successfully!`);
      router.push("/buyer/rfqs");
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
        <Button variant="ghost" size="icon" onClick={() => router.push("/buyer/rfqs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {rfq ? "Edit RFQ" : "Create New RFQ"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {rfq ? "Update RFQ details" : "Fill in the details to create a new RFQ"}
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
                <FormField
                  control={form.control}
                  name="dateIssued"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Issued *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => {
                            field.onChange(date ? date.toISOString().split("T")[0] : "");
                          }}
                          placeholder="dd-mm-yyyy"
                          disabled={!!rfq}
                          maxDate={new Date()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => {
                    const dateIssued = form.watch("dateIssued");
                    const minDate = dateIssued
                      ? new Date(new Date(dateIssued).getTime() + 24 * 60 * 60 * 1000)
                      : new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
                    
                    return (
                      <FormItem>
                        <FormLabel>RFQ Due Date *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={(date) => {
                              field.onChange(date ? date.toISOString().split("T")[0] : "");
                            }}
                            placeholder="dd-mm-yyyy"
                            minDate={minDate}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                          {CURRENCIES.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.code} - {curr.symbol} ({curr.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>RFQ ID</FormLabel>
                  <Input
                    value={rfq?.rfqId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Input Text" maxLength={150} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {field.value?.length || 0}/150 characters
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Input text" rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Buyer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Buyer Details</CardTitle>
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
                        <Input {...field} placeholder="Input Text" />
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
                      <FormLabel>Buyer Contact Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input Text" />
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
                        <Input type="email" {...field} placeholder="Input Text" />
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
                      <FormLabel>Buyer Phone *</FormLabel>
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
                      <FormLabel>Address Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleBuyerAddressTypeChange(value as AddressType);
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
                      <FormLabel>Buyer State / Region</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input Text" />
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
                        <Input {...field} placeholder="Input Text" />
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

          {/* Seller Details */}
          <Card>
            <CardHeader>
              <CardTitle>Seller Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FormLabel>Select Seller</FormLabel>
                  <Select onValueChange={handleSellerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a seller from your seller list" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormField
                  control={form.control}
                  name="sellerCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input Text" />
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
                        <Input {...field} placeholder="Input Text" />
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
                        <Input type="email" {...field} placeholder="Input Text" />
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
                      <FormLabel>Seller State / Region</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Input Text" />
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
                        <Input {...field} placeholder="Input Text" />
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
                      <FormLabel>Seller Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Auto Fill by Address Type" />
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
                      <TableHead className="w-16">S.No</TableHead>
                      <TableHead>Product Name *</TableHead>
                      <TableHead>Product Description</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>UoM *</TableHead>
                      <TableHead>Quantity *</TableHead>
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

          {/* Miscellaneous */}
          <Card>
            <CardHeader>
              <CardTitle>Miscellaneous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="technicalRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technical Requirements</FormLabel>
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
                name="deliveryRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Requirements</FormLabel>
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
                    <FormLabel>Name of the user</FormLabel>
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
              onClick={() => router.push("/buyer/rfqs")}
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
