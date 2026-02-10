import { Organization, SSEEvent } from "./types";
import { readStream } from "./streamParser";

export class SetupApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SetupApiError";
  }
}

/**
 * Fetch organizations for a given access token
 */
export async function fetchOrganizations(
  accessToken: string,
): Promise<Organization[]> {
  const response = await fetch("/api/setup/organizations", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new SetupApiError(
      data.error || "Failed to fetch organizations",
      "FETCH_ORGS_FAILED",
      response.status,
    );
  }

  return data as Organization[];
}

/**
 * Auto-provision a new Supabase project
 */
export async function autoProvisionProject(
  params: {
    accessToken: string;
    orgId: string;
    projectName: string;
    region: string;
  },
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const response = await fetch("/api/setup/auto-provision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      orgId: params.orgId,
      projectName: params.projectName,
      region: params.region,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new SetupApiError(
      data.error || "Failed to provision project",
      "PROVISION_FAILED",
      response.status,
    );
  }

  await readStream(response, onEvent, {
    timeout: 300000, // 5 minutes
    onError: (error) => {
      throw new SetupApiError(
        `Provisioning stream error: ${error.message}`,
        "STREAM_ERROR",
      );
    },
  });
}

/**
 * Run database migration
 */
export async function runMigration(
  params: {
    projectRef: string;
    dbPassword?: string;
    accessToken: string;
    anonKey?: string; // For knowledge base ingestion
  },
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const response = await fetch("/api/migrate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectRef: params.projectRef,
      dbPassword: params.dbPassword,
      accessToken: params.accessToken,
      anonKey: params.anonKey, // Pass anon key for knowledge ingestion
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new SetupApiError(
      data.error || "Failed to start migration",
      "MIGRATION_FAILED",
      response.status,
    );
  }

  await readStream(response, onEvent, {
    timeout: 600000, // 10 minutes for migrations
    onError: (error) => {
      throw new SetupApiError(
        `Migration stream error: ${error.message}`,
        "STREAM_ERROR",
      );
    },
  });
}
