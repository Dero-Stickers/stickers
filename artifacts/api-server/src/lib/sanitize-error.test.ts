import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeText,
  normalizePage,
  uaClass,
  ipPrefix,
  computeErrorHash,
  looksEmpty,
} from "./sanitize-error";

// ---------------------------------------------------------------------------
// sanitizeText — must strip every kind of secret/PII, keep useful debug info
// ---------------------------------------------------------------------------

test("sanitizeText redacts a JWT", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const out = sanitizeText(`token leaked: ${jwt}`);
  assert.ok(!out.includes(jwt), "raw JWT must not survive");
  assert.ok(out.includes("[JWT]"));
});

test("sanitizeText redacts Bearer tokens (value never survives)", () => {
  // With a header name present, the context-aware key=value rule redacts first
  // (→ [REDACTED]); without it, the standalone Bearer rule applies (→ [BEARER]).
  // Either way the token value must be gone — that's what matters for security.
  const withHeader = sanitizeText("Authorization: Bearer abc.DEF-123_xyz");
  assert.ok(!/abc\.DEF-123_xyz/.test(withHeader), "value leaked (with header)");
  assert.ok(/\[REDACTED\]|\[BEARER\]/.test(withHeader));

  const standalone = sanitizeText("got Bearer abc.DEF-123_xyz here");
  assert.ok(!/abc\.DEF-123_xyz/.test(standalone), "value leaked (standalone)");
  assert.ok(standalone.includes("[BEARER]"));
});

test("sanitizeText redacts pin / password / recovery code values", () => {
  assert.ok(sanitizeText("pin=4821").includes("[REDACTED]"));
  assert.ok(sanitizeText("password: hunter2!").includes("[REDACTED]"));
  assert.ok(sanitizeText("the pin is 12345").includes("[REDACTED]"));
  assert.ok(!sanitizeText("recoveryCode=ABCD-EFGH-1234").includes("ABCD-EFGH-1234"));
});

test("sanitizeText redacts email, IPv4, IPv6 and STICK codes", () => {
  assert.ok(sanitizeText("mail mario.rossi@example.com").includes("[EMAIL]"));
  assert.ok(sanitizeText("from 192.168.1.42 boom").includes("[IP]"));
  assert.ok(sanitizeText("from 2001:db8:85a3::8a2e:370:7334").includes("[IP]"));
  assert.ok(sanitizeText("code STICK-TST-AB12-CD34").includes("[CODE]"));
});

test("sanitizeText redacts absolute paths (unix + windows)", () => {
  assert.ok(sanitizeText("at /Users/dero/secret/app.ts:10").includes("[PATH]"));
  assert.ok(sanitizeText("at C:\\Users\\dero\\app.ts").includes("[PATH]"));
});

test("sanitizeText keeps harmless debug numbers (line/column)", () => {
  const out = sanitizeText("TypeError at line 42 col 7");
  assert.ok(out.includes("42"));
  assert.ok(out.includes("7"));
});

test("sanitizeText handles empty/null/undefined safely", () => {
  assert.equal(sanitizeText(""), "");
  assert.equal(sanitizeText(null), "");
  assert.equal(sanitizeText(undefined), "");
});

test("sanitizeText respects maxLen and never throws on huge input", () => {
  const huge = "x".repeat(100_000) + " mario@example.com";
  const out = sanitizeText(huge, 1000);
  assert.ok(out.length <= 1000);
});

// Randomized fuzz: a secret embedded in random noise must never leak verbatim.
test("sanitizeText fuzz: secrets never survive in random contexts", () => {
  const secrets = [
    "eyJhbGciOiJ.eyJzdWIi.dBjftJeZ4CV",
    "mario.rossi@example.com",
    "192.168.0.1",
    "STICK-TST-AAAA-BBBB",
  ];
  const filler = ["err", "at", "boom!", "x/y", "<>", "line 9", "{}", "退出", "%s"];
  // deterministic pseudo-random so the test is reproducible
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 300; i++) {
    const secret = secrets[Math.floor(rnd() * secrets.length)];
    const parts: string[] = [];
    const n = 1 + Math.floor(rnd() * 5);
    for (let j = 0; j < n; j++) parts.push(filler[Math.floor(rnd() * filler.length)]);
    const pos = Math.floor(rnd() * (parts.length + 1));
    parts.splice(pos, 0, secret);
    const out = sanitizeText(parts.join(" "));
    assert.ok(!out.includes(secret), `secret leaked: "${secret}" in "${out}"`);
  }
});

// ---------------------------------------------------------------------------
// normalizePage — same logical page must collapse to one bucket
// ---------------------------------------------------------------------------

test("normalizePage collapses ids and strips query/hash", () => {
  assert.equal(normalizePage("/chat/123"), "/chat/:id");
  assert.equal(normalizePage("/match/456?x=1#top"), "/match/:id");
  assert.equal(normalizePage("/album/9f8e7d6c5b4a3210ffff"), "/album/:id");
  assert.equal(normalizePage(""), "");
  assert.equal(normalizePage(null), "");
});

// ---------------------------------------------------------------------------
// uaClass — device+browser classification, never throws
// ---------------------------------------------------------------------------

test("uaClass classifies common agents", () => {
  assert.equal(uaClass("Mozilla/5.0 (iPhone; CPU iPhone OS) Safari"), "mobile-ios-safari");
  assert.equal(uaClass("Mozilla/5.0 (Linux; Android 14) Chrome/120"), "mobile-android-chrome");
  assert.equal(uaClass("Mozilla/5.0 (Windows NT) Chrome/120"), "desktop-chrome");
  assert.equal(uaClass("Googlebot/2.1"), "bot");
  assert.equal(uaClass(""), "unknown");
  assert.equal(uaClass(undefined), "unknown");
});

// ---------------------------------------------------------------------------
// ipPrefix — must coarsen, never store a full address
// ---------------------------------------------------------------------------

test("ipPrefix coarsens IPv4 and IPv6, drops the host bits", () => {
  assert.equal(ipPrefix("203.0.113.55"), "203.0.113.0/24");
  assert.equal(ipPrefix("::ffff:203.0.113.55"), "203.0.113.0/24");
  assert.ok(ipPrefix("2001:db8:85a3:1:2:3:4:5").endsWith("::/48"));
  assert.equal(ipPrefix(""), "");
});

// ---------------------------------------------------------------------------
// computeErrorHash — stable & bucketing
// ---------------------------------------------------------------------------

test("computeErrorHash is deterministic and buckets by (type,page,msg)", () => {
  const a = computeErrorHash("client_crash", "/home", "Boom");
  const b = computeErrorHash("client_crash", "/home", "Boom");
  const c = computeErrorHash("api_error", "/home", "Boom");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a.length, 32);
});

// ---------------------------------------------------------------------------
// looksEmpty — drop reports that are only a redaction token
// ---------------------------------------------------------------------------

test("looksEmpty flags whitespace and lone redaction tokens", () => {
  assert.equal(looksEmpty(""), true);
  assert.equal(looksEmpty("   "), true);
  assert.equal(looksEmpty("[JWT]"), true);
  assert.equal(looksEmpty("[REDACTED]"), true);
  assert.equal(looksEmpty("real error"), false);
});
