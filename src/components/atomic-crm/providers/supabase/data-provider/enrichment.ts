import type { Identifier } from "ra-core";
import { supabase } from "../supabase";

/**
 * After writing to a base table, re-fetch the record from its enriched summary
 * view so the UI and embedding pipeline receive joined/computed fields.
 *
 * Returns `{ data: enrichedRecord }` on success, or `null` when the summary
 * query fails or returns a mismatched record (callers should fall back to the
 * base-table record in that case).
 */
export const fetchEnrichedRecord = async (
  view: string,
  id: Identifier,
): Promise<{ data: Record<string, unknown> } | null> => {
  const { data: enrichedData, error: enrichError } = await supabase
    .from(view)
    .select("*")
    .eq("id", id)
    .single();

  if (enrichError || !enrichedData || String(enrichedData.id) !== String(id)) {
    console.warn(
      `[DataProvider] Failed to fetch or verify enriched record from ${view}. Falling back to base record.`,
      enrichError || "ID mismatch or missing data",
    );
    return null;
  }

  return { data: enrichedData };
};
