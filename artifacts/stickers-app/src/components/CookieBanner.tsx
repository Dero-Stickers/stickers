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

  // Nell'area utente c'è la tab bar in basso (MobileLayout, alta h-16 = 4rem
  // sopra la safe-area). Il banner è renderizzato a livello globale, fuori dal
  // layout: se restasse a bottom-0 coprirebbe la tab bar. Lo solleviamo di 4rem
  // SOLO dove la tab bar esiste. Login (/login) e pagine legali (/legal/*) NON
  // hanno la tab bar → lì il banner resta ancorato al fondo. (Admin è già escluso.)
  const hasTabBar = location !== "/login" && !location.startsWith("/legal/");

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
      className="fixed inset-x-0 z-60 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur"
      style={
        hasTabBar
          ? {
              // Sopra la tab bar (h-16 = 4rem) + la sua safe-area: così non la copre.
              bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
              paddingBottom: "0.75rem",
            }
          : {
              // Login/legal: nessuna tab bar → ancorato al fondo, con safe-area propria.
              bottom: 0,
              paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
            }
      }
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
