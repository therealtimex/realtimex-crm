import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createErrorResponse, corsHeaders } from "../_shared/utils.ts";
import { validateIngestionRequest, validateTwilioWebhook } from "../_shared/ingestionGuard.ts";

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Validate & Identify Provider
    const validation = await validateIngestionRequest(req);
    if (validation.error) return validation.error;

    const { provider } = validation;

    // 2. Parse Body based on Provider
    const contentType = req.headers.get("content-type") || "";
    let rawBody: any;

    if (contentType.includes("application/json")) {
      rawBody = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      rawBody = Object.fromEntries(formData.entries());
    } else {
      rawBody = await req.text();
    }

    // 2.5. Validate Twilio Signature (after body is parsed)
    if (provider.provider_code === "twilio" && provider.config?.auth_token) {
      const isValid = await validateTwilioWebhook(req, provider.config.auth_token, rawBody);
      if (!isValid) {
        console.error("Invalid Twilio signature");
        return createErrorResponse(401, "Invalid Twilio Signature");
      }
    }

    // 3. Normalize Data (The "Normalizer" Pattern)
    const normalized = normalizeActivity(provider.provider_code, rawBody);

    // 4. Insert into 'activities' table
    const { data, error } = await supabaseAdmin
      .from("activities")
      .insert({
        type: normalized.type,
        direction: "inbound",
        processing_status: "raw", // Ready for Local Agent to steal
        raw_data: normalized.raw_data,
        metadata: { ...normalized.metadata, provider_code: provider.provider_code },
        provider_id: provider.id,
        sales_id: provider.sales_id, // Auto-assign if provider has an owner
      })
      .select()
      .single();

    if (error) {
      console.error("DB Insert Error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return createErrorResponse(500, `Failed to persist activity: ${error.message || JSON.stringify(error)}`);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 202, // Accepted
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Ingestion Error:", err);
    return createErrorResponse(500, "Internal Server Error");
  }
});

/**
 * Normalizes provider-specific payloads into the standard RealTimeX schema.
 */
function normalizeActivity(providerCode: string, payload: any) {
  let type = "other";
  let raw_data = {};
  let metadata = {};

  if (providerCode === "postmark") {
    type = "email";
    raw_data = {
      source_type: "text",
      content: payload.TextBody || payload.HtmlBody || "",
      subject: payload.Subject,
      sender: payload.From,
    };
    metadata = {
      message_id: payload.MessageID,
      to: payload.To,
    };
  } else if (providerCode === "twilio") {
    // Detect SMS vs Voice
    if (payload.RecordingUrl) {
      type = "call";
      raw_data = {
        source_type: "url",
        content: payload.RecordingUrl, // The Local Agent will download this
        format: "audio/wav",
      };
      metadata = {
        call_sid: payload.CallSid,
        from: payload.From,
        duration: payload.CallDuration,
      };
    } else {
      type = "sms";
      raw_data = {
        source_type: "text",
        content: payload.Body,
      };
      metadata = {
        message_sid: payload.MessageSid,
        from: payload.From,
      };
    }
  } else {
    // Generic / Manual
    type = payload.type || "note";
    raw_data = payload.raw_data || { source_type: "text", content: JSON.stringify(payload) };
    metadata = payload.metadata || {};
  }

  return { type, raw_data, metadata };
}
