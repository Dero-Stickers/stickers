// Categorie master degli album — FONTE UNICA condivisa da backend, admin e user.
// Aggiungere una categoria futura = UNA riga qui (chiave stabile per il DB +
// label mostrata all'utente). Nessun'altra modifica al codice: i menu admin e i
// chip-filtro utente si generano da questa lista.
//
// `key`   = valore salvato in `albums.category` (stabile, minuscolo, no accenti).
// `label` = testo mostrato all'utente (chip e menu).
export const ALBUM_CATEGORIES = [
  { key: "mondiali", label: "Mondiali" },
  { key: "europei", label: "Europei" },
  { key: "campionato", label: "Campionato" },
] as const;

export type AlbumCategoryKey = (typeof ALBUM_CATEGORIES)[number]["key"];

export const ALBUM_CATEGORY_KEYS = ALBUM_CATEGORIES.map((c) => c.key) as AlbumCategoryKey[];

// Categoria di default per un album senza categoria esplicita (coerente col
// DEFAULT della colonna DB: la maggioranza degli album sono di campionato).
export const DEFAULT_ALBUM_CATEGORY: AlbumCategoryKey = "campionato";

/** True se `value` è una categoria valida. Utile per validare input admin. */
export function isAlbumCategory(value: unknown): value is AlbumCategoryKey {
  return typeof value === "string" && ALBUM_CATEGORY_KEYS.includes(value as AlbumCategoryKey);
}

/** Label leggibile da una key (fallback: la key stessa). */
export function albumCategoryLabel(key: string): string {
  return ALBUM_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
