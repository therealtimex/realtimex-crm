import { describe, it, expect } from "vitest";
import {
  applyFullTextSearch,
  stripContactSummaryFields,
  stripCompanySummaryFields,
  stripTaskSummaryFields,
  stripDealSummaryFields,
  stripInvoiceSummaryFields,
} from "./transforms";

// ---------------------------------------------------------------------------
// applyFullTextSearch
// ---------------------------------------------------------------------------

describe("applyFullTextSearch", () => {
  const baseParams = {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "id", order: "ASC" as const },
    filter: {},
  };

  it("passes through params unchanged when there is no q filter", () => {
    const params = { ...baseParams, filter: { status: "active" } };
    const result = applyFullTextSearch(["search_text"])(params);
    expect(result).toEqual(params);
  });

  it("rewrites q to search_text@ilike when columns includes search_text", () => {
    const params = { ...baseParams, filter: { q: "hello", status: "active" } };
    const result = applyFullTextSearch(["search_text"])(params);
    expect(result.filter).toEqual({
      status: "active",
      "search_text@ilike": "hello",
    });
    expect((result.filter as any).q).toBeUndefined();
  });

  it("builds @or filter when columns do not include search_text", () => {
    const params = { ...baseParams, filter: { q: "foo" } };
    const result = applyFullTextSearch(["name", "category", "description"])(params);
    expect(result.filter).toEqual({
      "@or": {
        "name@ilike": "foo",
        "category@ilike": "foo",
        "description@ilike": "foo",
      },
    });
  });

  it("maps email column to email_fts alias in @or filter", () => {
    const params = { ...baseParams, filter: { q: "test@example.com" } };
    const result = applyFullTextSearch(["email"])(params);
    expect((result.filter as any)["@or"]).toHaveProperty("email_fts@ilike");
    expect((result.filter as any)["@or"]).not.toHaveProperty("email@ilike");
  });

  it("maps phone column to phone_fts alias in @or filter", () => {
    const params = { ...baseParams, filter: { q: "555" } };
    const result = applyFullTextSearch(["phone"])(params);
    expect((result.filter as any)["@or"]).toHaveProperty("phone_fts@ilike");
    expect((result.filter as any)["@or"]).not.toHaveProperty("phone@ilike");
  });

  it("preserves other filter keys when rewriting q", () => {
    const params = { ...baseParams, filter: { q: "bar", sales_id: 1 } };
    const result = applyFullTextSearch(["search_text"])(params);
    expect((result.filter as any).sales_id).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Strip functions
// ---------------------------------------------------------------------------

describe("stripContactSummaryFields", () => {
  it("removes all view-only fields and preserves writable fields", () => {
    const input = {
      id: 1,
      first_name: "Alice",
      company_name: "Acme",          // view-only
      search_text: "alice acme",     // view-only
      email_fts: "alice@acme.com",   // view-only
      phone_fts: "555",              // view-only
      nb_tasks: 3,                   // view-only
      nb_notes: 2,                   // view-only
      nb_invoices: 1,                // view-only
      nb_open_tasks: 1,              // view-only
      nb_completed_tasks: 2,         // view-only
      task_completion_rate: 0.67,    // view-only
      last_note_date: "2025-01-01",  // view-only
      last_task_activity: "2025-01-01", // view-only
      days_since_last_activity: 30,  // view-only
    };
    const result = stripContactSummaryFields(input);
    expect(result).toEqual({ id: 1, first_name: "Alice" });
  });
});

describe("stripCompanySummaryFields", () => {
  it("removes view-only fields", () => {
    const input = {
      id: 2,
      name: "Acme",
      search_text: "acme",
      nb_deals: 5,
      nb_contacts: 3,
      nb_notes: 1,
      nb_invoices: 2,
      nb_tasks: 4,
      total_deal_amount: 100000,
      last_note_date: "2025-01-01",
      last_deal_activity: "2025-01-01",
      last_task_activity: "2025-01-01",
      days_since_last_activity: 10,
    };
    const result = stripCompanySummaryFields(input);
    expect(result).toEqual({ id: 2, name: "Acme" });
  });
});

describe("stripTaskSummaryFields", () => {
  it("removes computed join fields", () => {
    const input = {
      id: 3,
      text: "Call client",
      contact_first_name: "Bob",
      contact_last_name: "Smith",
      contact_email: "bob@example.com",
      company_name: "Acme",
      deal_name: "Big Deal",
      company_id_computed: 99,
      assigned_first_name: "Carol",
      assigned_last_name: "White",
      creator_first_name: "Dave",
      creator_last_name: "Black",
      nb_notes: 0,
      last_note_date: null,
    };
    const result = stripTaskSummaryFields(input);
    expect(result).toEqual({ id: 3, text: "Call client" });
  });
});

describe("stripDealSummaryFields", () => {
  it("removes view-only deal fields", () => {
    const input = {
      id: 4,
      name: "Big Deal",
      company_name: "Acme",
      nb_invoices: 2,
      nb_notes: 1,
    };
    const result = stripDealSummaryFields(input);
    expect(result).toEqual({ id: 4, name: "Big Deal" });
  });
});

describe("stripInvoiceSummaryFields", () => {
  it("removes view-only invoice fields", () => {
    const input = {
      id: 5,
      number: "INV-001",
      items: [{ id: 1, description: "Widget", quantity: 1, unit_price: 100 }],
      company_name: "Acme",
      contact_name: "Alice",
      contact_email: "alice@acme.com",
      deal_name: "Big Deal",
      sales_name: "Bob",
      nb_items: 1,
      nb_notes: 0,
      computed_status: "overdue",
      days_overdue: 5,
      balance_due: 100,
    };
    const result = stripInvoiceSummaryFields(input);
    expect(result).toEqual({ id: 5, number: "INV-001" });
  });
});
