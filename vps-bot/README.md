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

## 🔧 Cara Dapat Microsoft Graph API

### Langkah 1: Buat Azure Account (Gratis)

1. Buka [azure.microsoft.com](https://azure.microsoft.com)
2. Klik **Start free** atau **Sign in**
3. Login dengan akun Microsoft/Outlook yang emailnya mau dimonitor
4. Ikuti proses registrasi (kartu kredit diperlukan tapi TIDAK dicharge)

### Langkah 2: Buat App Registration

1. Buka [portal.azure.com](https://portal.azure.com)
2. Di search bar, ketik **"App registrations"** → klik
3. Klik **+ New registration**
4. Isi form:
   - **Name:** `OTP Bot` (bebas)
   - **Supported account types:** Pilih "Accounts in this organizational directory only"
   - **Redirect URI:** Kosongkan
5. Klik **Register**

### Langkah 3: Catat Credentials

Setelah register, kamu akan masuk ke halaman app. Catat:

| Nama | Lokasi |
|------|--------|
| **Client ID** | "Application (client) ID" di halaman Overview |
| **Tenant ID** | "Directory (tenant) ID" di halaman Overview |

### Langkah 4: Buat Client Secret

1. Di sidebar kiri, klik **Certificates & secrets**
2. Klik **+ New client secret**
3. Description: `OTP Bot Secret` (bebas)
4. Expires: Pilih **24 months** (maksimal)
5. Klik **Add**
6. ⚠️ **PENTING:** Langsung copy **Value** (bukan Secret ID!)
   - Value hanya muncul sekali, tidak bisa dilihat lagi!

### Langkah 5: Tambah API Permission

1. Di sidebar kiri, klik **API permissions**
2. Klik **+ Add a permission**
3. Pilih **Microsoft Graph**
4. Pilih **Application permissions** (BUKAN Delegated!)
5. Cari dan centang:
   - ✅ `Mail.Read`
6. Klik **Add permissions**
7. Klik **Grant admin consent for [Tenant Name]**
   - Klik **Yes** untuk konfirmasi
   - Pastikan status menjadi ✅ hijau "Granted"

### Langkah 6: Masukkan ke Bot

Chat bot di Telegram:
```
/setclient
```
Lalu masukkan:
1. Client ID
2. Client Secret (Value yang dicopy tadi)
3. Tenant ID
4. Email yang dimonitor
5. Interval check (dalam detik, default 30)

Selesai! Ketik `/startbot` untuk mulai monitoring.

---

## 🌐 Custom Domain (Pengganti IP:PORT)

Jika kamu mau akses bot via domain (misal: `bot.domain.com`) instead of `123.45.67.89:3000`:

### Langkah 1: Arahkan Domain ke VPS

Di domain provider (Cloudflare/Namecheap/dll), tambah DNS record:

| Type | Name | Content | TTL |
|------|------|---------|-----|
| A | bot | IP_VPS_KAMU | Auto |

Contoh: `bot.domain.com` → `123.45.67.89`

### Langkah 2: Install Nginx + SSL

```bash
# Install Nginx
sudo apt update
sudo apt install nginx -y

# Install Certbot untuk SSL gratis
sudo apt install certbot python3-certbot-nginx -y

# Buat config Nginx
sudo nano /etc/nginx/sites-available/otp-bot
```

Paste config ini:

```nginx
server {
    listen 80;
    server_name bot.domain.com;  # Ganti dengan domainmu

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Aktifkan config
sudo ln -s /etc/nginx/sites-available/otp-bot /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Dapatkan SSL Certificate (GRATIS!)
sudo certbot --nginx -d bot.domain.com
# Ikuti instruksi, pilih redirect HTTP ke HTTPS
```

### Langkah 3: Done!

Sekarang bisa akses:
- ❌ `http://123.45.67.89:3000`
- ✅ `https://bot.domain.com`

### Troubleshooting Domain

**Domain tidak bisa diakses?**
```bash
# Cek Nginx running
sudo systemctl status nginx

# Cek firewall
sudo ufw allow 80
sudo ufw allow 443

# Cek DNS propagation
nslookup bot.domain.com
```

**SSL error?**
```bash
# Renew certificate
sudo certbot renew --dry-run
```

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
