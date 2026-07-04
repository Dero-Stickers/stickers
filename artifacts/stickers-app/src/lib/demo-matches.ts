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

// Set degli ID demo che l'utente ha rimosso SINGOLARMENTE (dal dettaglio del
// profilo). Persistito in localStorage PER-UTENTE (la chiave include l'id del
// proprietario): così ogni nuovo account sullo stesso browser rivede i profili
// di prova, e lo switch U/A non condivide lo stato di rimozione.
const DISMISS_KEY_PREFIX = "demo_matches_dismissed_ids_v2:";
const dismissKey = (userId: number | undefined): string =>
  `${DISMISS_KEY_PREFIX}${userId ?? "anon"}`;

// I 4 profili base (identici per tutti). userId negativo = marcatore demo.
// `near` decide se cade dentro o fuori il raggio.
//  - VICINI: distanza calcolata dal CAP utente (`capOffset` → estimateDistance),
//    così è plausibile e varia col CAP.
//  - LONTANI: distanza FISSA `fixedKm` = 151 km, cioè 1 km OLTRE il raggio
//    massimo dell'app (slider max 150), così restano SEMPRE fuori dal raggio
//    qualunque valore scelga lo slider (la formula sul CAP non garantirebbe
//    >150 km su tutti i CAP per via del suo tetto ~199 km e del modulo interno).
export interface DemoProfile {
  userId: number;
  nickname: string;
  near: boolean;
  capOffset?: number;     // vicini: offset sul CAP utente → distanza via estimateDistance
  fixedKm?: number;       // lontani: distanza fissa (km), ignora il CAP
  totalExchanges: number;
  albumsInCommon: number;
  exchangesCompleted: number;
}

