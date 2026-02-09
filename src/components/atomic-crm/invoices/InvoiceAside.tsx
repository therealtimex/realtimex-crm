import {
  useNotify,
  useRefresh,
  useShowContext,
  useTranslate,
  useUpdate,
  useDataProvider,
} from "ra-core";
import { Check, Download, Printer, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/ui/card";
import { DateField } from "@/components/ds/admin/date-field";
import { ReferenceField } from "@/components/ds/admin/reference-field";
import { TextField } from "@/components/ds/admin/text-field";
import { EditButton } from "@/components/ds/admin/edit-button";

import { InvoiceEmailModal } from "./InvoiceEmailModal";
import { DownloadPDFButton } from "./DownloadPDFButton";
import type { Invoice } from "../types";

export const InvoiceAside = () => {
  const { record, isPending } = useShowContext<Invoice>();
  const translate = useTranslate();

  if (isPending || !record) return null;

  return (
    <div className="w-80 space-y-4">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {translate("resources.invoices.section.actions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 flex flex-col pt-2">
          <EditButton />
          {record.status === "draft" && (
            <ActionButton
              label="resources.invoices.action.mark_as_sent"
              status="sent"
              icon={<Send className="w-4 h-4 mr-2" />}
              record={record}
            />
          )}
          {(record.status === "draft" ||
            record.status === "sent" ||
            record.status === "overdue") && (
            <ActionButton
              label="resources.invoices.action.mark_as_paid"
              status="paid"
              icon={<Check className="w-4 h-4 mr-2" />}
              record={record}
            />
          )}
          {record.status !== "cancelled" && record.status !== "paid" && (
            <ActionButton
              label="resources.invoices.action.mark_as_cancelled"
              status="cancelled"
              variant="outline"
              icon={<XCircle className="w-4 h-4 mr-2" />}
              record={record}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="w-full justify-start"
          >
            <Printer className="w-4 h-4 mr-2" />
            {translate("resources.invoices.action.print")}
          </Button>
          <ExportCSVButton record={record} />
          <DownloadPDFButton record={record} />
          <InvoiceEmailModal record={record} />
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {translate("resources.invoices.section.details")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {translate("resources.invoices.fields.invoice_number")}
            </p>
            <p className="text-sm font-medium">{record.invoice_number}</p>
          </div>

          {record.reference && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {translate("resources.invoices.fields.reference")}
              </p>
              <p className="text-sm font-medium">{record.reference}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {translate("resources.invoices.fields.currency")}
            </p>
            <p className="text-sm font-medium">{record.currency}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {translate("resources.invoices.fields.created_at")}
            </p>
            <p className="text-sm">
              <DateField source="created_at" showTime />
            </p>
          </div>

          {record.sent_at && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {translate("resources.invoices.fields.sent_at")}
              </p>
              <p className="text-sm">
                <DateField source="sent_at" showTime />
              </p>
            </div>
          )}

          {record.viewed_at && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {translate("resources.invoices.fields.viewed_at")}
              </p>
              <p className="text-sm">
                <DateField source="viewed_at" showTime />
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned To */}
      {record.sales_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {translate("resources.invoices.section.assigned_to")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReferenceField source="sales_id" reference="sales" link={false}>
              <div className="flex items-center gap-2">
                <div className="text-sm">
                  <TextField source="first_name" />{" "}
                  <TextField source="last_name" />
                </div>
              </div>
            </ReferenceField>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ExportCSVButton = ({ record }: { record: Invoice }) => {
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const handleExport = async () => {
    try {
      // Fetch invoice items
      const { data: items } = await dataProvider.getList("invoice_items", {
        filter: { invoice_id: record.id },
        pagination: { page: 1, perPage: 100 },
        sort: { field: "sort_order", order: "ASC" },
      });

      // Prepare CSV content
      const header = [
        "Invoice Number",
        "Reference",
        "Issue Date",
        "Due Date",
        "Status",
        "Currency",
        "Subtotal",
        "Discount",
        "Tax Total",
        "Total",
        "Item Name",
        "Item Qty",
        "Item Price",
        "Item Total",
      ];

      const rows = items.map((item: any) => [
        record.invoice_number,
        record.reference || "",
        record.issue_date,
        record.due_date,
        record.status,
        record.currency,
        record.subtotal,
        record.discount,
        record.tax_total,
        record.total,
        item.description,
        item.quantity,
        item.unit_price,
        item.line_total_with_tax,
      ]);

      const csvContent = [
        header.join(","),
        ...rows.map((row: any[]) =>
          row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `invoice-${record.invoice_number}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      notify(error.message, { type: "warning" });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      className="w-full justify-start"
    >
      <Download className="w-4 h-4 mr-2" />
      {translate("resources.invoices.action.export_csv")}
    </Button>
  );
};

const ActionButton = ({
  label,
  status,
  icon,
  record,
  variant = "default",
}: {
  label: string;
  status: Invoice["status"];
  icon: React.ReactNode;
  record: Invoice;
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update, { isPending }] = useUpdate();

  const handleUpdate = () => {
    update(
      "invoices",
      {
        id: record.id,
        data: {
          status,
          ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}),
          ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}),
        },
      },
      {
        onSuccess: () => {
          notify("resources.invoices.notification.status_updated", {
            type: "info",
            messageArgs: {
              status: translate(`resources.invoices.status.${status}`),
            },
          });
          refresh();
        },
        onError: (error: any) => notify(error.message, { type: "warning" }),
      },
    );
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleUpdate}
      disabled={isPending}
      className="w-full justify-start"
    >
      {icon}
      {translate(label)}
    </Button>
  );
};
