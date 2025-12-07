"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PartyForm } from "@/components/shared/party-form";
import { SellerBuyer } from "@prisma/client";
import { ArrowLeft } from "lucide-react";

interface BuyerFormPageProps {
  buyer?: SellerBuyer | null;
}

export function BuyerFormPage({ buyer }: BuyerFormPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const method = buyer ? "PUT" : "POST";
      const url = buyer
        ? `/api/seller/buyers/${buyer.id}`
        : "/api/seller/buyers";

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
            `Failed to ${buyer ? "update" : "create"} buyer`
        );
      }

      // Success - show success message and redirect
      if (buyer) {
        // Updated existing buyer
        alert("Buyer updated successfully!");
        router.push("/seller/buyers");
        router.refresh();
      } else {
        // Created new buyer
        alert("Buyer created successfully!");
        router.push("/seller/buyers");
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
    router.push("/seller/buyers");
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
            {buyer ? "Edit Buyer" : "Add New Buyer"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {buyer
              ? "Update buyer information and contact details"
              : "Create a new buyer and add their contact information"}
          </p>
        </div>
      </div>

      <div className="max-w-4xl">
        <PartyForm
          party={buyer}
          partyType="sellerBuyer"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel={buyer ? "Update Buyer" : "Create Buyer"}
        />
      </div>
    </div>
  );
}

