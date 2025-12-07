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
import {
  Search,
  Eye,
  CheckCircle2,
  FileText,
  Clock,
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
  sellerCompanyName?: string | null;
  packingDate: Date;
  status: PLStatus | null;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrder?: {
    poId: string;
  } | null;
  items: PackingListItem[];
}

export function BuyerPackingListListClient() {
  const router = useRouter();
  const [packingLists, setPackingLists] = useState<PackingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PLStatus | "ALL">("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch packing lists
  const fetchPackingLists = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const response = await fetch(`/api/buyer/packing-lists?${params.toString()}`);
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
        (pl.sellerCompanyName && pl.sellerCompanyName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || pl.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [packingLists, searchQuery, statusFilter]);

  // Calculate overview stats
  const stats = useMemo(() => {
    return {
      total: packingLists.length,
      received: packingLists.filter((pl) => pl.status === PLStatus.RECEIVED || pl.status === PLStatus.PENDING).length,
      acknowledged: packingLists.filter((pl) => pl.status === PLStatus.ACKNOWLEDGED).length,
      rejected: packingLists.filter((pl) => pl.status === PLStatus.REJECTED).length,
    };
  }, [packingLists]);

  const handleAcknowledge = async (plId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to acknowledge this packing list?")) {
      return;
    }

    try {
      setProcessingId(plId);
      const response = await fetch(`/api/buyer/packing-lists/${plId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "acknowledge" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to acknowledge packing list");
      }

      alert("Packing list acknowledged successfully!");
      await fetchPackingLists();
      router.refresh();
    } catch (error) {
      console.error("Error acknowledging packing list:", error);
      alert(error instanceof Error ? error.message : "Failed to acknowledge packing list");
    } finally {
      setProcessingId(null);
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
      RECEIVED: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
      APPROVED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      ACKNOWLEDGED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };

    const labels: Record<PLStatus, string> = {
      PENDING: "Pending",
      RECEIVED: "Received",
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
      month: "short",
      day: "numeric",
    });
  };

  const canAcknowledge = (status: PLStatus | null | undefined) => {
    return status === PLStatus.PENDING || status === PLStatus.RECEIVED || status === PLStatus.APPROVED;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Packing Lists Received</h1>
          <p className="text-muted-foreground mt-1">View and manage packing lists received from sellers</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">All packing lists received</p>
            </div>
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Received</p>
              <p className="text-2xl font-bold mt-1">{stats.received}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting acknowledgment</p>
            </div>
            <Hourglass className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Acknowledged</p>
              <p className="text-2xl font-bold mt-1">{stats.acknowledged}</p>
              <p className="text-xs text-muted-foreground mt-1">Acknowledged packing lists</p>
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
              placeholder="Search by PL No. or Seller..."
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
            <option value={PLStatus.RECEIVED}>Received</option>
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
                <TableHead>Packing List Number</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Seller Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPLs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No packing lists found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPLs.map((pl) => (
                  <TableRow key={pl.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => router.push(`/buyer/packing-lists/${pl.id}`)}
                        className="text-blue-600 hover:underline"
                      >
                        {pl.plId}
                      </button>
                    </TableCell>
                    <TableCell>{formatDate(pl.createdAt)}</TableCell>
                    <TableCell>{pl.sellerCompanyName || "-"}</TableCell>
                    <TableCell>{getStatusBadge(pl.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/buyer/packing-lists/${pl.id}`)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canAcknowledge(pl.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleAcknowledge(pl.id, e)}
                            disabled={processingId === pl.id}
                            title="Acknowledge"
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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

