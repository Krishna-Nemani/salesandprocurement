"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { AddressForm } from "@/components/company/address-form";
import { Address, AddressType } from "@prisma/client";
import { Pencil, Trash2, Plus } from "lucide-react";

interface AddressBookProps {
  addresses: Address[];
  isEditMode?: boolean;
}

export function AddressBook({ addresses: initialAddresses, isEditMode = false }: AddressBookProps) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingAddress(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (address: Address) => {
    if (!isEditMode) return;
    setEditingAddress(address);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (addressId: string) => {
    if (!isEditMode) return;
    setShowDeleteConfirm(addressId);
  };

  const handleDeleteConfirm = async (addressId: string) => {
    setIsDeleting(addressId);
    setShowDeleteConfirm(null);

    try {
      const response = await fetch(`/api/company/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete address");
      }

      setAddresses(addresses.filter((addr) => addr.id !== addressId));
      router.refresh();
    } catch (error) {
      alert("Failed to delete address. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFormSuccess = async () => {
    setIsDialogOpen(false);
    setEditingAddress(null);
    
    // Refresh addresses from server
    try {
      const response = await fetch("/api/company/me");
      if (response.ok) {
        const company = await response.json();
        setAddresses(company.addresses || []);
      }
    } catch (error) {
      console.error("Error refreshing addresses:", error);
    }
    
    router.refresh();
  };

  const getAddressTypeLabel = (type: AddressType) => {
    const labels: Record<AddressType, string> = {
      COMPANY: "Company",
      HEADQUARTERS: "Headquarters",
      BILLING: "Billing",
      SHIPPING: "Shipping",
      WAREHOUSE: "Warehouse",
      OTHER: "Other",
    };
    return labels[type] || type;
  };

  if (addresses.length === 0 && !isEditMode) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No addresses added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isEditMode && (
        <div className="flex justify-end">
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Address
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {addresses.map((address) => (
          <div
            key={address.id}
            className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {getAddressTypeLabel(address.type)}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p className="text-muted-foreground">{address.postalCode}</p>
                </div>
              </div>
              {isEditMode && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(address)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(address.id)}
                    disabled={isDeleting === address.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm === address.id && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-background p-6 rounded-lg border max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-2">Delete Address</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Are you sure you want to delete this address? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteConfirm(address.id)}
                      disabled={isDeleting === address.id}
                    >
                      {isDeleting === address.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {addresses.length === 0 && isEditMode && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No addresses added yet. Click "Add New Address" to get started.</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Edit Address" : "Add New Address"}
            </DialogTitle>
          </DialogHeader>
          <DialogClose onOpenChange={setIsDialogOpen} />
          <AddressForm
            address={editingAddress}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
