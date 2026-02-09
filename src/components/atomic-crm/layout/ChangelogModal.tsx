import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/ui/dialog";
import { Loader2 } from "lucide-react";
import { useTranslate } from "ra-core";

interface ChangelogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangelogModal = ({ open, onOpenChange }: ChangelogModalProps) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const translate = useTranslate();

  useEffect(() => {
    if (open && !content) {
      setLoading(true);
      fetch("/CHANGELOG.md")
        .then((res) => res.text())
        .then((text) => {
          setContent(text);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch changelog:", err);
          setContent("Failed to load changelog.");
          setLoading(false);
        });
    }
  }, [open, content]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            🚀 {translate("crm.changelog.title", { _: "What's New" })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-6 overflow-y-auto bg-card scrollbar-thin scrollbar-thumb-muted-foreground/20">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
