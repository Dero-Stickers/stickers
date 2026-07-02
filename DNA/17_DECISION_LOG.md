# DNA — Decision Log

> Registro delle **decisioni tecniche rilevanti** (cosa è stato deciso e perché),
> non un changelog. Una riga per decisione, le più recenti in alto. Aggiungere qui
> ogni scelta architetturale/di prodotto non ricavabile rapidamente dal codice.
> Riferito dalla governance (`AGENTS.md`, `CLAUDE.md §3.5`).

## 2026-07

- **Sezione "Messaggi" dedicata (5ª voce navbar)** — le conversazioni escono dall'ambiguità con "Match":
  nuova pagina `pages/chat/Messages.tsx` (rotta `/messaggi`, lazy + prefetch) che elenca TUTTE le chat
  (non lette in cima, poi per recency), card minimali volute dall'owner: icona + nickname + scritta verde
  "Nuovi messaggi" (niente anteprima/contatore nella card). Il **badge rosso non-letti spostato da Match
  a Messaggi** in navbar (5 icone: Home, Album, Match, Messaggi, Profilo — verificato touch-friendly,
  ~72px/icona su iPhone SE ≥ minimo 44px), cap visualizzazione **99+**. Fix coerenza: (1) `ChatRoom`
  ora invalida `listChats` quando apre una chat con non-letti → segnale card + badge navbar si spengono
  subito senza reload (prima il backend marcava letto ma la cache lista restava stantia); (2) freccia
  indietro della chat = `history.back()` con fallback `/messaggi` (prima era fissa su `/match`, incoerente
  arrivando da Messaggi). Scartata l'alternativa "badge sulle card match": mescolava scoperta persone e
  conversazioni. Rollback point: `.rollback-messaggi/` (gitignored).
- **Ricerca mirata per singola figurina** — l'utente cerca UNA figurina e vede chi la offre come doppia.
  Backend: `GET /api/matches/by-sticker/:stickerId` (`matches.ts`), query leggera sull'indice esistente
  `(sticker_id, state)` — nessuna migrazione DB — LIMIT 500 SQL, top 100 per distanza CAP; cache dedicata
  `u:{id}:sticker:{stickerId}` (pulita da `invalidateUser`). Spec OpenAPI + client orval rigenerati
  (`useGetMatchesBySticker`). Frontend: 3ª tab "Cerca figurina" in `MatchList` (select album → figurina,
  pre-compilabile via query string `?tab=search&album=&sticker=`), card risultato estratta nel condiviso
  `components/match/MatchCard.tsx` (riusata da tutte le tab, niente markup duplicato). Ingressi: lente 🔍
  nel box "Migliori match" in Home (solo icona, sobria) e pulsante "Chi ha questo doppione?" nel dialog
  figurina di `AlbumDetail` (SOLO se stato `mancante`). `totalExchanges:1` fisso nel risultato = shape
  `MatchSummary` riusato; il dettaglio vero resta su `/matches/:userId`.
