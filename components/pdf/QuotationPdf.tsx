import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

interface QuotationItem {
  serialNumber: number;
  productName: string;
  productDescription: string | null;
  sku: string | null;
  hsnCode: string | null;
  uom: string | null;
  quantity: number;
  unitPrice: number;
  subTotal: number;
}

interface QuotationData {
  quoteId: string;
  rfqId: string | null;
  quoteDateIssued: Date | string;
  quoteValidDate: Date | string;
  currency: string;
  buyerCompanyName: string;
  buyerContactName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  buyerAddress: string | null;
  sellerCompanyName: string;
  sellerContactName: string | null;
  sellerEmail: string | null;
  sellerPhone: string | null;
  sellerAddress: string | null;
  sumOfSubTotal: number;
  discountPercentage: number | null;
  additionalCharges: number | null;
  taxPercentage: number | null;
  totalAmount: number;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  termsAndConditions: string | null;
  notes: string | null;
  signatureByName: string | null;
  signatureUrl: string | null;
  items: QuotationItem[];
  companyLogoUrl?: string | null;
  companyName?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 50,
    height: 20,
    marginRight: 12,
  },
  companyName: {
    fontSize: 10,
    color: "#333333",
    flex: 1,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#000000",
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#000000",
  },
  threeColumn: {
    flexDirection: "row",
    marginBottom: 12,
  },
  column: {
    flex: 1,
    paddingRight: 8,
  },
  columnLast: {
    flex: 1,
    paddingLeft: 8,
  },
  twoColumn: {
    flexDirection: "row",
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666666",
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: "#000000",
    marginBottom: 6,
  },
  table: {
    width: "100%",
    marginTop: 8,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottom: "1px solid #e0e0e0",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottom: "1px solid #e0e0e0",
  },
  tableCell: {
    fontSize: 9,
    color: "#000000",
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000000",
    paddingHorizontal: 4,
  },
  colSNo: { width: "5%" },
  colProductName: { width: "15%" },
  colDescription: { width: "15%" },
  colSKU: { width: "10%" },
  colHSN: { width: "10%" },
  colUOM: { width: "8%" },
  colQuantity: { width: "10%" },
  colUnitPrice: { width: "12%" },
  colSubTotal: { width: "15%" },
  summaryBox: {
    marginTop: 8,
    marginLeft: "auto",
    width: "40%",
    border: "1px solid #e0e0e0",
    padding: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#666666",
  },
  summaryValue: {
    fontSize: 9,
    color: "#000000",
    fontWeight: "bold",
  },
  textBlock: {
    marginBottom: 8,
  },
  textBlockTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#000000",
  },
  textBlockContent: {
    fontSize: 9,
    color: "#000000",
    lineHeight: 1.4,
    marginBottom: 6,
  },
  signatureSection: {
    marginTop: 14,
  },
  signatureRow: {
    marginBottom: 8,
  },
  signatureImage: {
    width: 80,
    height: 40,
    marginTop: 4,
    border: "1px solid #e0e0e0",
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#666666",
    paddingHorizontal: 20,
  },
  grayBar: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 10,
    marginHorizontal: 0,
  },
  grayBarText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#000000",
  },
});

