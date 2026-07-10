// Formattatori condivisi per le pagine admin (importi e date in formato it-IT).
// Unica fonte: prima erano duplicati identici in Users.tsx e Donations.tsx.

/** Importo "12.50" + valuta → "€ 12,50" (fallback grezzo se la valuta è ignota). */
export function formatMoney(amount: string | number, currency = "EUR"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currency}`;
  }
}

/** Data breve senza ora → "07 lug 2026" ("—" se assente/non valida). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

/** Data + ora → "07 lug 2026, 14:30" ("—" se assente/non valida). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}
