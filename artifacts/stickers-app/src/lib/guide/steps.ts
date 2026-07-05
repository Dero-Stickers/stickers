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
//
// ┌── COME MODIFICARE LA GUIDA (si tocca SOLO questo file) ───────────────────┐
// │ • CAMBIARE UN TESTO: modifica `title`/`body` del passo. Fine.             │
// │ • RIORDINARE: sposta gli oggetti nell'array GUIDE_STEPS (l'ordine è       │
// │   quello di visualizzazione). Nessun indice numerico da aggiornare.       │
// │ • TOGLIERE UN PASSO: cancella il suo oggetto dall'array.                   │
// │ • AGGIUNGERE UN PASSO INFORMATIVO (il caso più comune):                    │
// │     { id: "mio-passo", kind: "info", route: "/album",                     │
// │       target: "guide-xyz",           // data-guide dell'elemento (opz.)   │
// │       title: "Titolo 👍", body: "Una frase chiara." }                     │
// │   → l'elemento va marcato nel JSX con  data-guide="guide-xyz".            │
// │ • AGGIUNGERE UN PASSO-AZIONE (naviga toccando un pulsante vero):           │
// │     { id:"vai", kind:"action", route:"/", target:"nav-album",            │
// │       title:"...", body:"Tocca qui." }  // il target deve avere href      │
// │ ⚠ Se aggiorni molto i passi, alza la versione del flag "già vista" in      │
// │   GuideContext (SEEN_KEY_PREFIX v1→v2) per ri-mostrarla a tutti.          │
// └───────────────────────────────────────────────────────────────────────────┘

export type GuideStepKind = "info" | "action" | "try";

export interface GuideStep {
  id: string;
  kind: GuideStepKind;
  /** Rotta del passo; il motore ci naviga prima di mostrarlo. */
  route: string;
  /** data-guide dell'elemento da evidenziare. Assente → fumetto centrato. */
  target?: string;
  /** Lato su cui mettere il fumetto rispetto al target (freccia dal lato opposto).
   *  Default: driver.js sceglie da solo. Impostarlo SOLO quando l'auto-scelta è
   *  sbagliata — es. un elemento largo e in fondo va evidenziato con `side:"top"`
   *  (fumetto sopra) per non coprirlo. `align` regola l'allineamento sul lato. */
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /** Titolo brevissimo. */
  title: string;
  /** UNA frase, semplice e diretta. Per un'icona uguale all'app scrivi il
   *  segnaposto {album} / {match} / {messaggi} / {aggiungi} dove la vuoi: il
   *  motore lo sostituisce con l'SVG lucide identico alla navbar (NO emoji). */
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
  /** Solo kind "try": PROVA long-press sui FILTRI, in una o più fasi. Per ogni
   *  fase l'utente TIENE PREMUTO il filtro `target` → l'INTERA griglia si colora
   *  (solo visivo, `color`). Poi il fumetto mostra `doneBody` e ASPETTA: l'utente
   *  legge/guarda con calma e TOCCA lo schermo per passare alla fase successiva
   *  (o, all'ultima, allo step dopo). Il rilascio del long-press NON avanza.
   *  `title`/`body` opzionali per fase = fumetto mostrato PRIMA del long-press. */
  bulkPhases?: {
    target: string;
    color: "sg-demo-posseduta" | "sg-demo-doppia" | "sg-demo-mancante";
    title: string;
    body: string;
    doneBody: string;
  }[];
  /** true = effetto "polvere magica" alla comparsa del fumetto (solo il primo
   *  passo di benvenuto). Solo CSS, si auto-rimuove. */
  magic?: boolean;
}

