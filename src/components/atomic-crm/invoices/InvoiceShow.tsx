import {
  ShowBase,
  useShowContext,
  useTranslate,
  useListContext,
  useDataProvider,
  useNotify,
  useRedirect,
} from "ra-core";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ReferenceField } from "@/components/ds/admin/reference-field";
import { ReferenceManyField } from "@/components/ds/admin/reference-many-field";
import { TextField } from "@/components/ds/admin/text-field";
import { DateField } from "@/components/ds/admin/date-field";
import { FunctionField } from "@/components/ds/admin/function-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/ui/card";
import { Separator } from "@/components/ds/ui/separator";

import { CompanyLogo } from "../companies/CompanyLogo";
import { NoteCreate } from "../notes/NoteCreate";
import { NotesIterator } from "../notes/NotesIterator";
import type { Invoice, InvoiceItem } from "../types";
import { InvoiceAside } from "./InvoiceAside";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

export const InvoiceShow = () => (
  <ShowBase>
    <InvoiceShowContent />
  </ShowBase>
);

const InvoiceShowContent = () => {
  const { record, isPending, error } = useShowContext<Invoice>();
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  // Handle error (invoice not found)
  useEffect(() => {
    if (error) {
      notify("Invoice not found or has been deleted", { type: "error" });
      redirect("/invoices");
    }
  }, [error, notify, redirect]);

  // Fetch business profile for sender branding
  const { data: businessProfile } = useQuery({
    queryKey: ["business_profile"],
    queryFn: async () => {
      try {
        const { data } = await dataProvider.getOne("business_profile", {
          id: 1,
        });
        return data;
      } catch {
        return null;
      }
    },
  });

  if (isPending || !record) return null;

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card id="invoice-content">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                {businessProfile?.logo?.src ? (
                  <img
                    src={businessProfile.logo.src}
                    alt={businessProfile.name}
                    className="w-16 h-16 object-contain rounded border bg-white"
                  />
                ) : (
                  record.company_id && (
                    <ReferenceField
                      source="company_id"
                      reference="companies"
                      link="show"
                    >
                      <CompanyLogo className="no-print" />
                    </ReferenceField>
                  )
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-2xl">
                      {translate("resources.invoices.name", { smart_count: 1 })}{" "}
                      #{record.invoice_number}
                    </CardTitle>
                    <InvoiceStatusBadge
                      status={record.status}
                      dueDate={record.due_date}
                      className="px-3 py-1 text-sm"
                    />
                  </div>
                  {record.reference && (
                    <p className="text-sm text-muted-foreground">
                      {translate("resources.invoices.fields.reference")}:{" "}
                      {record.reference}
                    </p>
                  )}
                </div>
              </div>

              {/* Sender Info (Address/Tax ID) */}
              {businessProfile && (
                <div className="text-right text-xs space-y-1">
                  <p className="font-bold text-sm uppercase">
                    {businessProfile.name}
                  </p>
                  {businessProfile.address && (
                    <p className="whitespace-pre-line text-muted-foreground">
                      {businessProfile.address}
                    </p>
                  )}
                  {businessProfile.tax_id && (
                    <p className="text-muted-foreground">
                      {translate("resources.business_profile.fields.tax_id")}:{" "}
                      {businessProfile.tax_id}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {translate("resources.invoices.section.details")}
                </h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">
                      {translate("resources.invoices.fields.issue_date")}:
                    </dt>
                    <dd className="text-sm font-medium">
                      <DateField source="issue_date" />
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">
                      {translate("resources.invoices.fields.due_date")}:
                    </dt>
                    <dd className="text-sm font-medium">
                      <DateField source="due_date" />
                    </dd>
                  </div>
                  {record.paid_at && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">
                        {translate("resources.invoices.fields.paid_at")}:
                      </dt>
                      <dd className="text-sm font-medium">
                        <DateField source="paid_at" />
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {translate("resources.invoices.section.billing")}
                </h3>
                <dl className="space-y-2">
                  {record.company_id && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">
                        {translate("resources.invoices.fields.company_id")}:
                      </dt>
                      <dd className="text-sm font-medium">
                        <ReferenceField
                          source="company_id"
                          reference="companies"
                          link="show"
                        >
                          <TextField source="name" />
                        </ReferenceField>
                      </dd>
                    </div>
                  )}
                  {record.contact_id && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">
                        {translate("resources.invoices.fields.contact_id")}:
                      </dt>
                      <dd className="text-sm font-medium">
                        <ReferenceField
                          source="contact_id"
                          reference="contacts"
                          link="show"
                        >
                          <FunctionField
                            render={(r: any) =>
                              `${r.first_name} ${r.last_name}`
                            }
                          />
                        </ReferenceField>
                      </dd>
                    </div>
                  )}
                  {record.deal_id && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">
                        {translate("resources.invoices.fields.deal_id")}:
                      </dt>
                      <dd className="text-sm font-medium">
                        <ReferenceField
                          source="deal_id"
                          reference="deals"
                          link="show"
                        >
                          <TextField source="name" />
                        </ReferenceField>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Line Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {translate("resources.invoices.section.items")}
              </h3>
              <ReferenceManyField
                target="invoice_id"
                reference="invoice_items"
                sort={{ field: "sort_order", order: "ASC" }}
              >
                <InvoiceItemsTable currency={record.currency} />
              </ReferenceManyField>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">
                    {translate("resources.invoices.fields.subtotal")}:
                  </span>
                  <span className="text-sm font-medium">
                    {record.currency} {record.subtotal.toFixed(2)}
                  </span>
                </div>
                {record.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>
                      {translate("resources.invoices.fields.discount")}:
                    </span>
                    <span className="font-medium text-warning">
                      {record.discount_type === "percentage"
                        ? `-${record.discount}%`
                        : `-${record.currency} ${record.discount.toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm">
                    {translate("resources.invoices.fields.tax_total")}:
                  </span>
                  <span className="text-sm font-medium">
                    {record.currency} {record.tax_total.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-base font-semibold">
                    {translate("resources.invoices.fields.total")}:
                  </span>
                  <span className="text-base font-semibold">
                    {record.currency} {record.total.toFixed(2)}
                  </span>
                </div>
                {record.amount_paid > 0 && (
                  <>
                    <div className="flex justify-between text-success">
                      <span className="text-sm">
                        {translate("resources.invoices.fields.amount_paid")}:
                      </span>
                      <span className="text-sm font-medium">
                        {record.currency} {record.amount_paid.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-critical">
                      <span className="text-sm font-semibold">
                        {translate("resources.invoices.fields.balance_due")}:
                      </span>
                      <span className="text-sm font-semibold">
                        {record.currency}{" "}
                        {(record.total - record.amount_paid).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notes, Terms & Conditions */}
            <div className="space-y-6">
              {record.notes && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    {translate("resources.invoices.fields.notes")}:
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {record.notes}
                  </p>
                </div>
              )}

              {record.payment_terms && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    {translate("resources.invoices.fields.payment_terms")}:
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {record.payment_terms}
                  </p>
                </div>
              )}

              {record.terms_and_conditions && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    {translate(
                      "resources.invoices.fields.terms_and_conditions",
                    )}
                    :
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {record.terms_and_conditions}
                  </p>
                </div>
              )}

              {businessProfile?.bank_details && (
                <div className="p-4 bg-muted/20 border-l-4 border-muted rounded-r">
                  <h3 className="text-sm font-semibold mb-2">
                    {translate(
                      "resources.business_profile.fields.bank_details",
                    )}
                    :
                  </h3>
                  <p className="text-sm font-mono whitespace-pre-line">
                    {businessProfile.bank_details}
                  </p>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Activity Notes (Hidden from print) */}
            <div className="mt-8 no-print">
              <h3 className="text-lg font-semibold mb-4">
                {translate("resources.invoices.section.activity")}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {translate("resources.invoices.section.activity_description")}
              </p>
              <ReferenceManyField
                target="invoice_id"
                reference="invoice_notes"
                sort={{ field: "date", order: "DESC" }}
                empty={<NoteCreate reference="invoices" className="mt-4" />}
              >
                <NotesIterator reference="invoices" />
              </ReferenceManyField>
            </div>
          </CardContent>
        </Card>
      </div>
      <InvoiceAside />
    </div>
  );
};

const InvoiceItemsTable = ({ currency }: { currency: string }) => {
  const translate = useTranslate();
  const { data } = useListContext<InvoiceItem>();

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {translate("resources.invoices.empty_items")}
      </p>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-4 text-sm font-semibold">
              {translate("resources.invoices.item.name")}
            </th>
            <th className="text-right p-4 text-sm font-semibold">
              {translate("resources.invoices.item.quantity")}
            </th>
            <th className="text-right p-4 text-sm font-semibold">
              {translate("resources.invoices.item.unit_price")}
            </th>
            <th className="text-right p-4 text-sm font-semibold">
              {translate("resources.invoices.item.tax")}
            </th>
            <th className="text-right p-4 text-sm font-semibold">
              {translate("resources.invoices.item.total")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id}
              className={index % 2 === 0 ? "bg-transparent" : "bg-muted/30"}
            >
              <td className="p-4 text-sm">
                <div>
                  <p className="font-medium">{item.description}</p>
                  {item.item_description && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                      {item.item_description}
                    </p>
                  )}
                  {item.item_type !== "service" && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                      {translate(
                        `resources.invoices.item_type.${item.item_type}`,
                      )}
                    </p>
                  )}
                </div>
              </td>
              <td className="p-4 text-sm text-right">{item.quantity}</td>
              <td className="p-4 text-sm text-right">
                {currency} {item.unit_price.toFixed(2)}
              </td>
              <td className="p-4 text-sm text-right">
                {item.tax_rate > 0 ? (
                  <div>
                    <p>{item.tax_rate}%</p>
                    {item.tax_name && (
                      <p className="text-xs text-muted-foreground">
                        {item.tax_name}
                      </p>
                    )}
                  </div>
                ) : (
                  "-"
                )}
              </td>
              <td className="p-4 text-sm text-right font-medium">
                {currency} {item.line_total_with_tax.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
