# Tutorial Lengkap: Setup Cloudflare Email Worker

## Daftar Isi
1. [Persiapan](#1-persiapan)
2. [Setup Domain di Cloudflare](#2-setup-domain-di-cloudflare)
3. [Buat Worker](#3-buat-worker)
4. [Setup Email Routing](#4-setup-email-routing)
5. [Konfigurasi Bot](#5-konfigurasi-bot)
6. [Testing](#6-testing)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Persiapan

### Yang Dibutuhkan:
- ✅ Domain sendiri (contoh: `example.com`)
- ✅ Akun Cloudflare (gratis)
- ✅ Bot sudah running di Pterodactyl
- ✅ IP/Domain Pterodactyl yang bisa diakses dari internet

### Opsional tapi Direkomendasikan:
- Cloudflare Tunnel (jika tidak punya IP publik)

---

## 2. Setup Domain di Cloudflare

### Langkah 2.1: Tambah Domain ke Cloudflare

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Klik **"Add a Site"**
3. Masukkan nama domain kamu (contoh: `example.com`)
4. Pilih plan **Free**
5. Cloudflare akan scan DNS records yang ada

### Langkah 2.2: Update Nameservers

1. Setelah menambahkan site, Cloudflare akan memberikan 2 nameservers:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```
2. Pergi ke domain registrar kamu (tempat beli domain)
3. Update nameservers ke yang diberikan Cloudflare
4. Tunggu propagasi DNS (bisa sampai 24 jam, biasanya 1-2 jam)

### Langkah 2.3: Verifikasi Domain Aktif

1. Di Cloudflare Dashboard, buka domain kamu
2. Pastikan status menunjukkan **"Active"** (centang hijau)

---

## 3. Buat Worker

### Langkah 3.1: Buka Workers & Pages

1. Di Cloudflare Dashboard, klik **"Workers & Pages"** di sidebar kiri
2. Klik **"Create application"**
3. Pilih **"Create Worker"**
4. Beri nama, contoh: `email-forwarder`
5. Klik **"Deploy"**

### Langkah 3.2: Edit Worker Code

1. Setelah deploy, klik **"Edit code"**
2. Hapus semua code yang ada
3. Copy-paste code berikut:

```javascript
export default {
  async email(message, env) {
    // Extract email content
    const rawEmail = await new Response(message.raw).text();
    
    // Parse basic info
    const payload = {
      from: message.from,
      to: message.to,
      subject: message.headers.get("subject") || "No Subject",
      raw: rawEmail,
      timestamp: new Date().toISOString(),
    };

    try {
      // Send to your bot webhook
      const response = await fetch(env.EMAIL_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // Send auto-reply if enabled
      if (result.success && result.autoReply?.enabled) {
        const replyMessage = createMIMEMessage({
          from: result.autoReply.from,
          to: result.autoReply.to,
          subject: result.autoReply.subject,
          body: result.autoReply.message,
        });

        await message.reply(replyMessage);
      }
    } catch (error) {
      console.error("Failed to process email:", error);
    }
  },
};

function createMIMEMessage(params) {
  const encoder = new TextEncoder();
  const message = `From: ${params.from}
To: ${params.to}
Subject: ${params.subject}
Content-Type: text/plain; charset=utf-8
MIME-Version: 1.0

${params.body}`;

  return new EmailMessage(params.from, params.to, encoder.encode(message));
}
```

4. Klik **"Save and Deploy"**

### Langkah 3.3: Set Environment Variable

1. Di halaman Worker, klik tab **"Settings"**
2. Scroll ke bagian **"Variables and Secrets"**
3. Klik **"Add"** di bagian Environment Variables
4. Tambahkan:
   - **Variable name**: `EMAIL_WEBHOOK_URL`
   - **Value**: `http://IP_PTERODACTYL:PORT/email-webhook`
   
   Contoh nilai:
   ```
   http://123.456.789.10:3000/email-webhook
   ```
   
   Atau jika pakai domain:
   ```
   https://bot.example.com/email-webhook
   ```

5. Klik **"Save and Deploy"**

---

## 4. Setup Email Routing

### Langkah 4.1: Aktifkan Email Routing

1. Di Cloudflare Dashboard, pilih domain kamu
2. Di sidebar, klik **"Email"** → **"Email Routing"**
3. Klik **"Get started"** atau **"Enable Email Routing"**
4. Cloudflare akan menambahkan DNS records secara otomatis:
   - MX record pointing to Cloudflare
   - TXT record untuk SPF

### Langkah 4.2: Tambah Destination Address (Opsional)

Ini untuk verifikasi bahwa email routing bekerja:

1. Di tab **"Destination addresses"**
2. Klik **"Add destination address"**
3. Masukkan email pribadi kamu untuk testing
4. Verifikasi email yang dikirim ke email tersebut

### Langkah 4.3: Setup Routing Rules

1. Di tab **"Routing rules"**
2. Klik **"Create address"** atau **"Add rule"**

#### Opsi A: Catch-All (Semua Email)
Untuk menerima email dari alamat apapun:

1. Klik **"Catch-all address"**
2. Action: **"Send to a Worker"**
3. Pilih Worker yang tadi dibuat (`email-forwarder`)
4. Klik **"Save"**

#### Opsi B: Email Spesifik
Untuk email tertentu saja:

1. Klik **"Create address"**
2. Custom address: masukkan prefix, contoh: `support`
   - Ini akan jadi `support@example.com`
3. Action: **"Send to a Worker"**
4. Pilih Worker yang tadi dibuat
5. Klik **"Save"**

---

## 5. Konfigurasi Bot

### Langkah 5.1: Pastikan Bot Accessible

Bot harus bisa diakses dari internet. Beberapa opsi:

#### Opsi A: IP Publik
Jika Pterodactyl punya IP publik:
```
EMAIL_WEBHOOK_URL=http://IP_PUBLIK:3000/email-webhook
```

#### Opsi B: Port Forwarding
Jika di belakang router:
1. Forward port 3000 (atau port yang dipakai) ke IP lokal Pterodactyl
2. Gunakan IP publik router

#### Opsi C: Cloudflare Tunnel (Recommended)
Jika tidak punya IP publik:

1. Install `cloudflared` di server
2. Buat tunnel:
   ```bash
   cloudflared tunnel create bot-tunnel
   cloudflared tunnel route dns bot-tunnel bot.example.com
   ```
3. Konfigurasi tunnel untuk forward ke `localhost:3000`
4. Gunakan:
   ```
   EMAIL_WEBHOOK_URL=https://bot.example.com/email-webhook
   ```

### Langkah 5.2: Update .env Bot

```env
BOT_TOKEN=your_telegram_bot_token
OWNER_ID=your_telegram_user_id
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3000
```

### Langkah 5.3: Daftarkan Email di Database

Di Supabase, insert email account:

```sql
-- Pertama, dapatkan user ID dari telegram_users
SELECT id FROM telegram_users WHERE telegram_id = YOUR_TELEGRAM_ID;

-- Kemudian insert email account
INSERT INTO email_accounts (telegram_user_id, email, auto_reply_enabled, auto_reply_message, is_active)
VALUES (
  'USER_ID_DARI_QUERY_ATAS',
  'support@example.com',
  true,
  'Terima kasih atas email Anda. Kami akan segera merespons.',
  true
);
```

---

## 6. Testing

### Test 1: Health Check
Buka browser dan akses:
```
http://IP_PTERODACTYL:PORT/health
```
Harus return: `OK`

### Test 2: Kirim Test Email
1. Kirim email ke alamat yang sudah dikonfigurasi (contoh: `support@example.com`)
2. Cek Telegram, harusnya muncul notifikasi
3. Pengirim email harus menerima auto-reply (jika enabled)

### Test 3: Cek Worker Logs
1. Di Cloudflare Dashboard → Workers → Worker kamu
2. Klik tab **"Logs"**
3. Klik **"Begin log stream"**
4. Kirim test email dan lihat logs

---

## 7. Troubleshooting

### Error: "Failed to fetch" di Worker

**Penyebab**: Bot tidak bisa diakses dari internet

**Solusi**:
1. Pastikan port di-allow di firewall
2. Cek apakah bot running: `curl http://localhost:3000/health`
3. Coba pakai Cloudflare Tunnel

### Error: "No email account found"

**Penyebab**: Email tidak terdaftar di database

**Solusi**:
1. Pastikan email address persis sama dengan yang di-routing
2. Pastikan `is_active = true` dan `auto_reply_enabled = true`
3. Pastikan user status `approved` dan belum expired

### Tidak Menerima Notifikasi Telegram

**Penyebab**: Bot token atau chat ID salah

**Solusi**:
1. Pastikan `BOT_TOKEN` valid
2. User harus sudah `/start` bot
3. User harus sudah di-`/approve` oleh owner

### Auto-Reply Tidak Terkirim

**Penyebab**: SPF/DKIM tidak dikonfigurasi

**Solusi**:
Cloudflare Email Routing sudah handle ini otomatis, tapi pastikan:
1. Email Routing status "Active"
2. DNS records MX dan TXT sudah ter-setup

### Worker Timeout

**Penyebab**: Bot terlalu lama merespons

**Solusi**:
1. Cek koneksi database (Supabase)
2. Optimalkan query database
3. Pastikan bot tidak overloaded

---

## Diagram Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         EMAIL FLOW                               │
└─────────────────────────────────────────────────────────────────┘

    Pengirim                Cloudflare              Pterodactyl
    ────────                ──────────              ───────────
        │                        │                       │
        │  1. Kirim email ke     │                       │
        │     support@domain.com │                       │
        │───────────────────────>│                       │
        │                        │                       │
        │                        │  2. Email Routing     │
        │                        │     trigger Worker    │
        │                        │                       │
        │                        │  3. Worker POST ke    │
        │                        │     /email-webhook    │
        │                        │──────────────────────>│
        │                        │                       │
        │                        │                       │ 4. Bot:
        │                        │                       │    - Log email
        │                        │                       │    - Kirim notif
        │                        │                       │      Telegram
        │                        │                       │
        │                        │  5. Response dengan   │
        │                        │     auto-reply config │
        │                        │<──────────────────────│
        │                        │                       │
        │  6. Auto-reply email   │                       │
        │<───────────────────────│                       │
        │                        │                       │
```

---

## Checklist Setup

- [ ] Domain sudah aktif di Cloudflare
- [ ] Worker sudah dibuat dan di-deploy
- [ ] Environment variable `EMAIL_WEBHOOK_URL` sudah di-set
- [ ] Email Routing sudah aktif
- [ ] Routing rule ke Worker sudah dibuat
- [ ] Bot running di Pterodactyl
- [ ] Bot accessible dari internet
- [ ] Email account terdaftar di database
- [ ] User sudah approved

---

## Catatan Penting

1. **HTTPS Recommended**: Gunakan HTTPS untuk webhook URL (bisa pakai Cloudflare Tunnel)
2. **Rate Limiting**: Cloudflare Email Routing ada limit 100 emails/day di plan Free
3. **Size Limit**: Email max 25MB
4. **Monitoring**: Cek Worker analytics untuk monitor penggunaan
