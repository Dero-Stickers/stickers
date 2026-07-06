/**
 * Preferenze locali della sezione Match, legate al DISPOSITIVO (non al DB).
 *
 * Il raggio di ricerca impostato dallo slider "Vicini a te" resta memorizzato
 * su questo browser: riaprendo la pagina l'utente ritrova l'ultimo valore.
 * Viene azzerato SOLO al logout esplicito (vedi AuthContext.logout), non allo
 * scambio di vista né al semplice ricaricamento.
 */

export const RADIUS_MIN = 1;
export const RADIUS_MAX = 150;
export const RADIUS_DEFAULT = 10;

const RADIUS_KEY = "sticker_match_radius";

function clampRadius(km: number): number {
  if (!Number.isFinite(km)) return RADIUS_DEFAULT;
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Math.round(km)));
}

// Ultimo raggio salvato su questo dispositivo (default RADIUS_DEFAULT).
export function getStoredRadius(): number {
  try {
    const raw = localStorage.getItem(RADIUS_KEY);
    if (raw === null) return RADIUS_DEFAULT;
    const n = Number(raw);
    return Number.isNaN(n) ? RADIUS_DEFAULT : clampRadius(n);
  } catch {
    return RADIUS_DEFAULT;
  }
}

// Memorizza il raggio scelto dallo slider (persistente sul dispositivo).
export function setStoredRadius(km: number): void {
  try {
    localStorage.setItem(RADIUS_KEY, String(clampRadius(km)));
  } catch {
    /* no-op: senza localStorage la scelta vale solo per la sessione */
  }
}

// Azzera la preferenza — chiamata solo al logout.
export function clearStoredRadius(): void {
  try {
    localStorage.removeItem(RADIUS_KEY);
  } catch {
    /* no-op */
  }
}
