# 🤖 OTP Telegram Bot

Bot Telegram untuk menerima notifikasi OTP dari email Outlook/Microsoft 365.

## ✨ Fitur

- ✅ **CLI Setup Wizard** - Konfigurasi via terminal, tanpa edit file
- ✅ **1 Command Install** - Instalasi otomatis dengan satu perintah
- ✅ **User Approval System** - Hanya user approved yang bisa akses
- ✅ **Auto-extract OTP** - Deteksi otomatis kode OTP dari email
- ✅ **Broadcast** - Kirim pesan ke semua user
- ✅ **Inbox Viewer** - Lihat inbox langsung dari Telegram

---

## 🚀 Quick Install (1 Command)

SSH ke VPS kamu, lalu jalankan:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/otp-bot/main/install.sh | bash
```

Atau manual:

```bash
git clone https://github.com/YOUR_REPO/otp-bot.git
cd otp-bot
npm install
npm start
```

---

## 🔧 Setup via Terminal

Setelah install, bot akan menampilkan setup wizard:

```
╔════════════════════════════════════════════════════════════╗
║              🤖 OTP TELEGRAM BOT - SETUP                   ║
╠════════════════════════════════════════════════════════════╣
║  Selamat datang! Mari konfigurasikan bot kamu.             ║
╚════════════════════════════════════════════════════════════╝

📋 Cara mendapatkan token dan ID:
   1. Chat @BotFather di Telegram → /newbot → catat token
   2. Chat @userinfobot → catat ID Telegram kamu

🔑 Masukkan Bot Token: _
👤 Masukkan Owner ID: _
```

Setelah setup, chat bot di Telegram untuk lanjutkan konfigurasi Microsoft.

---

## 📋 Owner Commands

| Command | Fungsi |
|---------|--------|
| `/approve <id/@username>` | Approve user |
| `/revoke <id/@username>` | Revoke akses user |
| `/users` | Lihat semua approved users |
| `/broadcast <pesan>` | Kirim pesan ke semua user |
| `/setclient` | Setup Microsoft credentials (interactive) |
| `/inbox` | Lihat 10 email terbaru |
| `/check` | Cek email baru sekarang |
| `/settings` | Lihat current settings |
| `/startbot` | Mulai monitoring email |
| `/stopbot` | Stop monitoring |

## 📱 User Commands

| Command | Fungsi |
|---------|--------|
| `/start` | Mulai bot |
| `/myid` | Lihat Telegram ID |
| `/status` | Cek status bot |

---

## 👥 User Approval Flow

```
1. User baru chat bot
   ↓
2. Bot tampilkan: "Belum disetujui" + ID nya
   ↓
3. User kirim ID ke owner
   ↓
4. Owner: /approve 123456789
   ↓
5. User ter-approve ✅
```

---

## ⚙️ Microsoft Setup (via Telegram)

Chat bot kamu, ketik `/setclient`, lalu ikuti langkah:

1. Masukkan Client ID
2. Masukkan Client Secret
3. Masukkan Tenant ID
4. Masukkan Email yang dimonitor
5. Masukkan Interval polling

Setelah selesai, ketik `/startbot` untuk mulai monitoring.

---

## 🔧 Azure App Registration

1. Buka [portal.azure.com](https://portal.azure.com)
2. Cari "App registrations" → **New registration**
3. Nama: `OTP Bot` → Register

4. **Catat:**
   - Application (client) ID
   - Directory (tenant) ID

5. **Certificates & secrets** → New client secret
   - Catat Value

6. **API permissions** → Add permission → Microsoft Graph:
   - `Mail.Read` (Application type)
   - Click "Grant admin consent"

---

## 🌐 Menggunakan Domain Sendiri

Bot Telegram tidak memerlukan domain karena berkomunikasi langsung dengan API Telegram. Tapi jika kamu ingin domain untuk:

### 1. Webhook (Opsional - untuk performa lebih baik)

Ubah dari polling ke webhook:

```javascript
// Di index.js, ganti:
const bot = new TelegramBot(bot_token, { polling: true });

// Menjadi:
const bot = new TelegramBot(bot_token);
bot.setWebHook('https://yourdomain.com/webhook');
```

Setup domain dengan SSL:

```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx

# Setup SSL
sudo certbot --nginx -d yourdomain.com

# Nginx config untuk webhook
sudo nano /etc/nginx/sites-available/otp-bot
```

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /webhook {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/otp-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Dashboard Web (Jika diperlukan)

Jika kamu ingin menambahkan dashboard web:

```bash
# Arahkan domain ke IP VPS
# Di DNS provider (Cloudflare, Namecheap, dll):
# A Record: @ → IP_VPS_KAMU
# A Record: www → IP_VPS_KAMU

# Setup SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. DNS Settings

Di domain provider kamu:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | IP_VPS_KAMU | Auto |
| A | www | IP_VPS_KAMU | Auto |

---

## 🔄 PM2 Commands

```bash
pm2 status          # Cek status
pm2 logs otp-bot    # Lihat logs
pm2 restart otp-bot # Restart bot
pm2 stop otp-bot    # Stop bot
pm2 delete otp-bot  # Hapus dari PM2
```

---

## 📁 File Structure

```
otp-bot/
├── index.js           # Main bot code
├── package.json       # Dependencies
├── config.json        # Bot token & owner ID (auto-generated)
└── data.json          # Settings & users (auto-generated)
```

---

## 🔄 Reset & Setup Ulang

```bash
# Reset konfigurasi bot
rm ~/otp-bot/config.json
pm2 restart otp-bot

# Reset semua data
rm ~/otp-bot/config.json ~/otp-bot/data.json
pm2 restart otp-bot
```

---

## 🛡️ Security Notes

- Client Secret otomatis dihapus dari chat setelah dikirim
- config.json berisi credential, jangan share!
- Hanya owner yang bisa approve/revoke user
- Semua data tersimpan lokal di VPS

---

## ❓ Troubleshooting

**Bot tidak merespon?**
```bash
pm2 logs otp-bot
```

**Error "Auth error"?**
- Pastikan Client ID, Secret, dan Tenant ID benar
- Pastikan API permission sudah di-grant admin consent

**Bot tidak jalan setelah restart VPS?**
```bash
pm2 startup
pm2 save
```

**Ingin setup ulang?**
```bash
rm ~/otp-bot/config.json
pm2 restart otp-bot
pm2 logs otp-bot
```

---

## 📞 Support

Buat issue di GitHub jika ada masalah.
