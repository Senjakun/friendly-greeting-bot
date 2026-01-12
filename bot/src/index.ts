import "dotenv/config";
import { Bot, Context, session } from "grammy";
import express from "express";
import { createClient } from "@supabase/supabase-js";

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN!;
const OWNER_ID = parseInt(process.env.OWNER_ID!);
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PORT = parseInt(process.env.PORT || "3000");

// Validate env
if (!BOT_TOKEN || !OWNER_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables!");
  console.error("Required: BOT_TOKEN, OWNER_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize Bot
const bot = new Bot(BOT_TOKEN);

// Helper functions
async function getOrCreateUser(telegramUser: any) {
  const { data: existingUser } = await supabase
    .from("telegram_users")
    .select("*")
    .eq("telegram_id", telegramUser.id)
    .single();

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error } = await supabase
    .from("telegram_users")
    .insert({
      telegram_id: telegramUser.id,
      username: telegramUser.username || null,
      first_name: telegramUser.first_name || null,
      last_name: telegramUser.last_name || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    return null;
  }

  return newUser;
}

async function isUserApproved(telegramId: number): Promise<boolean> {
  const { data: user } = await supabase
    .from("telegram_users")
    .select("status, expires_at")
    .eq("telegram_id", telegramId)
    .single();

  if (!user || user.status !== "approved") return false;
  if (user.expires_at && new Date(user.expires_at) < new Date()) return false;

  return true;
}

function isOwner(telegramId: number): boolean {
  return telegramId === OWNER_ID;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

// Commands
bot.command("start", async (ctx) => {
  const user = await getOrCreateUser(ctx.from);

  if (!user) {
    return ctx.reply("❌ Terjadi kesalahan. Coba lagi nanti.");
  }

  const statusEmoji = {
    pending: "⏳",
    approved: "✅",
    rejected: "❌",
    expired: "⌛",
  };

  await ctx.reply(
    `🎖️ *Selamat datang di Auto Reply Bot\\!*\n\n` +
      `Status: ${statusEmoji[user.status as keyof typeof statusEmoji]} ${user.status}\n\n` +
      `Gunakan /verify untuk verifikasi akun\\.\n` +
      `Gunakan /help untuk melihat perintah yang tersedia\\.`,
    { parse_mode: "MarkdownV2" }
  );
});

bot.command("verify", async (ctx) => {
  const user = await getOrCreateUser(ctx.from);

  if (!user) {
    return ctx.reply("❌ Terjadi kesalahan. Coba lagi nanti.");
  }

  if (user.status === "approved") {
    return ctx.reply("✅ Akun kamu sudah terverifikasi!");
  }

  // Update to pending if rejected/expired
  if (user.status === "rejected" || user.status === "expired") {
    await supabase
      .from("telegram_users")
      .update({ status: "pending" })
      .eq("telegram_id", ctx.from!.id);
  }

  // Notify owner
  try {
    await bot.api.sendMessage(
      OWNER_ID,
      `🔔 *Permintaan Verifikasi Baru*\n\n` +
        `ID: \`${ctx.from!.id}\`\n` +
        `Username: @${ctx.from!.username || "none"}\n` +
        `Nama: ${escapeMarkdown(ctx.from!.first_name || "")} ${escapeMarkdown(ctx.from!.last_name || "")}\n\n` +
        `Gunakan /approve ${ctx.from!.id} untuk menyetujui`,
      { parse_mode: "MarkdownV2" }
    );
  } catch (e) {
    console.error("Failed to notify owner:", e);
  }

  await ctx.reply(
    "📨 Permintaan verifikasi telah dikirim ke admin.\nMohon tunggu persetujuan."
  );
});

bot.command("status", async (ctx) => {
  const user = await getOrCreateUser(ctx.from);

  if (!user) {
    return ctx.reply("❌ Terjadi kesalahan. Coba lagi nanti.");
  }

  const statusEmoji = {
    pending: "⏳ Menunggu persetujuan",
    approved: "✅ Disetujui",
    rejected: "❌ Ditolak",
    expired: "⌛ Kadaluarsa",
  };

  let message = `📊 *Status Akun*\n\n${statusEmoji[user.status as keyof typeof statusEmoji]}`;

  if (user.expires_at) {
    const expiryDate = new Date(user.expires_at).toLocaleDateString("id-ID");
    message += `\n📅 Berlaku sampai: ${expiryDate}`;
  }

  await ctx.reply(message, { parse_mode: "MarkdownV2" });
});

bot.command("inbox", async (ctx) => {
  if (!(await isUserApproved(ctx.from!.id))) {
    return ctx.reply("❌ Kamu belum disetujui. Gunakan /verify untuk verifikasi.");
  }

  // Get user's email account
  const { data: user } = await supabase
    .from("telegram_users")
    .select("id")
    .eq("telegram_id", ctx.from!.id)
    .single();

  if (!user) {
    return ctx.reply("❌ User tidak ditemukan.");
  }

  const { data: emailAccount } = await supabase
    .from("email_accounts")
    .select("id, email")
    .eq("telegram_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!emailAccount) {
    return ctx.reply("📭 Kamu belum memiliki email yang terhubung.");
  }

  // Get recent emails
  const { data: emails } = await supabase
    .from("email_logs")
    .select("*")
    .eq("email_account_id", emailAccount.id)
    .order("replied_at", { ascending: false })
    .limit(5);

  if (!emails || emails.length === 0) {
    return ctx.reply("📭 Tidak ada email terbaru.");
  }

  let message = `📬 *Email Terakhir*\n\n`;
  emails.forEach((email, i) => {
    const date = new Date(email.replied_at).toLocaleString("id-ID");
    message += `${i + 1}\\. *${escapeMarkdown(email.subject || "No Subject")}*\n`;
    message += `   From: ${escapeMarkdown(email.from_email)}\n`;
    message += `   ${date}\n\n`;
  });

  await ctx.reply(message, { parse_mode: "MarkdownV2" });
});

bot.command("setemail", async (ctx) => {
  if (!(await isUserApproved(ctx.from!.id))) {
    return ctx.reply("❌ Kamu belum disetujui. Gunakan /verify untuk verifikasi.");
  }

  const args = ctx.message!.text!.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "📧 *Set Email untuk Auto Reply*\n\n" +
      "Usage: `/setemail email@domain\\.com`\n\n" +
      "Contoh: `/setemail support@mysite\\.com`",
      { parse_mode: "MarkdownV2" }
    );
  }

  const email = args[1].toLowerCase().trim();
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return ctx.reply("❌ Format email tidak valid.");
  }

  // Get user
  const { data: user } = await supabase
    .from("telegram_users")
    .select("id")
    .eq("telegram_id", ctx.from!.id)
    .single();

  if (!user) {
    return ctx.reply("❌ User tidak ditemukan.");
  }

  // Check if email already exists
  const { data: existingEmail } = await supabase
    .from("email_accounts")
    .select("id")
    .eq("email", email)
    .single();

  if (existingEmail) {
    return ctx.reply("❌ Email ini sudah digunakan.");
  }

  // Deactivate old email accounts for this user
  await supabase
    .from("email_accounts")
    .update({ is_active: false })
    .eq("telegram_user_id", user.id);

  // Create new email account
  const { error } = await supabase
    .from("email_accounts")
    .insert({
      telegram_user_id: user.id,
      email: email,
      is_active: true,
      auto_reply_enabled: true,
      auto_reply_message: "Terima kasih atas email Anda. Saya akan membalas secepatnya.",
    });

  if (error) {
    console.error("Error creating email account:", error);
    return ctx.reply(`❌ Gagal menyimpan email: ${error.message}`);
  }

  await ctx.reply(
    `✅ *Email berhasil didaftarkan\\!*\n\n` +
    `📧 Email: \`${escapeMarkdown(email)}\`\n` +
    `🔄 Auto\\-reply: Aktif\n\n` +
    `Sekarang setup Email Routing di Cloudflare untuk forward email ke bot\\.`,
    { parse_mode: "MarkdownV2" }
  );
});

