import type { ContactNote, DealNote, RAFile, Sale } from "../../../types";
import { EmbeddingService } from "@/lib/ai/EmbeddingService";
import { processCompanyLogo, processContactAvatar } from "./avatarProcessors";
import {
  createEmbeddingCallbacks,
  type EmbeddingCallbackDeps,
} from "./embeddingCallbacks";
import { applyFullTextSearch } from "./transforms";
import { uploadToBucket } from "./upload";
import { supabase } from "../supabase";

const defaultEmbeddingDeps: EmbeddingCallbackDeps = {
  embedRecord: (entityType, data) => EmbeddingService.embedRecord(entityType, data),
  deleteRecordEmbedding: (entityType, entityId) => {
    supabase
      .from("entity_vectors")
      .delete()
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .then(({ error }) => {
        if (error) {
          console.error(
            `[DataProvider] Failed to delete ${entityType} embedding:`,
            error,
          );
        }
      });
  },
  logEmbeddingError: (entityType, error) => {
    console.error(`[DataProvider] Embedding failed for ${entityType}:`, error);
  },
};

const uploadAttachments = async <T extends { attachments?: RAFile[] }>(
  data: T,
): Promise<T> => {
  if (data.attachments) {
    for (const file of data.attachments) {
      await uploadToBucket(file);
    }
  }

  return data;
};

export const createLifecycleCallbacks = () => [
  {
    resource: "business_profile",
    beforeUpdate: async (params: any) => {
      if (params.data.logo && params.data.logo.rawFile instanceof File) {
        await uploadToBucket(params.data.logo);
      }

      return params;
    },
  },
  {
    resource: "contactNotes",
    beforeSave: async (data: ContactNote) => uploadAttachments(data),
  },
  {
    resource: "dealNotes",
    beforeSave: async (data: DealNote) => uploadAttachments(data),
  },
  {
    resource: "companyNotes",
    beforeSave: async (data: ContactNote) => uploadAttachments(data),
  },
  {
    resource: "taskNotes",
    beforeSave: async (data: ContactNote) => uploadAttachments(data),
    ...createEmbeddingCallbacks(
      "taskNote",
      ["text", "status", "date", "task_id"],
      defaultEmbeddingDeps,
    ),
  },
  {
    resource: "sales",
    beforeSave: async (data: Sale) => {
      if (data.avatar) {
        await uploadToBucket(data.avatar);
      }

      return data;
    },
  },
  {
    resource: "contacts",
    beforeCreate: async (params: any) => processContactAvatar(params),
    beforeUpdate: async (params: any) => processContactAvatar(params),
    beforeGetList: async (params: any) =>
      applyFullTextSearch(["search_text"])(params),
    ...createEmbeddingCallbacks(
      "contact",
      [
        "first_name",
        "last_name",
        "title",
        "gender",
        "email_jsonb",
        "phone_jsonb",
        "company_id",
        "background",
        "avatar",
        "tags",
        "linkedin_url",
        "twitter",
      ],
      defaultEmbeddingDeps,
    ),
  },
  {
    resource: "companies",
    beforeGetList: async (params: any) =>
      applyFullTextSearch(["search_text"])(params),
    beforeCreate: async (params: any) => processCompanyLogo(params),
    beforeUpdate: async (params: any) => processCompanyLogo(params),
    ...createEmbeddingCallbacks(
      "company",
      [
        "name",
        "sector",
        "size",
        "description",
        "address",
        "city",
        "state",
        "zipcode",
        "country",
        "website",
        "phone_number",
        "social_profiles",
        "logo",
        "tags",
      ],
      defaultEmbeddingDeps,
    ),
  },
  {
    resource: "contacts_summary",
    beforeGetList: async (params: any) =>
      applyFullTextSearch(["search_text"])(params),
  },
  {
    resource: "tasks",
    beforeGetList: async (params: any) =>
      applyFullTextSearch(["text", "contact_first_name"])(params),
    ...createEmbeddingCallbacks(
      "task",
      [
        "text",
        "type",
        "status",
        "priority",
        "due_date",
        "done_date",
        "contact_id",
        "company_id",
        "deal_id",
        "archived",
      ],
      defaultEmbeddingDeps,
    ),
  },
  {
    resource: "deals",
    beforeGetList: async (params: any) =>
      applyFullTextSearch(["name", "category", "description"])(params),
    ...createEmbeddingCallbacks(
      "deal",
      ["name", "company_id", "category", "description"],
      defaultEmbeddingDeps,
    ),
  },
];
