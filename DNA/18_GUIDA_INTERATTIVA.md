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

## File (architettura modulare)

| File | Ruolo | Quando toccarlo |
|---|---|---|
| `src/lib/guide/steps.ts` | **Config dei passi** (testi, target, tipo, rotta, tapPhases) | Aggiungere/togliere/modificare passi |
| `src/lib/guide/GuideContext.tsx` | **Stato** (attiva? passo? flag "già vista"; `useGuideStepId` per le pagine) | Raramente |
| `src/lib/guide/guide-demo.ts` | **Album di prova** (id -1, card + 60 figurine demo deterministiche) | Cambiare i dati demo |
| `src/components/guide/GuideOverlay.tsx` | **Motore** (wrapper driver.js: highlight, avanzamento, prove, demo) | Raramente |
| `src/components/guide/guide-theme.css` | **Stile fumetto** (palette) + classi-demo colori | Ritocchi visivi |

Montaggio in `src/App.tsx`: `GuideGate` (userId) → `GuideProvider` →
`<GuideAutoStart/>` + `<GuideOverlay/>`.

## I 4 tipi di passo

- `info` → fumetto informativo; si avanza toccando OVUNQUE (hint "Tocca lo
  schermo per continuare").
- `action` → freccia sul pulsante REALE; si avanza toccando QUEL pulsante
  (naviga davvero: la guida intercetta il click e fa `next()` PRIMA di
  `setLocation(href)` — deterministico).
- `try` → prova pratica SIMULATA dell'utente: `taps: N` (tocchi → la cella
  cambia colore SOLO visivamente). Con `tapPhases` il fumetto spiega OGNI colore
  (verde=trovate, rosso=doppie, grigio=mancanti) e dopo l'ULTIMO tocco
  l'avanzamento è **MANUALE** (tocca lo schermo: tempo di leggere). Senza
  tapPhases (es. ➕ aggiungi album): feedback breve e avanti da solo. Oppure
  `waitDialogClose: true` (long-press reale → dettaglio read-only; alla chiusura
  si avanza; il velo driver viene tolto mentre il dialog è aperto, z-index).
- `demo` → dimostrazione AUTOMATICA (filtri bulk): evidenzia i 3 filtri uno
  alla volta colorando TUTTA la griglia (classi CSS `sg-demo-*`), poi ripristina
  e avanza. Tocchi ignorati durante la demo.

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

## Percorso attuale (11 passi)

nav Album → ➕ aggiungi album (Disponibili, simulato) → apri l'album di prova →
prova 3 tocchi figurina (fumetto spiega i 3 colori, avanzo manuale sul grigio) →
prova long-press (dettaglio) → demo 3 filtri → nav Match → apri primo match
(PROVA) → Dai/Ricevi → bottone chat → Fatto.

## Aggancio (`data-guide`)

Anchor sugli elementi CLICCABILI (sul `<Link>`, non sulla Card che lo avvolge):
`nav-album`/`nav-match`/… (navbar, MobileLayout) · `guide-add-album` (➕ card
demo Disponibili) e `guide-first-album` (riga demo "I miei album") in AlbumList ·
`guide-first-sticker` (StickerCell via prop) · `guide-filters` +
`guide-filter-<key>` + `guide-sticker-grid` (AlbumDetail) · `guide-first-match`
(MatchCard via prop) · `guide-trade-sections` + `guide-chat-button` (MatchDetail).

## Avvio e "già vista"

- **Auto-start** (`GuideAutoStart` in App.tsx): ⚠️ PER ORA (fase test) parte a
  OGNI refresh, UNA volta per caricamento pagina, e SOLO DOPO che il cookie
  banner è stato chiuso (`COOKIE_ACK_KEY`, altrimenti coprirebbe la navbar).
  Per il rilascio: usare `!hasSeenGuide(userId)` (già pronta in GuideContext).
- **Riapertura**: Profilo → "Guida Stickers" → `useGuide().start()`.
- **Flag**: localStorage `sticker_guide_seen_v1:<userId>`; alzare la versione
  ri-mostra la guida a tutti.

## Dettagli non ovvi (imparati nei test — NON regredire)

- **Anti doppio-avanzamento**: un tocco fisico genera più eventi (pointerdown
  overlay driver + click documento) → `advance()` con guardia 350ms.
- **Tocco sul velo**: gestito da `overlayClickBehavior` di driver.js (i click
  sull'overlay NON raggiungono i listener document). Il resto (fumetto, area
  evidenziata, target) passa dal listener document in CAPTURE.
- **ESC in CAPTURE**: se c'è un dialog Radix aperto, ESC chiude quello e non la
  guida (in bubble il dialog risulterebbe già chiuso → race).
- **Zero scritture**: nei passi `try` con `taps` il click è `preventDefault`
  (l'app non lo vede); verificato in test: 0 chiamate POST/PATCH/PUT/DELETE
  durante l'intera guida e 0 classi-demo residue.
- Selettori/classi condivisi in costanti (`OPEN_DIALOG_SELECTOR`,
  `CELL_DEMO_CYCLE`, `GRID_DEMO_CLASSES`, `GRID_SELECTOR`) in GuideOverlay.

## Vincoli

Solo frontend. Unica dipendenza aggiunta: `driver.js` (~5KB). Nessun impatto
DB. Non tocca il pulsante U/A.
