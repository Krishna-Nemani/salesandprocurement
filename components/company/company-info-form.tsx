"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Company, CompanyType } from "@prisma/client";
import { Edit2, X, Check } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").max(150, "Company name must be at most 150 characters"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  phone: z.string()
    .min(1, "Phone number is required")
    .refine((val) => {
      if (val.length < 6) {
        return false;
      }
      return true;
    }, {
      message: "Phone number must be at least 6 characters",
    })
    .refine((val) => {
      if (val.length > 16) {
        return false;
      }
      return true;
    }, {
      message: "Phone number must be at most 16 characters",
    })
    .refine((val) => !/[a-zA-Z]/.test(val), {
      message: "Phone number can only contain numbers and special characters (+, -, spaces, parentheses)",
    })
    .refine((val) => {
      const cleaned = val.replace(/[\s()-]/g, "");
      return /^\+?[1-9]\d{1,14}$/.test(cleaned);
    }, {
      message: "Phone number must include country code (e.g., +1, +91)",
    }),
  pocName: z.string().min(1, "Point of Contact Name is required").regex(/^[A-Za-z\s]+$/, "Only alphabets and spaces allowed"),
  pocPosition: z.string().max(100, "Position must be at most 100 characters").optional().or(z.literal("")),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State/Region is required"),
  city: z.string().min(1, "City is required").regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyInfoFormProps {
  company: Company & { addresses: any[] };
  isEditMode?: boolean;
  onEditModeChange?: (editMode: boolean) => void;
  onUpdate?: () => void;
}

export function CompanyInfoForm({ 
  company, 
  isEditMode: externalEditMode, 
  onEditModeChange,
  onUpdate 
}: CompanyInfoFormProps) {
  const router = useRouter();
  const [internalEditMode, setInternalEditMode] = useState(false);
  const isEditMode = externalEditMode !== undefined ? externalEditMode : internalEditMode;
  const setIsEditMode = externalEditMode !== undefined 
    ? (mode: boolean) => onEditModeChange?.(mode)
    : setInternalEditMode;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logoUrl || null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      pocName: company.pocName || "",
      pocPosition: company.pocPosition || "",
      country: company.country || "",
      state: company.state || "",
      city: company.city || "",
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
        setError("Logo must be a JPG or PNG file");
        return;
      }
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError("Logo must be less than 2MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      let logoUrl = company.logoUrl;

      // Upload logo if a new file was selected
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);

        const uploadResponse = await fetch("/api/company/logo", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Failed to upload logo");
        }

        const uploadData = await uploadResponse.json();
        logoUrl = uploadData.logoUrl;
      }

      // Update company data
      const response = await fetch("/api/company/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          logoUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update company");
      }

      const updatedCompany = await response.json();
      setLogoPreview(updatedCompany.logoUrl || logoUrl);
      setLogoFile(null);
      setSuccess(true);
      setIsEditMode(false);
      onUpdate?.();
      router.refresh();
      
      // Keep success message visible for 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    reset({
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      pocName: company.pocName || "",
      pocPosition: company.pocPosition || "",
      country: company.country || "",
      state: company.state || "",
      city: company.city || "",
    });
    setLogoFile(null);
    setLogoPreview(company.logoUrl || null);
    setIsEditMode(false);
    setError(null);
    setSuccess(false);
  };

  if (!isEditMode) {
    return (
      <div className="space-y-6">
        {success && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
            Company profile updated successfully.
          </div>
        )}
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <p className="text-sm py-2">{company.name}</p>
          </div>

          <div className="space-y-2">
            <Label>Point of Contact Name</Label>
            <p className="text-sm py-2">{company.pocName || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label>Position of POC</Label>
            <p className="text-sm py-2">{company.pocPosition || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-sm py-2">{company.email || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <p className="text-sm py-2">{company.phone || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <p className="text-sm py-2">{company.country || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label>State/Region</Label>
            <p className="text-sm py-2">{company.state || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label>City</Label>
            <p className="text-sm py-2">{company.city || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label>Company Logo</Label>
            {logoPreview ? (
              <div className="mt-2">
                <img
                  src={logoPreview}
                  alt="Company Logo"
                  className="h-24 w-24 object-cover rounded border"
                />
              </div>
            ) : (
              <p className="text-sm py-2 text-muted-foreground">No logo uploaded</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          Company profile updated successfully.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Enter company name"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pocName">Point of Contact Name *</Label>
          <Input
            id="pocName"
            {...register("pocName")}
            placeholder="Enter POC name"
          />
          {errors.pocName && (
            <p className="text-sm text-destructive">{errors.pocName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pocPosition">Position of POC</Label>
          <Input
            id="pocPosition"
            {...register("pocPosition")}
            placeholder="Enter position"
            maxLength={100}
          />
          {errors.pocPosition && (
            <p className="text-sm text-destructive">{errors.pocPosition.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="contact@company.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            {...register("phone")}
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            {...register("country")}
            placeholder="Enter country"
          />
          {errors.country && (
            <p className="text-sm text-destructive">{errors.country.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State/Region *</Label>
          <Input
            id="state"
            {...register("state")}
            placeholder="Enter state/region"
          />
          {errors.state && (
            <p className="text-sm text-destructive">{errors.state.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            {...register("city")}
            placeholder="Enter city"
          />
          {errors.city && (
            <p className="text-sm text-destructive">{errors.city.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Company Logo</Label>
        <div className="flex items-center gap-4">
          {logoPreview && (
            <div className="h-24 w-24 rounded border overflow-hidden">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <Input
              id="logo"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleLogoChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              JPG/PNG, max 2MB. Will be auto-cropped to square.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={handleCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Check className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
