import { supabase } from "@/components/atomic-crm/providers/supabase/supabase";

export interface DatabaseHealthStatus {
  isHealthy: boolean;
  missingTables: string[];
  error?: string;
}

/**
 * Check if the database has the required schema
 * This function directly queries the Supabase client to avoid data provider
 * transformations (e.g., contacts -> contacts_summary) that would fail
 * if the database schema doesn't exist yet.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const requiredTables = [
    "contacts",
    "companies",
    "deals",
    "contactNotes",
    "dealNotes",
    "tasks",
    "sales",
    "tags",
  ];

  const missingTables: string[] = [];

  try {
    // Try to query each table directly via Supabase client
    for (const table of requiredTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select("id")
          .limit(1);

        if (error) {
          // Check if it's a "table not found" error
          if (
            error.message?.includes("Could not find the table") ||
            error.message?.includes("relation") ||
            error.message?.includes("does not exist") ||
            error.code === "PGRST200" // PostgREST error code for missing table
          ) {
            missingTables.push(table);
          } else {
            // Some other error - log it but don't fail health check
            console.warn(`Unexpected error querying ${table}:`, error);
          }
        }
      } catch (error: any) {
        console.warn(`Failed to query ${table}:`, error);
        missingTables.push(table);
      }
    }

    return {
      isHealthy: missingTables.length === 0,
      missingTables,
    };
  } catch (error: any) {
    return {
      isHealthy: false,
      missingTables: requiredTables,
      error: error?.message || "Unknown error",
    };
  }
}
