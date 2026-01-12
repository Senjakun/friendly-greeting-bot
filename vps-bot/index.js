import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

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

// ===== SETUP WIZARD SERVER =====
function startSetupServer() {
  const PORT = process.env.SETUP_PORT || 3000;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Bot - Setup</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      border: 1px solid rgba(255,255,255,0.1);
    }
    h1 {
      color: #fff;
      text-align: center;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #8892b0;
      text-align: center;
      margin-bottom: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #ccd6f6;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .help {
      color: #8892b0;
      font-size: 12px;
      margin-top: 4px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      color: #fff;
      font-size: 16px;
      transition: all 0.3s;
    }
    input:focus {
      outline: none;
      border-color: #64ffda;
      box-shadow: 0 0 0 3px rgba(100,255,218,0.1);
    }
    input::placeholder { color: #4a5568; }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #64ffda 0%, #48bb78 100%);
      border: none;
      border-radius: 10px;
      color: #1a1a2e;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(100,255,218,0.3);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .success {
      text-align: center;
      color: #64ffda;
      padding: 20px;
    }
    .success h2 { margin-bottom: 10px; }
    .error {
      background: rgba(239,68,68,0.2);
      border: 1px solid #ef4444;
      border-radius: 10px;
      padding: 12px;
      color: #fca5a5;
      margin-bottom: 20px;
      display: none;
    }
    .steps {
      background: rgba(100,255,218,0.1);
      border-radius: 10px;
      padding: 15px;
      margin-top: 20px;
    }
    .steps h3 { color: #64ffda; margin-bottom: 10px; }
    .steps ol { color: #ccd6f6; padding-left: 20px; }
    .steps li { margin-bottom: 5px; }
    .steps code {
      background: rgba(0,0,0,0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="form-view">
      <h1>🤖 OTP Bot Setup</h1>
      <p class="subtitle">Konfigurasi awal bot Telegram</p>
      
      <div class="error" id="error"></div>
      
      <form id="setupForm">
        <div class="form-group">
          <label for="bot_token">🔑 Bot Token</label>
          <input type="text" id="bot_token" placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" required>
          <p class="help">Dapatkan dari @BotFather di Telegram</p>
        </div>
        
        <div class="form-group">
          <label for="owner_id">👤 Owner ID</label>
          <input type="text" id="owner_id" placeholder="123456789" required>
          <p class="help">ID Telegram kamu. Chat @userinfobot untuk mendapatkannya</p>
        </div>
        
        <button type="submit" id="submitBtn">🚀 Setup Bot</button>
      </form>
      
      <div class="steps">
        <h3>📋 Cara Mendapatkan:</h3>
        <ol>
          <li>Chat <code>@BotFather</code> → <code>/newbot</code></li>
          <li>Ikuti instruksi, catat token</li>
          <li>Chat <code>@userinfobot</code> → catat ID kamu</li>
        </ol>
      </div>
    </div>
    
    <div id="success-view" class="success" style="display:none;">
      <h1>✅ Setup Complete!</h1>
      <p>Bot berhasil dikonfigurasi.</p>
      <p style="margin-top: 20px; color: #8892b0;">Bot akan restart otomatis...</p>
    </div>
  </div>

  <script>
    document.getElementById('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btn = document.getElementById('submitBtn');
      const error = document.getElementById('error');
      
      btn.disabled = true;
      btn.textContent = 'Setting up...';
      error.style.display = 'none';
      
      try {
        const response = await fetch('/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bot_token: document.getElementById('bot_token').value,
            owner_id: document.getElementById('owner_id').value
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          document.getElementById('form-view').style.display = 'none';
          document.getElementById('success-view').style.display = 'block';
        } else {
          error.textContent = result.error || 'Setup failed';
          error.style.display = 'block';
          btn.disabled = false;
          btn.textContent = '🚀 Setup Bot';
        }
      } catch (err) {
        error.textContent = 'Connection error';
        error.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '🚀 Setup Bot';
      }
    });
  </script>
</body>
</html>
  `;

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.method === 'POST' && req.url === '/setup') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { bot_token, owner_id } = JSON.parse(body);
          
          if (!bot_token || !owner_id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'All fields required' }));
            return;
          }
          
          // Save config
          saveConfig({ bot_token, owner_id });
          
          // Initialize data with owner
          const data = loadData(owner_id);
          if (!data.approved_users.includes(owner_id)) {
            data.approved_users.push(owner_id);
          }
          saveData(data);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          
          console.log('✅ Setup complete! Restarting...');
          
          // Close server and restart
          server.close(() => {
            setTimeout(() => process.exit(0), 1000); // PM2 will restart
          });
          
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║         🤖 OTP BOT SETUP WIZARD            ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║  Open in browser: http://localhost:${PORT}     ║`);
    console.log(`║  Or: http://YOUR_VPS_IP:${PORT}              ║`);
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
  });
}

// ===== CHECK IF SETUP NEEDED =====
const config = loadConfig();

