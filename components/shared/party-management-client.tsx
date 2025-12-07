"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { PartyForm } from "@/components/shared/party-form";
import { PartyStatus } from "@prisma/client";

interface Party {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  status: PartyStatus;
  [key: string]: any;
}

interface PartyManagementClientProps {
  fetchUrl: string;
  createUrl: string;
  updateUrlBase: string; // Base URL for updates, will append /{id}
  deleteUrlBase: string; // Base URL for deletes, will append /{id}
  title: string;
  addButtonLabel?: string;
  emptyMessage?: string;
}

export function PartyManagementClient({
  fetchUrl,
  createUrl,
  updateUrlBase,
  deleteUrlBase,
  title,
  addButtonLabel = "Add New",
  emptyMessage = "No records found.",
}: PartyManagementClientProps) {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Fetch parties
  const fetchParties = async () => {
    try {
      setLoading(true);
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch records");
      }
      const data = await response.json();
      setParties(data);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [fetchUrl]);

  const handleAdd = () => {
    setEditingParty(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    setIsDialogOpen(true);
  };

  const handleDelete = async (partyId: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    setIsDeleting(partyId);
    try {
      const response = await fetch(`${deleteUrlBase}/${partyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete record");
      }

      // Refresh the list
      await fetchParties();
    } catch (error) {
      console.error("Error deleting record:", error);
      alert(error instanceof Error ? error.message : "Failed to delete record");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      const method = editingParty ? "PUT" : "POST";
      const url = editingParty ? `${updateUrlBase}/${editingParty.id}` : createUrl;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingParty ? "update" : "create"} record`);
      }

      setIsDialogOpen(false);
      setEditingParty(null);
      await fetchParties();
    } catch (error) {
      throw error;
    }
  };

  const getStatusBadge = (status: PartyStatus) => {
    const colors: Record<PartyStatus, string> = {
      ACTIVE: "bg-green-500/10 text-green-700 dark:text-green-400",
      PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      INACTIVE: "bg-red-500/10 text-red-700 dark:text-red-400",
    };

    return (
      <Badge className={colors[status]}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title.split(" ")[0]} Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              parties.map((party) => (
                <TableRow key={party.id}>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell>{party.contactName || "—"}</TableCell>
                  <TableCell>{party.email || "—"}</TableCell>
                  <TableCell>{party.phone || "—"}</TableCell>
                  <TableCell>{getStatusBadge(party.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(party)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(party.id)}
                        disabled={isDeleting === party.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingParty ? `Edit ${title.split(" ")[0]}` : `Add New ${title.split(" ")[0]}`}
            </DialogTitle>
          </DialogHeader>
          <PartyForm
            party={editingParty}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingParty(null);
            }}
            submitLabel={editingParty ? `Update ${title.split(" ")[0]}` : `Create ${title.split(" ")[0]}`}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