// Nome "Utente" per tutti (il badge PROVA accanto chiarisce che è dimostrativo).
// Gli userId restano distinti (-101..-104) per l'isolamento tecnico; i 4 profili
// si differenziano per distanza/album, non per nome.
//   +3 → ~4.6 km · +8 → ~10.6 km  (vicini, dal CAP — robusto su ogni CAP)
//   151 km fisso × 2               (lontani, sempre fuori dal raggio max 150)
export const DEMO_PROFILES: DemoProfile[] = [
  { userId: -101, nickname: "Utente", near: true,  capOffset: 3,   totalExchanges: 14, albumsInCommon: 2, exchangesCompleted: 23 },
  { userId: -102, nickname: "Utente", near: true,  capOffset: 8,   totalExchanges: 9,  albumsInCommon: 1, exchangesCompleted: 11 },
  { userId: -103, nickname: "Utente", near: false, fixedKm: 151,   totalExchanges: 18, albumsInCommon: 3, exchangesCompleted: 40 },
  { userId: -104, nickname: "Utente", near: false, fixedKm: 151,   totalExchanges: 12, albumsInCommon: 2, exchangesCompleted: 8 },
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

// ID demo rimossi singolarmente da QUESTO utente (letti da localStorage).
export function getDismissedDemoIds(ownerId: number | undefined): number[] {
  try {
    const raw = localStorage.getItem(dismissKey(ownerId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

// Rimuove UN singolo profilo-prova (dal suo dettaglio) per QUESTO utente.
// Persistente: non torna più (per quell'utente su questo browser).
export function dismissDemoMatch(ownerId: number | undefined, demoUserId: number): void {
  try {
    const ids = new Set(getDismissedDemoIds(ownerId));
    ids.add(demoUserId);
    localStorage.setItem(dismissKey(ownerId), JSON.stringify([...ids]));
  } catch {
    /* no-op: senza localStorage la rimozione vale solo per la sessione */
  }
}

// Vero se QUESTO utente ha rimosso TUTTI i demo (per decidere se calcolarli).
export function areAllDemoDismissed(ownerId: number | undefined): boolean {
  const dismissed = new Set(getDismissedDemoIds(ownerId));
  return DEMO_PROFILES.every((p) => dismissed.has(p.userId));
}

export function isDemoUserId(userId: number): boolean {
  return userId < 0;
}

export function getDemoProfile(userId: number): DemoProfile | undefined {
  return DEMO_PROFILES.find((p) => p.userId === userId);
}

function toSummary(user: { cap?: string; area?: string }, p: DemoProfile): MatchSummary {
  const cap = user.cap ?? "";
  // Lontani: distanza fissa (sempre al limite/fuori raggio). Vicini: dal CAP.
  const distanceKm =
    p.fixedKm != null
      ? p.fixedKm
      : parseFloat(estimateDistance(cap, demoCap(cap, p.capOffset ?? 0)).toFixed(1));
  // I VICINI sono plausibilmente nella zona dell'utente → mostrano la sua area.
  // I LONTANI (151 km) NON possono stare nella stessa zona → area generica,
  // così non appare la contraddizione "Milano · 151 km".
  const area = p.near ? user.area : "Altra zona";
  return {
    userId: p.userId,
    nickname: p.nickname,
    area,
    distanceKm,
    totalExchanges: p.totalExchanges,
    albumsInCommon: p.albumsInCommon,
    exchangesCompleted: p.exchangesCompleted,
  };
}

// Soglia FISSA "vicino/lontano" per decidere quanti demo servono. Deve essere
// una costante, NON il raggio dello slider (che varia): altrimenti a raggio
// grande tutti i reali risulterebbero "vicini" e la logica 2+2 salterebbe.
export const NEAR_THRESHOLD_KM = 30;

// Quanti match reali "validi" (almeno 1 scambio possibile) l'utente ha già,
// separati tra dentro/fuori la soglia di vicinanza. Serve a decidere quali demo servono.
export interface RealMatchCounts {
  near: number;
  far: number;
}

// Conta i match reali vicini/lontani rispetto alla soglia FISSA. Un match è
// "valido" se offre almeno uno scambio (totalExchanges > 0).
export function countRealMatches(
  matches: MatchSummary[] | undefined,
  thresholdKm: number = NEAR_THRESHOLD_KM,
): RealMatchCounts {
  let near = 0;
  let far = 0;
  for (const m of matches ?? []) {
    if ((m.totalExchanges ?? 0) <= 0) continue;
    if ((m.distanceKm ?? Infinity) <= thresholdKm) near++;
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
  user: { id?: number; cap?: string; area?: string; exchangesCompleted?: number } | null,
  real?: RealMatchCounts,
): MatchSummary[] {
  if (!user) return [];
  // Solo per utenti ancora "nuovi" (nessuno scambio concluso).
  if ((user.exchangesCompleted ?? 0) !== 0) return [];

  const nearNeeded = Math.max(0, DEMO_NEAR_TARGET - (real?.near ?? 0));
  const farNeeded = Math.max(0, DEMO_FAR_TARGET - (real?.far ?? 0));
  if (nearNeeded === 0 && farNeeded === 0) return []; // già ≥2 vicini e ≥2 lontani reali

  // Esclude i profili-prova che QUESTO utente ha già rimosso singolarmente.
  const dismissed = new Set(getDismissedDemoIds(user.id));
  const alive = DEMO_PROFILES.filter((p) => !dismissed.has(p.userId));
  const nearDemos = alive.filter((p) => p.near).slice(0, nearNeeded);
  const farDemos = alive.filter((p) => !p.near).slice(0, farNeeded);
  return [...nearDemos, ...farDemos].map((p) => toSummary(user, p));
}

// Vero se i demo POTREBBERO essere mostrati (utente nuovo, non rimossi). Non
// considera il conteggio reale — serve solo per decidere se calcolare i demo.
export function shouldShowDemos(
  user: { id?: number; exchangesCompleted?: number } | null,
): boolean {
  if (!user) return false;
  if (areAllDemoDismissed(user.id)) return false;
  return (user.exchangesCompleted ?? 0) === 0;
}
