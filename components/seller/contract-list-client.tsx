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
  Eye,
  Pencil,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Download,
} from "lucide-react";
import { ContractStatus } from "@prisma/client";
import { DatePicker } from "@/components/ui/date-picker";

interface ContractItem {
  id: string;
  serialNumber: number;
  productName: string;
  productDescription?: string | null;
  sku?: string | null;
  hsnCode?: string | null;
  uom?: string | null;
  quantity: number;
  unitPrice: number;
}

interface Contract {
  id: string;
  contractId: string;
  quotationId?: string | null;
  rfqId?: string | null;
  buyerCompanyName: string;
  effectiveDate: Date;
  endDate: Date;
  status: ContractStatus;
  createdAt: Date;
  updatedAt: Date;
  quotation?: {
    quoteId: string;
  } | null;
  rfq?: {
    rfqId: string;
    projectName?: string | null;
  } | null;
}

export function SellerContractListClient() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "ALL">("ALL");
  const [buyerFilter, setBuyerFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Fetch contracts
  const fetchContracts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (buyerFilter !== "ALL") params.append("buyer", buyerFilter);

      const response = await fetch(`/api/seller/contracts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch contracts");
      }
      const data = await response.json();
      setContracts(data);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [statusFilter, buyerFilter]);

  // Get unique buyers for filter
  const uniqueBuyers = useMemo(() => {
    const buyers = new Set<string>();
    contracts.forEach((contract) => {
      if (contract.buyerCompanyName) {
        buyers.add(contract.buyerCompanyName);
      }
    });
    return Array.from(buyers).sort();
  }, [contracts]);

  // Filter contracts by search query and date range (client-side)
  const filteredContracts = useMemo(() => {
    let filtered = contracts;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((contract) => {
        return (
          contract.contractId.toLowerCase().includes(query) ||
          contract.buyerCompanyName.toLowerCase().includes(query) ||
          (contract.quotation?.quoteId && contract.quotation.quoteId.toLowerCase().includes(query)) ||
          (contract.rfq?.rfqId && contract.rfq.rfqId.toLowerCase().includes(query))
        );
      });
    }

    // Filter by date range if dates are selected
    if (dateFrom || dateTo) {
      filtered = filtered.filter((contract) => {
        const contractDate = new Date(contract.createdAt);
        if (dateFrom && contractDate < dateFrom) return false;
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (contractDate > toDate) return false;
        }
        return true;
      });
    }

    return filtered;
  }, [contracts, searchQuery, dateFrom, dateTo]);

  // Calculate overview stats (from all contracts, not filtered)
  const stats = useMemo(() => {
    return {
      total: contracts.length,
      pending: contracts.filter((c) => c.status === ContractStatus.SENT || c.status === ContractStatus.PENDING_CHANGES).length,
      accepted: contracts.filter((c) => c.status === ContractStatus.ACCEPTED || c.status === ContractStatus.SIGNED).length,
      rejected: contracts.filter((c) => c.status === ContractStatus.REJECTED).length,
    };
  }, [contracts]);

  const getStatusBadge = (status: ContractStatus) => {
    const colors: Record<ContractStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      SENT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      SIGNED: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      PENDING_CHANGES: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    };

    const labels: Record<ContractStatus, string> = {
      DRAFT: "Draft",
      SENT: "Sent",
      SIGNED: "Signed",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      PENDING_CHANGES: "Pending Changes",
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contract?")) {
      return;
    }

    try {
      const response = await fetch(`/api/seller/contracts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete contract");
      }

      // Refresh the list
      fetchContracts();
    } catch (error) {
      console.error("Error deleting contract:", error);
      alert("Failed to delete contract");
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert("Export functionality will be implemented");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading contracts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Contracts List</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={() => router.push("/seller/contracts/new")}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Contract
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Contracts</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-500" />
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
              <p className="text-sm text-muted-foreground">Accepted Contracts</p>
              <p className="text-2xl font-bold mt-1">{stats.accepted}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rejected Contracts</p>
              <p className="text-2xl font-bold mt-1">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title or buyer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContractStatus | "ALL")}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="ALL">All Statuses</option>
              <option value={ContractStatus.DRAFT}>Draft</option>
              <option value={ContractStatus.SENT}>Sent</option>
              <option value={ContractStatus.SIGNED}>Signed</option>
              <option value={ContractStatus.APPROVED}>Approved</option>
              <option value={ContractStatus.REJECTED}>Rejected</option>
              <option value={ContractStatus.PENDING_CHANGES}>Pending Changes</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Buyer</label>
            <select
              value={buyerFilter}
              onChange={(e) => setBuyerFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="ALL">All Buyers</option>
              {uniqueBuyers.map((buyer) => (
                <option key={buyer} value={buyer}>
                  {buyer}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="flex gap-2">
              <DatePicker
                date={dateFrom}
                onDateChange={setDateFrom}
                placeholder="Select Date"
              />
              <DatePicker
                date={dateTo}
                onDateChange={setDateTo}
                placeholder="Select Date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract ID</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No contracts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contract.contractId}
                    </TableCell>
                    <TableCell>{contract.buyerCompanyName}</TableCell>
                    <TableCell>{formatDate(contract.createdAt)}</TableCell>
                    <TableCell>{formatDate(contract.updatedAt)}</TableCell>
                    <TableCell>{formatDate(contract.endDate)}</TableCell>
                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = `/seller/contracts/${contract.id}`;
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/seller/contracts/${contract.id}/edit`);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(contract.id);
                          }}
                          className="text-red-600"
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

