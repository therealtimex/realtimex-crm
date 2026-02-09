import { Badge } from "@/components/ds/ui/badge";
import { useTranslate } from "ra-core";
import { translateChoice } from "@/i18n/utils";

const priorityVariants = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "critical",
};

export const TaskPriorityBadge = ({ priority }: { priority?: string }) => {
  const translate = useTranslate();
  if (!priority) return null;
  const variant =
    priorityVariants[priority as keyof typeof priorityVariants] || "neutral";
  const label = translateChoice(
    translate,
    "crm.task.priority",
    priority,
    priority,
  );

  return <Badge variant={variant}>{label}</Badge>;
};
