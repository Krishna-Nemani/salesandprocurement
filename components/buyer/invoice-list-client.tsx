"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { InvoiceStatus } from "@prisma/client";

interface InvoiceItem {
  id: string;
  serialNumber: number;
  productName: string;
  quantity: number;
}

interface Invoice {
  id: string;
  invoiceId: string;
  sellerCompanyName?: string | null;
  invoiceDate: Date;
  totalAmount: number;
  status: InvoiceStatus | null;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrder?: {
    poId: string;
  } | null;
  items: InvoiceItem[];
}

export function BuyerInvoiceListClient() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("limit", "50"); // Limit results

      const response = await fetch(`/api/buyer/invoices?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }
      const result = await response.json();
      // Handle both old format (array) and new format (object with data)
      setInvoices(Array.isArray(result) ? result : result.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Use invoices directly since filtering is now server-side
  const filteredInvoices = invoices;

  // Calculate overview stats
  const stats = useMemo(() => {
    const pending = invoices.filter((inv) => inv.status === InvoiceStatus.PENDING);
    const paid = invoices.filter((inv) => inv.status === InvoiceStatus.PAID);
    const overdue = invoices.filter((inv) => inv.status === InvoiceStatus.OVERDUE);

    return {
      total: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      pendingPayment: pending.reduce((sum, inv) => sum + inv.totalAmount, 0),
      paid: paid.reduce((sum, inv) => sum + inv.totalAmount, 0),
      overdue: overdue.reduce((sum, inv) => sum + inv.totalAmount, 0),
      pendingCount: pending.length,
      paidCount: paid.length,
      overdueCount: overdue.length,
    };
  }, [invoices]);


  const getStatusBadge = (status: InvoiceStatus | null | undefined) => {
    if (!status) {
      return (
        <Badge className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20">
          Draft
        </Badge>
      );
    }

    const colors: Record<InvoiceStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      PAID: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      OVERDUE: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };

    const labels: Record<InvoiceStatus, string> = {
      DRAFT: "Draft",
      PENDING: "Pending Payment",
      PAID: "Paid",
      OVERDUE: "Overdue",
    };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const canPay = (status: InvoiceStatus | null | undefined) => {
    return status === InvoiceStatus.PENDING || status === InvoiceStatus.OVERDUE;
  };

  const isPaid = (status: InvoiceStatus | null | undefined) => {
    return status === InvoiceStatus.PAID;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Invoices Received</h1>
        <p className="text-muted-foreground mt-1">View and manage invoices from sellers</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.total)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Payment</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.pendingPayment)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.pendingCount} Invoices</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.paid)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.paidCount} Invoices</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.overdue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.overdueCount} Invoices</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
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
              placeholder="Search by invoice number or seller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as InvoiceStatus | "ALL")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={InvoiceStatus.PENDING}>Pending Payment</SelectItem>
                <SelectItem value={InvoiceStatus.PAID}>Paid</SelectItem>
                <SelectItem value={InvoiceStatus.OVERDUE}>Overdue</SelectItem>
                <SelectItem value={InvoiceStatus.DRAFT}>Draft</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || statusFilter !== "ALL") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Seller Customer Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
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
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => router.push(`/buyer/invoices/${inv.id}`)}
                        className="text-blue-600 hover:underline"
                      >
                        {inv.invoiceId}
                      </button>
                    </TableCell>
                    <TableCell>{formatDate(inv.createdAt)}</TableCell>
                    <TableCell>{inv.sellerCompanyName || "-"}</TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/buyer/invoices/${inv.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        {canPay(inv.status) && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/buyer/invoices/${inv.id}`);
                            }}
                          >
                            {inv.status === InvoiceStatus.OVERDUE ? "Pay Now" : "Pay"}
                          </Button>
                        )}
                        {isPaid(inv.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            Paid
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

