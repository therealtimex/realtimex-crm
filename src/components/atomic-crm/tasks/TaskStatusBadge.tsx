import { Badge } from "@/components/ds/ui/badge";
import { useTranslate } from "ra-core";
import { translateChoice } from "@/i18n/utils";

const statusVariants = {
  todo: "neutral",
  in_progress: "info",
  blocked: "critical",
  done: "success",
  cancelled: "outline",
};

export const TaskStatusBadge = ({ status }: { status?: string }) => {
  const translate = useTranslate();
  if (!status) return null;
  const variant =
    statusVariants[status as keyof typeof statusVariants] || "neutral";
  const label = translateChoice(translate, "crm.task.status", status, status);

  return <Badge variant={variant}>{label}</Badge>;
};