- **Comunicazione blocco/segnalazioni all'utente** — concetto unico "l'utente sa cosa succede, senza
  mai sapere chi lo ha segnalato". 3 pezzi non invasivi: (1) **bloccato** → modale dedicato con email
  supporto cliccabile `stickers@deroarts.com` (segnaposto, casella da creare). Scatta su TUTTI i canali:
  login PIN (`Login.tsx`, intercetta `error: ACCOUNT_BLOCKED`), Google ed Email — `social-auth.ts`
  propaga un `kind:"blocked"` (prima il codice si perdeva → login Google bloccato restava MUTO; bug
  trovato in revisione adversarial). (2) **chi segnala** → toast "L'admin sta esaminando il caso"
  (`ChatRoom.tsx`). (3) **segnalato** → banner generico di sistema in `MobileLayout` ("Alcune tue
  conversazioni sono sotto revisione"), chiudibile per sessione, guidato dal campo `UserProfile.underReview`
  (calcolato SOLO in `GET /api/auth/me`: esiste ≥1 report **pending** a suo carico). Scartate: rivelare il
  segnalante e bloccare la chat in automatico (ritorsioni + abuso). L'avviso NON è agganciato alla singola
  chat né al momento.
  **Archiviazione segnalazioni (admin):** nuovo `PATCH /api/admin/chats/:chatId/resolve-report`
  (`resolveChatReports`, solo admin) porta i report pending→**resolved** (storico conservato). Pulsante
  verde "Segna come gestita" nel dettaglio chat (`Messages.tsx`). Serviva perché prima nessun flusso
  cambiava lo status → il banner "sotto revisione" restava a vita su utenti innocenti (bug di design
  trovato in revisione). Ora sparisce quando l'admin archivia. Verificato E2E: pending→resolve→underReview
  passa true→false; endpoint nega non-admin (403) e anonimi (401).
- **Admin UI consolidata (componenti condivisi)** — creati 3 componenti riusabili per uniformare
  tutte le tabelle admin: `SortHeader` (una sola icona a 3 linee crescenti, senza testo, colorata
  quando attiva), `AdminFilterBar` (ricerca + chip di stato, sfondo bianco, gap minimo con la
  tabella via `-mt`) e `ConfirmDialog`/`useConfirm` (modale coerente Radix AlertDialog che sostituisce
  TUTTI i `window.confirm` nativi). Applicati a Utenti, Album, Messaggi, Segnalazioni, Monetizzazione.
  Regole: ricerca + filtro stato + ordinamento si combinano (AND); ogni pulsante rosso/distruttivo
  chiede conferma; nessun popup nativo del browser. Motivo: coerenza visiva e sicurezza uniforme.
- **Stato accesso chat a 3 livelli in Gestione Utenti** — filtro utenti allineato ai badge reali:
  Free (nessuno sblocco), Alcune chat (`chat_unlocks` singoli), Tutte le chat (premium/sblocco totale),
  più Bloccati. Classificazione unica via `classifyAccess` (none/some/full), stessa fonte dei badge.
- **Chat admin — Elimina + Riapri** — `deleteChat` (DELETE, rimuove prima le segnalazioni poi la chat)
  e `reopenChat` (PATCH `/reopen`, status→active). "Chiudi" ora è realmente reversibile (Riapri) e
  chiede conferma con nota sulla sua funzione. Segnalazioni: `deleteErrors` (DELETE bulk, singola o
  selezione multipla). Vedi `07_ADMIN_PANNELLO.md`.
- **HARD TEST 3.000 utenti — 2 bug di scaling admin trovati e risolti** — popolata l'app come
  "pubblicata da tempo" (3.000 utenti su 50 città, ~116k figurine, media 34.9 doppie+mancanti/utente,
  400 chat, 2009 messaggi, 34 segnalazioni) via `lib/db/src/seed-hardtest.ts` (additivo, marchio
  `STICK-TST-`, non tocca il catalogo). Peso DB: **33 MB / 500 MB** (6.6%, ampio margine). I test di
  performance hanno scoperto 2 endpoint admin che collassavano sotto carico:
  (1) **`GET /api/admin/users`** — N+1 (una query album per ogni utente) → con 3.000 utenti **500 dopo
  10s** (pool saturo). Fix: conteggio album in UNA query `GROUP BY` → **445 ms**.
  (2) **`GET /api/admin/stats`** — scaricava intere tabelle in RAM per contarle (`select().from(messages)`
  ecc.) → lento e sprecone. Fix: unica query con `COUNT(*)` → **491 ms → 44 ms**.
  Gli endpoint match (cache 60s) e `listChats` (già ottimizzato) erano OK. La cattura errori funziona
  (2 crash residui vecchi in `error_reports`, non del test). Pulizia post-test: `DELETE ... STICK-TST-%`.
- **Sezione Messaggi admin — moderazione completa + scaling** — preparata per 2.000-3.000 utenti.
  (1) `listChats` riscritto da N+1 (1 + 4·N query) a **poche query aggregate** (nickname via
  `id = ANY`, conteggi messaggi GROUP BY, ultima segnalazione DISTINCT ON) → regge migliaia di chat;
  aggiunti `user1Id`/`user2Id` al payload. (2) Nuovo `DELETE /api/admin/chats/:chatId` (solo admin):
  toglie prima le `reports` collegate (FK NO ACTION) poi la chat → messaggi/conferme spariscono per
  CASCADE. (3) Dialog Messaggi: pulsanti **Elimina chat** + **Blocca** (per ciascun partecipante,
  riusa `PATCH /users/:id/block`), con conferma. Frontend usa `fetch`+`authHeaders` (no rigenerazione
  OpenAPI). Verificato live (lista campi ok, delete a cascata ok). Vedi `08_NAVIGAZIONE_UI.md`.
- **⛔ Pulsante switch U/A (DevQuickSwitch) — INTOCCABILE per regola dell'owner** — il pulsante
  tondo "U/A" (in `components/dev/DevQuickSwitch.tsx`) **bypassa l'autenticazione** (login automatico
  con account demo Dero975/admin, switch istantaneo vista Utente↔Admin) ed è una scelta INTENZIONALE,
  sempre attiva anche in produzione. NON va rimosso, gated o modificato, né vanno cancellati gli
  account demo, **senza ordine esplicito** dell'owner — "consolida/ripulisci/azzera" NON autorizzano.
  L'azzeramento app di giu 2026 aveva cancellato gli account demo rompendo il pulsante → **ripristinati**
  (`Dero975` pin 1234, `admin` pin 0000). Protezione resa permanente: guardia nel codice + memoria
  `sticker-pulsante-ua-non-toccare`. Errore ricorrente da non ripetere.
