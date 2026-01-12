/**
 * Cloudflare Email Worker
 * 
 * Deploy ini di Cloudflare Workers untuk forward email ke bot.
 * Setup:
 * 1. Buat Worker baru di Cloudflare Dashboard
 * 2. Paste code ini
 * 3. Set EMAIL_WEBHOOK_URL di environment variables
 * 4. Konfigurasi Email Routing di Cloudflare untuk domain kamu
 */

export interface Env {
  EMAIL_WEBHOOK_URL: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
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

      const result = await response.json() as {
        success: boolean;
        autoReply?: {
          enabled: boolean;
          message: string;
          from: string;
          to: string;
          subject: string;
        };
      };

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

function createMIMEMessage(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): EmailMessage {
  const encoder = new TextEncoder();
  const message = `From: ${params.from}
To: ${params.to}
Subject: ${params.subject}
Content-Type: text/plain; charset=utf-8
MIME-Version: 1.0

${params.body}`;

  return new EmailMessage(params.from, params.to, encoder.encode(message));
}

interface ForwardableEmailMessage {
  from: string;
  to: string;
  headers: Headers;
  raw: ReadableStream;
  rawSize: number;
  reply(message: EmailMessage): Promise<void>;
  forward(to: string): Promise<void>;
}

declare class EmailMessage {
  constructor(from: string, to: string, raw: Uint8Array);
}
