import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CloudflareEmailPayload {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  rawSize?: number;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const botToken = Deno.env.get("BOT_TOKEN");

    // Parse incoming email from Cloudflare Worker
    const emailData: CloudflareEmailPayload = await req.json();
    
    console.log("Received email from Cloudflare:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
    });

    // Extract email address from "Name <email@domain.com>" format
    const fromEmailMatch = emailData.from.match(/<([^>]+)>/) || [null, emailData.from];
    const fromEmail = fromEmailMatch[1] || emailData.from;
    
    const toEmailMatch = emailData.to.match(/<([^>]+)>/) || [null, emailData.to];
    const toEmail = toEmailMatch[1] || emailData.to;

    // Find email account by the destination email
    const { data: emailAccount, error: accountError } = await supabase
      .from("email_accounts")
      .select("*, telegram_users(*)")
      .eq("email", toEmail)
      .eq("is_active", true)
      .eq("auto_reply_enabled", true)
      .single();

    if (accountError || !emailAccount) {
      console.log("No active email account found for:", toEmail);
      return new Response(
        JSON.stringify({ success: true, message: "No matching account or auto-reply disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is approved
    if (emailAccount.telegram_users?.status !== "approved") {
      console.log("User not approved:", emailAccount.telegram_user_id);
      return new Response(
        JSON.stringify({ success: true, message: "User not approved" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the email
    await supabase.from("email_logs").insert({
      email_account_id: emailAccount.id,
      from_email: fromEmail,
      subject: emailData.subject || "(No Subject)",
    });

    // Send notification to Telegram user
    if (botToken && emailAccount.telegram_users?.telegram_id) {
      const telegramMessage = `📧 *Email Baru Diterima*\n\n` +
        `*Dari:* ${escapeMarkdown(fromEmail)}\n` +
        `*Subjek:* ${escapeMarkdown(emailData.subject || "(No Subject)")}\n\n` +
        `Auto-reply telah dikirim dengan pesan:\n` +
        `_${escapeMarkdown(emailAccount.auto_reply_message || "Terima kasih atas email Anda.")}_`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: emailAccount.telegram_users.telegram_id,
          text: telegramMessage,
          parse_mode: "Markdown",
        }),
      });
    }

    // Return auto-reply message for Cloudflare Worker to send
    const autoReplyMessage = emailAccount.auto_reply_message || 
      "Terima kasih atas email Anda. Saya sedang tidak tersedia saat ini dan akan membalas sesegera mungkin.";

    return new Response(
      JSON.stringify({
        success: true,
        autoReply: {
          enabled: true,
          message: autoReplyMessage,
          replyTo: fromEmail,
          subject: `Re: ${emailData.subject || "(No Subject)"}`,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing email webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}
