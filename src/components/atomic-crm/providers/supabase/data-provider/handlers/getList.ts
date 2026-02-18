import type { DataProvider, GetListParams } from "ra-core";

// ---------------------------------------------------------------------------
// getList overrides
// ---------------------------------------------------------------------------

export const handleGetList = (
  baseDataProvider: DataProvider,
  resource: string,
  params: GetListParams,
) => {
  const summaryViews: Record<string, string> = {
    companies: "companies_summary",
    contacts: "contacts_summary",
    tasks: "tasks_summary",
    deals: "deals_summary",
    invoices: "invoices_summary",
  };

  if (summaryViews[resource]) {
    return baseDataProvider.getList(summaryViews[resource], params);
  }

  const noteSortResources = [
    "companyNotes",
    "contactNotes",
    "dealNotes",
    "taskNotes",
  ];
  if (noteSortResources.includes(resource)) {
    return baseDataProvider.getList(resource, {
      ...params,
      sort: { field: "date", order: "DESC" },
    });
  }

  return baseDataProvider.getList(resource, params);
};
