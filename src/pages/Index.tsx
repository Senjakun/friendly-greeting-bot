import { Bot, MessageSquare, Mail, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  // TODO: Ganti dengan username bot Telegram kamu
  const TELEGRAM_BOT_USERNAME = "YourBotUsername";
  const telegramBotUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="text-center max-w-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
          <Bot className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-4 text-4xl font-bold">🎖️ Auto Reply AI Bot</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Bot Telegram untuk auto-reply email dengan Cloudflare Email Workers
        </p>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card className="text-left">
            <CardHeader className="pb-2">
              <Shield className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Verifikasi User</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Approve/reject user via bot Telegram</CardDescription>
            </CardContent>
          </Card>
          <Card className="text-left">
            <CardHeader className="pb-2">
              <Mail className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Email Auto-Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Cloudflare Email Workers integration</CardDescription>
            </CardContent>
          </Card>
          <Card className="text-left">
            <CardHeader className="pb-2">
              <MessageSquare className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Notifikasi Telegram</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Terima notifikasi email masuk di Telegram</CardDescription>
            </CardContent>
          </Card>
        </div>

        <Button asChild size="lg" className="gap-2">
          <a href={telegramBotUrl} target="_blank" rel="noopener noreferrer">
            <Bot className="h-5 w-5" />
            Buka Bot Telegram
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>

        <div className="mt-12 p-6 bg-card rounded-lg border text-left">
          <h2 className="text-lg font-semibold mb-4">📋 Perintah Bot</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <code className="bg-muted px-2 py-1 rounded">/start</code>
              <span className="text-muted-foreground">- Mulai bot dan daftar</span>
            </div>
            <div className="flex gap-2">
              <code className="bg-muted px-2 py-1 rounded">/verify</code>
              <span className="text-muted-foreground">- Verifikasi akun</span>
            </div>
            <div className="flex gap-2">
              <code className="bg-muted px-2 py-1 rounded">/status</code>
              <span className="text-muted-foreground">- Cek status akun</span>
            </div>
            <div className="flex gap-2">
              <code className="bg-muted px-2 py-1 rounded">/inbox</code>
              <span className="text-muted-foreground">- Lihat email terakhir</span>
            </div>
            <div className="flex gap-2">
              <code className="bg-muted px-2 py-1 rounded">/help</code>
              <span className="text-muted-foreground">- Bantuan</span>
            </div>
          </div>
          
          <h3 className="text-md font-semibold mt-6 mb-3">👑 Owner Commands</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <code className="bg-muted px-2 py-1 rounded">/approve [id]</code>
              <span className="text-muted-foreground">- Approve user</span>
            </div>
            <div className="flex gap-2">
              <code className="bg-muted px-2 py-1 rounded">/revoke [id]</code>
              <span className="text-muted-foreground">- Revoke user</span>
            </div>
            <div className="flex gap-2">
              <code className="bg-muted px-2 py-1 rounded">/users</code>
              <span className="text-muted-foreground">- Lihat semua users</span>
            </div>
            <div className="flex gap-2">
              <code className="bg-muted px-2 py-1 rounded">/broadcast [msg]</code>
              <span className="text-muted-foreground">- Kirim pesan ke semua</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
