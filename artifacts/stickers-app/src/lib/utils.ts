import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formato canonico del nickname, coerente col backend:
 * - caratteri ammessi: lettere, numeri, trattino, underscore
 * - massimo 12 caratteri
 * - iniziale MAIUSCOLA, resto minuscolo (es. "marco-bo" -> "Marco-bo")
 * Usato negli input (mentre si digita) e per normalizzare la visualizzazione.
 */
export function formatNickname(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 12);
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}
