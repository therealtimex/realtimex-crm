import { describe, expect, it } from "vitest";

import {
  applyFullTextSearch,
  extractInvoiceSummaryPayload,
  stripCompanySummaryReadOnlyFields,
  stripContactSummaryReadOnlyFields,
  stripDealSummaryReadOnlyFields,
  stripTaskSummaryReadOnlyFields,
} from "./transforms";

describe("applyFullTextSearch", () => {
  it("returns original params when q is not provided", () => {
    const params = {
      filter: { status: "open" },
      pagination: { page: 1, perPage: 25 },
      sort: { field: "id", order: "ASC" },
    } as any;

    const result = applyFullTextSearch(["search_text"])(params);

    expect(result).toBe(params);
  });

  it("maps q to search_text@ilike when search_text column exists", () => {
    const params = {
      filter: {
        q: "Le Dang",
        status: "active",
      },
      pagination: { page: 1, perPage: 25 },
      sort: { field: "id", order: "ASC" },
    } as any;

    const result = applyFullTextSearch(["search_text"])(params);

    expect(result.filter).toEqual({
      status: "active",
      "search_text@ilike": "Le Dang",
    });
    expect((result.filter as Record<string, unknown>).q).toBeUndefined();
  });

  it("maps q to @or filter and keeps special email/phone mappings", () => {
    const params = {
      filter: {
        q: "acme",
        archived: false,
      },
      pagination: { page: 1, perPage: 25 },
      sort: { field: "id", order: "ASC" },
    } as any;

    const result = applyFullTextSearch(["email", "phone", "name"])(params);

    expect(result.filter).toEqual({
      archived: false,
      "@or": {
        "email_fts@ilike": "acme",
        "phone_fts@ilike": "acme",
        "name@ilike": "acme",
      },
    });
  });
});

describe("summary field sanitizers", () => {
  it("strips read-only contact summary fields", () => {
    const result = stripContactSummaryReadOnlyFields({
      id: 10,
      first_name: "Alex",
      company_name: "Acme",
      search_text: "alex acme",
      nb_notes: 2,
    });

    expect(result).toEqual({
      id: 10,
      first_name: "Alex",
    });
  });

  it("strips read-only company summary fields", () => {
    const result = stripCompanySummaryReadOnlyFields({
      id: 5,
      name: "Acme",
      search_text: "acme",
      nb_deals: 4,
      days_since_last_activity: 9,
    });

    expect(result).toEqual({
      id: 5,
      name: "Acme",
    });
  });

  it("strips read-only task summary fields", () => {
    const result = stripTaskSummaryReadOnlyFields({
      id: 12,
      text: "Call customer",
      contact_first_name: "Jane",
      company_id_computed: 77,
      nb_notes: 1,
    });

    expect(result).toEqual({
      id: 12,
      text: "Call customer",
    });
  });

  it("strips read-only deal summary fields", () => {
    const result = stripDealSummaryReadOnlyFields({
      id: 9,
      name: "Expansion",
      company_name: "Acme",
      nb_invoices: 2,
      nb_notes: 3,
    });

    expect(result).toEqual({
      id: 9,
      name: "Expansion",
    });
  });

  it("extracts invoice items and strips summary-only invoice fields", () => {
    const items = [{ id: 1, description: "Line" }];
    const result = extractInvoiceSummaryPayload({
      id: 1,
      number: "INV-001",
      items,
      company_name: "Acme",
      balance_due: 100,
      computed_status: "draft",
    });

    expect(result.items).toEqual(items);
    expect(result.cleanData).toEqual({
      id: 1,
      number: "INV-001",
    });
  });
});
