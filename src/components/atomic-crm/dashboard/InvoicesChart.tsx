import { ResponsiveBar } from "@nivo/bar";
import { format, startOfMonth, subMonths } from "date-fns";
import { Receipt } from "lucide-react";
import { useGetList, useLocaleState, useTranslate } from "ra-core";
import { memo, useMemo } from "react";
import { getDateFnsLocale } from "@/i18n/date-fns";
import { Skeleton } from "@/components/ds/ui/skeleton";

import type { Invoice } from "../types";

const DEFAULT_LOCALE = "en-US";
const CURRENCY = "USD";

export const InvoicesChart = memo(() => {
  const translate = useTranslate();
  const [locale] = useLocaleState();
  const dateFnsLocale = getDateFnsLocale(locale);
  const acceptedLanguages = navigator
    ? navigator.languages || [navigator.language]
    : [DEFAULT_LOCALE];

  const sixMonthsAgo = useMemo(
    () => subMonths(new Date(), 6).toISOString(),
    [],
  );

  const { data, isPending } = useGetList<Invoice>("invoices", {
    pagination: { perPage: 100, page: 1 },
    sort: {
      field: "issue_date",
      order: "ASC",
    },
    filter: {
      "issue_date@gte": sixMonthsAgo,
    },
  });

  const months = useMemo(() => {
    if (!data) return [];

    // Group invoices by month
    const invoicesByMonth = data.reduce(
      (acc, invoice) => {
        const month = startOfMonth(new Date(invoice.issue_date)).toISOString();
        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(invoice);
        return acc;
      },
      {} as Record<string, Invoice[]>,
    );

    // Calculate totals for each month
    const result = Object.keys(invoicesByMonth).map((month) => {
      const invoices = invoicesByMonth[month];
      return {
        date: format(new Date(month), "MMM", { locale: dateFnsLocale }),
        paid: invoices
          .filter((inv: Invoice) => inv.status === "paid")
          .reduce((sum: number, inv: Invoice) => sum + (inv.total || 0), 0),
        pending: invoices
          .filter((inv: Invoice) =>
            ["draft", "sent", "overdue"].includes(inv.status),
          )
          .reduce((sum: number, inv: Invoice) => sum + (inv.total || 0), 0),
      };
    });

    return result;
  }, [data, dateFnsLocale]);

  if (isPending) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center mb-4">
          <Skeleton className="w-6 h-6 mr-3 rounded" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-[350px] w-full" />
      </div>
    );
  }

  if (months.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center mb-4">
        <div className="mr-3 flex">
          <Receipt className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground">
          {translate("resources.invoices.name", { smart_count: 2 })}{" "}
          {translate("crm.dashboard.revenue")}
        </h2>
      </div>
      <div className="h-[350px]">
        <ResponsiveBar
          data={months}
          indexBy="date"
          keys={["paid", "pending"]}
          colors={["#10b981", "#3b82f6"]}
          margin={{ top: 10, right: 10, bottom: 30, left: 50 }}
          padding={0.4}
          valueScale={{ type: "linear" }}
          indexScale={{ type: "band", round: true }}
          enableGridY={false}
          enableLabel={false}
          axisLeft={{
            format: (v: any) => `${v / 1000}k`,
          }}
          tooltip={({ value, id, indexValue }) => (
            <div className="p-2 bg-secondary rounded shadow inline-flex items-center gap-1 text-secondary-foreground">
              <strong>
                {indexValue} ({id}):{" "}
              </strong>
              {value.toLocaleString(
                locale ?? acceptedLanguages.at(0) ?? DEFAULT_LOCALE,
                {
                  style: "currency",
                  currency: CURRENCY,
                },
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
});
