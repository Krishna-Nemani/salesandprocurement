"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { PartyAddressForm } from "@/components/shared/party-address-form";
import { PartyAddress, AddressType } from "@prisma/client";
import { Pencil, Trash2, Plus } from "lucide-react";

interface PartyAddressBookProps {
  partyId: string;
  partyType: "sellerBuyer" | "buyerSeller";
  initialAddresses?: PartyAddress[];
  isEditMode?: boolean;
  isCreating?: boolean;
  onAddressesChange?: (addresses: Omit<PartyAddress, 'id' | 'createdAt' | 'updatedAt' | 'sellerBuyerId' | 'buyerSellerId'>[]) => void;
}

export function PartyAddressBook({ 
  partyId, 
  partyType, 
  initialAddresses = [], 
  isEditMode = false,
  isCreating = false,
  onAddressesChange
}: PartyAddressBookProps) {
  const [addresses, setAddresses] = useState<PartyAddress[]>(initialAddresses);
  const [tempAddresses, setTempAddresses] = useState<Omit<PartyAddress, 'id' | 'createdAt' | 'updatedAt' | 'sellerBuyerId' | 'buyerSellerId'>[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<PartyAddress | null>(null);
  const [editingTempIndex, setEditingTempIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Update addresses when initialAddresses changes
  useEffect(() => {
    if (!isCreating) {
      setAddresses(initialAddresses);
    }
  }, [initialAddresses, isCreating]);

  // Notify parent of address changes when creating
  useEffect(() => {
    if (isCreating && onAddressesChange) {
      onAddressesChange(tempAddresses);
    }
  }, [tempAddresses, isCreating, onAddressesChange]);

  // Fetch addresses when partyId changes
  useEffect(() => {
    if (partyId && !isCreating) {
      fetchAddresses();
    }
  }, [partyId, isCreating]);

  const fetchAddresses = async () => {
    try {
      // Get addresses from the party's API endpoint
      const partyUrl = partyType === "sellerBuyer" 
        ? `/api/seller/buyers/${partyId}`
        : `/api/buyer/sellers/${partyId}`;
      
      const response = await fetch(partyUrl);
      if (response.ok) {
        const party = await response.json();
        setAddresses(party.addresses || []);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  };

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingAddress(null);
    setEditingTempIndex(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (address: PartyAddress, index?: number) => {
    if (!isEditMode) return;
    if (isCreating && index !== undefined) {
      setEditingTempIndex(index);
      setEditingAddress(null);
    } else {
      setEditingAddress(address);
      setEditingTempIndex(null);
    }
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
      const response = await fetch(`/api/party/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete address");
      }

      setAddresses(addresses.filter((addr) => addr.id !== addressId));
    } catch (error) {
      alert("Failed to delete address. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFormSuccess = async (addressData?: Omit<PartyAddress, 'id' | 'createdAt' | 'updatedAt' | 'sellerBuyerId' | 'buyerSellerId'>) => {
    if (isCreating && addressData) {
      // When creating, add to temp addresses
      if (editingTempIndex !== null) {
        // Update existing temp address
        const updated = [...tempAddresses];
        updated[editingTempIndex] = addressData;
        setTempAddresses(updated);
      } else {
        // Add new temp address
        setTempAddresses([...tempAddresses, addressData]);
      }
    } else if (partyId && !isCreating) {
      // When editing existing party, fetch addresses
      await fetchAddresses();
    }
    setIsDialogOpen(false);
    setEditingAddress(null);
    setEditingTempIndex(null);
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

  const displayAddresses = isCreating ? tempAddresses : addresses;
  const hasAddresses = displayAddresses.length > 0;

  if (!hasAddresses && !isEditMode) {
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
          <Button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd(e);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Address
          </Button>
        </div>
      )}
      
      {isCreating && !hasAddresses && (
        <div className="border rounded-lg p-4 text-center text-muted-foreground bg-muted/50">
          <p>Add addresses that will be saved when you create the party.</p>
        </div>
      )}

      <div className="space-y-4">
        {isCreating && tempAddresses.map((address, index) => (
          <div
            key={`temp-${index}`}
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
                    onClick={() => handleEdit(null as any, index)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const updated = tempAddresses.filter((_, i) => i !== index);
                      setTempAddresses(updated);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {!isCreating && addresses.map((address) => (
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

      {!isCreating && addresses.length === 0 && isEditMode && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No addresses added yet. Click "Add New Address" to get started.</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.stopPropagation();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingAddress || editingTempIndex !== null ? "Edit Address" : "Add New Address"}
            </DialogTitle>
          </DialogHeader>
          <DialogClose onOpenChange={setIsDialogOpen} />
          <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <PartyAddressForm
              address={editingAddress || (editingTempIndex !== null ? tempAddresses[editingTempIndex] as any : null)}
              partyId={partyId}
              partyType={partyType}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingAddress(null);
                setEditingTempIndex(null);
              }}
              isCreating={isCreating}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

