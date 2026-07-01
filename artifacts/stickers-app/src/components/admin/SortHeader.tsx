import { ArrowUpNarrowWide, ArrowDownWideNarrow } from "lucide-react";

export type SortDir = "asc" | "desc";

/**
 * Intestazione di colonna ordinabile per le tabelle admin: etichetta + icona a
 * tre linee (crescente per A→Z / 0→9, decrescente per l'inverso). L'icona è
 * colorata sulla colonna attiva, grigia sulle altre. Riutilizzata da più pagine
 * (Utenti, Album) per un ordinamento coerente ovunque.
 *
 * `col` è generico: ogni pagina passa le proprie chiavi di colonna.
 */
export function SortHeader<K extends string>({
  label, col, sortKey, sortDir, onSort,
}: {
  label: string;
  col: K;
  sortKey: K;
  sortDir: SortDir;
  onSort: (col: K) => void;
}) {
  const active = sortKey === col;
  const Icon = active && sortDir === "desc" ? ArrowDownWideNarrow : ArrowUpNarrowWide;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className="inline-flex items-center gap-1.5 mx-auto hover:text-foreground transition-colors uppercase tracking-wide"
      aria-label={`Ordina per ${label} ${active && sortDir === "asc" ? "decrescente" : "crescente"}`}
      title={active
        ? (sortDir === "asc" ? "Ordine crescente (clicca per invertire)" : "Ordine decrescente (clicca per invertire)")
        : `Ordina per ${label}`}
      data-testid={`sort-${col}`}
    >
      {label}
      <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground/50"}`} />
    </button>
  );
}
