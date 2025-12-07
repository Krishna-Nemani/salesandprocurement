import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, RFQStatus, QuotationStatus, ContractStatus, SOStatus, DNStatus, PLStatus, InvoiceStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FileText,
  ClipboardList,
  FileCheck,
  Truck,
  Package,
  Receipt,
  Users,
} from "lucide-react";

export default async function SellerDashboardPage() {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/login");
  }

  // Ensure user is a seller
  if (session.user.companyType !== CompanyType.SELLER) {
    redirect("/");
  }

  const sellerCompanyId = session.user.companyId;

  // Get seller company name for RFQ matching
  const sellerCompany = await prisma.company.findUnique({
    where: { id: sellerCompanyId },
    select: { name: true },
  });

  // Fetch all dashboard data in parallel
  const [
    rfqsData,
    quotationsData,
    contractsData,
    salesOrdersData,
    deliveryNotesData,
    packingListsData,
    invoicesData,
    topBuyersData,
  ] = await Promise.all([
    // RFQs received by this seller (match by sellerCompanyId or sellerCompanyName)
    prisma.rFQ.findMany({
      where: {
        OR: [
          { sellerCompanyId: sellerCompanyId },
          ...(sellerCompany
            ? [
                {
                  sellerCompanyId: null,
                  sellerCompanyName: {
                    equals: sellerCompany.name,
                    mode: "insensitive",
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        rfqId: true,
        projectName: true,
        buyerCompanyName: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),

    // Quotations created by this seller
    prisma.quotation.findMany({
      where: {
        sellerCompanyId: sellerCompanyId,
      },
      select: {
        id: true,
        quoteId: true,
        buyerCompanyName: true,
        status: true,
        quoteDateIssued: true,
        totalAmount: true,
      },
      orderBy: {
        quoteDateIssued: "desc",
      },
      take: 5,
    }),

    // Contracts created by this seller
    prisma.contract.findMany({
      where: {
        sellerCompanyId: sellerCompanyId,
      },
      select: {
        id: true,
        status: true,
      },
    }),

    // Sales Orders created by this seller
    prisma.salesOrder.findMany({
      where: {
        sellerCompanyId: sellerCompanyId,
      },
      select: {
        id: true,
        soId: true,
        buyerCompanyName: true,
        status: true,
        soCreatedDate: true,
        totalAmount: true,
      },
      orderBy: {
        soCreatedDate: "desc",
      },
      take: 5,
    }),

    // Delivery Notes created by this seller
    prisma.deliveryNote.findMany({
      where: {
        sellerCompanyId: sellerCompanyId,
      },
      select: {
        id: true,
        status: true,
      },
    }),

    // Packing Lists created by this seller
    prisma.packingList.findMany({
      where: {
        sellerCompanyId: sellerCompanyId,
      },
      select: {
        id: true,
      },
    }),

    // Invoices created by this seller
    prisma.invoice.findMany({
      where: {
        sellerCompanyId: sellerCompanyId,
      },
      select: {
        id: true,
        invoiceId: true,
        buyerCompanyName: true,
        status: true,
        invoiceDate: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
      },
      orderBy: {
        invoiceDate: "desc",
      },
      take: 5,
    }),

    // Top buyers - aggregate by invoice value (filter nulls after query)
    prisma.invoice.groupBy({
      by: ["buyerCompanyName"],
      where: {
        sellerCompanyId: sellerCompanyId,
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },
    }),
  ]);

  // Calculate counts and totals
  const rfqsTotal = await prisma.rFQ.count({
    where: {
      OR: [
        { sellerCompanyId: sellerCompanyId },
        ...(sellerCompany
          ? [
              {
                sellerCompanyId: null,
                sellerCompanyName: {
                  equals: sellerCompany.name,
                  mode: "insensitive",
                },
              },
            ]
          : []),
      ],
    },
  });

  const rfqsPending = await prisma.rFQ.count({
    where: {
      OR: [
        { sellerCompanyId: sellerCompanyId },
        ...(sellerCompany
          ? [
              {
                sellerCompanyId: null,
                sellerCompanyName: {
                  equals: sellerCompany.name,
                  mode: "insensitive",
                },
              },
            ]
          : []),
      ],
      status: {
        in: [RFQStatus.PENDING, RFQStatus.DRAFT],
      },
    },
  });

  const quotationsTotal = await prisma.quotation.count({
    where: { sellerCompanyId: sellerCompanyId },
  });

  const quotationsAccepted = await prisma.quotation.count({
    where: {
      sellerCompanyId: sellerCompanyId,
      status: QuotationStatus.ACCEPTED,
    },
  });

  const contractsActive = contractsData.filter(
    (c) => c.status === ContractStatus.APPROVED || c.status === ContractStatus.SIGNED
  ).length;

  const salesOrdersOpen = salesOrdersData.filter(
    (so) => so.status !== SOStatus.CANCELLED && so.status !== SOStatus.DELIVERED
  ).length;

  const deliveryNotesPending = deliveryNotesData.filter(
    (dn) => dn.status === DNStatus.IN_TRANSIT || dn.status === DNStatus.PENDING
  ).length;

  const packingListsTotal = packingListsData.length;

  // Calculate invoice totals
  const invoicesTotalAmount = invoicesData.reduce(
    (sum, inv) => sum + Number(inv.totalAmount || 0),
    0
  );

  const invoicesPendingAmount = invoicesData
    .filter((inv) => inv.status === InvoiceStatus.PENDING)
    .reduce((sum, inv) => sum + Number(inv.remainingAmount || inv.totalAmount || 0), 0);

  const invoicesOverdueAmount = invoicesData
    .filter((inv) => inv.status === InvoiceStatus.OVERDUE)
    .reduce((sum, inv) => sum + Number(inv.remainingAmount || inv.totalAmount || 0), 0);

  // Filter out null buyerCompanyName from top buyers and take top 3
  const topBuyersFiltered = topBuyersData
    .filter((buyer) => buyer.buyerCompanyName !== null)
    .slice(0, 3);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      // RFQ
      DRAFT: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
      PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      // Quotation
      ACCEPTED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      SENT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      // Contract
      SIGNED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      // Sales Order
      PROCESSING: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      SHIPPED: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      DELIVERED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      // Invoice
      PAID: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      OVERDUE: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    };

    const color = statusColors[status] || "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    return <Badge className={color}>{status.replace(/_/g, " ")}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your business activities</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RFQs Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RFQs Received</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfqsTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {rfqsPending} open RFQs
            </p>
          </CardContent>
        </Card>

        {/* Quotations Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quotations Sent</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotationsTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {quotationsAccepted} accepted
            </p>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Sales Orders</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesOrdersOpen}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {deliveryNotesPending} pending deliveries
            </p>
          </CardContent>
        </Card>

        {/* Invoices Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoicesTotalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(invoicesPendingAmount)} pending
              {invoicesOverdueAmount > 0 && (
                <span className="text-red-600 ml-1">
                  • {formatCurrency(invoicesOverdueAmount)} overdue
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - RFQs & Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent RFQs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent RFQs</CardTitle>
          </CardHeader>
          <CardContent>
            {rfqsData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No RFQs received yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfqsData.map((rfq) => (
                    <TableRow key={rfq.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/seller/rfqs/${rfq.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {rfq.rfqId}
                        </Link>
                      </TableCell>
                      <TableCell>{rfq.buyerCompanyName || "-"}</TableCell>
                      <TableCell>{formatDate(rfq.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Quotations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Quotations</CardTitle>
          </CardHeader>
          <CardContent>
            {quotationsData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No quotations sent yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotationsData.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/seller/quotations/${quote.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {quote.quoteId}
                        </Link>
                      </TableCell>
                      <TableCell>{quote.buyerCompanyName || "-"}</TableCell>
                      <TableCell>{formatDate(quote.quoteDateIssued)}</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(quote.totalAmount || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Sales Orders & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {salesOrdersData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sales orders created yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesOrdersData.map((so) => (
                    <TableRow key={so.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/seller/sales-orders/${so.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {so.soId}
                        </Link>
                      </TableCell>
                      <TableCell>{so.buyerCompanyName || "-"}</TableCell>
                      <TableCell>{formatDate(so.soCreatedDate)}</TableCell>
                      <TableCell>{getStatusBadge(so.status)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(so.totalAmount || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No invoices created yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/seller/invoices/${inv.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {inv.invoiceId}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.buyerCompanyName || "-"}</TableCell>
                      <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(inv.totalAmount || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Buyers */}
      {topBuyersFiltered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topBuyersFiltered.map((buyer, index) => (
                <div
                  key={buyer.buyerCompanyName}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{buyer.buyerCompanyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {buyer._count.id} invoice{buyer._count.id !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(Number(buyer._sum.totalAmount || 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">Total value</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

