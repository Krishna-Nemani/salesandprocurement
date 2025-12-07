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
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
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
  buyerCompanyName?: string | null;
  delDate: Date;
  status: DNStatus | null;
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

export function SellerDeliveryNoteListClient() {
  const router = useRouter();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DNStatus | "ALL">("ALL");

  // Fetch delivery notes
  const fetchDeliveryNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const response = await fetch(`/api/seller/delivery-notes?${params.toString()}`);
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
        (dn.buyerCompanyName && dn.buyerCompanyName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || dn.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [deliveryNotes, searchQuery, statusFilter]);

  // Calculate overview stats
  const stats = useMemo(() => {
    return {
      total: deliveryNotes.length,
      pending: deliveryNotes.filter((dn) => dn.status === DNStatus.PENDING).length,
      inTransit: deliveryNotes.filter((dn) => dn.status === DNStatus.IN_TRANSIT).length,
      completed: deliveryNotes.filter((dn) => dn.status === DNStatus.COMPLETED).length,
      cancelled: deliveryNotes.filter((dn) => dn.status === DNStatus.CANCELLED).length,
    };
  }, [deliveryNotes]);

  const handleDelete = async (dnId: string) => {
    if (!window.confirm("Are you sure you want to delete this delivery note?")) {
      return;
    }

    setIsDeleting(dnId);
    try {
      const response = await fetch(`/api/seller/delivery-notes/${dnId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete delivery note");
      }

      await fetchDeliveryNotes();
    } catch (error) {
      console.error("Error deleting delivery note:", error);
      alert(error instanceof Error ? error.message : "Failed to delete delivery note");
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: DNStatus | null | undefined) => {
    // Handle null/undefined status
    if (!status) {
      return (
        <Badge className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
          Pending
        </Badge>
      );
    }

    const colors: Record<DNStatus, string> = {
      PENDING: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      IN_TRANSIT: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
      COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      ACKNOWLEDGED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading delivery notes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Delivery Notes Overview</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your delivery notes
          </p>
        </div>
        <Button
          onClick={() => router.push("/seller/delivery-notes/new")}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Delivery Note
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Notes</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">All delivery notes recorded</p>
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
              <p className="text-sm text-muted-foreground">In Transit</p>
              <p className="text-2xl font-bold mt-1">{stats.inTransit}</p>
              <p className="text-xs text-muted-foreground mt-1">Currently being delivered</p>
            </div>
            <Truck className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold mt-1">{stats.completed}</p>
              <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold mt-1">{stats.cancelled}</p>
              <p className="text-xs text-muted-foreground mt-1">Delivery notes cancelled</p>
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
            onChange={(e) => setStatusFilter(e.target.value as DNStatus | "ALL")}
            className="px-4 py-2 border rounded-md"
          >
            <option value="ALL">All Statuses</option>
            <option value={DNStatus.PENDING}>Pending</option>
            <option value={DNStatus.IN_TRANSIT}>In Transit</option>
            <option value={DNStatus.COMPLETED}>Completed</option>
            <option value={DNStatus.CANCELLED}>Cancelled</option>
            <option value={DNStatus.ACKNOWLEDGED}>Acknowledged</option>
            <option value={DNStatus.DISPUTED}>Disputed</option>
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
                <TableHead>Buyer Name</TableHead>
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
                filteredDNs.map((dn) => (
                  <TableRow key={dn.id}>
                    <TableCell className="font-medium">{dn.dnId}</TableCell>
                    <TableCell>{formatDate(dn.createdAt)}</TableCell>
                    <TableCell>{dn.buyerCompanyName || "-"}</TableCell>
                    <TableCell>{getStatusBadge(dn.status)}</TableCell>
                    <TableCell>{dn.items.length}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem
                          onClick={() => router.push(`/seller/delivery-notes/${dn.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/seller/delivery-notes/${dn.id}/edit`)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(dn.id)}
                          disabled={isDeleting === dn.id}
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

