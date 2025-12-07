import React from "react";
import { pdf } from "@react-pdf/renderer";
import { RfqPdfDocument } from "@/components/pdf/RfqPdf";
import { QuotationPdfDocument } from "@/components/pdf/QuotationPdf";
import { ContractPdfDocument } from "@/components/pdf/ContractPdf";
import { PurchaseOrderPdfDocument } from "@/components/pdf/PurchaseOrderPdf";
import { SalesOrderPdfDocument } from "@/components/pdf/SalesOrderPdf";
import { DeliveryNotePdfDocument } from "@/components/pdf/DeliveryNotePdf";
import { PackingListPdfDocument } from "@/components/pdf/PackingListPdf";
import { InvoicePdfDocument } from "@/components/pdf/InvoicePdf";
import { imageUrlToDataUrl } from "@/lib/image-utils";

interface GenerateRfqPdfOptions {
  rfq: any; // RFQ data from Prisma
  companyLogoUrl?: string | null;
  companyName?: string;
}

/**
 * Generates RFQ PDF and returns as Blob
 */
export async function generateRfqPdf(
  options: GenerateRfqPdfOptions
): Promise<Blob> {
  const { rfq, companyLogoUrl, companyName } = options;

  // Convert image URLs to data URLs for PDF rendering
  const signatureDataUrl = await imageUrlToDataUrl(rfq.signatureUrl);
  const logoDataUrl = await imageUrlToDataUrl(companyLogoUrl);

  // Transform RFQ data to match PDF component interface
  const rfqData = {
    rfqId: rfq.rfqId,
    dateIssued: rfq.dateIssued,
    dueDate: rfq.dueDate,
    currency: rfq.currency,
    projectName: rfq.projectName,
    projectDescription: rfq.projectDescription,
    buyerCompanyName: rfq.buyerCompanyName,
    buyerContactName: rfq.buyerContactName,
    buyerEmail: rfq.buyerEmail,
    buyerPhone: rfq.buyerPhone,
    buyerAddress: rfq.buyerAddress,
    sellerCompanyName: rfq.sellerCompanyName,
    sellerContactName: rfq.sellerContactName,
    sellerEmail: rfq.sellerEmail,
    sellerPhone: rfq.sellerPhone,
    sellerAddress: rfq.sellerAddress,
    technicalRequirements: rfq.technicalRequirements,
    deliveryRequirements: rfq.deliveryRequirements,
    termsAndConditions: rfq.termsAndConditions,
    notes: rfq.notes,
    signatureByName: rfq.signatureByName,
    signatureUrl: signatureDataUrl,
    items: rfq.items.map((item: any) => ({
      serialNumber: item.serialNumber,
      productName: item.productName,
      productDescription: item.productDescription,
      sku: item.sku,
      hsnCode: item.hsnCode,
      uom: item.uom,
      quantity: Number(item.quantity),
    })),
    companyLogoUrl: logoDataUrl,
    companyName,
  };

  const doc = React.createElement(RfqPdfDocument, { rfq: rfqData });
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  
  return blob;
}

/**
 * Generates Quotation PDF and returns as Blob
 */
