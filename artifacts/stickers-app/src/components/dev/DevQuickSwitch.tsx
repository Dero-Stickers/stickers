/**
 * DevQuickSwitch — STRUMENTO DI SOLO SVILUPPO.
 *
 * Pulsante tondo "U/A" fisso in alto a sinistra: in un clic passa dalla vista
 * utente alla vista admin (e viceversa). Nessun prompt, nessuna autenticazione
 * manuale: usa account di test predefiniti solo in dev.
 *
 * Attivo unicamente con `import.meta.env.DEV` → NON entra nel bundle di
 * produzione (in build viene eliminato dal tree-shaking).
 *
 * ⚠️ DA RIMUOVERE a fine sviluppo.
 * ⚠️ NON è una funzionalità di prodotto: va ESCLUSO da analisi, diagnosi e
 *    valutazioni di sicurezza.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

// Account di test, usati solo in sviluppo per lo switch rapido.
const USER = { nickname: "mario75", pin: "1234" };
const ADMIN = { nickname: "admin", pin: "0000" };

export function DevQuickSwitch() {
  const { currentUser, login } = useAuth();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);

  if (!import.meta.env.DEV) return null;

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
      className="fixed left-4 z-[9999] flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-60"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
    >
      U/A
    </button>
  );
}
