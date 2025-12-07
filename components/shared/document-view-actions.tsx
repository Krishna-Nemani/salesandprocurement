/**
 * Shared component for document view page actions (Download, Print)
 */
"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { usePdfDownload } from "@/hooks/use-pdf-download";

interface DocumentViewActionsProps {
  pdfUrl: string;
  filename: string;
  onPrint?: () => void;
}

export function DocumentViewActions({
  pdfUrl,
  filename,
  onPrint,
}: DocumentViewActionsProps) {
  const { downloadPdf, isDownloading } = usePdfDownload();

  const handleDownload = () => {
    downloadPdf(pdfUrl, filename);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button
        variant="outline"
        onClick={handlePrint}
        disabled={isDownloading}
      >
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
      <Button
        variant="outline"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        <Download className="mr-2 h-4 w-4" />
        {isDownloading ? "Downloading..." : "Download"}
      </Button>
    </div>
  );
}