export async function generateQuotationPdf(
  options: GenerateQuotationPdfOptions
): Promise<Blob> {
  const { quotation, companyLogoUrl, companyName } = options;

  // Convert image URLs to data URLs for PDF rendering
  const signatureDataUrl = await imageUrlToDataUrl(quotation.signatureUrl);
  const logoDataUrl = await imageUrlToDataUrl(companyLogoUrl);

  // Transform Quotation data to match PDF component interface
  const quotationData = {
    quoteId: quotation.quoteId,
    rfqId: quotation.rfqId,
    quoteDateIssued: quotation.quoteDateIssued,
    quoteValidDate: quotation.quoteValidDate,
    currency: quotation.currency,
    buyerCompanyName: quotation.buyerCompanyName,
    buyerContactName: quotation.buyerContactName,
    buyerEmail: quotation.buyerEmail,
    buyerPhone: quotation.buyerPhone,
    buyerAddress: quotation.buyerAddress,
    sellerCompanyName: quotation.sellerCompanyName,
    sellerContactName: quotation.sellerContactName,
    sellerEmail: quotation.sellerEmail,
    sellerPhone: quotation.sellerPhone,
    sellerAddress: quotation.sellerAddress,
    sumOfSubTotal: Number(quotation.sumOfSubTotal),
    discountPercentage: quotation.discountPercentage
      ? Number(quotation.discountPercentage)
      : null,
    additionalCharges: quotation.additionalCharges
      ? Number(quotation.additionalCharges)
      : null,
    taxPercentage: quotation.taxPercentage
      ? Number(quotation.taxPercentage)
      : null,
    totalAmount: Number(quotation.totalAmount),
    paymentTerms: quotation.paymentTerms,
    deliveryTerms: quotation.deliveryTerms,
    termsAndConditions: quotation.termsAndConditions,
    notes: quotation.notes,
    signatureByName: quotation.signatureByName,
    signatureUrl: signatureDataUrl,
    items: quotation.items.map((item: any) => ({
      serialNumber: item.serialNumber,
      productName: item.productName,
      productDescription: item.productDescription,
      sku: item.sku,
      hsnCode: item.hsnCode,
      uom: item.uom,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })),
    companyLogoUrl: logoDataUrl,
    companyName,
  };

  const doc = React.createElement(QuotationPdfDocument, {
    quotation: quotationData,
  });
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();

  return blob;
}

interface GenerateQuotationPdfOptions {
  quotation: any; // Quotation data from Prisma
  companyLogoUrl?: string | null;
  companyName?: string;
}

interface GenerateContractPdfOptions {
  contract: any; // Contract data from Prisma
  companyLogoUrl?: string | null;
  companyName?: string;
}

interface GeneratePurchaseOrderPdfOptions {
  purchaseOrder: any; // PurchaseOrder data from Prisma
  companyLogoUrl?: string | null;
  companyName?: string;
}

interface GenerateSalesOrderPdfOptions {
  salesOrder: any; // SalesOrder data from Prisma
  companyLogoUrl?: string | null;
  companyName?: string;
}

interface GenerateDeliveryNotePdfOptions {
  deliveryNote: any; // DeliveryNote data from Prisma
  companyLogoUrl?: string | null;
  companyName?: string;
}

interface GeneratePackingListPdfOptions {
  packingList: any; // PackingList data from Prisma
  companyLogoUrl?: string | null;
  companyName?: string;
}

interface GenerateInvoicePdfOptions {
  invoice: any; // Invoice data from Prisma
  companyLogoUrl?: string | null;
  companyName?: string;
}

/**
 * Generates Contract PDF and returns as Blob
 */
