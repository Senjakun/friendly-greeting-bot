import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== DATA STORAGE =====
const DATA_FILE = path.join(__dirname, 'data.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return null;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function loadData(ownerId) {
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
    approved_users: ownerId ? [ownerId] : [],
    processed_emails: []
  };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ===== CLI SETUP WIZARD =====
function runSetupWizard() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              🤖 OTP TELEGRAM BOT - SETUP                   ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Selamat datang! Mari konfigurasikan bot kamu.             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📋 Cara mendapatkan token dan ID:');
  console.log('   1. Chat @BotFather di Telegram → /newbot → catat token');
  console.log('   2. Chat @userinfobot → catat ID Telegram kamu');
  console.log('');

  rl.question('🔑 Masukkan Bot Token: ', (bot_token) => {
    if (!bot_token.trim()) {
      console.log('❌ Bot token tidak boleh kosong!');
      rl.close();
      process.exit(1);
    }

    rl.question('👤 Masukkan Owner ID: ', (owner_id) => {
      if (!owner_id.trim()) {
        console.log('❌ Owner ID tidak boleh kosong!');
        rl.close();
        process.exit(1);
      }

      // Save config
      saveConfig({ 
        bot_token: bot_token.trim(), 
        owner_id: owner_id.trim() 
      });

      // Initialize data with owner
      const data = loadData(owner_id.trim());
      if (!data.approved_users.includes(owner_id.trim())) {
        data.approved_users.push(owner_id.trim());
      }
      saveData(data);

      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                 ✅ SETUP COMPLETE!                         ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log('║  Bot akan restart otomatis...                              ║');
      console.log('║                                                            ║');
      console.log('║  Setelah restart, buka Telegram dan chat bot kamu.         ║');
      console.log('║  Gunakan /setclient untuk setup Microsoft credentials.     ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');

      rl.close();
      
      // Exit so PM2 restarts the bot
      setTimeout(() => process.exit(0), 1000);
    });
  });
}

// ===== CHECK IF SETUP NEEDED =====
const config = loadConfig();

