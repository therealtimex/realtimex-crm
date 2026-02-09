import { useTranslate } from "ra-core";
import { Card, CardContent } from "@/components/ds/ui/card";

import type { Invoice } from "../types";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

export const InvoiceCard = ({ invoice }: { invoice: Invoice }) => {
  const translate = useTranslate();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-lg">#{invoice.invoice_number}</h3>
            {invoice.company_name && (
              <p className="text-sm text-muted-foreground">
                {invoice.company_name}
              </p>
            )}
          </div>
          <InvoiceStatusBadge
            status={invoice.status}
            dueDate={invoice.due_date}
            className="px-2 py-0.5 text-xs"
          />
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {translate("resources.invoices.fields.total")}:
            </span>
            <span className="font-semibold">
              {invoice.currency} {invoice.total.toFixed(2)}
            </span>
          </div>

          {invoice.balance_due && invoice.balance_due > 0 && (
            <div className="flex justify-between text-critical">
              <span>{translate("resources.invoices.fields.balance_due")}:</span>
              <span className="font-semibold">
                {invoice.currency} {invoice.balance_due.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-xs text-muted-foreground pt-2">
            <span>
              {translate("resources.invoices.fields.due_date")}:{" "}
              {new Date(invoice.due_date).toLocaleDateString()}
            </span>
            {invoice.days_overdue && invoice.days_overdue > 0 && (
              <span className="text-critical font-medium">
                {invoice.days_overdue}{" "}
                {translate("resources.invoices.days_overdue")}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