const getCurrencySymbol = (currency: string): string => {
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

const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatCurrency = (amount: number, currency: string): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const QuotationPdfDocument: React.FC<{ quotation: QuotationData }> = ({
  quotation,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {quotation.companyLogoUrl && (
              <Image src={quotation.companyLogoUrl} style={styles.logo} />
            )}
            {quotation.companyName && (
              <Text style={styles.companyName}>{quotation.companyName}</Text>
            )}
          </View>
          <Text style={styles.documentTitle}>QUOTATION</Text>
        </View>

        {/* Quote By, Quote To, Quote Info */}
        <View style={styles.section}>
          <View style={styles.threeColumn}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Quote By</Text>
              <Text style={styles.label}>Company Name</Text>
              <Text style={styles.value}>{quotation.sellerCompanyName}</Text>
              {quotation.sellerContactName && (
                <>
                  <Text style={styles.label}>Contact Name</Text>
                  <Text style={styles.value}>{quotation.sellerContactName}</Text>
                </>
              )}
              {quotation.sellerEmail && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{quotation.sellerEmail}</Text>
                </>
              )}
              {quotation.sellerPhone && (
                <>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>{quotation.sellerPhone}</Text>
                </>
              )}
              {quotation.sellerAddress && (
                <>
                  <Text style={styles.label}>Address</Text>
                  <Text style={styles.value}>{quotation.sellerAddress}</Text>
                </>
              )}
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Quote To</Text>
              <Text style={styles.label}>Company Name</Text>
              <Text style={styles.value}>{quotation.buyerCompanyName}</Text>
              {quotation.buyerContactName && (
                <>
                  <Text style={styles.label}>Contact Name</Text>
                  <Text style={styles.value}>{quotation.buyerContactName}</Text>
                </>
              )}
              {quotation.buyerEmail && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{quotation.buyerEmail}</Text>
                </>
              )}
              {quotation.buyerPhone && (
                <>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>{quotation.buyerPhone}</Text>
                </>
              )}
              {quotation.buyerAddress && (
                <>
                  <Text style={styles.label}>Address</Text>
                  <Text style={styles.value}>{quotation.buyerAddress}</Text>
                </>
              )}
            </View>
            <View style={styles.columnLast}>
              <Text style={styles.sectionTitle}>Quote Info</Text>
              <Text style={styles.label}>Quote ID</Text>
              <Text style={styles.value}>{quotation.quoteId}</Text>
              {quotation.rfqId && (
                <>
                  <Text style={styles.label}>RFQ ID</Text>
                  <Text style={styles.value}>{quotation.rfqId}</Text>
                </>
              )}
              <Text style={styles.label}>Date Issued</Text>
              <Text style={styles.value}>
                {formatDate(quotation.quoteDateIssued)}
              </Text>
              <Text style={styles.label}>Due Date</Text>
              <Text style={styles.value}>
                {formatDate(quotation.quoteValidDate)}
              </Text>
              <Text style={styles.label}>Currency</Text>
              <Text style={styles.value}>
                {quotation.currency} - {getCurrencySymbol(quotation.currency)}
              </Text>
              {quotation.rfqId && (
                <>
                  <Text style={styles.label}>RFQ Valid Date</Text>
                  <Text style={styles.value}>
                    {formatDate(quotation.quoteValidDate)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* List of Products / Services */}
        <View style={styles.grayBar}>
          <Text style={styles.grayBarText}>List of Products / Services</Text>
        </View>
        <View style={styles.section}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colSNo]}>S.No</Text>
              <Text style={[styles.tableHeaderCell, styles.colProductName]}>
                Product Name
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colDescription]}>
                Product Description
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colSKU]}>SKU</Text>
              <Text style={[styles.tableHeaderCell, styles.colHSN]}>
                HSN Code
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colUOM]}>UoM</Text>
              <Text style={[styles.tableHeaderCell, styles.colQuantity]}>
                Quantity
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colUnitPrice]}>
                Unit Price
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colSubTotal]}>
                Sub Total
              </Text>
            </View>
            {quotation.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colSNo]}>
                  {item.serialNumber}
                </Text>
                <Text style={[styles.tableCell, styles.colProductName]}>
                  {item.productName}
                </Text>
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {item.productDescription || "Content"}
                </Text>
                <Text style={[styles.tableCell, styles.colSKU]}>
                  {item.sku || "Content"}
                </Text>
                <Text style={[styles.tableCell, styles.colHSN]}>
                  {item.hsnCode || "Content"}
                </Text>
                <Text style={[styles.tableCell, styles.colUOM]}>
                  {item.uom || "Content"}
                </Text>
                <Text style={[styles.tableCell, styles.colQuantity]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.tableCell, styles.colUnitPrice]}>
                  {formatCurrency(item.unitPrice, quotation.currency)}
                </Text>
                <Text style={[styles.tableCell, styles.colSubTotal]}>
                  {formatCurrency(item.subTotal, quotation.currency)}
                </Text>
              </View>
            ))}
          </View>

          {/* Summary */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sum of Sub Total</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(quotation.sumOfSubTotal, quotation.currency)}
              </Text>
            </View>
            {quotation.discountPercentage && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Disc Percentage</Text>
                <Text style={styles.summaryValue}>
                  {quotation.discountPercentage}%
                </Text>
              </View>
            )}
            {quotation.additionalCharges && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Add&apos;l Charges</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(
                    quotation.additionalCharges,
                    quotation.currency
                  )}
                </Text>
              </View>
            )}
            {quotation.taxPercentage && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax Percentage</Text>
                <Text style={styles.summaryValue}>
                  {quotation.taxPercentage}%
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: "bold" }]}>
                Total
              </Text>
              <Text style={[styles.summaryValue, { fontSize: 11 }]}>
                {formatCurrency(quotation.totalAmount, quotation.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Miscellaneous */}
        {(quotation.paymentTerms ||
          quotation.deliveryTerms ||
          quotation.termsAndConditions ||
          quotation.notes) && (
          <View style={styles.grayBar}>
            <Text style={styles.grayBarText}>Miscellaneous</Text>
          </View>
        )}
        <View style={styles.section}>
          {quotation.paymentTerms && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Payment Terms</Text>
              <Text style={styles.textBlockContent}>
                {quotation.paymentTerms}
              </Text>
            </View>
          )}
          {quotation.deliveryTerms && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Delivery Terms</Text>
              <Text style={styles.textBlockContent}>
                {quotation.deliveryTerms}
              </Text>
            </View>
          )}
          {quotation.termsAndConditions && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Terms and Conditions</Text>
              <Text style={styles.textBlockContent}>
                {quotation.termsAndConditions}
              </Text>
            </View>
          )}
          {quotation.notes && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Notes</Text>
              <Text style={styles.textBlockContent}>{quotation.notes}</Text>
            </View>
          )}
        </View>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Signature By</Text>
          {quotation.signatureByName && (
            <View style={styles.signatureRow}>
              <Text style={styles.label}>Name of the user</Text>
              <Text style={styles.value}>{quotation.signatureByName}</Text>
            </View>
          )}
          <View style={styles.signatureRow}>
            <Text style={styles.label}>Acknowledgement (Signature)</Text>
            {quotation.signatureUrl ? (
              <Image src={quotation.signatureUrl} style={styles.signatureImage} />
            ) : (
              <View
                style={[
                  styles.signatureImage,
                  {
                    backgroundColor: "#f5f5f5",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text style={{ fontSize: 8, color: "#999" }}>LOGO</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages} | Generated on ${new Date().toLocaleDateString()}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};

