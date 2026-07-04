import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Striscia informativa mostrata sopra la lista match quando sono presenti i
// profili-prova (demo). Spiega cosa sono e permette di rimuoverli, con una
// conferma chiara. `onRemove` esegue la rimozione (flag localStorage + refresh).
export function DemoBanner({ onRemove }: { onRemove: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2.5">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">Profili di prova</p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          I profili con il badge <span className="font-semibold text-accent">PROVA</span> servono a mostrarti
          come funziona l'app. Non sono persone reali. Puoi rimuoverli quando vuoi.
        </p>
      </div>
      <button
        type="button"
        aria-label="Rimuovi profili di prova"
        onClick={() => setConfirmOpen(true)}
        className="shrink-0 -mr-1 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent/20"
      >
        <X className="h-4 w-4" />
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere i profili di prova?</AlertDialogTitle>
            <AlertDialogDescription>
              Spariranno dai tuoi match e non torneranno più. Continuerai a vedere i collezionisti reali
              man mano che aggiungi album e segni le tue doppie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onRemove}
            >
              Sì, rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
