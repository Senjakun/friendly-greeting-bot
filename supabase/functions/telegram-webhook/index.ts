import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const OWNER_ID = Deno.env.get("OWNER_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }
  
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getOrCreateUser(telegramUser: any) {
  const { data: existingUser } = await supabase
    .from("telegram_users")
    .select("*")
    .eq("telegram_id", telegramUser.id)
    .maybeSingle();

  if (existingUser) {
    // Update user info
    await supabase
      .from("telegram_users")
      .update({
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
      })
      .eq("telegram_id", telegramUser.id);
    return existingUser;
  }

  // Create new user
  const { data: newUser } = await supabase
    .from("telegram_users")
    .insert({
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      status: "pending",
    })
    .select()
    .single();

  return newUser;
}

async function isUserApproved(telegramId: number): Promise<boolean> {
  const { data: user } = await supabase
    .from("telegram_users")
    .select("status, expires_at")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (!user || user.status !== "approved") return false;
  if (user.expires_at && new Date(user.expires_at) < new Date()) {
    // Update status to expired
    await supabase
      .from("telegram_users")
      .update({ status: "expired" })
      .eq("telegram_id", telegramId);
    return false;
  }
  return true;
}

function isOwner(telegramId: number): boolean {
  return telegramId.toString() === OWNER_ID;
}

async function handleCommand(message: any) {
  const chatId = message.chat.id;
  const telegramUser = message.from;
  const text = message.text || "";
  const command = text.split(" ")[0].toLowerCase();
  const args = text.split(" ").slice(1);

  const user = await getOrCreateUser(telegramUser);
  const approved = await isUserApproved(telegramUser.id);
  const owner = isOwner(telegramUser.id);

  switch (command) {
    case "/start":
      const welcomeText = `
🎖️ <b>Welcome to Auto Reply AI Bot</b>

This bot helps you manage Outlook email auto-replies with military verification.

<b>Commands:</b>
/verify - Get military verification link
/status - Check your access status
/inbox - View recent emails (approved users)
/help - Show help message

${owner ? "\n<b>Owner Commands:</b>\n/approve [id] [days] - Approve user\n/revoke [id] - Revoke access\n/users - List all users\n/broadcast [msg] - Send to all users" : ""}
      `;
      await sendMessage(chatId, welcomeText);
      break;

    case "/verify":
      const { data: settings } = await supabase
        .from("bot_settings")
        .select("value")
        .eq("key", "sheerid_program_id")
        .maybeSingle();

      const programId = settings?.value?.program_id || "YOUR_PROGRAM_ID";
      const verifyText = `
🎖️ <b>Military Verification</b>

Please complete your verification using SheerID:
https://verify.sheerid.com/${programId}

Once verified, your access will be automatically activated.
      `;
      await sendMessage(chatId, verifyText);
      break;

    case "/status":
      let statusText = "";
      if (owner) {
        statusText = "👑 You are the <b>Owner</b> of this bot.";
      } else if (approved) {
        const expiresAt = user.expires_at
          ? new Date(user.expires_at).toLocaleDateString()
          : "Never";
        statusText = `✅ <b>Status:</b> Approved\n📅 <b>Expires:</b> ${expiresAt}`;
      } else {
        statusText = `❌ <b>Status:</b> ${user.status}\n\nUse /verify to get verified.`;
      }
      await sendMessage(chatId, statusText);
      break;

    case "/inbox":
      if (!approved && !owner) {
        await sendMessage(chatId, "❌ You need to be approved to use this command.");
        return;
      }

      const { data: emailAccounts } = await supabase
        .from("email_accounts")
        .select("*, email_logs(*)")
        .eq("telegram_user_id", user.id)
        .limit(5);

      if (!emailAccounts || emailAccounts.length === 0) {
        await sendMessage(chatId, "📭 No email accounts connected.");
        return;
      }

      let inboxText = "📬 <b>Recent Email Activity</b>\n\n";
      for (const account of emailAccounts) {
        inboxText += `📧 ${account.email}\n`;
        if (account.email_logs && account.email_logs.length > 0) {
          for (const log of account.email_logs.slice(0, 3)) {
            inboxText += `  └ From: ${log.from_email}\n`;
          }
        } else {
          inboxText += "  └ No recent activity\n";
        }
        inboxText += "\n";
      }
      await sendMessage(chatId, inboxText);
      break;

    case "/help":
      const helpText = `
🎖️ <b>Auto Reply AI Bot Help</b>

<b>User Commands:</b>
/start - Welcome message
/verify - Get verification link
/status - Check your status
/inbox - View recent emails
/help - This message

${owner ? `<b>Owner Commands:</b>
/approve [telegram_id] [days] - Approve a user
/revoke [telegram_id] - Revoke user access
/users - List all approved users
/broadcast [message] - Send to all users` : ""}
      `;
      await sendMessage(chatId, helpText);
      break;

    // Owner commands
    case "/approve":
      if (!owner) {
        await sendMessage(chatId, "❌ Only the owner can use this command.");
        return;
      }
      if (args.length < 1) {
        await sendMessage(chatId, "Usage: /approve [telegram_id] [days]");
        return;
      }
      const approveId = parseInt(args[0]);
      const days = parseInt(args[1]) || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      const { error: approveError } = await supabase
        .from("telegram_users")
        .update({
          status: "approved",
          expires_at: expiresAt.toISOString(),
        })
        .eq("telegram_id", approveId);

      if (approveError) {
        await sendMessage(chatId, `❌ Error: ${approveError.message}`);
      } else {
        await sendMessage(chatId, `✅ User ${approveId} approved for ${days} days.`);
        await sendMessage(approveId, `🎉 Your access has been approved for ${days} days!`);
      }
      break;

    case "/revoke":
      if (!owner) {
        await sendMessage(chatId, "❌ Only the owner can use this command.");
        return;
      }
      if (args.length < 1) {
        await sendMessage(chatId, "Usage: /revoke [telegram_id]");
        return;
      }
      const revokeId = parseInt(args[0]);

      const { error: revokeError } = await supabase
        .from("telegram_users")
        .update({ status: "rejected" })
        .eq("telegram_id", revokeId);

      if (revokeError) {
        await sendMessage(chatId, `❌ Error: ${revokeError.message}`);
      } else {
        await sendMessage(chatId, `✅ User ${revokeId} access revoked.`);
        await sendMessage(revokeId, `❌ Your access has been revoked.`);
      }
      break;

    case "/users":
      if (!owner) {
        await sendMessage(chatId, "❌ Only the owner can use this command.");
        return;
      }

      const { data: allUsers } = await supabase
        .from("telegram_users")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!allUsers || allUsers.length === 0) {
        await sendMessage(chatId, "📭 No approved users.");
        return;
      }

      let usersText = "👥 <b>Approved Users</b>\n\n";
      for (const u of allUsers) {
        const name = u.username ? `@${u.username}` : u.first_name || "Unknown";
        const expires = u.expires_at
          ? new Date(u.expires_at).toLocaleDateString()
          : "Never";
        usersText += `• ${name} (${u.telegram_id})\n  Expires: ${expires}\n\n`;
      }
      await sendMessage(chatId, usersText);
      break;

    case "/broadcast":
      if (!owner) {
        await sendMessage(chatId, "❌ Only the owner can use this command.");
        return;
      }
      const broadcastMsg = args.join(" ");
      if (!broadcastMsg) {
        await sendMessage(chatId, "Usage: /broadcast [message]");
        return;
      }

      const { data: approvedUsers } = await supabase
        .from("telegram_users")
        .select("telegram_id")
        .eq("status", "approved");

      if (!approvedUsers || approvedUsers.length === 0) {
        await sendMessage(chatId, "📭 No approved users to broadcast to.");
        return;
      }

      let sentCount = 0;
      for (const u of approvedUsers) {
        try {
          await sendMessage(u.telegram_id, `📢 <b>Broadcast Message</b>\n\n${broadcastMsg}`);
          sentCount++;
        } catch (e) {
          console.error(`Failed to send to ${u.telegram_id}:`, e);
        }
      }

      // Log broadcast
      await supabase.from("broadcast_messages").insert({
        message: broadcastMsg,
        recipients_count: sentCount,
      });

      await sendMessage(chatId, `✅ Broadcast sent to ${sentCount} users.`);
      break;

    default:
      // Unknown command
      if (text.startsWith("/")) {
        await sendMessage(chatId, "❓ Unknown command. Use /help for available commands.");
      }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!BOT_TOKEN) {
      console.error("BOT_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Bot not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update = await req.json();
    console.log("Received update:", JSON.stringify(update));

    if (update.message) {
      await handleCommand(update.message);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
