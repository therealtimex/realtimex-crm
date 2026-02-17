import { describe, expect, it } from "vitest";

import type { Deal } from "../../../types";
import { buildUnarchiveDealsPayload } from "./dealTransforms";

const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? "Deal",
  company_id: overrides.company_id ?? 1,
  contact_ids: overrides.contact_ids ?? [],
  category: overrides.category ?? "new",
  stage: overrides.stage ?? "qualified",
  description: overrides.description ?? "",
  amount: overrides.amount ?? 100,
  created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
  updated_at: overrides.updated_at ?? "2026-01-01T00:00:00.000Z",
  archived_at: overrides.archived_at,
  expected_closing_date:
    overrides.expected_closing_date ?? "2026-01-31T00:00:00.000Z",
  sales_id: overrides.sales_id ?? 1,
  index: overrides.index ?? 1,
  nb_invoices: overrides.nb_invoices,
});

describe("buildUnarchiveDealsPayload", () => {
  it("moves the selected deal to index 0 and clears archived_at", () => {
    const deals = [
      makeDeal({ id: 10, index: 1, archived_at: "2026-01-01T00:00:00.000Z" }),
      makeDeal({ id: 20, index: 2, archived_at: "2026-01-02T00:00:00.000Z" }),
      makeDeal({ id: 30, index: 3, archived_at: "2026-01-03T00:00:00.000Z" }),
    ];

    const result = buildUnarchiveDealsPayload(deals, 20);

    expect(result.find((deal) => deal.id === 20)).toMatchObject({
      id: 20,
      index: 0,
      archived_at: null,
    });
  });

  it("reindexes non-selected deals in list order starting from 1", () => {
    const deals = [
      makeDeal({ id: 10, index: 8, archived_at: "2026-01-01T00:00:00.000Z" }),
      makeDeal({ id: 20, index: 9, archived_at: "2026-01-02T00:00:00.000Z" }),
      makeDeal({ id: 30, index: 10, archived_at: undefined }),
    ];

    const result = buildUnarchiveDealsPayload(deals, 20);

    expect(result).toEqual([
      expect.objectContaining({ id: 10, index: 1, archived_at: "2026-01-01T00:00:00.000Z" }),
      expect.objectContaining({ id: 20, index: 0, archived_at: null }),
      expect.objectContaining({ id: 30, index: 3, archived_at: undefined }),
    ]);
  });
});
