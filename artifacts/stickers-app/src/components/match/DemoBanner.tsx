import { Sparkles } from "lucide-react";

// Striscia informativa mostrata sopra la lista match quando sono presenti i
// profili-prova (demo). Spiega cosa sono e come rimuoverli (uno alla volta,
// entrando nel profilo). La rimozione avviene nel dettaglio del singolo profilo.
export function DemoBanner() {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2.5">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">Profili di prova</p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          I profili con il badge <span className="font-semibold text-accent">Utente test</span> ti mostrano come
          funziona l'app. Non sono persone reali. Aprine uno e usa{" "}
          <span className="font-medium text-foreground">"Elimina profilo di prova"</span> per toglierlo.
        </p>
      </div>
    </div>
  );
}
