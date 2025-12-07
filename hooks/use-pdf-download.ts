/**
 * Shared hook for PDF download functionality
 */
import { useState } from "react";

interface UsePdfDownloadOptions {
  onError?: (error: Error) => void;
}

export function usePdfDownload(options: UsePdfDownloadOptions = {}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadPdf = async (url: string, filename: string) => {
    setIsDownloading(true);
    try {
      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generating PDF:", error);
      const err = error instanceof Error ? error : new Error("Failed to generate PDF");
      if (options.onError) {
        options.onError(err);
      } else {
        alert("Failed to generate PDF. Please try again.");
      }
      throw err;
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadPdf, isDownloading };
}

