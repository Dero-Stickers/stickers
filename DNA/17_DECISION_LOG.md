# DNA — Decision Log

> Registro delle **decisioni tecniche rilevanti** (cosa è stato deciso e perché),
> non un changelog. Una riga per decisione, le più recenti in alto. Aggiungere qui
> ogni scelta architetturale/di prodotto non ricavabile rapidamente dal codice.
> Riferito dalla governance (`AGENTS.md`, `CLAUDE.md §3.5`).

## 2026-06

- **Cattura errori silenti (mini-Sentry self-hosted, no dipendenze esterne)** — scelto di NON
  adottare Sentry (dato fuori UE/GDPR, costo, free tier) e di potenziare il sistema interno:
  handler globali client (`lib/error-capture.ts`: window.error + unhandledrejection +
  vite:preloadError) con dedup/throttle/filtro-rumore; API 5xx/rete → `api_error` automatico via
  un `FetchFailureObserver` in `custom-fetch.ts` (lib resta indipendente: chiama l'hook solo se
  registrato); i 4xx normali esclusi (rumore); ErrorBoundary auto-invio; chunk fallito → reload
  una volta (guard sessionStorage) per evitare lo schermo bianco. Test via `node --test`+tsx
  (no nuove dep di runtime; tsx era già transitiva). Nota infra: i binari nativi darwin-arm64
  (rollup/esbuild/lightningcss) sono disabilitati negli override di `pnpm-workspace.yaml` (deploy
  Linux); per buildare/dev in locale su Mac vanno reinstallati a mano nel rispettivo pkg.
- **Home/Profilo più standard (UI)** — Home: "Migliori match" mostra **4** anteprime (3 erano poche); a
  meno di 4 match gli slot mancanti restano placeholder tratteggiati per **altezza card fissa**. Profilo:
  voci consolidate in 3 sezioni con titoletto (Account / Aiuto e supporto / Informazioni), sottotitoli
  rimossi, freccia `›` per riga; **"Contatta il supporto" rimosso** (ridondante con "Segnala un problema");
  due pulsanti finali speculari e `rounded-xl` (Esci = bianco/rosso, Elimina = rosso pieno). Solo frontend,
  nessun impatto DB/API. Vedi `08_NAVIGAZIONE_UI.md`.
- **Fluidità render (no nuove dipendenze, layout invariato)** — il rallentamento al
  "popolamento" era lato React, non DB (query figurine ~12ms, indici ok). Fix: cella griglia
  in `StickerCell` (`React.memo`) + callback stabili → al tap si ri-renderizza solo la cella
  toccata; lista filtrata e conteggi in `useMemo`; stesso pattern per i derivati di
  Home/Album/Match. Virtualizzazione **scartata** per ora (cambierebbe scroll/layout;
  `content-visibility` già salta il paint fuori schermo) — da valutare solo se l'apertura di
  album da 700+ resta lenta su device. Vedi `08_NAVIGAZIONE_UI.md`.
- **Azioni di massa sugli stati figurina** — sui chip Mie/Doppie/Mancanti la pressione lunga
  apre una conferma e imposta TUTTE le figurine dell'album a quello stato, sovrascrivendo le
  selezioni ("Mancanti" = reset album). "Tutte" senza azione; tap singolo = filtro. Endpoint
  additivo `POST /user/albums/:id/stickers/bulk` `{state}` (un solo UPDATE sulle sole righe che
  cambiano, dati propri, cache match invalidata). Modale in `BulkStateDialog`. Motivo: album
  passati già completati + necessità di un reset (l'azione è reversibile dall'utente). Scartata
  l'idea iniziale "completa solo le mancanti" perché non reversibile. Vedi `03_ALBUM_FIGURINE.md`.
- **Governance portabile** — aggiunto `AGENTS.md` versionato (le regole complete restano in
  `CLAUDE.md`, gestito su App Control e in `.gitignore`): serve a far rispettare la governance
  anche da agent diversi e in cloni/chat senza storico. Fonte canonica unica = `CLAUDE.md`;
  `AGENTS.md` ne porta gli essenziali vincolanti e vi rimanda. ⚠️ Il riferimento in CLAUDE.md a
  `DNA/06_DECISION_LOG.md` è errato (06 = Premium): il decision-log è questo file (`17`).
- **Scroll "app nativa"** — documento bloccato (`html/body/#root` height 100% + `overflow:hidden`),
  un solo contenitore scrollabile per pagina, tutte le altezze passate a `h-full` (eliminato
  `dvh` che causava micro-salti). `MobileLayout` allineato al pattern già funzionante di
  `AdminLayout` (tab-bar come elemento fisso della colonna, non più `position:fixed`). Motivo:
  eliminare il rimbalzo/rubber-band iOS senza toccare layout/logica. Vedi `08_NAVIGAZIONE_UI.md`.
- **CSP abilitata** — header via Helmet (script-src 'self', frame-ancestors 'none', connect-src
  limitato a self + Supabase). Lo splash inline è stato esternalizzato (`public/splash-gate.js`)
  per tenere script-src stretto. Vale solo in produzione (Express serve la SPA). Vedi audit in `16`.
- **Conferma scambio concluso** — ogni utente conferma dal proprio lato; aggiorna SOLO il proprio
  album (doppia→posseduta, mancante→posseduta), mai quello dell'altro (stesso modello di sicurezza
  dell'update manuale). Modello ibrido (auto + selezione parziale), insieme valido ricalcolato lato
  server. Tabella `trade_confirmations`. Vedi `04_MATCHING_SCAMBI.md`.
- **Monetizzazione = solo sblocco chat** — app 100% gratis; si paga SOLO per aprire la chat di un
  match (acquisto `single` o `all`, una tantum, niente abbonamenti). Interruttore master
  `chat_paywall_enabled` (default OFF). Demo a tempo **eliminata**. Provider senza P.IVA
  (PayPal/simili) da collegare alla fine. Vedi `06_PREMIUM_DEMO.md`.
- **Identità slegata dal CAP** — nickname unico globale, login nickname+PIN, CAP modificabile.
  Recupero via email = prossimo passo. Vedi `02_UTENTI_AUTENTICAZIONE.md`.
- **Copertine album rimosse** — nessun artwork di terzi (scelta legale/IP): solo dati testuali.
  Vedi `09_DATABASE.md`.