bot.command("setreply", async (ctx) => {
  if (!(await isUserApproved(ctx.from!.id))) {
    return ctx.reply("❌ Kamu belum disetujui. Gunakan /verify untuk verifikasi.");
  }

  const message = ctx.message!.text!.replace("/setreply ", "").trim();
  if (!message || message === "/setreply") {
    return ctx.reply(
      "📝 *Set Pesan Auto Reply*\n\n" +
      "Usage: `/setreply Pesan auto reply kamu`\n\n" +
      "Contoh: `/setreply Terima kasih, saya sedang sibuk dan akan membalas nanti\\.`",
      { parse_mode: "MarkdownV2" }
    );
  }

  // Get user
  const { data: user } = await supabase
    .from("telegram_users")
    .select("id")
    .eq("telegram_id", ctx.from!.id)
    .single();

  if (!user) {
    return ctx.reply("❌ User tidak ditemukan.");
  }

  // Update auto reply message
  const { error } = await supabase
    .from("email_accounts")
    .update({ auto_reply_message: message })
    .eq("telegram_user_id", user.id)
    .eq("is_active", true);

  if (error) {
    return ctx.reply(`❌ Gagal update: ${error.message}`);
  }

  await ctx.reply(
    `✅ *Pesan auto\\-reply berhasil diupdate\\!*\n\n` +
    `📝 Pesan baru:\n"${escapeMarkdown(message)}"`,
    { parse_mode: "MarkdownV2" }
  );
});

