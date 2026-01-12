import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bot, Shield, Mail, Users } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="text-center max-w-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
          <Bot className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-4 text-4xl font-bold">🎖️ Auto Reply AI Bot</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Telegram bot for Outlook email auto-reply with military verification
        </p>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="p-4 rounded-lg bg-card border">
            <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold">Military Verification</h3>
            <p className="text-sm text-muted-foreground">SheerID integration</p>
          </div>
          <div className="p-4 rounded-lg bg-card border">
            <Mail className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold">Outlook Integration</h3>
            <p className="text-sm text-muted-foreground">Microsoft Graph API</p>
          </div>
          <div className="p-4 rounded-lg bg-card border">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-semibold">User Management</h3>
            <p className="text-sm text-muted-foreground">Approve & manage users</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link to="/login">Admin Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
