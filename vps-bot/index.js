import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

// ===== CONFIG =====
const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  MS_CLIENT_ID,
  MS_CLIENT_SECRET,
  MS_TENANT_ID,
  MS_USER_EMAIL,
  POLL_INTERVAL = 30
} = process.env;

// ===== TELEGRAM BOT =====
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// ===== MICROSOFT AUTH =====
let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const tokenUrl = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Auth error: ${data.error_description}`);
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early
  
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
  // Common OTP patterns
  const patterns = [
    /\b(\d{6})\b/,                          // 6 digits
    /\b(\d{4})\b/,                          // 4 digits
    /code[:\s]+(\d{4,8})/i,                 // "code: 123456"
    /otp[:\s]+(\d{4,8})/i,                  // "otp: 123456"
    /passcode[:\s]+(\d{4,8})/i,             // "passcode: 123456"
    /verification[:\s]+(\d{4,8})/i,         // "verification: 123456"
    /one-time\s+(?:password|passcode|code)[:\s]+(\d{4,8})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
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

  message += `*Isi Email Lengkap:*\n`;
  message += email.bodyPreview || '(No content)';

  return message;
}

// ===== SEND TO TELEGRAM =====
async function sendToTelegram(message) {
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true 
    });
    console.log('✅ Message sent to Telegram');
  } catch (error) {
    console.error('❌ Telegram error:', error.message);
  }
}

// ===== CHECK EMAILS =====
let lastCheckedTime = new Date().toISOString();
const processedEmails = new Set();

async function checkNewEmails() {
  try {
    const client = getGraphClient();
    
    // Get unread emails from inbox
    const response = await client
      .api(`/users/${MS_USER_EMAIL}/mailFolders/inbox/messages`)
      .filter(`isRead eq false and receivedDateTime ge ${lastCheckedTime}`)
      .orderby('receivedDateTime desc')
      .top(10)
      .select('id,subject,bodyPreview,body,from,receivedDateTime')
      .get();

    const emails = response.value || [];
    
    for (const email of emails) {
      if (processedEmails.has(email.id)) continue;
      
      console.log(`📧 New email: ${email.subject}`);
      
      const message = formatTelegramMessage(email);
      await sendToTelegram(message);
      
      processedEmails.add(email.id);
      
      // Keep set from growing too large
      if (processedEmails.size > 1000) {
        const arr = [...processedEmails];
        arr.splice(0, 500);
        processedEmails.clear();
        arr.forEach(id => processedEmails.add(id));
      }
    }

    lastCheckedTime = new Date().toISOString();
    
  } catch (error) {
    console.error('❌ Error checking emails:', error.message);
  }
}

// ===== TELEGRAM COMMANDS =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    `🤖 *OTP Bot Aktif!*\n\n` +
    `Chat ID kamu: \`${msg.chat.id}\`\n\n` +
    `Bot akan mengirim notifikasi email baru ke sini.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `✅ *Bot Status*\n\n` +
    `🔄 Polling: Setiap ${POLL_INTERVAL} detik\n` +
    `📧 Email: ${MS_USER_EMAIL}\n` +
    `📬 Processed: ${processedEmails.size} emails`,
    { parse_mode: 'Markdown' }
  );
});

// ===== MAIN =====
console.log('🚀 OTP Telegram Bot starting...');
console.log(`📧 Monitoring: ${MS_USER_EMAIL}`);
console.log(`⏱️  Poll interval: ${POLL_INTERVAL} seconds`);

// Initial check
checkNewEmails();

// Start polling
setInterval(checkNewEmails, POLL_INTERVAL * 1000);

console.log('✅ Bot is running!');
