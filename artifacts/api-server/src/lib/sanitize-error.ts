import { createHash } from "crypto";

/**
 * Pattern-based sanitizer for error reports. Strips data that must NEVER end
 * up in the error_reports table (PII, secrets, absolute paths). Order matters:
 * the most specific patterns run first so we don't over-redact.
 */
const PATTERNS: Array<[RegExp, string]> = [
  // Tokens / secrets first (most specific).
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[JWT]"],
  [/\bBearer\s+[A-Za-z0-9._-]+/gi, "[BEARER]"],
  // Context-aware secrets: only redact the value when preceded by a key name.
  // Keeps generic 4-8 digit numbers (line numbers, ids) intact for debugging.
  [
    /(password|pwd|pin|otp|token|secret|api[_-]?key|authorization|recover[a-z]*[_-]?code)\s*[:=]\s*[^\s,;'")&]+/gi,
    "$1=[REDACTED]",
  ],
  [
    /\b(pin|otp|code)\s+(?:is|=|:)?\s*\d{4,10}\b/gi,
    "$1=[REDACTED]",
  ],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[EMAIL]"],
  // IPv4 (incl. IPv4-mapped IPv6 like ::ffff:1.2.3.4).
  [/\b(?:::ffff:)?(?:\d{1,3}\.){3}\d{1,3}\b/gi, "[IP]"],
  // IPv6: 2+ hextet groups separated by ":" (avoids matching plain "12:34" times).
  [/\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi, "[IP]"],
  [/\b::1\b/g, "[IP]"],
  [/\bSTICK[-_][A-Z0-9]+(?:[-_][A-Z0-9]+)+\b/gi, "[CODE]"],
  // Unix absolute paths under common system roots.
  [/\/(?:home|Users|var|root|tmp|opt|etc|private)\/[^\s'":,)]+/g, "[PATH]"],
  // Windows paths: C:\Users\foo\bar  or  C:/Users/foo/bar
  [/[A-Za-z]:[\\/](?:Users|Documents and Settings|ProgramData|Windows|home)[\\/][^\s'":,)]+/gi, "[PATH]"],
];

export function sanitizeText(
  input: string | undefined | null,
  maxLen = 1000,
): string {
  if (!input) return "";
  let s = String(input).slice(0, maxLen * 3);
  for (const [re, rep] of PATTERNS) s = s.replace(re, rep);
  return s.trim().slice(0, maxLen);
}

/**
 * Normalize a path so /chat/123 and /chat/456 hash to the same bucket.
 * Strips query string, replaces numeric segments and long hex/uuid tokens.
 */
export function normalizePage(page: string | undefined | null): string {
  if (!page) return "";
  let p = String(page).split("?")[0].split("#")[0];
  p = p.replace(/\/\d+(?=\/|$)/g, "/:id");
  p = p.replace(/\/[0-9a-f-]{16,}(?=\/|$)/gi, "/:id");
  return p.slice(0, 200);
}

export function uaClass(ua: string | undefined | null): string {
  if (!ua) return "unknown";
  const u = String(ua).toLowerCase();
  if (/bot|crawl|spider|preview|fetch/.test(u)) return "bot";
  let device = "desktop";
  if (/iphone|ipad|ios/.test(u)) device = "mobile-ios";
  else if (/android/.test(u)) device = "mobile-android";
  else if (/mobile/.test(u)) device = "mobile";
  let browser = "other";
  if (/edg\//.test(u)) browser = "edge";
  else if (/chrome\//.test(u)) browser = "chrome";
  else if (/firefox/.test(u)) browser = "firefox";
  else if (/safari/.test(u)) browser = "safari";
  return `${device}-${browser}`;
}

export function ipPrefix(ip: string | undefined | null): string {
  if (!ip) return "";
  const s = String(ip).trim();
  const m4 = s.match(/^::ffff:(\d+\.\d+\.\d+)\.\d+$/) ?? s.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (m4) return `${m4[1]}.0/24`;
  if (s.includes(":")) {
    const parts = s.split(":").slice(0, 3).join(":");
    return `${parts}::/48`;
  }
  return "";
}

export function computeErrorHash(
  errorType: string,
  page: string,
  message: string,
): string {
  return createHash("sha256")
    .update(`${errorType}|${page}|${message.slice(0, 200)}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Drop entries that look like raw secrets (no point in storing 1-token "msg").
 */
export function looksEmpty(s: string): boolean {
  const t = s.trim();
  return t.length === 0 || /^\[(JWT|BEARER|EMAIL|IP|CODE|PATH|REDACTED)\]$/.test(t);
}
