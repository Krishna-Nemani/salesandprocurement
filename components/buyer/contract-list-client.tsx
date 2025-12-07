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
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
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
  sellerCompanyName: string;
  effectiveDate: Date;
  status: ContractStatus;
  agreedTotalValue: number;
  currency: string;
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

export function BuyerContractListClient() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingContractId, setProcessingContractId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "ALL" | "PENDING" | "ACCEPTED">("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Fetch contracts
  const fetchContracts = async (cacheBust = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      // Don't send grouped statuses to API, filter client-side instead
      if (statusFilter !== "ALL" && statusFilter !== "PENDING" && statusFilter !== "ACCEPTED") {
        params.append("status", statusFilter);
      }
      // Add cache-busting parameter if needed
      if (cacheBust) {
        params.append("_t", Date.now().toString());
      }

      const response = await fetch(`/api/buyer/contracts?${params.toString()}`, {
        cache: cacheBust ? "no-store" : "default",
      });
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

  // Handle accept contract
  const handleAccept = async (contractId: string) => {
    if (!confirm("Are you sure you want to accept this contract?")) {
      return;
    }

    setProcessingContractId(contractId);
    try {
      const response = await fetch(`/api/buyer/contracts/${contractId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to accept contract");
      }

      const updatedContract = await response.json();
      
      // Immediately update the local state to reflect the new status
      setContracts((prevContracts) =>
        prevContracts.map((contract) =>
          contract.id === contractId
            ? { ...contract, status: updatedContract.status as ContractStatus }
            : contract
        )
      );

      alert("Contract accepted successfully!");
      
      // Then refresh from server with cache-busting to ensure we have the latest data
      await fetchContracts(true);
    } catch (error) {
      console.error("Error accepting contract:", error);
      alert(error instanceof Error ? error.message : "Failed to accept contract");
    } finally {
      setProcessingContractId(null);
    }
  };

  // Handle reject contract
  const handleReject = async (contractId: string) => {
    if (!confirm("Are you sure you want to decline this contract?")) {
      return;
    }

    setProcessingContractId(contractId);
    try {
      const response = await fetch(`/api/buyer/contracts/${contractId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to decline contract");
      }

      const updatedContract = await response.json();
      
      // Immediately update the local state to reflect the new status
      setContracts((prevContracts) =>
        prevContracts.map((contract) =>
          contract.id === contractId
            ? { ...contract, status: updatedContract.status as ContractStatus }
            : contract
        )
      );

      alert("Contract declined successfully!");
      
      // Then refresh from server with cache-busting to ensure we have the latest data
      await fetchContracts(true);
    } catch (error) {
      console.error("Error declining contract:", error);
      alert(error instanceof Error ? error.message : "Failed to decline contract");
    } finally {
      setProcessingContractId(null);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []); // Fetch once on mount, filtering is done client-side

  // Filter contracts by search query, status, and date range (client-side)
  const filteredContracts = useMemo(() => {
    let filtered = contracts;
    
    // Filter by status (including grouped statuses)
    if (statusFilter === "PENDING") {
      filtered = filtered.filter((contract) => 
        contract.status === ContractStatus.SENT || 
        contract.status === ContractStatus.PENDING_CHANGES ||
        contract.status === ContractStatus.DRAFT
      );
    } else if (statusFilter === "ACCEPTED") {
      filtered = filtered.filter((contract) => 
        contract.status === ContractStatus.ACCEPTED || 
        contract.status === ContractStatus.SIGNED ||
        contract.status === ContractStatus.APPROVED
      );
    } else if (statusFilter !== "ALL") {
      filtered = filtered.filter((contract) => contract.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((contract) => {
        return (
          contract.contractId.toLowerCase().includes(query) ||
          contract.sellerCompanyName.toLowerCase().includes(query) ||
          (contract.quotation?.quoteId && contract.quotation.quoteId.toLowerCase().includes(query)) ||
          (contract.rfq?.rfqId && contract.rfq.rfqId.toLowerCase().includes(query)) ||
          (contract.rfq?.projectName && contract.rfq.projectName.toLowerCase().includes(query))
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
  }, [contracts, searchQuery, statusFilter, dateFrom, dateTo]);

  // Calculate overview stats
  const stats = useMemo(() => {
    return {
      total: contracts.length,
      pending: contracts.filter((c) => c.status === ContractStatus.SENT || c.status === ContractStatus.PENDING_CHANGES || c.status === ContractStatus.DRAFT).length,
      accepted: contracts.filter((c) => c.status === ContractStatus.ACCEPTED || c.status === ContractStatus.SIGNED || c.status === ContractStatus.APPROVED).length,
      rejected: contracts.filter((c) => c.status === ContractStatus.REJECTED).length,
    };
  }, [contracts]);

  const getStatusBadge = (status: ContractStatus) => {
    const colors: Record<ContractStatus, string> = {
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      SENT: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      SIGNED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      PENDING_CHANGES: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    };

    const labels: Record<ContractStatus, string> = {
      DRAFT: "Draft",
      SENT: "Pending",
      SIGNED: "Accepted",
      APPROVED: "Accepted",
      REJECTED: "Rejected",
      PENDING_CHANGES: "Pending",
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
      JPY: "¥",
      CNY: "¥",
      AUD: "A$",
      CAD: "C$",
      CHF: "CHF",
      SGD: "S$",
    };
    return symbols[currency] || currency;
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Contracts Received</h1>
        <p className="text-muted-foreground mt-2">
          A comprehensive list of all contracts received, with their current status and available actions.
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              onChange={(e) => setStatusFilter(e.target.value as ContractStatus | "ALL" | "PENDING" | "ACCEPTED")}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value={ContractStatus.REJECTED}>Rejected</option>
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
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">All Contracts</h2>
          <p className="text-sm text-muted-foreground">
            A comprehensive list of all contracts received, with their current status and available actions.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CONTRACT ID</TableHead>
                <TableHead>CONTRACT TITLE</TableHead>
                <TableHead>SELLER</TableHead>
                <TableHead>DATE RECEIVED</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No contracts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => {
                  // Show Accept/Decline buttons only for contracts that can be acted upon
                  // Hide them for APPROVED, REJECTED, SIGNED statuses
                  const canAcceptOrDecline = 
                    (contract.status === ContractStatus.SENT || 
                     contract.status === ContractStatus.PENDING_CHANGES ||
                     contract.status === ContractStatus.DRAFT) &&
                    contract.status !== ContractStatus.REJECTED &&
                    contract.status !== ContractStatus.SIGNED &&
                    contract.status !== ContractStatus.APPROVED;
                  
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {contract.contractId}
                      </TableCell>
                      <TableCell>
                        {contract.rfq?.projectName || `Contract ${contract.contractId}`}
                      </TableCell>
                      <TableCell>{contract.sellerCompanyName}</TableCell>
                      <TableCell>{formatDate(contract.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `/buyer/contracts/${contract.id}`;
                            }}
                          >
                            View Details
                          </Button>
                          {canAcceptOrDecline && (
                            <>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={processingContractId === contract.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAccept(contract.id);
                                }}
                              >
                                {processingContractId === contract.id ? "Processing..." : "Accept"}
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={processingContractId === contract.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log("Decline button clicked!", contract.id);
                                  handleReject(contract.id);
                                }}
                              >
                                {processingContractId === contract.id ? "Processing..." : "Decline"}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

