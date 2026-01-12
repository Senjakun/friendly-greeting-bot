import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bot-token",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const botToken = Deno.env.get("BOT_TOKEN")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify bot token
  const requestToken = req.headers.get("x-bot-token");
  if (requestToken !== botToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/bot-api", "");
    const body = req.method !== "GET" ? await req.json() : null;

    // Route: GET /user?telegram_id=123
    if (req.method === "GET" && path === "/user") {
      const telegramId = url.searchParams.get("telegram_id");
      const { data, error } = await supabase
        .from("telegram_users")
        .select("*")
        .eq("telegram_id", parseInt(telegramId!))
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return jsonResponse({ user: data });
    }

    // Route: POST /user - Create or update user
    if (req.method === "POST" && path === "/user") {
      const { telegram_id, username, first_name, last_name } = body;

      // Check if exists
      const { data: existing } = await supabase
        .from("telegram_users")
        .select("*")
        .eq("telegram_id", telegram_id)
        .single();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from("telegram_users")
          .update({ username, first_name, last_name, updated_at: new Date().toISOString() })
          .eq("telegram_id", telegram_id)
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ user: data, created: false });
      } else {
        // Create
        const { data, error } = await supabase
          .from("telegram_users")
          .insert({ telegram_id, username, first_name, last_name, status: "pending" })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ user: data, created: true });
      }
    }

    // Route: GET /user/approved?telegram_id=123
    if (req.method === "GET" && path === "/user/approved") {
      const telegramId = url.searchParams.get("telegram_id");
      const { data, error } = await supabase
        .from("telegram_users")
        .select("status, expires_at")
        .eq("telegram_id", parseInt(telegramId!))
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (!data) return jsonResponse({ approved: false });

      const isApproved = data.status === "approved" && 
        (!data.expires_at || new Date(data.expires_at) > new Date());
      return jsonResponse({ approved: isApproved });
    }

    // Route: POST /user/approve
    if (req.method === "POST" && path === "/user/approve") {
      const { telegram_id, days } = body;
      const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

      const { data, error } = await supabase
        .from("telegram_users")
        .update({ status: "approved", verified_at: new Date().toISOString(), expires_at: expiresAt })
        .eq("telegram_id", telegram_id)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ user: data });
    }

    // Route: POST /user/revoke
    if (req.method === "POST" && path === "/user/revoke") {
      const { telegram_id } = body;

      const { data, error } = await supabase
        .from("telegram_users")
        .update({ status: "rejected" })
        .eq("telegram_id", telegram_id)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ user: data });
    }

    // Route: GET /users - List all users
    if (req.method === "GET" && path === "/users") {
      const { data, error } = await supabase
        .from("telegram_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return jsonResponse({ users: data });
    }

    // Route: GET /users/approved - List approved users
    if (req.method === "GET" && path === "/users/approved") {
      const { data, error } = await supabase
        .from("telegram_users")
        .select("*")
        .eq("status", "approved");

      if (error) throw error;
      return jsonResponse({ users: data });
    }

    // Route: GET /email-account?telegram_id=123
    if (req.method === "GET" && path === "/email-account") {
      const telegramId = url.searchParams.get("telegram_id");
      
      // First get user
      const { data: user } = await supabase
        .from("telegram_users")
        .select("id")
        .eq("telegram_id", parseInt(telegramId!))
        .single();

      if (!user) return jsonResponse({ account: null });

      const { data, error } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("telegram_user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return jsonResponse({ account: data });
    }

    // Route: POST /email-account - Create or update email account
    if (req.method === "POST" && path === "/email-account") {
      const { telegram_id, email, auto_reply_message, auto_reply_enabled } = body;

      // Get user
      const { data: user } = await supabase
        .from("telegram_users")
        .select("id")
        .eq("telegram_id", telegram_id)
        .single();

      if (!user) {
        return jsonResponse({ error: "User not found" }, 404);
      }

      // Check if exists
      const { data: existing } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("telegram_user_id", user.id)
        .single();

      const updateData: any = { updated_at: new Date().toISOString() };
      if (email !== undefined) updateData.email = email;
      if (auto_reply_message !== undefined) updateData.auto_reply_message = auto_reply_message;
      if (auto_reply_enabled !== undefined) updateData.auto_reply_enabled = auto_reply_enabled;

      if (existing) {
        const { data, error } = await supabase
          .from("email_accounts")
          .update(updateData)
          .eq("telegram_user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ account: data });
      } else {
        const { data, error } = await supabase
          .from("email_accounts")
          .insert({ telegram_user_id: user.id, email, auto_reply_message, auto_reply_enabled: auto_reply_enabled ?? false })
          .select()
          .single();
        if (error) throw error;
        return jsonResponse({ account: data });
      }
    }

    // Route: GET /email-account/by-email?email=xxx
    if (req.method === "GET" && path === "/email-account/by-email") {
      const email = url.searchParams.get("email");
      
      const { data, error } = await supabase
        .from("email_accounts")
        .select("*, telegram_users(*)")
        .eq("email", email!)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return jsonResponse({ account: data });
    }

    // Route: POST /email-log - Log incoming email
    if (req.method === "POST" && path === "/email-log") {
      const { email_account_id, from_email, subject } = body;

      const { data, error } = await supabase
        .from("email_logs")
        .insert({ email_account_id, from_email, subject })
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ log: data });
    }

    // Route: GET /email-logs?telegram_id=123&limit=10
    if (req.method === "GET" && path === "/email-logs") {
      const telegramId = url.searchParams.get("telegram_id");
      const limit = parseInt(url.searchParams.get("limit") || "10");

      // Get user
      const { data: user } = await supabase
        .from("telegram_users")
        .select("id")
        .eq("telegram_id", parseInt(telegramId!))
        .single();

      if (!user) return jsonResponse({ logs: [] });

      // Get email account
      const { data: account } = await supabase
        .from("email_accounts")
        .select("id")
        .eq("telegram_user_id", user.id)
        .single();

      if (!account) return jsonResponse({ logs: [] });

      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .eq("email_account_id", account.id)
        .order("replied_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return jsonResponse({ logs: data });
    }

    // Route: POST /broadcast - Save broadcast message
    if (req.method === "POST" && path === "/broadcast") {
      const { message, recipients_count } = body;

      const { data, error } = await supabase
        .from("broadcast_messages")
        .insert({ message, recipients_count })
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ broadcast: data });
    }

    return jsonResponse({ error: "Not found" }, 404);

  } catch (error: any) {
    console.error("Bot API Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
