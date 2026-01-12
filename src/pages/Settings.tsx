import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Mail, Save, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type EmailAccount = Tables<"email_accounts">;

export default function Settings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [email, setEmail] = useState("");
  const [autoReplyMessage, setAutoReplyMessage] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEmailAccount();
    }
  }, [user]);

  const fetchEmailAccount = async () => {
    const { data } = await supabase
      .from("email_accounts")
      .select("*")
      .limit(1);
    
    if (data && data.length > 0) {
      setEmailAccount(data[0]);
      setEmail(data[0].email);
      setAutoReplyMessage(data[0].auto_reply_message || "");
      setAutoReplyEnabled(data[0].auto_reply_enabled);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!email.trim()) {
      toast.error("Email tidak boleh kosong");
      return;
    }

    setIsSaving(true);

    // Get profile first
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user!.id)
      .single();

    if (!profile) {
      toast.error("Profile tidak ditemukan");
      setIsSaving(false);
      return;
    }

    if (emailAccount) {
      // Update existing
      const { error } = await supabase
        .from("email_accounts")
        .update({
          email: email.trim().toLowerCase(),
          auto_reply_message: autoReplyMessage.trim(),
          auto_reply_enabled: autoReplyEnabled,
        })
        .eq("id", emailAccount.id);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Pengaturan berhasil disimpan");
      }
    } else {
      // Get telegram_user first (we need to link it)
      // For now, create without telegram_user_id since this is web-based
      const { error } = await supabase
        .from("email_accounts")
        .insert({
          email: email.trim().toLowerCase(),
          auto_reply_message: autoReplyMessage.trim(),
          auto_reply_enabled: autoReplyEnabled,
        });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Email berhasil didaftarkan");
        fetchEmailAccount();
      }
    }

    setIsSaving(false);
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Pengaturan</h1>
            <p className="text-xs text-muted-foreground">Konfigurasi email dan auto-reply</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Pengaturan Email</CardTitle>
            </div>
            <CardDescription>
              Konfigurasi email untuk menerima notifikasi dari Cloudflare Email Routing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Domain</Label>
              <Input
                id="email"
                type="email"
                placeholder="support@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Email yang akan menerima notifikasi dari Cloudflare Email Routing
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Reply</Label>
                <p className="text-xs text-muted-foreground">
                  Kirim balasan otomatis untuk setiap email masuk
                </p>
              </div>
              <Switch
                checked={autoReplyEnabled}
                onCheckedChange={setAutoReplyEnabled}
              />
            </div>

            {autoReplyEnabled && (
              <div className="space-y-2">
                <Label htmlFor="autoReplyMessage">Pesan Auto Reply</Label>
                <Textarea
                  id="autoReplyMessage"
                  placeholder="Terima kasih atas email Anda. Saya akan membalas secepatnya."
                  value={autoReplyMessage}
                  onChange={(e) => setAutoReplyMessage(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan Pengaturan
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Setup Cloudflare Email Routing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>1. Buka Cloudflare Dashboard → Email Routing</p>
            <p>2. Tambahkan Email Route dengan destination ke webhook:</p>
            <code className="block p-3 bg-muted rounded-lg text-xs break-all">
              {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-webhook`}
            </code>
            <p>3. Email yang masuk akan otomatis diteruskan ke sistem ini</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
