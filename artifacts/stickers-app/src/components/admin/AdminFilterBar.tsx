import { Search } from "lucide-react";

/**
 * Barra filtri minimale condivisa per le tabelle admin: campo ricerca (sfondo
 * bianco) + chip di stato. Discreta, attaccata alla tabella. Riutilizzata da
 * Messaggi / Utenti / Album per un aspetto e comportamento coerenti.
 *
 * I chip sono generici: ogni pagina passa le proprie opzioni [valore, etichetta].
 */
export function AdminFilterBar<T extends string>({
  search,
  onSearch,
  placeholder,
  filter,
  onFilter,
  options,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  filter: T;
  onFilter: (v: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <div className="shrink-0 flex flex-wrap items-center gap-2">
      {/* Box ricerca corto (come Gestione Messaggi, riferimento condiviso):
          lascia spazio ai chip sulla stessa riga invece di occupare tutto. */}
      <div className="relative w-48 md:w-56 shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full h-9 pl-8 pr-3 rounded-xl border bg-white text-sm shadow-sm"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {options.map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => onFilter(val)}
            className={`px-2.5 py-1 rounded-full border transition-colors ${
              filter === val
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}
