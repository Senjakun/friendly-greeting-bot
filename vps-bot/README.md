# OTP Telegram Bot (VPS Version)

Bot Telegram untuk menerima notifikasi OTP dari email Outlook/Microsoft 365.

## Fitur

- ✅ Baca email dari Outlook via Microsoft Graph API
- ✅ Auto-extract OTP dari isi email
- ✅ Kirim notifikasi ke Telegram
- ✅ Polling otomatis setiap X detik

## Persiapan

### 1. Buat Telegram Bot

1. Chat [@BotFather](https://t.me/BotFather)
2. Kirim `/newbot`
3. Ikuti instruksi, dapatkan **BOT TOKEN**
4. Chat bot kamu, kirim `/start`
5. Buka `https://api.telegram.org/bot<TOKEN>/getUpdates` untuk dapat **CHAT ID**

### 2. Buat Azure App Registration

1. Buka [Azure Portal](https://portal.azure.com)
2. Cari **App registrations** → **New registration**
3. Nama: `OTP Bot`
4. Supported account types: pilih sesuai kebutuhan
5. Klik **Register**

6. Catat:
   - **Application (client) ID** → `MS_CLIENT_ID`
   - **Directory (tenant) ID** → `MS_TENANT_ID`

7. **Certificates & secrets** → **New client secret**
   - Catat **Value** → `MS_CLIENT_SECRET`

8. **API permissions** → **Add permission** → **Microsoft Graph**:
   - `Mail.Read` (Application)
   - `User.Read.All` (Application)

9. Klik **Grant admin consent**

### 3. Setup di VPS

```bash
# Clone atau copy folder vps-bot ke VPS
cd vps-bot

# Install dependencies
npm install

# Copy dan edit .env
cp .env.example .env
nano .env

# Test run
npm start
```

### 4. Run dengan PM2 (Production)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start index.js --name otp-bot

# Auto-start on reboot
pm2 startup
pm2 save

# Lihat logs
pm2 logs otp-bot

# Restart
pm2 restart otp-bot
```

## Konfigurasi .env

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890

# Microsoft Graph API
MS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MS_CLIENT_SECRET=your_client_secret_value
MS_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MS_USER_EMAIL=user@yourdomain.com

# Polling interval (seconds)
POLL_INTERVAL=30
```

## Commands Telegram

- `/start` - Mulai bot dan lihat Chat ID
- `/status` - Cek status bot

## Troubleshooting

### Error: Auth error
- Pastikan Client ID, Secret, dan Tenant ID benar
- Pastikan sudah **Grant admin consent** di Azure

### Email tidak muncul
- Pastikan `MS_USER_EMAIL` benar
- Pastikan permission `Mail.Read` sudah disetujui
- Cek apakah email masuk ke Inbox (bukan spam/folder lain)

### Bot tidak mengirim pesan
- Pastikan `TELEGRAM_CHAT_ID` benar
- Untuk channel, format: `-100xxxxxxxxxx`
- Pastikan bot sudah ditambahkan ke channel sebagai admin
