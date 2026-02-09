import React, { useState, useEffect } from "react";
import PostalMime from "postal-mime";
import DOMPurify from "dompurify";
import {
  Mail,
  User,
  Calendar,
  Paperclip,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import { Separator } from "@/components/ds/ui/separator";
import { useTranslate } from "ra-core";

interface EmailViewerProps {
  content: ArrayBuffer | string;
  onError?: (error: string) => void;
}

interface EmailAddress {
  name?: string;
  address: string;
}

interface ParsedEmail {
  from?: EmailAddress;
  to?: EmailAddress[];
  cc?: EmailAddress[];
  subject?: string;
  date?: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename?: string;
    mimeType?: string;
    content?: Uint8Array;
    size?: number;
  }>;
}

export const EmailViewer = ({ content, onError }: EmailViewerProps) => {
  const [email, setEmail] = useState<ParsedEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHtml, setShowHtml] = useState(true);
  const translate = useTranslate();

  useEffect(() => {
    const parseEmail = async () => {
      try {
        setLoading(true);
        const parser = new PostalMime();

        // Convert content to ArrayBuffer if it's a string
        let buffer: ArrayBuffer;
        if (typeof content === "string") {
          const encoder = new TextEncoder();
          buffer = encoder.encode(content).buffer;
        } else {
          buffer = content;
        }

        const parsed = await parser.parse(buffer);

        setEmail({
          from: parsed.from as EmailAddress | undefined,
          to: parsed.to as EmailAddress[] | undefined,
          cc: parsed.cc as EmailAddress[] | undefined,
          subject: parsed.subject,
          date: parsed.date,
          html: parsed.html,
          text: parsed.text,
          attachments: parsed.attachments?.map((att: any) => ({
            filename: att.filename,
            mimeType: att.mimeType,
            content: att.content,
            size: att.content?.length,
          })),
        });
      } catch (err) {
        console.error("Failed to parse email:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : translate("crm.email_viewer.error.parse");
        onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    parseEmail();
  }, [content, onError, translate]);

  const formatEmailAddress = (addr?: EmailAddress) => {
    if (!addr) return translate("crm.email_viewer.field.unknown");
    return addr.name ? `${addr.name} <${addr.address}>` : addr.address;
  };

  const formatEmailAddressList = (addrs?: EmailAddress[]) => {
    if (!addrs || addrs.length === 0)
      return translate("crm.email_viewer.field.none");
    return addrs.map(formatEmailAddress).join(", ");
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return translate("crm.email_viewer.field.unknown");
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const downloadAttachment = (
    attachment: NonNullable<ParsedEmail["attachments"]>[0],
  ) => {
    if (!attachment.content) return;

    const blob = new Blob([attachment.content], {
      type: attachment.mimeType || "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = attachment.filename || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>{translate("crm.email_viewer.error.load")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Email Headers */}
      <div className="border-b bg-muted/20 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-primary mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold break-words">
              {email.subject ||
                translate("crm.email_viewer.field.subject_none")}
            </h2>
          </div>
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">
                {translate("crm.email_viewer.field.from")}:
              </span>{" "}
              <span className="text-muted-foreground break-words">
                {formatEmailAddress(email.from)}
              </span>
            </div>
          </div>

          {email.to && email.to.length > 0 && (
            <div className="flex gap-2">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium">
                  {translate("crm.email_viewer.field.to")}:
                </span>{" "}
                <span className="text-muted-foreground break-words">
                  {formatEmailAddressList(email.to)}
                </span>
              </div>
            </div>
          )}

          {email.cc && email.cc.length > 0 && (
            <div className="flex gap-2">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium">
                  {translate("crm.email_viewer.field.cc")}:
                </span>{" "}
                <span className="text-muted-foreground break-words">
                  {formatEmailAddressList(email.cc)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">
                {translate("crm.email_viewer.field.date")}:
              </span>{" "}
              <span className="text-muted-foreground">
                {formatDate(email.date)}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle HTML/Text view if both are available */}
        {email.html && email.text && (
          <div className="flex gap-2 pt-2">
            <Button
              variant={showHtml ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowHtml(true)}
            >
              {translate("crm.email_viewer.action.html")}
            </Button>
            <Button
              variant={!showHtml ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowHtml(false)}
            >
              {translate("crm.email_viewer.action.text")}
            </Button>
          </div>
        )}
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-auto p-6">
        {showHtml && email.html ? (
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(email.html, {
                ADD_ATTR: ["target"], // Allow target="_blank" for links
                FORBID_TAGS: ["script", "style"],
              }),
            }}
          />
        ) : email.text ? (
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {email.text}
          </pre>
        ) : (
          <p className="text-muted-foreground italic">
            {translate("crm.email_viewer.field.content_none")}
          </p>
        )}
      </div>

      {/* Attachments */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="border-t bg-muted/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {email.attachments.length}{" "}
              {translate(
                email.attachments.length !== 1
                  ? "crm.email_viewer.field.attachments"
                  : "crm.email_viewer.field.attachment",
              )}
            </span>
          </div>
          <div className="space-y-2">
            {email.attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 p-2 bg-background rounded-md border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.filename || `attachment-${index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.mimeType ||
                        translate("crm.email_viewer.field.unknown_type")}{" "}
                      • {formatFileSize(attachment.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => downloadAttachment(attachment)}
                  title={translate(
                    "crm.email_viewer.action.download_attachment",
                  )}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
