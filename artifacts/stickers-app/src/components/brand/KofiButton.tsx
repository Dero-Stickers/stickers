// Pulsante donazione Ko-fi — link ESTERNO (non lo script kofiwidget2, che rende
// male in React/PWA). Apre la pagina Ko-fi in una nuova scheda. È una donazione
// LIBERA senza contropartita: non sblocca nulla, non tocca permessi/RLS. L'app
// non tratta né salva dati di pagamento (tutto avviene su Ko-fi/PayPal).
//
// Un solo punto di verità per link, colore e icona: riusato ovunque serva
// (Profilo, modale benvenuto della guida).

import { Heart } from "lucide-react";

// Pagina Ko-fi dell'owner + colore ufficiale del bottone.
export const KOFI_URL = "https://ko-fi.com/deroarts";
const KOFI_GREEN = "#3dbd45";

export function KofiButton({ label = "Dona ora", className = "" }: { label?: string; className?: string }) {
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} su Ko-fi`}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-bold text-white shadow-sm active:scale-[.98] transition-transform ${className}`}
      style={{ background: KOFI_GREEN }}
    >
      <Heart className="h-4 w-4 fill-white" />
      <span>{label}</span>
    </a>
  );
}
