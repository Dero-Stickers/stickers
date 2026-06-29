# Navigazione e UI

## Footer Mobile (Utente)

| Voce | Icona | Rotta |
|------|-------|-------|
| Home | casa | `/` |
| Album | libro | `/album` |
| Match | scambio | `/match` |
| Profilo | persona | `/profilo` |

## Home — Panoramica generale

Tre blocchi essenziali (no dati duplicati dalle altre sezioni, no dettaglio singolo album):
- **La tua collezione** (sintesi aggregata su TUTTI gli album): % completamento complessiva + barra; possedute (verde `chart-3`) / doppie (rosso `destructive`) / mancanti (giallo `accent`); n° album.
- **Ti aspettano** (azioni richieste): solo se ci sono chat con messaggi non letti → riga per chat verso `/chat/{id}`.
- **Migliori match** (hero, driver di conversione): card a gradiente `primary→chart-1`; switch in alto a destra ⚡ migliori in generale / 📍 migliori vicini (icone, no testo); sottotitolo per-filtro "N scambi · M utenti" (⚡) o "…utenti vicini" (📍); 3 anteprime ordinate per il filtro attivo, ognuna → `/match/{userId}`; CTA "Trova match" → `/match`.
- Stato demo/premium (badge accanto al saluto).

## Sezione Album

- I miei album
- Album disponibili
- Card album
- Griglia figurine
- Filtro stati

## Sezione Match

- Vicini a te (scheda di default) / Migliori match
- Filtro distanza CAP (slider) — box fisso sopra la lista, solo le card scrollano
- Lista "Vicini a te" ordinata per distanza crescente
- Dettaglio match multi-album
- Chat integrata

## Sezione Profilo

- Nickname
- CAP
- Area generica
- Stato demo/premium
- Codice di recupero (protetto da PIN)
- Guida onboarding riapribile
- Email di supporto
- Logout

## Onboarding (primo accesso)

Guida con bubble/tooltip che spiega:
1. Gestione album
2. Stati figurine
3. Match
4. Chat
5. Demo premium
6. Privacy CAP

Riapribile dalla sezione Profilo.

## Stile UI

- **Light mode only** (no dark mode)
- Mobile-first
- Sfondo principale chiaro
- Interfaccia pulita, moderna, touch-friendly
- Tono giovane ma non infantile
- Solo le aree con liste lunghe/griglie scrollano
- NO container inutili

## Responsive e layout (app utente)

- **Guscio centrato** (`MobileLayout`): colonna `max-w-md` su telefono che si allarga a `md:max-w-2xl` (~672px) su tablet, centrata con sfondo neutro ai lati. Guscio, barra nav inferiore e barre fisse (chat input, CTA match) condividono la stessa larghezza/allineamento.
- **Head bar unificata** (`AppHeader`): solo logo, gradiente orizzontale, bordo sfumato ai lati; gestisce la safe-area (notch). Presente in Home/Album/AlbumDetail/Match/Dettaglio match/Profilo.
- **Griglie adattive**: liste album e match a 2 colonne da `md`; griglia figurine `7 → sm:9 → md:10 → lg:12`.
- **Documento BLOCCATO (standard app nativa)**: `html/body/#root` hanno altezza fissa (`height:100%`) + `overflow:hidden` (in `index.css`) → il documento NON scorre né rimbalza (niente rubber-band iOS). Lo scroll vive SOLO nei contenitori interni, con `overscroll-behavior:contain`. La safe-area in alto è gestita dal padding del `body` (box-sizing border-box, così `#root` resta dentro il viewport).
- **Pagine a contenuto fisso + scroll**: radice `h-full` flex-col, header/titoli/filtri `shrink-0`, contenuto `flex-1 overflow-y-auto min-h-0`. **Un solo contenitore scrollabile per pagina** (il `<main>` della shell è `overflow-hidden`). Eliminato `dvh` (cambiava altezza durante lo scroll → micro-salti). Stesso pattern di `AdminLayout` (che già non rimbalzava).
- **Tab bar nativa (safe-area)**: la barra inferiore è un **elemento fisso della colonna** (`shrink-0`, non più `position:fixed`): riga icone piena da `h-16` con la safe-area (`env(safe-area-inset-bottom)`) **aggiunta sotto** come padding del contenitore — NON dentro `h-16` (altrimenti `box-sizing:border-box` la sottrae e schiaccia le icone). Il `<main>` non deve più compensare con padding.
- **Scroll-reset alla navigazione** (standard mobile): a ogni cambio rotta la pagina riparte dall'alto. Logica unica nell'hook `useScrollResetOnNavigate`, applicata SOLO nei layout radice (`MobileLayout`, `AdminLayout`) — resetta il contenitore e i discendenti scrollabili. Necessaria perché wouter riusa il DOM dei layout tra le rotte.
- **Indietro nel dettaglio**: nelle pagine di dettaglio (es. AlbumDetail) il "torna indietro" è una **freccia sola, senza testo**, sulla stessa riga del titolo (non una riga dedicata). La nav inferiore cambia sezione, non sostituisce il back nel dettaglio.
- **Card album SENZA immagini**: feature copertine rimossa completamente (no artwork di terzi, scelta legale). Nessun componente `AlbumCover`, nessuna tessera/placeholder, nessuna modale-anteprima. Le card sono **solo testo**: "I miei album" = titolo + % + cestino su una sola riga (tap → dettaglio); "Disponibili" = titolo + figurine + pulsante "+". Vedi `09_DATABASE.md` → copertine rimosse.
- **Prestazioni liste lunghe**: griglia figurine con utility `cv-cell` (`content-visibility:auto`) → il browser salta il *paint* fuori schermo; toggle stato figurina **ottimistico** (nessun refetch dell'intera griglia). Cella estratta in **`StickerCell` (`React.memo`)** con callback stabili (`useCallback`): al tap si ri-renderizza solo la cella toccata, non tutte le ~700-900. Lista filtrata e conteggi **memoizzati** (`useMemo`); stesso pattern per i derivati di Home/Album/Match (sort/reduce/Set). DB non è il collo di bottiglia (query figurine ~12ms).
- **Area admin**: layout desktop a larghezza piena (`AdminLayout`, `max-w-6xl`), non segue il guscio mobile.
- **Orientamento (fase nativa/store)**: telefono bloccato in verticale, tablet libero in orizzontale — impostato in Capacitor (iOS/Android), non via overlay JS. Sul web il manifest richiede `portrait` (solo suggerimento).
- **Strumento dev U/A** (`DevQuickSwitch`): pulsante tondo fisso in alto **a destra** (solo sviluppo, da rimuovere prima del passaggio a utenti reali).

## Palette Colori (da logo e screenshot)

| Variabile | Valore | Uso |
|-----------|--------|-----|
| Primary teal | `#1c7a9c` | Sidebar, header, accent |
| Dark navy | `#1a2d45` | Testo principale, sidebar scura |
| Yellow/gold | `#f5a623` | CTA primari, badge, accenti |
| Cream | `#f7f2e8` | Card figurine |
| Light bg | `#f0f4f7` | Sfondo principale |
| White | `#ffffff` | Card, modal |
| Green | `#22c55e` | Stato Posseduta |
| Red | `#ef4444` | Stato Doppia |
