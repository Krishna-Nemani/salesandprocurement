import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

interface ContractItem {
  serialNumber: number;
  productName: string;
  productDescription: string | null;
  sku: string | null;
  hsnCode: string | null;
  uom: string | null;
  quantity: number;
  unitPrice: number;
}

interface ContractData {
  contractId: string;
  quoteId: string | null;
  rfqId: string | null;
  effectiveDate: Date | string;
  endDate: Date | string;
  currency: string;
  agreedTotalValue: number | null;
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
  pricingTerms: string | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  confidentiality: string | null;
  indemnity: string | null;
  terminationConditions: string | null;
  disputeResolution: string | null;
  governingLaw: string | null;
  signatureByName: string | null;
  signatureUrl: string | null;
  items: ContractItem[];
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
  colSNo: { width: "6%" },
  colProductName: { width: "20%" },
  colDescription: { width: "20%" },
  colSKU: { width: "12%" },
  colHSN: { width: "12%" },
  colUOM: { width: "10%" },
  colQuantity: { width: "10%" },
  colUnitPrice: { width: "10%" },
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

export const ContractPdfDocument: React.FC<{ contract: ContractData }> = ({
  contract,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {contract.companyLogoUrl && (
              <Image src={contract.companyLogoUrl} style={styles.logo} />
            )}
            {contract.companyName && (
              <Text style={styles.companyName}>{contract.companyName}</Text>
            )}
          </View>
          <Text style={styles.documentTitle}>CONTRACT</Text>
        </View>

        {/* Seller, Buyer, Contract Info */}
        <View style={styles.section}>
          <View style={styles.threeColumn}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Seller</Text>
              <Text style={styles.label}>Company Name</Text>
              <Text style={styles.value}>{contract.sellerCompanyName}</Text>
              {contract.sellerContactName && (
                <>
                  <Text style={styles.label}>Contact Name</Text>
                  <Text style={styles.value}>{contract.sellerContactName}</Text>
                </>
              )}
              {contract.sellerEmail && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{contract.sellerEmail}</Text>
                </>
              )}
              {contract.sellerPhone && (
                <>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>{contract.sellerPhone}</Text>
                </>
              )}
              {contract.sellerAddress && (
                <>
                  <Text style={styles.label}>Address</Text>
                  <Text style={styles.value}>{contract.sellerAddress}</Text>
                </>
              )}
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Buyer</Text>
              <Text style={styles.label}>Company Name</Text>
              <Text style={styles.value}>{contract.buyerCompanyName}</Text>
              {contract.buyerContactName && (
                <>
                  <Text style={styles.label}>Contact Name</Text>
                  <Text style={styles.value}>{contract.buyerContactName}</Text>
                </>
              )}
              {contract.buyerEmail && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{contract.buyerEmail}</Text>
                </>
              )}
              {contract.buyerPhone && (
                <>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>{contract.buyerPhone}</Text>
                </>
              )}
              {contract.buyerAddress && (
                <>
                  <Text style={styles.label}>Address</Text>
                  <Text style={styles.value}>{contract.buyerAddress}</Text>
                </>
              )}
            </View>
            <View style={styles.columnLast}>
              <Text style={styles.sectionTitle}>Contract Info</Text>
              <Text style={styles.label}>Contract ID</Text>
              <Text style={styles.value}>{contract.contractId}</Text>
              {contract.quoteId && (
                <>
                  <Text style={styles.label}>Quote ID</Text>
                  <Text style={styles.value}>{contract.quoteId}</Text>
                </>
              )}
              {contract.rfqId && (
                <>
                  <Text style={styles.label}>RFQ ID</Text>
                  <Text style={styles.value}>{contract.rfqId}</Text>
                </>
              )}
              <Text style={styles.label}>Eff Date</Text>
              <Text style={styles.value}>
                {formatDate(contract.effectiveDate)}
              </Text>
              <Text style={styles.label}>End Date</Text>
              <Text style={styles.value}>{formatDate(contract.endDate)}</Text>
              <Text style={styles.label}>Currency</Text>
              <Text style={styles.value}>
                {contract.currency} - {getCurrencySymbol(contract.currency)}
              </Text>
              {contract.agreedTotalValue && (
                <>
                  <Text style={styles.label}>Agreed Value</Text>
                  <Text style={styles.value}>
                    {formatCurrency(contract.agreedTotalValue, contract.currency)}
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
            </View>
            {contract.items.map((item, index) => (
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
                  {formatCurrency(item.unitPrice, contract.currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Terms */}
        {(contract.pricingTerms ||
          contract.paymentTerms ||
          contract.deliveryTerms ||
          contract.confidentiality ||
          contract.indemnity ||
          contract.terminationConditions ||
          contract.disputeResolution ||
          contract.governingLaw) && (
          <View style={styles.grayBar}>
            <Text style={styles.grayBarText}>Terms</Text>
          </View>
        )}
        <View style={styles.section}>
          {contract.pricingTerms && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Pricing Terms</Text>
              <Text style={styles.textBlockContent}>
                {contract.pricingTerms}
              </Text>
            </View>
          )}
          {contract.paymentTerms && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Payment Terms</Text>
              <Text style={styles.textBlockContent}>
                {contract.paymentTerms}
              </Text>
            </View>
          )}
          {contract.deliveryTerms && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Delivery Terms</Text>
              <Text style={styles.textBlockContent}>
                {contract.deliveryTerms}
              </Text>
            </View>
          )}
          {contract.confidentiality && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Confidentiality</Text>
              <Text style={styles.textBlockContent}>
                {contract.confidentiality}
              </Text>
            </View>
          )}
          {contract.indemnity && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Indemnity</Text>
              <Text style={styles.textBlockContent}>{contract.indemnity}</Text>
            </View>
          )}
          {contract.terminationConditions && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Termination Conditions</Text>
              <Text style={styles.textBlockContent}>
                {contract.terminationConditions}
              </Text>
            </View>
          )}
          {contract.disputeResolution && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Dispute Resolution</Text>
              <Text style={styles.textBlockContent}>
                {contract.disputeResolution}
              </Text>
            </View>
          )}
          {contract.governingLaw && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Governing Law</Text>
              <Text style={styles.textBlockContent}>
                {contract.governingLaw}
              </Text>
            </View>
          )}
        </View>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Signature By</Text>
          {contract.signatureByName && (
            <View style={styles.signatureRow}>
              <Text style={styles.label}>Name of the user</Text>
              <Text style={styles.value}>{contract.signatureByName}</Text>
            </View>
          )}
          <View style={styles.signatureRow}>
            <Text style={styles.label}>Acknowledgement (Signature)</Text>
            {contract.signatureUrl ? (
              <Image src={contract.signatureUrl} style={styles.signatureImage} />
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

