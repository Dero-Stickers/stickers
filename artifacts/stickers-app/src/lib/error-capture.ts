/**
 * Global error capture for the web app. Installs handlers that catch the
 * errors which would otherwise be SILENT (no UI, no report):
 *
 *  - window "error"            → uncaught JS errors + failed resource loads
 *  - window "unhandledrejection" → promises that reject without a catch
 *  - vite "vite:preloadError"  → lazy chunk failed to download (white screen)
 *  - API failures (5xx / network) → reported via reportApiFailure()
 *
 * Design goals (so the admin "Segnalazioni" stays useful, not noisy):
 *  - Dedup + throttle on the client: the same error is not sent over and over.
 *  - A noise filter drops well-known harmless errors (browser extensions,
 *    ResizeObserver loop, cancelled requests…).
 *  - Best-effort: capture must NEVER throw or block the app.
 *
 * The actual transport is `reportError` (lib/report-error.ts); the server then
 * sanitizes (PII/secrets) and dedups by hash. This module only decides WHAT to
 * send and WHEN, never WHERE.
 */
import { reportError } from "@/lib/report-error";

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

const MAX_REPORTS_PER_SESSION = 25; // hard cap so a runaway loop can't spam
const DEDUP_WINDOW_MS = 60_000; // same signature within 1 min → send once
const MIN_INTERVAL_MS = 1_500; // global throttle between two sends

// ---------------------------------------------------------------------------
// Noise filter — substrings that mark a harmless / non-actionable error.
// These are well-documented browser quirks or things outside our control.
// ---------------------------------------------------------------------------

const NOISE_SUBSTRINGS = [
  "resizeobserver loop", // benign layout warning, fired by Chrome
  "script error.", // cross-origin error with no detail (usually extensions)
  "non-error promise rejection captured",
  "load failed", // Safari's generic message for an aborted fetch
  "the operation was aborted", // AbortController cancellations
  "abort error",
  // Fetch annullata dal browser quando l'utente cambia pagina / ricarica prima
  // che la risposta arrivi. È navigazione normale, NON un guasto: un vero errore
  // server risponde HTTP 5xx (passa da reportApiFailure, senza "aborted") e
  // continua ad arrivare. Chrome dice "Fetch is aborted", Firefox "signal is
  // aborted without reason".
  "is aborted", // copre "fetch is aborted" e "signal is aborted..."
  "aborted without reason",
  "networkerror when attempting to fetch resource", // often a cancelled nav
  // Browser extension / wallet / tracker noise (iniettato dal browser utente,
  // mai dal nostro codice: filtrare non nasconde nulla di nostro).
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "extensions/",
  "__firefox__",
  "connect.facebook.net", // pixel/SDK Facebook iniettato da estensioni o in-app browser
  "fbevents.js",
  "googletagmanager.com",
  "google-analytics.com",
];

export function isNoise(message: string): boolean {
  if (!message) return true;
  const m = message.toLowerCase();
  // Promise rifiutata senza alcun contenuto: describe() non ha trovato né
  // messaggio né stack, resta solo la parola generica "Rejected". Non è
  // azionabile (nessun frame nostro). Match ESATTO per non filtrare per sbaglio
  // errori veri che contengono la parola "rejected" in una frase più ricca.
  if (m.trim() === "rejected") return true;
  return NOISE_SUBSTRINGS.some((s) => m.includes(s));
}

// ---------------------------------------------------------------------------
// Dedup + throttle state (module-level, lives for the page session)
// ---------------------------------------------------------------------------

const recent = new Map<string, number>(); // signature → last-sent timestamp
let sentCount = 0;
let lastSendAt = 0;

function now(): number {
  return Date.now();
}

/** Build a stable signature so repeats of the same error collapse. */
function signature(type: string, message: string, page: string): string {
  // First line of the message is enough; numbers stripped so "line 42 / 43"
  // don't look like two distinct errors.
  const head = (message || "").split("\n")[0].replace(/\d+/g, "#").slice(0, 200);
  return `${type}|${page}|${head}`;
}

/**
 * Decide whether an error should be sent right now. Pure-ish (reads/writes the
 * module dedup state) so it can be unit-tested by injecting `ts`.
 */
