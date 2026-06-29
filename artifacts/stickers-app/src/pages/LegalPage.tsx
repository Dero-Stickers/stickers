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

// "privacy" e "termini" restano viste singole (usate da Login e cookie banner).
// "note" è la vista combinata (Privacy + Termini), usata dal Profilo.
type LegalDoc = "privacy" | "termini" | "note";

export function LegalPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ doc: string }>("/legal/:doc");
  const doc: LegalDoc =
    params?.doc === "termini" ? "termini" : params?.doc === "note" ? "note" : "privacy";

  const [privacy, setPrivacy] = useState<string | null>(null);
  const [terms, setTerms] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return;
        const p = data?.privacyPolicyText;
        const t = data?.termsText;
        setPrivacy(p && p.trim().length > 0 ? p : UNAVAILABLE);
        setTerms(t && t.trim().length > 0 ? t : UNAVAILABLE);
      })
      .catch(() => {
        if (!cancelled) { setPrivacy(UNAVAILABLE); setTerms(UNAVAILABLE); }
      });
    return () => { cancelled = true; };
  }, []);

  const title =
    doc === "termini" ? "Termini e Condizioni" : doc === "note" ? "Note legali" : "Privacy Policy";

  const sections =
    doc === "privacy"
      ? [{ heading: "Privacy Policy", body: privacy }]
      : doc === "termini"
        ? [{ heading: "Termini e Condizioni", body: terms }]
        : [
            { heading: "Privacy Policy", body: privacy },
            { heading: "Termini e Condizioni", body: terms },
          ];

  const loading = privacy === null || terms === null;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-10 pb-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-foreground/10"
            onClick={() => (window.history.length > 1 ? window.history.back() : setLocation("/login"))}
            aria-label="Indietro"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <AppLogo className="h-8 w-auto" />
        </div>
        <h1 className="text-xl font-bold mt-3">{title}</h1>
      </div>
      <div className="px-4 py-5 max-w-2xl mx-auto space-y-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : (
          sections.map((s, i) => (
            <section key={i}>
              {doc === "note" && (
                <h2 className="text-lg font-bold mb-2 text-foreground">{s.heading}</h2>
              )}
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {s.body}
              </pre>
            </section>
          ))
        )}

        <div className="border-t border-border pt-4 text-xs text-muted-foreground leading-relaxed">
          App indipendente, non affiliata né approvata da Panini S.p.A. o da altri editori.
          Non riproduciamo immagini, copertine o loghi di terzi: gestiamo solo dati testuali
          (numero, nome, squadra) a fini di collezione e scambio. I marchi e i nomi citati
          appartengono ai rispettivi titolari e sono usati a soli fini descrittivi.
        </div>
      </div>
    </div>
  );
}

export default LegalPage;
