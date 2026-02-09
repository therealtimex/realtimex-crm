import { formatDistance } from "date-fns";
import { UserPlus, Receipt } from "lucide-react";
import {
  RecordContextProvider,
  ShowBase,
  useListContext,
  useRecordContext,
  useShowContext,
  useTranslate,
  useLocale,
} from "ra-core";
import {
  Link as RouterLink,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router-dom";
import { Button } from "@/components/ds/ui/button";
import { Card, CardContent } from "@/components/ds/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ds/ui/tabs";
import { ReferenceManyField } from "@/components/ds/admin/reference-many-field";
import { SortButton } from "@/components/ds/admin/sort-button";

import { ActivityLog } from "../activity/ActivityLog";
import { Avatar } from "../contacts/Avatar";
import { TagsList } from "../contacts/TagsList";
import { findDealLabel } from "../deals/deal";
import { Status } from "../misc/Status";
import { NoteCreate } from "../notes/NoteCreate";
import { NotesIterator } from "../notes/NotesIterator";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, Contact, Deal, Invoice } from "../types";
import { CompanyAside } from "./CompanyAside";
import { CompanyAvatar } from "./CompanyAvatar";
import { InvoiceCard } from "../invoices";
import { getDateFnsLocale } from "@/i18n/date-fns";

export const CompanyShow = () => (
  <ShowBase>
    <CompanyShowContent />
  </ShowBase>
);

