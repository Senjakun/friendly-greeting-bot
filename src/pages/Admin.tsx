import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Users, Inbox, Shield, Key, Loader2, UserPlus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type EmailLog = Tables<"email_logs"> & {
  email_accounts?: Tables<"email_accounts"> | null;
};

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Set password dialog
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  // Create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login");
      } else if (!isAdmin) {
        toast.error("Akses ditolak");
        navigate("/dashboard");
      }
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch all profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    setProfiles(profilesData || []);

    // Fetch all email logs with account info
    const { data: emailsData } = await supabase
      .from("email_logs")
      .select("*, email_accounts(*)")
      .order("replied_at", { ascending: false })
      .limit(50);
    
    setEmails(emailsData || []);
    setIsLoading(false);
  };

  const handleSetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    setIsSettingPassword(true);
    
    const { error } = await supabase.functions.invoke("admin-set-password", {
      body: { user_id: selectedUser.user_id, new_password: newPassword },
    });

    if (error) {
      toast.error(error.message || "Gagal mengatur password");
    } else {
      toast.success("Password berhasil diatur");
      setNewPassword("");
      setSelectedUser(null);
      setPasswordDialogOpen(false);
    }
    
    setIsSettingPassword(false);
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) return;
    
    setIsCreatingUser(true);
    
    const { error } = await supabase.functions.invoke("admin-create-user", {
      body: { 
        email: newUserEmail.trim(), 
        password: newUserPassword,
        display_name: newUserName.trim() || null,
      },
    });

    if (error) {
      toast.error(error.message || "Gagal membuat user");
    } else {
      toast.success("User berhasil dibuat");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setCreateDialogOpen(false);
      fetchData(); // Refresh data
    }
    
    setIsCreatingUser(false);
  };

  if (authLoading || !isAdmin) {
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
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-semibold">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Kelola pengguna dan email</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="emails" className="gap-2">
              <Inbox className="h-4 w-4" />
              All Emails
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Daftar Pengguna</CardTitle>
                  <CardDescription>Kelola pengguna dan atur password</CardDescription>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Buat User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Buat User Baru</DialogTitle>
                      <DialogDescription>
                        User akan langsung bisa login setelah dibuat
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="newUserName">Nama (opsional)</Label>
                        <Input
                          id="newUserName"
                          type="text"
                          placeholder="Nama pengguna"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newUserEmail">Email *</Label>
                        <Input
                          id="newUserEmail"
                          type="email"
                          placeholder="user@example.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newUserPassword">Password *</Label>
                        <Input
                          id="newUserPassword"
                          type="password"
                          placeholder="Minimal 6 karakter"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          minLength={6}
                          required
                        />
                      </div>
                      <Button 
                        onClick={handleCreateUser} 
                        className="w-full"
                        disabled={isCreatingUser || !newUserEmail || newUserPassword.length < 6}
                      >
                        {isCreatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Buat User
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada pengguna</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{profile.display_name || "No Name"}</p>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined: {new Date(profile.created_at).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <Dialog open={passwordDialogOpen && selectedUser?.id === profile.id} onOpenChange={(open) => {
                          setPasswordDialogOpen(open);
                          if (!open) setSelectedUser(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(profile);
                                setPasswordDialogOpen(true);
                              }}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Set Password
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Set Password untuk {profile.display_name || profile.email}</DialogTitle>
                              <DialogDescription>
                                Password baru akan langsung berlaku
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="newPassword">Password Baru</Label>
                                <Input
                                  id="newPassword"
                                  type="password"
                                  placeholder="Minimal 6 karakter"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  minLength={6}
                                />
                              </div>
                              <Button 
                                onClick={handleSetPassword} 
                                className="w-full"
                                disabled={isSettingPassword || newPassword.length < 6}
                              >
                                {isSettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Set Password
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails">
            <Card>
              <CardHeader>
                <CardTitle>Semua Email Masuk</CardTitle>
                <CardDescription>Log email dari semua pengguna</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : emails.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada email</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        className="flex items-start justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{email.subject || "No Subject"}</p>
                          <p className="text-sm text-muted-foreground">From: {email.from_email}</p>
                          {email.email_accounts && (
                            <Badge variant="secondary" className="text-xs">
                              To: {email.email_accounts.email}
                            </Badge>
                          )}
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
