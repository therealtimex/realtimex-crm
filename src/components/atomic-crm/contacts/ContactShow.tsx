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
import { TextField } from "@/components/ds/admin/text-field";
import { Card, CardContent } from "@/components/ds/ui/card";

import { CompanyAvatar } from "../companies/CompanyAvatar";
import { NoteCreate, NotesIterator } from "../notes";
import { Avatar } from "./Avatar";
import { ContactAside } from "./ContactAside";
import { ActivityFeed } from "../activities/ActivityFeed";
import { InvoiceCard } from "../invoices";
import type { Contact, Invoice } from "../types";

export const ContactShow = () => (
  <ShowBase>
    <ContactShowContent />
  </ShowBase>
);

const ContactShowContent = () => {
  const { record, isPending } = useShowContext<Contact>();
  const translate = useTranslate();
  if (isPending || !record) return null;

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            <div className="flex">
              <Avatar />
              <div className="ml-2 flex-1">
                <h5 className="text-xl font-semibold">
                  {record.first_name} {record.last_name}
                </h5>
                <div className="inline-flex text-sm text-muted-foreground">
                  {record.title}
                  {record.title &&
                    record.company_id != null &&
                    ` ${translate("crm.contact.field.at")} `}
                  {record.company_id != null && (
                    <ReferenceField
                      source="company_id"
                      reference="companies"
                      link="show"
                    >
                      &nbsp;
                      <TextField source="name" />
                    </ReferenceField>
                  )}
                </div>
              </div>
              <div>
                <ReferenceField
                  source="company_id"
                  reference="companies"
                  link="show"
                  className="no-underline"
                >
                  <CompanyAvatar />
                </ReferenceField>
              </div>
            </div>

            {/* Activity Timeline - Shows processing status (temporary) */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">
                {translate("crm.contact.section.activity_timeline")}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {translate("crm.contact.section.activity_timeline_description")}
              </p>
              <ActivityFeed contactId={record.id as number} />
            </div>

            {/* Notes - Permanent record of outcomes */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                {translate("crm.contact.section.notes")}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {translate("crm.contact.section.notes_description")}
              </p>
              <ReferenceManyField
                target="contact_id"
                reference="contactNotes"
                sort={{ field: "date", order: "DESC" }}
                empty={
                  <NoteCreate
                    reference="contacts"
                    showStatus
                    className="mt-4"
                  />
                }
              >
                <NotesIterator reference="contacts" showStatus />
              </ReferenceManyField>
            </div>

            {/* Invoices Section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                {translate("resources.invoices.name", { smart_count: 2 })}
              </h3>
              <ReferenceManyField
                target="contact_id"
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
      <ContactAside />
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
  const contact = useRecordContext<Contact>();
  const translate = useTranslate();
  return (
    <Button variant="outline" asChild size="sm" className="h-9">
      <RouterLink
        to="/invoices/create"
        state={
          contact
            ? {
                record: {
                  contact_id: contact.id,
                  company_id: contact.company_id,
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
