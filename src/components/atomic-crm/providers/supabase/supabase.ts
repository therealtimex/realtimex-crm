import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase-config";

// Lazy initialization - create client on first access
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const config = getSupabaseConfig();

    if (!config) {
      // Return a placeholder client that will never be used
      // (App.tsx will show setup wizard before this is accessed)
      console.warn('[Supabase] No configuration found, using placeholder');
      supabaseInstance = createClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      );
    } else {
      supabaseInstance = createClient(config.url, config.anonKey);
    }
  }

  return supabaseInstance;
}

// Export as a getter proxy to support lazy initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
