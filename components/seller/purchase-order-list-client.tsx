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
  buyerCompanyName?: string | null;
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

export function SellerPurchaseOrderListClient() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<POStatus | "ALL">("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (dateRangeFilter !== "all") params.append("dateRange", dateRangeFilter);

      const response = await fetch(`/api/seller/purchase-orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch purchase orders");
      }
      const data = await response.json();
      setPurchaseOrders(data);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  // Filter purchase orders
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        po.poId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.buyerCompanyName && po.buyerCompanyName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || po.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchQuery, statusFilter]);

  // Calculate overview stats
  const stats = useMemo(() => {
    return {
      total: purchaseOrders.length,
      pending: purchaseOrders.filter((po) => po.status === POStatus.PENDING).length,
      approved: purchaseOrders.filter((po) => po.status === POStatus.APPROVED).length,
      rejected: purchaseOrders.filter((po) => po.status === POStatus.REJECTED).length,
    };
  }, [purchaseOrders]);

  const getStatusBadge = (status: POStatus) => {
    const colors: Record<POStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      PENDING: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
      APPROVED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      REJECTED: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    };

    const labels: Record<POStatus, string> = {
      DRAFT: "Draft",
      PENDING: "Pending Approval",
      APPROVED: "Accepted",
      REJECTED: "Rejected",
      COMPLETED: "Shipped",
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <p className="text-muted-foreground mt-1">
          View and manage purchase orders received from buyers
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total POs Received</p>
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
            <Clock className="h-8 w-8 text-pink-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Accepted Orders</p>
              <p className="text-2xl font-bold mt-1">{stats.approved}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejected Orders</p>
              <p className="text-2xl font-bold mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-gray-500" />
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
                placeholder="Search orders..."
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
              <option value={POStatus.PENDING}>Pending Approval</option>
              <option value={POStatus.APPROVED}>Accepted</option>
              <option value={POStatus.REJECTED}>Rejected</option>
              <option value={POStatus.COMPLETED}>Shipped</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Recent Purchase Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Buyer Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>{po.buyerCompanyName || "-"}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/seller/purchase-orders/${po.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        {(po.status === POStatus.PENDING || po.status === POStatus.DRAFT) && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => router.push(`/seller/purchase-orders/${po.id}`)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Process
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

