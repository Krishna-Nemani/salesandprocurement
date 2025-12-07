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
import { Contract, ContractItem, AddressType } from "@prisma/client";
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

const contractSchema = z
  .object({
    effectiveDate: z.string().min(1, "Effective date is required"),
    endDate: z.string().min(1, "End date is required"),
    currency: z.string().min(1, "Currency is required"),
    agreedTotalValue: z.string().optional(),
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
    buyerCompanyName: z.string().min(1, "Buyer company name is required"),
    buyerContactName: z.string().optional(),
    buyerEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
    buyerPhone: z.string().optional(),
    buyerAddressType: z.nativeEnum(AddressType).optional(),
    buyerCountry: z.string().optional(),
    buyerState: z.string().optional(),
    buyerCity: z.string().optional(),
    buyerAddress: z.string().optional(),
    pricingTerms: z.string().optional(),
    paymentTerms: z.string().optional(),
    deliveryTerms: z.string().optional(),
    confidentiality: z.string().optional(),
    indemnity: z.string().optional(),
    terminationConditions: z.string().optional(),
    disputeResolution: z.string().optional(),
    governingLaw: z.string().optional(),
    signatureByName: z.string().optional(),
  })
  .refine((data) => {
    // End date must be after effective date
    if (data.effectiveDate && data.endDate) {
      const effDate = new Date(data.effectiveDate);
      const endDate = new Date(data.endDate);
      return endDate > effDate;
    }
    return true;
  }, {
    message: "End date must be after the effective date",
    path: ["endDate"],
  });

type ContractFormData = z.infer<typeof contractSchema>;

interface ContractFormPageProps {
  contract?: Contract & { items: ContractItem[]; quotation?: { quoteId: string } | null; rfq?: { rfqId: string } | null } | null;
  quotationId?: string | null; // If creating from quotation
}

