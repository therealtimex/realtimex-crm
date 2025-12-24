import { createErrorResponse } from "./utils.ts";
import { supabaseAdmin } from "./supabaseAdmin.ts";

/**
 * Validates the request signature or API key.
 * Returns the resolved provider config or an error response.
 * Note: For Twilio, signature validation must be done separately after body parsing
 * using validateTwilioWebhook()
 */
export async function validateIngestionRequest(req: Request) {
  const url = new URL(req.url);
  const providerCode = url.searchParams.get("provider");

  // Check for ingestion key in header (preferred) or URL query param (backward compatibility)
  const ingestionKey = req.headers.get("x-ingestion-key") || url.searchParams.get("key");

  // 1. Internal/Manual API Key (Bearer)
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ak_live_")) {
    // Validate Internal API Key (already implemented in apiKeyAuth.ts)
    // For V1, we trust internal keys as "generic" provider
    return { provider: { id: null, provider_code: "generic", sales_id: null } };
  }

  // 2. Identify Provider by 'ingestion_key' (Preferred)
  if (ingestionKey) {
    const { data: provider, error } = await supabaseAdmin
      .from("ingestion_providers")
      .select("*")
      .eq("ingestion_key", ingestionKey)
      .eq("is_active", true)
      .single();

    if (error || !provider) {
      return { error: createErrorResponse(401, "Invalid Ingestion Key") };
    }

    return { provider };
  }

  // 3. Fallback: Identify by Query Param (Legacy/Public Webhooks)
  if (providerCode === "twilio") {
      // In this case, we need to find WHICH Twilio config to use.
      // Usually, we match by the 'To' phone number in the body, but that requires parsing the body first.
      // For strict security, we REJECT requests without an ingestion_key in the URL.
      return { error: createErrorResponse(401, "Missing 'key' parameter in webhook URL") };
  }

  return { error: createErrorResponse(400, "Unknown Provider or Missing Authentication") };
}

/**
 * Validates a Twilio webhook request after body parsing
 * Call this after validateIngestionRequest() and body parsing
 */
export async function validateTwilioWebhook(
  req: Request,
  authToken: string,
  body: Record<string, any>
): Promise<boolean> {
  return await validateTwilioSignature(req, authToken, body);
}

/**
 * Validates Twilio X-Twilio-Signature using HMAC-SHA1
 * Implementation follows Twilio's security specification:
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
async function validateTwilioSignature(
  req: Request,
  authToken: string,
  body: Record<string, any>
): Promise<boolean> {
  const signature = req.headers.get("X-Twilio-Signature");
  if (!signature) return false;

  try {
    // 1. Get the full URL (including protocol, host, path, and query params)
    const url = req.url;

    // 2. Sort POST parameters alphabetically and concatenate
    const sortedParams = Object.keys(body)
      .sort()
      .map((key) => `${key}${body[key]}`)
      .join("");

    // 3. Concatenate URL + sorted params
    const data = url + sortedParams;

    // 4. Compute HMAC-SHA1
    const encoder = new TextEncoder();
    const keyData = encoder.encode(authToken);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

    // 5. Convert to Base64
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray));

    // 6. Constant-time comparison to prevent timing attacks
    return constantTimeCompare(signature, signatureBase64);
  } catch (error) {
    console.error("Twilio signature validation error:", error);
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
