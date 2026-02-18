import { supabaseDataProvider } from "ra-supabase-core";
import { withLifecycleCallbacks, type DataProvider, type UpdateResult } from "ra-core";

import { getSupabaseConfig } from "@/lib/supabase-config";
import { supabase } from "./supabase";
import { handleGetList, handleGetOne, handleCreate, handleUpdate } from "./data-provider/resourceCrudHandlers";
import { buildCustomMethods } from "./data-provider/customMethods";
import { lifecycleCallbacks } from "./data-provider/lifecycleCallbacks";

// ---------------------------------------------------------------------------
// Base provider
// ---------------------------------------------------------------------------

// Get config dynamically (from localStorage or env vars).
// If no config, create a dummy provider — App.tsx shows setup wizard before CRM loads.
const config = getSupabaseConfig() || {
  url: "https://placeholder.supabase.co",
  anonKey: "placeholder-key",
};

const baseDataProvider = supabaseDataProvider({
  instanceUrl: config.url,
  apiKey: config.anonKey,
  supabaseClient: supabase,
  sortOrder: "asc,desc.nullslast" as any,
});

// ---------------------------------------------------------------------------
// Extended provider: overrides + custom methods
// ---------------------------------------------------------------------------

const dataProviderWithCustomMethods = {
  ...baseDataProvider,
  async getList(resource: string, params: any) {
    return handleGetList(baseDataProvider, resource, params);
  },
  async getOne(resource: string, params: { id: any }) {
    return handleGetOne(baseDataProvider, resource, params);
  },
  async create(resource: string, params: any) {
    return handleCreate(baseDataProvider, resource, params);
  },
  async update(resource: string, params: any) {
    return handleUpdate(baseDataProvider, resource, params) as Promise<
      UpdateResult<any>
    >;
  },
  ...buildCustomMethods(baseDataProvider),
} satisfies DataProvider;

export type CrmDataProvider = typeof dataProviderWithCustomMethods;

// ---------------------------------------------------------------------------
// Final provider with lifecycle hooks
// ---------------------------------------------------------------------------

export const dataProvider = withLifecycleCallbacks(
  dataProviderWithCustomMethods,
  lifecycleCallbacks,
);
