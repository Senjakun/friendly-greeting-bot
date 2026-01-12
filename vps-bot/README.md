# OTP Telegram Bot (VPS Version)

Bot Telegram untuk menerima notifikasi OTP dari email Outlook/Microsoft 365.

## Fitur

- ✅ Setup via Telegram (tidak perlu edit .env untuk Microsoft)
- ✅ User approval system (hanya user yang disetujui bisa akses)
- ✅ Auto-extract OTP dari isi email
- ✅ Kirim notifikasi ke semua approved users

## Quick Start

### 1. Buat Telegram Bot

1. Chat [@BotFather](https://t.me/BotFather)
2. Kirim `/newbot`, ikuti instruksi
3. Catat **BOT TOKEN**

### 2. Dapatkan Owner ID

1. Chat [@userinfobot](https://t.me/userinfobot)
2. Kirim `/start`
3. Catat **ID** kamu (angka)

### 3. Setup di VPS

```bash
cd vps-bot
npm install

# Setup .env
cp .env.example .env
nano .env
```

Isi .env:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
OWNER_ID=123456789
```

### 4. Jalankan Bot

```bash
npm start
```

### 5. Setup Microsoft via Telegram

Chat bot kamu, kirim commands:

```
/setup
/setclientid <your_client_id>
/setsecret <your_client_secret>
/settenant <your_tenant_id>
/setoutlook <your_email@outlook.com>
/startbot
```

## Owner Commands

| Command | Fungsi |
|---------|--------|
| `/setup` | Panduan setup |
| `/setclientid <id>` | Set Microsoft Client ID |
| `/setsecret <secret>` | Set Client Secret |
| `/settenant <id>` | Set Tenant ID |
| `/setoutlook <email>` | Set email yang dimonitor |
| `/setinterval <sec>` | Set polling interval |
| `/settings` | Lihat settings |
| `/startbot` | Mulai monitoring |
| `/stopbot` | Stop monitoring |
| `/adduser <id>` | Approve user |
| `/removeuser <id>` | Remove user |
| `/users` | List approved users |
| `/testmail` | Kirim test notification |

## User Commands

| Command | Fungsi |
|---------|--------|
| `/start` | Mulai bot |
| `/myid` | Lihat Telegram ID |
| `/status` | Cek status bot |

## User Approval Flow

1. User baru chat bot → dapat pesan "belum disetujui" + ID nya
2. User kirim ID ke owner
3. Owner ketik `/adduser <id>` → User ter-approve
4. User sekarang bisa terima notifikasi OTP

## Run dengan PM2

```bash
npm install -g pm2
pm2 start index.js --name otp-bot
pm2 startup
pm2 save
pm2 logs otp-bot
```

## Azure App Registration

1. Buka [portal.azure.com](https://portal.azure.com)
2. Cari "App registrations" → New registration
3. Nama: `OTP Bot`
4. Register

5. Catat:
   - Application (client) ID → `/setclientid`
   - Directory (tenant) ID → `/settenant`

6. Certificates & secrets → New client secret
   - Catat Value → `/setsecret`

7. API permissions → Add permission → Microsoft Graph:
   - `Mail.Read` (Application)
   - Grant admin consent

## Data Storage

Settings dan approved users disimpan di `data.json`:
```json
{
  "settings": {
    "ms_client_id": "...",
    "ms_client_secret": "...",
    "ms_tenant_id": "...",
    "ms_user_email": "...",
    "poll_interval": 30
  },
  "approved_users": ["owner_id", "user2_id"],
  "processed_emails": []
}
```
