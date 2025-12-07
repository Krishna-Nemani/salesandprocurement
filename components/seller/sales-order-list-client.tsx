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
import { SOStatus } from "@prisma/client";

interface SalesOrderItem {
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

interface SalesOrder {
  id: string;
  soId: string;
  purchaseOrderId?: string | null;
  buyerCompanyName?: string | null;
  soCreatedDate: Date;
  plannedShipDate: Date;
  status: SOStatus;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrder?: {
    poId: string;
  } | null;
  items: SalesOrderItem[];
}

export function SellerSalesOrderListClient() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SOStatus | "ALL">("ALL");

  // Fetch sales orders
  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const response = await fetch(`/api/seller/sales-orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sales orders");
      }
      const data = await response.json();
      setSalesOrders(data);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  // Filter sales orders
  const filteredSOs = useMemo(() => {
    return salesOrders.filter((so) => {
      const matchesSearch =
        so.soId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (so.buyerCompanyName && so.buyerCompanyName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || so.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [salesOrders, searchQuery, statusFilter]);

  // Calculate overview stats
  const stats = useMemo(() => {
    return {
      total: salesOrders.length,
      pending: salesOrders.filter((so) => so.status === SOStatus.PENDING).length,
      accepted: salesOrders.filter((so) => so.status === SOStatus.PROCESSING || so.status === SOStatus.SHIPPED || so.status === SOStatus.DELIVERED).length,
      rejected: salesOrders.filter((so) => so.status === SOStatus.CANCELLED).length,
    };
  }, [salesOrders]);

  const handleDelete = async (soId: string) => {
    if (!window.confirm("Are you sure you want to delete this sales order?")) {
      return;
    }

    setIsDeleting(soId);
    try {
      const response = await fetch(`/api/seller/sales-orders/${soId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete sales order");
      }

      await fetchSalesOrders();
    } catch (error) {
      console.error("Error deleting sales order:", error);
      alert(error instanceof Error ? error.message : "Failed to delete sales order");
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: SOStatus) => {
    const colors: Record<SOStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      PENDING: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      PROCESSING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      SHIPPED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      DELIVERED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };

    const labels: Record<SOStatus, string> = {
      DRAFT: "Draft",
      PENDING: "Pending",
      PROCESSING: "Processing",
      SHIPPED: "Shipped",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
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

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹",
    };
    return symbols[currency] || currency;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading sales orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your sales orders
          </p>
        </div>
        <Button
          onClick={() => router.push("/seller/sales-orders/new")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Order
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Sales Orders</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
              <p className="text-xs text-green-600 mt-1">+10% from last month</p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold mt-1">{stats.pending}</p>
              <p className="text-xs text-orange-600 mt-1">2 new this week</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Accepted Orders</p>
              <p className="text-2xl font-bold mt-1">{stats.accepted}</p>
              <p className="text-xs text-green-600 mt-1">+5 this week</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejected Orders</p>
              <p className="text-2xl font-bold mt-1">{stats.rejected}</p>
              <p className="text-xs text-red-600 mt-1">-2 from last month</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Status Tabs and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant={statusFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ALL")}
            >
              All
            </Button>
            <Button
              variant={statusFilter === SOStatus.PENDING ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(SOStatus.PENDING)}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === SOStatus.PROCESSING ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(SOStatus.PROCESSING)}
            >
              Processing
            </Button>
            <Button
              variant={statusFilter === SOStatus.SHIPPED ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(SOStatus.SHIPPED)}
            >
              Shipped
            </Button>
            <Button
              variant={statusFilter === SOStatus.DELIVERED ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(SOStatus.DELIVERED)}
            >
              Delivered
            </Button>
            <Button
              variant={statusFilter === SOStatus.CANCELLED ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(SOStatus.CANCELLED)}
            >
              Cancelled
            </Button>
          </div>
          <div className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search order number or buyer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SOStatus | "ALL")}
              className="px-4 py-2 border rounded-md"
            >
              <option value="ALL">All Statuses</option>
              <option value={SOStatus.PENDING}>Pending</option>
              <option value={SOStatus.PROCESSING}>Processing</option>
              <option value={SOStatus.SHIPPED}>Shipped</option>
              <option value={SOStatus.DELIVERED}>Delivered</option>
              <option value={SOStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Buyer Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No sales orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSOs.map((so) => (
                  <TableRow key={so.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => router.push(`/seller/sales-orders/${so.id}`)}
                        className="text-blue-600 hover:underline"
                      >
                        {so.soId}
                      </button>
                    </TableCell>
                    <TableCell>{formatDate(so.createdAt)}</TableCell>
                    <TableCell>{so.buyerCompanyName || "-"}</TableCell>
                    <TableCell>{getStatusBadge(so.status)}</TableCell>
                    <TableCell>
                      {getCurrencySymbol("USD")} {so.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem
                          onClick={() => router.push(`/seller/sales-orders/${so.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/seller/sales-orders/${so.id}/edit`)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(so.id)}
                          disabled={isDeleting === so.id}
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

