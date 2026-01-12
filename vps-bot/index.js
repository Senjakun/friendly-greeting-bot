import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== CONFIG =====
const { TELEGRAM_BOT_TOKEN, OWNER_ID } = process.env;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required in .env');
  process.exit(1);
}

if (!OWNER_ID) {
  console.error('❌ OWNER_ID is required in .env');
  process.exit(1);
}

// ===== DATA STORAGE =====
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return {
    settings: {
      ms_client_id: '',
      ms_client_secret: '',
      ms_tenant_id: '',
      ms_user_email: '',
      poll_interval: 30
    },
    approved_users: [OWNER_ID], // Owner is always approved
    processed_emails: []
  };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();

// ===== TELEGRAM BOT =====
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// ===== HELPER FUNCTIONS =====
function isOwner(userId) {
  return String(userId) === String(OWNER_ID);
}

function isApproved(userId) {
  return data.approved_users.includes(String(userId));
}

function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// ===== MICROSOFT AUTH =====
let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const { ms_client_id, ms_client_secret, ms_tenant_id } = data.settings;
  
  if (!ms_client_id || !ms_client_secret || !ms_tenant_id) {
    throw new Error('Microsoft credentials not configured. Use /setup to configure.');
  }

  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${ms_tenant_id}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: ms_client_id,
    client_secret: ms_client_secret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Auth error: ${result.error_description}`);
  }

  accessToken = result.access_token;
  tokenExpiry = Date.now() + (result.expires_in * 1000) - 60000;
  
  return accessToken;
}

// ===== GRAPH CLIENT =====
function getGraphClient() {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await getAccessToken();
        done(null, token);
      } catch (error) {
        done(error, null);
      }
    }
  });
}

// ===== OTP EXTRACTION =====
function extractOTP(text) {
  const patterns = [
    /\b(\d{6})\b/,
    /\b(\d{4})\b/,
    /code[:\s]+(\d{4,8})/i,
    /otp[:\s]+(\d{4,8})/i,
    /passcode[:\s]+(\d{4,8})/i,
    /verification[:\s]+(\d{4,8})/i,
    /one-time\s+(?:password|passcode|code)[:\s]+(\d{4,8})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ===== FORMAT MESSAGE =====
function formatTelegramMessage(email) {
  const otp = extractOTP(email.body?.content || email.bodyPreview || '');
  const date = new Date(email.receivedDateTime).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta'
  });

  let message = `📧 *Email Baru*\n\n`;
  message += `*Dari:* ${email.from?.emailAddress?.name || ''} <${email.from?.emailAddress?.address}>\n`;
  message += `*Subjek:* ${email.subject}\n`;
  message += `*Tanggal:* ${date}\n\n`;

  if (otp) {
    message += `🔑 *OTP CODE: ${otp}*\n\n`;
  }

  message += `*Isi Email:*\n`;
  message += email.bodyPreview || '(No content)';

  return message;
}

// ===== SEND TO APPROVED USERS =====
async function sendToApprovedUsers(message) {
  for (const userId of data.approved_users) {
    try {
      await bot.sendMessage(userId, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true 
      });
    } catch (error) {
      console.error(`Failed to send to ${userId}:`, error.message);
    }
  }
}

// ===== CHECK EMAILS =====
let lastCheckedTime = new Date().toISOString();
let pollingInterval = null;

async function checkNewEmails() {
  const { ms_user_email } = data.settings;
  
  if (!ms_user_email) {
    return;
  }

  try {
    const client = getGraphClient();
    
    const response = await client
      .api(`/users/${ms_user_email}/mailFolders/inbox/messages`)
      .filter(`isRead eq false and receivedDateTime ge ${lastCheckedTime}`)
      .orderby('receivedDateTime desc')
      .top(10)
      .select('id,subject,bodyPreview,body,from,receivedDateTime')
      .get();

    const emails = response.value || [];
    
    for (const email of emails) {
      if (data.processed_emails.includes(email.id)) continue;
      
      console.log(`📧 New email: ${email.subject}`);
      
      const message = formatTelegramMessage(email);
      await sendToApprovedUsers(message);
      
      data.processed_emails.push(email.id);
      
      // Keep array from growing too large
      if (data.processed_emails.length > 500) {
        data.processed_emails = data.processed_emails.slice(-250);
      }
      saveData(data);
    }

    lastCheckedTime = new Date().toISOString();
    
  } catch (error) {
    console.error('❌ Error checking emails:', error.message);
  }
}

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  
  const interval = (data.settings.poll_interval || 30) * 1000;
  pollingInterval = setInterval(checkNewEmails, interval);
  checkNewEmails(); // Initial check
  
  console.log(`🔄 Polling started (every ${data.settings.poll_interval}s)`);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('⏹️ Polling stopped');
  }
}

// ===== TELEGRAM COMMANDS =====

// /start
bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  const name = msg.from.first_name || 'User';
  
  if (isOwner(userId)) {
    bot.sendMessage(msg.chat.id, 
      `👋 Halo Owner *${name}*!\n\n` +
      `🤖 *OTP Bot Ready*\n\n` +
      `*Owner Commands:*\n` +
      `/setup - Setup Microsoft credentials\n` +
      `/setoutlook <email> - Set email to monitor\n` +
      `/adduser <id> - Approve user\n` +
      `/removeuser <id> - Remove user\n` +
      `/users - List approved users\n` +
      `/settings - View current settings\n` +
      `/startbot - Start email polling\n` +
      `/stopbot - Stop email polling\n\n` +
      `*General Commands:*\n` +
      `/status - Bot status\n` +
      `/myid - Get your Telegram ID`,
      { parse_mode: 'Markdown' }
    );
  } else if (isApproved(userId)) {
    bot.sendMessage(msg.chat.id,
      `👋 Halo *${name}*!\n\n` +
      `✅ Kamu sudah disetujui untuk menerima notifikasi OTP.\n\n` +
      `/status - Cek status bot\n` +
      `/myid - Lihat ID Telegram kamu`,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(msg.chat.id,
      `👋 Halo *${name}*!\n\n` +
      `⚠️ Kamu belum disetujui untuk menggunakan bot ini.\n\n` +
      `ID kamu: \`${userId}\`\n\n` +
      `Minta owner untuk approve ID kamu.`,
      { parse_mode: 'Markdown' }
    );
  }
});

