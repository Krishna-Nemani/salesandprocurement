/**
 * Shared status badge components
 */
import { Badge } from "@/components/ui/badge";
import { 
  RFQStatus, 
  QuotationStatus, 
  ContractStatus, 
  POStatus, 
  SOStatus, 
  DNStatus, 
  PLStatus, 
  InvoiceStatus 
} from "@prisma/client";

const statusColors: Record<string, Record<string, string>> = {
  RFQ: {
    DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    PENDING: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
    APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  Quotation: {
    DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    ACCEPTED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    SENT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  Contract: {
    DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    SENT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    SIGNED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    PENDING_CHANGES: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  },
  PO: {
    DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  SO: {
    DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    PROCESSING: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    SHIPPED: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    DELIVERED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
  DN: {
    PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    IN_TRANSIT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    DISPUTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    ACCEPTED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  },
  PL: {
    PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    IN_TRANSIT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    DELIVERED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    ACCEPTED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  },
  Invoice: {
    DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    PAID: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    OVERDUE: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
};

const statusLabels: Record<string, Record<string, string>> = {
  RFQ: {
    DRAFT: "Draft",
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Declined",
    COMPLETED: "Completed",
  },
  Quotation: {
    DRAFT: "Draft",
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    ACCEPTED: "Accepted",
    SENT: "Sent",
  },
  Contract: {
    DRAFT: "Draft",
    SENT: "Sent",
    SIGNED: "Signed",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PENDING_CHANGES: "Pending Changes",
  },
  PO: {
    DRAFT: "Draft",
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    COMPLETED: "Completed",
  },
  SO: {
    DRAFT: "Draft",
    PENDING: "Pending",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  },
  DN: {
    PENDING: "Pending",
    IN_TRANSIT: "In Transit",
    COMPLETED: "Completed",
    DISPUTED: "Disputed",
    ACCEPTED: "Accepted",
  },
  PL: {
    PENDING: "Pending",
    IN_TRANSIT: "In Transit",
    DELIVERED: "Delivered",
    REJECTED: "Rejected",
    ACCEPTED: "Accepted",
  },
  Invoice: {
    DRAFT: "Draft",
    PENDING: "Pending",
    PAID: "Paid",
    OVERDUE: "Overdue",
    REJECTED: "Rejected",
  },
};

export function getStatusBadge(
  status: RFQStatus | QuotationStatus | ContractStatus | POStatus | SOStatus | DNStatus | PLStatus | InvoiceStatus,
  type: "RFQ" | "Quotation" | "Contract" | "PO" | "SO" | "DN" | "PL" | "Invoice"
) {
  const statusStr = status.toString();
  const colors = statusColors[type] || statusColors.RFQ;
  const labels = statusLabels[type] || statusLabels.RFQ;
  
  return (
    <Badge className={colors[statusStr] || colors.DRAFT}>
      {labels[statusStr] || statusStr}
    </Badge>
  );
}