const CompanyShowContent = () => {
  const { record, isPending } = useShowContext<Company>();
  const navigate = useNavigate();
  const translate = useTranslate();

  // Get tab from URL or default to "activity"
  const tabMatch = useMatch("/companies/:id/show/:tab");
  const currentTab = tabMatch?.params?.tab || "activity";

  const handleTabChange = (value: string) => {
    if (value === currentTab) return;
    if (value === "activity") {
      navigate(`/companies/${record?.id}/show`);
      return;
    }
    navigate(`/companies/${record?.id}/show/${value}`);
  };

  if (isPending || !record) return null;

  return (
    <div className="mt-2 flex pb-2 gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            <div className="flex mb-3">
              <CompanyAvatar />
              <h5 className="text-xl ml-2 flex-1">{record.name}</h5>
            </div>
            <Tabs defaultValue={currentTab} onValueChange={handleTabChange}>
              <TabsList className="w-full flex justify-start h-auto p-1 bg-muted/50">
                <TabsTrigger value="activity">
                  {translate("crm.common.activity")}
                </TabsTrigger>
                <TabsTrigger value="contacts">
                  {translate("crm.common.contacts", {
                    smart_count: record.nb_contacts || 0,
                  })}
                </TabsTrigger>
                <TabsTrigger value="notes">
                  {translate("crm.common.notes", {
                    smart_count: record.nb_notes || 0,
                  })}
                </TabsTrigger>
                {record.nb_deals ? (
                  <TabsTrigger value="deals">
                    {translate("crm.common.deals", {
                      smart_count: record.nb_deals || 0,
                    })}
                  </TabsTrigger>
                ) : null}
                <TabsTrigger value="invoices">
                  {translate("crm.common.invoices", {
                    smart_count: record.nb_invoices || 0,
                  })}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="pt-2">
                <ActivityLog companyId={record.id} context="company" />
              </TabsContent>
              <TabsContent value="contacts">
                {record.nb_contacts ? (
                  <ReferenceManyField
                    reference="contacts_summary"
                    target="company_id"
                    sort={{ field: "last_name", order: "ASC" }}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-row justify-end space-x-2 mt-1">
                        {!!record.nb_contacts && (
                          <SortButton
                            fields={["last_name", "first_name", "last_seen"]}
                          />
                        )}
                        <CreateRelatedContactButton />
                      </div>
                      <ContactsIterator />
                    </div>
                  </ReferenceManyField>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-row justify-end space-x-2 mt-1">
                      <CreateRelatedContactButton />
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="notes">
                <ReferenceManyField
                  reference="companyNotes"
                  target="company_id"
                  sort={{ field: "date", order: "DESC" }}
                  empty={<NoteCreate reference="companies" className="mt-4" />}
                >
                  <NotesIterator reference="companies" />
                </ReferenceManyField>
              </TabsContent>
              <TabsContent value="deals">
                {record.nb_deals ? (
                  <ReferenceManyField
                    reference="deals"
                    target="company_id"
                    sort={{ field: "name", order: "ASC" }}
                  >
                    <DealsIterator />
                  </ReferenceManyField>
                ) : null}
              </TabsContent>
              <TabsContent value="invoices">
                <ReferenceManyField
                  reference="invoices"
                  target="company_id"
                  sort={{ field: "issue_date", order: "DESC" }}
                >
                  <div className="flex flex-col gap-4 pt-2">
                    <div className="flex flex-row justify-end space-x-2">
                      <CreateRelatedInvoiceButton />
                    </div>
                    <InvoicesIterator />
                  </div>
                </ReferenceManyField>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <CompanyAside />
    </div>
  );
};

const ContactsIterator = () => {
  const location = useLocation();
  const { data: contacts, error, isPending } = useListContext<Contact>();
  const translate = useTranslate();
  const locale = useLocale();

  if (isPending || error) return null;

  const now = Date.now();
  return (
    <div className="pt-0">
      {contacts.map((contact) => (
        <RecordContextProvider key={contact.id} value={contact}>
          <div className="p-0 text-sm">
            <RouterLink
              to={`/contacts/${contact.id}/show`}
              state={{ from: location.pathname }}
              className="flex items-center justify-between hover:bg-muted py-2 transition-colors"
            >
              <div className="mr-4">
                <Avatar />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {`${contact.first_name} ${contact.last_name}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {contact.title}
                  {contact.nb_tasks
                    ? ` - ${translate("crm.task.field.task", {
                        count: contact.nb_tasks,
                        smart_count: contact.nb_tasks,
                      })}`
                    : ""}
                  &nbsp; &nbsp;
                  <TagsList />
                </div>
              </div>
              {contact.last_seen && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {translate("crm.common.last_activity", {
                      distance: formatDistance(contact.last_seen, now, {
                        locale: getDateFnsLocale(locale),
                      }),
                    })}{" "}
                    <Status status={contact.status} />
                  </div>
                </div>
              )}
            </RouterLink>
          </div>
        </RecordContextProvider>
      ))}
    </div>
  );
};

const CreateRelatedContactButton = () => {
  const company = useRecordContext<Company>();
  const translate = useTranslate();
  return (
    <Button variant="outline" asChild size="sm" className="h-9">
      <RouterLink
        to="/contacts/create"
        state={company ? { record: { company_id: company.id } } : undefined}
        className="flex items-center gap-2"
      >
        <UserPlus className="h-4 w-4" />
        {translate("crm.common.add_contact")}
      </RouterLink>
    </Button>
  );
};

const DealsIterator = () => {
  const { data: deals, error, isPending } = useListContext<Deal>();
  const { dealStages } = useConfigurationContext();
  const translate = useTranslate();
  const locale = useLocale();

  if (isPending || error) return null;

  const now = Date.now();
  return (
    <div>
      <div>
        {deals.map((deal) => (
          <div key={deal.id} className="p-0 text-sm">
            <RouterLink
              to={`/deals/${deal.id}/show`}
              className="flex items-center justify-between hover:bg-muted py-2 px-4 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium">{deal.name}</div>
                <div className="text-sm text-muted-foreground">
                  {findDealLabel(dealStages, deal.stage)},{" "}
                  {deal.amount.toLocaleString(locale, {
                    notation: "compact",
                    style: "currency",
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                    minimumSignificantDigits: 3,
                  })}
                  {deal.category ? `, ${deal.category}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {translate("crm.common.last_activity", {
                    distance: formatDistance(deal.updated_at, now, {
                      locale: getDateFnsLocale(locale),
                    }),
                  })}{" "}
                </div>
              </div>
            </RouterLink>
          </div>
        ))}
      </div>
    </div>
  );
};

const InvoicesIterator = () => {
  const { data: invoices, error, isPending } = useListContext<Invoice>();
  if (isPending || error) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
      {invoices.map((invoice) => (
        <RouterLink key={invoice.id} to={`/invoices/${invoice.id}/show`}>
          <InvoiceCard invoice={invoice} />
        </RouterLink>
      ))}
    </div>
  );
};

const CreateRelatedInvoiceButton = () => {
  const company = useRecordContext<Company>();
  const translate = useTranslate();
  return (
    <Button variant="outline" asChild size="sm" className="h-9">
      <RouterLink
        to="/invoices/create"
        state={company ? { record: { company_id: company.id } } : undefined}
        className="flex items-center gap-2"
      >
        <Receipt className="h-4 w-4" />
        {translate("crm.common.add_invoice")}
      </RouterLink>
    </Button>
  );
};
