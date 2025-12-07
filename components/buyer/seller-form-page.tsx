"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PartyForm } from "@/components/shared/party-form";
import { BuyerSeller } from "@prisma/client";
import { ArrowLeft } from "lucide-react";

interface SellerFormPageProps {
  seller?: BuyerSeller | null;
}

export function SellerFormPage({ seller }: SellerFormPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const method = seller ? "PUT" : "POST";
      const url = seller
        ? `/api/buyer/sellers/${seller.id}`
        : "/api/buyer/sellers";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json().catch(() => ({ error: "Unknown error" }));

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            `Failed to ${seller ? "update" : "create"} seller`
        );
      }

      // Success - show success message and redirect
      if (seller) {
        // Updated existing seller
        alert("Seller updated successfully!");
        router.push("/buyer/sellers");
        router.refresh();
      } else {
        // Created new seller
        alert("Seller created successfully!");
        router.push("/buyer/sellers");
        router.refresh();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/buyer/sellers");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {seller ? "Edit Seller" : "Add New Seller"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {seller
              ? "Update seller information and contact details"
              : "Create a new seller and add their contact information"}
          </p>
        </div>
      </div>

      <div className="max-w-4xl">
        <PartyForm
          party={seller}
          partyType="buyerSeller"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel={seller ? "Update Seller" : "Create Seller"}
        />
      </div>
    </div>
  );
}

