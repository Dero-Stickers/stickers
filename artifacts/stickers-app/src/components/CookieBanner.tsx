import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

/**
 * Informativa cookie minimale e non invasiva. L'app usa solo memoria tecnica
 * (token di sessione), nessun cookie di profilazione o di terze parti: basta
 * un avviso una tantum. La scelta è ricordata in localStorage.
 */
const ACK_KEY = "cookie_notice_ack";

export function CookieBanner() {
  const [ack, setAck] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ACK_KEY) === "1";
    } catch {
      return true; // se localStorage non è disponibile non disturbare
    }
  });

  if (ack) return null;

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
