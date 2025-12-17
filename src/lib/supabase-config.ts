/**
 * Supabase Configuration Management
 *
 * Handles storing and retrieving Supabase connection details
 * Priority: localStorage > environment variables
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  configuredAt?: string;
}

const STORAGE_KEY = 'realtimex_crm_supabase_config';

/**
 * Get the current Supabase configuration
 * Priority: localStorage override > environment variables
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  // Try localStorage first (user-configured via UI)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored Supabase config:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Fallback to environment variables
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    return { url, anonKey };
  }

  return null;
}

/**
 * Save Supabase configuration to localStorage
 */
export function saveSupabaseConfig(config: Omit<SupabaseConfig, 'configuredAt'>): void {
  const configWithTimestamp: SupabaseConfig = {
    ...config,
    configuredAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configWithTimestamp));
}

/**
 * Clear stored Supabase configuration
 */
export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

/**
 * Validate Supabase connection
 */
export async function validateSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Basic anon key validation (JWT format)
    if (!anonKey.startsWith('eyJ')) {
      return { valid: false, error: 'Invalid anon key format' };
    }

    // Test connection by making a simple request
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      }
      return { valid: false, error: `Connection failed: ${response.statusText}` };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Get Supabase config source (for display purposes)
 */
export function getConfigSource(): 'ui' | 'env' | 'none' {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return 'ui';

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && anonKey) return 'env';

  return 'none';
}
