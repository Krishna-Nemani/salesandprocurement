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
  Edit2,
  Trash2,
  Eye,
  Scale,
  Hourglass,
  Pencil,
  CheckCircle2,
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
  dateIssued: Date;
  dueDate: Date;
  status: RFQStatus;
  createdAt: Date;
  updatedAt: Date;
  sellerCompanyName?: string | null;
  items: RFQItem[];
}

export function RFQListClient() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RFQStatus | "ALL">("ALL");

  // Fetch RFQs
  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const response = await fetch(`/api/buyer/rfqs?${params.toString()}`);
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
  }, []);

  // Filter RFQs
  const filteredRFQs = useMemo(() => {
    return rfqs.filter((rfq) => {
      const matchesSearch =
        rfq.rfqId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rfq.projectName && rfq.projectName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || rfq.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rfqs, searchQuery, statusFilter]);

  // Calculate overview stats
  const stats = useMemo(() => {
    return {
      total: rfqs.length,
      pending: rfqs.filter((r) => r.status === RFQStatus.PENDING).length,
      drafts: rfqs.filter((r) => r.status === RFQStatus.DRAFT).length,
      completed: rfqs.filter((r) => r.status === RFQStatus.COMPLETED).length,
    };
  }, [rfqs]);

  const handleDelete = async (rfqId: string) => {
    if (!window.confirm("Are you sure you want to delete this RFQ?")) {
      return;
    }

    setIsDeleting(rfqId);
    try {
      const response = await fetch(`/api/buyer/rfqs/${rfqId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete RFQ");
      }

      await fetchRFQs();
    } catch (error) {
      console.error("Error deleting RFQ:", error);
      alert(error instanceof Error ? error.message : "Failed to delete RFQ");
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadge = (status: RFQStatus) => {
    const colors: Record<RFQStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      PENDING: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
      APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    };

    return (
      <Badge className={colors[status]}>
        {status}
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
        <h1 className="text-3xl font-bold">My RFQs Overview</h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total RFQs</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <Scale className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold mt-1">{stats.pending}</p>
            </div>
            <Hourglass className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="text-2xl font-bold mt-1">{stats.drafts}</p>
            </div>
            <Pencil className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold mt-1">{stats.completed}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* My RFQ List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My RFQ List</h2>
          <Button onClick={() => router.push("/buyer/rfqs/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create New RFQ
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search RFQs by ID, status, or"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu
            trigger={
              <Button variant="outline" size="default">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            }
          >
            <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter(RFQStatus.DRAFT)}>
              Draft
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter(RFQStatus.PENDING)}>
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter(RFQStatus.APPROVED)}>
              Approved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter(RFQStatus.REJECTED)}>
              Rejected
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter(RFQStatus.COMPLETED)}>
              Completed
            </DropdownMenuItem>
          </DropdownMenu>
        </div>

        {/* RFQ Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ ID</TableHead>
                <TableHead>Seller Name</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>RFQ Deadline Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRFQs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchQuery || statusFilter !== "ALL"
                      ? "No RFQs found matching your search criteria."
                      : "No RFQs found. Click 'Create New RFQ' to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRFQs.map((rfq) => (
                  <TableRow key={rfq.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/buyer/rfqs/${rfq.id}`}
                        className="text-primary hover:underline"
                      >
                        {rfq.rfqId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {rfq.sellerCompanyName || "-"}
                    </TableCell>
                    <TableCell>{formatDate(rfq.dateIssued)}</TableCell>
                    <TableCell>{formatDate(rfq.updatedAt)}</TableCell>
                    <TableCell>{formatDate(rfq.dueDate)}</TableCell>
                    <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem onClick={() => router.push(`/buyer/rfqs/${rfq.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/buyer/rfqs/${rfq.id}/edit`)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(rfq.id)}
                          disabled={isDeleting === rfq.id}
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

