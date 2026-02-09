import { Paperclip, Eye, Download } from "lucide-react";
import { useState } from "react";

import type { AttachmentNote, ContactNote, DealNote } from "../types";
import { DocumentViewer } from "../misc/DocumentViewer";
import { Button } from "@/components/ds/ui/button";

export const NoteAttachments = ({ note }: { note: ContactNote | DealNote }) => {
  const [selectedAttachment, setSelectedAttachment] =
    useState<AttachmentNote | null>(null);

  if (!note.attachments || note.attachments.length === 0) {
    return null;
  }

  const imageAttachments = note.attachments.filter(
    (attachment: AttachmentNote) => isImageMimeType(attachment.type),
  );
  const otherAttachments = note.attachments.filter(
    (attachment: AttachmentNote) => !isImageMimeType(attachment.type),
  );

  return (
    <div className="flex flex-col gap-2">
      {imageAttachments.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {imageAttachments.map((attachment: AttachmentNote, index: number) => (
            <div key={index} className="group relative">
              <img
                src={attachment.src}
                alt={attachment.title}
                className="w-full h-[100px] object-cover cursor-pointer border border-border rounded-md transition-all group-hover:opacity-75"
                onClick={() => setSelectedAttachment(attachment)}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Eye className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>
          ))}
        </div>
      )}
      {otherAttachments.length > 0 &&
        otherAttachments.map((attachment: AttachmentNote, index: number) => (
          <div
            key={index}
            className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 rounded-md transition-colors group"
          >
            <button
              onClick={() => setSelectedAttachment(attachment)}
              className="flex items-center gap-2 overflow-hidden cursor-pointer text-left hover:text-primary transition-colors flex-1 min-w-0"
              title={`View ${attachment.title}`}
            >
              <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate font-medium">
                {attachment.title}
              </span>
            </button>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedAttachment(attachment)}
                title="View"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
                title="Download"
              >
                <a href={attachment.src} download={attachment.title}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        ))}

      {selectedAttachment && (
        <DocumentViewer
          open={!!selectedAttachment}
          onOpenChange={(open) => !open && setSelectedAttachment(null)}
          url={selectedAttachment.src}
          title={selectedAttachment.title}
          type={selectedAttachment.type}
          file={selectedAttachment.rawFile}
        />
      )}
    </div>
  );
};

const isImageMimeType = (mimeType?: string): boolean => {
  if (!mimeType) {
    return false;
  }
  return mimeType.startsWith("image/");
};
