import { useState } from "react";
import { KeyRound, Pencil, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/ui/pin-input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authHeaders } from "@/pages/admin/errors/types";

// Blocco "Account admin" nella card "Configurazione generale". A riposo mostra il
// nickname attuale e il PIN: mascherato di default, rivelabile con l'occhio (lo
// recupera da GET /api/auth/me/pin, riservato all'admin). Il pulsante "Modifica"
// apre i campi per cambiare nickname e/o PIN; serve il PIN attuale come conferma.
// Chiama PATCH /api/auth/me/credentials e aggiorna la sessione col nuovo profilo/token.
export function AdminAccountFields() {
  const { toast } = useToast();
  const { currentUser, login } = useAuth();

  const [editing, setEditing] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);

  // PIN attuale rivelato (null = mascherato). Caricato on-demand al clic sull'occhio.
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [loadingPin, setLoadingPin] = useState(false);

  const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 6);

  const toggleReveal = async () => {
    if (revealedPin !== null) { setRevealedPin(null); return; }
    setLoadingPin(true);
    try {
      const res = await fetch("/api/auth/me/pin", { headers: { ...authHeaders() } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast({ title: "Impossibile mostrare il PIN", variant: "destructive" }); return; }
      // pin null = mai reimpostato dopo l'aggiornamento: invita a rigenerarlo.
      setRevealedPin(json.pin ?? "");
    } catch {
      toast({ title: "Errore di connessione", variant: "destructive" });
    } finally {
      setLoadingPin(false);
    }
  };

  const openEdit = () => {
    // Precompilo il nickname con quello attuale: si modifica solo se serve.
    setNewNickname(currentUser?.nickname ?? "");
    setNewPin("");
    setCurrentPin("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setCurrentPin(""); setNewNickname(""); setNewPin("");
  };

  const save = async () => {
    if (!currentPin) { toast({ title: "Serve il PIN attuale", variant: "destructive" }); return; }
    const nick = newNickname.trim();
    const nickChanged = nick && nick !== currentUser?.nickname;
    if (!nickChanged && !newPin) {
      toast({ title: "Niente da cambiare", description: "Modifica il nickname o imposta un nuovo PIN." });
      return;
    }
    if (newPin && newPin.length !== 6) {
      toast({ title: "PIN non valido", description: "Il nuovo PIN deve avere 6 cifre.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { currentPin };
      if (nickChanged) body.newNickname = nick;
      if (newPin) body.newPin = newPin;
      const res = await fetch("/api/auth/me/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Modifica non riuscita", description: json?.message ?? "Riprova.", variant: "destructive" });
        return;
      }
      // Aggiorna la sessione col nuovo profilo + token restituiti.
      const token = localStorage.getItem("sticker_token");
      if (json.user && (json.token || token)) login(json.user, json.token ?? token);
      toast({ title: "Credenziali aggiornate", description: "Le nuove credenziali sono attive." });
      cancelEdit();
    } catch {
      toast({ title: "Errore di connessione", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <KeyRound className="h-4 w-4 text-primary" />
        Account admin
      </div>

      {/* A riposo: nickname e PIN attuali a colpo d'occhio + pulsante Modifica. */}
      {!editing && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="grid gap-1 text-sm sm:grid-cols-2 sm:gap-6">
            <div>
              <span className="text-xs text-muted-foreground block">Nickname</span>
              <span className="font-medium text-foreground">{currentUser?.nickname ?? "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">PIN</span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-foreground tracking-widest">
                  {revealedPin === null ? "••••••" : revealedPin === "" ? "—" : revealedPin}
                </span>
                <button
                  type="button"
                  onClick={toggleReveal}
                  disabled={loadingPin}
                  aria-label={revealedPin !== null ? "Nascondi PIN" : "Mostra PIN"}
                  title={revealedPin !== null ? "Nascondi PIN" : "Mostra PIN"}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {revealedPin !== null ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
              {revealedPin === "" && (
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Non ancora visibile: reimpostalo con “Modifica”.
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 shrink-0">
            <Pencil className="h-3.5 w-3.5" />
            Modifica
          </Button>
        </div>
      )}

      {/* In modifica: campi per nuovo nickname/PIN + PIN attuale come conferma. */}
      {editing && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/20 px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Nickname</label>
              <Input
                className="bg-white"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="Nickname"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Nuovo PIN (6 cifre)</label>
              <PinInput
                className="bg-white"
                inputMode="numeric"
                autoComplete="new-password"
                value={newPin}
                onChange={(e) => setNewPin(onlyDigits(e.target.value))}
                placeholder="lascia vuoto per non cambiarlo"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">PIN attuale (conferma)</label>
            <PinInput
              className="bg-white"
              inputMode="numeric"
              autoComplete="current-password"
              value={currentPin}
              onChange={(e) => setCurrentPin(onlyDigits(e.target.value))}
              placeholder="inserisci il PIN attuale per confermare"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? "Salvataggio…" : "Salva"}
            </Button>
            <Button variant="outline" onClick={cancelEdit} disabled={saving} className="gap-1.5">
              <X className="h-4 w-4" />
              Annulla
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
