# DNA — Guida interattiva (onboarding tour)

> Come funziona la guida a fumetti che accompagna il nuovo utente, e come
> modificarla. **Fonte di verità = il codice**; qui solo ciò che non si ricava a
> colpo d'occhio. Aggiornare a ogni cambio strutturale.

## Cos'è

Un tour interattivo **fatto in casa** (nessuna libreria esterna: usa solo
framer-motion + Tailwind già presenti → zero peso aggiunto). Conduce il nuovo
utente, in modo SMART e DIMOSTRATIVO, nella gestione del **primo album** e del
**primo match**: la guida MOSTRA e SPIEGA su elementi reali, ma **NON modifica
dati** (nessun cambio stato, nessuno scambio). È un tour, non un'azione reale.

**REGOLA D'ORO** (rispettarla sempre): ogni passo evidenzia un elemento
REALMENTE PRESENTE nella schermata in cui si trova. Se il testo parla di
figurine, siamo dentro un album aperto con la griglia visibile; se parla del
bottone chat, quel bottone è lì illuminato. Mai spiegare cose fuori schermo.

## File (3 pezzi separati — architettura modulare)

| File | Ruolo | Quando toccarlo |
|---|---|---|
| `src/lib/guide/steps.ts` | **Config dei passi** (testi, target, tipo, rotta) | Per aggiungere/togliere/modificare un passo |
| `src/lib/guide/GuideContext.tsx` | **Stato** (attivo? passo? flag "già vista" per-utente) | Raramente |
| `src/components/guide/GuideOverlay.tsx` | **Motore** (velo, spotlight, fumetto, navigazione) | Raramente |

Montaggio in `src/App.tsx`: `GuideGate` (passa userId) → `GuideProvider` →
`<GuideAutoStart/>` + `<GuideOverlay/>`.

## Il percorso attuale (10 passi)

Home (intro) → **tocca Album** → **apri un album** → dentro `/album/:id`:
segna figurina · long-press figurina · long-press filtri (bulk) → **tocca Match**
→ **apri un match** → dentro `/match/:id`: sezioni DAI/RICEVI + bottone chat →
Fine (rimanda a Profilo per riaprirla). I passi "azione" NAVIGANO davvero dentro
album e match reali, così i passi "info" successivi hanno gli elementi sotto.

## Due tipi di passo

- `kind: "info"` → spiega un elemento presente; si avanza col bottone **Avanti**.
- `kind: "action"` → INTERATTIVO: l'elemento è cliccabile, la guida ASPETTA il
  tocco. Al tocco, se il target è un link (ha `href`) la GUIDA naviga lì in modo
  deterministico (`setLocation`), poi avanza. Mostra "Tocca lì" con manina.

## Aggancio agli elementi (`data-guide`)

L'elemento target porta `data-guide="<chiave>"`. Chiavi attuali:
- Navbar (`MobileLayout.tsx`): `nav-album`, `nav-match`, `nav-messaggi`, `nav-profilo`, `nav-bar`.
- Prima card album (`AlbumList.tsx`, sul `<Link>`): `guide-first-album`.
- Prima figurina (`StickerCell.tsx` via prop `dataGuide`): `guide-first-sticker`.
- Contenitore 4 filtri (`AlbumDetail.tsx`): `guide-filters`.
- Prima card match (`MatchCard.tsx` via prop `dataGuide`, sul `<Link>`): `guide-first-match`.
- Bottone chat (`MatchDetail.tsx`): `guide-chat-button`.

Per un nuovo passo: aggiungi `data-guide="chiave"` sull'elemento e usa la stessa
chiave come `target` nel passo. **Metti l'anchor sull'elemento CLICCABILE**
(es. il `<Link>`, non la `<Card>` che lo avvolge), altrimenti il tocco non naviga.

## Avvio e "già vista"

- **Auto-start** (`GuideAutoStart`): ⚠️ **PER ORA (test) parte a OGNI refresh**
  per l'utente loggato non-admin, ma **UNA sola volta per caricamento pagina**:
  se la chiudi/salti NON si riapre da sola (riparte al prossimo refresh). Per
  renderla "solo al primo avvio in assoluto", sostituire la condizione con
  `!hasSeenGuide(currentUser?.id)` (funzione pronta in `GuideContext.tsx`).
- **Riapertura manuale**: Profilo → "Guida Stickers" chiama `useGuide().start()`.
- **Flag**: localStorage per-utente `sticker_guide_seen_v1:<userId>`. Cambiare
  la versione ri-mostra la guida a tutti dopo un update importante.

## Dettagli tecnici del motore (non ovvi — imparati nei test)

- **Buco cliccabile**: velo a 4 pannelli scuri attorno al target (non overlay
  pieno) → il target resta un vero foro cliccabile. Container root
  `pointerEvents:none`; pannelli/X/fumetto riattivano `pointerEvents:auto` INLINE.
- **Colori/pe INLINE, non classi Tailwind**: `bg-slate-900/70` e
  `pointer-events-none` in questo Tailwind v4 NON vengono generati (renderebbero
  trasparente / pe:auto) → si usa `style` inline. Stesso motivo per cui altrove
  si preferiscono classi standard (`h-12`) alle arbitrarie.
- **Misura CONTINUA (rAF)**: lo spotlight/fumetto seguono la posizione reale del
  target ad ogni frame (con guardia anti-jitter <0.5px) → niente misure
  "congelate" su posizioni intermedie durante i caricamenti async.
- **Navigazione deterministica**: nei passi "action" la guida fa `next()` PRIMA e
  `setLocation(href)` DOPO — così l'effetto di navigazione del passo (che forza
  la sua rotta) non riporta indietro l'utente. I passi su rotta dinamica
  (`dynamicRoute:true`) non forzano navigazione.
- **Fumetto mai sopra il target**: si àncora al lato (sopra/sotto) con più spazio
  libero, così non copre mai lo spotlight (l'utente vede e tocca).
- **X in alto a SINISTRA**: per non collidere col pulsante U/A (DevQuickSwitch,
  z-9999, in alto a destra — che NON va toccato).
- Chiusura: X, "Salta la guida", ESC. Segna sempre "vista".

## Vincoli rispettati

Solo frontend. **Nessun DB, nessuna libreria nuova, nessun peso all'avvio**. Non
tocca dati reali. Non tocca il pulsante U/A.
