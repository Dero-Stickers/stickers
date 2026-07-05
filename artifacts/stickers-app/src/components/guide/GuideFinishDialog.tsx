// Schermata finale della guida = modale CENTRALE (non un fumetto): logo in alto,
// messaggio di benvenuto + buon uso, e la nota "app gratuita + contributo
// spontaneo" con il pulsante donazione Ko-fi (link esterno). Il contributo è una
// liberalità: non sblocca nulla. Chiudendo, la guida finisce.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/brand/AppLogo";
import { KofiButton } from "@/components/brand/KofiButton";
import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export function GuideFinishDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();

  // "Inizia! Trova il tuo primo Match": porta l'utente in HOME e chiude la guida.
  // Navighiamo PRIMA (setLocation) e chiudiamo la guida DOPO, in un microtask:
  // così la chiusura del modale/della guida non "vince" sul cambio rotta (con
  // l'ordine inverso l'app restava sull'ultima pagina della guida).
  const handleStart = () => {
    setLocation("/");
    setTimeout(onClose, 0);
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
            Welcome in Stickers!
            <Sparkles className="h-5 w-5 text-accent" />
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Ora sai tutto: crea la tua collezione,<br />
            trova i match e scambia le figurine.
          </DialogDescription>
        </DialogHeader>

        {/* Nota "app gratuita + contributo" — compatta, calda, user-friendly.
            La frase "Non sblocca nulla: è solo un grazie" qualifica il contributo
            come liberalità (niente corrispettivo): va mantenuta. */}
        <div className="rounded-2xl bg-accent/10 border border-accent/20 px-4 py-3 text-left">
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-semibold">Stickers è appena nata! 🎁</span><br />
            Stickers oggi è gratuita. Il tuo contributo, se ti va, aiuta a
            tenerla così.<br />
            <span className="text-muted-foreground">Non sblocca nulla: è solo un grazie.</span>
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          {/* Donazione Ko-fi (link esterno). Contributo libero, non sblocca nulla. */}
          <KofiButton className="w-full" />
          <Button variant="ghost" onClick={handleStart} className="w-full">
            Inizia! Trova il tuo primo Match
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
