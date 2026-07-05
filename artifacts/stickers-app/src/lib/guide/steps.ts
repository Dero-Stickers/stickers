// Guida interattiva — CONFIGURAZIONE DEI PASSI (unico file da toccare per
// aggiungere/togliere/modificare passi; il motore non va cambiato).
//
// REGOLA D'ORO: ogni passo evidenzia un elemento REALMENTE PRESENTE nella
// schermata. Testo BREVE (una frase), stile semplice/diretto/minimale.
//
// TRE TIPI DI PASSO — nella guida si va SOLO AVANTI:
//  - "info"   → fumetto informativo; si avanza TOCCANDO OVUNQUE lo schermo.
//  - "action" → fumetto con freccia sul pulsante REALE dell'app: si avanza
//               toccando QUEL pulsante (l'azione avviene davvero: si naviga).
//  - "try"    → PROVA PRATICA dell'utente, ma SIMULATA. Varianti:
//               • taps → tocchi la cella e cambia colore (verde/rosso/grigio);
//               • waitDialogClose → long-press reale = apre il dettaglio (read-only);
//               • longPressGrid → tieni premuto un filtro = TUTTA la griglia si
//                 colora (solo visivo). ZERO scritture DB in ogni caso.
//
// La guida NON modifica MAI il database: tutto ciò che mostra è visivo e
// reversibile; a fine guida l'app è ESATTAMENTE com'era.

export type GuideStepKind = "info" | "action" | "try";

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
  /** Solo kind "try"+taps: cosa mostrare DOPO ogni tocco. `color` = classe del
   *  colore-demo applicato alla cella; `body` = testo del fumetto (spiega quel
   *  colore). Dopo l'ULTIMO tocco l'avanzamento è MANUALE (tocca lo schermo),
   *  così l'utente ha il tempo di leggere. Il colore INIZIALE (prima dei tocchi)
   *  è quello reale della cella demo. */
  tapPhases?: { color: "sg-cell-posseduta" | "sg-cell-doppia" | "sg-cell-mancante"; body: string }[];
  /** Solo kind "try": avanza quando il dialog aperto dall'utente viene chiuso. */
  waitDialogClose?: boolean;
  /** Solo kind "try"+waitDialogClose: istruzione mostrata SUL dialog aperto, così
   *  l'utente sa che deve chiuderlo per proseguire. */
  dialogTitle?: string;
  dialogBody?: string;
  /** Solo kind "try": PROVA long-press su un filtro → l'INTERA griglia si colora
   *  (solo visivo). L'utente tiene premuto il target; poi avanza toccando lo
   *  schermo (avanzamento MANUALE, tempo di leggere). `color` = classe-demo
   *  applicata alla griglia; `doneBody` = testo mostrato dopo il long-press. */
  longPressGrid?: { color: "sg-demo-posseduta" | "sg-demo-doppia" | "sg-demo-mancante"; doneBody: string };
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
  // Dentro l'album: PROVA PRATICA — la cella parte VERDE (già spiegato), poi
  // 2 tocchi la portano a rosso e grigio (solo visivo, nessun dato alterato).
  {
    id: "sticker-tap",
    kind: "try",
    taps: 2, // la cella parte VERDE (spiegato nel body); 2 tocchi → rosso, grigio
    route: "/album",
    dynamicRoute: true,
    target: "guide-first-sticker",
    title: "Segna le figurine 🎯",
    // La figurina evidenziata parte VERDE → spieghiamo subito il verde, poi ogni
    // tocco cambia colore e aggiorna la spiegazione (rosso, grigio).
    body: "Il colore dice lo stato. 🟩 Verde: le figurine che hai già trovato. Tocca per cambiarlo.",
    // Dopo ogni tocco il fumetto spiega il colore appena apparso; sul grigio
    // (ultimo) si resta finché l'utente non tocca lo schermo per continuare.
    tapPhases: [
      { color: "sg-cell-doppia", body: "🟥 Rosso: le tue doppie, pronte per lo scambio. Tocca ancora." },
      { color: "sg-cell-mancante", body: "⬜ Grigio: le mancanti, quelle da trovare." },
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
    body: "Ora tieni premuta la figurina: si aprono i dettagli.",
    // Istruzione mostrata SUL dialog aperto (l'utente sa come proseguire).
    dialogTitle: "Ecco i dettagli 👀",
    dialogBody: "Da qui gestisci la figurina. Chiudi (✕) per continuare la guida.",
  },
  // PROVA PRATICA — long-press su un filtro: l'utente lo tiene premuto e vede
  // TUTTA la griglia colorarsi (solo visivo). Poi tocca per continuare; la
  // guida ripristina i colori reali. Zero scritture DB.
  {
    id: "filters-bulk",
    kind: "try",
    route: "/album",
    dynamicRoute: true,
    target: "guide-filter-possedute",
    title: "Trucco ⚡",
    body: "Tieni premuto “Mie”: segni TUTTE le figurine come trovate in un colpo solo.",
    // Al long-press la griglia diventa tutta verde (solo demo), poi avanti manuale.
    // Verde = coerente con lo stato "trovata" appena spiegato sulle figurine.
    longPressGrid: {
      color: "sg-demo-posseduta",
      doneBody: "Fatto! Tutte segnate come trovate in un attimo. ⚡",
    },
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
    title: "Tutto qui! 🎉",
    body: "Ora tocca a te: aggiungi i tuoi album e trova i primi scambi.",
  },
];
