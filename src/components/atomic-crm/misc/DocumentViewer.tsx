import React, { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Download,
  FileText,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  Presentation,
  Mail,
} from "lucide-react";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import ReactMarkdown from "react-markdown";
import { renderAsync } from "docx-preview";
import { PPTXViewer, parsePPTX } from "@kandiforge/pptx-renderer";
import { Button } from "@/components/ds/ui/button";
import { EmailViewer } from "./EmailViewer";
import { useTranslate } from "ra-core";

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface DocumentViewerProps {
  url: string;
  title: string;
  type?: string;
  file?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DocumentViewer = ({
  url,
  title,
  type,
  file,
  open,
  onOpenChange,
}: DocumentViewerProps) => {
  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const [emlBuffer, setEmlBuffer] = useState<ArrayBuffer | null>(null);
  const docxRef = useRef<HTMLDivElement>(null);
  const translate = useTranslate();

  // Effect for DOCX content rendering
  useEffect(() => {
    if (docxBuffer && docxRef.current) {
      const renderDocx = async () => {
        try {
          if (docxRef.current) {
            docxRef.current.innerHTML = "";
            await renderAsync(docxBuffer, docxRef.current);
            // Clear buffer after successful render to prevent memory leak
            setDocxBuffer(null);
          }
        } catch (err) {
          console.error("Failed to render DOCX:", err);
          setError(translate("crm.document_viewer.error.docx"));
        }
      };
      renderDocx();
    }
  }, [docxBuffer, translate]);

  useEffect(() => {
    if (!open) {
      setDocxBuffer(null);
      setContent(null);
      setError(null);
      setLoading(false);
      setEmlBuffer(null);
      return;
    }

    const abortController = new AbortController();
    const extension = title.split(".").pop()?.toLowerCase();
    const mimeType = type || getMimeTypeFromExtension(extension);
    const isSpreadsheet = extension === "xlsx" || extension === "xls";

    setLoading(true);
    setError(null);

    const loadContent = async () => {
      const getArrayBuffer = async () => {
        // Priority 1: Use File object if available (handles blob URLs)
        if (file && typeof file.arrayBuffer === "function") {
          return await file.arrayBuffer();
        }

        // Priority 2: For blob URLs, fetch them directly
        if (url.startsWith("blob:")) {
          const response = await fetch(url, { signal: abortController.signal });
          if (!response.ok)
            throw new Error(`Failed to fetch blob (${response.status})`);
          return await response.arrayBuffer();
        }

        // Priority 3: Regular HTTP URLs with size check
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok)
          throw new Error(`Failed to fetch (${response.status})`);

        // Check file size before downloading
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
          throw new Error(
            translate("crm.document_viewer.error.too_large", {
              size: (parseInt(contentLength) / 1024 / 1024).toFixed(1),
            }),
          );
        }

        return await response.arrayBuffer();
      };

      const getText = async () => {
        // Priority 1: Use File object if available
        if (file && typeof file.text === "function") {
          return await file.text();
        }

        // Priority 2: For blob URLs, fetch them directly
        if (url.startsWith("blob:")) {
          const response = await fetch(url, { signal: abortController.signal });
          if (!response.ok)
            throw new Error(`Failed to fetch blob (${response.status})`);
          return await response.text();
        }

        // Priority 3: Regular HTTP URLs with size check
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok)
          throw new Error(`Failed to fetch (${response.status})`);

        // Check file size before downloading
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
          throw new Error(
            translate("crm.document_viewer.error.too_large", {
              size: (parseInt(contentLength) / 1024 / 1024).toFixed(1),
            }),
          );
        }

        return await response.text();
      };

      try {
        if (extension === "eml") {
          const buffer = await getArrayBuffer();
          setEmlBuffer(buffer);
        } else if (extension === "docx") {
          const buffer = await getArrayBuffer();
          setDocxBuffer(buffer);
          setContent(
            <div
              ref={docxRef}
              className="p-4 bg-white dark:bg-slate-900 min-h-full"
            />,
          );
        } else if (extension === "md" || extension === "markdown") {
          const text = await getText();
          setContent(
            <div className="p-8 prose prose-slate dark:prose-invert max-w-none bg-background">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>,
          );
        } else if (
          isSpreadsheet ||
          mimeType?.startsWith("image/") ||
          mimeType?.startsWith("video/") ||
          mimeType?.startsWith("audio/") ||
          mimeType === "application/pdf"
        ) {
          setContent(
            <DocViewer
              documents={[{ uri: url, fileName: title, fileType: mimeType }]}
              pluginRenderers={DocViewerRenderers}
              config={{
                header: { disableHeader: true, disableFileName: true },
              }}
              className="h-full"
            />,
          );
        } else if (extension === "pptx") {
          const buffer = await getArrayBuffer();
          const pptxData = await parsePPTX(buffer);
          setContent(
            <div className="h-full w-full bg-background overflow-hidden flex flex-col pt-2">
              <PPTXViewer
                pptxData={pptxData}
                showFilmstrip={true}
                filmstripPosition="left"
                showModeToggle={false}
              />
            </div>,
          );
        } else if (mimeType?.startsWith("text/")) {
          const text = await getText();
          setContent(
            <pre className="p-4 font-mono text-sm whitespace-pre-wrap">
              {text}
            </pre>,
          );
        } else {
          setContent(
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
              <FileArchive className="w-16 h-16 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground">
                  {translate("crm.document_viewer.error.not_available")}
                </p>
              </div>
              <Button asChild>
                <a href={url} download={title}>
                  <Download className="mr-2 h-4 w-4" />
                  {translate("crm.document_viewer.action.download")}
                </a>
              </Button>
            </div>,
          );
        }
      } catch (err) {
        // Ignore aborted requests
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Failed to load document:", err);
        const isFetchError =
          err instanceof TypeError && err.message.includes("Failed to fetch");
        const msg = isFetchError
          ? translate("crm.document_viewer.error.access")
          : err instanceof Error
            ? err.message
            : translate("crm.document_viewer.error.load");
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadContent();

    // Cleanup: abort pending requests when component unmounts or URL changes
    return () => abortController.abort();
  }, [url, title, type, open, file, translate]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] h-[90vh] bg-background border rounded-lg shadow-xl z-50 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileIcon
                extension={title.split(".").pop()?.toLowerCase()}
                className="w-5 h-5 text-primary shrink-0"
              />
              <Dialog.Title className="text-sm font-medium truncate">
                {title}
              </Dialog.Title>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                asChild
                title={translate("crm.document_viewer.action.download")}
              >
                <a href={url} download={title}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 overflow-auto relative bg-muted/10">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive">
                <p>{error}</p>
                <Button
                  variant="link"
                  onClick={() => window.open(url, "_blank")}
                >
                  {translate("crm.document_viewer.action.open_new_tab")}
                </Button>
              </div>
            )}
            {!loading &&
              !error &&
              (emlBuffer ? (
                <EmailViewer content={emlBuffer} onError={setError} />
              ) : (
                content
              ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const FileIcon = ({
  extension,
  className,
}: {
  extension?: string;
  className?: string;
}) => {
  switch (extension) {
    case "pdf":
      return <FileText className={className} />;
    case "docx":
    case "doc":
      return <FileText className={className} />;
    case "xlsx":
    case "xls":
    case "csv":
      return <FileCode className={className} />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return <FileImage className={className} />;
    case "mp4":
    case "mov":
    case "avi":
      return <FileVideo className={className} />;
    case "mp3":
    case "wav":
    case "ogg":
      return <FileAudio className={className} />;
    case "pptx":
    case "ppt":
      return <Presentation className={className} />;
    case "eml":
      return <Mail className={className} />;
    default:
      return <FileArchive className={className} />;
  }
};

const getMimeTypeFromExtension = (ext?: string): string => {
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    txt: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    eml: "message/rfc822",
  };
  return ext
    ? mimeTypes[ext] || "application/octet-stream"
    : "application/octet-stream";
};
