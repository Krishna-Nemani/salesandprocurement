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
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { POStatus } from "@prisma/client";

interface PurchaseOrderItem {
  id: string;
  serialNumber: number;
  productName: string;
  productDescription?: string | null;
  sku?: string | null;
  hsnCode?: string | null;
  uom?: string | null;
  quantity: number;
  unitPrice: number;
  subTotal: number;
}

interface PurchaseOrder {
  id: string;
  poId: string;
  contractId?: string | null;
  quotationId?: string | null;
  sellerCompanyName?: string | null;
  poIssuedDate: Date;
  expectedDeliveryDate: Date;
  status: POStatus;
  createdAt: Date;
  updatedAt: Date;
  contract?: {
    contractId: string;
  } | null;
  quotation?: {
    quoteId: string;
  } | null;
  items: PurchaseOrderItem[];
}

export function BuyerPurchaseOrderListClient() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<POStatus | "ALL">("ALL");

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("limit", "50"); // Limit results

      const response = await fetch(`/api/buyer/purchase-orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch purchase orders");
      }
      const result = await response.json();
      // Handle both old format (array) and new format (object with data)
      setPurchaseOrders(Array.isArray(result) ? result : result.data || []);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchaseOrders();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  // Use purchase orders directly since filtering is now server-side
  const filteredPOs = purchaseOrders;

  // Calculate overview stats
  const stats = useMemo(() => {
    return {
      total: purchaseOrders.length,
      pending: purchaseOrders.filter((po) => po.status === POStatus.PENDING).length,
      approved: purchaseOrders.filter((po) => po.status === POStatus.APPROVED).length,
      rejected: purchaseOrders.filter((po) => po.status === POStatus.REJECTED).length,
    };
  }, [purchaseOrders]);

  const handleDelete = async (poId: string) => {
    if (!window.confirm("Are you sure you want to delete this purchase order?")) {
      return;
    }

    setIsDeleting(poId);
    try {
      const response = await fetch(`/api/buyer/purchase-orders/${poId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete purchase order");
      }

      await fetchPurchaseOrders();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      alert(error instanceof Error ? error.message : "Failed to delete purchase order");
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: POStatus) => {
    const colors: Record<POStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
      APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    };

    const labels: Record<POStatus, string> = {
      DRAFT: "Draft",
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      COMPLETED: "Completed",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading purchase orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your purchase orders
          </p>
        </div>
        <Button
          onClick={() => router.push("/buyer/purchase-orders/new")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New PO
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Purchase Orders</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold mt-1">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Accepted Orders</p>
              <p className="text-2xl font-bold mt-1">{stats.approved}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejected Orders</p>
              <p className="text-2xl font-bold mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search POs by number or vendor"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as POStatus | "ALL")}
              className="w-full md:w-auto px-4 py-2 border rounded-md"
            >
              <option value="ALL">All Statuses</option>
              <option value={POStatus.DRAFT}>Draft</option>
              <option value={POStatus.PENDING}>Pending</option>
              <option value={POStatus.APPROVED}>Approved</option>
              <option value={POStatus.REJECTED}>Rejected</option>
              <option value={POStatus.COMPLETED}>Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">All Purchase Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO NUMBER</TableHead>
                <TableHead>DATE CREATED</TableHead>
                <TableHead>VENDOR NAME</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poId}</TableCell>
                    <TableCell>{formatDate(po.createdAt)}</TableCell>
                    <TableCell>{po.sellerCompanyName || "-"}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem
                          onClick={() => router.push(`/buyer/purchase-orders/${po.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/buyer/purchase-orders/${po.id}/edit`)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(po.id)}
                          disabled={isDeleting === po.id}
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

