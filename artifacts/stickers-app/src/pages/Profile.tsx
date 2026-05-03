import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Star, Key, HelpCircle, Mail, LogOut, Shield, Download, Trash2, FileText, UserCog } from "lucide-react";
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
import { AppLogo } from "@/components/brand/AppLogo";

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
  const { currentUser, logout, login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const handleRecoveryCode = async () => {
    setPinLoading(true);
    setPinError(false);
    try {
      const token = localStorage.getItem("sticker_token");
      const res = await fetch("/api/auth/recovery-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setPinError(true);
        return;
      }
      const data = await res.json();
      setRecoveryCode(data.recoveryCode);
    } catch {
      setPinError(true);
    } finally {
      setPinLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const [showNickDialog, setShowNickDialog] = useState(false);
  const [nickPin, setNickPin] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [nickError, setNickError] = useState<string | null>(null);
  const [nickLoading, setNickLoading] = useState(false);

  const handleChangeNickname = async () => {
    setNickError(null); setNickLoading(true);
    try {
      const token = localStorage.getItem("sticker_token");
      const res = await fetch("/api/auth/me/nickname", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pin: nickPin, newNickname: newNickname.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setNickError((j as any)?.message ?? "Errore aggiornamento"); return; }
      if (token && j.user) login(j.user, token);
      toast({ title: "Nickname aggiornato", description: `Ora ti chiami ${j.user?.nickname ?? newNickname}.` });
      setShowNickDialog(false);
      setNickPin(""); setNewNickname("");
    } catch { setNickError("Errore di connessione."); }
    finally { setNickLoading(false); }
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem("sticker_token");
      const res = await fetch("/api/auth/me/export", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stickers-i-miei-dati-${currentUser?.nickname ?? "utente"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Download avviato", description: "Il file con i tuoi dati è stato scaricato." });
    } catch {
      toast({ title: "Errore", description: "Impossibile esportare i dati. Riprova.", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("sticker_token");
      const res = await fetch("/api/auth/me", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pin: deletePin, confirm: deleteConfirm }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setDeleteError((j as any)?.message ?? "Errore durante la cancellazione.");
        return;
      }
      logout();
      setLocation("/login");
    } catch {
      setDeleteError("Errore di connessione. Riprova.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-10 pb-6 border-b border-sidebar-border">
        <div className="flex justify-center">
          <AppLogo className="h-10 w-auto" />
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black text-xl uppercase">
            {currentUser?.nickname?.slice(0, 2) ?? "U"}
          </div>
          <div>
            <h1 className="text-xl font-bold">{currentUser?.nickname}</h1>
            <p className="text-sidebar-foreground/85 text-sm flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {currentUser?.area ?? "—"} — CAP {currentUser?.cap}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <DemoStatusBadge status={currentUser?.demoStatus ?? null} expiresAt={currentUser?.demoExpiresAt} />
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
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
                <p className="text-2xl font-bold text-amber-500">
                  {currentUser?.exchangesCompleted && currentUser.exchangesCompleted >= 10 ? "4.8" : "—"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Affidabilità</p>
            </CardContent>
          </Card>
        </div>

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
              onClick={() => { setShowNickDialog(true); setNickPin(""); setNewNickname(currentUser?.nickname ?? ""); setNickError(null); }}
            >
              <UserCog className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Cambia nickname</p>
                <p className="text-xs text-muted-foreground">Devi confermare con il PIN</p>
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
              href="mailto:dero975@gmail.com"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <Mail className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Contatta il supporto</p>
                <p className="text-xs text-muted-foreground">dero975@gmail.com</p>
              </div>
            </a>

            <button
              onClick={() => setLocation("/legal/privacy")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
            >
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Privacy Policy</p>
                <p className="text-xs text-muted-foreground">Come trattiamo i tuoi dati</p>
              </div>
            </button>

            <button
              onClick={() => setLocation("/legal/termini")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
            >
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Termini d'uso</p>
                <p className="text-xs text-muted-foreground">Regole di utilizzo dell'app</p>
              </div>
            </button>

            <button
              onClick={handleExportData}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
            >
              <Download className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">Scarica i miei dati</p>
                <p className="text-xs text-muted-foreground">File JSON con tutti i tuoi dati personali</p>
              </div>
            </button>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full h-11 text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Esci dall'account
        </Button>

        {!currentUser?.isAdmin && (
          <button
            onClick={() => { setShowDeleteDialog(true); setDeletePin(""); setDeleteConfirm(""); setDeleteError(null); }}
            className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground/70 hover:text-destructive transition-colors py-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Elimina definitivamente l'account
          </button>
        )}
      </div>

      <Dialog open={showNickDialog} onOpenChange={setShowNickDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambia nickname</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Il nuovo nickname dev'essere unico nel tuo CAP ({currentUser?.cap}).
            </p>
            <Input
              placeholder="Nuovo nickname"
              value={newNickname}
              onChange={e => setNewNickname(e.target.value)}
              maxLength={24}
            />
            <Input
              type="password"
              placeholder="PIN"
              maxLength={6}
              value={nickPin}
              onChange={e => setNickPin(e.target.value)}
              autoComplete="current-password"
            />
            {nickError && <p className="text-xs text-destructive">{nickError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowNickDialog(false)} disabled={nickLoading}>
                Annulla
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={handleChangeNickname}
                disabled={nickLoading || newNickname.trim().length < 3 || nickPin.length < 4}
              >
                {nickLoading ? "Aggiorno..." : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Elimina account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Questa azione cancella in modo definitivo il tuo profilo, le chat e le figurine selezionate.
              <br /><br />
              Per confermare, inserisci il tuo PIN e scrivi <span className="font-mono font-bold text-foreground">ELIMINA</span> nel campo sotto.
            </p>
            <Input
              type="password"
              placeholder="PIN"
              maxLength={6}
              value={deletePin}
              onChange={e => setDeletePin(e.target.value)}
              autoComplete="current-password"
            />
            <Input
              placeholder='Scrivi "ELIMINA"'
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)} disabled={deleteLoading}>
                Annulla
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirm !== "ELIMINA" || deletePin.length < 4}
              >
                {deleteLoading ? "Elimino..." : "Elimina"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={handleRecoveryCode}
                disabled={pinLoading}
              >
                {pinLoading ? "Verifica..." : "Mostra codice"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="font-mono text-lg font-bold tracking-wider text-foreground">{recoveryCode}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Salva questo codice in un posto sicuro. Serve per recuperare il profilo se perdi l'accesso.
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
