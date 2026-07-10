import { Search, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Barra filtri minimale condivisa per le tabelle admin: campo ricerca (sfondo
 * bianco, placeholder "Cerca...") + pulsante refresh/reset tondo + chip di
 * stato. Discreta, attaccata alla tabella. Riutilizzata da Messaggi / Utenti /
 * Album / Donazioni / Errori per un aspetto e un comportamento coerenti.
 *
 * Ordine FISSO su una riga (stesso in ogni pagina): ricerca → refresh/reset →
 * chip → extra. Il pulsante refresh sta SEMPRE subito dopo la ricerca.
 *
 * I chip sono generici: ogni pagina passa le proprie opzioni [valore, etichetta].
 * `onRefresh` opzionale: se passato, mostra il pulsante tondo (ricarica i dati e
 * azzera i filtri, a cura della pagina). `refreshing` fa girare l'icona.
 * `extra` = contenuto opzionale reso sulla STESSA riga dopo i chip di stato
 * (es. il pulsante "Copia" in Messaggi), così tutti i filtri stanno in una riga.
 */
export function AdminFilterBar<T extends string>({
  search,
  onSearch,
  placeholder = "Cerca...",
  filter,
  onFilter,
  options,
  onRefresh,
  refreshing = false,
  extra,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  filter: T;
  onFilter: (v: T) => void;
  options: readonly (readonly [T, ReactNode])[];
  onRefresh?: () => void;
  refreshing?: boolean;
  extra?: ReactNode;
}) {
  return (
    // Riga unica: ricerca + refresh + chip + extra. Su mobile NON va a capo,
    // scorre in orizzontale (flex-nowrap + overflow-x-auto) — coerente in tutte
    // le sezioni admin.
    <div className="shrink-0 w-full flex flex-nowrap items-center gap-2 overflow-x-auto touch-pan-x">
      {/* Refresh/reset: pulsante TONDO, sola icona, SEMPRE in PRIMA posizione
          (fisso in tutte le pagine). */}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Aggiorna e azzera i filtri"
          title="Aggiorna e azzera i filtri"
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border bg-white text-muted-foreground shadow-sm hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      )}
      {/* Box ricerca: larghezza FISSA (mai flex-1: in una riga scorrevole con
          altri chip il flex-1 finirebbe per accavallarsi ai chip). Un filo più
          largo su mobile, poi cresce da sm in su. */}
      <div className="relative w-32 sm:w-44 md:w-56 shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full h-9 pl-8 pr-3 rounded-xl border bg-white text-sm shadow-sm"
        />
      </div>
      <div className="flex flex-nowrap gap-1.5 shrink-0">
        {options.map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => onFilter(val)}
            className={`shrink-0 whitespace-nowrap h-9 px-3.5 rounded-xl border text-sm shadow-sm transition-colors ${
              filter === val
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white border-border hover:bg-muted"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
      {extra}
    </div>
  );
}
