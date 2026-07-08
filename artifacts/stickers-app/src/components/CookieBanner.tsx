import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";

/**
 * Informativa cookie minimale e non invasiva. L'app usa solo memoria tecnica
 * (token di sessione), nessun cookie di profilazione o di terze parti: basta
 * un avviso una tantum. La scelta è ricordata in localStorage.
 */
// Esportata: la guida interattiva ASPETTA che l'avviso sia stato chiuso prima
// di partire (altrimenti il banner coprirebbe la navbar durante il tour).
export const COOKIE_ACK_KEY = "cookie_notice_ack";
const ACK_KEY = COOKIE_ACK_KEY;

export function CookieBanner() {
  const [location] = useLocation();
  const search = useSearch();
  const [ack, setAck] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ACK_KEY) === "1";
    } catch {
      return true; // se localStorage non è disponibile non disturbare
    }
  });

  // In area ADMIN il banner non serve: è rivolto agli utenti finali. Nascosto sia
  // sulle rotte /admin* sia sul login staff (/login?next=/admin).
  const nextParam = new URLSearchParams(search).get("next");
  const isAdminArea =
    location === "/admin" ||
    location.startsWith("/admin/") ||
    nextParam === "/admin" ||
    (nextParam?.startsWith("/admin/") ?? false);

  if (ack || isAdminArea) return null;

  const accept = () => {
    try {
      localStorage.setItem(ACK_KEY, "1");
    } catch {
      /* ignora: ambiente senza storage */
    }
    setAck(true);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur"
      role="region"
      aria-label="Informativa cookie"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Usiamo solo memoria tecnica necessaria al funzionamento dell'app (es. accesso).
          Nessun cookie di profilazione o di terze parti.{" "}
          <Link href="/legal/privacy" className="text-foreground underline">
            Leggi la privacy
          </Link>
        </p>
        <Button size="sm" className="shrink-0 bg-primary text-primary-foreground" onClick={accept}>
          Ho capito
        </Button>
      </div>
    </div>
  );
}

export default CookieBanner;
