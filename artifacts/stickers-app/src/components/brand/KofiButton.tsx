// Pulsante donazione Ko-fi — replica FEDELE del widget ufficiale (tazza + testo
// "Support me on Ko-fi", verde #3dbd45), ma reso come LINK NATIVO (non lo script
// kofiwidget2, che rende male in React/PWA). Apre la pagina Ko-fi in nuova scheda.
// È una donazione LIBERA senza contropartita: non sblocca nulla, non tocca
// permessi/RLS. L'app non tratta dati di pagamento (tutto su Ko-fi/PayPal).
//
// Un solo punto di verità per link, colore, icona e testo: riusato ovunque serva
// (Profilo, modale benvenuto della guida).

// Pagina Ko-fi dell'owner + colore ufficiale del bottone + testo del widget.
export const KOFI_URL = "https://ko-fi.com/deroarts";
const KOFI_GREEN = "#3dbd45";
const KOFI_LABEL = "Support me on Ko-fi";

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
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-bold text-white shadow-sm active:scale-[.98] transition-transform ${className}`}
      style={{ background: KOFI_GREEN }}
    >
      <KofiCup />
      <span>{label}</span>
    </a>
  );
}
