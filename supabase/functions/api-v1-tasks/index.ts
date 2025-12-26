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

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Validate API key
  const authResult = await validateApiKey(req);
  if ("status" in authResult) {
    return authResult; // Error response
  }
  const { apiKey } = authResult;

  // Check rate limit
  const rateLimitError = checkRateLimit(apiKey.id);
  if (rateLimitError) {
    await logApiRequest(
      apiKey.id,
      "/v1/tasks",
      req.method,
      429,
      Date.now() - startTime,
      req
    );
    return rateLimitError;
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathParts: ["api-v1-tasks", "{id}"]
    const taskId = pathParts[1];

    let response: Response;

    if (req.method === "GET") {
      if (taskId) {
        response = await getTask(apiKey, taskId);
      } else {
        response = await listTasks(apiKey, req);
      }
    } else if (req.method === "POST") {
      response = await createTask(apiKey, req);
    } else if (req.method === "PATCH" && taskId) {
      response = await updateTask(apiKey, taskId, req);
    } else if (req.method === "DELETE" && taskId) {
      response = await deleteTask(apiKey, taskId);
    } else {
      response = createErrorResponse(404, "Not found");
    }

    const responseTime = Date.now() - startTime;
    await logApiRequest(
      apiKey.id,
      url.pathname,
      req.method,
      response.status,
      responseTime,
      req
    );

    return response;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logApiRequest(
      apiKey.id,
      new URL(req.url).pathname,
      req.method,
      500,
      responseTime,
      req,
      error.message
    );
    return createErrorResponse(500, "Internal server error");
  }
});

async function listTasks(apiKey: any, req: Request) {
  if (!hasScope(apiKey, "tasks:read")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const url = new URL(req.url);
  const contactId = url.searchParams.get("contact_id");
  const companyId = url.searchParams.get("company_id");
  const dealId = url.searchParams.get("deal_id");
  const status = url.searchParams.get("status");

  let query = supabaseAdmin.from("tasks").select("*");

  if (contactId) {
    query = query.eq("contact_id", parseInt(contactId, 10));
  }
  if (companyId) {
    query = query.eq("company_id", parseInt(companyId, 10));
  }
  if (dealId) {
    query = query.eq("deal_id", parseInt(dealId, 10));
  }
  if (status) {
    query = query.eq("status", status);
  }

  // If no filters, limit to 50 for safety
  if (!contactId && !companyId && !dealId && !status) {
    query = query.limit(50);
  }

  const { data, error } = await query;

  if (error) {
    return createErrorResponse(500, error.message);
  }

  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function getTask(apiKey: any, taskId: string) {
  if (!hasScope(apiKey, "tasks:read")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const id = parseInt(taskId, 10);
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return createErrorResponse(404, "Task not found");
  }

  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function createTask(apiKey: any, req: Request) {
  if (!hasScope(apiKey, "tasks:write")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      ...body,
      sales_id: apiKey.sales_id, // Associate with API key owner
    })
    .select()
    .single();

  if (error) {
    return createErrorResponse(400, error.message);
  }

  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function updateTask(apiKey: any, taskId: string, req: Request) {
  if (!hasScope(apiKey, "tasks:write")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(body)
    .eq("id", parseInt(taskId, 10))
    .select()
    .single();

  if (error || !data) {
    return createErrorResponse(404, "Task not found");
  }

  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function deleteTask(apiKey: any, taskId: string) {
  if (!hasScope(apiKey, "tasks:write")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const { error } = await supabaseAdmin
    .from("tasks")
    .delete()
    .eq("id", parseInt(taskId, 10));

  if (error) {
    return createErrorResponse(404, "Task not found");
  }

  return new Response(null, { status: 204, headers: corsHeaders });
}
