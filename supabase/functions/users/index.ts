import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders, createErrorResponse } from "../_shared/utils.ts";

async function updateSaleDisabled(user_id: string, disabled: boolean) {
  return await supabaseAdmin
    .from("sales")
    .update({ disabled: disabled ?? false })
    .eq("user_id", user_id);
}

async function updateSaleAdministrator(
  user_id: string,
  administrator: boolean,
) {
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .update({ administrator })
    .eq("user_id", user_id)
    .select("*");

  if (!sales?.length || salesError) {
    console.error("Error updating user:", salesError);
    throw salesError ?? new Error("Failed to update sale");
  }
  return sales.at(0);
}

async function updateSaleAvatar(user_id: string, avatar: string) {
  const { data: sales, error: salesError } = await supabaseAdmin
    .from("sales")
    .update({ avatar })
    .eq("user_id", user_id)
    .select("*");

  if (!sales?.length || salesError) {
    console.error("Error updating user:", salesError);
    throw salesError ?? new Error("Failed to update sale");
  }
  return sales.at(0);
}

async function inviteUser(req: Request, currentUserSale: any) {
  const { email, first_name, last_name, disabled, administrator } =
    await req.json();

  if (!currentUserSale.administrator) {
    return createErrorResponse(401, "Not Authorized");
  }

  // Create user using inviteUserByEmail which:
  // 1. Creates the user account
  // 2. Sends the "Invite user" email template (not "Confirm signup")
  // 3. User will use OTP to log in (not the invite link)
  console.log(`[inviteUser] Creating user and sending welcome email to ${email}`);

  const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name }, // User metadata
  });

  if (inviteError) {
    console.error(`[inviteUser] Error: ${inviteError.message}`);
    return createErrorResponse(500, `Failed to invite user: ${inviteError.message}`);
  }

  if (!data?.user) {
    console.error(`[inviteUser] No user returned from invite`);
    return createErrorResponse(500, "Failed to create user");
  }

  console.log(`[inviteUser] User created and welcome email sent to ${email}`);

  try {
    await updateSaleDisabled(data.user.id, disabled);
    const sale = await updateSaleAdministrator(data.user.id, administrator);

    return new Response(
      JSON.stringify({
        data: sale,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (e) {
    console.error("Error patching sale:", e);
    return createErrorResponse(500, "Internal Server Error");
  }
}

async function resendInvite(req: Request, currentUserSale: any) {
  try {
    const { sales_id, action } = await req.json();
    console.log("[resendInvite] Request:", { sales_id, action });

    if (!currentUserSale.administrator) {
      return createErrorResponse(401, "Not Authorized");
    }

    const { data: sale } = await supabaseAdmin
      .from("sales")
      .select("*")
      .eq("id", sales_id)
      .single();

    if (!sale) {
      return createErrorResponse(404, "User not found");
    }

    // Get user from auth
    const { data: authUser, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserById(sale.user_id);

    if (!authUser?.user || getUserError) {
      console.error("Error getting user:", getUserError);
      return createErrorResponse(404, "User not found");
    }

    console.log("[resendInvite] User email:", authUser.user.email, "Action:", action);

    // NOTE: With OTP authentication, users don't need invite/reset emails
    // Instead, instruct them to:
    // - For new users: Use "Login with email code (OTP)" to set up their account
    // - For password reset: Use "Forgot Password?" which sends OTP code

    // Return success - admin should manually notify user to use OTP login
    console.log("[resendInvite] OTP-based flow - no email sent");
    return new Response(
      JSON.stringify({
        data: sale,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err) {
    console.error("[resendInvite] Unexpected error:", err);
    return createErrorResponse(500, `Internal error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

async function patchUser(req: Request, currentUserSale: any) {
  const {
    sales_id,
    email,
    first_name,
    last_name,
    avatar,
    administrator,
    disabled,
  } = await req.json();
  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("*")
    .eq("id", sales_id)
    .single();

  if (!sale) {
    return createErrorResponse(404, "Not Found");
  }

  // Users can only update their own profile unless they are an administrator
  if (!currentUserSale.administrator && currentUserSale.id !== sale.id) {
    return createErrorResponse(401, "Not Authorized");
  }

  const { data, error: userError } =
    await supabaseAdmin.auth.admin.updateUserById(sale.user_id, {
      email,
      ban_duration: disabled ? "87600h" : "none",
      user_metadata: { first_name, last_name },
    });

  if (!data?.user || userError) {
    console.error("Error patching user:", userError);
    return createErrorResponse(500, "Internal Server Error");
  }

  if (avatar) {
    await updateSaleAvatar(data.user.id, avatar);
  }

  // Only administrators can update the administrator and disabled status
  if (!currentUserSale.administrator) {
    const { data: new_sale } = await supabaseAdmin
      .from("sales")
      .select("*")
      .eq("id", sales_id)
      .single();
    return new Response(
      JSON.stringify({
        data: new_sale,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }

  try {
    await updateSaleDisabled(data.user.id, disabled);
    const sale = await updateSaleAdministrator(data.user.id, administrator);
    return new Response(
      JSON.stringify({
        data: sale,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (e) {
    console.error("Error patching sale:", e);
    return createErrorResponse(500, "Internal Server Error");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization")!;
  const localClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data } = await localClient.auth.getUser();
  if (!data?.user) {
    return createErrorResponse(401, "Unauthorized");
  }
  const currentUserSale = await supabaseAdmin
    .from("sales")
    .select("*")
    .eq("user_id", data.user.id)
    .single();

  if (!currentUserSale?.data) {
    return createErrorResponse(401, "Unauthorized");
  }
  if (req.method === "POST") {
    return inviteUser(req, currentUserSale.data);
  }

  if (req.method === "PATCH") {
    return patchUser(req, currentUserSale.data);
  }

  if (req.method === "PUT") {
    return resendInvite(req, currentUserSale.data);
  }

  return createErrorResponse(405, "Method Not Allowed");
});
