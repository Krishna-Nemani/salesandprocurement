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
import { PartyStatus, BuyerSeller } from "@prisma/client";

export function SellerManagementClient() {
  const router = useRouter();
  const [sellers, setSellers] = useState<BuyerSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PartyStatus | "ALL">("ALL");

  // Fetch sellers
  const fetchSellers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/buyer/sellers");
      if (!response.ok) {
        throw new Error("Failed to fetch sellers");
      }
      const data = await response.json();
      setSellers(data);
    } catch (error) {
      console.error("Error fetching sellers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  // Filter and search sellers
  const filteredSellers = useMemo(() => {
    return sellers.filter((seller) => {
      const matchesSearch =
        seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.phone?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || seller.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sellers, searchQuery, statusFilter]);

  const handleAdd = () => {
    router.push("/buyer/sellers/new");
  };

  const handleEdit = (seller: BuyerSeller) => {
    router.push(`/buyer/sellers/${seller.id}/edit`);
  };

  const handleDelete = async (sellerId: string) => {
    if (!window.confirm("Are you sure you want to delete this seller?")) {
      return;
    }

    setIsDeleting(sellerId);
    try {
      const response = await fetch(`/api/buyer/sellers/${sellerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete seller");
      }

      await fetchSellers();
    } catch (error) {
      console.error("Error deleting seller:", error);
      alert(error instanceof Error ? error.message : "Failed to delete seller");
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
        <p className="text-muted-foreground">Loading sellers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button, Search, and Filter */}
      <div className="flex items-center justify-between gap-4">
        <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add New Seller
        </Button>
        <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search sellers..."
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

      {/* All Sellers Section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">All Sellers</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller Name</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSellers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchQuery || statusFilter !== "ALL"
                      ? "No sellers found matching your search criteria."
                      : "No sellers found. Click 'Add New Seller' to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell>{seller.email || "—"}</TableCell>
                    <TableCell>{seller.phone || "—"}</TableCell>
                    <TableCell>{getStatusBadge(seller.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem onClick={() => handleEdit(seller)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(seller.id)}
                          disabled={isDeleting === seller.id}
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

