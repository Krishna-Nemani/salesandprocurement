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
  MessageSquare,
} from "lucide-react";
import { DNStatus } from "@prisma/client";

interface DeliveryNoteItem {
  id: string;
  serialNumber: number;
  productName: string;
  quantity: number;
  quantityDelivered: number;
}

interface DeliveryNote {
  id: string;
  dnId: string;
  sellerCompanyName?: string | null;
  delDate: Date;
  status: DNStatus;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrder?: {
    poId: string;
  } | null;
  salesOrder?: {
    soId: string;
  } | null;
  items: DeliveryNoteItem[];
}

export function BuyerDeliveryNoteListClient() {
  const router = useRouter();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DNStatus | "ALL">("ALL");

  // Fetch delivery notes
  const fetchDeliveryNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const response = await fetch(`/api/buyer/delivery-notes?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch delivery notes");
      }
      const data = await response.json();
      setDeliveryNotes(data);
    } catch (error) {
      console.error("Error fetching delivery notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryNotes();
  }, []);

  // Filter delivery notes
  const filteredDNs = useMemo(() => {
    return deliveryNotes.filter((dn) => {
      const matchesSearch =
        dn.dnId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dn.sellerCompanyName && dn.sellerCompanyName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || dn.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [deliveryNotes, searchQuery, statusFilter]);

  // Calculate overview stats
  const stats = useMemo(() => {
    return {
      total: deliveryNotes.length,
      pending: deliveryNotes.filter((dn) => dn.status === DNStatus.PENDING || dn.status === DNStatus.IN_TRANSIT).length,
      acknowledged: deliveryNotes.filter((dn) => dn.status === DNStatus.ACKNOWLEDGED).length,
      disputed: deliveryNotes.filter((dn) => dn.status === DNStatus.DISPUTED).length,
    };
  }, [deliveryNotes]);

  const getStatusBadge = (status: DNStatus) => {
    const colors: Record<DNStatus, string> = {
      PENDING: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      IN_TRANSIT: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
      COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      ACKNOWLEDGED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      DISPUTED: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    };

    const labels: Record<DNStatus, string> = {
      PENDING: "Pending",
      IN_TRANSIT: "In Transit",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
      ACKNOWLEDGED: "Acknowledged",
      DISPUTED: "Disputed",
    };

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

  const handleAcknowledge = async (dnId: string) => {
    try {
      const response = await fetch(`/api/buyer/delivery-notes/${dnId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "acknowledge" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to acknowledge delivery note");
      }

      await fetchDeliveryNotes();
      alert("Delivery note acknowledged successfully!");
    } catch (error) {
      console.error("Error acknowledging delivery note:", error);
      alert(error instanceof Error ? error.message : "Failed to acknowledge delivery note");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading delivery notes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Delivery Notes Overview</h1>
        <p className="text-muted-foreground mt-1">
          View and manage delivery notes received from sellers
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold mt-1">{stats.pending}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
            </div>
            <Clock className="h-8 w-8 text-pink-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Acknowledged</p>
              <p className="text-2xl font-bold mt-1">{stats.acknowledged}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Disputed</p>
              <p className="text-2xl font-bold mt-1">{stats.disputed}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-orange-500" />
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
            onChange={(e) => setStatusFilter(e.target.value as DNStatus | "ALL")}
            className="px-4 py-2 border rounded-md"
          >
            <option value="ALL">All Statuses</option>
            <option value={DNStatus.PENDING}>Pending</option>
            <option value={DNStatus.IN_TRANSIT}>In Transit</option>
            <option value={DNStatus.ACKNOWLEDGED}>Acknowledged</option>
            <option value={DNStatus.DISPUTED}>Disputed</option>
            <option value={DNStatus.COMPLETED}>Completed</option>
          </select>
        </div>
      </div>

      {/* Delivery Notes Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Delivery Note List</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Note Number</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Seller Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDNs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No delivery notes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDNs.map((dn) => {
                  const canAcknowledge = dn.status === DNStatus.PENDING || dn.status === DNStatus.IN_TRANSIT;
                  
                  return (
                    <TableRow key={dn.id}>
                      <TableCell className="font-medium">{dn.dnId}</TableCell>
                      <TableCell>{formatDate(dn.createdAt)}</TableCell>
                      <TableCell>{dn.sellerCompanyName || "-"}</TableCell>
                      <TableCell>{getStatusBadge(dn.status)}</TableCell>
                      <TableCell>{dn.items.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push(`/buyer/delivery-notes/${dn.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canAcknowledge && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleAcknowledge(dn.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

