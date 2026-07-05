import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";

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
        // Segnaposto {EMAIL_SUPPORTO} nei testi legali → sostituito con l'email
        // unica del pannello admin, così cambiare l'email la aggiorna anche qui.
        const email = data?.supportEmail?.trim() || "stickers@deroarts.com";
        const fill = (s: string) => s.split("{EMAIL_SUPPORTO}").join(email);
        const p = data?.privacyPolicyText;
        const t = data?.termsText;
        setPrivacy(p && p.trim().length > 0 ? fill(p) : UNAVAILABLE);
        setTerms(t && t.trim().length > 0 ? fill(t) : UNAVAILABLE);
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
    <div className="flex flex-col h-full bg-background">
      <AppHeader />
      {/* Stesso pattern delle pagine di dettaglio (AlbumDetail/MatchDetail):
          freccia a sinistra + titolo centrato sulla stessa riga, sotto la head bar. */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <button
            className="shrink-0 -ml-1 p-1.5 rounded-full text-foreground active:scale-95 transition-transform"
            onClick={() => {
              // "note" si apre dal Profilo (via wouter): torno lì con setLocation
              // (history.back non è affidabile con wouter/PWA standalone).
              // "privacy"/"termini" si aprono dal login (navigazione nativa <a>):
              // lì il back del browser funziona; fallback al login.
              if (doc === "note") setLocation("/profilo");
              else if (window.history.length > 1) window.history.back();
              else setLocation("/login");
            }}
            aria-label="Indietro"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-xl font-bold leading-tight text-foreground text-center pr-7">{title}</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full space-y-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : (
          sections.map((s, i) => (
            <section key={i}>
              {doc === "note" && (
                <h2 className="text-lg font-bold mb-2 text-foreground text-center">{s.heading}</h2>
              )}
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {s.body}
              </pre>
            </section>
          ))
        )}

        <div className="border-t border-border pt-4 text-xs text-muted-foreground leading-relaxed">
          App indipendente, non affiliata, sponsorizzata né approvata da Panini S.p.A.,
          dalla FIFA, dall'UEFA o da qualsiasi altro editore, federazione o organizzatore.
          Non riproduciamo immagini, fotografie, copertine, loghi, emblemi o stemmi di terzi:
          gestiamo esclusivamente dati testuali descrittivi delle figurine (codice identificativo,
          nome del giocatore o descrizione, squadra o nazionale) a fini di catalogazione,
          collezione e scambio tra utenti. I nomi, i marchi e le denominazioni eventualmente
          citati appartengono ai rispettivi titolari e sono utilizzati a soli fini descrittivi
          e identificativi, senza alcuna finalità di sfruttamento commerciale del marchio altrui.
        </div>
      </div>
    </div>
  );
}

export default LegalPage;
