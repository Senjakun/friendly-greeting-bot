# Setup Email Cloudflare → Telegram (Simpel!)

## Cara Kerja

```
📧 Email masuk ke alamat@domain.com
        ↓
☁️ Cloudflare Email Routing
        ↓
⚡ Supabase Edge Function (sudah online!)
        ↓
💾 Simpan ke Database + Kirim notifikasi ke Telegram
        ↓
📱 Kamu terima notifikasi di Telegram + pengirim dapat auto-reply
```

**Yang kamu butuhkan:**
- ✅ Domain di Cloudflare (gratis)
- ✅ Akun Cloudflare (gratis)

**Yang SUDAH ADA:**
- ✅ Supabase Edge Function (`email-webhook`) - webhook penerima email
- ✅ Bot Telegram - untuk notifikasi

**Yang TIDAK perlu:**
- ❌ Expose Pterodactyl ke internet
- ❌ Setup reverse proxy / Cloudflare Tunnel
- ❌ IP publik

---

## Langkah 1: Setup Domain di Cloudflare

### 1.1 Tambah Domain

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Klik **"Add a Site"**
3. Masukkan domain (contoh: `example.com`)
4. Pilih plan **Free**

### 1.2 Update Nameservers

1. Cloudflare kasih 2 nameservers, contoh:
   ```
   ada.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
2. Pergi ke tempat beli domain (registrar)
3. Ganti nameservers ke yang dari Cloudflare
4. Tunggu propagasi (1-24 jam)

### 1.3 Verifikasi

Di Cloudflare Dashboard, pastikan domain status **"Active"** ✅

---

## Langkah 2: Buat Worker

### 2.1 Buat Worker Baru

1. Di sidebar, klik **"Workers & Pages"**
2. Klik **"Create"**
3. Pilih **"Create Worker"**
4. Nama: `email-forwarder`
5. Klik **"Deploy"**

### 2.2 Edit Code

1. Klik **"Edit code"**
2. Hapus semua, paste ini:

```javascript
export default {
  async email(message, env) {
    const rawEmail = await new Response(message.raw).text();
    
    // Ganti URL ini dengan URL Supabase Edge Function kamu
    const WEBHOOK_URL = "https://ubgjcqgqlzzdnywjjhew.supabase.co/functions/v1/email-webhook";
    
    const payload = {
      from: message.from,
      to: message.to,
      subject: message.headers.get("subject") || "No Subject",
      raw: rawEmail,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // Kirim auto-reply jika enabled
      if (result.success && result.autoReply?.enabled) {
        const replyMessage = createMIMEMessage({
          from: message.to,  // Balas dari alamat tujuan
          to: result.autoReply.replyTo,
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
  const msg = `From: ${params.from}
To: ${params.to}
Subject: ${params.subject}
Content-Type: text/plain; charset=utf-8
MIME-Version: 1.0

${params.body}`;
  return new EmailMessage(params.from, params.to, encoder.encode(msg));
}
```

3. Klik **"Save and Deploy"**

---

## Langkah 3: Setup Email Routing

### 3.1 Aktifkan Email Routing

1. Pilih domain kamu di Cloudflare
2. Sidebar → **"Email"** → **"Email Routing"**
3. Klik **"Get started"** atau **"Enable Email Routing"**
4. DNS records akan ditambahkan otomatis

### 3.2 Buat Routing Rule

1. Tab **"Routing rules"**
2. Klik **"Create address"** atau setup **"Catch-all"**

**Opsi A: Email Spesifik**
- Custom address: `support` (jadi `support@domain.com`)
- Action: **"Send to a Worker"**
- Pilih: `email-forwarder`

**Opsi B: Catch-All (Semua Email)**
- Klik **"Catch-all address"**
- Action: **"Send to a Worker"**
- Pilih: `email-forwarder`

3. Klik **"Save"**

---

## Langkah 4: Daftarkan Email di Database

Kamu perlu daftarkan email di database supaya bot tahu kirim notifikasi ke siapa.

### Via Bot Telegram (Recommended)

Kirim command ke bot:
```
/setemail support@domain.com
```

### Via SQL (Manual)

```sql
-- 1. Cari user ID kamu
SELECT id, telegram_id FROM telegram_users WHERE telegram_id = 123456789;

-- 2. Daftarkan email
INSERT INTO email_accounts (telegram_user_id, email, auto_reply_enabled, auto_reply_message, is_active)
VALUES (
  'UUID_DARI_QUERY_ATAS',
  'support@domain.com',
  true,
  'Terima kasih atas email Anda. Saya akan segera membalas.',
  true
);
```

---

## Langkah 5: Set BOT_TOKEN di Supabase

Edge Function butuh BOT_TOKEN untuk kirim notifikasi ke Telegram.

Ini sudah diset jika kamu pakai Lovable Cloud. Kalau belum:

1. Buka Lovable → Settings → Secrets
2. Tambah: `BOT_TOKEN` = token bot Telegram kamu

---

## Testing

1. Kirim email ke `support@domain.com` (atau alamat yang kamu setup)
2. Tunggu beberapa detik
3. Cek Telegram - harusnya dapat notifikasi 📧
4. Pengirim email dapat auto-reply

---

## Troubleshooting

### Tidak dapat notifikasi di Telegram

1. **Cek user approved** - pastikan status kamu `approved` di database
2. **Cek BOT_TOKEN** - pastikan secret BOT_TOKEN sudah diset
3. **Cek email terdaftar** - pastikan email ada di `email_accounts` dengan `is_active = true`

### Email tidak masuk

1. **Cek Email Routing aktif** - di Cloudflare harus status Active
2. **Cek Routing Rule** - pastikan sudah point ke Worker
3. **Cek Worker logs** - di Cloudflare Workers → Logs

### Auto-reply tidak terkirim

1. **Cek auto_reply_enabled** - harus `true` di database
2. **Cek Worker logs** - lihat error apa

---

## Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Pengirim   │     │  Cloudflare  │     │   Supabase   │     │   Telegram   │
│    Email     │     │   Worker     │     │Edge Function │     │     Bot      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ 1. Kirim email     │                    │                    │
       │ ke support@domain  │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ 2. POST ke webhook │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │ 3. Simpan log      │
       │                    │                    │    + kirim notif   │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │                    │ 4. User dapat
       │                    │                    │                    │    notifikasi
       │                    │                    │                    │
       │                    │ 5. Return auto-    │                    │
       │                    │    reply config    │                    │
       │                    │<───────────────────│                    │
       │                    │                    │                    │
       │ 6. Auto-reply      │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
```

---

## Checklist

- [ ] Domain aktif di Cloudflare
- [ ] Worker `email-forwarder` sudah deploy
- [ ] Email Routing aktif
- [ ] Routing rule ke Worker sudah dibuat
- [ ] Email terdaftar di database (`email_accounts`)
- [ ] User status `approved`
- [ ] Secret `BOT_TOKEN` sudah diset

---

## Notes

- **Gratis**: Cloudflare Email Routing limit 100 emails/day di plan Free
- **Pterodactyl**: Tidak perlu diakses dari internet sama sekali! Cukup untuk jalankan bot Telegram (command handler)
- **Supabase Edge Function**: Ini yang handle webhook, sudah online otomatis
