import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Bot, Shield, Mail, Save, ExternalLink } from "lucide-react";

interface BotSettings {
  bot_token?: string;
  owner_id?: string;
  sheerid_program_id?: string;
  ms_client_id?: string;
  ms_client_secret?: string;
  webhook_url?: string;
}

export default function DashboardSettings() {
  const [settings, setSettings] = useState<BotSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bot_settings")
        .select("key, value");

      if (error) throw error;

      const settingsObj: BotSettings = {};
      data?.forEach((item) => {
        const val = item.value as Record<string, string> | null;
        settingsObj[item.key as keyof BotSettings] = val?.value || "";
      });
      setSettings(settingsObj);
    } catch (error: any) {
      toast.error("Failed to fetch settings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("bot_settings")
        .upsert(
          {
            key,
            value: { value },
            description: getSettingDescription(key),
          },
          { onConflict: "key" }
        );

      if (error) throw error;

      toast.success("Setting saved");
    } catch (error: any) {
      toast.error("Failed to save setting: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      bot_token: "Telegram Bot API Token",
      owner_id: "Owner Telegram User ID",
      sheerid_program_id: "SheerID Program ID for verification",
      ms_client_id: "Microsoft Graph API Client ID",
      ms_client_secret: "Microsoft Graph API Client Secret",
      webhook_url: "Telegram Webhook URL",
    };
    return descriptions[key] || key;
  };

  const handleChange = (key: keyof BotSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const webhookUrl = `${window.location.origin}/functions/v1/telegram-webhook`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your Auto Reply AI Bot
          </p>
        </div>

        <div className="grid gap-6">
          {/* Telegram Bot Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Telegram Bot
              </CardTitle>
              <CardDescription>
                Configure your Telegram bot credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot_token">Bot Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="bot_token"
                    type="password"
                    placeholder="Enter your bot token from @BotFather"
                    value={settings.bot_token || ""}
                    onChange={(e) => handleChange("bot_token", e.target.value)}
                  />
                  <Button
                    onClick={() => saveSetting("bot_token", settings.bot_token || "")}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your bot token from{" "}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @BotFather
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_id">Owner ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="owner_id"
                    placeholder="Your Telegram User ID"
                    value={settings.owner_id || ""}
                    onChange={(e) => handleChange("owner_id", e.target.value)}
                  />
                  <Button
                    onClick={() => saveSetting("owner_id", settings.owner_id || "")}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your ID from{" "}
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @userinfobot
                  </a>
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="bg-muted font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success("Webhook URL copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set this URL as your Telegram bot webhook
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SheerID Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Military Verification (SheerID)
              </CardTitle>
              <CardDescription>
                Configure SheerID for military verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sheerid_program_id">Program ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="sheerid_program_id"
                    placeholder="Your SheerID Program ID"
                    value={settings.sheerid_program_id || ""}
                    onChange={(e) => handleChange("sheerid_program_id", e.target.value)}
                  />
                  <Button
                    onClick={() =>
                      saveSetting("sheerid_program_id", settings.sheerid_program_id || "")
                    }
                    disabled={saving}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Microsoft Graph Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Microsoft Graph API (Outlook)
              </CardTitle>
              <CardDescription>
                Configure Microsoft Graph API for email integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ms_client_id">Client ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="ms_client_id"
                    placeholder="Microsoft App Client ID"
                    value={settings.ms_client_id || ""}
                    onChange={(e) => handleChange("ms_client_id", e.target.value)}
                  />
                  <Button
                    onClick={() => saveSetting("ms_client_id", settings.ms_client_id || "")}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ms_client_secret">Client Secret</Label>
                <div className="flex gap-2">
                  <Input
                    id="ms_client_secret"
                    type="password"
                    placeholder="Microsoft App Client Secret"
                    value={settings.ms_client_secret || ""}
                    onChange={(e) => handleChange("ms_client_secret", e.target.value)}
                  />
                  <Button
                    onClick={() =>
                      saveSetting("ms_client_secret", settings.ms_client_secret || "")
                    }
                    disabled={saving}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Register your app at the{" "}
                <a
                  href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Azure Portal <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