export function ContractFormPage({ contract, quotationId: initialQuotationId }: ContractFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationIdFromQuery = searchParams.get("quotationId");
  const quotationId = initialQuotationId || quotationIdFromQuery;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [companyAddresses, setCompanyAddresses] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [quotation, setQuotation] = useState<any>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(contract?.signatureUrl || null);
  const [items, setItems] = useState<Array<{
    serialNumber: number;
    productName: string;
    productDescription?: string;
    sku?: string;
    hsnCode?: string;
    uom?: string;
    quantity: number;
    unitPrice: number;
  }>>(
    contract?.items && contract.items.length > 0
      ? contract.items.map((item, idx) => ({
          serialNumber: idx + 1,
          productName: item.productName,
          productDescription: item.productDescription || "",
          sku: item.sku || "",
          hsnCode: item.hsnCode || "",
          uom: item.uom || "",
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
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
          },
        ]
  );

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      effectiveDate: contract?.effectiveDate
        ? new Date(contract.effectiveDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      endDate: contract?.endDate
        ? new Date(contract.endDate).toISOString().split("T")[0]
        : "",
      currency: contract?.currency || "USD",
      agreedTotalValue: contract?.agreedTotalValue?.toString() || "",
      sellerCompanyName: contract?.sellerCompanyName || "",
      sellerContactName: contract?.sellerContactName || "",
      sellerEmail: contract?.sellerEmail || "",
      sellerPhone: contract?.sellerPhone || "",
      sellerAddressType: contract?.sellerAddressType || undefined,
      sellerCountry: contract?.sellerCountry || "",
      sellerState: contract?.sellerState || "",
      sellerCity: contract?.sellerCity || "",
      sellerAddress: contract?.sellerAddress || "",
      buyerCompanyName: contract?.buyerCompanyName || "",
      buyerContactName: contract?.buyerContactName || "",
      buyerEmail: contract?.buyerEmail || "",
      buyerPhone: contract?.buyerPhone || "",
      buyerAddressType: contract?.buyerAddressType || undefined,
      buyerCountry: contract?.buyerCountry || "",
      buyerState: contract?.buyerState || "",
      buyerCity: contract?.buyerCity || "",
      buyerAddress: contract?.buyerAddress || "",
      pricingTerms: contract?.pricingTerms || "",
      paymentTerms: contract?.paymentTerms || "",
      deliveryTerms: contract?.deliveryTerms || "",
      confidentiality: contract?.confidentiality || "",
      indemnity: contract?.indemnity || "",
      terminationConditions: contract?.terminationConditions || "",
      disputeResolution: contract?.disputeResolution || "",
      governingLaw: contract?.governingLaw || "",
      signatureByName: contract?.signatureByName || "",
    },
  });

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

    // Fetch Quotation if quotationId is provided
    if (quotationId && !contract) {
      fetch(`/api/seller/quotations/${quotationId}`)
        .then((res) => res.json())
        .then((data) => {
          setQuotation(data);
          // Pre-fill buyer details from Quotation
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
            form.setValue("currency", data.currency || "USD");
            
            // Pre-fill items from Quotation
            if (data.items && data.items.length > 0) {
              setItems(data.items.map((item: any, idx: number) => ({
                serialNumber: idx + 1,
                productName: item.productName || "",
                productDescription: item.productDescription || "",
                sku: item.sku || "",
                hsnCode: item.hsnCode || "",
                uom: item.uom || "",
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
              })));
            }
          }
        })
        .catch(console.error);
    }
  }, [quotationId]);

  // Auto-fill seller details when company loads
  useEffect(() => {
    if (company && !contract) {
      form.setValue("sellerCompanyName", company.name || "");
      form.setValue("sellerContactName", company.pocName || "");
      form.setValue("sellerEmail", company.email || "");
      form.setValue("sellerPhone", company.phone || "");
      form.setValue("sellerCountry", company.country || "");
      form.setValue("sellerState", company.state || "");
      form.setValue("sellerCity", company.city || "");
    }
  }, [company, form, contract]);

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

  const handleSubmit = async (data: ContractFormData) => {
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
        if (!item.unitPrice || item.unitPrice <= 0) {
          setError("Unit price must be greater than 0 for all products");
          setIsSubmitting(false);
          return;
        }
      }

      // Upload signature if a new file was selected
      let signatureUrl = contract?.signatureUrl || null;
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

      const method = contract ? "PUT" : "POST";
      const url = contract ? `/api/seller/contracts/${contract.id}` : "/api/seller/contracts";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          quotationId: quotationId || null,
          signatureUrl,
          items: validProducts,
          selectedBuyerId: selectedBuyerId || null,
        }),
      });

      const responseData = await response.json().catch(() => ({ error: "Unknown error" }));

      if (!response.ok) {
        throw new Error(
          responseData.error || `Failed to ${contract ? "update" : "create"} contract`
        );
      }

      alert(`Contract ${contract ? "updated" : "created"} successfully!`);
      router.push("/seller/contracts");
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
        <Button variant="ghost" size="icon" onClick={() => router.push("/seller/contracts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {contract ? "Edit Contract" : "Create New Contract"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {contract ? "Update contract details" : quotationId ? "Create contract from quotation" : "Fill in the details to create a new contract"}
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
                  <FormLabel>Contract ID</FormLabel>
                  <Input
                    value={contract?.contractId || "Auto-Generated"}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <FormLabel>Quote Ref ID</FormLabel>
                  <Input
                    value={quotation?.quoteId || contract?.quotation?.quoteId || (quotationId ? "Auto-Generated" : "-")}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <FormLabel>RFQ Ref ID</FormLabel>
                  <Input
                    value={quotation?.rfq?.rfqId || contract?.rfq?.rfqId || (quotation?.rfqId ? "Auto-Generated" : "-")}
                    disabled
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <FormField
                  control={form.control}
                  name="effectiveDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date *</FormLabel>
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
                  name="endDate"
                  render={({ field }) => {
                    const effDate = form.watch("effectiveDate");
                    const minDate = effDate
                      ? new Date(new Date(effDate).getTime() + 24 * 60 * 60 * 1000)
                      : new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
                    
                    return (
                      <FormItem>
                        <FormLabel>End Date *</FormLabel>
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
              </div>
            </CardContent>
          </Card>

          {/* Buyer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Buyer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!quotationId && (
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
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price *</TableHead>
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

          {/* Valuation */}
          <Card>
            <CardHeader>
              <CardTitle>Valuation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="agreedTotalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agreed Total Contract Value</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Input Integer"
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
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agreed Currency *</FormLabel>
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
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="pricingTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Terms</FormLabel>
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
                name="confidentiality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidentiality</FormLabel>
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
                name="indemnity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indemnity</FormLabel>
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
                name="terminationConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termination Conditions</FormLabel>
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
                name="disputeResolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dispute Resolution</FormLabel>
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
                name="governingLaw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Governing Law</FormLabel>
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
              onClick={() => router.push("/seller/contracts")}
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

