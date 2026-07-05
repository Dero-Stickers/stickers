// Pulsante donazione Ko-fi — stile del widget ufficiale (tazza + verde #3dbd45),
// testo "Support Stickers". NON è più un link diretto: al clic apre un MODALE
// che invita l'utente a incollare il proprio nickname nel messaggio Ko-fi, così
// l'admin può riconoscere chi ha donato (Ko-fi NON permette di passare il nick
// in automatico via link → questo è l'unico modo pulito e gratuito).
// Flusso: [Support Stickers] → modale (nickname + Copia) → [Vai a Ko-fi].
//
// Un solo punto di verità per link, colore, icona e testo: riusato ovunque serva
// (Profilo, modale benvenuto della guida).

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Pagina Ko-fi dell'owner + colore del bottone + testo in ITALIANO.
// Non citiamo "Ko-fi" nel testo utente: è un dettaglio tecnico (Ko-fi è solo il
// mezzo). Il pulsante comunica il gesto: "Sostieni Stickers".
export const KOFI_URL = "https://ko-fi.com/deroarts";
const KOFI_GREEN = "#3dbd45";
const KOFI_LABEL = "Sostieni Stickers";

// Tazza Ko-fi come nel widget: tazzina BIANCA con il CUORE ROSSO Ko-fi dentro
// (SVG inline → nessuna risorsa esterna, ok CSP/PWA).
function KofiCup() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" role="img" aria-hidden="true">
      {/* corpo tazza (bianco) */}
      <path
        fill="#ffffff"
        d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-6.173 2.099a4.87 4.87 0 0 1-1.798.281s-.05-1.601-.075-2.256c-.024-.638-.075-1.85-.075-1.85s2.427-.211 3.247.897c.638.874.264 2.372-1.299 2.928z"
      />
      {/* cuore Ko-fi (rosso) dentro la tazza */}
      <path
        fill="#ff5e5b"
        d="M11.5 6.583c-1.903-.819-3.468.963-3.468.963-1.358-1.493-3.412-1.417-4.363-.407-.95 1.01-.618 2.745.091 3.71.666.905 3.591 3.513 4.034 3.954 0 0 .032.033.108.09.189.096.31-.023.31-.023s2.765-2.523 4.011-3.976c1.109-1.3 1.181-3.491-.723-4.311z"
      />
    </svg>
  );
}

export function KofiButton({ label = KOFI_LABEL, className = "" }: { label?: string; className?: string }) {
  const { currentUser } = useAuth();
  const nickname = currentUser?.nickname ?? "";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyNick = async () => {
    try {
      await navigator.clipboard.writeText(nickname);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard può fallire (permessi/HTTP): l'utente può copiare a mano.
    }
  };

  const goToKofi = () => {
    window.open(KOFI_URL, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setCopied(false); setOpen(true); }}
        aria-label={label}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-bold text-white shadow-sm active:scale-[.98] transition-transform ${className}`}
        style={{ background: KOFI_GREEN }}
      >
        <KofiCup />
        <span>{label}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl text-center">
          <DialogHeader className="items-center">
            <DialogTitle className="text-center">Fai sapere che sei tu ❤️</DialogTitle>
            <DialogDescription className="text-center">
              Copia il tuo nickname
              <br />
              e incollalo quando fai la donazione,
              <br />
              così sappiamo che la donazione arriva da te.
            </DialogDescription>
          </DialogHeader>

          {nickname && (
            <button
              type="button"
              onClick={copyNick}
              className="w-full flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3 hover:bg-muted transition-colors"
              title="Copia il tuo nickname"
            >
              <span className="font-semibold text-foreground truncate">{nickname}</span>
              <span className="shrink-0 inline-flex items-center gap-1 text-sm text-primary font-medium">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiato" : "Copia"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={goToKofi}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-bold text-white shadow-sm active:scale-[.98] transition-transform"
            style={{ background: KOFI_GREEN }}
          >
            <KofiCup />
            <span>Sostieni Stickers</span>
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Il contributo è libero e non sblocca nulla: è solo un grazie.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
