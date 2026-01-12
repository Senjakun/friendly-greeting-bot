import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, CheckCircle, Clock, Send, AlertCircle } from "lucide-react";

interface Stats {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  emailAccounts: number;
  activeEmails: number;
  totalBroadcasts: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    approvedUsers: 0,
    pendingUsers: 0,
    emailAccounts: 0,
    activeEmails: 0,
    totalBroadcasts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          { count: totalUsers },
          { count: approvedUsers },
          { count: pendingUsers },
          { count: emailAccounts },
          { count: activeEmails },
          { count: totalBroadcasts },
        ] = await Promise.all([
          supabase.from("telegram_users").select("*", { count: "exact", head: true }),
          supabase.from("telegram_users").select("*", { count: "exact", head: true }).eq("status", "approved"),
          supabase.from("telegram_users").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("email_accounts").select("*", { count: "exact", head: true }),
          supabase.from("email_accounts").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("broadcast_messages").select("*", { count: "exact", head: true }),
        ]);

        setStats({
          totalUsers: totalUsers || 0,
          approvedUsers: approvedUsers || 0,
          pendingUsers: pendingUsers || 0,
          emailAccounts: emailAccounts || 0,
          activeEmails: activeEmails || 0,
          totalBroadcasts: totalBroadcasts || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      description: "Registered Telegram users",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Approved Users",
      value: stats.approvedUsers,
      description: "Users with active access",
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending Users",
      value: stats.pendingUsers,
      description: "Awaiting verification",
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Email Accounts",
      value: stats.emailAccounts,
      description: "Connected Outlook accounts",
      icon: Mail,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Active Emails",
      value: stats.activeEmails,
      description: "Currently active accounts",
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Broadcasts Sent",
      value: stats.totalBroadcasts,
      description: "Total broadcast messages",
      icon: Send,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Auto Reply AI Bot
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loading ? "-" : stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Quick Setup Guide
            </CardTitle>
            <CardDescription>
              Complete these steps to get your bot running
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>
                <strong>Configure Bot Token:</strong> Go to Settings and add your Telegram Bot Token from @BotFather
              </li>
              <li>
                <strong>Set Owner ID:</strong> Add your Telegram User ID to identify you as the owner
              </li>
              <li>
                <strong>Setup Webhook:</strong> Configure your Telegram bot webhook to point to your edge function URL
              </li>
              <li>
                <strong>Configure SheerID (Optional):</strong> Add your SheerID program ID for military verification
              </li>
              <li>
                <strong>Setup Microsoft App (Optional):</strong> Configure Microsoft Graph API for Outlook integration
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
