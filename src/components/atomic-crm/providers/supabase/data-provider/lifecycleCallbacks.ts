import type { ContactNote, DealNote, Sale } from "../../../types";
import { uploadToBucket } from "./upload";
import { applyFullTextSearch } from "./transforms";
import { processCompanyLogo, processContactAvatar } from "./avatarProcessors";
import { createEmbeddingCallbacks } from "./embeddingCallbacks";

/**
 * All withLifecycleCallbacks resource entries for the CRM data provider.
 *
 * Handles:
 * - File uploads (attachments, avatars, logos)
 * - Full-text search filter rewrites
 * - Fire-and-forget embedding triggers
 */
export const lifecycleCallbacks = [
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
    beforeSave: async (data: ContactNote, _: any, __: any) => {
      if (data.attachments) {
        for (const fi of data.attachments) {
          await uploadToBucket(fi);
        }
      }
      return data;
    },
  },
  {
    resource: "dealNotes",
    beforeSave: async (data: DealNote, _: any, __: any) => {
      if (data.attachments) {
        for (const fi of data.attachments) {
          await uploadToBucket(fi);
        }
      }
      return data;
    },
  },
  {
    resource: "companyNotes",
    beforeSave: async (data: ContactNote, _: any, __: any) => {
      if (data.attachments) {
        for (const fi of data.attachments) {
          await uploadToBucket(fi);
        }
      }
      return data;
    },
  },
  {
    resource: "taskNotes",
    beforeSave: async (data: ContactNote, _: any, __: any) => {
      if (data.attachments) {
        for (const fi of data.attachments) {
          await uploadToBucket(fi);
        }
      }
      return data;
    },
    ...createEmbeddingCallbacks("taskNote"),
  },
  {
    resource: "sales",
    beforeSave: async (data: Sale, _: any, __: any) => {
      if (data.avatar) {
        await uploadToBucket(data.avatar);
      }
      return data;
    },
  },
  {
    resource: "contacts",
    beforeCreate: async (params: any) => {
      return processContactAvatar(params);
    },
    beforeUpdate: async (params: any) => {
      return processContactAvatar(params);
    },
    ...createEmbeddingCallbacks("contact"),
    beforeGetList: async (params: any) => {
      return applyFullTextSearch(["search_text"])(params);
    },
  },
  {
    resource: "companies",
    beforeGetList: async (params: any) => {
      return applyFullTextSearch(["search_text"])(params);
    },
    beforeCreate: async (params: any) => {
      return await processCompanyLogo(params);
    },
    beforeUpdate: async (params: any) => {
      return await processCompanyLogo(params);
    },
    ...createEmbeddingCallbacks("company"),
  },
  {
    resource: "contacts_summary",
    beforeGetList: async (params: any) => {
      return applyFullTextSearch(["search_text"])(params);
    },
  },
  {
    resource: "tasks",
    beforeGetList: async (params: any) => {
      return applyFullTextSearch(["text", "contact_first_name"])(params);
    },
    ...createEmbeddingCallbacks("task"),
  },
  {
    resource: "deals",
    beforeGetList: async (params: any) => {
      return applyFullTextSearch(["name", "category", "description"])(params);
    },
    ...createEmbeddingCallbacks("deal"),
  },
];
