import {
  ShowBase,
  useListContext,
  useRecordContext,
  useShowContext,
  useTranslate,
} from "ra-core";
import { Link as RouterLink } from "react-router-dom";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import { ReferenceField } from "@/components/ds/admin/reference-field";
import { ReferenceManyField } from "@/components/ds/admin/reference-many-field";
import { Card, CardContent } from "@/components/ds/ui/card";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { NoteCreate } from "../notes/NoteCreate";
import { NotesIterator } from "../notes/NotesIterator";
import type { Deal, Invoice } from "../types";
import { DealAside } from "./DealAside";
import { InvoiceCard } from "../invoices";

export const DealShow = () => (
  <ShowBase>
    <DealShowContent />
  </ShowBase>
);

const DealShowContent = () => {
  const { record, isPending } = useShowContext<Deal>();
  const translate = useTranslate();

  if (isPending || !record) return null;

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            {/* Deal Header */}
            <div className="flex items-center gap-4 mb-6">
              <ReferenceField
                source="company_id"
                reference="companies"
                link="show"
              >
                <CompanyAvatar />
              </ReferenceField>
              <h5 className="text-xl font-semibold">{record.name}</h5>
            </div>

            {/* Description */}
            {record.description && (
              <div className="mb-6 whitespace-pre-line">
                <h3 className="text-lg font-semibold mb-2">
                  {translate("crm.deal.field.description")}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {record.description}
                </p>
              </div>
            )}

            {/* Notes Section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                {translate("crm.deal.section.notes")}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {translate("crm.deal.section.notes_description")}
              </p>
              <ReferenceManyField
                target="deal_id"
                reference="dealNotes"
                sort={{ field: "date", order: "DESC" }}
                empty={<NoteCreate reference="deals" className="mt-4" />}
              >
                <NotesIterator reference="deals" />
              </ReferenceManyField>
            </div>

            {/* Invoices Section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                {translate("resources.invoices.name", { smart_count: 2 })}
              </h3>
              <ReferenceManyField
                target="deal_id"
                reference="invoices"
                sort={{ field: "issue_date", order: "DESC" }}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <CreateRelatedInvoiceButton />
                  </div>
                  <InvoicesIterator />
                </div>
              </ReferenceManyField>
            </div>
          </CardContent>
        </Card>
      </div>
      <DealAside />
    </div>
  );
};

const InvoicesIterator = () => {
  const { data: invoices, error, isPending } = useListContext<Invoice>();
  if (isPending || error) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {invoices.map((invoice) => (
        <RouterLink key={invoice.id} to={`/invoices/${invoice.id}/show`}>
          <InvoiceCard invoice={invoice} />
        </RouterLink>
      ))}
    </div>
  );
};

const CreateRelatedInvoiceButton = () => {
  const deal = useRecordContext<Deal>();
  const translate = useTranslate();
  return (
    <Button variant="outline" asChild size="sm" className="h-9">
      <RouterLink
        to="/invoices/create"
        state={
          deal
            ? {
                record: {
                  deal_id: deal.id,
                  company_id: deal.company_id,
                },
              }
            : undefined
        }
        className="flex items-center gap-2"
      >
        <Receipt className="h-4 w-4" />
        {translate("crm.common.add_invoice")}
      </RouterLink>
    </Button>
  );
};
