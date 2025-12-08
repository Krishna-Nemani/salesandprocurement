import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { CompanyType, RFQStatus, QuotationStatus, ContractStatus, POStatus, DNStatus, PLStatus, InvoiceStatus } from "@prisma/client";
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
  ShoppingCart,
  Truck,
  Package,
  Receipt,
  Users,
} from "lucide-react";

export default async function BuyerDashboardPage() {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/login");
  }

  // Ensure user is a buyer
  if (session.user.companyType !== CompanyType.BUYER) {
    redirect("/");
  }

  const buyerCompanyId = session.user.companyId;

  // Fetch all dashboard data in parallel
  const [
    rfqsData,
    quotationsData,
    contractsData,
    purchaseOrdersData,
    deliveryNotesData,
    packingListsData,
    invoicesData,
    topSellersData,
  ] = await Promise.all([
    // RFQs created by this buyer
    prisma.rFQ.findMany({
      where: {
        buyerCompanyId: buyerCompanyId,
      },
      select: {
        id: true,
        rfqId: true,
        projectName: true,
        status: true,
        dateIssued: true,
      },
      orderBy: {
        dateIssued: "desc",
      },
      take: 5,
    }),

    // Quotations received by this buyer
    prisma.quotation.findMany({
      where: {
        buyerCompanyId: buyerCompanyId,
      },
      select: {
        id: true,
        quoteId: true,
        sellerCompanyName: true,
        status: true,
        quoteDateIssued: true,
        totalAmount: true,
      },
      orderBy: {
        quoteDateIssued: "desc",
      },
      take: 5,
    }),

    // Contracts received by this buyer
    prisma.contract.findMany({
      where: {
        buyerCompanyId: buyerCompanyId,
      },
      select: {
        id: true,
        status: true,
      },
    }),

    // Purchase Orders created by this buyer
    prisma.purchaseOrder.findMany({
      where: {
        buyerCompanyId: buyerCompanyId,
      },
      select: {
        id: true,
        poId: true,
        sellerCompanyName: true,
        status: true,
        poIssuedDate: true,
        totalAmount: true,
      },
      orderBy: {
        poIssuedDate: "desc",
      },
      take: 5,
    }),

    // Delivery Notes received by this buyer
    prisma.deliveryNote.findMany({
      where: {
        buyerCompanyId: buyerCompanyId,
      },
      select: {
        id: true,
        status: true,
      },
    }),

    // Packing Lists received by this buyer
    prisma.packingList.findMany({
      where: {
        buyerCompanyId: buyerCompanyId,
      },
      select: {
        id: true,
        status: true,
      },
    }),

    // Invoices received by this buyer
    prisma.invoice.findMany({
      where: {
        buyerCompanyId: buyerCompanyId,
      },
      select: {
        id: true,
        invoiceId: true,
        sellerCompanyName: true,
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

    // Top sellers - aggregate by invoice value
    prisma.invoice.groupBy({
      by: ["sellerCompanyName"],
      where: {
        buyerCompanyId: buyerCompanyId,
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
    where: { buyerCompanyId: buyerCompanyId },
  });

  const rfqsOpen = await prisma.rFQ.count({
    where: {
      buyerCompanyId: buyerCompanyId,
      status: {
        in: [RFQStatus.PENDING, RFQStatus.DRAFT],
      },
    },
  });

  const quotationsTotal = await prisma.quotation.count({
    where: { buyerCompanyId: buyerCompanyId },
  });

  const quotationsPending = await prisma.quotation.count({
    where: {
      buyerCompanyId: buyerCompanyId,
      status: {
        in: [QuotationStatus.PENDING, QuotationStatus.SENT],
      },
    },
  });

  const contractsActive = contractsData.filter(
    (c) => c.status === ContractStatus.APPROVED || c.status === ContractStatus.SIGNED
  ).length;

  const purchaseOrdersTotal = await prisma.purchaseOrder.count({
    where: { buyerCompanyId: buyerCompanyId },
  });

  const purchaseOrdersPending = await prisma.purchaseOrder.count({
    where: {
      buyerCompanyId: buyerCompanyId,
      status: {
        in: [POStatus.PENDING, POStatus.DRAFT],
      },
    },
  });

  const deliveryNotesTotal = deliveryNotesData.length;

  const deliveryNotesPending = deliveryNotesData.filter(
    (dn) => dn.status === DNStatus.PENDING || dn.status === DNStatus.IN_TRANSIT
  ).length;

  const packingListsTotal = packingListsData.length;

  const packingListsPending = packingListsData.filter(
    (pl) => pl.status === PLStatus.PENDING || pl.status === PLStatus.RECEIVED
  ).length;

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

  // Filter out null sellerCompanyName from top sellers and take top 3
  const topSellersFiltered = topSellersData
    .filter((seller) => seller.sellerCompanyName !== null)
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
      COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      // Quotation
      ACCEPTED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      SENT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      // Contract
      SIGNED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      // Delivery Note
      IN_TRANSIT: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      ACKNOWLEDGED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
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
            <CardTitle className="text-sm font-medium">RFQs Created</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfqsTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {rfqsOpen} open RFQs
            </p>
          </CardContent>
        </Card>

        {/* Quotations Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quotations Received</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotationsTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {quotationsPending} pending action
            </p>
          </CardContent>
        </Card>

        {/* Purchase Orders Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrdersTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {purchaseOrdersPending} pending confirmation
            </p>
          </CardContent>
        </Card>

        {/* Deliveries Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryNotesTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {deliveryNotesPending} pending acknowledgement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Card - Full Width */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Invoices</CardTitle>
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
                No RFQs created yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ ID</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfqsData.map((rfq) => (
                    <TableRow key={rfq.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/buyer/rfqs/${rfq.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {rfq.rfqId}
                        </Link>
                      </TableCell>
                      <TableCell>{rfq.projectName || "-"}</TableCell>
                      <TableCell>{formatDate(rfq.dateIssued)}</TableCell>
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
                No quotations received yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote ID</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotationsData.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/buyer/quotations/${quote.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {quote.quoteId}
                        </Link>
                      </TableCell>
                      <TableCell>{quote.sellerCompanyName || "-"}</TableCell>
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

      {/* Recent Activity - Purchase Orders & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {purchaseOrdersData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No purchase orders created yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrdersData.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/buyer/purchase-orders/${po.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {po.poId}
                        </Link>
                      </TableCell>
                      <TableCell>{po.sellerCompanyName || "-"}</TableCell>
                      <TableCell>{formatDate(po.poIssuedDate)}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(po.totalAmount || 0))}
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
                No invoices received yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/buyer/invoices/${inv.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {inv.invoiceId}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.sellerCompanyName || "-"}</TableCell>
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

      {/* Top Sellers */}
      {topSellersFiltered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Sellers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSellersFiltered.map((seller, index) => (
                <div
                  key={seller.sellerCompanyName}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{seller.sellerCompanyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {seller._count.id} invoice{seller._count.id !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(Number(seller._sum.totalAmount || 0))}
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

