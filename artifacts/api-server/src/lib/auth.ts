import {
  createHmac,
  timingSafeEqual,
  scrypt,
  randomBytes,
} from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number },
) => Promise<Buffer>;

const SECRET =
  process.env["SESSION_SECRET"] ??
  process.env["AUTH_SECRET"] ??
  (process.env["NODE_ENV"] === "production"
    ? (() => {
        throw new Error(
          "SESSION_SECRET is required in production but was not provided.",
        );
      })()
    : "dev-only-insecure-secret-do-not-use-in-prod");

const TOKEN_VERSION = "v1";
const SCRYPT_PREFIX = "scrypt$";
const SCRYPT_KEYLEN = 32;
const SCRYPT_COST = 16384;

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface SessionPayload {
  userId: number;
  isAdmin: boolean;
}

interface SignedTokenPayload extends SessionPayload {
  iat: number;
  exp: number;
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(data: string): string {
  return b64urlEncode(createHmac("sha256", SECRET).update(data).digest());
}

export function signToken(
  payload: SessionPayload,
  ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS,
): string {
  const now = Math.floor(Date.now() / 1000);
  const full: SignedTokenPayload = {
    userId: payload.userId,
    isAdmin: payload.isAdmin,
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = b64urlEncode(Buffer.from(JSON.stringify(full), "utf8"));
  const data = `${TOKEN_VERSION}.${body}`;
  const sig = sign(data);
  return `${data}.${sig}`;
}

export function verifyToken(token: string): SessionPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;

  const [version, body, sig] = parts;
  const expected = sign(`${version}.${body}`);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8"));
    if (
      typeof payload?.userId !== "number" ||
      typeof payload?.isAdmin !== "boolean"
    ) {
      return null;
    }
    if (typeof payload.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (now >= payload.exp) return null;
    }
    return { userId: payload.userId, isAdmin: payload.isAdmin };
  } catch {
    return null;
  }
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(pin, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_COST,
  });
  return `${SCRYPT_PREFIX}${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  if (!hash.startsWith(SCRYPT_PREFIX)) return false;

  const [, saltB64, hashB64] = hash.split("$");
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  let derived: Buffer;
  try {
    derived = await scryptAsync(pin, salt, expected.length, { N: SCRYPT_COST });
  } catch {
    return false;
  }
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export async function hashAnswer(answer: string): Promise<string> {
  return hashPin(answer.toLowerCase().trim());
}

export async function verifyAnswer(
  answer: string,
  hash: string,
): Promise<boolean> {
  return verifyPin(answer.toLowerCase().trim(), hash);
}

/**
 * Fixed-window rate limiter (in-memory, single-process).
 *
 * Storage is bounded to RATE_LIMIT_MAX_KEYS via insertion-order eviction
 * (Map iteration is insertion-ordered), so an attacker that probes with many
 * unique keys (different nicknames or IPs) cannot grow memory unboundedly.
 *
 * Keys are normalised:
 *  - hashed with SHA-256 → fixed 32-byte string regardless of input length;
 *  - this also avoids leaking caller-supplied data into log/error paths.
 *
 * For multi-process deployments this should move to Redis or similar; the
 * current single-Render-instance topology makes in-memory adequate.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_MAX_KEYS = 10_000;
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

function hashKey(key: string): string {
  return createHmac("sha256", "rl").update(key).digest("base64");
}

function evictOldestIfFull(): void {
  if (rateLimitStore.size < RATE_LIMIT_MAX_KEYS) return;
  const oldest = rateLimitStore.keys().next().value;
  if (oldest !== undefined) rateLimitStore.delete(oldest);
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const k = hashKey(key);
  const entry = rateLimitStore.get(k);
  if (!entry || entry.resetAt <= now) {
    if (entry) rateLimitStore.delete(k);
    evictOldestIfFull();
    rateLimitStore.set(k, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }
  if (entry.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }
  entry.count += 1;
  return {
    allowed: true,
    remaining: max - entry.count,
    retryAfterMs: 0,
  };
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(hashKey(key));
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetAt <= now) rateLimitStore.delete(k);
  }
}, 60_000).unref();
