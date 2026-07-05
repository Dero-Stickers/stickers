// Invito a donare (una tantum): l'admin lo invia a un utente attivo dalla pagina
// Utenti; l'utente lo vede UNA volta al prossimo accesso. Non sblocca nulla,
// l'app resta gratuita: è solo un grazie. Il gate interroga /me/nudge e, se c'è
// un invito non ancora visto, apre il modale; alla chiusura (sia "Sostieni" che
// "No grazie") segna l'invito come visto → non riappare più.
//
// Tono e testo concordati con l'owner: complimento ("sei tra i più attivi"),
// mai colpevolizzazione ("ma non doni"). Conforme alle policy: chiudibile,
// nessun obbligo, nessun vantaggio in cambio.

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGetMyNudge, useMarkMyNudgeSeen, getGetMyNudgeQueryKey } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KofiButton } from "@/components/brand/KofiButton";

// Componente senza layout, montato a livello App (come BlockedGate): reagisce
// allo stato auth e mostra il modale una sola volta.
export function NudgeGate() {
  const { isAuthenticated, currentUser } = useAuth();
  // L'invito riguarda solo gli utenti normali (non l'admin). Interroga il server
  // solo quando serve, senza cache stantia (un invito appena inviato dev'essere
  // visto al primo accesso utile).
  const enabled = isAuthenticated && !!currentUser && !currentUser.isAdmin;
  const { data } = useGetMyNudge({
    query: { queryKey: getGetMyNudgeQueryKey(), enabled, staleTime: 0, refetchOnMount: "always" },
  });
  const markSeen = useMarkMyNudgeSeen();

  const [open, setOpen] = useState(false);
  // Evita di segnare "visto" più di una volta (es. chiusura + smontaggio).
  const seenRef = useRef(false);

  // Apri appena arriva un invito non visto (una volta per montaggio).
  useEffect(() => {
    if (enabled && data?.nudge) setOpen(true);
  }, [enabled, data?.nudge]);

  // Segna l'invito come visto (una volta): sia che l'utente scelga "Sostieni"
  // sia "No grazie", l'invito è consumato e non riappare più. NON chiude il
  // modale: la chiusura la gestisce onOpenChange (per "No grazie"/tap fuori),
  // mentre col tasto "Sostieni" lasciamo aperto il flusso Ko-fi.
  const consume = () => {
    if (!seenRef.current) {
      seenRef.current = true;
      markSeen.mutate();
    }
  };

  // "No grazie" o tap fuori: consuma e chiudi.
  const dismiss = () => {
    consume();
    setOpen(false);
  };

  if (!data?.nudge) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-sm rounded-3xl text-center">
        <DialogHeader className="items-center">
          <DialogTitle className="text-center">Sei tra i più attivi su Stickers! 💚</DialogTitle>
          <DialogDescription className="text-center">
            Vediamo che scambi e colleziona spesso!
            <br />
            L'app è e resta gratuita, se ti va di darci una mano,
            <br />
            puoi offrirci un piccolo contributo libero.
            <br />
            Nessun obbligo, è solo un grazie!
          </DialogDescription>
        </DialogHeader>

        {/* CTA verde riusata (apre il suo modale copia-nickname → Ko-fi). Al
            clic l'invito è consumato (visto), ma NON chiudiamo: lasciamo che il
            flusso Ko-fi prosegua sopra questo modale. */}
        <div onClickCapture={consume}>
          <KofiButton className="w-full" />
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          No grazie
        </button>
      </DialogContent>
    </Dialog>
  );
}
