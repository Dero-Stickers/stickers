// Categorie master degli album — lista per la UI (menu admin + chip-filtro user).
//
// Le CHIAVI qui devono restare allineate a `ALBUM_CATEGORIES` in
// `@workspace/db` (schema/album-categories.ts), che è la fonte per la
// VALIDAZIONE lato server. Sono duplicate qui perché il frontend non può
// dipendere dal package DB (contiene `pg`, codice solo-server). Le chiavi sono
// stabili: aggiungere una categoria = una riga QUI e una nel package DB.
// L'ORDINE (Campionato → Europei → Mondiali) definisce chip-filtro, menu e
// ordinamento album — deve combaciare con la lista nel package DB.
export const ALBUM_CATEGORIES = [
  { key: "campionato", label: "Campionati" },
  { key: "europei", label: "Europei" },
  { key: "mondiali", label: "Mondiali" },
] as const;

export type AlbumCategoryKey = (typeof ALBUM_CATEGORIES)[number]["key"];

export const DEFAULT_ALBUM_CATEGORY: AlbumCategoryKey = "campionato";

/** Label leggibile da una key (fallback: la key stessa). */
export function albumCategoryLabel(key: string): string {
  return ALBUM_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
