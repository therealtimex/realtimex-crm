import {
  ShowBase,
  useListContext,
  useRecordContext,
  useShowContext,
  useTranslate,
  useNotify,
  useRedirect,
} from "ra-core";
import { useEffect } from "react";
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

const isCanceledRequestError = (value: unknown) => {
  if (!value) return false;

  const pending: unknown[] = [value];
  const seen = new Set<unknown>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (typeof current === "string") {
      const text = current.toLowerCase();
      if (
        text.includes("abort") ||
        text.includes("canceled") ||
        text.includes("cancelled") ||
        text.includes("err_canceled")
      ) {
        return true;
      }
      continue;
    }

    if (typeof current !== "object") continue;

    const maybeError = current as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      details?: unknown;
      cause?: unknown;
      error?: unknown;
      reason?: unknown;
    };

    const text = [
      maybeError.name,
      maybeError.message,
      maybeError.code,
      maybeError.details,
    ]
      .filter((token): token is string => typeof token === "string")
      .map((token) => token.toLowerCase())
      .join(" ");

    if (
      text.includes("abort") ||
      text.includes("canceled") ||
      text.includes("cancelled") ||
      text.includes("err_canceled")
    ) {
      return true;
    }

    if (maybeError.cause) pending.push(maybeError.cause);
    if (maybeError.error) pending.push(maybeError.error);
    if (maybeError.reason) pending.push(maybeError.reason);
  }

  return false;
};

export const ContactShow = () => (
  <ShowBase
    redirectOnError={false}
    queryOptions={{ onError: () => undefined }}
  >
    <ContactShowContent />
  </ShowBase>
);

const ContactShowContent = () => {
  const { record, isPending, error } = useShowContext<Contact>();
  const translate = useTranslate();
  const notify = useNotify();
  const redirect = useRedirect();

  // Handle error (contact not found)
  useEffect(() => {
    if (isPending || record || !error || isCanceledRequestError(error)) return;
    notify("Contact not found or has been deleted", { type: "error" });
    redirect("/contacts");
  }, [error, isPending, notify, record, redirect]);

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
