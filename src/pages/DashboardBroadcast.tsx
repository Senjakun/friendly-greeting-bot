import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Send, History, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type BroadcastMessage = Database["public"]["Tables"]["broadcast_messages"]["Row"];

export default function DashboardBroadcast() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastMessage[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: broadcasts }, { count }] = await Promise.all([
        supabase
          .from("broadcast_messages")
          .select("*")
          .order("sent_at", { ascending: false })
          .limit(10),
        supabase
          .from("telegram_users")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved"),
      ]);

      setHistory(broadcasts || []);
      setApprovedCount(count || 0);
    } catch (error: any) {
      toast.error("Failed to fetch data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);
    try {
      // In a real implementation, this would call an edge function
      // that sends the message via Telegram Bot API
      // For now, we just log the broadcast
      const { error } = await supabase.from("broadcast_messages").insert({
        message: message.trim(),
        recipients_count: approvedCount,
      });

      if (error) throw error;

      toast.success(`Broadcast queued for ${approvedCount} users`);
      setMessage("");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to send broadcast: " + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Broadcast</h1>
          <p className="text-muted-foreground">
            Send messages to all approved users
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Broadcast
              </CardTitle>
              <CardDescription>
                Compose and send a message to all approved users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{approvedCount} approved users will receive this message</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your broadcast message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Supports HTML formatting: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, etc.
                </p>
              </div>

              <Button
                onClick={handleSendBroadcast}
                disabled={sending || !message.trim()}
                className="w-full"
              >
                {sending ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Broadcast
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Broadcasts
              </CardTitle>
              <CardDescription>
                Last 10 broadcast messages sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Message</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          Loading history...
                        </TableCell>
                      </TableRow>
                    ) : history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          No broadcasts sent yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((broadcast) => (
                        <TableRow key={broadcast.id}>
                          <TableCell className="max-w-[200px] truncate">
                            {broadcast.message}
                          </TableCell>
                          <TableCell>{broadcast.recipients_count}</TableCell>
                          <TableCell>
                            {new Date(broadcast.sent_at).toLocaleString()}
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
      </div>
    </DashboardLayout>
  );
}
