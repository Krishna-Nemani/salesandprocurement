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
  XCircle,
  FileText,
  Clock,
  Trash2,
} from "lucide-react";
import { QuotationStatus } from "@prisma/client";
import { DatePicker } from "@/components/ui/date-picker";
import Link from "next/link";

interface QuotationItem {
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

interface Quotation {
  id: string;
  quoteId: string;
  rfqId?: string | null;
  sellerCompanyName: string;
  quoteDateIssued: Date;
  status: QuotationStatus;
  totalAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  items: QuotationItem[];
  rfq?: {
    rfqId: string;
    projectName?: string | null;
  } | null;
  sellerCompany?: {
    id: string;
    name: string;
  } | null;
}

export function BuyerQuotationListClient() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Fetch quotations
  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const response = await fetch(`/api/buyer/quotations?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch quotations");
      }
      const data = await response.json();
      setQuotations(data);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  // Filter quotations by search query and date range (client-side)
  const filteredQuotations = useMemo(() => {
    let filtered = quotations;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((quotation) => {
        return (
          quotation.quoteId.toLowerCase().includes(query) ||
          quotation.sellerCompanyName.toLowerCase().includes(query) ||
          (quotation.rfq?.rfqId && quotation.rfq.rfqId.toLowerCase().includes(query))
        );
      });
    }

    // Filter by date range if dates are selected
    if (dateFrom || dateTo) {
      filtered = filtered.filter((quotation) => {
        const quoteDate = new Date(quotation.quoteDateIssued);
        if (dateFrom && quoteDate < dateFrom) return false;
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (quoteDate > toDate) return false;
        }
        return true;
      });
    }

    return filtered;
  }, [quotations, searchQuery, dateFrom, dateTo]);

  // Calculate overview stats (from all quotations, not filtered)
  const stats = useMemo(() => {
    return {
      total: quotations.length,
      pending: quotations.filter((q) => q.status === QuotationStatus.PENDING || q.status === QuotationStatus.SENT).length,
      accepted: quotations.filter((q) => q.status === QuotationStatus.ACCEPTED).length,
      rejected: quotations.filter((q) => q.status === QuotationStatus.REJECTED).length,
    };
  }, [quotations]);

  const getStatusBadge = (status: QuotationStatus) => {
    const colors: Record<QuotationStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
      APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      ACCEPTED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      SENT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    };

    const labels: Record<QuotationStatus, string> = {
      DRAFT: "Draft",
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      ACCEPTED: "Accepted",
      SENT: "Pending",
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

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹",
      JPY: "¥",
      CNY: "¥",
      AUD: "A$",
      CAD: "C$",
      CHF: "CHF",
      SGD: "S$",
    };
    return symbols[currency] || currency;
  };

  const handleAccept = async (id: string) => {
    if (!confirm("Are you sure you want to accept this quotation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/buyer/quotations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept quotation");
      }

      // Refresh the list
      fetchQuotations();
    } catch (error) {
      console.error("Error accepting quotation:", error);
      alert(error instanceof Error ? error.message : "Failed to accept quotation");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this quotation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/buyer/quotations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject quotation");
      }

      // Refresh the list
      fetchQuotations();
    } catch (error) {
      console.error("Error rejecting quotation:", error);
      alert(error instanceof Error ? error.message : "Failed to reject quotation");
    }
  };

  const handleApplyFilters = () => {
    // Filters are already applied via useMemo
    // This function can be used for additional server-side filtering if needed
    fetchQuotations();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading quotations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Quotations</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-500" />
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            +10% from last month
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold mt-1">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            2 new this week
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Accepted Quotations</p>
              <p className="text-2xl font-bold mt-1">{stats.accepted}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            +5 this week
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejected Quotations</p>
              <p className="text-2xl font-bold mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            -2 from last month
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Filter Quotations</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | "ALL")}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="ALL">All Statuses</option>
              <option value={QuotationStatus.PENDING}>Pending</option>
              <option value={QuotationStatus.SENT}>Sent</option>
              <option value={QuotationStatus.ACCEPTED}>Accepted</option>
              <option value={QuotationStatus.REJECTED}>Rejected</option>
              <option value={QuotationStatus.DRAFT}>Draft</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="flex gap-2">
              <DatePicker
                date={dateFrom}
                onDateChange={setDateFrom}
                placeholder="From"
              />
              <DatePicker
                date={dateTo}
                onDateChange={setDateTo}
                placeholder="To"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Search by Reference</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Quotation or RFQ Ref."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleApplyFilters}
              variant="outline"
              className="w-full"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Quotation List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Quotation List</h3>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation Reference</TableHead>
                <TableHead>Related RFQ</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No quotations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">{quotation.quoteId}</TableCell>
                    <TableCell>
                      {quotation.rfq?.rfqId ? (
                        <Link
                          href={`/buyer/rfqs/${quotation.rfqId || ""}`}
                          className="text-blue-600 hover:underline"
                        >
                          {quotation.rfq.projectName || quotation.rfq.rfqId}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{quotation.sellerCompanyName}</TableCell>
                    <TableCell>{formatDateTime(quotation.quoteDateIssued)}</TableCell>
                    <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                    <TableCell className="text-right">
                      {getCurrencySymbol(quotation.currency)}{Number(quotation.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/buyer/quotations/${quotation.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(quotation.status === QuotationStatus.PENDING || quotation.status === QuotationStatus.SENT) && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAccept(quotation.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(quotation.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
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

