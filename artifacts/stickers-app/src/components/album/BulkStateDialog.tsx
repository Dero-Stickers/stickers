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

export type BulkState = "mancante" | "posseduta" | "doppia";

// Testi della conferma per ogni stato. "mancante" = azzeramento album, quindi
// linguaggio e colore più "attenzione". Tutte le azioni SOVRASCRIVONO lo stato
// corrente di tutte le figurine.
const COPY: Record<BulkState, { title: string; body: string; action: string; cls: string }> = {
  posseduta: {
    title: "Segnare tutte come possedute?",
    body: "Tutte le figurine dell'album diventeranno possedute. Le selezioni attuali (doppie e mancanti) verranno sovrascritte.",
    action: "Conferma",
    cls: "bg-green-600 text-white hover:bg-green-700",
  },
  doppia: {
    title: "Segnare tutte come doppie?",
    body: "Tutte le figurine dell'album diventeranno doppie. Le selezioni attuali verranno sovrascritte.",
    action: "Conferma",
    cls: "bg-red-600 text-white hover:bg-red-700",
  },
  mancante: {
    title: "Azzerare l'album?",
    body: "Tutte le figurine torneranno mancanti. Le selezioni attuali verranno eliminate.",
    action: "Azzera",
    cls: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
};

export function BulkStateDialog({ target, pending, onOpenChange, onConfirm }: {
  target: BulkState | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: BulkState) => void;
}) {
  const copy = target ? COPY[target] : null;
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            className={copy?.cls}
            disabled={pending}
            onClick={(e) => { e.preventDefault(); if (target) onConfirm(target); }}
          >
            {copy?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
