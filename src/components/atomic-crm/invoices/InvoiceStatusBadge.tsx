import { useTranslate } from "ra-core";
import { Badge } from "@/components/ds/ui/badge";
import { cn } from "@/lib/utils";

type InvoiceDisplayStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

const invoiceStatusVariants = {
  draft: "neutral",
  sent: "info",
  paid: "success",
  overdue: "critical",
  cancelled: "outline",
} as const;

const getInvoiceDisplayStatus = (
  status: string,
  dueDate?: string | null,
): InvoiceDisplayStatus => {
  if (status === "paid" || status === "cancelled") {
    return status as InvoiceDisplayStatus;
  }

  if (dueDate) {
    const due = new Date(dueDate);
    if (!Number.isNaN(due.getTime()) && due < new Date()) {
      return "overdue";
    }
  }

  if (status in invoiceStatusVariants) {
    return status as InvoiceDisplayStatus;
  }

  return "draft";
};

export const InvoiceStatusBadge = ({
  status,
  dueDate,
  className,
}: {
  status: string;
  dueDate?: string | null;
  className?: string;
}) => {
  const translate = useTranslate();
  const displayStatus = getInvoiceDisplayStatus(status, dueDate);
  const variant = invoiceStatusVariants[displayStatus];

  return (
    <Badge
      variant={variant}
      className={cn("rounded-full font-semibold capitalize", className)}
    >
      {translate(`resources.invoices.status.${displayStatus}`)}
    </Badge>
  );
};