if (!config || !config.bot_token || !config.owner_id) {
  console.log('⚠️ Bot not configured. Starting setup wizard...');
  startSetupServer();
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

  // ===== MICROSOFT AUTH =====
  let accessToken = null;
  let tokenExpiry = 0;

  async function getAccessToken() {
    const { ms_client_id, ms_client_secret, ms_tenant_id } = data.settings;
    
    if (!ms_client_id || !ms_client_secret || !ms_tenant_id) {
      throw new Error('Microsoft credentials not configured. Use /setclient to configure.');
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

  async function getInboxEmails(count = 10) {
    const { ms_user_email } = data.settings;
    
    if (!ms_user_email) {
      throw new Error('Email not configured');
    }

    const client = getGraphClient();
    
    const response = await client
      .api(`/users/${ms_user_email}/mailFolders/inbox/messages`)
      .orderby('receivedDateTime desc')
      .top(count)
      .select('id,subject,bodyPreview,from,receivedDateTime,isRead')
      .get();

    return response.value || [];
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
        `🤖 *OTP Bot Ready*\n\n` +
        `*📋 Owner Commands:*\n` +
        `/approve <id/username> - Approve user\n` +
        `/revoke <id/username> - Revoke akses\n` +
        `/users - Lihat semua user\n` +
        `/broadcast <pesan> - Kirim ke semua\n` +
        `/setclient - Set Microsoft credentials\n` +
        `/inbox - Lihat inbox email\n` +
        `/check - Cek email baru\n` +
        `/settings - Lihat settings\n` +
        `/startbot - Start monitoring\n` +
        `/stopbot - Stop monitoring\n\n` +
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

  // /setclient - Interactive setup for Microsoft credentials
  let setupState = {};

  bot.onText(/\/setclient/, (msg) => {
    if (!isOwner(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, '⛔ Hanya owner yang bisa menggunakan command ini.');
    }
    
    setupState[msg.chat.id] = { step: 'client_id' };
    
    bot.sendMessage(msg.chat.id,
      `⚙️ *Setup Microsoft Graph API*\n\n` +
      `Langkah 1/5: Masukkan *Client ID*\n\n` +
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
        state.step = 'client_secret';
        bot.sendMessage(msg.chat.id,
          `✅ Client ID saved!\n\n` +
          `Langkah 2/5: Masukkan *Client Secret*`,
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'client_secret':
        data.settings.ms_client_secret = value;
        state.step = 'tenant_id';
        // Delete secret message
        bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => {});
        bot.sendMessage(msg.chat.id,
          `✅ Client Secret saved! (pesan dihapus)\n\n` +
          `Langkah 3/5: Masukkan *Tenant ID*`,
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'tenant_id':
        data.settings.ms_tenant_id = value;
        state.step = 'email';
        bot.sendMessage(msg.chat.id,
          `✅ Tenant ID saved!\n\n` +
          `Langkah 4/5: Masukkan *Email* yang akan dimonitor`,
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'email':
        data.settings.ms_user_email = value;
        state.step = 'interval';
        bot.sendMessage(msg.chat.id,
          `✅ Email saved!\n\n` +
          `Langkah 5/5: Masukkan *Interval* polling (detik, min 10)`,
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
        accessToken = null;
        
        delete setupState[msg.chat.id];
        
        bot.sendMessage(msg.chat.id,
          `✅ *Setup Complete!*\n\n` +
          `📧 Email: ${data.settings.ms_user_email}\n` +
          `⏱️ Interval: ${interval}s\n\n` +
          `Gunakan /startbot untuk mulai monitoring.`,
          { parse_mode: 'Markdown' }
        );
        break;
    }
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
    bot.sendMessage(msg.chat.id,
      `⚙️ *Current Settings*\n\n` +
      `📧 Email: \`${s.ms_user_email || '(not set)'}\`\n` +
      `🔑 Client ID: \`${s.ms_client_id ? s.ms_client_id.substring(0, 8) + '...' : '(not set)'}\`\n` +
      `🔐 Secret: \`${s.ms_client_secret ? '••••••••' : '(not set)'}\`\n` +
      `🏢 Tenant: \`${s.ms_tenant_id ? s.ms_tenant_id.substring(0, 8) + '...' : '(not set)'}\`\n` +
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
    
    const { ms_client_id, ms_client_secret, ms_tenant_id, ms_user_email } = data.settings;
    
    if (!ms_client_id || !ms_client_secret || !ms_tenant_id || !ms_user_email) {
      return bot.sendMessage(msg.chat.id, 
        '⚠️ Setup belum lengkap!\n\nGunakan /setclient untuk konfigurasi.'
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
  console.log('🤖 OTP Bot started!');
  console.log(`👤 Owner ID: ${owner_id}`);
  console.log(`👥 Approved users: ${data.approved_users.length}`);

  // Auto-start if configured
  const { ms_client_id, ms_client_secret, ms_tenant_id, ms_user_email } = data.settings;
  if (ms_client_id && ms_client_secret && ms_tenant_id && ms_user_email) {
    console.log('🔄 Auto-starting email monitoring...');
    getAccessToken()
      .then(() => startPolling())
      .catch(err => console.error('❌ Auto-start failed:', err.message));
  } else {
    console.log('⚠️ Microsoft credentials not configured. Use /setclient in Telegram.');
  }
}