export function shouldSend(
  type: string,
  message: string,
  page: string,
  ts: number = now(),
): boolean {
  if (isNoise(message)) return false;
  if (sentCount >= MAX_REPORTS_PER_SESSION) return false;
  if (ts - lastSendAt < MIN_INTERVAL_MS) return false;

  const sig = signature(type, message, page);
  const last = recent.get(sig);
  if (last !== undefined && ts - last < DEDUP_WINDOW_MS) return false;

  recent.set(sig, ts);
  lastSendAt = ts;
  sentCount += 1;
  // Keep the dedup map from growing unbounded.
  if (recent.size > 200) {
    const cutoff = ts - DEDUP_WINDOW_MS;
    for (const [k, t] of recent) if (t < cutoff) recent.delete(k);
  }
  return true;
}

/** Reset internal state — test helper only. */
export function __resetCaptureState(): void {
  recent.clear();
  sentCount = 0;
  lastSendAt = 0;
}

// ---------------------------------------------------------------------------
// Helpers to extract a clean message/stack from any thrown value
// ---------------------------------------------------------------------------

function currentPage(): string {
  try {
    return window.location.pathname || "";
  } catch {
    return "";
  }
}

function topOfStack(stack: string | undefined): string {
  if (!stack) return "";
  return stack.split("\n").slice(0, 8).join("\n");
}

function describe(value: unknown): { message: string; stack: string } {
  if (value instanceof Error) {
    return { message: value.message || value.name, stack: topOfStack(value.stack) };
  }
  if (typeof value === "string") return { message: value, stack: "" };
  try {
    return { message: JSON.stringify(value).slice(0, 500), stack: "" };
  } catch {
    return { message: String(value), stack: "" };
  }
}

type CaptureType = "client_crash" | "api_error" | "other";

function dispatch(
  type: CaptureType,
  message: string,
  stack: string,
  note: string,
  page = currentPage(),
): void {
  try {
    if (!shouldSend(type, message, page)) return;
    void reportError({
      errorType: type,
      page,
      messageClean: message,
      stackTop: stack,
      userNote: note,
    });
  } catch {
    // capture must never throw
  }
}

// ---------------------------------------------------------------------------
// API failure hook — called from the shared customFetch via a registered cb.
// We only care about server faults (5xx) and network failures, NOT the normal
// 4xx (wrong PIN, validation 400) which are expected behaviour.
// ---------------------------------------------------------------------------

export function reportApiFailure(info: {
  status: number | null; // null = network/connection failure (no response)
  method: string;
  url: string;
  message: string;
}): void {
  const { status, method, url, message } = info;
  // Skip expected client-side outcomes.
  if (status !== null && status < 500) return;
  // Strip query string and origin so the page bucket stays stable & PII-free.
  let path = url;
  try {
    path = new URL(url, window.location.origin).pathname;
  } catch {
    /* keep raw */
  }
  const label = status === null ? "rete/connessione" : `HTTP ${status}`;
  dispatch(
    "api_error",
    `${method} ${path} → ${label}: ${message}`.slice(0, 500),
    "",
    "Errore API automatico",
    path,
  );
}

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------

let installed = false;

export function installGlobalErrorCapture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Uncaught JS errors + failed resource (script/img) loads.
  window.addEventListener(
    "error",
    (event: ErrorEvent | Event) => {
      // Resource load error: target is the element, no `error` on the event.
      const target = (event as Event).target as
        | (HTMLElement & { src?: string; href?: string })
        | null;
      if (target && target !== (window as unknown) && (target.src || target.href)) {
        const src = target.src || target.href || "";
        dispatch(
          "other",
          `Risorsa non caricata: ${target.tagName?.toLowerCase()} ${src}`.slice(0, 300),
          "",
          "Caricamento risorsa fallito",
        );
        return;
      }
      const e = event as ErrorEvent;
      const { message, stack } = describe(e.error ?? e.message);
      dispatch("client_crash", message, stack, "Errore JS non gestito");
    },
    true, // capture phase → also catches resource load errors
  );

  // Promises that reject and are never caught.
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const { message, stack } = describe(event.reason);
    dispatch("client_crash", message, stack, "Promise non gestita");
  });

  // Vite: a lazy-loaded chunk failed to download → would be a white screen.
  // We report it; the app-level handler can decide to hard-reload.
  window.addEventListener("vite:preloadError", (event: Event) => {
    const payload = (event as unknown as { payload?: unknown }).payload;
    const { message } = describe(payload ?? "preload error");
    dispatch(
      "other",
      `Chunk non caricato: ${message}`.slice(0, 300),
      "",
      "Caricamento app fallito (preload)",
    );
  });
}
