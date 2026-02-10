import { useGetIdentity, useGetList, useGetOne, useTranslate } from "ra-core";

import type { BusinessProfile, Contact, ContactNote } from "../types";
import { DashboardActivityLog } from "./DashboardActivityLog";
import { DashboardStepper } from "./DashboardStepper";
import { DealsChart } from "./DealsChart";
import { HotContacts } from "./HotContacts";
import { InvoicesChart } from "./InvoicesChart";
import { OutstandingInvoices } from "./OutstandingInvoices";
import { TasksList } from "./TasksList";
import { Welcome } from "./Welcome";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ds/ui/tabs";
import { TrendingUp, DollarSign } from "lucide-react";
import { DailyBriefing } from "./DailyBriefing";

export const Dashboard = () => {
  const translate = useTranslate();
  const { identity, isPending: isPendingIdentity } = useGetIdentity();

  const {
    data: businessProfile,
    isPending: isPendingProfile,
    error: errorProfile,
  } = useGetOne<BusinessProfile>("business_profile", { id: 1 });

  const {
    data: dataContact,
    total: totalContact,
    isPending: isPendingContact,
  } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 1 },
  });

  const { total: totalContactNotes, isPending: isPendingContactNotes } =
    useGetList<ContactNote>("contactNotes", {
      pagination: { page: 1, perPage: 1 },
    });

  const { isPending: isPendingDeal } = useGetList<Contact>("deals", {
    pagination: { page: 1, perPage: 1 },
  });

  const isPending =
    isPendingContact ||
    isPendingContactNotes ||
    isPendingDeal ||
    isPendingIdentity ||
    isPendingProfile;

  if (isPending) {
    return null;
  }

  // Handle business_profile errors gracefully
  if (errorProfile) {
    console.error("[Dashboard] Failed to load business profile:", errorProfile);
    // Continue rendering dashboard even if business profile fails
  }

  // Only show onboarding to administrators if not completed
  const showOnboarding =
    identity?.administrator && !businessProfile?.onboarding_completed;

  if (showOnboarding) {
    if (!totalContact) {
      return <DashboardStepper step={1} />;
    }

    if (!totalContactNotes) {
      return <DashboardStepper step={2} contactId={dataContact?.[0]?.id} />;
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-1">
      <div className="md:col-span-3">
        <div className="flex flex-col gap-4">
          {import.meta.env.VITE_IS_DEMO === "true" ? <Welcome /> : null}
          <HotContacts />
          <OutstandingInvoices />
        </div>
      </div>
      <div className="md:col-span-6">
        <div className="flex flex-col gap-6">
          <Tabs defaultValue="invoices" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {translate("crm.dashboard.invoice_revenue")}
              </TabsTrigger>
              <TabsTrigger value="deals" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {translate("crm.dashboard.deal_pipeline")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="invoices" className="mt-0">
              <InvoicesChart />
            </TabsContent>
            <TabsContent value="deals" className="mt-0">
              <DealsChart />
            </TabsContent>
          </Tabs>
          <DashboardActivityLog />
        </div>
      </div>

      <div className="md:col-span-3 space-y-6">
        <DailyBriefing />
        <TasksList />
      </div>
    </div>
  );
};
