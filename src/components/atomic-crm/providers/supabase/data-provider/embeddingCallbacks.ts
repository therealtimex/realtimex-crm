import { EmbeddingService } from "@/lib/ai/EmbeddingService";
import { supabase } from "../supabase";

type EntityType = "contact" | "company" | "task" | "deal" | "taskNote";

/** Semantic fields that trigger re-embedding when changed, keyed by entity type. */
const SEMANTIC_FIELDS: Record<EntityType, string[]> = {
  contact: [
    "first_name", "last_name", "title", "gender", "email_jsonb", "phone_jsonb",
    "company_id", "background", "avatar", "tags", "linkedin_url", "twitter",
  ],
  company: [
    "name", "sector", "size", "description", "address", "city", "state",
    "zipcode", "country", "website", "phone_number", "social_profiles", "logo", "tags",
  ],
  task: [
    "text", "type", "status", "priority", "due_date", "done_date",
    "contact_id", "company_id", "deal_id", "archived",
  ],
  deal: ["name", "company_id", "category", "description"],
  taskNote: ["text", "status", "date", "task_id"],
};

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

  afterUpdate: async (result: any, params: any) => {
    if (!result.data || typeof result.data !== "object" || !result.data.id) {
      return result;
    }
    if (!params.data || typeof params.data !== "object") {
      return result;
    }

    const changedFields = Object.keys(params.data);
    const semanticChanged = changedFields.some((field) =>
      SEMANTIC_FIELDS[entityType].includes(field),
    );

    if (semanticChanged) {
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
