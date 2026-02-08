import { ValidationResult } from './types';

/**
 * Normalizes Supabase URL input - accepts either full URL or just project ID
 */
export function normalizeSupabaseUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    return `https://${trimmed}.supabase.co`;
}

/**
 * Validates if input looks like a valid Supabase URL or project ID
 */
export function validateUrlFormat(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) {
        return { valid: false, message: 'URL is required' };
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const url = new URL(trimmed);
            if (url.hostname.endsWith('.supabase.co')) {
                return { valid: true, message: 'Valid Supabase URL' };
            }
            return { valid: false, message: 'URL must be a supabase.co domain' };
        } catch {
            return { valid: false, message: 'Invalid URL format' };
        }
    }

    if (/^[a-z0-9-]+$/.test(trimmed)) {
        return { valid: true, message: 'Project ID detected' };
    }

    return { valid: false, message: 'Enter a valid URL or Project ID' };
}

/**
 * Validates if input looks like a valid Supabase API key
 */
export function validateKeyFormat(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) {
        return { valid: false, message: 'API key is required' };
    }

    // Publishable key format
    if (trimmed.startsWith('sb_publishable_')) {
        if (trimmed.length < 25) {
            return { valid: false, message: 'Incomplete publishable key' };
        }
        return { valid: true, message: 'Valid Publishable Key' };
    }

    // Anon key format (JWT)
    if (trimmed.startsWith('eyJ')) {
        if (trimmed.length < 50) {
            return { valid: false, message: 'Incomplete anon key' };
        }
        return { valid: true, message: 'Valid Anon Key' };
    }

    return { valid: false, message: 'Invalid API Key format' };
}

/**
 * Validates access token format
 */
export function validateAccessToken(token: string): ValidationResult {
    const trimmed = token.trim();
    if (!trimmed) {
        return { valid: false, message: 'Access token is required' };
    }

    if (!trimmed.startsWith('sbp_')) {
        return { valid: false, message: 'Token must start with sbp_' };
    }

    if (trimmed.length < 20) {
        return { valid: false, message: 'Token is too short' };
    }

    return { valid: true, message: 'Valid access token' };
}

/**
 * Extracts project ID from Supabase URL or returns the ID if already extracted
 */
export function extractProjectId(urlOrId: string): string | null {
    const trimmed = urlOrId.trim();
    if (!trimmed) return null;

    // Already a project ID
    if (!trimmed.includes('.') && !trimmed.includes('/')) {
        return trimmed;
    }

    // Extract from URL
    try {
        const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
        const hostname = url.hostname;
        const projectId = hostname.split('.')[0];
        return projectId || null;
    } catch {
        return null;
    }
}
