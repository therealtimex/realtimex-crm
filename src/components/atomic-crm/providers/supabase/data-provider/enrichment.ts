import type { Identifier } from "ra-core";

type EnrichedRecord = {
  id?: Identifier;
};

export const isEnrichedRecordValid = (
  enrichedData: EnrichedRecord | null | undefined,
  enrichError: unknown,
  expectedId: Identifier,
): enrichedData is EnrichedRecord => {
  return !enrichError && !!enrichedData && enrichedData.id === expectedId;
};

export const selectEnrichedRecordOrFallback = <T extends EnrichedRecord>(
  baseRecord: T,
  enrichedData: T | null | undefined,
  enrichError: unknown,
  expectedId: Identifier,
): T => {
  if (!isEnrichedRecordValid(enrichedData, enrichError, expectedId)) {
    return baseRecord;
  }

  return enrichedData;
};