export async function generateContractPdf(
  options: GenerateContractPdfOptions
): Promise<Blob> {
  const { contract, companyLogoUrl, companyName } = options;

  const signatureDataUrl = await imageUrlToDataUrl(contract.signatureUrl);
  const logoDataUrl = await imageUrlToDataUrl(companyLogoUrl);

  const contractData = {
    contractId: contract.contractId,
    quoteId: contract.quotationId,
    rfqId: contract.rfqId,
    effectiveDate: contract.effectiveDate,
    endDate: contract.endDate,
    currency: contract.currency,
    agreedTotalValue: contract.agreedTotalValue
      ? Number(contract.agreedTotalValue)
      : null,
    buyerCompanyName: contract.buyerCompanyName,
    buyerContactName: contract.buyerContactName,
    buyerEmail: contract.buyerEmail,
    buyerPhone: contract.buyerPhone,
    buyerAddress: contract.buyerAddress,
    sellerCompanyName: contract.sellerCompanyName,
    sellerContactName: contract.sellerContactName,
    sellerEmail: contract.sellerEmail,
    sellerPhone: contract.sellerPhone,
    sellerAddress: contract.sellerAddress,
    pricingTerms: contract.pricingTerms,
    paymentTerms: contract.paymentTerms,
    deliveryTerms: contract.deliveryTerms,
    confidentiality: contract.confidentiality,
    indemnity: contract.indemnity,
    terminationConditions: contract.terminationConditions,
    disputeResolution: contract.disputeResolution,
    governingLaw: contract.governingLaw,
    signatureByName: contract.signatureByName,
    signatureUrl: signatureDataUrl,
    items: contract.items.map((item: any) => ({
      serialNumber: item.serialNumber,
      productName: item.productName,
      productDescription: item.productDescription,
      sku: item.sku,
      hsnCode: item.hsnCode,
      uom: item.uom,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
    companyLogoUrl: logoDataUrl,
    companyName,
  };

  const doc = React.createElement(ContractPdfDocument, {
    contract: contractData,
  });
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
}

/**
 * Generates Purchase Order PDF and returns as Blob
 */
export async function generatePurchaseOrderPdf(
  options: GeneratePurchaseOrderPdfOptions
): Promise<Blob> {
  const { purchaseOrder, companyLogoUrl, companyName } = options;

  const signatureDataUrl = await imageUrlToDataUrl(
    purchaseOrder.signatureUrl
  );
  const logoDataUrl = await imageUrlToDataUrl(companyLogoUrl);

  const poData = {
    poId: purchaseOrder.poId,
    contractId: purchaseOrder.contractId,
    quotationId: purchaseOrder.quotationId,
    poIssuedDate: purchaseOrder.poIssuedDate,
    expectedDeliveryDate: purchaseOrder.expectedDeliveryDate,
    currency: purchaseOrder.currency,
    buyerCompanyName: purchaseOrder.buyerCompanyName,
    buyerContactName: purchaseOrder.buyerContactName,
    buyerEmail: purchaseOrder.buyerEmail,
    buyerPhone: purchaseOrder.buyerPhone,
    buyerAddress: purchaseOrder.buyerAddress,
    sellerCompanyName: purchaseOrder.sellerCompanyName,
    sellerContactName: purchaseOrder.sellerContactName,
    sellerEmail: purchaseOrder.sellerEmail,
    sellerPhone: purchaseOrder.sellerPhone,
    sellerAddress: purchaseOrder.sellerAddress,
    deliveryAddress: purchaseOrder.deliveryAddress,
    discountPercentage: purchaseOrder.discountPercentage
      ? Number(purchaseOrder.discountPercentage)
      : null,
    additionalCharges: purchaseOrder.additionalCharges
      ? Number(purchaseOrder.additionalCharges)
      : null,
    taxPercentage: purchaseOrder.taxPercentage
      ? Number(purchaseOrder.taxPercentage)
      : null,
    totalAmount: Number(purchaseOrder.totalAmount),
    paymentTerms: purchaseOrder.paymentTerms,
    deliveryTerms: purchaseOrder.deliveryTerms,
    notes: purchaseOrder.notes,
    signatureByName: purchaseOrder.signatureByName,
    signatureUrl: signatureDataUrl,
    items: purchaseOrder.items.map((item: any) => ({
      serialNumber: item.serialNumber,
      productName: item.productName,
      productDescription: item.productDescription,
      sku: item.sku,
      hsnCode: item.hsnCode,
      uom: item.uom,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })),
    companyLogoUrl: logoDataUrl,
    companyName,
  };

  const doc = React.createElement(PurchaseOrderPdfDocument, {
    purchaseOrder: poData,
  });
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
}

/**
 * Generates Sales Order PDF and returns as Blob
 */
export async function generateSalesOrderPdf(
  options: GenerateSalesOrderPdfOptions
): Promise<Blob> {
  const { salesOrder, companyLogoUrl, companyName } = options;

  const signatureDataUrl = await imageUrlToDataUrl(salesOrder.signatureUrl);
  const logoDataUrl = await imageUrlToDataUrl(companyLogoUrl);

  const soData = {
    soId: salesOrder.soId,
    purchaseOrderId: salesOrder.purchaseOrderId,
    soCreatedDate: salesOrder.soCreatedDate,
    plannedShipDate: salesOrder.plannedShipDate,
    currency: salesOrder.currency,
    buyerCompanyName: salesOrder.buyerCompanyName,
    buyerContactName: salesOrder.buyerContactName,
    buyerEmail: salesOrder.buyerEmail,
    buyerPhone: salesOrder.buyerPhone,
    buyerAddress: salesOrder.buyerAddress,
    sellerCompanyName: salesOrder.sellerCompanyName,
    sellerContactName: salesOrder.sellerContactName,
    sellerEmail: salesOrder.sellerEmail,
    sellerPhone: salesOrder.sellerPhone,
    sellerAddress: salesOrder.sellerAddress,
    deliveryAddress: salesOrder.deliveryAddress,
    discountPercentage: salesOrder.discountPercentage
      ? Number(salesOrder.discountPercentage)
      : null,
    additionalCharges: salesOrder.additionalCharges
      ? Number(salesOrder.additionalCharges)
      : null,
    taxPercentage: salesOrder.taxPercentage
      ? Number(salesOrder.taxPercentage)
      : null,
    totalAmount: Number(salesOrder.totalAmount),
    paymentTerms: salesOrder.paymentTerms,
    deliveryTerms: salesOrder.deliveryTerms,
    notes: salesOrder.notes,
    signatureByName: salesOrder.signatureByName,
    signatureUrl: signatureDataUrl,
    items: salesOrder.items.map((item: any) => ({
      serialNumber: item.serialNumber,
      productName: item.productName,
      productDescription: item.productDescription,
      sku: item.sku,
      hsnCode: item.hsnCode,
      uom: item.uom,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })),
    companyLogoUrl: logoDataUrl,
    companyName,
  };

  const doc = React.createElement(SalesOrderPdfDocument, {
    salesOrder: soData,
  });
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
}

/**
 * Generates Delivery Note PDF and returns as Blob
 */
export async function generateDeliveryNotePdf(
  options: GenerateDeliveryNotePdfOptions
): Promise<Blob> {
  const { deliveryNote, companyLogoUrl, companyName } = options;

  const signatureDataUrl = await imageUrlToDataUrl(
    deliveryNote.signatureUrl
  );
  const logoDataUrl = await imageUrlToDataUrl(companyLogoUrl);

  const dnData = {
    dnId: deliveryNote.dnId,
    poId: deliveryNote.purchaseOrder?.poId || "",
    soId: deliveryNote.salesOrder?.soId || null,
    delDate: deliveryNote.delDate,
    shippingMethod: deliveryNote.shippingMethod,
    shippingDate: deliveryNote.shippingDate,
    carrierName: deliveryNote.carrierName,
    sellerCompanyName: deliveryNote.sellerCompanyName,
    sellerContactName: deliveryNote.sellerContactName,
    sellerEmail: deliveryNote.sellerEmail,
    sellerPhone: deliveryNote.sellerPhone,
    sellerAddress: deliveryNote.sellerAddress,
    buyerCompanyName: deliveryNote.buyerCompanyName,
    buyerContactName: deliveryNote.buyerContactName,
    buyerEmail: deliveryNote.buyerEmail,
    buyerPhone: deliveryNote.buyerPhone,
    buyerAddress: deliveryNote.buyerAddress,
    notes: deliveryNote.notes,
    signatureByName: deliveryNote.signatureByName,
    signatureUrl: signatureDataUrl,
    items: deliveryNote.items.map((item: any) => ({
      serialNumber: item.serialNumber,
      productName: item.productName,
      productDescription: item.productDescription,
      sku: item.sku,
      hsnCode: item.hsnCode,
      uom: item.uom,
      quantity: Number(item.quantity),
      quantityDelivered: Number(item.quantityDelivered),
    })),
    companyLogoUrl: logoDataUrl,
    companyName,
  };

  const doc = React.createElement(DeliveryNotePdfDocument, {
    deliveryNote: dnData,
  });
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
}

/**
 * Generates Packing List PDF and returns as Blob
 */
export async function generatePackingListPdf(
  options: GeneratePackingListPdfOptions
): Promise<Blob> {
  const { packingList, companyLogoUrl, companyName } = options;

  const signatureDataUrl = await imageUrlToDataUrl(
    packingList.signatureUrl
  );
  const logoDataUrl = await imageUrlToDataUrl(companyLogoUrl);

  const plData = {
    plId: packingList.plId,
    dnId: packingList.deliveryNote?.dnId || null,
    poId: packingList.purchaseOrder?.poId || "",
    soId: packingList.salesOrder?.soId || null,
    packingDate: packingList.packingDate,
    shipmentTrackingId: packingList.shipmentTrackingId,
    carrierName: packingList.carrierName,
    sellerCompanyName: packingList.sellerCompanyName,
    sellerContactName: packingList.sellerContactName,
    sellerEmail: packingList.sellerEmail,
    sellerPhone: packingList.sellerPhone,
    sellerAddress: packingList.sellerAddress,
    buyerCompanyName: packingList.buyerCompanyName,
    buyerContactName: packingList.buyerContactName,
    buyerEmail: packingList.buyerEmail,
    buyerPhone: packingList.buyerPhone,
    buyerAddress: packingList.buyerAddress,
    totalGrossWeight: packingList.totalGrossWeight
      ? Number(packingList.totalGrossWeight)
      : null,
    totalNetWeight: packingList.totalNetWeight
      ? Number(packingList.totalNetWeight)
      : null,
    totalNoOfPackages: packingList.totalNoOfPackages,
    notes: packingList.notes,
    signatureByName: packingList.signatureByName,
    signatureUrl: signatureDataUrl,
    items: packingList.items.map((item: any) => ({
      serialNumber: item.serialNumber,
      productName: item.productName,
      sku: item.sku,
      hsnCode: item.hsnCode,
      uom: item.uom,
      quantity: Number(item.quantity),
      packageType: item.packageType,
      grossWeight: item.grossWeight ? Number(item.grossWeight) : null,
      netWeight: item.netWeight ? Number(item.netWeight) : null,
      noOfPackages: item.noOfPackages,
      dimensions: item.dimensions,
    })),
    companyLogoUrl: logoDataUrl,
    companyName,
  };

  const doc = React.createElement(PackingListPdfDocument, {
    packingList: plData,
  });
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
}

/**
 * Generates Invoice PDF and returns as Blob
 */
export async function generateInvoicePdf(
  options: GenerateInvoicePdfOptions
): Promise<Blob> {
  const { invoice, companyLogoUrl, companyName } = options;

  const signatureDataUrl = await imageUrlToDataUrl(invoice.signatureUrl);
  const logoDataUrl = await imageUrlToDataUrl(companyLogoUrl);

  const invoiceData = {
    invoiceId: invoice.invoiceId,
    poId: invoice.purchaseOrder?.poId || "",
    invoiceDate: invoice.invoiceDate,
    sellerCompanyName: invoice.sellerCompanyName,
    sellerContactName: invoice.sellerContactName,
    sellerEmail: invoice.sellerEmail,
    sellerPhone: invoice.sellerPhone,
    sellerAddress: invoice.sellerAddress,
    buyerCompanyName: invoice.buyerCompanyName,
    buyerContactName: invoice.buyerContactName,
    buyerEmail: invoice.buyerEmail,
    buyerPhone: invoice.buyerPhone,
    buyerAddress: invoice.buyerAddress,
    shipToCompanyName: invoice.shipToCompanyName,
    shipToContactName: invoice.shipToContactName,
    shipToEmail: invoice.shipToEmail,
    shipToPhone: invoice.shipToPhone,
    shipToAddress: invoice.shipToAddress,
    sumOfSubTotal: Number(invoice.sumOfSubTotal),
    discountPercentage: invoice.discountPercentage
      ? Number(invoice.discountPercentage)
      : null,
    additionalCharges: invoice.additionalCharges
      ? Number(invoice.additionalCharges)
      : null,
    taxPercentage: invoice.taxPercentage
      ? Number(invoice.taxPercentage)
      : null,
    totalAmount: Number(invoice.totalAmount),
    paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
    remainingAmount: invoice.remainingAmount
      ? Number(invoice.remainingAmount)
      : null,
    termsAndConditions: invoice.termsAndConditions,
    signatureByName: invoice.signatureByName,
    signatureUrl: signatureDataUrl,
    items: invoice.items.map((item: any) => ({
      serialNumber: item.serialNumber,
      productName: item.productName,
      productDescription: item.productDescription,
      sku: item.sku,
      hsnCode: item.hsnCode,
      uom: item.uom,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subTotal: Number(item.subTotal),
    })),
    companyLogoUrl: logoDataUrl,
    companyName,
  };

  const doc = React.createElement(InvoicePdfDocument, {
    invoice: invoiceData,
  });
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return blob;
}

