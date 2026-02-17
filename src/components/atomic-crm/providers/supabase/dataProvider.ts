import { withLifecycleCallbacks, type DataProvider } from "ra-core";
import { supabaseDataProvider } from "ra-supabase-core";

import { createCustomMethods } from "./data-provider/customMethods";
import { createLifecycleCallbacks } from "./data-provider/lifecycleCallbacks";
import { createResourceCrudHandlers } from "./data-provider/resourceCrudHandlers";
import { supabase } from "./supabase";
import { getSupabaseConfig } from "@/lib/supabase-config";

// Get config dynamically (from localStorage or env vars)
// If no config, create a dummy provider that will never be used
// (App.tsx will show setup wizard before CRM loads)
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

const dataProviderWithCustomMethods = {
  ...baseDataProvider,
  ...createResourceCrudHandlers(baseDataProvider),
  ...createCustomMethods(baseDataProvider),
} satisfies DataProvider;

export type CrmDataProvider = typeof dataProviderWithCustomMethods;

export const dataProvider = withLifecycleCallbacks(
  dataProviderWithCustomMethods,
  createLifecycleCallbacks(),
);
