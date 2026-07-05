// Guida interattiva — ALBUM DI PROVA (dati demo, solo frontend).
//
// La guida deve mostrare l'app in CONDIZIONI STANDARD coerenti con ciò che
// racconta, A PRESCINDERE dall'account: un utente nuovo non ha album, uno
// esistente può averne molti. Per questo, durante i passi della sezione Album,
// l'app mostra un ALBUM DI PROVA (id negativo, MAI salvato, zero API):
//  - in "Disponibili" appare una card demo col ➕ da toccare (simulato);
//  - in "I miei album" appare la riga demo da aprire;
//  - il dettaglio /album/-1 mostra una griglia demo deterministica.
// Sparisce da solo quando la guida finisce. Stesso pattern dei profili-prova
// dei match (id negativi = demo, vedi demo-matches.ts).

import type { UserSticker, UserAlbumWithStats } from "@workspace/api-client-react";

export const GUIDE_DEMO_ALBUM_ID = -1;

export function isGuideDemoAlbumId(albumId: number): boolean {
  return albumId === GUIDE_DEMO_ALBUM_ID;
}

// Card/riga dell'album di prova (forma UserAlbumWithStats → riusa i layout reali).
// Conteggi coerenti con buildGuideDemoStickers: 30 possedute · 15 doppie ·
// 15 mancanti su 60 → completamento (30+15)/60 = 75%.
export const GUIDE_DEMO_ALBUM: UserAlbumWithStats = {
  id: GUIDE_DEMO_ALBUM_ID,
  title: "Album di prova",
  category: "campionato",
  totalStickers: 60,
  isPublished: true,
  owned: 30,
  duplicates: 15,
  missing: 15,
  completionPercent: 75,
};

// Griglia demo: 60 figurine deterministiche (nessun Math.random → identica per
// tutti e a ogni render). Pattern: 30 possedute · 15 doppie · 15 mancanti
// → contatori 60 / 30 / 15 / 15 e progresso 75%, numeri "belli" per la guida.
export function buildGuideDemoStickers(): UserSticker[] {
  return Array.from({ length: 60 }, (_, i) => {
    const n = i + 1;
    const state = n % 4 === 0 ? "doppia" : n % 4 === 2 ? "mancante" : "posseduta";
    return {
      stickerId: -(1000 + n), // id sintetici negativi: mai in collisione col DB
      albumId: GUIDE_DEMO_ALBUM_ID,
      number: n,
      code: String(n).padStart(3, "0"),
      name: `Figurina ${n}`,
      state,
    } as UserSticker;
  });
}
