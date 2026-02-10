import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/utils.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the user (or service role)
    const authHeader = req.headers.get("Authorization")!;
    const isServiceRole =
      authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

    let _user = null;
    if (!isServiceRole) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: { Authorization: authHeader },
          },
        },
      );

      const { data, error: authError } = await supabaseClient.auth.getUser();

      if (authError || !data.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      _user = data.user;
    }

    // Use admin client for DB operations to ensure we bypass RLS correctly when needed
    const dbClient = isServiceRole
      ? createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        )
      : createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          {
            global: { headers: { Authorization: authHeader } },
          },
        );
    // 2. Parse request body
    const { to, cc, subject, body, html, attachments } = await req.json();

    if (!to || !subject || (!body && !html)) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, subject, body/html",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Fetch sender settings from business_profile
    const { data: businessProfile } = await dbClient
      .from("business_profile")
      .select("name, email_from_name, email_from_email, resend_api_key")
      .eq("id", 1)
      .single();

    const fromEmail =
      businessProfile?.email_from_email ||
      Deno.env.get("DEFAULT_FROM_EMAIL") ||
      "invoices@updates.realtimex.io";
    const fromName =
      businessProfile?.email_from_name || businessProfile?.name || "CRM";
    const formattedFrom = `${fromName} <${fromEmail}>`;

    // Use API key from database if available, otherwise fall back to environment variable
    const apiKey = businessProfile?.resend_api_key || RESEND_API_KEY;

    // 4. Send email via Resend
    // If no API key is provided, we log it (for demo/local development)
    if (!apiKey) {
      console.log("Mocking email sending (RESEND_API_KEY not set):", {
        from: formattedFrom,
        to,
        cc,
        subject,
        body: body || "(html content)",
      });
      return new Response(
        JSON.stringify({
          message: "Email logged to console (RESEND_API_KEY not set)",
          mock: true,
          from: formattedFrom,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const emailPayload = {
      from: formattedFrom,
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      subject: subject,
      text: body,
      html: html,
      ...(attachments && attachments.length > 0 && { attachments }),
    };

    console.log("Sending email via Resend:", {
      from: formattedFrom,
      to: emailPayload.to,
      subject,
      hasApiKey: !!apiKey,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await res.json();

    console.log("Resend API response:", { status: res.status, data });

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(
        data.message ||
          JSON.stringify(data) ||
          "Failed to send email via Resend",
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Unknown error",
        details: error?.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
