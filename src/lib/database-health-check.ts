import { DataProvider } from "ra-core";

export interface DatabaseHealthStatus {
  isHealthy: boolean;
  missingTables: string[];
  error?: string;
}

/**
 * Check if the database has the required schema
 */
export async function checkDatabaseHealth(
  dataProvider: DataProvider,
): Promise<DatabaseHealthStatus> {
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
    // Try to query each table
    for (const table of requiredTables) {
      try {
        await dataProvider.getList(table, {
          pagination: { page: 1, perPage: 1 },
          sort: { field: "id", order: "ASC" },
          filter: {},
        });
      } catch (error: any) {
        // Check if it's a "table not found" error
        if (
          error?.message?.includes("Could not find the table") ||
          error?.message?.includes("relation") ||
          error?.message?.includes("does not exist")
        ) {
          missingTables.push(table);
        }
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