- **App azzerata a stato vergine (pre-pubblicazione)** — eliminati TUTTI gli utenti (60, admin
  e Dero975 inclusi), chat, messaggi, sblocchi, pagamenti, conferme scambio, segnalazioni e
  possessi (`user_albums`/`user_stickers`); resta INTATTO il catalogo (`albums` 23 + `stickers`
  17.581) e `app_settings`. Anche `auth.users` Supabase = 0. Backup completo pre-operazione in
  `BACKUP/db_pre_reset_*.sql.gz`. Motivo: l'app va pubblicata "come nuova". Eseguito in singola
  transazione, ordine FK-safe (prima `reports`/`admin_actions` NO ACTION, poi cascata).
- **Registrazione nickname+PIN RITIRATA** — i nuovi account si creano SOLO con Google o Email
  (Supabase Auth). Rimossi dal frontend (`Login.tsx`): form di registrazione PIN, campi domanda/
  risposta di sicurezza, schermata "salva il codice STICK". Rimossi dal backend (`routes/auth.ts`):
  handler `register`, rotta `POST /api/auth/register`, `generateRecoveryCode`, import inutili. Il
  form nickname+PIN resta SOLO come accesso (account storici/admin); login + `/recover` legacy intatti.
  Schema generato `RegisterBody` (api-zod/api-client) lasciato com'è (codice generato, mai chiamato).
- **Privacy/Termini aggiornati per Google/Email** — testi in `app_settings` (DB, unica fonte): la
  privacy ora dichiara la raccolta dell'**email** (Google/Email), elenca **Google (OAuth)** e
  **Brevo** tra i fornitori, e cifratura di password/PIN; rimossa la frase falsa "Non raccogliamo
  email". Termini: account creato con Google/Email, nickname non modificabile, account PIN storici
  ancora validi. Modifica via UPDATE su `privacy_policy`/`terms`, niente testo legale hardcoded.
- **Accesso con Email/password (Brevo SMTP), no costi** — aggiunto "Continua con Email"
  (registrazione+accesso+reset password) via Supabase Auth + Brevo (gratis 300/giorno). UI
  `EmailAuth.tsx` (conferma password + occhio + avviso spam), template email brandizzati. Mittente
  verificato su Brevo = `dero975@gmail.com`. **Nodo aperto:** mail consegnate ma in SPAM perché
  inviate da dominio gratuito → per la prod serve un dominio proprio con DKIM/DMARC. Vedi `18_PIANO_AUTH.md`.
- **Accesso moderno con Google (Supabase Auth), no costi** — adottato "Continua con Google" via
  Supabase Auth (già nel progetto), mantenendo nickname+PIN legacy. Ponte identità: il frontend
  ottiene l'access token Supabase → backend lo verifica presso Supabase (`lib/supabase-auth.ts`) →
  crea/collega l'utente nel nostro DB e rilascia il NOSTRO token HMAC (resto app invariato). Nuovo
  utente social sceglie nickname (permanente) + CAP, niente PIN/domanda/codice STICK. Migrazione
  additiva 0006 (email/auth_provider/supabase_user_id; PIN/domanda/recovery_code → nullable, indici
  unici parziali). Free tier ampio (50k MAU; Google login non manda email → illimitato). Email/
  password + reset = quando ci sarà SMTP gratuito (Brevo). Vedi `18_PIANO_AUTH.md`.
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
