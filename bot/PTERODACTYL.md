# Pterodactyl Egg Setup

## Generic Node.js Egg

Untuk menjalankan bot ini di Pterodactyl, gunakan egg Node.js generic.

### Server Settings

| Setting | Value |
|---------|-------|
| Docker Image | `ghcr.io/pterodactyl/yolks:nodejs_18` |
| Startup Command | `npm start` |
| Working Directory | `/home/container` |

### Environment Variables

Tambahkan variables ini di panel Pterodactyl:

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Token dari @BotFather |
| `OWNER_ID` | Telegram ID kamu |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase |
| `PORT` | Port untuk webhook (default: 3000) |

### Installation Steps

1. Upload semua file dari folder `bot/` ke server
2. Atau clone dari Git repository
3. Bot akan auto-install dependencies saat startup

### Custom Startup Script

Jika perlu build TypeScript dulu:

```bash
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run build
npm start
```

### Port Allocation

Pastikan port yang digunakan (default 3000) sudah di-allocate di Pterodactyl untuk menerima webhook dari Cloudflare.
