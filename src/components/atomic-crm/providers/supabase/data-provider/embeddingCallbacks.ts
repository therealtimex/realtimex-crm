import type { Identifier } from "ra-core";

type MutationRecord = Record<string, unknown> & {
  id?: Identifier;
};

type MutationResult = {
  data?: unknown;
};

type MutationParams = {
  data?: unknown;
};

export type EmbeddingCallbackDeps = {
  embedRecord: (entityType: string, data: MutationRecord) => Promise<unknown>;
  deleteRecordEmbedding: (entityType: string, entityId: Identifier) => void;
  logEmbeddingError: (entityType: string, error: unknown) => void;
};

const hasRecordId = (data: unknown): data is MutationRecord & { id: Identifier } => {
  if (!data || typeof data !== "object") {
    return false;
  }

  return Boolean((data as MutationRecord).id);
};

export const hasSemanticFieldChange = (
  data: unknown,
  semanticFields: readonly string[],
): boolean => {
  if (!data || typeof data !== "object") {
    return false;
  }

  return Object.keys(data).some((field) => semanticFields.includes(field));
};

export const createEmbeddingCallbacks = (
  entityType: string,
  semanticFields: readonly string[],
  deps: EmbeddingCallbackDeps,
) => ({
  afterCreate: async (result: MutationResult) => {
    if (hasRecordId(result.data)) {
      deps
        .embedRecord(entityType, result.data)
        .catch((error) => deps.logEmbeddingError(entityType, error));
    }

    return result;
  },

  afterUpdate: async (result: MutationResult, params: MutationParams) => {
    if (!hasRecordId(result.data)) {
      return result;
    }

    if (hasSemanticFieldChange(params.data, semanticFields)) {
      deps
        .embedRecord(entityType, result.data)
        .catch((error) => deps.logEmbeddingError(entityType, error));
    }

    return result;
  },

  afterDelete: async (result: MutationResult) => {
    if (hasRecordId(result.data)) {
      deps.deleteRecordEmbedding(entityType, result.data.id);
    }

    return result;
  },
});
