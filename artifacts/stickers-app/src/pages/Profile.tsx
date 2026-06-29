import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatNickname } from "@/lib/utils";
import { MapPin, Key, HelpCircle, LogOut, Shield, Trash2, UserCog, ArrowRight, Check, X, Lock, AlertTriangle, Send, ChevronRight } from "lucide-react";
import { reportError } from "@/lib/report-error";
import { Card, CardContent } from "@/components/ui/card";
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
import { AppHeader } from "@/components/layout/AppHeader";

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

  // Cambio zona di ricerca (CAP). Il CAP è solo geografia: nessun PIN richiesto.
  const [showLocDialog, setShowLocDialog] = useState(false);
  const [newCap, setNewCap] = useState("");
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const handleChangeLocation = async () => {
    setLocError(null); setLocLoading(true);
    try {
      const token = localStorage.getItem("sticker_token");
      const res = await fetch("/api/auth/me/location", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ cap: newCap.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setLocError((j as any)?.message ?? "Errore aggiornamento"); return; }
      if (token && j.user) login(j.user, token);
      toast({ title: "Zona aggiornata", description: `Ora cerchi match a ${j.user?.area ?? newCap}.` });
      setShowLocDialog(false);
    } catch { setLocError("Errore di connessione."); }
    finally { setLocLoading(false); }
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [reportPage, setReportPage] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const handleSendReport = async () => {
    setReportLoading(true);
    const ok = await reportError({
      errorType: "user_report",
      page: reportPage || window.location.pathname,
      userNote: reportNote.trim(),
    });
    setReportLoading(false);
    if (ok) {
      setReportSent(true);
      toast({
        title: "Segnalazione inviata",
        description: "Grazie! Daremo un'occhiata appena possibile.",
      });
      setTimeout(() => {
        setShowReportDialog(false);
        setReportNote("");
        setReportPage("");
        setReportSent(false);
      }, 1500);
    } else {
      toast({
        title: "Errore",
        description: "Non sono riuscito a inviare la segnalazione. Riprova tra poco.",
        variant: "destructive",
      });
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
    <div className="flex flex-col h-full">
      <AppHeader />
      <div className="px-4 pt-4 flex flex-col items-center text-center shrink-0">
        <h1 className="text-xl font-bold text-foreground">{currentUser?.nickname}</h1>
        <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {currentUser?.area ?? "—"} — CAP {currentUser?.cap}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-6 min-h-0">
        {/* Sezione: Account */}
        <section className="space-y-1.5">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</h2>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              <button
                className="group w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
                onClick={() => { setShowRecoveryDialog(true); setRecoveryCode(null); setPin(""); setPinError(false); }}
              >
                <Key className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="flex-1 font-medium text-sm text-foreground">Il mio codice di recupero</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
              </button>

              <button
                className="group w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
                onClick={() => { setShowNickDialog(true); setNickPin(""); setNewNickname(currentUser?.nickname ?? ""); setNickError(null); }}
              >
                <UserCog className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="flex-1 font-medium text-sm text-foreground">Cambia nickname</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
              </button>

              <button
                className="group w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
                onClick={() => { setShowLocDialog(true); setNewCap(currentUser?.cap ?? ""); setLocError(null); }}
              >
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="flex-1 font-medium text-sm text-foreground">Cambia zona</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
              </button>
            </CardContent>
          </Card>
        </section>

        {/* Sezione: Aiuto e supporto */}
        <section className="space-y-1.5">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aiuto e supporto</h2>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              <button
                className="group w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
                onClick={() => toast({ title: "Guida", description: "La guida sarà disponibile a breve." })}
              >
                <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="flex-1 font-medium text-sm text-foreground">Guida Stickers</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
              </button>

              <button
                onClick={() => {
                  setShowReportDialog(true);
                  setReportNote("");
                  setReportPage(window.location.pathname);
                  setReportSent(false);
                }}
                className="group w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
              >
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="flex-1 font-medium text-sm text-foreground">Segnala un problema</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
              </button>
            </CardContent>
          </Card>
        </section>

        {/* Sezione: Informazioni */}
        <section className="space-y-1.5">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informazioni</h2>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              <button
                onClick={() => setLocation("/legal/note")}
                className="group w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
              >
                <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="flex-1 font-medium text-sm text-foreground">Privacy e Termini d'uso</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
              </button>
            </CardContent>
          </Card>
        </section>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl bg-white text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive font-semibold gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Esci dall'account
          </Button>

          {!currentUser?.isAdmin && (
            <Button
              onClick={() => { setShowDeleteDialog(true); setDeletePin(""); setDeleteConfirm(""); setDeleteError(null); }}
              className="w-full h-11 rounded-xl bg-destructive text-white border border-destructive hover:bg-destructive/90 font-semibold gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Elimina account
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showNickDialog} onOpenChange={setShowNickDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center sm:text-left">
            <DialogTitle className="text-lg">Cambia nome utente</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Scegli il nuovo nome con cui ti vedranno gli altri.
            </p>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Anteprima visiva: vecchio → nuovo */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-medium">
                {currentUser?.nickname ?? "—"}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className={`px-2.5 py-1 rounded-md font-medium ${newNickname ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground/50"}`}>
                {newNickname || "Nuovonome"}
              </span>
            </div>

            {/* Campo nuovo nome */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <UserCog className="h-3.5 w-3.5 text-primary" />
                Nuovo nome utente
              </label>
              <Input
                placeholder="es. Mario99"
                value={newNickname}
                onChange={e => setNewNickname(formatNickname(e.target.value))}
                maxLength={12}
                spellCheck={false}
                className="h-11"
              />
              {/* Checklist regole — feedback live */}
              {(() => {
                const lenOk = newNickname.length >= 5 && newNickname.length <= 12;
                const charOk = newNickname.length === 0 || /^[A-Za-z0-9_-]+$/.test(newNickname);
                const Item = ({ ok, text }: { ok: boolean; text: string }) => (
                  <li className={`flex items-center gap-1.5 ${ok ? "text-green-600" : "text-muted-foreground"}`}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
                    <span>{text}</span>
                  </li>
                );
                return (
                  <ul className="text-[11px] space-y-0.5 pl-0.5">
                    <Item ok={lenOk} text="Da 5 a 12 caratteri" />
                    <Item ok={charOk} text="Lettere, numeri, trattino o underscore" />
                    <Item ok={true} text="Iniziale maiuscola automatica" />
                  </ul>
                );
              })()}
            </div>

            {/* Campo PIN — spiegato */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                Conferma con il tuo PIN
              </label>
              <Input
                type="password"
                inputMode="numeric"
                placeholder="••••"
                maxLength={6}
                value={nickPin}
                onChange={e => setNickPin(e.target.value.replace(/\D/g, ""))}
                autoComplete="current-password"
                className="h-11 tracking-[0.4em] text-center"
              />
              <p className="text-[11px] text-muted-foreground">
                Serve solo a confermare che sei tu.
              </p>
            </div>

            {nickError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {nickError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setShowNickDialog(false)} disabled={nickLoading}>
                Annulla
              </Button>
              <Button
                className="flex-1 h-11 bg-primary text-primary-foreground font-semibold"
                onClick={handleChangeNickname}
                disabled={nickLoading || !/^[A-Za-z0-9_-]{5,12}$/.test(newNickname) || nickPin.length < 4}
              >
                {nickLoading ? "Aggiorno…" : "Conferma"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLocDialog} onOpenChange={setShowLocDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center sm:text-left">
            <DialogTitle className="text-lg">Cambia zona di ricerca</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Inserisci il CAP della zona dove vuoi cercare scambi. Puoi cambiarlo quando vuoi.
            </p>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                CAP (5 cifre)
              </label>
              <Input
                inputMode="numeric"
                placeholder="es. 40138"
                maxLength={5}
                value={newCap}
                onChange={e => setNewCap(e.target.value.replace(/\D/g, ""))}
                className="h-11 tracking-[0.4em] text-center"
              />
              <p className="text-[11px] text-muted-foreground">
                Serve solo a trovare i match vicini: non cambia il tuo accesso.
              </p>
            </div>

            {locError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {locError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setShowLocDialog(false)} disabled={locLoading}>
                Annulla
              </Button>
              <Button
                className="flex-1 h-11 bg-primary text-primary-foreground font-semibold"
                onClick={handleChangeLocation}
                disabled={locLoading || newCap.length !== 5}
              >
                {locLoading ? "Aggiorno…" : "Conferma"}
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

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Segnala un problema
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Descrivi cosa è successo. Più sei chiaro, più in fretta possiamo sistemarlo.
              <br />
              <span className="text-xs">Non serve scrivere dati personali: non li raccogliamo.</span>
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                In quale sezione eri? <span className="text-muted-foreground font-normal">(facoltativo)</span>
              </label>
              <select
                value={reportPage}
                onChange={(e) => setReportPage(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— Seleziona la sezione —</option>
                <option value="Home">Home</option>
                <option value="Album">Album</option>
                <option value="Match">Match</option>
                <option value="Profilo">Profilo</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Cosa è andato storto?
              </label>
              <textarea
                placeholder="es. Quando clicco 'Aggiungi figurina' non succede niente. Più dettagli ci dai, meglio è."
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-32 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setShowReportDialog(false)}
                disabled={reportLoading}
              >
                Annulla
              </Button>
              <Button
                className="flex-1 h-11 bg-primary text-primary-foreground gap-1.5"
                onClick={handleSendReport}
                disabled={reportLoading || reportSent || reportNote.trim().length < 5}
              >
                {reportSent ? (
                  <>
                    <Check className="h-4 w-4" /> Inviata
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {reportLoading ? "Invio…" : "Invia"}
                  </>
                )}
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
