import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

interface PLItem {
  serialNumber: number;
  productName: string;
  sku: string | null;
  hsnCode: string | null;
  uom: string | null;
  quantity: number;
  packageType: string | null;
  grossWeight: number | null;
  netWeight: number | null;
  noOfPackages: number | null;
  dimensions: string | null;
}

interface PackingListData {
  plId: string;
  dnId: string | null;
  poId: string;
  soId: string | null;
  packingDate: Date | string;
  shipmentTrackingId: string | null;
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
  totalGrossWeight: number | null;
  totalNetWeight: number | null;
  totalNoOfPackages: number | null;
  notes: string | null;
  signatureByName: string | null;
  signatureUrl: string | null;
  items: PLItem[];
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
    fontSize: 8,
    color: "#000000",
    paddingHorizontal: 3,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000000",
    paddingHorizontal: 3,
  },
  colSNo: { width: "4%" },
  colProductName: { width: "12%" },
  colSKU: { width: "8%" },
  colHSN: { width: "8%" },
  colUOM: { width: "6%" },
  colQuantity: { width: "8%" },
  colPackageType: { width: "10%" },
  colGrossWeight: { width: "10%" },
  colNetWeight: { width: "10%" },
  colNoOfPackages: { width: "10%" },
  colDimensions: { width: "14%" },
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

