// Schermata finale della guida = modale CENTRALE (non un fumetto): logo in alto,
// messaggio di benvenuto + buon uso, e la spiegazione "app gratuita + contributo
// spontaneo". Il bottone donazione è PREDISPOSTO ma non ancora attivo (avviso
// gentile): la funzione vera si collegherà più avanti. Chiudendo, la guida finisce.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/brand/AppLogo";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Logo PayPal (SVG inline, nessuna immagine esterna → rispetta i vincoli app).
// "PayPal" nei due blu ufficiali; usato dentro il bottone donazione classico.
function PayPalWordmark() {
  return (
    <svg viewBox="0 0 101 32" height="20" role="img" aria-label="PayPal" className="shrink-0">
      <path fill="#003087" d="M12.7 4.1H6.2c-.4 0-.8.3-.9.8L2.7 23.2c0 .3.2.6.5.6h3.1c.4 0 .8-.3.9-.8l.7-4.5c.1-.4.4-.8.9-.8h2c4.3 0 6.8-2.1 7.4-6.2.3-1.8 0-3.2-.9-4.2-1-1.1-2.7-1.7-5.1-1.7zm.8 6.1c-.4 2.3-2.1 2.3-3.8 2.3H8.7l.7-4.4c0-.3.3-.5.6-.5h.5c1.2 0 2.3 0 2.8.7.4.4.5 1 .4 1.9z"/>
      <path fill="#003087" d="M35.6 10.1h-3.1c-.3 0-.5.2-.6.5l-.1.9-.2-.3c-.7-1-2.2-1.3-3.7-1.3-3.5 0-6.4 2.6-7 6.3-.3 1.8.1 3.6 1.2 4.8 1 1.1 2.4 1.6 4.1 1.6 2.8 0 4.3-1.8 4.3-1.8l-.1.9c0 .3.2.6.5.6h2.8c.4 0 .8-.3.9-.8l1.7-10.6c0-.3-.2-.5-.5-.5zm-4.3 6.1c-.3 1.8-1.7 3-3.5 3-.9 0-1.6-.3-2.1-.8-.4-.6-.6-1.3-.5-2.2.3-1.8 1.7-3 3.4-3 .9 0 1.6.3 2.1.9.5.5.7 1.3.6 2.1z"/>
      <path fill="#003087" d="M52.2 10.1h-3.1c-.3 0-.6.2-.7.4l-4.3 6.3-1.8-6.1c-.1-.4-.5-.6-.8-.6h-3c-.3 0-.6.3-.5.7l3.4 10-3.2 4.5c-.2.3 0 .8.4.8h3.1c.3 0 .6-.2.7-.4l10.3-14.9c.3-.4 0-.9-.5-.9z"/>
      <path fill="#0070e0" d="M62.5 4.1H56c-.4 0-.8.3-.9.8l-2.6 16.7c0 .3.2.6.5.6h3.3c.3 0 .5-.2.6-.5l.7-4.7c.1-.4.4-.8.9-.8h2c4.3 0 6.8-2.1 7.4-6.2.3-1.8 0-3.2-.9-4.2-1-1.1-2.7-1.5-5-1.5zm.8 6.1c-.4 2.3-2.1 2.3-3.8 2.3h-1l.7-4.4c0-.3.3-.5.6-.5h.5c1.2 0 2.3 0 2.8.7.4.4.5 1 .4 1.9z"/>
      <path fill="#0070e0" d="M85.4 10.1h-3.1c-.3 0-.5.2-.6.5l-.1.9-.2-.3c-.7-1-2.2-1.3-3.7-1.3-3.5 0-6.4 2.6-7 6.3-.3 1.8.1 3.6 1.2 4.8 1 1.1 2.4 1.6 4.1 1.6 2.8 0 4.3-1.8 4.3-1.8l-.1.9c0 .3.2.6.5.6h2.8c.4 0 .8-.3.9-.8l1.7-10.6c0-.3-.2-.5-.6-.5zm-4.3 6.1c-.3 1.8-1.7 3-3.5 3-.9 0-1.6-.3-2.1-.8-.4-.6-.6-1.3-.5-2.2.3-1.8 1.7-3 3.4-3 .9 0 1.6.3 2.1.9.5.5.7 1.3.6 2.1z"/>
      <path fill="#0070e0" d="M89 4.6l-2.6 16.9c0 .3.2.6.5.6h2.7c.4 0 .8-.3.9-.8L93 4.5c0-.3-.2-.5-.5-.5h-3c-.3 0-.5.2-.5.6z"/>
    </svg>
  );
}

export function GuideFinishDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // "Inizia a giocare": chiude la guida E porta l'utente in home (l'app si apre
  // sulla schermata principale, pronta all'uso — non resta sull'ultima pagina
  // della guida, la chat).
  const handleStart = () => {
    onClose();
    setLocation("/");
  };

  // Donazione: PER ORA solo predisposta. Al tocco un ringraziamento gentile;
  // il pagamento reale verrà collegato più avanti (link esterno o checkout).
  const handleDonate = () => {
    toast({
      title: "Grazie di cuore 🙏",
      description:
        "I contributi non sono ancora attivi. Presto potrai offrire il tuo aiuto: intanto grazie per esserci!",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-3xl text-center">
        {/* Logo piccolo in alto, centrato */}
        <div className="flex justify-center pt-1">
          <AppLogo className="h-12 w-auto" />
        </div>

        <DialogHeader className="space-y-1">
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-1.5">
            Benvenuto tra noi!
            <Sparkles className="h-5 w-5 text-accent" />
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Ora sai tutto: crea la tua collezione,<br />
            trova i match e scambia le figurine.
          </DialogDescription>
        </DialogHeader>

        {/* Nota "app gratuita + contributo" — compatta, calda, user-friendly */}
        <div className="rounded-2xl bg-accent/10 border border-accent/20 px-4 py-3 text-left">
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-semibold">Stickers è gratis e te la regalo io. 🎁</span><br />
            Un piccolo contributo, se ti va, aiuta a pagare i database
            e a tenere l'app gratuita nel tempo.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          {/* Bottone PayPal "Dona ora" classico (oro), riconoscibile. Per ora
              NON collegato: al tocco un ringraziamento (vedi handleDonate). */}
          <button
            onClick={handleDonate}
            aria-label="Dona ora con PayPal"
            className="w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-bold text-[#003087] shadow-sm active:scale-[.98] transition-transform"
            style={{ background: "linear-gradient(#ffd45a, #f9b421)" }}
          >
            <span>Dona ora</span>
            <PayPalWordmark />
          </button>
          <Button variant="ghost" onClick={handleStart} className="w-full">
            Inizia a giocare
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
