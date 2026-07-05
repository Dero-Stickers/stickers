# DNA — Guida interattiva (onboarding tour)

> Come funziona la guida a fumetti e come modificarla. **Fonte di verità = il
> codice**; qui solo ciò che non si ricava a colpo d'occhio. Aggiornare a ogni
> cambio strutturale.

## Cos'è

Tour in stile "guida app classica": velo scuro, elemento evidenziato, **fumetto
con la freccia** che punta il tasto di cui si parla. Motore di rendering =
**driver.js** (libreria standard dei product tour, ~5KB); flusso, passi e stato
restano nostri. Conduce il nuovo utente nel **primo album** e nel **primo
match**, facendo VEDERE le funzioni (anche i trucchi nascosti).

**Regole (decise con l'owner):**
- REGOLA D'ORO: ogni passo evidenzia un elemento REALMENTE presente nella
  schermata (i passi "action" navigano davvero dentro album/match).
- Fumetti SOLO informativi: **nessun pulsante** (niente avanti/indietro/salta/
  pallini). Si va solo avanti. ESC (desktop) chiude.
- **La guida non modifica MAI il database**: le prove sono simulate (colori
  finti via CSS) o read-only; a fine guida l'app è ESATTAAMENTE com'era.
- **Emoji = solo icone dell'app**: nei titoli/testi si usano SOLO emoji che
  è la STESSA dell'app, non un'emoji. Nei testi/titoli si scrive il segnaposto
  `{album}`/`{match}`/`{messaggi}`/`{aggiungi}`: il motore lo sostituisce con
  l'SVG del COMPONENTE lucide reale (`lib/guide/guide-icons`, estratto a runtime
  → nessun markup duplicato, se lucide cambia la guida eredita). Il fulmine
  `{match}` è arancione pieno come la voce Match attiva in navbar (`fill-accent`).
  Colori-cella (🟩🟥⬜) restano emoji: rappresentano gli stati reali.
- **Niente hint ovvi**: i passi `try` non mostrano un hint generico (il vecchio
  "Provaci ora" era palese); l'hint appare solo se aggiunge informazione
  (`hintOverride` es. "Tieni premuto", o "Tocca lo schermo per continuare").
- **Primo passo = anche benvenuto**: `go-album` apre con "Benvenuto in Stickers!"
  + una frase-visione (Album {album} + Match {match}), poi l'istruzione a capo.
- **Aggiungi album in 2 passi**: `find-album` (dove sono: tab "Disponibili"
  illuminato) → `add-album` (tocca ➕ per averlo). Il tab resta illuminato
  (`sg-lit`) in entrambi; AlbumList forza il tab e mostra la card demo.
- **Spotlight aderente**: `stagePadding: 2` — evidenzia SOLO il target (es. la
  sola voce "Album" in navbar), senza sbordare fuori dalla barra.
- **Freccia del fumetto**: un solo triangolo affusolato (11px punta × 7px lati),
  uguale in ogni direzione (CSS `driver-popover-arrow-side-*`). NON allargare i
  border a caso o sembra doppia.
- **Avvio a OGNI refresh anche in DEPLOY** (scelta owner): mai `!hasSeenGuide`
  finché non richiesto; deve ripartire sempre, ovunque.

## File (architettura modulare)

| File | Ruolo | Quando toccarlo |
|---|---|---|
| `src/lib/guide/steps.ts` | **Config dei passi** (testi, target, tipo, rotta, tapPhases) | Aggiungere/togliere/modificare passi |
| `src/lib/guide/GuideContext.tsx` | **Stato** (attiva? passo? flag "già vista"; `useGuideStepId` per le pagine) | Raramente |
| `src/lib/guide/guide-demo.ts` | **Album di prova** (id -1, card + 60 figurine demo deterministiche) | Cambiare i dati demo |
| `src/lib/guide/guide-icons.tsx` | **Icone-app** (SVG dei componenti lucide per i segnaposto {…}) + pallini-colore {verde}/{rosso}/{grigio} | Aggiungere un'icona |
| `src/components/guide/GuideOverlay.tsx` | **Motore** (wrapper driver.js: highlight, avanzamento, prove, `side`/`align`, effetto `magic`) | Raramente |
| `src/components/guide/GuideFinishDialog.tsx` | **Schermata finale** = modale centrale (logo + benvenuto + donazione PayPal) | Testi/donazione finale |
| `src/components/guide/guide-theme.css` | **Stile fumetto** (palette, freccia, `.sg-icon`, `.sg-dot`, `.sg-lit`, `.sg-magic`) | Ritocchi visivi |

