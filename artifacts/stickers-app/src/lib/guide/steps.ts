// Guida interattiva — CONFIGURAZIONE DEI PASSI (parte modulare/scalabile).
//
// REGOLA D'ORO: ogni passo evidenzia un elemento REALMENTE PRESENTE nella
// schermata in cui si trova. Se il testo parla di figurine, siamo nella griglia
// figurine; se parla del bottone chat, quel bottone è lì. Mai spiegare cose fuori
// schermo.
//
// Scopo (deciso con l'owner): condurre il nuovo utente, in modo SMART e
// DIMOSTRATIVO, nella gestione del PRIMO ALBUM e del PRIMO MATCH. La guida MOSTRA
// e SPIEGA su elementi reali, ma NON modifica dati (nessun cambio stato, nessuno
// scambio). È un tour, non un'azione reale.
//
// Questo è l'UNICO file da toccare per aggiungere/togliere/modificare un passo.
// Ogni passo si aggancia a un elemento via `data-guide="<target>"`.
//
// DUE TIPI DI PASSO:
//  - "info"   → spiega un elemento presente; si avanza col bottone "Avanti".
//  - "action" → INTERATTIVO: l'elemento evidenziato è cliccabile, la guida
//               ASPETTA che l'utente lo tocchi e avanza da sola (serve a
//               NAVIGARE: aprire l'album, aprire il match…).

export type GuideStepKind = "info" | "action";

export interface GuideStep {
  id: string;
  kind: GuideStepKind;
  /** Rotta su cui il passo vive. Per le rotte dinamiche (album/match aperti da un
   *  passo "action") si lascia il valore di partenza: il motore non forza la
   *  navigazione se manca il target, e i passi "action" cambiano pagina da soli. */
  route: string;
  /** data-guide dell'elemento da evidenziare. Assente → passo a tutto schermo. */
  target?: string;
  title: string;
  body: string;
  emoji?: string;
  /** Se true, questo passo vive su una rotta DINAMICA (album/match aperti): il
   *  motore NON tenta di navigare via `route` (rimane dove l'ha portato il passo
   *  "action" precedente). */
  dynamicRoute?: boolean;
}

export const GUIDE_STEPS: GuideStep[] = [
  // 1 · Intro (Home)
  {
    id: "intro",
    kind: "info",
    route: "/",
    title: "Ti faccio da guida 👋",
    body: "In un minuto ti mostro come gestire il tuo primo album e trovare il primo scambio. Segui le indicazioni.",
    emoji: "👋",
  },

  // 2 · Porta in Album (azione sulla navbar)
  {
    id: "go-album",
    kind: "action",
    route: "/",
    target: "nav-album",
    title: "Apri i tuoi Album",
    body: "Tocca “Album” qui in basso.",
    emoji: "📖",
  },

  // 3 · Apri un album (azione sulla prima card album → entra nella griglia)
  {
    id: "open-album",
    kind: "action",
    route: "/album",
    target: "guide-first-album",
    title: "Entra in un album",
    body: "Tocca un album per aprirlo e vedere le figurine.",
    emoji: "👆",
  },

  // 4 · Tocca una figurina (info, sulla griglia reale)
  {
    id: "sticker-tap",
    kind: "info",
    route: "/album",
    dynamicRoute: true,
    target: "guide-first-sticker",
    title: "Segna una figurina",
    body: "Toccala per cambiare stato: mancante → posseduta → doppia. Il colore te lo dice a colpo d'occhio.",
    emoji: "🎯",
  },

  // 5 · Long-press figurina (info, stessa griglia)
  {
    id: "sticker-longpress",
    kind: "info",
    route: "/album",
    dynamicRoute: true,
    target: "guide-first-sticker",
    title: "Trucco: tieni premuto ✋",
    body: "Tieni premuta una figurina per i dettagli e per trovare subito chi ce l'ha doppia.",
    emoji: "✋",
  },

  // 6 · Long-press sui filtri (info, i 4 filtri sono lì)
  {
    id: "filters-bulk",
    kind: "info",
    route: "/album",
    dynamicRoute: true,
    target: "guide-filters",
    title: "Trucco: segna tutte ⚡",
    body: "Tieni premuto un filtro (Mie, Doppie, Mancanti) per segnare in blocco tutte le figurine così.",
    emoji: "⚡",
  },

  // 7 · Porta ai Match (azione navbar)
  {
    id: "go-match",
    kind: "action",
    route: "/album",
    dynamicRoute: true,
    target: "nav-match",
    title: "Ora trova gli scambi",
    body: "Tocca “Match”: l'app cerca chi ha le figurine che ti mancano.",
    emoji: "⚡",
  },

  // 8 · Apri un match di PROVA (azione sulla prima card match)
  {
    id: "open-match",
    kind: "action",
    route: "/match",
    target: "guide-first-match",
    title: "Apri un match",
    body: "Tocca un collezionista per vedere cosa potete scambiare. (Quelli con badge PROVA sono dimostrativi.)",
    emoji: "🤝",
  },

  // 9 · Dettaglio match: cosa dai/ricevi + chat (info, elementi reali)
  {
    id: "match-detail",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    target: "guide-chat-button",
    title: "Dai, ricevi e accordati",
    body: "Qui vedi cosa DAI e cosa RICEVI. Col tasto chat vi mettete d'accordo; a scambio fatto, l'album si aggiorna da solo.",
    emoji: "💬",
  },

  // 10 · Fine (torna su un punto stabile: navbar Profilo)
  {
    id: "done",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    target: "nav-profilo",
    title: "Tutto qui! 🎉",
    body: "Da “Profilo” cambi la tua zona e riapri questa guida quando vuoi. Buoni scambi!",
    emoji: "🎉",
  },
];
