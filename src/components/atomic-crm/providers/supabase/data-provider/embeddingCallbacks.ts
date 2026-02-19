import { EmbeddingService } from "@/lib/ai/EmbeddingService";
import { supabase } from "../supabase";

type EntityType = "contact" | "company" | "task" | "deal" | "taskNote";

/**
 * Returns lifecycle callback hooks (afterCreate, afterUpdate, afterDelete) for
 * a given entity type that fire-and-forget embedding operations.
 */
export const createEmbeddingCallbacks = (entityType: EntityType) => ({
  afterCreate: async (result: any) => {
    if (result.data && typeof result.data === "object" && result.data.id) {
      EmbeddingService.embedRecord(entityType, result.data).catch((err) =>
        console.error(`[DataProvider] Embedding failed for ${entityType}:`, err),
      );
    }
    return result;
  },

  afterUpdate: async (result: any) => {
    if (result.data && typeof result.data === "object" && result.data.id) {
      EmbeddingService.embedRecord(entityType, result.data).catch((err) =>
        console.error(`[DataProvider] Embedding failed for ${entityType}:`, err),
      );
    }
    return result;
  },

  afterDelete: async (result: any) => {
    if (result.data?.id) {
      supabase
        .from("entity_vectors")
        .delete()
        .eq("entity_type", entityType)
        .eq("entity_id", result.data.id)
        .then(({ error }) => {
          if (error)
            console.error(
              `[DataProvider] Failed to delete ${entityType} embedding:`,
              error,
            );
        });
    }
    return result;
  },
});
