export type Priority = "critical" | "high" | "medium" | "low";
export type Status = "new" | "investigating" | "resolved" | "ignored";

export interface ErrorRow {
  id: string;
  errorHash: string;
  count: number;
  priority: Priority;
  status: Status;
  page: string | null;
  errorType: string;
  messageClean: string | null;
  stackTop: string | null;
  uaClass: string | null;
  ipPrefix: string | null;
  userId: number | null;
  nickname: string | null;
  appVersion: string | null;
  userNote: string | null;
  adminNote: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export interface ListResponse {
  counts: { total: number; new: number; critical: number; last7d: number };
  items: ErrorRow[];
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Bassa",
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export const STATUS_LABEL: Record<Status, string> = {
  new: "Nuova",
  investigating: "In analisi",
  resolved: "Risolta",
  ignored: "Ignorata",
};

export const STATUS_COLOR: Record<Status, string> = {
  new: "bg-blue-100 text-blue-700",
  investigating: "bg-violet-100 text-violet-700",
  resolved: "bg-green-100 text-green-700",
  ignored: "bg-gray-100 text-gray-600",
};

export function authHeaders(): HeadersInit {
  const token = localStorage.getItem("sticker_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Mappa pagina (normalizzata) → nome leggibile della sezione, per l'anteprima.
const PAGE_LABEL: Array<[RegExp, string]> = [
  [/^\/$/, "Home"],
  [/^\/album\/:id/, "Dettaglio album"],
  [/^\/album/, "Album"],
  [/^\/match\/:id/, "Dettaglio match"],
  [/^\/match/, "Match"],
  [/^\/chat/, "Chat"],
  [/^\/profilo/, "Profilo"],
  [/^\/login/, "Accesso"],
  [/^\/recover/, "Recupero account"],
  [/^\/legal/, "Note legali"],
  [/^\/admin/, "Area admin"],
];

export function sectionLabel(page: string | null): string {
  if (!page) return "una pagina";
  for (const [re, label] of PAGE_LABEL) if (re.test(page)) return label;
  return page;
}

/**
 * Descrizione SEMPLICE per l'anteprima, senza tecnicismi: traduce il tipo di
 * errore in una frase chiara, contestualizzata sulla sezione dell'app.
 * Il dettaglio tecnico resta nella scheda di dettaglio.
 */
export function friendlyTitle(row: Pick<ErrorRow, "errorType" | "page" | "userNote">): string {
  // Una segnalazione scritta a mano dall'utente vale più di una frase generica.
  if (row.errorType === "user_report" && row.userNote?.trim()) {
    return row.userNote.trim();
  }
  const where = sectionLabel(row.page);
  switch (row.errorType) {
    case "user_report":
      return `Segnalazione di un utente da “${where}”`;
    case "client_crash":
      return `La pagina “${where}” si è bloccata durante l'uso`;
    case "api_error":
      return `“${where}” non è riuscita a comunicare col server`;
    case "other":
      return `Problema di caricamento in “${where}”`;
    default:
      return `Problema in “${where}”`;
  }
}

/** Etichetta utente per l'anteprima: nickname o "Anonimo". */
export function userLabel(row: Pick<ErrorRow, "nickname" | "userId">): string {
  if (row.nickname) return row.nickname;
  if (row.userId != null) return `Utente #${row.userId}`;
  return "Anonimo";
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ora";
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h fa`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} g fa`;
  return new Date(iso).toLocaleDateString("it-IT");
}