bot.command("myemail", async (ctx) => {
  if (!(await isUserApproved(ctx.from!.id))) {
    return ctx.reply("❌ Kamu belum disetujui. Gunakan /verify untuk verifikasi.");
  }

  // Get user
  const { data: user } = await supabase
    .from("telegram_users")
    .select("id")
    .eq("telegram_id", ctx.from!.id)
    .single();

  if (!user) {
    return ctx.reply("❌ User tidak ditemukan.");
  }

  // Get email account
  const { data: emailAccount } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("telegram_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!emailAccount) {
    return ctx.reply("📭 Kamu belum memiliki email yang terdaftar.\n\nGunakan /setemail untuk mendaftarkan email.");
  }

  const autoReplyStatus = emailAccount.auto_reply_enabled ? "✅ Aktif" : "❌ Nonaktif";

  await ctx.reply(
    `📧 *Email Kamu*\n\n` +
    `Email: \`${escapeMarkdown(emailAccount.email)}\`\n` +
    `Auto\\-reply: ${autoReplyStatus}\n` +
    `Pesan: "${escapeMarkdown(emailAccount.auto_reply_message || "")}"`,
    { parse_mode: "MarkdownV2" }
  );
});

bot.command("help", async (ctx) => {
  const isOwnerUser = isOwner(ctx.from!.id);

  let message =
    `📚 *Perintah yang Tersedia*\n\n` +
    `/start \\- Mulai bot\n` +
    `/verify \\- Verifikasi akun\n` +
    `/status \\- Cek status akun\n` +
    `/setemail \\- Daftarkan email\n` +
    `/setreply \\- Set pesan auto\\-reply\n` +
    `/myemail \\- Lihat email terdaftar\n` +
    `/inbox \\- Lihat email terakhir\n` +
    `/help \\- Tampilkan bantuan ini`;

  if (isOwnerUser) {
    message +=
      `\n\n👑 *Owner Commands*\n` +
      `/approve \\[id\\] \\- Approve user\n` +
      `/revoke \\[id\\] \\- Revoke user\n` +
      `/users \\- Lihat semua users\n` +
      `/broadcast \\[msg\\] \\- Broadcast pesan`;
  }

  await ctx.reply(message, { parse_mode: "MarkdownV2" });
});

// Owner commands
bot.command("approve", async (ctx) => {
  if (!isOwner(ctx.from!.id)) {
    return ctx.reply("❌ Perintah ini hanya untuk owner.");
  }

  const args = ctx.message!.text!.split(" ");
  if (args.length < 2) {
    return ctx.reply("Usage: /approve <telegram_id>");
  }

  const targetId = parseInt(args[1]);
  if (isNaN(targetId)) {
    return ctx.reply("❌ ID tidak valid.");
  }

  const { error } = await supabase
    .from("telegram_users")
    .update({
      status: "approved",
      verified_at: new Date().toISOString(),
    })
    .eq("telegram_id", targetId);

  if (error) {
    return ctx.reply(`❌ Gagal approve: ${error.message}`);
  }

  // Notify user
  try {
    await bot.api.sendMessage(targetId, "🎉 Akun kamu telah disetujui! Kamu sekarang bisa menggunakan fitur bot.");
  } catch (e) {
    console.error("Failed to notify user:", e);
  }

  await ctx.reply(`✅ User ${targetId} telah di-approve.`);
});

bot.command("revoke", async (ctx) => {
  if (!isOwner(ctx.from!.id)) {
    return ctx.reply("❌ Perintah ini hanya untuk owner.");
  }

  const args = ctx.message!.text!.split(" ");
  if (args.length < 2) {
    return ctx.reply("Usage: /revoke <telegram_id>");
  }

  const targetId = parseInt(args[1]);
  if (isNaN(targetId)) {
    return ctx.reply("❌ ID tidak valid.");
  }

  const { error } = await supabase
    .from("telegram_users")
    .update({ status: "rejected" })
    .eq("telegram_id", targetId);

  if (error) {
    return ctx.reply(`❌ Gagal revoke: ${error.message}`);
  }

  // Notify user
  try {
    await bot.api.sendMessage(targetId, "⚠️ Akses akun kamu telah dicabut.");
  } catch (e) {
    console.error("Failed to notify user:", e);
  }

  await ctx.reply(`✅ User ${targetId} telah di-revoke.`);
});

