// Profili-prova ("demo") per l'onboarding del nuovo utente.
//
// Scopo: al primo accesso l'utente vede 4 collezionisti DIMOSTRATIVI (2 nel suo
// raggio, 2 fuori) per capire subito come funziona l'app senza l'impatto di una
// lista vuota. Sono FISSI e UGUALI per tutti; l'unica variabile è la DISTANZA,
// calcolata dal CAP che l'utente ha inserito (stessa logica del backend).
//
// Sono SOLO FRONTEND: non esistono nel DB, quindi nessun altro utente li vede
// mai e "eliminarli" è istantaneo e definitivo (flag in localStorage). La chat e
// lo scambio con loro sono simulati (vetrina), non toccano dati reali.
//
// Riconoscibili ovunque dal userId NEGATIVO: MatchCard/MatchDetail li intercettano
// e mostrano il badge "PROVA" + le viste dimostrative, senza chiamare il backend.

import type { MatchSummary } from "@workspace/api-client-react";

const DISMISS_KEY = "demo_matches_dismissed_v1";

// I 4 profili base (identici per tutti). userId negativo = marcatore demo.
// `near` decide se cade dentro o fuori il raggio; `capOffset` posiziona il CAP
// fittizio rispetto a quello dell'utente per ottenere una distanza plausibile.
export interface DemoProfile {
  userId: number;
  nickname: string;
  near: boolean;
  capOffset: number;      // aggiunto/sottratto al CAP utente → distanza via estimateDistance
  totalExchanges: number;
  albumsInCommon: number;
  exchangesCompleted: number;
}

// Nomi ESPLICITI "Utente prova N" per non confonderli mai con utenti reali.
// 2 nel raggio (near) + 2 fuori (lontani).
export const DEMO_PROFILES: DemoProfile[] = [
  { userId: -101, nickname: "Utente prova 1", near: true,  capOffset: 3,    totalExchanges: 14, albumsInCommon: 2, exchangesCompleted: 23 },
  { userId: -102, nickname: "Utente prova 2", near: true,  capOffset: 7,    totalExchanges: 9,  albumsInCommon: 1, exchangesCompleted: 11 },
  { userId: -103, nickname: "Utente prova 3", near: false, capOffset: 220,  totalExchanges: 18, albumsInCommon: 3, exchangesCompleted: 40 },
  { userId: -104, nickname: "Utente prova 4", near: false, capOffset: 480,  totalExchanges: 12, albumsInCommon: 2, exchangesCompleted: 8 },
];

// Stessa formula del backend (routes/matches.ts) → distanze coerenti con i
// match reali. Deterministica dal CAP, senza GPS.
function estimateDistance(cap1: string, cap2: string): number {
  if (!cap1 || !cap2) return 99;
  const n1 = parseInt(cap1, 10);
  const n2 = parseInt(cap2, 10);
  if (isNaN(n1) || isNaN(n2)) return 99;
  if (n1 === n2) return 0.5;
  const diff = Math.abs(n1 - n2);
  if (diff < 10) return 1 + diff * 1.2;
  if (diff < 100) return 3 + (diff % 18);
  if (diff < 1000) return 12 + (diff % 28);
  if (diff < 5000) return 35 + (diff % 55);
  return 60 + (diff % 140);
}

// CAP fittizio del demo = CAP utente + offset (clampato al range 00010-99999),
// così la distanza cade dove vogliamo (vicino/lontano) qualunque sia il CAP.
function demoCap(userCap: string, offset: number): string {
  const base = parseInt(userCap, 10);
  const n = isNaN(base) ? 20100 : base;
  const v = Math.min(99999, Math.max(10, n + offset));
  return String(v).padStart(5, "0");
}

export function areDemoDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissDemoMatches(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* no-op: se localStorage non è disponibile, i demo resteranno solo per la sessione */
  }
}

export function isDemoUserId(userId: number): boolean {
  return userId < 0;
}

export function getDemoProfile(userId: number): DemoProfile | undefined {
  return DEMO_PROFILES.find((p) => p.userId === userId);
}

function toSummary(user: { cap?: string; area?: string }, p: DemoProfile): MatchSummary {
  const cap = user.cap ?? "";
  return {
    userId: p.userId,
    nickname: p.nickname,
    area: user.area,
    distanceKm: estimateDistance(cap, demoCap(cap, p.capOffset)),
    totalExchanges: p.totalExchanges,
    albumsInCommon: p.albumsInCommon,
    exchangesCompleted: p.exchangesCompleted,
  };
}

// Quanti match reali "validi" (almeno 1 scambio possibile) l'utente ha già,
// separati tra dentro/fuori il raggio. Serve a decidere quali demo servono.
export interface RealMatchCounts {
  near: number;
  far: number;
}

// Conta i match reali vicini/lontani rispetto al raggio dato. Un match è
// "valido" se offre almeno uno scambio (totalExchanges > 0).
export function countRealMatches(
  matches: MatchSummary[] | undefined,
  radiusKm: number,
): RealMatchCounts {
  let near = 0;
  let far = 0;
  for (const m of matches ?? []) {
    if ((m.totalExchanges ?? 0) <= 0) continue;
    if ((m.distanceKm ?? Infinity) <= radiusKm) near++;
    else far++;
  }
  return { near, far };
}

// Numero di slot demo previsti per lato (2 vicini + 2 lontani).
const DEMO_NEAR_TARGET = 2;
const DEMO_FAR_TARGET = 2;

// Costruisce i demo NECESSARI a completare la vetrina fino a 2 vicini + 2 lontani,
// dato quanti match reali (validi) l'utente ha già per lato. Se ne ha già
// abbastanza da entrambi i lati, ritorna [] (la funzione si "spegne" da sola).
// `real`: conteggio dei match reali (usa countRealMatches); null = ignora (mostra tutti).
export function buildDemoMatches(
  user: { cap?: string; area?: string; exchangesCompleted?: number } | null,
  real?: RealMatchCounts,
): MatchSummary[] {
  if (!user) return [];
  if (areDemoDismissed()) return [];
  // Solo per utenti ancora "nuovi" (nessuno scambio concluso).
  if ((user.exchangesCompleted ?? 0) !== 0) return [];

  const nearNeeded = Math.max(0, DEMO_NEAR_TARGET - (real?.near ?? 0));
  const farNeeded = Math.max(0, DEMO_FAR_TARGET - (real?.far ?? 0));
  if (nearNeeded === 0 && farNeeded === 0) return []; // già ≥2 vicini e ≥2 lontani reali

  const nearDemos = DEMO_PROFILES.filter((p) => p.near).slice(0, nearNeeded);
  const farDemos = DEMO_PROFILES.filter((p) => !p.near).slice(0, farNeeded);
  return [...nearDemos, ...farDemos].map((p) => toSummary(user, p));
}

// Vero se i demo POTREBBERO essere mostrati (utente nuovo, non rimossi). Non
// considera il conteggio reale — serve solo per decidere se calcolare i demo.
export function shouldShowDemos(
  user: { exchangesCompleted?: number } | null,
): boolean {
  if (!user) return false;
  if (areDemoDismissed()) return false;
  return (user.exchangesCompleted ?? 0) === 0;
}
