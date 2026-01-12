# Auto Reply AI Bot - Pterodactyl Standalone

Bot Telegram untuk auto-reply email dengan Cloudflare Email Workers.

## Requirements

- Node.js 18+ atau Deno
- Supabase account (untuk database)
- Telegram Bot Token
- Cloudflare account (untuk email workers)

## Setup

### 1. Environment Variables

Copy `.env.example` ke `.env` dan isi:

```bash
cp .env.example .env
```

Edit `.env`:
```
BOT_TOKEN=your_telegram_bot_token
OWNER_ID=your_telegram_user_id
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Setup

Jalankan SQL di Supabase SQL Editor:

```sql
-- Lihat file database/schema.sql
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Bot

```bash
npm start
```

Atau dengan Deno:
```bash
deno run --allow-net --allow-env bot.ts
```

## Pterodactyl Egg

Untuk Pterodactyl, gunakan egg Node.js generic dan set:
- Startup Command: `npm start`
- Node Version: 18+

## Cloudflare Email Worker

Setup webhook di Cloudflare untuk forward email ke endpoint:
```
POST https://your-server.com/email-webhook
```

## Commands

### User Commands
- `/start` - Mulai bot dan daftar
- `/verify` - Verifikasi akun
- `/status` - Cek status akun
- `/inbox` - Lihat email terakhir
- `/help` - Bantuan

### Owner Commands
- `/approve [telegram_id]` - Approve user
- `/revoke [telegram_id]` - Revoke user access
- `/users` - Lihat semua users
- `/broadcast [message]` - Kirim pesan ke semua approved users
