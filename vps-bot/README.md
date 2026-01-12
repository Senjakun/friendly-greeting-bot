# 🤖 OTP Telegram Bot

Bot Telegram untuk menerima notifikasi OTP dari email Outlook/Microsoft 365.

## ✨ Fitur

- ✅ **Web Setup Wizard** - Konfigurasi via browser, tanpa edit file
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

## 🌐 Setup via Browser

Setelah install, buka browser:

```
http://YOUR_VPS_IP:3000
```

Isi:
1. **Bot Token** - Dari @BotFather
2. **Owner ID** - Dari @userinfobot

Klik "Setup Bot" dan selesai! 🎉

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
├── ecosystem.config.cjs # PM2 config
├── config.json        # Bot token & owner ID (auto-generated)
└── data.json          # Settings & users (auto-generated)
```

---

## 🛡️ Security Notes

- Client Secret otomatis dihapus dari chat setelah dikirim
- config.json berisi credential, jangan share!
- Hanya owner yang bisa approve/revoke user
- Setup wizard otomatis tutup setelah konfigurasi selesai

---

## ❓ Troubleshooting

**Port 3000 tidak bisa diakses?**
```bash
sudo ufw allow 3000
# atau
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

**Bot tidak jalan setelah restart VPS?**
```bash
pm2 startup
pm2 save
```

**Error "Auth error"?**
- Pastikan Client ID, Secret, dan Tenant ID benar
- Pastikan API permission sudah di-grant admin consent

---

## 📞 Support

Buat issue di GitHub jika ada masalah.
