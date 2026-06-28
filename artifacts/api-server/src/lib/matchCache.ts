/**
 * Cache in-memory dei risultati delle LISTE match (best/nearby).
 *
 * Perché: la query match aggrega su tutta `user_stickers` ed è il punto più
 * costoso dell'app; viene chiamata a ogni apertura di Home/Match. La lista però
 * non cambia finché l'utente non tocca le proprie figurine/album o la zona.
 *
 * Strategia: deploy unico su Render = singola istanza, quindi una Map basta
 * (niente Redis, niente costi). TTL breve: i cambiamenti di ALTRI utenti si
 * riflettono entro il TTL; i cambiamenti dell'utente STESSO invalidano subito
 * la sua cache (vedi `invalidateUser`). Nessun dato sensibile in cache.
 */

type Entry = { value: unknown; expires: number };

const TTL_MS = Number(process.env.MATCH_CACHE_TTL_MS ?? "60000");
const MAX_ENTRIES = Number(process.env.MATCH_CACHE_MAX ?? "5000");

const store = new Map<string, Entry>();

export function getCached<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (e.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function setCached(key: string, value: unknown): void {
  // Eviction semplice (FIFO) quando si raggiunge il tetto: sufficiente per una
  // singola istanza; impedisce la crescita illimitata della memoria.
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + TTL_MS });
}

/** Invalida tutte le voci match di un utente (cambio figurine/album/zona). */
export function invalidateUser(userId: number): void {
  const prefix = `u:${userId}:`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
