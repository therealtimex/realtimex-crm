import { format } from "date-fns";
import { AlertCircle, Clock } from "lucide-react";
import { useGetList, useTranslate } from "ra-core";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ds/ui/card";
import { Badge } from "@/components/ds/ui/badge";

import type { Invoice } from "../types";

export const OutstandingInvoices = () => {
  const translate = useTranslate();
  const { data, isPending } = useGetList<Invoice>("invoices", {
    pagination: { page: 1, perPage: 5 },
    sort: { field: "due_date", order: "ASC" },
    filter: {
      status: ["sent", "overdue"],
    },
  });

  if (isPending || !data || data.length === 0) return null;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-warning" />
          {translate("crm.dashboard.outstanding_invoices")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((invoice) => (
            <Link
              key={invoice.id}
              to={`/invoices/${invoice.id}/show`}
              className="flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  #{invoice.invoice_number}
                </span>
                <span className="text-xs text-muted-foreground">
                  {invoice.company_name}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold">
                  {invoice.currency} {invoice.total.toLocaleString()}
                </span>
                {new Date(invoice.due_date) < new Date() ? (
                  <Badge
                    variant="destructive"
                    className="h-4 text-[10px] px-1 uppercase"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {translate("resources.invoices.status.overdue")}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {format(new Date(invoice.due_date), "MMM d")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
