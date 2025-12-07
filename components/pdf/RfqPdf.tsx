import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

// Register fonts if needed
// Font.register({ family: "Arial", src: "/path/to/arial.ttf" });

interface RFQItem {
  serialNumber: number;
  productName: string;
  productDescription: string | null;
  sku: string | null;
  hsnCode: string | null;
  uom: string | null;
  quantity: number;
}

interface RFQData {
  rfqId: string;
  dateIssued: Date | string;
  dueDate: Date | string;
  currency: string;
  projectName: string | null;
  projectDescription: string | null;
  buyerCompanyName: string;
  buyerContactName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  buyerAddress: string | null;
  sellerCompanyName: string | null;
  sellerContactName: string | null;
  sellerEmail: string | null;
  sellerPhone: string | null;
  sellerAddress: string | null;
  technicalRequirements: string | null;
  deliveryRequirements: string | null;
  termsAndConditions: string | null;
  notes: string | null;
  signatureByName: string | null;
  signatureUrl: string | null;
  items: RFQItem[];
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
  twoColumn: {
    flexDirection: "row",
    marginBottom: 12,
  },
  column: {
    flex: 1,
    paddingRight: 12,
  },
  columnLast: {
    flex: 1,
    paddingLeft: 12,
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
  colProductName: { width: "18%" },
  colDescription: { width: "20%" },
  colSKU: { width: "12%" },
  colHSN: { width: "12%" },
  colUOM: { width: "10%" },
  colQuantity: { width: "12%" },
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

export const RfqPdfDocument: React.FC<{ rfq: RFQData }> = ({ rfq }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {rfq.companyLogoUrl && (
              <Image src={rfq.companyLogoUrl} style={styles.logo} />
            )}
            {rfq.companyName && (
              <Text style={styles.companyName}>{rfq.companyName}</Text>
            )}
          </View>
          <Text style={styles.documentTitle}>REQUEST FOR QUOTATION</Text>
        </View>

        {/* RFQ Details */}
        <View style={styles.section}>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <Text style={styles.label}>RFQ ID</Text>
              <Text style={styles.value}>{rfq.rfqId}</Text>
            </View>
            <View style={styles.columnLast}>
              <Text style={styles.label}>Date Issued</Text>
              <Text style={styles.value}>{formatDate(rfq.dateIssued)}</Text>
            </View>
          </View>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <Text style={styles.label}>Due Date</Text>
              <Text style={styles.value}>{formatDate(rfq.dueDate)}</Text>
            </View>
            <View style={styles.columnLast}>
              <Text style={styles.label}>Currency</Text>
              <Text style={styles.value}>
                {rfq.currency} - {getCurrencySymbol(rfq.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Project Details */}
        {rfq.projectName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Details</Text>
            <Text style={styles.label}>Project Name</Text>
            <Text style={styles.value}>{rfq.projectName}</Text>
            {rfq.projectDescription && (
              <>
                <Text style={styles.label}>Project Description</Text>
                <Text style={styles.value}>{rfq.projectDescription}</Text>
              </>
            )}
          </View>
        )}

        {/* Party Details */}
        <View style={styles.section}>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Buyer Details</Text>
              <Text style={styles.label}>Buyer Company Name</Text>
              <Text style={styles.value}>{rfq.buyerCompanyName}</Text>
              {rfq.buyerContactName && (
                <>
                  <Text style={styles.label}>Buyer Contact Name</Text>
                  <Text style={styles.value}>{rfq.buyerContactName}</Text>
                </>
              )}
              {rfq.buyerEmail && (
                <>
                  <Text style={styles.label}>Buyer Email</Text>
                  <Text style={styles.value}>{rfq.buyerEmail}</Text>
                </>
              )}
              {rfq.buyerPhone && (
                <>
                  <Text style={styles.label}>Buyer Phone</Text>
                  <Text style={styles.value}>{rfq.buyerPhone}</Text>
                </>
              )}
              {rfq.buyerAddress && (
                <>
                  <Text style={styles.label}>Buyer Address</Text>
                  <Text style={styles.value}>{rfq.buyerAddress}</Text>
                </>
              )}
            </View>
            <View style={styles.columnLast}>
              <Text style={styles.sectionTitle}>Seller Details</Text>
              {rfq.sellerCompanyName ? (
                <>
                  <Text style={styles.label}>Seller Company Name</Text>
                  <Text style={styles.value}>{rfq.sellerCompanyName}</Text>
                </>
              ) : (
                <Text style={styles.value}>-</Text>
              )}
              {rfq.sellerContactName && (
                <>
                  <Text style={styles.label}>Seller Contact Name</Text>
                  <Text style={styles.value}>{rfq.sellerContactName}</Text>
                </>
              )}
              {rfq.sellerEmail && (
                <>
                  <Text style={styles.label}>Seller Email</Text>
                  <Text style={styles.value}>{rfq.sellerEmail}</Text>
                </>
              )}
              {rfq.sellerPhone && (
                <>
                  <Text style={styles.label}>Seller Phone</Text>
                  <Text style={styles.value}>{rfq.sellerPhone}</Text>
                </>
              )}
              {rfq.sellerAddress && (
                <>
                  <Text style={styles.label}>Seller Address</Text>
                  <Text style={styles.value}>{rfq.sellerAddress}</Text>
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
            </View>
            {rfq.items.map((item, index) => (
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
              </View>
            ))}
          </View>
        </View>

        {/* Miscellaneous */}
        {(rfq.technicalRequirements ||
          rfq.deliveryRequirements ||
          rfq.termsAndConditions ||
          rfq.notes) && (
          <View style={styles.grayBar}>
            <Text style={styles.grayBarText}>Miscellaneous</Text>
          </View>
        )}
        <View style={styles.section}>
          {rfq.technicalRequirements && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Technical Requirements</Text>
              <Text style={styles.textBlockContent}>
                {rfq.technicalRequirements}
              </Text>
            </View>
          )}
          {rfq.deliveryRequirements && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Delivery Requirements</Text>
              <Text style={styles.textBlockContent}>
                {rfq.deliveryRequirements}
              </Text>
            </View>
          )}
          {rfq.termsAndConditions && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Terms and Conditions</Text>
              <Text style={styles.textBlockContent}>
                {rfq.termsAndConditions}
              </Text>
            </View>
          )}
          {rfq.notes && (
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Notes</Text>
              <Text style={styles.textBlockContent}>{rfq.notes}</Text>
            </View>
          )}
        </View>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Signature By</Text>
          {rfq.signatureByName && (
            <View style={styles.signatureRow}>
              <Text style={styles.label}>Name of the user</Text>
              <Text style={styles.value}>{rfq.signatureByName}</Text>
            </View>
          )}
          <View style={styles.signatureRow}>
            <Text style={styles.label}>Acknowledgement (Signature)</Text>
            {rfq.signatureUrl ? (
              <Image src={rfq.signatureUrl} style={styles.signatureImage} />
            ) : (
              <View
                style={[
                  styles.signatureImage,
                  { backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
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

