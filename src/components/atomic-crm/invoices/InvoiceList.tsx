import { useTranslate } from "ra-core";
import { AutocompleteInput } from "@/components/ds/admin/autocomplete-input";
import { CreateButton } from "@/components/ds/admin/create-button";
import { ExportButton } from "@/components/ds/admin/export-button";
import { List } from "@/components/ds/admin/list";
import { ReferenceInput } from "@/components/ds/admin/reference-input";
import { FilterButton } from "@/components/ds/admin/filter-form";
import { SearchInput } from "@/components/ds/admin/search-input";
import { SelectInput } from "@/components/ds/admin/select-input";
import { DataTable } from "@/components/ds/admin/data-table";
import { TextField } from "@/components/ds/admin/text-field";
import { DateField } from "@/components/ds/admin/date-field";
import { ReferenceField } from "@/components/ds/admin/reference-field";
import { FunctionField } from "@/components/ds/admin/function-field";

import { TopToolbar } from "../layout/TopToolbar";
import type { Invoice } from "../types";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

export const InvoiceList = () => {
  const translate = useTranslate();

  const invoiceFilters = [
    <SearchInput source="q" alwaysOn />,
    <SelectInput
      source="status"
      emptyText={translate("resources.invoices.fields.status")}
      choices={[
        { id: "draft", name: translate("resources.invoices.status.draft") },
        { id: "sent", name: translate("resources.invoices.status.sent") },
        { id: "paid", name: translate("resources.invoices.status.paid") },
        { id: "overdue", name: translate("resources.invoices.status.overdue") },
        {
          id: "cancelled",
          name: translate("resources.invoices.status.cancelled"),
        },
      ]}
    />,
    <ReferenceInput source="company_id" reference="companies">
      <AutocompleteInput
        label={false}
        placeholder={translate("crm.filter.company")}
      />
    </ReferenceInput>,
    <ReferenceInput source="contact_id" reference="contacts">
      <AutocompleteInput
        label={false}
        placeholder={translate("crm.filter.contact")}
      />
    </ReferenceInput>,
    <SelectInput
      source="currency"
      emptyText={translate("resources.invoices.fields.currency")}
      choices={[
        { id: "USD", name: "USD" },
        { id: "EUR", name: "EUR" },
        { id: "GBP", name: "GBP" },
        { id: "CAD", name: "CAD" },
        { id: "JPY", name: "JPY" },
        { id: "KRW", name: "KRW" },
      ]}
    />,
  ];

  return (
    <List
      perPage={25}
      sort={{ field: "created_at", order: "DESC" }}
      filters={invoiceFilters}
      actions={<InvoiceActions />}
      resource="invoices"
      storeKey="invoices.list"
    >
      <DataTable rowClick="show" bulkActionButtons={false}>
        <DataTable.Col
          source="invoice_number"
          label="resources.invoices.fields.invoice_number"
        >
          <TextField source="invoice_number" />
        </DataTable.Col>

        <DataTable.Col
          source="company_id"
          label="resources.invoices.fields.company_id"
        >
          <ReferenceField source="company_id" reference="companies" link="show">
            <TextField source="name" />
          </ReferenceField>
        </DataTable.Col>

        <DataTable.Col
          source="contact_id"
          label="resources.invoices.fields.contact_id"
        >
          <ReferenceField source="contact_id" reference="contacts" link="show">
            <FunctionField
              render={(record: any) =>
                `${record.first_name} ${record.last_name}`
              }
            />
          </ReferenceField>
        </DataTable.Col>

        <DataTable.Col source="status" label="resources.invoices.fields.status">
          <FunctionField
            render={(record: Invoice) => (
              <InvoiceStatusBadge
                status={record.status}
                dueDate={record.due_date}
                className="px-2.5 py-0.5 text-xs"
              />
            )}
          />
        </DataTable.Col>

        <DataTable.Col
          source="issue_date"
          label="resources.invoices.fields.issue_date"
        >
          <DateField source="issue_date" />
        </DataTable.Col>

        <DataTable.Col
          source="due_date"
          label="resources.invoices.fields.due_date"
        >
          <DateField source="due_date" />
        </DataTable.Col>

        <DataTable.Col
          label="resources.invoices.fields.total"
          headerClassName="text-right"
        >
          <FunctionField
            render={(record: Invoice) => (
              <span className="font-semibold">
                {record.currency} {record.total.toFixed(2)}
              </span>
            )}
            className="block text-right"
          />
        </DataTable.Col>

        <DataTable.Col
          label="resources.invoices.fields.balance_due"
          headerClassName="text-right"
        >
          <FunctionField
            render={(record: Invoice) => {
              const total = record.total || 0;
              const paid = record.amount_paid || 0;
              const balance = total - paid;
              return balance > 0.01 ? (
                <span className="text-critical font-semibold">
                  {record.currency} {balance.toFixed(2)}
                </span>
              ) : (
                <span className="text-success">
                  {translate("resources.invoices.status.paid")}
                </span>
              );
            }}
            className="block text-right"
          />
        </DataTable.Col>
      </DataTable>
    </List>
  );
};

const InvoiceActions = () => {
  const translate = useTranslate();
  return (
    <TopToolbar>
      <FilterButton />
      <ExportButton />
      <CreateButton
        label={translate("resources.invoices.action.new_invoice")}
      />
    </TopToolbar>
  );
};
