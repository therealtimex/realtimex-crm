import { useState } from "react";
import { useTranslate, useNotify } from "ra-core";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import { toJpeg } from "html-to-image";
import { Button } from "@/components/ds/ui/button";
import type { Invoice } from "../types";

interface DownloadPDFButtonProps {
  record: Invoice;
  className?: string;
}

export const DownloadPDFButton = ({
  record,
  className,
}: DownloadPDFButtonProps) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    const element = document.getElementById("invoice-content");
    if (!element) {
      notify("Error: Invoice content not found", { type: "warning" });
      return;
    }

    setIsGenerating(true);
    try {
      // Hide elements with 'no-print' class during capture
      const noPrintElements = document.querySelectorAll(".no-print");
      noPrintElements.forEach(
        (el) => ((el as HTMLElement).style.display = "none"),
      );

      // Force the pdf-export class to ensure light mode variables are used
      element.classList.add("pdf-export");

      // Capture using toJpeg for significantly smaller file size
      // quality: 0.8 is a great balance between size and crispness
      // pixelRatio: 2 is standard "Retina" quality, sufficient for print
      const dataUrl = await toJpeg(element, {
        quality: 0.8,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        includeQueryParams: true,
      });

      // Cleanup: remove the class
      element.classList.remove("pdf-export");

      // Restore 'no-print' elements
      noPrintElements.forEach((el) => ((el as HTMLElement).style.display = ""));

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
        compress: true, // Enable PDF level compression
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Use JPEG format and FAST compression for the PDF internal image
      pdf.addImage(
        dataUrl,
        "JPEG",
        0,
        0,
        pdfWidth,
        pdfHeight,
        undefined,
        "FAST",
      );
      pdf.save(`${record.invoice_number}.pdf`);

      notify("resources.invoices.notification.pdf_downloaded", {
        type: "success",
        messageArgs: { number: record.invoice_number },
      });
    } catch (error: any) {
      console.error("PDF Generation Error (html-to-image):", error);
      notify("Error generating PDF: " + error.message, { type: "warning" });
      // Ensure cleanup on error
      element?.classList.remove("pdf-export");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={isGenerating}
      className={`w-full justify-start ${className}`}
    >
      {isGenerating ? (
        <FileText className="w-4 h-4 mr-2 animate-pulse" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {isGenerating
        ? translate("ra.action.loading")
        : translate("resources.invoices.action.download_pdf") || "Download PDF"}
    </Button>
  );
};
