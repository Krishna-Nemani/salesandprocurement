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
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { InvoiceStatus } from "@prisma/client";

interface Invoice {
  id: string;
  invoiceId: string;
  buyerCompanyName?: string | null;
  invoiceDate: Date;
  totalAmount: number;
  status: InvoiceStatus | null;
  createdAt: Date;
  updatedAt: Date;
  purchaseOrder?: {
    poId: string;
  } | null;
}

export function SellerInvoiceListClient() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
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

      const response = await fetch(`/api/seller/invoices?${params.toString()}`);
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
    };
  }, [invoices]);

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) {
      return;
    }

    try {
      setIsDeleting(invoiceId);
      const response = await fetch(`/api/seller/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete invoice");
      }

      await fetchInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

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
      PENDING: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      PAID: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      OVERDUE: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };

    const labels: Record<InvoiceStatus, string> = {
      DRAFT: "Draft",
      PENDING: "Pending",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices Overview</h1>
          <p className="text-muted-foreground mt-1">Manage and track all your invoices</p>
        </div>
        <Button onClick={() => router.push("/seller/invoices/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.total)}</p>
              <p className="text-xs text-muted-foreground mt-1">+10.5% from last month</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Payment</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.pendingPayment)}</p>
              <p className="text-xs text-muted-foreground mt-1">-2.1% from last month</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.paid)}</p>
              <p className="text-xs text-muted-foreground mt-1">+5.0% from last month</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.overdue)}</p>
              <p className="text-xs text-muted-foreground mt-1">+8.3% from last month</p>
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
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "ALL" ? "default" : "outline"}
              onClick={() => setStatusFilter("ALL")}
            >
              All
            </Button>
            <Button
              variant={statusFilter === InvoiceStatus.PAID ? "default" : "outline"}
              onClick={() => setStatusFilter(InvoiceStatus.PAID)}
            >
              Paid
            </Button>
            <Button
              variant={statusFilter === InvoiceStatus.PENDING ? "default" : "outline"}
              onClick={() => setStatusFilter(InvoiceStatus.PENDING)}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === InvoiceStatus.OVERDUE ? "default" : "outline"}
              onClick={() => setStatusFilter(InvoiceStatus.OVERDUE)}
            >
              Overdue
            </Button>
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
                <TableHead>Date Created</TableHead>
                <TableHead>Buyer Name</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Status</TableHead>
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
                    <TableCell className="font-medium">{inv.invoiceId}</TableCell>
                    <TableCell>{formatDate(inv.createdAt)}</TableCell>
                    <TableCell>{inv.buyerCompanyName || "-"}</TableCell>
                    <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem
                          onClick={() => router.push(`/seller/invoices/${inv.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/seller/invoices/${inv.id}/edit`)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(inv.id)}
                          disabled={isDeleting === inv.id}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting === inv.id ? "Deleting..." : "Delete"}
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