// /myid
bot.onText(/\/myid/, (msg) => {
  bot.sendMessage(msg.chat.id, `🆔 ID Telegram kamu: \`${msg.from.id}\``, { parse_mode: 'Markdown' });
});

// /status
bot.onText(/\/status/, (msg) => {
  if (!isApproved(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, '⛔ Kamu tidak memiliki akses.');
  }

  const { ms_user_email, poll_interval } = data.settings;
  const isRunning = pollingInterval !== null;
  
  bot.sendMessage(msg.chat.id,
    `📊 *Bot Status*\n\n` +
    `🔄 Polling: ${isRunning ? '✅ Running' : '❌ Stopped'}\n` +
    `📧 Email: ${ms_user_email || '(not set)'}\n` +
    `⏱️ Interval: ${poll_interval}s\n` +
    `👥 Approved Users: ${data.approved_users.length}`,
    { parse_mode: 'Markdown' }
  );
});

// ===== OWNER ONLY COMMANDS =====

// /setup - Interactive setup
bot.onText(/\/setup/, async (msg) => {
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
  }

  bot.sendMessage(msg.chat.id,
    `⚙️ *Setup Microsoft Graph API*\n\n` +
    `Gunakan commands berikut:\n\n` +
    `/setclientid <client_id>\n` +
    `/setsecret <client_secret>\n` +
    `/settenant <tenant_id>\n` +
    `/setoutlook <email>\n` +
    `/setinterval <seconds>\n\n` +
    `Contoh:\n` +
    `\`/setclientid abc123-def456\`\n` +
    `\`/setoutlook myemail@outlook.com\``,
    { parse_mode: 'Markdown' }
  );
});

// /setclientid
bot.onText(/\/setclientid (.+)/, (msg, match) => {
  if (!isOwner(msg.from.id)) return;
  
  data.settings.ms_client_id = match[1].trim();
  saveData(data);
  accessToken = null; // Reset token
  
  bot.sendMessage(msg.chat.id, '✅ Client ID saved!');
});

// /setsecret
bot.onText(/\/setsecret (.+)/, (msg, match) => {
  if (!isOwner(msg.from.id)) return;
  
  data.settings.ms_client_secret = match[1].trim();
  saveData(data);
  accessToken = null;
  
  // Delete the message containing secret for security
  bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
  bot.sendMessage(msg.chat.id, '✅ Client Secret saved! (message deleted for security)');
});

// /settenant
bot.onText(/\/settenant (.+)/, (msg, match) => {
  if (!isOwner(msg.from.id)) return;
  
  data.settings.ms_tenant_id = match[1].trim();
  saveData(data);
  accessToken = null;
  
  bot.sendMessage(msg.chat.id, '✅ Tenant ID saved!');
});

// /setoutlook
bot.onText(/\/setoutlook (.+)/, (msg, match) => {
  if (!isOwner(msg.from.id)) return;
  
  data.settings.ms_user_email = match[1].trim();
  saveData(data);
  
  bot.sendMessage(msg.chat.id, `✅ Outlook email set to: ${data.settings.ms_user_email}`);
});

// /setinterval
bot.onText(/\/setinterval (\d+)/, (msg, match) => {
  if (!isOwner(msg.from.id)) return;
  
  const interval = parseInt(match[1]);
  if (interval < 10) {
    return bot.sendMessage(msg.chat.id, '⚠️ Minimum interval is 10 seconds');
  }
  
  data.settings.poll_interval = interval;
  saveData(data);
  
  if (pollingInterval) {
    startPolling(); // Restart with new interval
  }
  
  bot.sendMessage(msg.chat.id, `✅ Poll interval set to: ${interval} seconds`);
});

