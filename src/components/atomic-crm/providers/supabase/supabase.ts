import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase-config";

// Create client immediately to ensure session restoration happens early
// This is critical for auth session persistence across page refreshes
function createSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig();

  if (!config) {
    // Return a placeholder client that will never be used
    // (App.tsx will show setup wizard before this is accessed)
    console.warn("[Supabase] No configuration found, using placeholder");
    return createClient("https://placeholder.supabase.co", "placeholder-key");
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      // Ensure session is persisted and restored from localStorage
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
  });
}

// Create client immediately on module load (not lazy!)
// This ensures session restoration from localStorage happens before any auth checks
export const supabase = createSupabaseClient();
