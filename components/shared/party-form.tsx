"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PartyStatus } from "@prisma/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PartyAddressBook } from "@/components/shared/party-address-book";

const partySchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional().or(z.literal("")),
  email: z.union([
    z.string().email("Invalid email format"),
    z.literal(""),
  ]).optional(),
  phone: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val || val === "") return true; // Optional field
      if (val.length < 6) {
        return false;
      }
      return true;
    }, {
      message: "Phone number must be at least 6 characters",
    })
    .refine((val) => {
      if (!val || val === "") return true; // Optional field
      if (val.length > 16) {
        return false;
      }
      return true;
    }, {
      message: "Phone number must be at most 16 characters",
    })
    .refine((val) => {
      if (!val || val === "") return true; // Optional field
      return !/[a-zA-Z]/.test(val);
    }, {
      message: "Phone number can only contain numbers and special characters (+, -, spaces, parentheses)",
    })
    .refine((val) => {
      if (!val || val === "") return true; // Optional field
      const cleaned = val.replace(/[\s()-]/g, "");
      return /^\+?[1-9]\d{1,14}$/.test(cleaned);
    }, {
      message: "Phone number must include country code (e.g., +1, +91)",
    }),
  status: z.nativeEnum(PartyStatus),
  notes: z.string().optional().or(z.literal("")),
});

type PartyFormData = z.infer<typeof partySchema>;

interface PartyFormProps {
  party?: {
    id?: string;
    name?: string | null;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: PartyStatus;
    notes?: string | null;
    addresses?: Array<{
      id: string;
      type: string;
      line1: string;
      line2?: string | null;
      postalCode: string;
    }>;
  } | null;
  partyType?: "sellerBuyer" | "buyerSeller";
  onSubmit: (data: PartyFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  title?: string;
}

export function PartyForm({
  party,
  partyType,
  onSubmit,
  onCancel,
  submitLabel,
  title,
}: PartyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAddresses, setPendingAddresses] = useState<Omit<PartyAddress, 'id' | 'createdAt' | 'updatedAt' | 'sellerBuyerId' | 'buyerSellerId'>[]>([]);

  const form = useForm<PartyFormData>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      name: party?.name || "",
      contactName: party?.contactName || "",
      email: party?.email || "",
      phone: party?.phone || "",
      status: party?.status || PartyStatus.ACTIVE,
      notes: party?.notes || "",
    },
  });

  useEffect(() => {
    if (party) {
      form.reset({
        name: party.name || "",
        contactName: party.contactName || "",
        email: party.email || "",
        phone: party.phone || "",
        status: party.status || PartyStatus.ACTIVE,
        notes: party.notes || "",
      });
    } else {
      form.reset({
        name: "",
        contactName: "",
        email: "",
        phone: "",
        status: PartyStatus.ACTIVE,
        notes: "",
      });
    }
  }, [party, form]);

  const handleSubmit = async (data: PartyFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Include pending addresses when creating
      const submitData = {
        ...data,
        addresses: pendingAddresses,
      };
      await onSubmit(submitData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Form submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {title && (
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
        )}
        
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter company name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contact Name */}
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter contact name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} placeholder="contact@company.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+1234567890" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={PartyStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={PartyStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={PartyStatus.INACTIVE}>Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Address Book */}
        {partyType && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Address Book</h3>
            {party?.id ? (
              <PartyAddressBook
                partyId={party.id}
                partyType={partyType}
                initialAddresses={party.addresses || []}
                isEditMode={true}
              />
            ) : (
              <PartyAddressBook
                partyId=""
                partyType={partyType}
                initialAddresses={[]}
                isEditMode={true}
                isCreating={true}
                onAddressesChange={setPendingAddresses}
              />
            )}
          </div>
        )}

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Internal notes..."
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? party
                ? "Updating..."
                : "Creating..."
              : submitLabel || (party ? "Update" : "Create")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
