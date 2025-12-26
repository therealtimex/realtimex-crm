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

  const body = await req.json();
  const { type, ...activityData } = body;

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