const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const PackingListPdfDocument: React.FC<{
  packingList: PackingListData;
}> = ({ packingList }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {packingList.companyLogoUrl && (
              <Image
                src={packingList.companyLogoUrl}
                style={styles.logo}
              />
            )}
            {packingList.companyName && (
              <Text style={styles.companyName}>
                {packingList.companyName}
              </Text>
            )}
          </View>
          <Text style={styles.documentTitle}>PACKING LIST</Text>
        </View>

        {/* Seller Details, Ship To, Document Details */}
        <View style={styles.section}>
          <View style={styles.threeColumn}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Seller Details</Text>
              <Text style={styles.label}>Company Name</Text>
              <Text style={styles.value}>
                {packingList.sellerCompanyName}
              </Text>
              {packingList.sellerContactName && (
                <>
                  <Text style={styles.label}>Contact Name</Text>
                  <Text style={styles.value}>
                    {packingList.sellerContactName}
                  </Text>
                </>
              )}
              {packingList.sellerEmail && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>
                    {packingList.sellerEmail}
                  </Text>
                </>
              )}
              {packingList.sellerPhone && (
                <>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>
                    {packingList.sellerPhone}
                  </Text>
                </>
              )}
              {packingList.sellerAddress && (
                <>
                  <Text style={styles.label}>Address</Text>
                  <Text style={styles.value}>
                    {packingList.sellerAddress}
                  </Text>
                </>
              )}
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Ship To</Text>
              <Text style={styles.label}>Company Name</Text>
              <Text style={styles.value}>
                {packingList.buyerCompanyName}
              </Text>
              {packingList.buyerContactName && (
                <>
                  <Text style={styles.label}>Contact Name</Text>
                  <Text style={styles.value}>
                    {packingList.buyerContactName}
                  </Text>
                </>
              )}
              {packingList.buyerEmail && (
                <>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>
                    {packingList.buyerEmail}
                  </Text>
                </>
              )}
              {packingList.buyerPhone && (
                <>
                  <Text style={styles.label}>Phone</Text>
                  <Text style={styles.value}>
                    {packingList.buyerPhone}
                  </Text>
                </>
              )}
              {packingList.buyerAddress && (
                <>
                  <Text style={styles.label}>Address</Text>
                  <Text style={styles.value}>
                    {packingList.buyerAddress}
                  </Text>
                </>
              )}
            </View>
            <View style={styles.columnLast}>
              <Text style={styles.sectionTitle}>Document Details</Text>
              <Text style={styles.label}>Packing List ID</Text>
              <Text style={styles.value}>{packingList.plId}</Text>
              {packingList.dnId && (
                <>
                  <Text style={styles.label}>DN ID</Text>
                  <Text style={styles.value}>{packingList.dnId}</Text>
                </>
              )}
              <Text style={styles.label}>PO ID</Text>
              <Text style={styles.value}>{packingList.poId}</Text>
              {packingList.soId && (
                <>
                  <Text style={styles.label}>SO ID</Text>
                  <Text style={styles.value}>{packingList.soId}</Text>
                </>
              )}
              <Text style={styles.label}>Packing Date</Text>
              <Text style={styles.value}>
                {formatDate(packingList.packingDate)}
              </Text>
              {packingList.shipmentTrackingId && (
                <>
                  <Text style={styles.label}>Shipping Tracking ID</Text>
                  <Text style={styles.value}>
                    {packingList.shipmentTrackingId}
                  </Text>
                </>
              )}
              {packingList.carrierName && (
                <>
                  <Text style={styles.label}>Carrier Name</Text>
                  <Text style={styles.value}>
                    {packingList.carrierName}
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
              <Text style={[styles.tableHeaderCell, styles.colSKU]}>SKU</Text>
              <Text style={[styles.tableHeaderCell, styles.colHSN]}>
                HSN Code
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colUOM]}>UoM</Text>
              <Text style={[styles.tableHeaderCell, styles.colQuantity]}>
                Quantity
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colPackageType]}>
                Package Type
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colGrossWeight]}>
                Gross Weight (In KG)
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colNetWeight]}>
                Net Weight (In KG)
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colNoOfPackages]}>
                No of Packages
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colDimensions]}>
                Dimensions
              </Text>
            </View>
            {packingList.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colSNo]}>
                  {item.serialNumber}
                </Text>
                <Text style={[styles.tableCell, styles.colProductName]}>
                  {item.productName}
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
                <Text style={[styles.tableCell, styles.colPackageType]}>
                  {item.packageType || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colGrossWeight]}>
                  {item.grossWeight !== null ? item.grossWeight : "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colNetWeight]}>
                  {item.netWeight !== null ? item.netWeight : "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colNoOfPackages]}>
                  {item.noOfPackages !== null ? item.noOfPackages : "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colDimensions]}>
                  {item.dimensions || "-"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        {(packingList.totalGrossWeight !== null ||
          packingList.totalNetWeight !== null ||
          packingList.totalNoOfPackages !== null) && (
          <View style={styles.section}>
            <View style={{ flexDirection: "row", gap: 20 }}>
              {packingList.totalGrossWeight !== null && (
                <View>
                  <Text style={styles.label}>Total Gross Weight</Text>
                  <Text style={styles.value}>
                    {packingList.totalGrossWeight} KG
                  </Text>
                </View>
              )}
              {packingList.totalNetWeight !== null && (
                <View>
                  <Text style={styles.label}>Total Net Weight</Text>
                  <Text style={styles.value}>
                    {packingList.totalNetWeight} KG
                  </Text>
                </View>
              )}
              {packingList.totalNoOfPackages !== null && (
                <View>
                  <Text style={styles.label}>Total No of Packages</Text>
                  <Text style={styles.value}>
                    {packingList.totalNoOfPackages}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Miscellaneous */}
        {packingList.notes && (
          <View style={styles.grayBar}>
            <Text style={styles.grayBarText}>Miscellaneous</Text>
          </View>
        )}
        {packingList.notes && (
          <View style={styles.section}>
            <View style={styles.textBlock}>
              <Text style={styles.textBlockTitle}>Notes</Text>
              <Text style={styles.textBlockContent}>
                {packingList.notes}
              </Text>
            </View>
          </View>
        )}

        {/* Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Signature By</Text>
          {packingList.signatureByName && (
            <View style={styles.signatureRow}>
              <Text style={styles.label}>Name of the user</Text>
              <Text style={styles.value}>
                {packingList.signatureByName}
              </Text>
            </View>
          )}
          <View style={styles.signatureRow}>
            <Text style={styles.label}>Acknowledgement (Signature)</Text>
            {packingList.signatureUrl ? (
              <Image
                src={packingList.signatureUrl}
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

