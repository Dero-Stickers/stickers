import { useState, useEffect } from "react";
import { Smartphone, X } from "lucide-react";
import { InstallAppDialog } from "@/components/profile/InstallAppDialog";

// Banner discreto e chiudibile in cima alla Home che invita ad aggiungere l'app
// alla schermata Home (l'app si divulga via link, non store). Non blocca l'uso.
// - Se il browser espone beforeinstallprompt (Android/desktop Chrome): mostra un
//   pulsante "Installa" che avvia l'installazione NATIVA con un tap.
// - Altrimenti (iPhone/Safari): "Come fare" apre la guida illustrata passo-passo.
// Si nasconde se l'app è già installata (standalone) o se l'utente l'ha chiuso.

const DISMISS_KEY = "install_banner_dismissed_v1";

// Evento beforeinstallprompt (non tipizzato nei lib DOM standard).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallBanner() {
  const [dismissed, setDismissed] = useState(
    () => isStandalone() || (typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1"),
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Cattura l'evento nativo (dove disponibile): abilita il pulsante "Installa".
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // Se l'app viene installata, nascondi per sempre il banner.
    const onInstalled = () => close();
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* no-op */ }
  };

  const onInstall = async () => {
    if (!deferredPrompt) { setShowGuide(true); return; }
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    close();
  };

  if (dismissed) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
        <Smartphone className="h-5 w-5 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-xs leading-snug text-foreground">
          Aggiungi l’app alla Home: si apre come una vera app, a schermo intero.
        </p>
        <button
          onClick={onInstall}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {deferredPrompt ? "Installa" : "Come fare"}
        </button>
        <button
          onClick={close}
          aria-label="Chiudi"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <InstallAppDialog open={showGuide} onOpenChange={setShowGuide} />
    </>
  );
}
