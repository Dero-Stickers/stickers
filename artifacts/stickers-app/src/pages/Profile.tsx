import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mockUsers } from "@/mock/users";
import { mockSettings } from "@/mock/settings";
import { User, MapPin, Star, Key, HelpCircle, Mail, LogOut, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function DemoStatusBadge({ status, expiresAt }: { status: string | null; expiresAt?: string | null }) {
  if (status === "premium") return <Badge className="bg-amber-500 text-white">PREMIUM</Badge>;
  if (status === "demo_active") {
    const remaining = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3600000)) : 0;
    return <Badge className="bg-primary text-primary-foreground">DEMO ATTIVA — {remaining}h rimaste</Badge>;
  }
  if (status === "demo_expired") return <Badge variant="destructive">DEMO SCADUTA</Badge>;
  return <Badge variant="outline">Free</Badge>;
}

export function Profile() {
  const { currentUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [pinError, setPinError] = useState(false);

  const handleRecoveryCode = () => {
    const mockUser = mockUsers.find(u => u.id === currentUser?.id);
    if (pin === (mockUser as any)?.pin) {
      setRecoveryCode((mockUser as any)?.recoveryCode ?? "STICK-XXXX-XXXX-XXXX");
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-full">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black text-xl uppercase">
            {currentUser?.nickname?.slice(0, 2) ?? "U"}
          </div>
          <div>
            <h1 className="text-xl font-bold">{currentUser?.nickname}</h1>
            <p className="text-sidebar-foreground/70 text-sm flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {currentUser?.area} — CAP {currentUser?.cap}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <DemoStatusBadge status={currentUser?.demoStatus ?? null} expiresAt={currentUser?.demoExpiresAt} />
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{currentUser?.exchangesCompleted ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Scambi completati</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Star className="h-4 w-4 text-amber-500" />
                <p className="text-2xl font-bold text-amber-500">4.8</p>
              </div>
              <p className="text-xs text-muted-foreground">Affidabilità</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="shadow-sm">
          <CardContent className="p-0 divide-y divide-border">
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
              onClick={() => { setShowRecoveryDialog(true); setRecoveryCode(null); setPin(""); setPinError(false); }}
            >
              <Key className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Il mio codice di recupero</p>
                <p className="text-xs text-muted-foreground">Usa questo codice se perdi l'accesso all'account</p>
              </div>
            </button>

            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
              onClick={() => toast({ title: "Guida", description: "La guida sarà disponibile a breve." })}
            >
              <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Guida Stickers</p>
                <p className="text-xs text-muted-foreground">Come usare l'app e trovare match</p>
              </div>
            </button>

            <a
              href={`mailto:${mockSettings.supportEmail}`}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <Mail className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Contatta il supporto</p>
                <p className="text-xs text-muted-foreground">{mockSettings.supportEmail}</p>
              </div>
            </a>

            <a
              href="#"
              onClick={e => { e.preventDefault(); toast({ title: "Privacy Policy in arrivo" }); }}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Privacy &amp; Termini</p>
                <p className="text-xs text-muted-foreground">Informativa sulla privacy e termini d'uso</p>
              </div>
            </a>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-11 text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Esci dall'account
        </Button>
      </div>

      {/* Recovery code dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Codice di recupero</DialogTitle>
          </DialogHeader>
          {!recoveryCode ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Inserisci il tuo PIN per visualizzare il codice di recupero.
              </p>
              <Input
                type="password"
                placeholder="PIN"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value)}
                className={pinError ? "border-destructive" : ""}
              />
              {pinError && <p className="text-xs text-destructive">PIN non corretto</p>}
              <Button className="w-full bg-primary text-primary-foreground" onClick={handleRecoveryCode}>
                Mostra codice
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="font-mono text-lg font-bold tracking-wider text-foreground">{recoveryCode}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Salva questo codice in un posto sicuro. Serve per recuperare il profilo se perdi l'accesso.
                Se lo perdi, il recupero potrebbe non essere possibile o potrebbe richiedere verifica manuale.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setShowRecoveryDialog(false)}>
                Chiudi
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
