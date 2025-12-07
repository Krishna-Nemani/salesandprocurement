"use client";

import { useState } from "react";
import { CompanyInfoForm } from "@/components/company/company-info-form";
import { AddressBook } from "@/components/company/address-book";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Company, Address } from "@prisma/client";
import { Edit2 } from "lucide-react";

interface CompanyProfileClientProps {
  company: Company & { addresses: Address[] };
  addresses: Address[];
}

export function CompanyProfileClient({ company: initialCompany, addresses: initialAddresses }: CompanyProfileClientProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [company, setCompany] = useState(initialCompany);

  return (
    <>
      {/* Company Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                {isEditMode 
                  ? "Update your company details and contact information"
                  : "View your company details and contact information"}
              </CardDescription>
            </div>
            {!isEditMode && (
              <Button onClick={() => setIsEditMode(true)} variant="outline" size="sm">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <CompanyInfoForm 
            company={company} 
            isEditMode={isEditMode}
            onEditModeChange={setIsEditMode}
            onUpdate={async () => {
              // Refresh company and addresses when updated
              try {
                const response = await fetch("/api/company/me");
                if (response.ok) {
                  const updatedCompany = await response.json();
                  setCompany(updatedCompany);
                  setAddresses(updatedCompany.addresses || []);
                }
              } catch (error) {
                console.error("Error refreshing company:", error);
                // Fallback to full page reload
                window.location.reload();
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Address Book Card */}
      <Card>
        <CardHeader>
          <CardTitle>Address Book</CardTitle>
          <CardDescription>
            {isEditMode
              ? "Manage your company addresses for shipping, billing, and more"
              : "View your company addresses"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddressBook addresses={addresses} isEditMode={isEditMode} />
        </CardContent>
      </Card>
    </>
  );
}

