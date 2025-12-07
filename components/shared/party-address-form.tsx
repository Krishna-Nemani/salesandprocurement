"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PartyAddress, AddressType } from "@prisma/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const addressSchema = z.object({
  type: z.enum(["COMPANY", "HEADQUARTERS", "BILLING", "SHIPPING", "WAREHOUSE", "OTHER"]),
  line1: z.string().min(1, "Address Line 1 is required"),
  line2: z.string().optional(),
  postalCode: z.string().min(1, "Postal Code is required"),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface PartyAddressFormProps {
  address?: PartyAddress | null;
  partyId: string;
  partyType: "sellerBuyer" | "buyerSeller";
  onSuccess: (addressData?: Omit<PartyAddress, 'id' | 'createdAt' | 'updatedAt' | 'sellerBuyerId' | 'buyerSellerId'>) => void;
  onCancel?: () => void;
  isCreating?: boolean;
}

export function PartyAddressForm({ address, partyId, partyType, onSuccess, onCancel, isCreating = false }: PartyAddressFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? {
          type: address.type,
          line1: address.line1,
          line2: address.line2 || "",
          postalCode: address.postalCode,
        }
      : {
          type: "COMPANY",
          line1: "",
          line2: "",
          postalCode: "",
        },
  });

  const onSubmit = async (data: AddressFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // If creating and no partyId, just return the address data
      if (isCreating && (!partyId || partyId === "")) {
        const addressData = {
          type: data.type as any,
          line1: data.line1,
          line2: data.line2 || null,
          postalCode: data.postalCode,
        };
        onSuccess(addressData);
        setIsSubmitting(false);
        return;
      }

      // Check if partyId is empty (should not happen in edit mode)
      if (!partyId || partyId === "") {
        setError("Please save the party first before adding addresses.");
        setIsSubmitting(false);
        return;
      }

      const url = address
        ? `/api/party/addresses/${address.id}`
        : "/api/party/addresses";
      const method = address ? "PUT" : "POST";

      const requestBody: any = {
        ...data,
      };

      if (partyType === "sellerBuyer") {
        requestBody.sellerBuyerId = partyId;
      } else {
        requestBody.buyerSellerId = partyId;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save address");
      }

      // Get the created/updated address from response
      const savedAddress = await response.json();
      
      // Small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const formData = form.getValues();
      await onSubmit(formData);
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            const form = e.target.closest('form');
            if (form) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }}
        className="space-y-4"
        noValidate
      >
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Type *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select address type" />
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
          name="line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 1 *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Street / Building" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 2 (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Suite / Floor" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postal Code *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Postal code" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="button" 
            disabled={isSubmitting}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFormSubmit();
            }}
          >
            {isSubmitting
              ? "Saving..."
              : address
              ? "Update Address"
              : "Add Address"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