bot.command("users", async (ctx) => {
  if (!isOwner(ctx.from!.id)) {
    return ctx.reply("❌ Perintah ini hanya untuk owner.");
  }

  const { data: users, error } = await supabase
    .from("telegram_users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !users) {
    return ctx.reply("❌ Gagal mengambil data users.");
  }

  if (users.length === 0) {
    return ctx.reply("📭 Tidak ada users.");
  }

  const statusEmoji = {
    pending: "⏳",
    approved: "✅",
    rejected: "❌",
    expired: "⌛",
  };

  let message = `👥 *Users \\(${users.length}\\)*\n\n`;
  users.forEach((user, i) => {
    message += `${i + 1}\\. ${statusEmoji[user.status as keyof typeof statusEmoji]} `;
    message += `\`${user.telegram_id}\`\n`;
    message += `   @${user.username || "none"} \\- ${escapeMarkdown(user.first_name || "")}\n`;
  });

  await ctx.reply(message, { parse_mode: "MarkdownV2" });
});

bot.command("broadcast", async (ctx) => {
  if (!isOwner(ctx.from!.id)) {
    return ctx.reply("❌ Perintah ini hanya untuk owner.");
  }

  const message = ctx.message!.text!.replace("/broadcast ", "").trim();
  if (!message) {
    return ctx.reply("Usage: /broadcast <message>");
  }

  const { data: users } = await supabase
    .from("telegram_users")
    .select("telegram_id")
    .eq("status", "approved");

  if (!users || users.length === 0) {
    return ctx.reply("📭 Tidak ada approved users.");
  }

  let sent = 0;
  for (const user of users) {
    try {
      await bot.api.sendMessage(user.telegram_id, `📢 *Broadcast*\n\n${message}`, {
        parse_mode: "MarkdownV2",
      });
      sent++;
    } catch (e) {
      console.error(`Failed to send to ${user.telegram_id}:`, e);
    }
  }

  // Log broadcast
  await supabase.from("broadcast_messages").insert({
    message,
    recipients_count: sent,
  });

  await ctx.reply(`✅ Broadcast terkirim ke ${sent}/${users.length} users.`);
});

// Express server for email webhook
const app = express();
app.use(express.json());

interface EmailPayload {
  from: string;
  to: string;
  subject?: string;
  text?: string;
  html?: string;
}

app.post("/email-webhook", async (req, res) => {
  try {
    const payload: EmailPayload = req.body;
    console.log("Received email:", payload);

    const recipientEmail = payload.to?.toLowerCase();

    // Find email account
    const { data: emailAccount } = await supabase
      .from("email_accounts")
      .select(`
        *,
        telegram_users!inner(telegram_id, status, expires_at)
      `)
      .eq("email", recipientEmail)
      .eq("is_active", true)
      .eq("auto_reply_enabled", true)
      .single();

    if (!emailAccount) {
      console.log("No active email account found for:", recipientEmail);
      return res.json({ success: false, message: "No active account" });
    }

    const telegramUser = emailAccount.telegram_users;

    // Check if user is approved
    if (telegramUser.status !== "approved") {
      return res.json({ success: false, message: "User not approved" });
    }

    if (telegramUser.expires_at && new Date(telegramUser.expires_at) < new Date()) {
      return res.json({ success: false, message: "User expired" });
    }

    // Log email
    await supabase.from("email_logs").insert({
      email_account_id: emailAccount.id,
      from_email: payload.from,
      subject: payload.subject || "No Subject",
    });

    // Send Telegram notification
    const notifMessage =
      `📬 *Email Baru*\n\n` +
      `*Dari:* ${escapeMarkdown(payload.from)}\n` +
      `*Ke:* ${escapeMarkdown(recipientEmail)}\n` +
      `*Subject:* ${escapeMarkdown(payload.subject || "No Subject")}\n\n` +
      `_Auto\\-reply telah dikirim_`;

    try {
      await bot.api.sendMessage(telegramUser.telegram_id, notifMessage, {
        parse_mode: "MarkdownV2",
      });
    } catch (e) {
      console.error("Failed to send Telegram notification:", e);
    }

    // Return auto-reply for Cloudflare Worker
    res.json({
      success: true,
      autoReply: {
        enabled: true,
        message: emailAccount.auto_reply_message || "Thank you for your email. I will get back to you soon.",
        from: recipientEmail,
        to: payload.from,
        subject: `Re: ${payload.subject || "Your Email"}`,
      },
    });
  } catch (error) {
    console.error("Email webhook error:", error);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start bot and server
async function main() {
  console.log("🚀 Starting Auto Reply Bot...");

  // Start Express server
  app.listen(PORT, () => {
    console.log(`📡 Email webhook server running on port ${PORT}`);
  });

  // Start Telegram bot
  bot.start({
    onStart: (botInfo) => {
      console.log(`🤖 Bot @${botInfo.username} is running!`);
    },
  });
}

main().catch(console.error);
