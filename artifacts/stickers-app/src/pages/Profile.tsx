import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, LogOut, Shield, Trash2, MessageSquarePlus, ChevronRight, Smartphone } from "lucide-react";
import { ReportDialog } from "@/components/report/ReportDialog";
import { InstallAppDialog } from "@/components/profile/InstallAppDialog";
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
import { useSupportEmail } from "@/hooks/useSupportEmail";
import { KofiButton } from "@/components/brand/KofiButton";

export function Profile() {
  const { currentUser, logout, login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const supportEmail = useSupportEmail();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  // "Installa l'app": guida Aggiungi-a-Home (l'app si divulga via link, non store).
  // Nascosta se l'app è GIÀ installata (avviata in modalità standalone).
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true);

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
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Cancellazione in tre stati: "form" (scrivi ELIMINA) → "confirm" (sei sicuro?)
  // → "done" (commiato). Azione irreversibile: il passo "confirm" evita
  // eliminazioni per tap accidentale; "done" saluta prima di chiudere la sessione.
  const [deleteStep, setDeleteStep] = useState<"form" | "confirm" | "done">("form");

  // "Segnala o proponi": tutta la logica (2 passi, tipi, invio) vive in ReportDialog.
  const [showReportDialog, setShowReportDialog] = useState(false);

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
        body: JSON.stringify({ confirm: deleteConfirm }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setDeleteError((j as any)?.message ?? "Errore durante la cancellazione.");
        setDeleteStep("form"); // torna al form per mostrare l'errore (es. account bloccato)
        return;
      }
      // Successo: mostra il commiato prima di chiudere la sessione.
      setDeleteStep("done");
    } catch {
      setDeleteError("Errore di connessione. Riprova.");
      setDeleteStep("form");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Chiude il commiato: esegue logout e torna al login.
  const finishAfterDelete = () => {
    logout();
    setLocation("/login");
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

      {/* Profilo compatto: nessun titolo di sezione, un'unica lista di voci,
          spaziature ridotte così tutto (firma deroarts inclusa) sta a schermo
          senza scroll. pb minimo: la firma deroarts resta a ridosso della nav bar. */}
      <div className="flex flex-col min-h-0 px-4 pt-4 pb-1">
        <Card className="shadow-sm">
          <CardContent className="p-0 divide-y divide-border">
            {/* "Installa l'app": mostrata solo se NON già installata (standalone). */}
            {!isStandalone && (
              <button
                onClick={() => setShowInstallDialog(true)}
                className="group w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
              >
                <Smartphone className="h-5 w-5 text-primary shrink-0" />
                <p className="flex-1 font-medium text-sm text-foreground">Installa l'app sul telefono</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              </button>
            )}

            <button
              className="group w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
              onClick={() => { setShowLocDialog(true); setNewCap(currentUser?.cap ?? ""); setLocError(null); }}
            >
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <p className="flex-1 font-medium text-sm text-foreground">Cambia zona</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
            </button>

            <button
              onClick={() => setShowReportDialog(true)}
              className="group w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
            >
              <MessageSquarePlus className="h-5 w-5 text-primary shrink-0" />
              <p className="flex-1 font-medium text-sm text-foreground">Segnala o proponi</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
            </button>

            <button
              onClick={() => setLocation("/legal/note")}
              className="group w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
            >
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <p className="flex-1 font-medium text-sm text-foreground">Privacy e Termini d'uso</p>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
            </button>
          </CardContent>
        </Card>

        {/* Box donazione Ko-fi — box bianco dedicato. Ordine: PRIMA il pulsante,
            POI l'info in piccolo (font regular, attenuato). Contributo LIBERO,
            non sblocca nulla (liberalità, non corrispettivo): la frase "è solo un
            grazie" va mantenuta. Il pulsante apre Ko-fi. */}
        <div className="mt-4">
          <div className="rounded-2xl border border-border bg-white px-4 py-4 text-center shadow-sm">
            <KofiButton />
            <p className="mt-3 text-xs font-normal text-muted-foreground leading-relaxed">
              Stickers oggi è gratuita. Un contributo, se ti va, aiuta a tenerla
              così. Non sblocca nulla: è solo un grazie!
            </p>
          </div>
        </div>
      </div>

      {/* Spacer che cresce: mangia lo spazio libero e spinge i pulsanti rossi +
          firma in fondo, a ridosso della nav bar (flex-1 è affidabile). */}
      <div className="flex-1" />

      {/* Pulsanti rossi (Esci / Elimina account) in fondo, sopra la firma. */}
      <div className="shrink-0 px-4 space-y-2">
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
            onClick={() => { setShowDeleteDialog(true); setDeleteStep("form"); setDeleteConfirm(""); setDeleteError(null); }}
            className="w-full h-11 rounded-xl bg-destructive text-white border border-destructive hover:bg-destructive/90 font-semibold gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Elimina account
          </Button>
        )}
      </div>

      {/* Firma progetto — minimale: solo il logo deroarts, cliccabile.
          Email di contatto = quella unica del pannello admin (useSupportEmail). */}
      <footer className="shrink-0 pt-3 pb-2 flex justify-center">
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent("Contatto da app Stickers")}`}
          aria-label="Scrivi a deroarts"
          title="Scrivi a deroarts"
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <img src="/deroarts_logo.svg" alt="deroarts" className="h-6 w-auto" />
        </a>
      </footer>

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

      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          // Durante il commiato ("done") l'account è già cancellato: qualsiasi
          // chiusura deve fare logout e portare al login, non solo nascondere.
          if (!open && deleteStep === "done") { finishAfterDelete(); return; }
          setShowDeleteDialog(open);
        }}
      >
        <DialogContent className="max-w-sm">
          {deleteStep === "done" ? (
            /* Commiato dopo l'eliminazione riuscita. */
            <div className="text-center space-y-4 py-2">
              <DialogHeader>
                <DialogTitle className="text-center">Account eliminato</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Grazie per aver usato <span className="font-semibold text-foreground">Stickers</span>.
                <br />A presto!
              </p>
              <Button className="w-full h-11 bg-primary text-primary-foreground font-semibold" onClick={finishAfterDelete}>
                Chiudi
              </Button>
            </div>
          ) : deleteStep === "form" ? (
            /* Passo 1: scrivi ELIMINA. */
            <>
              <DialogHeader>
                <DialogTitle className="text-destructive">Elimina account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Questa azione cancella in modo definitivo il tuo profilo, le chat e le figurine selezionate.
                  <br /><br />
                  Per confermare, scrivi <span className="font-mono font-bold text-foreground">ELIMINA</span> nel campo sotto.
                </p>
                <Input
                  placeholder='Scrivi "ELIMINA"'
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                />
                {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)}>
                    Annulla
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => { setDeleteError(null); setDeleteStep("confirm"); }}
                    disabled={deleteConfirm !== "ELIMINA"}
                  >
                    Continua
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Passo 2: conferma finale (sei sicuro?). */
            <>
              <DialogHeader>
                <DialogTitle className="text-destructive">Sei davvero sicuro?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  L'eliminazione è <span className="font-semibold text-foreground">irreversibile</span>:
                  non potrai più recuperare il profilo, le chat e le figurine.
                </p>
                {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setDeleteStep("form")} disabled={deleteLoading}>
                    Indietro
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? "Elimino..." : "Elimina definitivamente"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ReportDialog open={showReportDialog} onOpenChange={setShowReportDialog} />

      <InstallAppDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} />
    </div>
  );
}
