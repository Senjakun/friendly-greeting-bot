import { Link } from "react-router-dom";
import { Mail, Shield, Inbox, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">Email Notifier</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Masuk</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Daftar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-3xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-8">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Terima Notifikasi Email<br />
              <span className="text-primary">Langsung di Web</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Sistem notifikasi email dengan Cloudflare Email Routing. 
              Lihat inbox, kelola auto-reply, dan pantau email masuk secara real-time.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link to="/register">
                  Mulai Sekarang
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Masuk</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">Fitur Utama</h2>
            <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <Inbox className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Inbox Email</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Lihat semua email masuk langsung di dashboard web. 
                    Tidak perlu buka email client.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Auto Reply</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Balas email secara otomatis dengan pesan custom. 
                    Cocok untuk notifikasi ke pengirim.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Admin Panel</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Kelola user, lihat semua email, dan atur password pengguna
                    melalui panel admin.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold text-center mb-12">Cara Kerja</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                  1
                </div>
                <div>
                  <h3 className="font-medium mb-1">Setup Cloudflare Email Routing</h3>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan domain kamu ke Cloudflare dan setup Email Routing 
                    untuk forward email ke webhook sistem.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                  2
                </div>
                <div>
                  <h3 className="font-medium mb-1">Daftar dan Konfigurasi</h3>
                  <p className="text-sm text-muted-foreground">
                    Buat akun, masukkan email domain kamu, dan atur pesan auto-reply.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                  3
                </div>
                <div>
                  <h3 className="font-medium mb-1">Terima Notifikasi</h3>
                  <p className="text-sm text-muted-foreground">
                    Email masuk akan tampil di inbox dashboard dan otomatis dibalas 
                    jika auto-reply aktif.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 Email Notifier. Built with Lovable.</p>
        </div>
      </footer>
    </div>
  );
}
