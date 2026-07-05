// Pulsante donazione Ko-fi — link ESTERNO (non lo script kofiwidget2, che rende
// male in React/PWA). Apre la pagina Ko-fi in una nuova scheda. È una donazione
// LIBERA senza contropartita: non sblocca nulla, non tocca permessi/RLS. L'app
// non tratta né salva dati di pagamento (tutto avviene su Ko-fi/PayPal).
//
// Un solo punto di verità per link, colore e icona: riusato ovunque serva
// (Profilo, modale benvenuto della guida).

// Pagina Ko-fi dell'owner + colore ufficiale del bottone.
export const KOFI_URL = "https://ko-fi.com/deroarts";
const KOFI_GREEN = "#3dbd45";

// Icona tazza Ko-fi (SVG inline → nessuna risorsa esterna, ok CSP/PWA). Stessa
// tazzina del widget ufficiale: corpo bianco, cuore rosso Ko-fi, vapore.
function KofiCup() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" role="img" aria-hidden="true">
      <path
        fill="#ffffff"
        d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173-1.478a4.87 4.87 0 0 1-1.798.281s-.05-1.601-.075-2.256c-.024-.638-.075-1.85-.075-1.85s2.427-.211 3.247.897c.638.874.264 2.372-1.299 2.928z"
      />
    </svg>
  );
}

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
      <KofiCup />
      <span>{label}</span>
    </a>
  );
}
