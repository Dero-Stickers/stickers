import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/brand/AppLogo";
import { Button } from "@/components/ui/button";

// Nessun testo legale è hardcoded qui: l'unica fonte è il DB (app_settings,
// modificabile da admin → /api/settings). Se il documento non è ancora stato
// salvato, mostriamo un messaggio neutro, mai contenuto legale locale.
const UNAVAILABLE =
  "Documento non ancora disponibile. Riprova più tardi o contatta il supporto.";

type LegalDoc = "privacy" | "termini";

export function LegalPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ doc: string }>("/legal/:doc");
  const doc = (params?.doc === "termini" ? "termini" : "privacy") as LegalDoc;

  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        const fromDb = doc === "privacy" ? data?.privacyPolicyText : data?.termsText;
        setText(fromDb && fromDb.trim().length > 0 ? fromDb : UNAVAILABLE);
      })
      .catch(() => {
        if (!cancelled) setText(UNAVAILABLE);
      });
    return () => { cancelled = true; };
  }, [doc]);

  const title = doc === "privacy" ? "Privacy Policy" : "Termini e Condizioni";

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-10 pb-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-foreground/10"
            onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/login")}
            aria-label="Indietro"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <AppLogo className="h-8 w-auto" />
        </div>
        <h1 className="text-xl font-bold mt-3">{title}</h1>
      </div>
      <div className="px-4 py-5 max-w-2xl mx-auto">
        {text === null ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{text}</pre>
        )}
      </div>
    </div>
  );
}

export default LegalPage;
