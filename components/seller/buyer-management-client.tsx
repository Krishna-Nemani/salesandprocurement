"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { PartyStatus, SellerBuyer } from "@prisma/client";

export function BuyerManagementClient() {
  const router = useRouter();
  const [buyers, setBuyers] = useState<SellerBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PartyStatus | "ALL">("ALL");

  // Fetch buyers
  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/seller/buyers");
      if (!response.ok) {
        throw new Error("Failed to fetch buyers");
      }
      const data = await response.json();
      setBuyers(data);
    } catch (error) {
      console.error("Error fetching buyers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  // Filter and search buyers
  const filteredBuyers = useMemo(() => {
    return buyers.filter((buyer) => {
      const matchesSearch =
        buyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buyer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buyer.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        buyer.phone?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || buyer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [buyers, searchQuery, statusFilter]);

  const handleAdd = () => {
    router.push("/seller/buyers/new");
  };

  const handleEdit = (buyer: SellerBuyer) => {
    router.push(`/seller/buyers/${buyer.id}/edit`);
  };

  const handleDelete = async (buyerId: string) => {
    if (!window.confirm("Are you sure you want to delete this buyer?")) {
      return;
    }

    setIsDeleting(buyerId);
    try {
      const response = await fetch(`/api/seller/buyers/${buyerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete buyer");
      }

      await fetchBuyers();
    } catch (error) {
      console.error("Error deleting buyer:", error);
      alert(error instanceof Error ? error.message : "Failed to delete buyer");
    } finally {
      setIsDeleting(null);
    }
  };


  const getStatusBadge = (status: PartyStatus) => {
    const colors: Record<PartyStatus, string> = {
      ACTIVE: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      PENDING: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
      INACTIVE: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
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
        <p className="text-muted-foreground">Loading buyers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button, Search, and Filter */}
      <div className="flex items-center justify-between gap-4">
        <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add New Buyer
        </Button>
        <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search buyers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu
            trigger={
              <Button variant="outline" size="default">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            }
          >
            <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter(PartyStatus.ACTIVE)}>
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter(PartyStatus.PENDING)}>
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter(PartyStatus.INACTIVE)}>
              Inactive
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      {/* All Buyers Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">All Buyers</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer Name</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuyers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchQuery || statusFilter !== "ALL"
                      ? "No buyers found matching your search criteria."
                      : "No buyers found. Click 'Add New Buyer' to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBuyers.map((buyer) => (
                  <TableRow key={buyer.id}>
                    <TableCell className="font-medium">{buyer.name}</TableCell>
                    <TableCell>{buyer.email || "—"}</TableCell>
                    <TableCell>{buyer.phone || "—"}</TableCell>
                    <TableCell>{getStatusBadge(buyer.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem onClick={() => handleEdit(buyer)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(buyer.id)}
                          disabled={isDeleting === buyer.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}
