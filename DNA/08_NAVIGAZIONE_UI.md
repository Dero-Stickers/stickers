# Navigazione e UI

## Footer Mobile (Utente)

| Voce | Icona | Rotta |
|------|-------|-------|
| Home | casa | `/` |
| Album | libro | `/album` |
| Match | scambio | `/match` |
| Profilo | persona | `/profilo` |

## Home — Dashboard Rapida

- Logo/nome app
- Album attivi
- Completamento album principale
- Migliore match
- Match vicino per CAP
- Stato demo/premium
- Bottoni rapidi Album/Match

## Sezione Album

- I miei album
- Album disponibili
- Card album
- Griglia figurine
- Filtro stati

## Sezione Match

- Migliori match
- Vicini a te
- Filtro distanza CAP (slider)
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
- **Head bar unificata** (`AppHeader`): solo logo, gradiente orizzontale, bordo sfumato ai lati; gestisce la safe-area (notch). Presente in Home/Album/AlbumDetail/Match/Profilo.
- **Griglie adattive**: liste album e match a 2 colonne da `md`; griglia figurine `7 → sm:9 → md:10 → lg:12`.
- **Pagine a contenuto fisso + scroll**: `h-[calc(100dvh-4rem)]` flex-col, header/titoli/filtri `shrink-0`, contenuto `flex-1 overflow-y-auto min-h-0` (nav fissa `h-16`). Robusto anche in orizzontale (il contenuto scorre).
- **Tab bar nativa (safe-area)**: la barra inferiore ha una riga icone piena da `h-16` con la safe-area (`env(safe-area-inset-bottom)`) **aggiunta sotto** come padding del contenitore — NON dentro `h-16` (altrimenti `box-sizing: border-box` la sottrae e schiaccia le icone, bug visto su iPhone con home indicator). Il `<main>` compensa con `padding-bottom: calc(4rem + safe-area)`. Vale per app installata da store su qualsiasi device.
- **Indietro nel dettaglio**: nelle pagine di dettaglio (es. AlbumDetail) il "torna indietro" è una **freccia sola, senza testo**, sulla stessa riga del titolo (non una riga dedicata). La nav inferiore cambia sezione, non sostituisce il back nel dettaglio.
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
