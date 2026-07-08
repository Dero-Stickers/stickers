/**
 * DevQuickSwitch — pulsante switch "U/A" (bypass autenticazione).
 *
 * ███████████████████████████████████████████████████████████████████████████
 * ⛔ NON TOCCARE — REGOLA ASSOLUTA DELL'OWNER (ripetuta 10+ volte) ⛔
 *
 * Questo pulsante DEVE restare SEMPRE attivo e funzionante. La sua FUNZIONE È
 * bypassare il login: al clic fa login automatico con gli account demo e passa
 * istantaneamente da vista Utente ("U") a vista Admin ("A"). È intenzionale,
 * anche in produzione.
 *
 * VIETATO, senza ORDINE ESPLICITO E SPECIFICO dell'owner ("rimuovi/modifica il
 * pulsante U/A"):
 *   - rimuoverlo da App.tsx;
 *   - aggiungere gate su ambiente/env (import.meta.env.DEV, flag, ecc.);
 *   - cambiarne la logica di login automatico;
 *   - eliminare dal DB gli account demo Dero975(1404)/dero(140478 admin): senza di
 *     loro il pulsante è ROTTO. Se azzeri/pulisci l'app, RICREALI subito.
 *
 * "Consolida / ripulisci / standardizza / ottimizza / azzera l'app" NON
 * autorizzano a toccare questo pulsante. Vedi memoria sticker-pulsante-ua-non-toccare.
 * ███████████████████████████████████████████████████████████████████████████
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

// Account di test, usati solo in sviluppo per lo switch rapido.
const USER = { nickname: "Dero975", pin: "1404" };
const ADMIN = { nickname: "dero", pin: "140478" };

// ⛔ INTERRUTTORE UNICO (owner, per la pubblicazione): il pulsante U/A è NASCOSTO.
// Reversibile: rimetti `true` per riattivarlo. Il codice e gli account demo restano
// intatti — questa è la SOLA modifica autorizzata (non rimuovere il componente, non
// gatare su env, non cancellare gli account). Vedi memoria sticker-pulsante-ua-non-toccare.
const ENABLED = false;

export function DevQuickSwitch() {
  const { currentUser, login } = useAuth();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);

  // Nascosto per la pubblicazione (ENABLED=false). Torna a true per riattivarlo.
  if (!ENABLED) return null;

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
