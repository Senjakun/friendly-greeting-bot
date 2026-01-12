import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Mail, Power, Cloud, Copy } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type EmailAccount = Database["public"]["Tables"]["email_accounts"]["Row"];

export default function DashboardEmails() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch email accounts: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const toggleActive = async (account: EmailAccount) => {
    try {
      const { error } = await supabase
        .from("email_accounts")
        .update({ is_active: !account.is_active })
        .eq("id", account.id);

      if (error) throw error;

      toast.success(
        account.is_active ? "Account deactivated" : "Account activated"
      );
      fetchAccounts();
    } catch (error: any) {
      toast.error("Failed to update account: " + error.message);
    }
  };

  const toggleAutoReply = async (account: EmailAccount) => {
    try {
      const { error } = await supabase
        .from("email_accounts")
        .update({ auto_reply_enabled: !account.auto_reply_enabled })
        .eq("id", account.id);

      if (error) throw error;

      toast.success(
        account.auto_reply_enabled
          ? "Auto-reply disabled"
          : "Auto-reply enabled"
      );
      fetchAccounts();
    } catch (error: any) {
      toast.error("Failed to update account: " + error.message);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Accounts</h1>
            <p className="text-muted-foreground">
              Manage email accounts dari Cloudflare Email Forwarder
            </p>
          </div>
          <Button onClick={fetchAccounts} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Cloudflare Webhook Info */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Cloud className="h-5 w-5" />
              Cloudflare Email Worker Setup
            </CardTitle>
            <CardDescription>
              Forward email dari Cloudflare ke webhook ini untuk auto-reply
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Webhook URL:</label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm break-all">
                  {webhookUrl}
                </code>
                <Button size="sm" variant="outline" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium mb-2">Contoh Cloudflare Worker:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`export default {
  async email(message, env, ctx) {
    const emailData = {
      from: message.from,
      to: message.to,
      subject: message.headers.get("subject"),
      // Add more fields as needed
    };
    
    const response = await fetch("${webhookUrl}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailData),
    });
    
    const result = await response.json();
    
    if (result.autoReply?.enabled) {
      // Send auto-reply using Cloudflare MailChannels
      // or forward to another service
    }
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Connected Accounts
            </CardTitle>
            <CardDescription>
              Email accounts yang akan menerima auto-reply
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auto-Reply</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading accounts...
                      </TableCell>
                    </TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Mail className="h-8 w-8 text-muted-foreground" />
                          <p>No email accounts connected</p>
                          <p className="text-sm text-muted-foreground">
                            Users dapat connect email via Telegram bot
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={account.is_active ? "default" : "secondary"}
                          >
                            {account.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={account.auto_reply_enabled}
                              onCheckedChange={() => toggleAutoReply(account)}
                            />
                            <span className="text-sm">
                              {account.auto_reply_enabled ? "On" : "Off"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(account.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={account.is_active ? "destructive" : "outline"}
                            onClick={() => toggleActive(account)}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
