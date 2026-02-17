import { describe, expect, it } from "vitest";

import {
  isEnrichedRecordValid,
  selectEnrichedRecordOrFallback,
} from "./enrichment";

describe("isEnrichedRecordValid", () => {
  it("returns true when enriched record exists and id matches", () => {
    expect(isEnrichedRecordValid({ id: 42 }, null, 42)).toBe(true);
  });

  it("returns false when enrichment query failed", () => {
    expect(
      isEnrichedRecordValid({ id: 42 }, new Error("query failed"), 42),
    ).toBe(false);
  });

  it("returns false when enriched record id mismatches", () => {
    expect(isEnrichedRecordValid({ id: 99 }, null, 42)).toBe(false);
  });

  it("returns false when enriched record is missing", () => {
    expect(isEnrichedRecordValid(null, null, 42)).toBe(false);
  });
});

describe("selectEnrichedRecordOrFallback", () => {
  it("returns enriched record on valid enrichment", () => {
    const baseRecord = { id: 10, name: "Base" };
    const enrichedRecord = { id: 10, name: "Enriched" };

    const result = selectEnrichedRecordOrFallback(
      baseRecord,
      enrichedRecord,
      null,
      10,
    );

    expect(result).toEqual(enrichedRecord);
  });

  it("falls back to base record on id mismatch", () => {
    const baseRecord = { id: 10, name: "Base" };
    const enrichedRecord = { id: 11, name: "Wrong" };

    const result = selectEnrichedRecordOrFallback(
      baseRecord,
      enrichedRecord,
      null,
      10,
    );

    expect(result).toEqual(baseRecord);
  });
});