export const GUIDE_STEPS: GuideStep[] = [
  // → Album (freccia sulla voce navbar). PRIMO passo = anche benvenuto: una
  // frase compatta dà la visione d'insieme (Album + Match), poi l'istruzione
  // operativa a capo. Il <br> stacca il benvenuto dall'azione da fare.
  {
    id: "go-album",
    kind: "action",
    route: "/",
    target: "nav-album",
    magic: true, // effetto polvere magica: benvenuto = primo impatto
    title: "Benvenuto in Stickers!",
    // Icone inline = le STESSE dell'app: {match} fulmine arancione, {album} libro.
    // Verbi unificati: "trova" e "gestisci" (stessi degli altri passi album).
    body: "Trova e gestisci i tuoi album, per scambiare figurine con i Match {match}<br>Tocca qui sotto per aprirli. {album}",
  },
  // PASSO 1/2 — dove trovare gli album: freccia sul tab "Disponibili"
  // (illuminato; forzato da AlbumList). `action` senza href → si avanza
  // TOCCANDO "Disponibili" (nessun hint scritto: l'azione è la freccia stessa).
  {
    id: "find-album",
    kind: "action",
    route: "/album",
    target: "guide-available-tab",
    title: "Trova i tuoi album",
    body: "Scegli tra quelli “Disponibili”.",
  },
  // PASSO 2/2 — PROVA SIMULATA: aggiungi l'album col ➕ (card demo, vedi
  // guide-demo.ts). Nessuna API: tocco bloccato.
  {
    id: "add-album",
    kind: "try",
    taps: 1,
    route: "/album",
    target: "guide-add-album",
    title: "Crea la tua collezione",
    body: "Tocca {aggiungi} per aggiungerlo ai tuoi album.",
  },
  // → apri l'album di prova (tab "I miei album" forzato; riga demo in cima)
  {
    id: "open-album",
    kind: "action",
    route: "/album",
    target: "guide-first-album",
    title: "Gestisci i tuoi album",
    // "I miei album" è illuminato (guideOpenDemo → sg-lit): l'utente vede che
    // l'album aggiunto ora sta in QUESTA sezione, non più in "Disponibili".
    body: "Ora è tra “I miei album”.<br>Tocca per vedere le figurine.",
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
    title: "Gestisci le tue figurine",
    // La figurina evidenziata parte VERDE → spieghiamo subito il verde, poi ogni
    // tocco cambia colore e aggiorna la spiegazione (rosso, grigio). I pallini
    // {verde}/{rosso}/{grigio} usano i colori esatti delle celle dell'app.
    body: "Tocca una figurina per aggiornarla.<br>{verde} Quando è verde, significa che ce l'hai.",
    // Dopo ogni tocco il fumetto spiega il colore appena apparso; sul grigio
    // (ultimo) si resta finché l'utente non tocca lo schermo per continuare.
    tapPhases: [
      { color: "sg-cell-doppia", body: "{rosso} Rossa: è un doppione, da scambiare.<br>Tocca ancora." },
      { color: "sg-cell-mancante", body: "{grigio} Grigia: ti manca ancora." },
    ],
  },
  // PROVA PRATICA — long-press reale: si apre il dettaglio; chiuso = si avanza.
  {
    id: "sticker-longpress",
    kind: "try",
    waitDialogClose: true,
    route: "/album",
    dynamicRoute: true,
    // Figurina nel MEZZO (non la 001 del passo prima) per variare.
    target: "guide-mid-sticker",
    title: "Dettagli figurina",
    body: "Tieni premuta una figurina per visualizzare tutte le info.",
    // Istruzione mostrata SUL dialog aperto (l'utente sa come proseguire).
    dialogTitle: "Ecco i dettagli",
    dialogBody: "Qui trovi tutte le info della figurina.<br>Chiudi (✕) per continuare la guida.",
  },
  // PROVA PRATICA — long-press sui 3 filtri, UNO alla volta: leggo → tengo
  // premuto → guardo la griglia colorarsi (solo visivo) → tocco per continuare.
  // Ogni fase aspetta il MIO tocco (il rilascio del long-press non avanza).
  {
    id: "filters-bulk",
    kind: "try",
    route: "/album",
    dynamicRoute: true,
    title: "Segna tutto in un colpo",
    body: "", // il body reale è per-fase (bulkPhases)
    bulkPhases: [
      {
        target: "guide-filter-possedute",
        color: "sg-demo-posseduta",
        title: "Segna tutto in un colpo",
        body: "Tieni premuto “Mie”: le segni TUTTE come trovate.",
        doneBody: "Ecco fatto: tutte segnate come trovate. {verde}<br>Tocca per continuare.",
      },
      {
        target: "guide-filter-doppie",
        color: "sg-demo-doppia",
        title: "Segna tutto in un colpo",
        body: "Ora tieni premuto “Doppie”: diventano tutte doppie.",
        doneBody: "Tutte segnate come doppie. {rosso}<br>Tocca per continuare.",
      },
      {
        target: "guide-filter-mancanti",
        color: "sg-demo-mancante",
        title: "Segna tutto in un colpo",
        body: "Infine “Mancanti”: le segni tutte come mancanti.",
        doneBody: "Tutte segnate come mancanti. {grigio}<br>Tocca per continuare.",
      },
    ],
  },
  // → Match (freccia sulla voce navbar)
  {
    id: "go-match",
    kind: "action",
    route: "/album",
    dynamicRoute: true,
    target: "nav-match",
    title: "Passiamo ai Match {match}",
    body: "Tocca qui sotto quando vuoi scambiare le tue doppie.",
  },
  // Spiegazione dei 3 filtri della schermata Match (solo info, nessuna
  // interazione: si guarda e si tocca lo schermo per continuare).
  {
    id: "match-nearby",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    target: "guide-tab-nearby",
    side: "bottom",
    align: "start",
    title: "Vicini a te",
    body: "I collezionisti più vicini,<br>ordinati per distanza da te.",
  },
  // La barra del raggio: dove si decide quanto lontano cercare. Freccia SOPRA
  // la barra (side top) così il fumetto sta sotto e la barra resta scoperta.
  {
    id: "match-radius",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    target: "guide-match-radius",
    side: "top",
    align: "center",
    title: "Raggio di ricerca",
    body: "Trascina la barra per decidere<br>quanto lontano cercare.",
  },
  {
    id: "match-best",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    target: "guide-tab-best",
    side: "bottom",
    align: "center",
    title: "Migliori match",
    body: "Chi ha più figurine da scambiare con te, ovunque sia.",
  },
  {
    id: "match-search",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    target: "guide-tab-search",
    side: "bottom",
    align: "end",
    title: "Cerca figurina",
    body: "Cerchi UNA figurina precisa?<br>Qui trovi subito chi ce l'ha.<br>La trovi anche in Home, con l'icona {search}",
  },
  // → apri il primo match (freccia sulla card)
  {
    id: "open-match",
    kind: "action",
    route: "/match",
    target: "guide-first-match",
    // Card larga e in basso: fumetto SOPRA (freccia in giù) per non coprirla.
    side: "top",
    align: "center",
    title: "Il tuo Match!",
    body: "Tocca questo collezionista per vedere cosa scambiare.",
  },
  // Dentro il match: sezioni Dai/Ricevi
  {
    id: "trade-sections",
    kind: "info",
    route: "/match",
    dynamicRoute: true,
    target: "guide-trade-sections",
    title: "Dai e Ricevi",
    // La forza dell'app: uno scambio SMART che unisce più figurine da album
    // diversi. Le righe album sono toccabili (si aprono per vedere le figurine).
    body: "Tocca un album per vedere le figurine.<br>In un solo scambio unisci più figurine di album diversi.",
  },
  // Il bottone chat — APRE la chat (demo): il passo è "action", toccandolo si
  // entra davvero nella chat, dove i 4 passi sotto spiegano ogni funzione.
  {
    id: "chat",
    kind: "action",
    route: "/match",
    dynamicRoute: true,
    target: "guide-chat-button",
    side: "bottom",
    align: "end",
    title: "Mettetevi d'accordo {messaggi}",
    body: "Tocca qui per aprire la chat con il collezionista.",
  },
  // DENTRO la chat (rotta /chat/demo…). 4 passi: scrivi · conferma scambio ·
  // segnala · avviso sicurezza. Tutti "info" (si guarda; con i profili-prova
  // invio e conferma non sono attivi, la guida lo spiega dove serve).
  {
    id: "chat-write",
    kind: "info",
    route: "/chat",
    dynamicRoute: true,
    target: "guide-chat-input",
    side: "top",
    title: "Scrivete qui",
    body: "Accordatevi sullo scambio: dove e quando vedervi.",
  },
  {
    id: "chat-confirm",
    kind: "info",
    route: "/chat",
    dynamicRoute: true,
    target: "guide-chat-confirm",
    side: "left",
    title: "Scambio fatto?",
    body: "Tocca il ✓ verde per confermarlo.<br>Il tuo album si aggiorna da solo.",
  },
  {
    id: "chat-report",
    kind: "info",
    route: "/chat",
    dynamicRoute: true,
    target: "guide-chat-report",
    side: "bottom",
    align: "end",
    title: "Qualcosa non va?",
    body: "Segnala la chat: la valuta l'admin, in modo anonimo.",
  },
  {
    id: "chat-notice",
    kind: "info",
    route: "/chat",
    dynamicRoute: true,
    target: "guide-chat-notice",
    side: "bottom",
    title: "Chat protetta",
    body: "Per sicurezza le chat possono essere controllate, solo se serve.",
  },
  // Fine (fumetto centrato)
  {
    id: "done",
    kind: "info",
    route: "/chat",
    dynamicRoute: true,
    title: "Tutto qui!",
    body: "Ora tocca a te: aggiungi i tuoi album e trova i primi scambi.",
  },
];
