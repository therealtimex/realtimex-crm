import type { GetListParams } from "ra-core";

export const applyFullTextSearch =
  (columns: string[]) =>
  (params: GetListParams): GetListParams => {
    if (!params.filter?.q) {
      return params;
    }

    const { q, ...filter } = params.filter;

    // Use the search_text column if available (for contacts and contacts_summary)
    if (columns.includes("search_text")) {
      return {
        ...params,
        filter: {
          ...filter,
          "search_text@ilike": q,
        },
      };
    }

    // Fallback: use OR search across all specified columns (for other resources)
    const orFilter = columns.reduce<Record<string, unknown>>((acc, column) => {
      if (column === "email") {
        return {
          ...acc,
          "email_fts@ilike": q,
        };
      }

      if (column === "phone") {
        return {
          ...acc,
          "phone_fts@ilike": q,
        };
      }

      return {
        ...acc,
        [`${column}@ilike`]: q,
      };
    }, {});

    return {
      ...params,
      filter: {
        ...filter,
        "@or": orFilter,
      },
    };
  };

export const stripContactSummaryReadOnlyFields = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const {
    company_name: _company_name,
    search_text: _search_text,
    email_fts: _email_fts,
    phone_fts: _phone_fts,
    nb_tasks: _nb_tasks,
    nb_notes: _nb_notes,
    nb_invoices: _nb_invoices,
    nb_open_tasks: _nb_open_tasks,
    nb_completed_tasks: _nb_completed_tasks,
    task_completion_rate: _task_completion_rate,
    last_note_date: _last_note_date,
    last_task_activity: _last_task_activity,
    days_since_last_activity: _days_since_last_activity,
    ...contactData
  } = data;

  return contactData;
};

export const stripCompanySummaryReadOnlyFields = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const {
    search_text: _search_text,
    nb_deals: _nb_deals,
    nb_contacts: _nb_contacts,
    nb_notes: _nb_notes,
    nb_invoices: _nb_invoices,
    nb_tasks: _nb_tasks,
    total_deal_amount: _total_deal_amount,
    last_note_date: _last_note_date,
    last_deal_activity: _last_deal_activity,
    last_task_activity: _last_task_activity,
    days_since_last_activity: _days_since_last_activity,
    ...companyData
  } = data;

  return companyData;
};

export const stripTaskSummaryReadOnlyFields = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const {
    contact_first_name: _contact_first_name,
    contact_last_name: _contact_last_name,
    contact_email: _contact_email,
    company_name: _company_name,
    deal_name: _deal_name,
    company_id_computed: _company_id_computed,
    assigned_first_name: _assigned_first_name,
    assigned_last_name: _assigned_last_name,
    creator_first_name: _creator_first_name,
    creator_last_name: _creator_last_name,
    nb_notes: _nb_notes,
    last_note_date: _last_note_date,
    ...cleanData
  } = data;

  return cleanData;
};

export const stripDealSummaryReadOnlyFields = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const {
    company_name: _company_name,
    nb_invoices: _nb_invoices,
    nb_notes: _nb_notes,
    ...cleanData
  } = data;

  return cleanData;
};

export const extractInvoiceSummaryPayload = (
  data: Record<string, unknown>,
): {
  items: unknown;
  cleanData: Record<string, unknown>;
} => {
  const {
    items,
    company_name: _cn,
    contact_name: _ctn,
    contact_email: _ce,
    deal_name: _dn,
    sales_name: _sn,
    nb_items: _ni,
    nb_notes: _nn,
    computed_status: _cs,
    days_overdue: _do,
    balance_due: _bd,
    ...cleanData
  } = data;

  return {
    items,
    cleanData,
  };
};
