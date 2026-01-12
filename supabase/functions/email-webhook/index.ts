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
      .select("*")
      .eq("email", toEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (accountError) {
      console.error("Error finding email account:", accountError);
      return new Response(
        JSON.stringify({ success: false, error: accountError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emailAccount) {
      console.log("No active email account found for:", toEmail);
      return new Response(
        JSON.stringify({ success: true, message: "No matching account" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the email with body content
    const { error: insertError } = await supabase.from("email_logs").insert({
      email_account_id: emailAccount.id,
      from_email: fromEmail,
      subject: emailData.subject || "(No Subject)",
      body_text: emailData.text || emailData.html || null,
    });

    if (insertError) {
      console.error("Error inserting email log:", insertError);
    }

    // Return auto-reply if enabled
    if (emailAccount.auto_reply_enabled) {
      const autoReplyMessage = emailAccount.auto_reply_message || 
        "Terima kasih atas email Anda. Saya akan membalas sesegera mungkin.";

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
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email logged" }),
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
