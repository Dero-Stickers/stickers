import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { isNoise, shouldSend, __resetCaptureState } from "./error-capture";

beforeEach(() => __resetCaptureState());

// ---------------------------------------------------------------------------
// isNoise — known harmless errors must be filtered out
// ---------------------------------------------------------------------------

test("isNoise filters well-known harmless errors", () => {
  assert.equal(isNoise("ResizeObserver loop limit exceeded"), true);
  assert.equal(isNoise("Script error."), true);
  assert.equal(isNoise("The operation was aborted"), true);
  assert.equal(isNoise("Load failed"), true);
  assert.equal(isNoise("at chrome-extension://abc/inject.js"), true);
  assert.equal(isNoise(""), true);
});

// Rumore reale osservato nel pannello admin che prima sfuggiva al filtro.
test("isNoise filters aborted fetches (browser navigation, not a fault)", () => {
  assert.equal(isNoise("GET /api/user/albums → rete/connessione: Fetch is aborted"), true);
  assert.equal(isNoise("GET /api/user/albums → rete/connessione: signal is aborted without reason"), true);
});

test("isNoise filters third-party trackers injected by the browser", () => {
  assert.equal(isNoise("Risorsa non caricata: script https://connect.facebook.net/en_US/pcm.js"), true);
});

test("isNoise filters an empty 'Rejected' promise but only exact match", () => {
  assert.equal(isNoise("Rejected"), true);
  assert.equal(isNoise("  rejected  "), true);
  // ...ma una frase VERA che contiene 'rejected' NON va filtrata
  assert.equal(isNoise("Payment rejected by server: insufficient funds"), false);
});

test("isNoise lets real errors through", () => {
  assert.equal(isNoise("TypeError: cannot read 'x' of undefined"), false);
  assert.equal(isNoise("HTTP 500 Internal Server Error"), false);
  // VINCOLO: un vero guasto server sulla stessa rotta DEVE continuare ad arrivare.
  assert.equal(isNoise("GET /api/user/albums → HTTP 500: Internal Server Error"), false);
  assert.equal(isNoise("GET /api/user/albums → HTTP 503: Service Unavailable"), false);
});

// ---------------------------------------------------------------------------
// shouldSend — dedup, throttle, session cap
// ---------------------------------------------------------------------------

// Realistic epoch-like base so the first send is never blocked by the global
// throttle (which compares against lastSendAt=0). In production ts is Date.now()
// (~1.7e12), always far past the min interval, so this mirrors real behaviour.
const T0 = 1_000_000;

test("shouldSend sends a fresh error once", () => {
  assert.equal(shouldSend("client_crash", "Boom A", "/home", T0), true);
});

test("shouldSend dedups the same signature within the window", () => {
  assert.equal(shouldSend("client_crash", "Boom B", "/home", T0), true);
  // same error 5s later → suppressed (within 60s dedup window)
  assert.equal(shouldSend("client_crash", "Boom B", "/home", T0 + 5_000), false);
  // same error after the dedup window → allowed again
  assert.equal(shouldSend("client_crash", "Boom B", "/home", T0 + 70_000), true);
});

test("shouldSend treats differing line numbers as the same error", () => {
  assert.equal(shouldSend("client_crash", "Crash at line 42", "/x", T0), true);
  // numbers are normalized to '#', so this is a duplicate
  assert.equal(shouldSend("client_crash", "Crash at line 9999", "/x", T0 + 2_000), false);
});

test("shouldSend distinguishes by type and by page", () => {
  assert.equal(shouldSend("client_crash", "Same msg", "/a", T0), true);
  assert.equal(shouldSend("api_error", "Same msg", "/a", T0 + 2_000), true); // different type
  assert.equal(shouldSend("client_crash", "Same msg", "/b", T0 + 4_000), true); // different page
});

test("shouldSend throttles bursts (min interval between sends)", () => {
  assert.equal(shouldSend("client_crash", "First", "/p", T0), true);
  // a DIFFERENT error 500ms later is throttled (< 1.5s min interval)
  assert.equal(shouldSend("client_crash", "Second", "/p", T0 + 500), false);
  // far enough apart → allowed
  assert.equal(shouldSend("client_crash", "Third", "/p", T0 + 3_000), true);
});

test("shouldSend never sends filtered noise", () => {
  assert.equal(shouldSend("client_crash", "ResizeObserver loop limit exceeded", "/p", T0), false);
});

test("shouldSend caps total sends per session", () => {
  // Each message must be genuinely distinct (not just by number — numbers are
  // normalized to '#', so "error 1"/"error 2" would dedup to one bucket).
  const words = [
    "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
    "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa",
    "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey",
    "xray", "yankee", "zulu", "neon", "argon", "xenon", "radon",
  ];
  let ts = T0;
  let sent = 0;
  for (let i = 0; i < words.length; i++) {
    ts += 5_000; // wide spacing → throttle never the limiting factor
    if (shouldSend("client_crash", `Failure in ${words[i]} module`, "/loop", ts)) sent++;
  }
  // Distinct, spaced-out errors → only the session cap should stop them at 25.
  assert.equal(sent, 25, `expected exactly the session cap (25), got ${sent}`);
});
