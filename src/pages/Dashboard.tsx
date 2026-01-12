import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Mail, Inbox, LogOut, Settings, Shield, RefreshCw } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type EmailLog = Tables<"email_logs">;
type EmailAccount = Tables<"email_accounts">;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, signOut } = useAuth();
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Get user's email account
    const { data: accounts } = await supabase
      .from("email_accounts")
      .select("*")
      .limit(1);
    
    if (accounts && accounts.length > 0) {
      setEmailAccount(accounts[0]);
      
      // Get email logs for this account
      const { data: logs } = await supabase
        .from("email_logs")
        .select("*")
        .eq("email_account_id", accounts[0].id)
        .order("replied_at", { ascending: false })
        .limit(20);
      
      setEmails(logs || []);
    }
    
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Email Notifier</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Email Terdaftar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{emailAccount?.email || "-"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Auto Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={emailAccount?.auto_reply_enabled ? "default" : "secondary"}>
                {emailAccount?.auto_reply_enabled ? "Aktif" : "Nonaktif"}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Email Diterima</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{emails.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Inbox */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                <CardTitle>Inbox Email</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription>Email terakhir yang diterima</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada email masuk</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{email.subject || "No Subject"}</p>
                      <p className="text-sm text-muted-foreground">{email.from_email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(email.replied_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
