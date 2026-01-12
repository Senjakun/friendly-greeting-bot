# Telegram Bot - Auto Reply

Bot Telegram untuk auto-reply email.

## Environment Variables

```env
# Telegram Bot
BOT_TOKEN=your_telegram_bot_token_from_botfather
OWNER_ID=your_telegram_id_number

# API (Edge Function URL)
API_URL=https://ubgjcqgqlzzdnywjjhew.supabase.co/functions/v1/bot-api

# Server (optional, default 3000)
PORT=3000
```

## Setup

### 1. Buat file `.env`

```bash
cp .env.example .env
```

Isi dengan nilai yang benar:
- `BOT_TOKEN`: Dapat dari @BotFather di Telegram
- `OWNER_ID`: Telegram ID kamu (dapat dari @userinfobot)
- `API_URL`: URL Edge Function (sudah terisi default)

### 2. Install Dependencies

```bash
npm install
```

### 3. Build & Run

```bash
npm run build
npm start
```

## Arsitektur

Bot menggunakan **Edge Function API** - tidak perlu service_role_key.

```
┌─────────────┐    HTTP     ┌──────────────┐    SQL    ┌──────────┐
│ Telegram    │ ─────────▶  │ Edge         │ ────────▶ │ Database │
│ Bot         │             │ Function API │           │          │
│ (Pterodactyl)│ ◀───────── │ (bot-api)    │ ◀──────── │          │
└─────────────┘   Response  └──────────────┘           └──────────┘
```

**Keuntungan:**
- ✅ Tidak perlu `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Lebih aman (secret tidak di server eksternal)
- ✅ Mudah di-deploy di Pterodactyl

## Commands

### User Commands
- `/start` - Mulai bot
- `/verify` - Verifikasi akun
- `/status` - Cek status akun
- `/setemail` - Daftarkan email
- `/setreply` - Set pesan auto-reply
- `/myemail` - Lihat email terdaftar
- `/inbox` - Lihat email terakhir
- `/help` - Tampilkan bantuan

### Owner Commands
- `/approve <id> [days]` - Approve user
- `/revoke <id>` - Revoke user
- `/users` - Lihat semua users
- `/broadcast <msg>` - Broadcast pesan
