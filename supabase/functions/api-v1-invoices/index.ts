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
      "/v1/invoices",
      req.method,
      429,
      Date.now() - startTime,
      req,
    );
    return rateLimitError;
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathParts: ["api-v1-invoices", "{id}", "send"]
    const invoiceId = pathParts[1];
    const action = pathParts[2];

    let response: Response;

    if (req.method === "GET") {
      if (invoiceId) {
        response = await getInvoice(apiKey, invoiceId);
      } else {
        response = await listInvoices(apiKey, req);
      }
    } else if (req.method === "POST") {
      if (invoiceId === "send") {
        // This would be POST /api-v1-invoices/send but typically it's POST /api-v1-invoices/{id}/send
        response = createErrorResponse(400, "Missing invoice ID for send");
      } else if (invoiceId && action === "send") {
        response = await sendInvoice(apiKey, invoiceId, req);
      } else {
        response = await createInvoice(apiKey, req);
      }
    } else if (req.method === "PATCH" && invoiceId) {
      response = await updateInvoice(apiKey, invoiceId, req);
    } else if (req.method === "DELETE" && invoiceId) {
      response = await deleteInvoice(apiKey, invoiceId);
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
      req,
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
      error.message,
    );
    return createErrorResponse(500, "Internal server error");
  }
});

async function listInvoices(apiKey: any, req: Request) {
  if (
    !hasScope(apiKey, "invoices:read") &&
    !hasScope(apiKey, "invoices:write")
  ) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const url = new URL(req.url);
  const contactId = url.searchParams.get("contact_id");
  const companyId = url.searchParams.get("company_id");
  const dealId = url.searchParams.get("deal_id");
  const status = url.searchParams.get("status");

  let query = supabaseAdmin.from("invoices").select("*");

  if (contactId) query = query.eq("contact_id", parseInt(contactId, 10));
  if (companyId) query = query.eq("company_id", parseInt(companyId, 10));
  if (dealId) query = query.eq("deal_id", parseInt(dealId, 10));
  if (status) query = query.eq("status", status);

  // Default limit
  query = query.limit(50).order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) return createErrorResponse(500, error.message);

  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function getInvoice(apiKey: any, invoiceId: string) {
  if (
    !hasScope(apiKey, "invoices:read") &&
    !hasScope(apiKey, "invoices:write")
  ) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const id = parseInt(invoiceId, 10);
  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .single();

  if (error || !invoice) return createErrorResponse(404, "Invoice not found");

  return new Response(JSON.stringify({ data: invoice }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function createInvoice(apiKey: any, req: Request) {
  if (!hasScope(apiKey, "invoices:write")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const body = await req.json();

  // Use RPC for atomic creation of invoice and items
  const { data: invoiceId, error } = await supabaseAdmin.rpc(
    "create_invoice_with_items",
    {
      p_invoice_data: {
        ...body,
        sales_id: apiKey.sales_id,
      },
    },
  );

  if (error) return createErrorResponse(400, error.message);

  // Fetch full invoice with items
  const { data: fullInvoice } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", invoiceId)
    .single();

  return new Response(JSON.stringify({ data: fullInvoice }), {
    status: 201,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function updateInvoice(apiKey: any, invoiceId: string, req: Request) {
  if (!hasScope(apiKey, "invoices:write")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const body = await req.json();
  const id = parseInt(invoiceId, 10);

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return createErrorResponse(404, "Invoice not found");

  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function deleteInvoice(apiKey: any, invoiceId: string) {
  if (!hasScope(apiKey, "invoices:write")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const { error } = await supabaseAdmin
    .from("invoices")
    .delete()
    .eq("id", parseInt(invoiceId, 10));

  if (error) return createErrorResponse(404, "Invoice not found");

  return new Response(null, { status: 204, headers: corsHeaders });
}

async function sendInvoice(apiKey: any, invoiceId: string, _req: Request) {
  if (!hasScope(apiKey, "invoices:write")) {
    return createErrorResponse(403, "Insufficient permissions");
  }

  const id = parseInt(invoiceId, 10);

  // 1. Fetch Invoice + Items + Contact + Company + Business Profile
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("*, invoice_items(*), contacts(*), companies(*)")
    .eq("id", id)
    .single();

  if (invoiceError || !invoice)
    return createErrorResponse(404, "Invoice not found");

  const { data: businessProfile } = await supabaseAdmin
    .from("business_profile")
    .select("*")
    .eq("id", 1)
    .single();

  // 2. Determine recipient (email_jsonb is JSONB array, companies may have email field)
  const recipientEmail =
    invoice.contacts?.email_jsonb?.[0]?.email || invoice.companies?.email;
  if (!recipientEmail) {
    return createErrorResponse(
      400,
      "No recipient email found for this invoice",
    );
  }

  // 3. Generate HTML Content
  const html = generateInvoiceEmailHTML({
    invoice,
    businessProfile,
    company: invoice.companies,
    contact: invoice.contacts,
    items: invoice.invoice_items,
    message:
      "Thank you for your business. Please find your invoice details below.",
  });

  // 4. Invoke send-email function
  // We use the system's own edge function to handle the sending via Resend
  const { data: emailData, error: emailError } =
    await supabaseAdmin.functions.invoke("send-email", {
      body: {
        to: recipientEmail,
        subject: `Invoice #${invoice.invoice_number}`,
        body: `Please find your invoice #${invoice.invoice_number} details online.`,
        html: html,
      },
    });

  if (emailError)
    return createErrorResponse(
      500,
      `Email delivery failed: ${emailError.message}`,
    );

  // 5. Update Invoice status
  await supabaseAdmin
    .from("invoices")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  return new Response(
    JSON.stringify({
      message: "Invoice sent successfully",
      recipient: recipientEmail,
      emailId: emailData?.id,
    }),
    {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
}

function generateInvoiceEmailHTML(data: any): string {
  const { invoice, businessProfile, company, contact, items, message } = data;

  const contactName = contact?.first_name
    ? `${contact.first_name} ${contact.last_name || ""}`.trim()
    : "Valued Customer";

  const companyName = company?.name || "";
  const senderName =
    businessProfile?.email_from_name || businessProfile?.name || "Your Company";

  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>${senderName}</h2>
    <p>Hello ${contactName}${companyName ? ` from ${companyName}` : ""},</p>
    <p>${message}</p>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Invoice #${invoice.invoice_number}</h3>
      <p>Amount Due: <strong>${invoice.currency} ${invoice.total.toFixed(2)}</strong></p>
      <p>Due Date: ${new Date(invoice.due_date).toLocaleDateString()}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 2px solid #eee;">
          <th style="text-align: left; padding: 10px;">Item</th>
          <th style="text-align: right; padding: 10px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items
          ?.map(
            (item: any) => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${item.description} (x${item.quantity})</td>
            <td style="padding: 10px; text-align: right;">${invoice.currency} ${item.line_total_with_tax.toFixed(2)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
    <p style="margin-top: 40px; font-size: 14px; color: #666;">
      Thank you for your business!
    </p>
  </div>
</body>
</html>
  `;
}
