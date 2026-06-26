/**
 * DevQuickSwitch — STRUMENTO DI SOLO SVILUPPO.
 *
 * Pulsante tondo fisso in alto a destra: mostra "U" in vista utente e "A" in
 * vista admin; in un clic passa da una all'altra. Nessun prompt, nessuna
 * autenticazione manuale: usa account di test predefiniti solo in dev.
 *
 * SEMPRE visibile, anche in produzione/deploy (scelta demo intenzionale).
 * Nessuna autenticazione manuale: al clic fa login automatico con gli account
 * demo predefiniti e passa istantaneamente da vista utente a vista admin.
 *
 * ⚠️ Strumento, NON una funzionalità di prodotto: va ESCLUSO da analisi,
 *    diagnosi e valutazioni di sicurezza.
 * ⚠️ Al passaggio a utenti reali: rimuovere questo componente da App.tsx e
 *    cambiare il PIN dell'account admin.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

// Account di test, usati solo in sviluppo per lo switch rapido.
const USER = { nickname: "Dero975", pin: "1234" };
const ADMIN = { nickname: "admin", pin: "0000" };

export function DevQuickSwitch() {
  const { currentUser, login } = useAuth();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);

  // Sempre attivo: nessun gate su ambiente o variabili — vedi commento in testa.
  const switchView = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const target = currentUser?.isAdmin ? USER : ADMIN;
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!res.ok) return;
      const data = await res.json();
      login(data.user, data.token);
      setLocation(data.user.isAdmin ? "/admin" : "/");
    } catch {
      /* strumento dev: ignora gli errori */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={switchView}
      disabled={busy}
      aria-label="DEV: cambia vista User/Admin"
      title="DEV — cambia vista User/Admin"
      className="fixed right-4 z-[9999] flex h-11 w-11 items-center justify-center rounded-full bg-[#1a2d45] text-base font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
    >
      {busy ? "…" : currentUser?.isAdmin ? "A" : "U"}
    </button>
  );
}