// /settings
bot.onText(/\/settings/, (msg) => {
  if (!isOwner(msg.from.id)) return;
  
  const s = data.settings;
  bot.sendMessage(msg.chat.id,
    `⚙️ *Current Settings*\n\n` +
    `📧 Email: \`${s.ms_user_email || '(not set)'}\`\n` +
    `🔑 Client ID: \`${s.ms_client_id ? s.ms_client_id.substring(0, 8) + '...' : '(not set)'}\`\n` +
    `🔐 Secret: \`${s.ms_client_secret ? '********' : '(not set)'}\`\n` +
    `🏢 Tenant: \`${s.ms_tenant_id ? s.ms_tenant_id.substring(0, 8) + '...' : '(not set)'}\`\n` +
    `⏱️ Interval: ${s.poll_interval}s`,
    { parse_mode: 'Markdown' }
  );
});

// /adduser
bot.onText(/\/adduser (.+)/, (msg, match) => {
  if (!isOwner(msg.from.id)) return;
  
  const userId = match[1].trim();
  
  if (data.approved_users.includes(userId)) {
    return bot.sendMessage(msg.chat.id, '⚠️ User sudah approved.');
  }
  
  data.approved_users.push(userId);
  saveData(data);
  
  bot.sendMessage(msg.chat.id, `✅ User \`${userId}\` approved!`, { parse_mode: 'Markdown' });
  
  // Notify the user
  bot.sendMessage(userId, '🎉 Kamu telah disetujui untuk menerima notifikasi OTP!').catch(() => {});
});

// /removeuser
bot.onText(/\/removeuser (.+)/, (msg, match) => {
  if (!isOwner(msg.from.id)) return;
  
  const userId = match[1].trim();
  
  if (userId === String(OWNER_ID)) {
    return bot.sendMessage(msg.chat.id, '⚠️ Tidak bisa remove owner.');
  }
  
  const index = data.approved_users.indexOf(userId);
  if (index === -1) {
    return bot.sendMessage(msg.chat.id, '⚠️ User tidak ditemukan.');
  }
  
  data.approved_users.splice(index, 1);
  saveData(data);
  
  bot.sendMessage(msg.chat.id, `✅ User \`${userId}\` removed.`, { parse_mode: 'Markdown' });
});

// /users
bot.onText(/\/users/, (msg) => {
  if (!isOwner(msg.from.id)) return;
  
  const userList = data.approved_users.map((id, i) => 
    `${i + 1}. \`${id}\`${id === String(OWNER_ID) ? ' (owner)' : ''}`
  ).join('\n');
  
  bot.sendMessage(msg.chat.id,
    `👥 *Approved Users (${data.approved_users.length})*\n\n${userList}`,
    { parse_mode: 'Markdown' }
  );
});

// /startbot
bot.onText(/\/startbot/, async (msg) => {
  if (!isOwner(msg.from.id)) return;
  
  const { ms_client_id, ms_client_secret, ms_tenant_id, ms_user_email } = data.settings;
  
  if (!ms_client_id || !ms_client_secret || !ms_tenant_id || !ms_user_email) {
    return bot.sendMessage(msg.chat.id, 
      '⚠️ Setup belum lengkap!\n\nGunakan /setup untuk konfigurasi.'
    );
  }
  
  // Test connection first
  try {
    await getAccessToken();
    startPolling();
    bot.sendMessage(msg.chat.id, '✅ Bot started! Monitoring emails...');
  } catch (error) {
    bot.sendMessage(msg.chat.id, `❌ Failed to start: ${error.message}`);
  }
});

// /stopbot
bot.onText(/\/stopbot/, (msg) => {
  if (!isOwner(msg.from.id)) return;
  
  stopPolling();
  bot.sendMessage(msg.chat.id, '⏹️ Bot stopped.');
});

// /testmail - Test sending a sample notification
bot.onText(/\/testmail/, async (msg) => {
  if (!isOwner(msg.from.id)) return;
  
  const testMessage = `📧 *Email Baru (TEST)*\n\n` +
    `*Dari:* Test Sender <test@example.com>\n` +
    `*Subjek:* Your verification code\n` +
    `*Tanggal:* ${new Date().toLocaleString('id-ID')}\n\n` +
    `🔑 *OTP CODE: 123456*\n\n` +
    `*Isi Email:*\n` +
    `Your verification code is 123456. Valid for 10 minutes.`;
  
  await sendToApprovedUsers(testMessage);
  bot.sendMessage(msg.chat.id, '✅ Test message sent to all approved users!');
});

// ===== MAIN =====
console.log('🚀 OTP Telegram Bot starting...');
console.log(`👤 Owner ID: ${OWNER_ID}`);
console.log(`👥 Approved users: ${data.approved_users.length}`);

// Auto-start if already configured
const { ms_client_id, ms_client_secret, ms_tenant_id, ms_user_email } = data.settings;
if (ms_client_id && ms_client_secret && ms_tenant_id && ms_user_email) {
  console.log('📧 Config found, starting polling...');
  startPolling();
} else {
  console.log('⚠️ Config incomplete. Use /setup in Telegram to configure.');
}

console.log('✅ Bot is running!');
