#!/bin/bash

# ╔════════════════════════════════════════════════════════════╗
# ║           🤖 OTP Bot - One Command Installer               ║
# ║                                                            ║
# ║  Usage: curl -fsSL URL | bash                              ║
# ║                                                            ║
# ╚════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art
echo -e "${CYAN}"
cat << "EOF"
   ____  ______  ____        __  ____        __ 
  / __ \/_  __/ / __ )____  / /_/ __ )____  / /_
 / / / / / /   / __  / __ \/ __/ __  / __ \/ __/
/ /_/ / / /   / /_/ / /_/ / /_/ /_/ / /_/ / /_  
\____/ /_/   /_____/\____/\__/_____/\____/\__/  
                                                
EOF
echo -e "${NC}"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🚀 Starting OTP Bot Installation              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Running as root. Will install for root user.${NC}"
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
else
    OS=$(uname -s)
fi
echo -e "${BLUE}📦 Detected OS: ${OS}${NC}"

# Installation directory
INSTALL_DIR="$HOME/otp-bot"
echo -e "${BLUE}📁 Install directory: ${INSTALL_DIR}${NC}"
echo ""

# Step 1: Install Node.js if not present
echo -e "${CYAN}[1/5] Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}  ✅ Node.js ${NODE_VERSION} found${NC}"
else
    echo -e "${YELLOW}  📥 Installing Node.js...${NC}"
    
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    elif command -v dnf &> /dev/null; then
        # Fedora
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    else
        echo -e "${RED}  ❌ Unsupported package manager. Please install Node.js manually.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}  ✅ Node.js installed: $(node -v)${NC}"
fi

# Step 2: Install PM2 globally
echo -e "${CYAN}[2/5] Checking PM2...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}  ✅ PM2 found${NC}"
else
    echo -e "${YELLOW}  📥 Installing PM2...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}  ✅ PM2 installed${NC}"
fi

# Step 3: Create directory and download bot
echo -e "${CYAN}[3/5] Setting up bot files...${NC}"

# Create directory
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Create package.json
cat > package.json << 'PKGJSON'
{
  "name": "otp-telegram-bot",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@microsoft/microsoft-graph-client": "^3.0.7",
    "dotenv": "^16.3.1",
    "isomorphic-fetch": "^3.0.0",
    "node-telegram-bot-api": "^0.66.0"
  }
}
PKGJSON

# Create the bot file
cat > index.js << 'INDEXJS'
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
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                 🤖 OTP BOT STARTED                         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  👤 Owner ID: ${owner_id.padEnd(43)}║`);
  console.log(`║  👥 Approved Users: ${String(data.approved_users.length).padEnd(37)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

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
INDEXJS

echo -e "${GREEN}  ✅ Bot files created${NC}"

# Step 4: Install dependencies
echo -e "${CYAN}[4/5] Installing dependencies...${NC}"
npm install --production
echo -e "${GREEN}  ✅ Dependencies installed${NC}"

# Step 5: Run setup wizard interactively
echo -e "${CYAN}[5/5] Starting initial configuration...${NC}"
echo ""

# Run node interactively for setup (not via PM2 yet)
node index.js

# After setup completes, start with PM2
echo ""
echo -e "${CYAN}Starting bot with PM2...${NC}"

# Create PM2 ecosystem file
cat > ecosystem.config.cjs << 'ECOSYSTEM'
module.exports = {
  apps: [{
    name: 'otp-bot',
    script: 'index.js',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
ECOSYSTEM

# Start with PM2
pm2 delete otp-bot 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# Setup startup script
echo -e "${YELLOW}  📝 Setting up auto-start on boot...${NC}"
pm2 startup | tail -1 | bash 2>/dev/null || true
pm2 save

echo -e "${GREEN}  ✅ PM2 configured${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Installation Complete!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🤖 Bot is now running!${NC}"
echo ""
echo -e "${CYAN}📋 Next steps:${NC}"
echo -e "   1. Open Telegram and chat your bot"
echo -e "   2. Send /start to verify bot is working"
echo -e "   3. Use /setclient to configure Microsoft credentials"
echo ""
echo -e "${CYAN}📋 Useful commands:${NC}"
echo -e "   ${BLUE}pm2 logs otp-bot${NC}     - View logs"
echo -e "   ${BLUE}pm2 restart otp-bot${NC}  - Restart bot"
echo -e "   ${BLUE}pm2 stop otp-bot${NC}     - Stop bot"
echo -e "   ${BLUE}pm2 status${NC}           - Check status"
echo ""
echo -e "${CYAN}📁 Bot location: ${INSTALL_DIR}${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
