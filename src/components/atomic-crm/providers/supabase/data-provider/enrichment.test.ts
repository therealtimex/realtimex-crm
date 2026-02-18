import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchEnrichedRecord } from "./enrichment";
import { supabase } from "../supabase";

vi.mock("../supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("fetchEnrichedRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enriched data on success", async () => {
    const mockData = { id: "1", name: "Enriched" };
    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: mockData, error: null }),
        }),
      }),
    });

    const result = await fetchEnrichedRecord("some_view", "1");
    expect(result).toEqual({ data: mockData });
  });

  it("returns null and warns on error", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: "Error" } }),
        }),
      }),
    });

    const result = await fetchEnrichedRecord("some_view", "1");
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("returns null and warns on ID mismatch", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockData = { id: "2", name: "Mismatched" };
    (supabase.from as any).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: mockData, error: null }),
        }),
      }),
    });

    const result = await fetchEnrichedRecord("some_view", "1");
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
