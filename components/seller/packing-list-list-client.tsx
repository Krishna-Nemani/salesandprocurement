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
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  Hourglass,
} from "lucide-react";
import { PLStatus } from "@prisma/client";

interface PackingListItem {
  id: string;
  serialNumber: number;
  productName: string;
  quantity: number;
}

interface PackingList {
  id: string;
  plId: string;
  buyerCompanyName?: string | null;
  packingDate: Date;
  status: PLStatus | null;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrder?: {
    poId: string;
  } | null;
  items: PackingListItem[];
}

export function SellerPackingListListClient() {
  const router = useRouter();
  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PLStatus | "ALL">("ALL");

  // Fetch packing lists
  const fetchPackingLists = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const response = await fetch(`/api/seller/packing-lists?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch packing lists");
      }
      const data = await response.json();
      setPackingLists(data);
    } catch (error) {
      console.error("Error fetching packing lists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackingLists();
  }, []);

  // Filter packing lists
  const filteredPLs = useMemo(() => {
    return packingLists.filter((pl) => {
      const matchesSearch =
        pl.plId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pl.buyerCompanyName && pl.buyerCompanyName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || pl.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [packingLists, searchQuery, statusFilter]);

  // Calculate overview stats
  const stats = useMemo(() => {
    return {
      total: packingLists.length,
      approved: packingLists.filter((pl) => pl.status === PLStatus.APPROVED).length,
      acknowledged: packingLists.filter((pl) => pl.status === PLStatus.ACKNOWLEDGED).length,
      rejected: packingLists.filter((pl) => pl.status === PLStatus.REJECTED).length,
    };
  }, [packingLists]);

  const handleDelete = async (plId: string) => {
    if (!window.confirm("Are you sure you want to delete this packing list?")) {
      return;
    }

    try {
      setIsDeleting(plId);
      const response = await fetch(`/api/seller/packing-lists/${plId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete packing list");
      }

      await fetchPackingLists();
    } catch (error) {
      console.error("Error deleting packing list:", error);
      alert("Failed to delete packing list. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: PLStatus | null | undefined) => {
    // Handle null/undefined status
    if (!status) {
      return (
        <Badge className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
          Pending
        </Badge>
      );
    }

    const colors: Record<PLStatus, string> = {
      PENDING: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      APPROVED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      ACKNOWLEDGED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };

    const labels: Record<PLStatus, string> = {
      PENDING: "Pending",
      APPROVED: "Approved",
      ACKNOWLEDGED: "Acknowledged",
      REJECTED: "Rejected",
    };

    // Fallback for unknown status
    if (!colors[status]) {
      return (
        <Badge className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
          {status}
        </Badge>
      );
    }

    return (
      <Badge className={colors[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Packing Lists Overview</h1>
          <p className="text-muted-foreground mt-1">Manage and track all your packing lists</p>
        </div>
        <Button onClick={() => router.push("/seller/packing-lists/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Packing List
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Lists</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">All packing lists recorded</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold mt-1">{stats.approved}</p>
              <p className="text-xs text-muted-foreground mt-1">Approved packing lists</p>
            </div>
            <Hourglass className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Acknowledged</p>
              <p className="text-2xl font-bold mt-1">{stats.acknowledged}</p>
              <p className="text-xs text-muted-foreground mt-1">Acknowledged by buyer</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold mt-1">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground mt-1">Rejected packing lists</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by note number or buyer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PLStatus | "ALL")}
            className="px-4 py-2 border rounded-md"
          >
            <option value="ALL">All Statuses</option>
            <option value={PLStatus.PENDING}>Pending</option>
            <option value={PLStatus.APPROVED}>Approved</option>
            <option value={PLStatus.ACKNOWLEDGED}>Acknowledged</option>
            <option value={PLStatus.REJECTED}>Rejected</option>
          </select>
        </div>
      </div>

      {/* Packing Lists Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Packing List #</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Buyer Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPLs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No packing lists found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPLs.map((pl) => (
                  <TableRow key={pl.id}>
                    <TableCell className="font-medium">{pl.plId}</TableCell>
                    <TableCell>{formatDate(pl.createdAt)}</TableCell>
                    <TableCell>{pl.buyerCompanyName || "-"}</TableCell>
                    <TableCell>{getStatusBadge(pl.status)}</TableCell>
                    <TableCell>{pl.items.length}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem
                          onClick={() => router.push(`/seller/packing-lists/${pl.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/seller/packing-lists/${pl.id}/edit`)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(pl.id)}
                          disabled={isDeleting === pl.id}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting === pl.id ? "Deleting..." : "Delete"}
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

