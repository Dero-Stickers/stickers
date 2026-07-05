import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authHeaders } from "@/pages/admin/errors/types";

// Blocco "Account admin" integrato nella card "Configurazione generale": cambia
// nickname e/o PIN dell'account con cui si è loggati. Richiede il PIN ATTUALE
// come conferma. Chiama PATCH /api/auth/me/credentials (verifica PIN + unicità
// nickname lato server) e aggiorna la sessione locale col nuovo profilo/token.
export function AdminAccountFields() {
  const { toast } = useToast();
  const { currentUser, login } = useAuth();

  const [currentPin, setCurrentPin] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);

  const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 6);

  const save = async () => {
    if (!currentPin) { toast({ title: "Serve il PIN attuale", variant: "destructive" }); return; }
    if (!newNickname.trim() && !newPin) {
      toast({ title: "Niente da cambiare", description: "Indica un nuovo nickname o un nuovo PIN." });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { currentPin };
      if (newNickname.trim()) body.newNickname = newNickname.trim();
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
      setCurrentPin(""); setNewNickname(""); setNewPin("");
    } catch {
      toast({ title: "Errore di connessione", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <KeyRound className="h-4 w-4 text-primary" />
        Account admin
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Account attuale: <span className="font-medium text-foreground">{currentUser?.nickname}</span>.
        Per cambiare nickname o PIN inserisci il PIN attuale come conferma.
      </p>

      <div>
        <label className="text-sm font-medium text-foreground block mb-1">PIN attuale</label>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={currentPin}
          onChange={(e) => setCurrentPin(onlyDigits(e.target.value))}
          placeholder="PIN attuale"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Nuovo nickname</label>
          <Input
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            placeholder="lascia vuoto per non cambiare"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Nuovo PIN (4-6 cifre)</label>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={newPin}
            onChange={(e) => setNewPin(onlyDigits(e.target.value))}
            placeholder="lascia vuoto per non cambiare"
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2">
        {saving ? "Salvataggio…" : "Aggiorna credenziali"}
      </Button>
    </div>
  );
}
