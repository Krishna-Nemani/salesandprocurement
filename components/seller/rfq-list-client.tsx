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
  Filter,
  MoreVertical,
  Eye,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { RFQStatus } from "@prisma/client";
import Link from "next/link";

interface RFQItem {
  id: string;
  serialNumber: number;
  productName: string;
  productDescription?: string | null;
  sku?: string | null;
  hsnCode?: string | null;
  uom?: string | null;
  quantity: number;
}

interface RFQ {
  id: string;
  rfqId: string;
  projectName: string;
  buyerCompanyName: string;
  dateIssued: Date;
  dueDate: Date;
  status: RFQStatus;
  createdAt: Date;
  updatedAt: Date;
  items: RFQItem[];
  buyerCompany?: {
    id: string;
    name: string;
  };
}

export function SellerRFQListClient() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RFQStatus | "ALL" | "RESPONDED">("ALL");
  const [dateRange, setDateRange] = useState("all");

  // Fetch RFQs
  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (dateRange !== "all") params.append("dateRange", dateRange);

      const response = await fetch(`/api/seller/rfqs?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch RFQs");
      }
      const data = await response.json();
      setRfqs(data);
    } catch (error) {
      console.error("Error fetching RFQs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQs();
  }, [statusFilter, dateRange]);

  // Filter RFQs by search query (client-side search)
  const filteredRFQs = useMemo(() => {
    if (!searchQuery) return rfqs;
    
    return rfqs.filter((rfq) => {
      const query = searchQuery.toLowerCase();
      return (
        rfq.rfqId.toLowerCase().includes(query) ||
        rfq.projectName?.toLowerCase().includes(query) ||
        rfq.buyerCompanyName.toLowerCase().includes(query)
      );
    });
  }, [rfqs, searchQuery]);

  // Calculate overview stats (from all RFQs, not filtered)
  const stats = useMemo(() => {
    return {
      total: rfqs.length,
      pending: rfqs.filter((r) => r.status === RFQStatus.PENDING || r.status === RFQStatus.DRAFT).length,
      responded: rfqs.filter((r) => r.status === RFQStatus.APPROVED || r.status === RFQStatus.REJECTED).length,
      approved: rfqs.filter((r) => r.status === RFQStatus.APPROVED).length,
    };
  }, [rfqs]);

  const getStatusBadge = (status: RFQStatus) => {
    const colors: Record<RFQStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      PENDING: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
      APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    };

    const labels: Record<RFQStatus, string> = {
      DRAFT: "Draft",
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Declined",
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
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading RFQs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">RFQs</h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total RFQs</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">All requests received</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending RFQs</p>
              <p className="text-2xl font-bold mt-1">{stats.pending}</p>
              <p className="text-xs text-muted-foreground mt-1">Waiting for your response</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Responded RFQs</p>
              <p className="text-2xl font-bold mt-1">{stats.responded}</p>
              <p className="text-xs text-muted-foreground mt-1">Quotes submitted</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Approved RFQs</p>
              <p className="text-2xl font-bold mt-1">{stats.approved}</p>
              <p className="text-xs text-muted-foreground mt-1">Your quotes were accepted</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            statusFilter === "ALL"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter(RFQStatus.PENDING)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            statusFilter === RFQStatus.PENDING
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setStatusFilter(RFQStatus.PENDING)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            statusFilter === RFQStatus.PENDING
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setStatusFilter("RESPONDED")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            statusFilter === "RESPONDED"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Responded
        </button>
        <button
          onClick={() => setStatusFilter(RFQStatus.APPROVED)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            statusFilter === RFQStatus.APPROVED
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter(RFQStatus.REJECTED)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            statusFilter === RFQStatus.REJECTED
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Declined
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex items-center gap-2">
        <DropdownMenu
          trigger={
            <Button variant="outline" size="default">
              {dateRange === "all" ? "All Time" : dateRange === "7days" ? "Last 7 Days" : "Last 30 Days"}
              <Filter className="ml-2 h-4 w-4" />
            </Button>
          }
        >
          <DropdownMenuItem onClick={() => setDateRange("all")}>
            All Time
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDateRange("7days")}>
            Last 7 Days
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDateRange("30days")}>
            Last 30 Days
          </DropdownMenuItem>
        </DropdownMenu>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by RFQ title or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="default">
          <Filter className="mr-2 h-4 w-4" />
          Advanced Filters
        </Button>
      </div>

      {/* RFQ Table */}
      <div className="border rounded-lg">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>RFQ ID</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredRFQs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery || statusFilter !== "ALL"
                    ? "No RFQs found matching your search criteria."
                    : "No RFQs received yet."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRFQs.map((rfq) => (
                <TableRow key={rfq.id}>
                  <TableCell className="font-medium">
                    {rfq.buyerCompanyName}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/seller/rfqs/${rfq.id}`}
                      className="text-primary hover:underline"
                    >
                      {rfq.rfqId}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(rfq.dateIssued)}</TableCell>
                  <TableCell>{formatDate(rfq.dueDate)}</TableCell>
                  <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="relative inline-block">
                      <DropdownMenu
                        trigger={
                          <Button 
                            variant="ghost" 
                            size="icon"
                            type="button"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Use window.location for reliable full-page navigation
                            window.location.href = `/seller/rfqs/${rfq.id}`;
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

