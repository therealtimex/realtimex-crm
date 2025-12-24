import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createErrorResponse, corsHeaders } from "../_shared/utils.ts";
import { validateIngestionRequest, validateTwilioWebhook } from "../_shared/ingestionGuard.ts";

/**
 * Sanitize filename to remove special characters that break storage paths
 * Preserves extension and basic readability while keeping original in metadata
 */
function sanitizeFilename(filename: string): string {
  // Get file extension
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

  // Replace special characters with underscores, keep alphanumeric and basic punctuation
  const safeName = name
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace unsafe chars with underscore
    .replace(/_+/g, '_')                // Collapse multiple underscores
    .replace(/^_|_$/g, '');             // Remove leading/trailing underscores

  // Limit length to avoid path issues (200 chars for name + extension)
  const maxLength = 200 - ext.length;
  const truncatedName = safeName.length > maxLength
    ? safeName.substring(0, maxLength)
    : safeName;

  return truncatedName + ext;
}

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

    // 2. Parse Body based on Content-Type
    const contentType = req.headers.get("content-type") || "";
    let rawBody: any;
    const uploadedFiles: Array<{ fieldName: string; storagePath: string; size: number; type: string }> = [];

    if (contentType.includes("application/json")) {
      rawBody = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      rawBody = {};

      // Process FormData entries (files + fields)
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Handle file upload: upload to storage immediately
          const file = value as File;
          const timestamp = Date.now();

          // Sanitize filename to remove special characters that break storage paths
          // Keep original filename in metadata, use safe version for storage path
          const sanitizedName = sanitizeFilename(file.name);
          const storagePath = `incoming/${timestamp}_${sanitizedName}`;

          console.log(`Uploading file: ${file.name} → ${sanitizedName} (${file.size} bytes, ${file.type})`);

          const { error: uploadError } = await supabaseAdmin.storage
            .from('activity-payloads')
            .upload(storagePath, file, {
              contentType: file.type || 'application/octet-stream',
              upsert: false,
            });

          if (uploadError) {
            console.error(`Failed to upload file ${file.name}:`, uploadError);
            return createErrorResponse(500, `File upload failed: ${uploadError.message}`);
          }

          console.log(`File uploaded successfully: ${storagePath}`);

          // Store file reference instead of file content
          uploadedFiles.push({
            fieldName: key,
            storagePath,
            size: file.size,
            type: file.type || 'application/octet-stream',
          });

          // Add storage reference to rawBody
          rawBody[key] = {
            _type: 'file_ref',
            storage_path: storagePath,
            filename: file.name,
            size: file.size,
            mime_type: file.type,
          };
        } else {
          // Regular form field
          rawBody[key] = value;
        }
      }
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

    // 4. Add file upload metadata if files were uploaded
    const activityMetadata = {
      ...normalized.metadata,
      provider_code: provider.provider_code,
    };

    if (uploadedFiles.length > 0) {
      activityMetadata.uploaded_files = uploadedFiles;
      activityMetadata.has_attachments = true;
    }

    // 5. Insert into 'activities' table
    const { data, error } = await supabaseAdmin
      .from("activities")
      .insert({
        type: normalized.type,
        direction: "inbound",
        processing_status: "raw", // Ready for Local Agent to steal
        raw_data: normalized.raw_data,
        metadata: activityMetadata,
        provider_id: provider.id,
        sales_id: provider.sales_id, // Auto-assign if provider has an owner
        payload_storage_status: uploadedFiles.length > 0 ? 'in_storage' : undefined, // Files uploaded directly to storage
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
    // Generic / Manual / Multipart
    type = payload.type || "note";

    // Check if payload contains file references from multipart upload
    const fileFields = Object.entries(payload).filter(([_, value]) =>
      typeof value === 'object' && value !== null && value._type === 'file_ref'
    );

    if (fileFields.length > 0) {
      // Handle uploaded files
      if (fileFields.length === 1) {
        // Single file - store in raw_data
        const [_fieldName, fileRef] = fileFields[0];
        raw_data = {
          source_type: "storage_ref",
          storage_path: (fileRef as any).storage_path,
          filename: (fileRef as any).filename,
          format: (fileRef as any).mime_type,
          size: (fileRef as any).size,
        };
      } else {
        // Multiple files - store array in raw_data
        raw_data = {
          source_type: "storage_refs",
          files: fileFields.map(([fieldName, fileRef]) => ({
            storage_path: (fileRef as any).storage_path,
            filename: (fileRef as any).filename,
            format: (fileRef as any).mime_type,
            size: (fileRef as any).size,
            field_name: fieldName,
          })),
        };
      }

      // Include other form fields in metadata
      metadata = {
        ...payload.metadata,
        form_data: Object.fromEntries(
          Object.entries(payload).filter(([key]) =>
            !key.startsWith('_') && typeof payload[key] !== 'object'
          )
        ),
      };
    } else {
      // Regular JSON payload
      raw_data = payload.raw_data || { source_type: "text", content: JSON.stringify(payload) };
      metadata = payload.metadata || {};
    }
  }

  return { type, raw_data, metadata };
}
