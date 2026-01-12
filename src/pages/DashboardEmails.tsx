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
import { RefreshCw, Mail, Power } from "lucide-react";
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Accounts</h1>
            <p className="text-muted-foreground">
              Manage connected Outlook email accounts
            </p>
          </div>
          <Button onClick={fetchAccounts} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Connected Accounts
            </CardTitle>
            <CardDescription>
              Email accounts connected for auto-reply functionality
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
                    <TableHead>Token Expires</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading accounts...
                      </TableCell>
                    </TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Mail className="h-8 w-8 text-muted-foreground" />
                          <p>No email accounts connected</p>
                          <p className="text-sm text-muted-foreground">
                            Users can connect their Outlook accounts via the Telegram bot
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
                          {account.token_expires_at
                            ? new Date(account.token_expires_at).toLocaleString()
                            : "-"}
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