**Passo finale = MODALE, non fumetto**: l'ultimo passo `done` NON usa driver.js;
il motore mostra `GuideFinishDialog` (Radix Dialog centrale): logo Stickers,
titolo **"Welcome in Stickers!"**, nota "app gratis + contributo" e bottone PayPal
**"Supporta con"** (PREDISPOSTO, non collegato: `handleDonate` mostra un
ringraziamento). Il bottone in fondo **"Inizia! Trova il tuo primo Match"** chiude
la guida E porta in Home (`setLocation("/")`, non resta sull'ultima pagina/chat).
Chiuso → `finish()`. **Effetto `magic`** (solo `go-album`): la classe `.sg-magic`
fa comparire titolo+testo con un **fade-in ritardato** (~0,7s dopo il fumetto
vuoto, prima il titolo poi la descrizione) — semplice, solo CSS, niente blur/glow.
**Posizionamento**: campi `side`/`align` per passo forzano il lato del fumetto
quando l'auto-scelta di driver.js coprirebbe il target (es. card match: `side: top`).

**Lingua unificata (owner)**: TITOLO = concetto/funzione (non un'azione: "Gestisci
i tuoi album", non "Aprilo"); BODY = l'azione. Stessi termini ovunque, niente
sinonimi — verbi: **Tocca** (tap), **Tieni premuto/a** (long-press), **Segna**
(figurine), **Trova/Scegli** (album), **Aggiungi** (alla collezione),
**Scambiare** (match). Sostantivi: **album**, **collezione**, **figurine**,
**scambio**, **match**.

Montaggio in `src/App.tsx`: `GuideGate` (userId) → `GuideProvider` →
`<GuideAutoStart/>` + `<GuideOverlay/>`.

## I 3 tipi di passo

- `info` → fumetto informativo; si avanza toccando OVUNQUE (hint "Tocca lo
  schermo per continuare").
- `action` → freccia sul pulsante REALE; si avanza toccando QUEL pulsante
  (naviga davvero: la guida intercetta il click e fa `next()` PRIMA di
  `setLocation(href)` — deterministico).
- `try` → prova pratica SIMULATA dell'utente (l'utente FA, non guarda). Tre
  varianti, tutte a ZERO scritture DB:
  - **`taps: N`** (segna figurine) → tocchi → la cella cambia colore SOLO
    visivamente. La cella parte col suo colore reale (001 = verde), già spiegato
    nel `body` iniziale; ogni `tapPhases[i]` porta la cella al suo `color` e
    aggiorna il testo (rosso=doppie, grigio=mancanti). Dopo l'ULTIMO tocco
    l'avanzamento è **MANUALE** (tocca lo schermo: tempo di leggere). Senza
    tapPhases (es. ➕ aggiungi album): feedback breve e avanti da solo.
  - **`waitDialogClose: true`** (long-press figurina) → apre il dettaglio
    read-only; la guida EVIDENZIA il dialog con `dialogTitle`/`dialogBody`
    "chiudi per continuare"; alla chiusura si avanza.
  - **`longPressGrid: {color, doneBody}`** (long-press filtro "Mie") → l'utente
    TIENE PREMUTO il filtro evidenziato (soglia ~550ms via `pointerdown`
    capture) e TUTTA la griglia si colora (`sg-demo-*`, solo CSS). Poi
    avanzamento **MANUALE** (tocca lo schermo). La guida ripristina SEMPRE i
    colori reali. Target = "Mie" (verde) per coerenza con lo stato "trovata"
    appena spiegato. Il `pointerdown` in capture con `stopPropagation` blocca il
    long-press REALE del filtro → nessun `BulkStateDialog`, nessun bulk.

## Album di prova (stato standard per QUALSIASI account)

La sezione Album della guida NON dipende dall'account (un nuovo utente ha 0
album): durante i passi `add-album`/`open-album`, `AlbumList` legge
`useGuideStepId()` e mostra uno stato-demo — tab forzato su Disponibili con la
card "Album di prova" + ➕ (anchor `guide-add-album`, tocco simulato senza API),
poi tab "I miei album" con la riga demo in cima (anchor `guide-first-album`,
href `/album/-1`). `AlbumDetail` con id negativo usa i dati di `guide-demo.ts`
(hook API disabilitati, griglia 60 figurine 30/15/15 = 75%) e disattiva ogni
scrittura (tap, dialog, bulk, rimozione nascosta). Tutto sparisce a guida chiusa.
Verificato con entrambi gli scenari (account pieno e utente nuovo via stub API):
flusso IDENTICO, 0 scritture, 0 residui.

## Percorso attuale (~20 passi)

**Benvenuto** (nav Album, con effetto magic) → trova album (tab Disponibili) →
aggiungi col ➕ (simulato) → apri l'album (tab "I miei album" illuminato) →
2 tocchi figurina (verde→rosso→grigio, pallini-colore, avanzo manuale; il
long-press è disattivato in questo passo) → long-press figurina 011 verde
(dettaglio READ-ONLY: solo la X chiude) → 3 filtri bulk Mie/Doppie/Mancanti
(leggo→tengo premuto→guardo→tocco, per fase) → nav Match → **Vicini a te** →
**Raggio di ricerca** (illumina la barra `guide-match-radius`, "trascina per
decidere quanto lontano") → **Migliori match** → **Cerca figurina** (la lente è
nel testo, non nel titolo; ricorda che c'è anche in Home) → apri primo match →
Dai&Ricevi (scambio smart multi-album) → **apri la chat** → scrivi · conferma
scambio (✓) · segnala · avviso sicurezza → **MODALE finale** (logo + donazione).

## Aggancio (`data-guide`)

Anchor sugli elementi CLICCABILI (sul `<Link>`, non sulla Card che lo avvolge):
`nav-album`/`nav-match`/… (navbar, MobileLayout) · `guide-add-album` (➕ card
demo Disponibili) e `guide-first-album` (riga demo "I miei album") in AlbumList ·
`guide-first-sticker` (StickerCell via prop) · `guide-filters` +
`guide-filter-<key>` + `guide-sticker-grid` (AlbumDetail) · `guide-tab-nearby`/
`guide-tab-best`/`guide-tab-search` + `guide-match-radius` (barra del raggio,
visibile solo col tab "nearby" attivo) (MatchList) · `guide-first-match`
(MatchCard via prop) · `guide-trade-sections` + `guide-chat-button` (MatchDetail).

## Avvio e "già vista"

**Modalità GLOBALE decisa da admin** (5 lug) — setting `guideMode` in
`app_settings`, gestito da **Admin → Impostazioni** (3 opzioni indipendenti,
una attiva alla volta). Letto da `GuideAutoStart` (App.tsx) via `useGetAppSettings`
(endpoint `/settings` pubblico → ogni utente lo legge). **Default: `off`**.
- **`off`** → la guida non parte mai.
- **`first`** → parte SOLO alla prima autenticazione: `GuideAutoStart` controlla
  `!hasSeenGuide(userId)`; `finish()`/`next()` in GuideContext segnano "vista".
- **`always`** → parte a OGNI refresh, UNA volta per caricamento pagina (se
  l'utente la chiude non si riapre finché non ricarica).
In tutti i casi parte solo per l'utente NON-admin, SOLO DOPO che il cookie banner
è chiuso (`COOKIE_ACK_KEY`) e lo splash è sparito. **Nessun trigger dal Profilo**.
- **Backend**: `routes/settings.ts` legge/scrive la chiave `guide_mode` (valori
  validati a `off|first|always`, fallback `off`). Esposto come `AppSettings.guideMode`.
- **Flag "già vista"**: localStorage `sticker_guide_seen_v1:<userId>` (usato solo
  in modalità `first`); alzare la versione (v1→v2) ri-mostra la guida a tutti.

## Dettagli non ovvi (imparati nei test — NON regredire)

- **Anti doppio-avanzamento**: un tocco fisico genera più eventi (pointerdown
  overlay driver + click documento) → `advance()` con guardia 350ms.
- **Tocco sul velo**: gestito da `overlayClickBehavior` di driver.js (i click
  sull'overlay NON raggiungono i listener document). Il resto (fumetto, area
  evidenziata, target) passa dal listener document in CAPTURE.
- **ESC in CAPTURE**: se c'è un dialog Radix aperto, ESC chiude quello e non la
  guida (in bubble il dialog risulterebbe già chiuso → race).
- **Zero scritture**: nei passi `try` (taps, long-press filtro) i tocchi sono
  `preventDefault`+`stopPropagation` in CAPTURE (l'app non li vede: né il tap
  sulla figurina né il bulk del filtro); verificato in test: 0 chiamate
  POST/PATCH/PUT/DELETE durante l'intera guida e 0 classi-demo residue.
- **Long-press filtro (`longPressGrid`)**: soglia ~550ms via `pointerdown` in
  CAPTURE su `document` (React attacca i suoi listener al root container → il
  `stopPropagation` in capture li precede e li blocca: il long-press REALE del
  filtro non parte). A press riuscito lo SPOTLIGHT si sposta sulla GRIGLIA (non
  sul filtro) così esce dal velo scuro e l'utente VEDE le figurine cambiare
  colore tutte insieme. Rilascio anticipato (< 550ms) → nessun bulk, si riprova.
- Selettori/classi condivisi in costanti (`OPEN_DIALOG_SELECTOR`,
  `CELL_DEMO_CYCLE`, `GRID_DEMO_CLASSES`, `GRID_SELECTOR`) in GuideOverlay.

## Vincoli

Solo frontend. Unica dipendenza aggiunta: `driver.js` (~5KB). Nessun impatto
DB. Non tocca il pulsante U/A.
