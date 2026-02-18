import type { GetListParams } from "ra-core";

/**
 * Returns a function that rewrites a `q` filter into a full-text-search filter
 * targeting the given column(s).
 *
 * If `columns` includes "search_text", a single `search_text@ilike` filter is
 * used (the database view concatenates all searchable fields into this column).
 *
 * Otherwise, an `@or` filter is built across all specified columns, with
 * special aliases for `email` → `email_fts` and `phone` → `phone_fts`.
 */
export const applyFullTextSearch =
  (columns: string[]) =>
  (params: GetListParams): GetListParams => {
    if (!params.filter?.q) {
      return params;
    }
    const { q, ...filter } = params.filter;

    if (columns.includes("search_text")) {
      return {
        ...params,
        filter: {
          ...filter,
          "search_text@ilike": q,
        },
      };
    }

    return {
      ...params,
      filter: {
        ...filter,
        "@or": columns.reduce((acc, column) => {
          if (column === "email")
            return { ...acc, "email_fts@ilike": q };
          if (column === "phone")
            return { ...acc, "phone_fts@ilike": q };
          return { ...acc, [`${column}@ilike`]: q };
        }, {}),
      },
    };
  };

// ---------------------------------------------------------------------------
// Payload strip functions
// Strip view-only / computed columns before writing to the base tables.
// ---------------------------------------------------------------------------

export const stripContactSummaryFields = (data: Record<string, unknown>) => {
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
    ...clean
  } = data;
  return clean;
};

export const stripCompanySummaryFields = (data: Record<string, unknown>) => {
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
    ...clean
  } = data;
  return clean;
};

export const stripTaskSummaryFields = (data: Record<string, unknown>) => {
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
    ...clean
  } = data;
  return clean;
};

export const stripDealSummaryFields = (data: Record<string, unknown>) => {
  const {
    company_name: _company_name,
    nb_invoices: _nb_invoices,
    nb_notes: _nb_notes,
    ...clean
  } = data;
  return clean;
};

export const stripInvoiceSummaryFields = (data: Record<string, unknown>) => {
  const {
    items: _items,
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
    ...clean
  } = data;
  return clean;
};
