// Guida interattiva — CONFIGURAZIONE DEI PASSI (unico file da toccare per
// aggiungere/togliere/modificare passi; il motore non va cambiato).
//
// REGOLA D'ORO: ogni passo evidenzia un elemento REALMENTE PRESENTE nella
// schermata. Testo BREVE (una frase), stile semplice/diretto/minimale.
//
// QUATTRO TIPI DI PASSO — nella guida si va SOLO AVANTI:
//  - "info"   → fumetto informativo; si avanza TOCCANDO OVUNQUE lo schermo.
//  - "action" → fumetto con freccia sul pulsante REALE dell'app: si avanza
//               toccando QUEL pulsante (l'azione avviene davvero: si naviga).
//  - "try"    → PROVA PRATICA dell'utente, ma SIMULATA: i tocchi mostrano
//               l'effetto SOLO visivamente (colori finti sulla cella) oppure
//               aprono viste read-only (dettaglio figurina). ZERO scritture DB.
//  - "demo"   → DIMOSTRAZIONE AUTOMATICA: la guida mostra da sola cosa succede
//               (es. i 3 filtri uno alla volta con la griglia che cambia
//               colore), poi RIPRISTINA tutto e avanza. ZERO scritture DB.
//
// La guida NON modifica MAI il database: tutto ciò che mostra è visivo e
// reversibile; a fine guida l'app è ESATTAMENTE com'era.

export type GuideStepKind = "info" | "action" | "try" | "demo";

export interface GuideStep {
  id: string;
  kind: GuideStepKind;
  /** Rotta del passo; il motore ci naviga prima di mostrarlo. */
  route: string;
  /** data-guide dell'elemento da evidenziare. Assente → fumetto centrato. */
  target?: string;
  /** Titolo brevissimo (emoji inclusa). */
  title: string;
  /** UNA frase, semplice e diretta. */
  body: string;
  /** true = rotta DINAMICA (album/match aperti dal passo precedente): il
   *  motore NON forza la navigazione via `route`. */
  dynamicRoute?: boolean;
  /** Solo kind "try": numero di tocchi della prova sul target. */
  taps?: number;
  /** Solo kind "try"+taps: testo del fumetto DOPO ogni tocco (spiega il colore
   *  appena mostrato). Dopo l'ULTIMO tocco l'avanzamento è MANUALE (tocca lo
   *  schermo), così l'utente ha il tempo di leggere. */
  tapPhases?: { body: string }[];
  /** Solo kind "try": avanza quando il dialog aperto dall'utente viene chiuso. */
  waitDialogClose?: boolean;
}

export const GUIDE_STEPS: GuideStep[] = [
  // → Album (freccia sulla voce navbar) — si parte SUBITO col fare, zero intro
  {
    id: "go-album",
    kind: "action",
    route: "/",
    target: "nav-album",
    title: "I tuoi Album 📖",
    body: "Tocca “Album”.",
  },
  // PROVA SIMULATA — aggiungi un album dai "Disponibili" (tab forzato dalla
  // guida; card demo col ➕, vedi guide-demo.ts). Nessuna API: tocco bloccato.
  {
    id: "add-album",
    kind: "try",
    taps: 1,
    route: "/album",
    target: "guide-add-album",
    title: "Aggiungi un album ➕",
    body: "Da “Disponibili” scegli un album e tocca ➕ per averlo nella collezione.",
  },
  // → apri l'album di prova (tab "I miei album" forzato; riga demo in cima)
  {
    id: "open-album",
    kind: "action",
    route: "/album",
    target: "guide-first-album",
    title: "Entra nell'album 👆",
    body: "Eccolo tra i tuoi album: toccalo per aprirlo.",
  },
  // Dentro l'album: PROVA PRATICA — 3 tocchi reali = ciclo completo dei colori
  // (torna allo stato iniziale → nessun dato alterato a fine giro).
  {
    id: "sticker-tap",
    kind: "try",
    taps: 3,
    route: "/album",
    dynamicRoute: true,
    target: "guide-first-sticker",
    title: "Segna le figurine 🎯",
    body: "Ogni tocco cambia lo stato. Prova: tocca la figurina evidenziata.",
    // Dopo ogni tocco il fumetto spiega il colore appena apparso; sul grigio
    // (ultimo) si resta finché l'utente non tocca lo schermo per continuare.
    tapPhases: [
      { body: "🟩 Verde: le figurine che hai già trovato. Tocca ancora." },
      { body: "🟥 Rosso: le tue doppie, pronte per lo scambio. Tocca ancora." },
      { body: "⬜ Grigio: le mancanti, quelle da trovare." },
    ],
  },
  // PROVA PRATICA — long-press reale: si apre il dettaglio; chiuso = si avanza.
  {
    id: "sticker-longpress",
    kind: "try",
    waitDialogClose: true,
    route: "/album",
    dynamicRoute: true,
    target: "guide-first-sticker",
    title: "Trucco ✋",
    body: "Ora tienila premuta: si aprono i dettagli. Chiudili per continuare.",
  },
  // DIMOSTRAZIONE AUTOMATICA — la guida mostra i 3 filtri uno alla volta:
  // "tieni premuto = segni TUTTE le figurine così", con la griglia che cambia
  // colore (solo visivo), poi ripristina tutto da sola.
  {
    id: "filters-bulk",
    kind: "demo",
    route: "/album",
    dynamicRoute: true,
    target: "guide-filters",
    title: "Trucco ⚡",
    body: "Guarda: tenendo premuto un filtro segni TUTTE le figurine insieme.",
  },
  // → Match (freccia sulla voce navbar)
  {
    id: "go-match",
    kind: "action",
    route: "/album",
    dynamicRoute: true,
    target: "nav-match",
    title: "Ora i Match ⚡",
    body: "Tocca “Match”.",
  },
  // → apri il primo match (freccia sulla card)
  {
    id: "open-match",
    kind: "action",
    route: "/match",
    target: "guide-first-match",
    title: "Apri un match 🤝",
    body: "Tocca il collezionista evidenziato.",
  },
  // Dentro il match: sezioni Dai/Ricevi
  {
    id: "trade-sections",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    target: "guide-trade-sections",
    title: "Dai e Ricevi 🔄",
    body: "Qui vedi cosa puoi dare e cosa ricevere in cambio.",
  },
  // Il bottone chat
  {
    id: "chat",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    target: "guide-chat-button",
    title: "Accordati in chat 💬",
    body: "Da qui vi mettete d'accordo: a scambio fatto l'album si aggiorna da solo.",
  },
  // Fine (fumetto centrato)
  {
    id: "done",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    title: "Fatto! 🎉",
    body: "Riapri la guida quando vuoi da Profilo → Guida Stickers.",
  },
];
