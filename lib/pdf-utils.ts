import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PDFOptions {
  filename: string;
  companyLogoUrl?: string | null;
  companyName?: string;
  documentTitle: string;
}

/**
 * Loads an image from URL and returns it as a data URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    // Handle relative URLs
    if (url.startsWith("/")) {
      img.src = window.location.origin + url;
    } else {
      img.src = url;
    }
  });
}

/**
 * Generates a clean, professional PDF from an HTML element
 * Matches the reference design with proper spacing and formatting
 */
export async function generatePDF(
  elementId: string,
  options: PDFOptions
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Create a temporary container for PDF generation
  const pdfContainer = document.createElement("div");
  pdfContainer.style.position = "absolute";
  pdfContainer.style.left = "-9999px";
  pdfContainer.style.top = "0";
  pdfContainer.style.width = "210mm";
  pdfContainer.style.backgroundColor = "white";
  pdfContainer.style.fontFamily = "Arial, Helvetica, sans-serif";
  document.body.appendChild(pdfContainer);

  try {
    // Clone the element
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Remove print-hidden elements
    const printHiddenElements = clonedElement.querySelectorAll(".print\\:hidden");
    printHiddenElements.forEach((el) => el.remove());

    // Apply clean PDF styles to root
    clonedElement.style.width = "210mm";
    clonedElement.style.maxWidth = "210mm";
    clonedElement.style.padding = "0";
    clonedElement.style.margin = "0";
    clonedElement.style.backgroundColor = "white";
    clonedElement.style.color = "#000000";
    clonedElement.style.fontFamily = "Arial, Helvetica, sans-serif";
    clonedElement.style.fontSize = "11pt";
    clonedElement.style.lineHeight = "1.5";

    // Add comprehensive styles for clean PDF rendering
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body, div {
        margin: 0;
        padding: 0;
      }
      /* Clean table styling */
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        margin: 12px 0 !important;
        font-size: 10pt !important;
        page-break-inside: auto !important;
      }
      thead {
        display: table-header-group !important;
      }
      tbody {
        display: table-row-group !important;
      }
      tr {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
      }
      th, td {
        padding: 8px 10px !important;
        border: 1px solid #e0e0e0 !important;
        text-align: left !important;
        vertical-align: top !important;
        word-wrap: break-word !important;
      }
      th {
        background-color: #f8f8f8 !important;
        font-weight: 600 !important;
        color: #000 !important;
        font-size: 10pt !important;
      }
      td {
        font-size: 10pt !important;
        color: #000 !important;
      }
      /* Section headers */
      .bg-gray-200 {
        background-color: #f5f5f5 !important;
        padding: 12px 16px !important;
        margin: 16px 0 12px 0 !important;
      }
      .bg-gray-200 h2 {
        margin: 0 !important;
        font-size: 14pt !important;
        font-weight: 600 !important;
        color: #000 !important;
        text-transform: uppercase !important;
      }
      /* Card styling */
      .print\\:border-0 {
        border: none !important;
      }
      .print\\:shadow-none {
        box-shadow: none !important;
      }
      /* Spacing */
      .space-y-6 > * + * {
        margin-top: 20px !important;
      }
      .space-y-4 > * + * {
        margin-top: 16px !important;
      }
      .gap-6 {
        gap: 20px !important;
      }
      .gap-4 {
        gap: 16px !important;
      }
      /* Padding */
      .p-4 {
        padding: 16px !important;
      }
      .p-6 {
        padding: 24px !important;
      }
      /* Typography */
      h1, h2, h3 {
        margin: 12px 0 8px 0 !important;
        font-weight: 600 !important;
        color: #000 !important;
      }
      h2 {
        font-size: 12pt !important;
      }
      h3 {
        font-size: 11pt !important;
      }
      p {
        margin: 4px 0 !important;
        color: #000 !important;
        font-size: 10pt !important;
      }
      /* Text colors */
      .text-muted-foreground {
        color: #666 !important;
        font-size: 9pt !important;
      }
      .font-semibold {
        font-weight: 600 !important;
      }
      .font-bold {
        font-weight: 700 !important;
      }
      /* Grid layouts */
      .grid {
        display: grid !important;
      }
      .grid-cols-1 {
        grid-template-columns: 1fr !important;
      }
      .grid-cols-2 {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      .grid-cols-3 {
        grid-template-columns: repeat(3, 1fr) !important;
      }
      /* Remove backgrounds that interfere */
      .bg-white {
        background-color: white !important;
      }
      /* Clean up badges and other elements */
      .badge, [class*="Badge"] {
        display: inline-block !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        font-size: 9pt !important;
      }
    `;
    clonedElement.insertBefore(styleElement, clonedElement.firstChild);

    // Wrap content in a padded container
    const contentWrapper = document.createElement("div");
    contentWrapper.style.padding = "20mm 20mm";
    contentWrapper.style.width = "100%";
    contentWrapper.style.minHeight = "100%";
    
    // Move all children except style to wrapper
    const children = Array.from(clonedElement.childNodes);
    children.forEach((child) => {
      if (child !== styleElement) {
        contentWrapper.appendChild(child);
      }
    });
    clonedElement.appendChild(contentWrapper);

    pdfContainer.appendChild(clonedElement);

    // Load company logo
    let logoDataUrl: string | null = null;
    let logoWidth = 0;
    let logoHeight = 0;
    if (options.companyLogoUrl) {
      try {
        const logoImg = await loadImage(options.companyLogoUrl);
        const canvas = document.createElement("canvas");
        // Limit logo size (max 40mm wide, 15mm tall)
        const maxWidthPx = 151;
        const maxHeightPx = 57;
        const scale = Math.min(maxWidthPx / logoImg.width, maxHeightPx / logoImg.height, 1);
        canvas.width = logoImg.width * scale;
        canvas.height = logoImg.height * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(logoImg, 0, 0, canvas.width, canvas.height);
          logoDataUrl = canvas.toDataURL("image/png");
          logoWidth = canvas.width * 0.264583; // px to mm
          logoHeight = canvas.height * 0.264583;
        }
      } catch (error) {
        console.warn("Could not load company logo:", error);
      }
    }

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Convert to canvas with high quality
    const canvas = await html2canvas(clonedElement, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      removeContainer: false,
      windowWidth: 794,
      windowHeight: clonedElement.scrollHeight,
      allowTaint: false,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const marginTop = 25;
    const marginBottom = 20;
    const contentAreaHeight = pageHeight - marginTop - marginBottom;
    
    // Image dimensions
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/png", 0.95);
    
    // Header settings
    const headerY = 8;
    const headerHeight = logoDataUrl ? Math.max(logoHeight + 8, 20) : 18;

    // Add header function
    const addHeader = (pageNum: number) => {
      pdf.setPage(pageNum);
      
      // Logo
      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, "PNG", 15, headerY, logoWidth, logoHeight);
      }

      // Company name
      if (options.companyName) {
        pdf.setFontSize(9);
        pdf.setTextColor(50, 50, 50);
        pdf.setFont("helvetica", "normal");
        const companyX = logoDataUrl ? 15 + logoWidth + 6 : 15;
        const companyY = headerY + (logoHeight / 2) - 1;
        pdf.text(options.companyName, companyX, companyY);
      }

      // Document title
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      const titleY = logoDataUrl ? headerY + logoHeight + 6 : headerY + 10;
      pdf.text(options.documentTitle, 15, titleY);
      
      // Subtle separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(15, titleY + 4, pageWidth - 15, titleY + 4);
    };

    // Add footer function
    const addFooter = (pageNum: number, totalPages: number) => {
      pdf.setPage(pageNum);
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.setFont("helvetica", "normal");
      
      const footerY = pageHeight - 8;
      pdf.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );
      pdf.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        footerY + 4,
        { align: "center" }
      );
    };

    // Calculate pages needed
    const totalPages = Math.ceil(imgHeight / contentAreaHeight);
    
    // Add content page by page
    for (let page = 1; page <= totalPages; page++) {
      if (page > 1) {
        pdf.addPage();
      }
      
      addHeader(page);
      
      // Calculate Y position for this page's content
      const sourceY = (page - 1) * contentAreaHeight;
      const pageContentHeight = Math.min(contentAreaHeight, imgHeight - sourceY);
      const destY = marginTop;
      
      // For multi-page, position the image to show the correct portion
      if (page === 1) {
        // First page: show from top
        pdf.addImage(
          imgData,
          "PNG",
          0,
          destY,
          imgWidth,
          pageContentHeight,
          undefined,
          "FAST"
        );
      } else {
        // Subsequent pages: offset the image upward to show the right portion
        const offsetY = destY - sourceY;
        pdf.addImage(
          imgData,
          "PNG",
          0,
          offsetY,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );
      }
      
      addFooter(page, totalPages);
    }

    // Save PDF
    pdf.save(`${options.filename}.pdf`);
  } finally {
    // Clean up
    if (document.body.contains(pdfContainer)) {
      document.body.removeChild(pdfContainer);
    }
  }
}
