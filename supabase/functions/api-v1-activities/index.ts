import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders, createErrorResponse } from "../_shared/utils.ts";
import {
  validateApiKey,
  checkRateLimit,
  hasScope,
  logApiRequest,
} from "../_shared/apiKeyAuth.ts";

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authResult = await validateApiKey(req);
  if ("status" in authResult) {
    return authResult;
  }
  const { apiKey } = authResult;

  const rateLimitError = checkRateLimit(apiKey.id);
  if (rateLimitError) {
    await logApiRequest(
      apiKey.id,
      "/v1/activities",
      req.method,
      429,
      Date.now() - startTime,
      req
    );
    return rateLimitError;
  }

  try {
    if (req.method === "POST") {
      const response = await createActivity(apiKey, req);
      const responseTime = Date.now() - startTime;
      await logApiRequest(
        apiKey.id,
        "/v1/activities",
        req.method,
        response.status,
        responseTime,
        req
      );
      return response;
    } else {
      return createErrorResponse(404, "Not found");
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logApiRequest(
      apiKey.id,
      "/v1/activities",
      req.method,
      500,
      responseTime,
      req,
      error.message
    );
    return createErrorResponse(500, "Internal server error");
  }
});

async function createActivity(apiKey: any, req: Request) {
  if (!hasScope(apiKey, "activities:write")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const contentType = req.headers.get("content-type") || "";
  let noteData: any;
  const uploadedFiles: any[] = [];

  // Check if multipart/form-data (with file uploads)
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();

    // Extract note fields
    const type = formData.get("type") as string;
    const contact_id = formData.get("contact_id");
    const company_id = formData.get("company_id");
    const deal_id = formData.get("deal_id");
    const task_id = formData.get("task_id");
    const text = formData.get("text") as string;
    const status = formData.get("status") as string;

    // Build note data
    noteData = { type, text, status };
    if (contact_id) noteData.contact_id = parseInt(contact_id as string, 10);
    if (company_id) noteData.company_id = parseInt(company_id as string, 10);
    if (deal_id) noteData.deal_id = parseInt(deal_id as string, 10);
    if (task_id) noteData.task_id = parseInt(task_id as string, 10);

    // Extract and upload files
    const files = formData.getAll("files");
    for (const fileEntry of files) {
      if (fileEntry instanceof File) {
        const file = fileEntry as File;

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${timestamp}-${sanitizedName}`;

        // Upload to Supabase Storage using admin client (bypasses RLS)
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from("attachments")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          return createErrorResponse(400, `File upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("attachments")
          .getPublicUrl(uploadData.path);

        uploadedFiles.push({
          src: publicUrl,
          title: file.name,
          type: file.type,
        });
      }
    }

    // Add uploaded files to attachments
    if (uploadedFiles.length > 0) {
      noteData.attachments = uploadedFiles;
    }

  } else {
    // JSON body (backwards compatible)
    noteData = await req.json();
  }

  const { type, ...activityData } = noteData;

  // Map note type to table and validate
  // Note: Tasks are now handled by /api-v1-tasks endpoint
  let tableName: string;
  let responseType: string;

  switch (type) {
    case "note":
    case "contact_note":
      tableName = "contactNotes";
      responseType = "contact_note";
      break;
    case "company_note":
      tableName = "companyNotes";
      responseType = "company_note";
      break;
    case "deal_note":
      tableName = "dealNotes";
      responseType = "deal_note";
      break;
    case "task_note":
      tableName = "taskNotes";
      responseType = "task_note";
      break;
    default:
      return createErrorResponse(
        400,
        "Invalid note type. Must be 'contact_note', 'company_note', 'deal_note', or 'task_note'. For tasks, use /api-v1-tasks endpoint."
      );
  }

  // Insert note
  const { data, error } = await supabaseAdmin
    .from(tableName)
    .insert({
      ...activityData,
      sales_id: apiKey.sales_id,
    })
    .select()
    .single();

  if (error) {
    return createErrorResponse(400, error.message);
  }

  return new Response(JSON.stringify({ data, type: responseType }), {
    status: 201,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
