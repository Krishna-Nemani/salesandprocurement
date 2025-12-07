import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

interface DNItem {
  serialNumber: number;
  productName: string;
  productDescription: string | null;
  sku: string | null;
  hsnCode: string | null;
  uom: string | null;
  quantity: number;
  quantityDelivered: number;
}

interface DeliveryNoteData {
  dnId: string;
  poId: string;
  soId: string | null;
  delDate: Date | string;
  shippingMethod: string | null;
  shippingDate: Date | string | null;
  carrierName: string | null;
  sellerCompanyName: string;
  sellerContactName: string | null;
  sellerEmail: string | null;
  sellerPhone: string | null;
  sellerAddress: string | null;
  buyerCompanyName: string;
  buyerContactName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  buyerAddress: string | null;
  notes: string | null;
  signatureByName: string | null;
  signatureUrl: string | null;
  items: DNItem[];
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
  colProductName: { width: "18%" },
  colDescription: { width: "18%" },
  colSKU: { width: "12%" },
  colHSN: { width: "12%" },
  colUOM: { width: "10%" },
  colQuantity: { width: "12%" },
  colQuantityDelivered: { width: "12%" },
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

const formatDate = (date: Date | string | null): string => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const DeliveryNotePdfDocument: React.FC<{
  deliveryNote: DeliveryNoteData;
}> = ({ deliveryNote }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {deliveryNote.companyLogoUrl && (
              <Image
                src={deliveryNote.companyLogoUrl}
                style={styles.logo}
              />
            )}
            {deliveryNote.companyName && (
              <Text style={styles.companyName}>
                {deliveryNote.companyName}
              </Text>
            )}
          </View>
          <Text style={styles.documentTitle}>DELIVERY NOTE</Text>
        </View>

        {/* Seller Details, Ship To, Document Details */}
        <View style={styles.section}>
          <View style={styles.threeColumn}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Seller Details</Text>
              <Text style={styles.label}>Company Name</Text>
              <Text style={styles.value}>
                {deliveryNote.sellerCompanyName}
              </Text>
              {deliveryNote.sellerContactName && (
                <>
                  <Text style={styles.label}>Contact Name</Text>
                  <Text style={styles.value}>
                    {deliveryNote.sellerContactName}
                  </Text>
                </>
              )}
              {deliveryNote.sellerEmail && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{deliveryNote.sellerEmail}</Text>
                </>
              )}
              {deliveryNote.sellerPhone && (
                <>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>{deliveryNote.sellerPhone}</Text>
                </>
              )}
              {deliveryNote.sellerAddress && (
                <>
                  <Text style={styles.label}>Address</Text>
                  <Text style={styles.value}>
                    {deliveryNote.sellerAddress}
                  </Text>
                </>
              )}
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Ship To</Text>
              <Text style={styles.label}>Company Name</Text>
              <Text style={styles.value}>{deliveryNote.buyerCompanyName}</Text>
              {deliveryNote.buyerContactName && (
                <>
                  <Text style={styles.label}>Contact Name</Text>
                  <Text style={styles.value}>
                    {deliveryNote.buyerContactName}
                  </Text>
                </>
              )}
              {deliveryNote.buyerEmail && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{deliveryNote.buyerEmail}</Text>
                </>
              )}
              {deliveryNote.buyerPhone && (
                <>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>{deliveryNote.buyerPhone}</Text>
                </>
              )}
              {deliveryNote.buyerAddress && (
                <>
                  <Text style={styles.label}>Address</Text>
                  <Text style={styles.value}>
                    {deliveryNote.buyerAddress}
                  </Text>
                </>
              )}
            </View>
            <View style={styles.columnLast}>
              <Text style={styles.sectionTitle}>Document Details</Text>
              <Text style={styles.label}>Delivery Note ID</Text>
              <Text style={styles.value}>{deliveryNote.dnId}</Text>
              <Text style={styles.label}>PO ID</Text>
              <Text style={styles.value}>{deliveryNote.poId}</Text>
              {deliveryNote.soId && (
                <>
                  <Text style={styles.label}>SO ID</Text>
                  <Text style={styles.value}>{deliveryNote.soId}</Text>
                </>
              )}
              <Text style={styles.label}>Del Date</Text>
              <Text style={styles.value}>
                {formatDate(deliveryNote.delDate)}
              </Text>
              {deliveryNote.shippingMethod && (
                <>
                  <Text style={styles.label}>Shipping Method</Text>
                  <Text style={styles.value}>
                    {deliveryNote.shippingMethod}
                  </Text>
                </>
              )}
              {deliveryNote.shippingDate && (
                <>
                  <Text style={styles.label}>Shipping Date</Text>
                  <Text style={styles.value}>
                    {formatDate(deliveryNote.shippingDate)}
                  </Text>
                </>
              )}
              {deliveryNote.carrierName && (
                <>
                  <Text style={styles.label}>Carrier Name</Text>
                  <Text style={styles.value}>
                    {deliveryNote.carrierName}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* List of Products / Services */}
        <View style={styles.grayBar}>
          <Text style={styles.grayBarText}>
            List of Products / Services
          </Text>
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
              <Text
                style={[styles.tableHeaderCell, styles.colQuantityDelivered]}
              >
                Quantity Delivered
              </Text>
            </View>
            {deliveryNote.items.map((item, index) => (
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
                <Text style={[styles.tableCell, styles.colQuantityDelivered]}>
                  {item.quantityDelivered}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Miscellaneous */}
        {deliveryNote.notes && (
          <View style={styles.grayBar}>
            <Text style={styles.grayBarText}>Miscellaneous</Text>
          </View>
        )}
        {deliveryNote.notes && (
          <View style={styles.section}>
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Notes</Text>
              <Text style={styles.textBlockContent}>
                {deliveryNote.notes}
              </Text>
            </View>
          </View>
        )}

        {/* Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Signature By</Text>
          {deliveryNote.signatureByName && (
            <View style={styles.signatureRow}>
              <Text style={styles.label}>Name of the user</Text>
              <Text style={styles.value}>
                {deliveryNote.signatureByName}
              </Text>
            </View>
          )}
          <View style={styles.signatureRow}>
            <Text style={styles.label}>Acknowledgement (Signature)</Text>
            {deliveryNote.signatureUrl ? (
              <Image
                src={deliveryNote.signatureUrl}
                style={styles.signatureImage}
              />
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