if (!config || !config.bot_token || !config.owner_id) {
  console.log('⚠️ Bot belum dikonfigurasi. Memulai setup wizard...');
  runSetupWizard();
} else {
  // ===== START BOT =====
  const { bot_token, owner_id } = config;
  let data = loadData(owner_id);

  const bot = new TelegramBot(bot_token, { polling: true });

  // ===== HELPER FUNCTIONS =====
  function isOwner(userId) {
    return String(userId) === String(owner_id);
  }

  function isApproved(userId) {
    return data.approved_users.includes(String(userId));
  }

  function findUserByIdOrUsername(identifier) {
    // Direct ID match
    if (data.approved_users.includes(String(identifier))) {
      return String(identifier);
    }
    // Check stored user info
    if (data.user_info) {
      for (const [id, info] of Object.entries(data.user_info)) {
        if (info.username && info.username.toLowerCase() === identifier.toLowerCase().replace('@', '')) {
          return id;
        }
      }
    }
    return null;
  }

  function saveUserInfo(userId, userInfo) {
    if (!data.user_info) data.user_info = {};
    data.user_info[String(userId)] = {
      first_name: userInfo.first_name,
      last_name: userInfo.last_name,
      username: userInfo.username
    };
    saveData(data);
  }

  // ===== MICROSOFT AUTH (Device Code Flow for Personal Accounts) =====
  let accessToken = null;
  let refreshToken = null;
  let tokenExpiry = 0;

  // Load saved tokens
  function loadTokens() {
    if (data.tokens) {
      accessToken = data.tokens.access_token || null;
      refreshToken = data.tokens.refresh_token || null;
      tokenExpiry = data.tokens.expiry || 0;
    }
  }

  function saveTokens(tokens) {
    data.tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry: Date.now() + (tokens.expires_in * 1000) - 60000
    };
    saveData(data);
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
    tokenExpiry = data.tokens.expiry;
  }

  loadTokens();

  async function refreshAccessToken() {
    const { ms_client_id } = data.settings;
    
    if (!refreshToken) {
      throw new Error('No refresh token. Please login again with /login');
    }

    const tokenUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
    
    const params = new URLSearchParams({
      client_id: ms_client_id,
      refresh_token: refreshToken,
      scope: 'offline_access Mail.Read Mail.ReadBasic User.Read',
      grant_type: 'refresh_token'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const result = await response.json();
    
    if (result.error) {
      // Token expired, need to re-login
      accessToken = null;
      refreshToken = null;
      data.tokens = null;
      saveData(data);
      throw new Error('Session expired. Please login again with /login');
    }

    saveTokens(result);
    return result.access_token;
  }

  async function getAccessToken() {
    const { ms_client_id } = data.settings;
    
    if (!ms_client_id) {
      throw new Error('Client ID not configured. Use /setclient to configure.');
    }

    if (!accessToken && !refreshToken) {
      throw new Error('Not logged in. Use /login to authenticate with your Outlook account.');
    }

    if (accessToken && Date.now() < tokenExpiry) {
      return accessToken;
    }

    // Try to refresh
    return await refreshAccessToken();
  }

  // Device Code Flow - Start Login
  async function startDeviceCodeFlow(chatId) {
    const { ms_client_id } = data.settings;
    
    if (!ms_client_id) {
      throw new Error('Client ID not configured. Use /setclient first.');
    }

    const deviceCodeUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode';
    
    const params = new URLSearchParams({
      client_id: ms_client_id,
      scope: 'offline_access Mail.Read Mail.ReadBasic User.Read'
    });

    const response = await fetch(deviceCodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Device code error: ${result.error_description}`);
    }

    return result;
  }

  // Poll for token after user completes login
  async function pollForToken(deviceCode, interval, expiresIn) {
    const { ms_client_id } = data.settings;
    const tokenUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
    
    const startTime = Date.now();
    const timeout = expiresIn * 1000;

    while (Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, interval * 1000));

      const params = new URLSearchParams({
        client_id: ms_client_id,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      const result = await response.json();

      if (result.access_token) {
        saveTokens(result);
        return result;
      }

      if (result.error === 'authorization_pending') {
        continue;
      }

      if (result.error === 'slow_down') {
        interval += 5;
        continue;
      }

      throw new Error(result.error_description || result.error);
    }

    throw new Error('Login timeout. Please try again.');
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
  async function sendToApprovedUsers(message, opts = {}) {
    for (const userId of data.approved_users) {
      try {
        await bot.sendMessage(userId, message, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
          ...opts
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
    
    if (!ms_user_email) return;

    try {
      const client = getGraphClient();
      
      // Use /me endpoint for personal accounts
      const response = await client
        .api('/me/mailFolders/inbox/messages')
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
        
        if (data.processed_emails.length > 500) {
          data.processed_emails = data.processed_emails.slice(-250);
        }
        saveData(data);
      }

      lastCheckedTime = new Date().toISOString();
      
    } catch (error) {
      console.error('❌ Error checking emails:', error.message || error);
      if (error.statusCode === 401) {
        console.error('⚠️ Token expired or invalid. Please run /login again.');
        stopPolling();
      }
    }
  }

  async function getInboxEmails(count = 10) {
    try {
      const client = getGraphClient();
      
      // Use /me endpoint for personal accounts
      const response = await client
        .api('/me/mailFolders/inbox/messages')
        .orderby('receivedDateTime desc')
        .top(count)
        .select('id,subject,bodyPreview,from,receivedDateTime,isRead')
        .get();

      return response.value || [];
    } catch (error) {
      // Extract detailed error from Graph API
      const graphError = error.body ? JSON.parse(error.body) : null;
      const errorMessage = graphError?.error?.message || error.message || 'Unknown error';
      const errorCode = graphError?.error?.code || error.code || '';
      throw new Error(`${errorCode}: ${errorMessage}`);
    }
  }

  function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    
    const interval = (data.settings.poll_interval || 30) * 1000;
    pollingInterval = setInterval(checkNewEmails, interval);
    checkNewEmails();
    
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
    
    // Save user info
    saveUserInfo(userId, msg.from);
    
    if (isOwner(userId)) {
      bot.sendMessage(msg.chat.id, 
        `👋 Halo Owner *${name}*!\n\n` +
        `🤖 *OTP Bot Ready (Personal Account)*\n\n` +
        `*📋 Owner Commands:*\n` +
        `/setclient - Set Client ID\n` +
        `/login - Login ke Outlook.com\n` +
        `/logout - Logout\n` +
        `/startbot - Start monitoring\n` +
        `/stopbot - Stop monitoring\n` +
        `/inbox - Lihat inbox email\n` +
        `/check - Cek email baru\n` +
        `/settings - Lihat settings\n\n` +
        `*👥 User Management:*\n` +
        `/approve <id/username> - Approve user\n` +
        `/revoke <id/username> - Revoke akses\n` +
        `/users - Lihat semua user\n` +
        `/broadcast <pesan> - Kirim ke semua\n\n` +
        `*📱 General Commands:*\n` +
        `/status - Bot status\n` +
        `/myid - Get Telegram ID`,
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
        `Minta owner untuk approve dengan:\n` +
        `\`/approve ${userId}\``,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // /myid
  bot.onText(/\/myid/, (msg) => {
    saveUserInfo(msg.from.id, msg.from);
    bot.sendMessage(msg.chat.id, `🆔 ID Telegram kamu: \`${msg.from.id}\``, { parse_mode: 'Markdown' });
  });

  // /status
  bot.onText(/\/status/, (msg) => {
    if (!isApproved(msg.from.id) && !isOwner(msg.from.id)) {
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

  // ===== OWNER COMMANDS =====

  // /approve [id/username]
  bot.onText(/\/approve (.+)/, (msg, match) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    const identifier = match[1].trim();
    const existingUser = findUserByIdOrUsername(identifier);
    
    if (existingUser) {
      return bot.sendMessage(msg.chat.id, '⚠️ User sudah approved.');
    }
    
    // If it's a number, treat as ID
    const userId = identifier.replace('@', '');
    
    data.approved_users.push(userId);
    saveData(data);
    
    bot.sendMessage(msg.chat.id, `✅ User \`${userId}\` approved!`, { parse_mode: 'Markdown' });
    
    // Notify the user
    bot.sendMessage(userId, '🎉 Kamu telah disetujui untuk menerima notifikasi OTP!').catch(() => {});
  });

  // /revoke [id/username]
  bot.onText(/\/revoke (.+)/, (msg, match) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    const identifier = match[1].trim();
    const userId = findUserByIdOrUsername(identifier) || identifier.replace('@', '');
    
    if (userId === String(owner_id)) {
      return bot.sendMessage(msg.chat.id, '⚠️ Tidak bisa revoke owner.');
    }
    
    const index = data.approved_users.indexOf(userId);
    if (index === -1) {
      return bot.sendMessage(msg.chat.id, '⚠️ User tidak ditemukan.');
    }
    
    data.approved_users.splice(index, 1);
    saveData(data);
    
    bot.sendMessage(msg.chat.id, `✅ User \`${userId}\` revoked.`, { parse_mode: 'Markdown' });
    
    // Notify the user
    bot.sendMessage(userId, '⚠️ Akses kamu ke bot OTP telah dicabut.').catch(() => {});
  });

  // /users
  bot.onText(/\/users$/, (msg) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    const userList = data.approved_users.map((id, i) => {
      const info = data.user_info?.[id];
      let display = `${i + 1}. \`${id}\``;
      if (info) {
        display += ` - ${info.first_name || ''}`;
        if (info.username) display += ` (@${info.username})`;
      }
      if (id === String(owner_id)) display += ' 👑';
      return display;
    }).join('\n');
    
    bot.sendMessage(msg.chat.id,
      `👥 *Approved Users (${data.approved_users.length})*\n\n${userList}`,
      { parse_mode: 'Markdown' }
    );
  });

  // /broadcast [message]
  bot.onText(/\/broadcast (.+)/s, async (msg, match) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    const message = match[1].trim();
    
    if (!message) {
      return bot.sendMessage(msg.chat.id, '⚠️ Usage: /broadcast <pesan>');
    }
    
    const broadcastMsg = `📢 *Broadcast dari Admin*\n\n${message}`;
    
    let sent = 0;
    let failed = 0;
    
    for (const userId of data.approved_users) {
      try {
        await bot.sendMessage(userId, broadcastMsg, { parse_mode: 'Markdown' });
        sent++;
      } catch (error) {
        failed++;
      }
    }
    
    bot.sendMessage(msg.chat.id, 
      `✅ Broadcast selesai!\n\n` +
      `📤 Terkirim: ${sent}\n` +
      `❌ Gagal: ${failed}`,
      { parse_mode: 'Markdown' }
    );
  });

  // /setclient - Interactive setup for Microsoft credentials (simplified for Device Code Flow)
  let setupState = {};

  bot.onText(/\/setclient/, (msg) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    setupState[msg.chat.id] = { step: 'client_id' };
    
    bot.sendMessage(msg.chat.id,
      `⚙️ *Setup Microsoft Graph API (Personal Account)*\n\n` +
      `Langkah 1/2: Masukkan *Client ID* dari Azure App\n\n` +
      `(Ketik /cancel untuk batal)`,
      { parse_mode: 'Markdown' }
    );
  });

  // Handle setup conversation
  bot.on('message', (msg) => {
    if (!setupState[msg.chat.id]) return;
    if (!isOwner(msg.from.id)) return;
    if (msg.text?.startsWith('/')) {
      if (msg.text === '/cancel') {
        delete setupState[msg.chat.id];
        bot.sendMessage(msg.chat.id, '❌ Setup dibatalkan.');
      }
      return;
    }
    
    const state = setupState[msg.chat.id];
    const value = msg.text?.trim();
    
    switch (state.step) {
      case 'client_id':
        data.settings.ms_client_id = value;
        state.step = 'interval';
        bot.sendMessage(msg.chat.id,
          `✅ Client ID saved!\n\n` +
          `Langkah 2/2: Masukkan *Interval* polling (detik, min 10)`,
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'interval':
        const interval = parseInt(value);
        if (isNaN(interval) || interval < 10) {
          bot.sendMessage(msg.chat.id, '⚠️ Minimum 10 detik. Coba lagi:');
          return;
        }
        data.settings.poll_interval = interval;
        saveData(data);
        
        delete setupState[msg.chat.id];
        
        bot.sendMessage(msg.chat.id,
          `✅ *Setup Complete!*\n\n` +
          `⏱️ Interval: ${interval}s\n\n` +
          `Sekarang gunakan /login untuk login ke akun Outlook.com kamu.`,
          { parse_mode: 'Markdown' }
        );
        break;
    }
  });

  // /login - Device Code Flow login
  let loginState = {};

  bot.onText(/\/login/, async (msg) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    if (!data.settings.ms_client_id) {
      return bot.sendMessage(msg.chat.id, '⚠️ Client ID belum dikonfigurasi. Gunakan /setclient dulu.');
    }
    
    // Check if already logged in
    if (accessToken && refreshToken) {
      return bot.sendMessage(msg.chat.id, 
        '✅ Sudah login. Gunakan /logout untuk logout dulu jika ingin login ulang.'
      );
    }
    
    try {
      const statusMsg = await bot.sendMessage(msg.chat.id, '⏳ Memulai proses login...');
      
      const deviceCode = await startDeviceCodeFlow(msg.chat.id);
      
      await bot.editMessageText(
        `🔐 *Login ke Outlook.com*\n\n` +
        `1. Buka: ${deviceCode.verification_uri}\n\n` +
        `2. Masukkan kode:\n\`${deviceCode.user_code}\`\n\n` +
        `⏳ Menunggu kamu login... (expires in ${Math.floor(deviceCode.expires_in / 60)} menit)`,
        { 
          chat_id: msg.chat.id, 
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }
      );
      
      // Poll for token
      loginState[msg.chat.id] = true;
      
      const tokens = await pollForToken(
        deviceCode.device_code, 
        deviceCode.interval, 
        deviceCode.expires_in
      );
      
      delete loginState[msg.chat.id];
      
      // Get user email
      const client = getGraphClient();
      const me = await client.api('/me').select('mail,userPrincipalName').get();
      data.settings.ms_user_email = me.mail || me.userPrincipalName;
      saveData(data);
      
      await bot.editMessageText(
        `✅ *Login Berhasil!*\n\n` +
        `📧 Email: ${data.settings.ms_user_email}\n\n` +
        `Gunakan /startbot untuk mulai monitoring email.`,
        { 
          chat_id: msg.chat.id, 
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }
      );
      
    } catch (error) {
      delete loginState[msg.chat.id];
      bot.sendMessage(msg.chat.id, `❌ Login gagal: ${error.message}`);
    }
  });

  // /logout
  bot.onText(/\/logout/, (msg) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    accessToken = null;
    refreshToken = null;
    tokenExpiry = 0;
    data.tokens = null;
    data.settings.ms_user_email = null;
    saveData(data);
    
    stopPolling();
    
    bot.sendMessage(msg.chat.id, '✅ Logout berhasil. Gunakan /login untuk login lagi.');
  });

  // /inbox - View inbox
  bot.onText(/\/inbox/, async (msg) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    if (!data.settings.ms_user_email) {
      return bot.sendMessage(msg.chat.id, '⚠️ Email belum dikonfigurasi. Gunakan /setclient');
    }
    
    try {
      const statusMsg = await bot.sendMessage(msg.chat.id, '⏳ Mengambil inbox...');
      
      const emails = await getInboxEmails(10);
      
      if (emails.length === 0) {
        return bot.editMessageText('📭 Inbox kosong.', {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id
        });
      }
      
      let message = `📬 *Inbox (${emails.length} email terbaru)*\n\n`;
      
      emails.forEach((email, i) => {
        const date = new Date(email.receivedDateTime).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        const read = email.isRead ? '📖' : '📩';
        const from = email.from?.emailAddress?.address || 'Unknown';
        const subject = email.subject?.substring(0, 40) || '(No subject)';
        
        message += `${read} *${i + 1}.* ${subject}${email.subject?.length > 40 ? '...' : ''}\n`;
        message += `   📤 ${from}\n`;
        message += `   🕐 ${date}\n\n`;
      });
      
      bot.editMessageText(message, {
        chat_id: msg.chat.id,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      });
      
    } catch (error) {
      bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
  });

  // /check - Force check emails
  bot.onText(/\/check/, async (msg) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    if (!data.settings.ms_user_email) {
      return bot.sendMessage(msg.chat.id, '⚠️ Email belum dikonfigurasi. Gunakan /setclient');
    }
    
    const statusMsg = await bot.sendMessage(msg.chat.id, '🔍 Checking emails...');
    
    const beforeCount = data.processed_emails.length;
    await checkNewEmails();
    const afterCount = data.processed_emails.length;
    const newEmails = afterCount - beforeCount;
    
    bot.editMessageText(
      newEmails > 0 
        ? `✅ Ditemukan ${newEmails} email baru!` 
        : '📭 Tidak ada email baru.',
      { chat_id: msg.chat.id, message_id: statusMsg.message_id }
    );
  });

  // /settings
  bot.onText(/\/settings/, (msg) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    const s = data.settings;
    const isLoggedIn = !!(accessToken || refreshToken);
    
    bot.sendMessage(msg.chat.id,
      `⚙️ *Current Settings*\n\n` +
      `📧 Email: \`${s.ms_user_email || '(not set)'}\`\n` +
      `🔑 Client ID: \`${s.ms_client_id ? s.ms_client_id.substring(0, 8) + '...' : '(not set)'}\`\n` +
      `🔐 Login: ${isLoggedIn ? '✅ Logged in' : '❌ Not logged in'}\n` +
      `⏱️ Interval: ${s.poll_interval}s\n` +
      `🔄 Polling: ${pollingInterval ? '✅ Running' : '❌ Stopped'}`,
      { parse_mode: 'Markdown' }
    );
  });

  // /startbot
  bot.onText(/\/startbot/, async (msg) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    const { ms_client_id } = data.settings;
    
    if (!ms_client_id) {
      return bot.sendMessage(msg.chat.id, 
        '⚠️ Client ID belum dikonfigurasi!\n\nGunakan /setclient untuk konfigurasi.'
      );
    }
    
    if (!accessToken && !refreshToken) {
      return bot.sendMessage(msg.chat.id, 
        '⚠️ Belum login!\n\nGunakan /login untuk login ke akun Outlook.com kamu.'
      );
    }
    
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
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    stopPolling();
    bot.sendMessage(msg.chat.id, '⏹️ Bot stopped.');
  });

  // ===== STARTUP =====
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                 🤖 OTP BOT STARTED                         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  👤 Owner ID: ${owner_id.padEnd(43)}║`);
  console.log(`║  👥 Approved Users: ${String(data.approved_users.length).padEnd(37)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Auto-start if configured and logged in
  const { ms_client_id } = data.settings;
  if (ms_client_id && (accessToken || refreshToken)) {
    console.log('🔄 Auto-starting email monitoring...');
    getAccessToken()
      .then(() => startPolling())
      .catch(err => console.error('❌ Auto-start failed:', err.message));
  } else if (!ms_client_id) {
    console.log('⚠️ Client ID not configured. Use /setclient in Telegram.');
  } else {
    console.log('⚠️ Not logged in. Use /login in Telegram.');
  }
}
