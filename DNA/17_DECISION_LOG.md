# DNA — Decision Log

> Registro delle **decisioni tecniche rilevanti** (cosa è stato deciso e perché),
> non un changelog. Una riga per decisione, le più recenti in alto. Aggiungere qui
> ogni scelta architetturale/di prodotto non ricavabile rapidamente dal codice.
> Riferito dalla governance (`AGENTS.md`, `CLAUDE.md §3.5`).

## 2026-07

- **Admin: monitor risorse free tier (Supabase) [10 lug]** — box compatto orizzontale in alto a destra
  della pagina "Errori ricevuti" (solo vista `auto`): mostra % riempimento **DB** (limite Supabase Free
  500 MB → sola lettura oltre), crescita **utenti** (soglia pratica ~6.500, DNA/16) e **latenza DB**, con
  semaforo verde=ok / giallo=monitorare / rosso=risolvere. Soglie: DB/utenti 70%/85%; latenza 500/1500 ms
  (ampie, perché in locale include il viaggio Mac→Supabase). Backend `GET /api/admin/resources`
  (`getResources`, hook `useGetResources`): `pg_database_size` + `COUNT` — **sola lettura**, cache in memoria
  5 min, solo admin. Legge il DB reale → funziona identico in produzione (dal pannello admin online, anche
  da telefono). Limite noto: egress/chiamate API non leggibili via SQL (solo dashboard Supabase). Vale
  [[sticker-serie-fix-non-corrompere]].
- **Modale condividi: rimosso Facebook (policy) [10 lug]** — Facebook via `sharer.php` NON pre-compila il
  testo: la **Platform Policy 2.3** di Meta vieta di pre-popolare messaggi con contenuto non scritto
  dall'utente (verificato su fonti ufficiali developers.facebook.com, non dedotto). Apriva solo il link,
  senza il messaggio d'invito → esperienza incoerente. Rimosso; tenuti **WhatsApp e Telegram** (che
  pre-compilano davvero testo+link), resi **più grandi e touch-friendly** (2 colonne). Il "Copia link"
  resta per qualsiasi altro canale.
- **Admin utenti: nomi album, area da CAP completa, export scambi-album [10 lug]** — (1) Il **report
  utente** (modale) ora elenca i **nomi degli album** in collezione (backend `array_agg` dei titoli per
  utente, campo `albumTitles` in `AdminUser`); rimossi da lì Scambi/Donazioni/Invito. (2) **Area da CAP
  completa**: `deriveArea` copre ora TUTTI i CAP italiani via `lib/cap-provinces.ts` (provincia dal prefisso
  2 cifre + eccezioni a 3), niente più "Area 87XXX". Solo etichetta — il match per vicinanza usa il CAP
  numerico (invariato). Corretta in DB l'area di un utente esistente (87100 → Cosenza): update mirato di sola
  etichetta, CAP e collezione intatti. (3) **"Copia info scambi-album"**: pulsante nella barra filtri che
  copia i dati utenti (scambi + collezione: album/titoli, possedute/doppie, gestione, zona) in **testo
  schematico** ottimizzato per analisi AI (rispetta ricerca/filtro attivi, sola lettura).
- **Admin utenti: quadro gestione album + invito "condividi l'app" [9 lug]** — (1) **Report utente**:
  nella Gestione Utenti la colonna Album mostra solo il numero, colorato (verde = collezione gestita, rosso =
  album aggiunti ma tutte figurine mancanti, neutro = nessun album); cliccando si apre un modale con il quadro
  compatto (album, `N mie · M doppie` o "non gestito", scambi, donazioni, invito, CAP/area, iscrizione).
  Backend: query aggregata su `user_stickers` (owned/duplicates per utente) → `ownedCount`/`duplicatesCount`
  in `AdminUser`. Colonna "Dettagli" rimossa (l'importo Donazioni è ora cliccabile). (2) **Invito "condividi
  l'app"** (ripetibile, a discrezione admin): nuovo tipo di nudge accanto a "dona". **Migrazione 0014**
  additiva su `donation_nudges` (colonna `type` default `'dona'`, unique `(user_id,type)`) — APPLICATA in
  produzione, non distruttiva, 0 record esistenti. L'admin invia da Utenti (bottoni Dona/Condividi);
  l'utente vede il modale una volta (logo + messaggio + link + "Copia link" giallo + WhatsApp/Telegram/
  Facebook con icone/colori ufficiali, `encodeURIComponent`, `_blank`+`noopener`). Cliccare un social NON
  chiude il modale (più condivisioni); ripetibile = rinviando si riarma (`seen_at` azzerato). `type` validato
  con allowlist lato server. Push notification valutate e **scartate** (fuori scope: richiederebbero VAPID +
  permesso utente + on/off obbligatorio). (3) **UI Utenti**: colonna "Invito" divisa in **due colonne**
  ("Invito dona" / "Invito condividi"), bottone invio solo icona. (4) **Broadcast** `POST /admin/nudge-all`
  (`useNudgeAll`): due pulsanti "Invita tutti a donare/condividere" nella barra filtri (con conferma) →
  upsert massivo atomico che (ri)arma l'invito a tutti i non-admin **non bloccati**; solo admin, idempotente,
  ritorna `count`. (5) **Comportamento modale** (`NudgeGate`): appare all'avvio **e al ritorno in primo piano**
  (`refetchOnWindowFocus` + `visibilitychange`, per PWA installata), con guardia anti-loop per chiave
  (tipo+data). Una volta aperto **resta visibile finché l'utente non lo chiude a mano** (visibilità legata allo
  stato locale `open` + snapshot `openType`, NON a `data.nudge`): così cliccando un social — che consuma
  l'invito — e tornando nell'app il modale non sparisce, si può condividere su più canali. Vale
  [[sticker-kofi-account-dedicato]].
- **Admin errori: meno rumore + fix conteggi box + service worker gestito [9 lug]** — chiusura sessione,
  3 fix. (1) **Filtro rumore esteso** (`error-capture.ts`): la sezione "Errori ricevuti" riceveva
  eventi non-azionabili — fetch annullate dal browser (`Fetch/signal is aborted` su navigazione/refetch),
  tracker iniettati da estensioni utente (`connect.facebook.net`), promise vuote (`Rejected`). Aggiunti ai
  `NOISE_SUBSTRINGS`; il vincolo è che i **veri guasti server continuino ad arrivare** (un `HTTP 5xx` sulla
  stessa rotta passa: coperto da test). (2) **Service Worker gestito** (`main.tsx` + `vite.config.ts`
  `injectRegister:null`): la registrazione PWA era iniettata da vite-plugin-pwa **senza catch** → se falliva
  (incognito, in-app browser iOS, uscita anticipata da /login) usciva un `unhandledrejection` catturato come
  crash generico "Rejected". Ora registrata a mano con l'API nativa `navigator.serviceWorker.register('sw.js')`
  + `.catch()` che assorbe il fallimento (innocuo: l'app resta usabile senza offline). Nessuna dipendenza
  aggiunta. (3) **Fix conteggi box admin** (`routes/errors.ts`): i box Totali/Nuove/7gg erano calcolati con una
  query che **ignorava il filtro `group`** → "Segnalazioni & proposte" mostrava "Nuove: 1" pur senza alcuna
  segnalazione utente (contava errori di sistema). Ora i counts rispettano il gruppo come la lista; "Totali" è
  il conteggio reale (non `rows.length` troncato a `limit`). Verificato e2e (manual/auto/all → conteggi
  corretti). Tabella `error_reports` svuotata dei 5 record di rumore già analizzati (backup JSON locale prima
  del DELETE). Nessuna modifica a schema/DB. Vale [[sticker-serie-fix-non-corrompere]].
- **Album: fix visualizzazione figurine + rifiniture UX [9 lug]** — (1) **Griglia ripristinata**: i
  blocchi per-nazione si attivano ora solo se i codici alfabetici sono la MAGGIORANZA (prima bastava
  1 codice > 3 char); così i Calciatori e World Cup 2006 (numerici) tornano griglia unica invece di
  "una figurina per riga". (2) **Guardia "album non in collezione"** in `AlbumDetail`: aprendo per URL
  un album non aggiunto non si mostra più il falso "0 figurine + Rimuovi", ma "Aggiungi alla
  collezione" (il seeding lato server è atomico e integro — verificato su tutti i 35 album). (3) **No
  falso vuoto post-aggiunta**: album posseduto con 0 figurine durante il refetch → skeleton, non
  "Nessuna figurina". (4) **Toast** in alto e durata 1s (prima centrati, 3s). (5) **Nazioni** dei
  blocchi tradotte in italiano a display (`lib/nations.ts`), dati DB invariati. Nessuna modifica a
  DB/schema. Vale [[import-panini-collections]].
- **Sicurezza: migrazione 0012 (revoke grant anon/authenticated) APPLICATA in produzione [9 lug]** — un
  audit pre-pubblicazione ha rilevato che la 0012 (difesa in profondità, revoca i grant inutili ai ruoli
  client Supabase) era **scritta ma mai applicata**: 210 grant residui su `public` per anon/authenticated.
  La RLS era già attiva su tutte le 15 tabelle (verificato a runtime: anon bloccato in lettura e scrittura,
  `pin_plain` non esposto), quindi i grant erano già neutralizzati dal primo lucchetto — ma mancava il secondo
  strato indipendente voluto dall'owner. Prima di applicare: verificato che la 0012 tocca **solo** schema
  `public` (non `auth.*`/`realtime.*`/`storage.*`, usati da login Google e chat) e che il frontend NON legge
  tabelle public via `supabase.from()` (usa solo auth + realtime broadcast) → applicazione sicura, nessuna
  rottura. Backup dei 210 grant come SQL di ripristino in `BACKUP/grants_pre_0012_restore.sql` (reversibile).
  Post-applicazione: 0 grant residui, `default privileges` impostati per oggetti futuri, backend (ruolo
  `postgres`) invariato, e verifica e2e in produzione OK (login, /api/albums, healthz/db). Ora la protezione
  è a **due lucchetti indipendenti** (RLS + assenza grant). Vale [[sticker-pin-plain-visibile-admin]].
- **Fix: crash React #310 aprendo un album [9 lug]** — il pulsante "Condividi lista" aveva introdotto
  `useState`/`useMemo` **dopo** l'early-return `if (isLoading)` in `AlbumDetail.tsx`, violando le regole degli
  hooks (numero di hook variabile fra render → "Rendered more hooks than during the previous render"). Fix:
  spostati entrambi gli hook **prima** dell'early-return; il titolo album è calcolato inline dentro il `useMemo`
  (`albumInfo?.title ?? \`Album #${albumId}\``) per non dipendere da variabili definite più in basso. Regola
  operativa: ogni nuovo hook va sempre in cima al componente, mai dopo un `return` condizionale. Il bug era già
  in produzione (Condividi lista pushato prima), quindi il push di correzione è prioritario.
- **Pre-pubblicazione: U/A nascosto, distribuzione via link, rifiniture UX [8 lug]** — decisioni della
  sessione: (1) **pulsante U/A NASCOSTO** per la pubblicazione, modo reversibile (`const ENABLED=false` →
  `return null` in `DevQuickSwitch.tsx`; componente/render/account demo intatti; deroga tracciata alla regola
  [[sticker-pulsante-ua-non-toccare]]). (2) **Distribuzione SOLO via link** (PWA installabile, non store):
  nessuna dipendenza nativa da rimuovere; aggiunti guida "Installa l'app" nel Profilo (`InstallAppDialog`,
  rileva iOS/Android/desktop) + banner chiudibile in Home (`InstallBanner`, con install nativo via
  `beforeinstallprompt`). (3) **Album ordinati per anno globale** (decrescente, indipendente dalla categoria;
  l'anno è nel titolo, `createdAt` inutile perché import in blocco). (4) **PIN Dero975 1234→1404** (DB
  hash+pin_plain + DevQuickSwitch). (5) Login admin differenziato (badge "AREA ADMIN", card gialla, occhio
  PIN), gestione credenziali admin più pulita, PIN nuovo a 6 cifre, demo con nomi reali + badge "Utente test".
- **Admin: PIN visibile in chiaro nel pannello (scelta owner, deroga sicurezza) [8 lug]** — l'owner ha
  chiesto di poter RIVEDERE il PIN admin (non solo i pallini). Il PIN cifrato (pinHash) non è reversibile,
  quindi si è aggiunta una colonna **`pin_plain`** (migrazione additiva `0013_user_pin_plain.sql`,
  `ADD COLUMN IF NOT EXISTS`) che conserva il PIN in chiaro **solo per la visualizzazione**. Il login continua
  a verificare via `pinHash` (invariato). `changeCredentials` popola sia `pinHash` sia `pinPlain`. Nuovo
  endpoint **`GET /api/auth/me/pin`** protetto `requireAuth + requireAdmin` (utente normale → 403, no token →
  401): ritorna il PIN in chiaro dell'admin loggato. Frontend: nella card Account admin l'occhio a riposo
  rivela il PIN via quell'endpoint. `pin_plain` non passa mai dal client via PostGREST (tabella in RLS
  deny-all, cfr. 0012): lo legge solo il backend. **Deroga esplicita** allo standard "solo-hash": accettabile
  per app a singolo admin, ma se il DB è esposto i PIN sono in chiaro. pin_plain popolato a mano per gli
  account esistenti (dero=140478, Dero975=1234, verificati contro l'hash). Verificato e2e (admin vede, utente
  403, cambio PIN aggiorna pin_plain). Vale la regola [[sticker-pulsante-ua-non-toccare]] (Dero975 a 4 cifre
  resta valido: il vincolo 6-cifre è solo su newPin, non sulla verifica).
- **PWA: doppia icona Home User/Admin — manifest switching per-route lato server [8 lug]** — installando
  l'area Admin compariva l'icona User e si apriva l'area User. Tecnica: *path-based PWA manifest switching*.
  L'`index.html` sorgente resta quello User (**area User invariata, HTML byte-identico**); nel fallback SPA
  di `api-server/src/app.ts`, sulle rotte `/admin*` il server serve lo **stesso HTML** con `manifest` +
  `apple-touch-icon` + `apple-mobile-web-app-title` riscritti verso gli asset Admin. Scelta **lato server**
  perché iOS/Safari legge icona+manifest dall'HTML servito ad "Aggiungi a Home", non da JS client → qualsiasi
  soluzione client-side fallisce su iPhone. `manifest-admin.webmanifest` con `id`/`start_url` = `/admin` rende
  l'Admin un'app installabile distinta (iOS, Android, desktop). Icone Admin (apple-touch/192/512/maskable)
  generate dalla grafica fornita, ottimizzate pngquant, graficamente distinte (User = fondo azzurro pieno,
  Admin = fondo bianco). Match esatto `/admin` o `/admin/*` (l'edge case `/administrator-*` resta User).
  Fail-safe: se un tag non matcha resta l'HTML originale (mai HTML corrotto). Cache asset `max-age=0` già
  in essere → la nuova icona si propaga senza svuotare cache. Verificato e2e in locale, typecheck + 14 test verdi.
- **Fix: figurine aggiunte dall'admin propagate agli iscritti [6 lug]** — `batchInsertStickers`
  (`api-server/routes/albums.ts`) creava solo le righe `stickers`, non le `user_stickers` per chi aveva
  GIÀ l'album: le figurine aggiunte dopo l'iscrizione restavano invisibili e non marcabili (PATCH → 404) e
  la % di completamento si sfasava (`total` cresce, `owned` no). Ora l'inserimento è in **transazione**
  (stickers + ricalcolo `total` + propagazione): per ogni iscritto crea le `user_stickers` mancanti
  (`onConflictDoNothing`, insert a blocchi di 1000). Preserva l'invariante "una riga per figurina" →
  letture/PATCH/bulk invariati. Verificato e2e (iscritto 2→5 righe, PATCH 200). Emerso dall'**analisi
  completa di sessione** (altri reperti — RLS non nelle migrazioni, gate `is_published` su detail/add,
  debito di coerenza — lasciati come debito: non correttezza dati).
- **UX: raggio ricerca persistente + rifiniture responsive mobile [6 lug]** — (1) lo slider "Raggio di
  ricerca" (Match) persiste per **dispositivo** in `localStorage` (`stickers-app/lib/match-prefs.ts`, clamp
  1-150, default 10), reset SOLO al logout (`AuthContext.logout`). (2) Pass responsive **solo-presentazione**:
  meta `interactive-widget=resizes-content` (tastiera chat), `DialogContent` `max-h-[90dvh]`+scroll+margini/
  angoli mobile, barra bulk Errori `flex-wrap` ("Genera report" non più tagliato), `break-words` bolle chat,
  target tocco `h-8 sm:h-7`, stats Errori `grid-cols-2 md:grid-cols-3`, not-found i18n+tema. **Desktop
  invariato** (classi `sm:`/`md:` preservate). Verificato a runtime 320/360/desktop.
- **Difesa in profondità sui grant DB [6 lug]** — audit privacy/sicurezza (sola lettura) confermato
  BASSO rischio: RLS attiva su tutte le 15 tabelle, zero policy = deny-all, lettura anonima reale = 0 righe
  (`users` mostra `*/0` all'anon mentre nel DB ce ne sono; verifica via PostgREST + catalogo Postgres),
  service role assente dal frontend/bundle, nessun segreto in git, nessuna RPC/vista/bucket esposti.
  Unico gap teorico: i ruoli `anon`/`authenticated` avevano ancora i GRANT pieni sulle tabelle (neutralizzati
  dalla RLS, ma difesa a strato singolo). Migrazione **additiva** `0012_revoke_anon_grants.sql`: `REVOKE ALL`
  su tabelle/sequenze/funzioni esistenti + `ALTER DEFAULT PRIVILEGES` per gli oggetti futuri. Non tocca RLS,
  dati, né il ruolo `postgres` (backend guardiano invariato). Validata in dry-run (BEGIN…ROLLBACK: grant
  residui 0, DB invariato). **Da applicare in sessione dedicata con conferma** (non ancora in produzione).
- **Dominio, hardening sicurezza, icone [6 lug]** — (1) **`stickers.deroarts.com` LIVE**: collegato a Render
  (CNAME Solo DNS), CORS + Supabase redirect aggiunti in CONVIVENZA con onrender (vedi `19`). (2) **Hardening
  a costo zero** dopo audit: freno anti-flood globale su `/api` (240 req/min per IP, `middlewares/rateLimitGlobal.ts`,
  riusa `checkRateLimit`) + validazione formato PIN (4-6 cifre) in ingresso al login. (3) **Bundle client offuscato**
  (terser: mangle toplevel, drop console/debugger, niente sourcemap) — il JS servito al browser è illeggibile.
  (4) **Icone PWA** rifatte da nuova sorgente brand (mobile/desktop/maskable/favicon). PIN: admin `dero`/140478
  (6 cifre), utente `Dero975`/1404 (4 cifre). Repo GitHub privato: sorgente non accessibile.
- **Credenziali admin gestibili da UI + PIN 6 cifre [5 lug]** — l'admin ora si chiama `dero` con PIN
  a 6 cifre (era `admin`/`0000`). Aggiunto backend `hashPin()` + `PATCH /auth/me/credentials` (cambia
  nickname/PIN confermando col PIN attuale; unicità nickname; ritorna user+token) e un blocco "Account
  admin" in cima a Impostazioni → Configurazione generale (`AdminAccountFields`). `DevQuickSwitch` (pulsante
  U/A) allineato alle nuove credenziali. Testato e2e (403 su PIN errato) e login in produzione.
- **Email `stickers@deroarts.com` attiva e allineata ovunque [5 lug]** — alias Zoho creato (nome
  "Stickers") + filtro/tag; allineati DB `support_email` e i 3 fallback codice. Vedi `19`.
- **Icone PWA con safe zone [5 lug]** — rigenerate (mobile/desktop/maskable) su sfondo blu uniforme,
  contenuto rientrato: non più tagliate dal ritaglio tondo/squircle degli store.
- **Invito a donare una-tantum (admin → utente), 100% interno [5 lug]** — nuova funzione: l'admin
  dalla pagina Utenti (colonna "Invito") invia a un utente attivo un gentile invito a donare; l'utente
  lo vede UNA volta al prossimo accesso (modale `<NudgeGate>`), poi è consumato (`seen_at`). Tabella
  `donation_nudges` (mig. `0011`, additiva, RLS ON, `user_id` UNIQUE); backend `POST /admin/users/:id/nudge`
  + `GET/POST /me/nudge*` (dietro gate auth+anti-blocco → i bloccati non ricevono). **Anti-spam**: invio
  manuale (no massa), storico Inviato/Visto+data in colonna, **conferma sempre** sul pulsante. Testo =
  complimento, mai colpevolizzazione (scelta owner per conformità store). Nessuna piattaforma esterna per
  far arrivare l'invito (Ko-fi solo se l'utente sceglie di donare). Dettagli in `06` e `09`.
- **Admin: barra filtri consolidata + reset [5 lug]** — `AdminFilterBar` unica per Utenti/Album/Messaggi/
  Donazioni/Errori: placeholder **"Cerca..."** ovunque + pulsante **refresh = reset** (tondo, posizione
  fissa dopo la ricerca) che riporta la tabella allo stato originale (ricarica + azzera ricerca, filtri e
  ordinamento). In Utenti: colonne separate Donazioni (importo) / Dettagli (pulsante "Vedi" → modale),
  rimossa icona libro da Album e cuore da Donazioni.
- **Donazioni: rifiniture UX post-test dal vivo [5 lug]** — testato in produzione col tip-test
  Ko-fi (dato finto in USD, normale). Aggiunti: pagina admin Donazioni con **pulsante Aggiorna**
  (refetch senza cambiare pagina) + `refetchOnMount:always`; **modale dettaglio** donazione (messaggio
  intero) + ordinamento Data/Importo (SortHeader); sottotitolo Donazioni = **link a Ko-fi "donazioni
  ricevute"**; tabella con celle centrate e solo-tabella-scrolla. Pulsante donazione: testo IT
  **"Sostieni Stickers"** (no "Ko-fi" nel testo utente) e al clic apre un **modale nickname+Copia**
  (l'utente incolla il nick nel messaggio Ko-fi → l'admin riconosce chi dona; Ko-fi non passa il nick
  in automatico). Modale con `rounded-3xl` come gli altri.
- **DB consolidato: monetizzazione rimossa anche dal DB reale [5 lug]** — applicato
  `0005_drop_monetization.sql` (era "da applicare a mano"): DROP `payments` + `chat_unlocks`
  (vuote) + DELETE 4 chiavi paywall in `app_settings`. Attivata **RLS su `donations`**
  (era OFF → allineata alla regola "RLS su ogni tabella con dati utente"; pattern progetto =
  RLS ON senza policy, accesso solo backend via service role). `users.is_premium` resta INERTE.
  Ora codice e DB sono allineati: 14 tabelle, `app_settings` con sole 5 chiavi (app_name,
  cookie_policy, privacy_policy, support_email, terms). Ko-fi webhook attivo e testato ONLINE.
  Vedi `09_DATABASE.md`.
- **Ko-fi LIVE in produzione + testo pulsante "Support Stickers" [5 lug]** — deploy Render andato
  (commit feat donazioni), webhook testato online (token errato 401, valido 200), token vero
  allineato in `.env` + Render + App Control. Testo pulsante donazione cambiato in "Support
  Stickers" (fonte unica `KofiButton`). Scheda dominio `19_DOMINIO_DEROARTS.md` integrata e pulita
  (URL Render reali, Ko-fi, email definitiva `stickers@deroarts.com`).
- **Donazioni Ko-fi COLLEGATE (webhook → DB → admin) [5 lug]** — chiusa la
  funzione donazioni end-to-end, sola lettura. Nuova tabella `donations` (schema
  Drizzle + migrazione additiva `0010`, applicata al DB). Webhook PUBBLICO
  `POST /api/kofi/webhook` (`routes/kofi.ts`) che verifica `KOFI_VERIFICATION_TOKEN`
  (segreto, in `.env` + App Control) ed è **idempotente** (`kofi_message_id`
  UNIQUE + onConflictDoNothing → i retry di Ko-fi non duplicano). Lettura
  `GET /api/admin/donations` (riepilogo + elenco) → pagina `admin/Donations.tsx`
  ora legge dati veri via hook generato `useGetAdminDonations`. Testato end-to-end
  (token valido salva, errato 401, idempotenza ok, admin legge riepilogo).
  Manca solo la config lato Ko-fi (URL webhook + token) = passo owner. Vedi
  `06_PREMIUM_DEMO.md`.
- **Età minima 14 → 16 anni [5 lug]** — soglia alzata a 16 per scelta del titolare (chat + incontri
  di persona tra privati), più cautelativa del minimo di legge italiano (14, art. 8 GDPR + art.
  2-quinquies d.lgs. 196/2003). Toccato: checkbox registrazione (`Login.tsx`, unica occorrenza UI;
  nessuna validazione backend sull'età — è autodichiarazione), testi legali nel DB (`app_settings`:
  Termini "Età minima" + Privacy "Minori", quest'ultima riformulata perché 16 NON è obbligo di legge ma
  scelta più protettiva del minimo di 14). Nessuna costante condivisa: la soglia non è hardcoded in più
  punti. Vedi `10_PRIVACY_LEGALE.md`.
- **Legali · clausole donazioni Ko-fi nel DB [5 lug]** — in `app_settings` aggiunte a mano (metodo
  chirurgico + backup + verifica integrità) le clausole sul contributo volontario Ko-fi: Termini
  ("Contributi volontari" — liberalità, non dà accesso a funzioni a pagamento) e Privacy (l'app non
  tratta dati di pagamento, gestiti da Ko-fi/PayPal). Chiude la nota "da aggiungere a mano" del 5 lug.
- **Profilo · box donazione ridisegnato [5 lug]** — box bianco dedicato (era azzurrino attaccato al
  bottone Elimina): pulsante Ko-fi SOPRA, info in piccolo (`text-xs` regular, attenuato) SOTTO. Solo
  estetica/layout, nessuna logica toccata. Pagina Profilo più omogenea (card bianche coerenti).
- **Donazione Ko-fi integrata [5 lug]** — pulsante donazione `KofiButton` (componente riusabile,
  link esterno verde `#3dbd45` a `https://ko-fi.com/deroarts`, NON lo script kofiwidget2). Appare nel
  **Profilo** (box sopra la firma DeroArts) e nel **modale finale della guida** (rimosso il vecchio
  bottone PayPal). Testo con frase obbligatoria "Non sblocca nulla: è solo un grazie" (liberalità, non
  corrispettivo). Nessun impatto su RLS/permessi/dati di pagamento (gestiti da Ko-fi/PayPal). Legali
  (nel DB, app_settings): clausole sul contributo volontario aggiunte il 5 lug (vedi entry sopra).
  Vedi `06_PREMIUM_DEMO.md`.
- **Guida · modalità globale da admin [5 lug]** — la guida non parte più "sempre a ogni refresh"
  hardcoded: la MODALITÀ è ora un setting globale `guide_mode` in `app_settings`, gestito da
  **Admin → Impostazioni** con 3 opzioni indipendenti: `off` (default, disattivata) · `first` (solo
  alla prima autenticazione, usa `hasSeenGuide`) · `always` (a ogni refresh). `GuideAutoStart` lo
  legge via `useGetAppSettings` (endpoint `/settings` pubblico). Owner ha scelto `off` per ora. Vedi
  `18_GUIDA_INTERATTIVA.md`.
- **Monetizzazione RIMOSSA — app 100% gratuita [5 lug]** — eliminato TUTTO il paywall "si paga per
  sbloccare la chat", come se non fosse mai esistito. Backend: via `lib/billing.ts`, `routes/billing.ts`,
  gli handler admin paywall/premium, il gate 403 in `chats.ts` (chat sempre apribile), i flag
  chatUnlocked/isPremium/paywallEnabled/hasAllChats dai payload. Spec `openapi.yaml`: rimossi endpoint
  billing/paywall/premium + schemi → tipi/hook rigenerati (api-client-react, api-zod). Frontend: via il
  modale "Sblocca chat" in MatchDetail (apre sempre), pulizia AuthContext/Dashboard/Users; **pagina admin
  "Monetizzazione" convertita in "Donazioni"** (`/admin/donazioni`, predisposta Ko-fi, sola lettura). DB:
  rimossi schemi Drizzle `payments`/`chat_unlocks`; colonna `users.is_premium` lasciata INERTE (scelta
  owner: no drop distruttivo); migrazione `0005_drop_monetization.sql` (drop tabelle vuote + delete chiavi
  settings) DA APPLICARE A MANO con conferma. L'unico introito futuro = **donazione Ko-fi** (liberalità,
  non sblocca nulla). typecheck+build OK, chat-gratis verificata nei test. Vedi `06_PREMIUM_DEMO.md`.
- **Guida · rifiniture testi/effetti + Home [5 lug]** — comparsa del primo fumetto = **fade-in semplice
  ritardato** (~0,7s dopo il fumetto vuoto, prima titolo poi testo); rimossi gli effetti "polvere magica"/
  blur/glow perché tremolanti. Aggiunto step **"Raggio di ricerca"** (illumina la barra `guide-match-radius`)
  tra "Vicini a te" e "Migliori match", e tolto il refuso "vicini a te" ripetuto tra titolo e testo. Step
  "Cerca figurina": lente spostata dal titolo al testo + rimando alla stessa ricerca in Home. Modale finale:
  titolo **"Welcome in Stickers!"**, box supporto ("Stickers è appena nata! …"), bottone **"Supporta con"
  PayPal** (ancora non collegato), bottone **"Inizia! Trova il tuo primo Match"** che chiude la guida e apre
  la **Home** (`setLocation("/")`). **Home**: box "La tua collezione" ora **sempre visibile** — a 0 album mostra
  i contatori a 0/0% con l'invito "Nessun album presente — clicca qui per aggiungerne uno" (link a /album);
  unificati i due rami (niente più riquadro minimale separato) per un layout stabile. Vedi `18_GUIDA_INTERATTIVA.md`.
- **Guida · copertura completa Album→Match→Chat + modale finale [5 lug]** — la guida ora copre TUTTA l'app:
  spiegazione dei 3 filtri Match (Vicini/Migliori/Cerca figurina, icona lente {search}), entra nella CHAT e
  spiega scrivi/conferma-scambio(✓)/segnala/avviso-sicurezza, poi chiude con un **MODALE centrale**
  (`GuideFinishDialog`): logo Stickers, "Benvenuto tra noi", nota "app gratis, la regala l'owner + contributo
  spontaneo per i database", bottone **PayPal "Dona ora"** PREDISPOSTO (non collegato: ringraziamento al
  tocco; la funzione donazione si gestirà più avanti). Rifiniture: linguaggio unificato (titolo=concetto,
  body=azione), regola PUNTO A CAPO ovunque, icone=componenti lucide reali + pallini-colore, freccia fumetto
  affusolata, velo 0.4, `side`/`align` per non coprire il target, long-press bloccato nel passo colori, dialog
  dettaglio read-only (solo X), effetto `magic` sul benvenuto (testo che si materializza, solo CSS), guida a
  OGNI refresh anche in deploy (scelta owner). Tutto frontend, 0 scritture DB (verificato nei test visivi).
- **Guida = onboarding puro, solo alla 1ª autenticazione [5 lug]** — scelta owner: la guida parte SOLO al primo
  accesso (utente vergine, 0 album → l'album di prova è coerente), **rimosso il pulsante "Guida Stickers" dal
  Profilo** (con esso l'import `useGuide`/`HelpCircle`). Motivo: eliminare il caso "utente che rientra con album
  veri" azzera le combinazioni di stato da gestire → codice più semplice e robusto. In fase test l'avvio resta
  a ogni refresh (una riga da cambiare in `!hasSeenGuide` al rilascio). **Reso Dero975 (id 69) vergine**: DELETE
  mirato di `user_albums` (6) + `user_stickers` (4070) SOLO per user 69, backup CSV prima, catalogo e altri
  account intatti — così lo stato di test = nuovo utente. Il pulsante U/A resta.
- **Guida · passo filtri ora INTERATTIVO (non più demo automatica) [5 lug]** — il passo dei 3 filtri era una
  `demo` automatica che scorreva da sola: sostituita da una prova `try` con **long-press reale** sul filtro
  "Mie" (scelta owner: coerenza "clicco e vedo cosa succede"). L'utente tiene premuto → TUTTA la griglia
  diventa verde (solo CSS `sg-demo-posseduta`), poi avanzamento MANUALE. Target = "Mie" (VERDE, non "Doppie"
  rosso) per coerenza con lo stato "trovata" appena spiegato sulle figurine. A press riuscito lo **spotlight si
  sposta sulla GRIGLIA** (non sul filtro) così le figurine escono dal velo scuro e si VEDE il cambio-colore di
  gruppo (senza, sotto l'ombra non si notava). Il tipo `demo` è stato rimosso (ora 3 tipi: info/action/try);
  `stopPropagation` in capture blocca il bulk reale → 0 scritture (verificato in test E2E). Dettagli in
  `DNA/18`.
- **Guida interattiva (onboarding tour) [4-5 lug]** — guida in stile classico: velo + spotlight + **fumetto con
  freccia** sul tasto. Motore di rendering = **driver.js** (~5KB, libreria standard dei tour — scelta dopo aver
  provato un motore fatto in casa: troppi edge-case su overlay/pointer-events con Tailwind v4); flusso, passi e
  stato restano nostri (config `lib/guide/steps.ts` · stato `GuideContext.tsx` · wrapper `GuideOverlay.tsx` ·
  stile `guide-theme.css`). Conduce nel primo album e nel primo match. REGOLA D'ORO: ogni passo evidenzia un
  elemento presente nella schermata. Fumetti SOLO informativi (nessun pulsante/pallino/salta; si va solo
  avanti). 3 tipi di passo: info (tocca ovunque) · action (tocchi il pulsante vero, naviga davvero) · **try**
  (prova SIMULATA: tocchi = ciclo colori solo CSS; long-press figurina = dettaglio reale read-only,
  chiuso→avanza; long-press filtro = griglia colorata solo CSS — vedi voce [5 lug]). **ZERO scritture DB
  verificate in test** (0 POST/PATCH durante la guida, 0 classi residue: l'app torna com'era). Avvio: PER ORA a
  ogni refresh, dopo il cookie banner (altrimenti copre la navbar); per il rilascio passare a
  `!hasSeenGuide(userId)`. (Trigger dal Profilo RIMOSSO il 5 lug — vedi voce in alto.) **[5 lug] Album di prova**: la sezione
  Album usa uno stato-demo standard per QUALSIASI account (nuovo = 0 album): passo "➕ aggiungi" simulato dai
  Disponibili, riga demo in "I miei album", dettaglio `/album/-1` da `guide-demo.ts` (60 figurine, zero API);
  i 3 tocchi spiegano i colori (verde=trovate, rosso=doppie, grigio=mancanti) con avanzamento MANUALE
  sull'ultimo. Verificato su entrambi gli scenari (stub API utente nuovo): flusso identico, 0 scritture.
  Dettagli anti-regressione (doppio
  avanzamento, ESC in capture, overlayClickBehavior) in `DNA/18_GUIDA_INTERATTIVA.md`.
- **Profili-prova · ripristinata eliminazione dal dettaglio [4 lug]** — la rimozione del singolo profilo-prova
  era sparita quando si è tolto il vecchio bottone "Scambio fatto" (unificazione col flusso reale). Ripristinata
  con un pulsante **"Elimina profilo di prova"** (rosso pieno, testo bianco, icona `Trash2`) **fisso in fondo
  sopra la nav bar** (fuori dallo scroll) — SOLO per i demo (`isDemo`). Conferma via `AlertDialog`; usa la
  `dismissDemoMatch(currentUser.id, matchUserId)` già esistente (localStorage per-utente, NON tocca il DB) →
  torna a `/match` con toast. Allineato il testo del `DemoBanner` ("Rimuovi questo profilo di prova" → "Elimina
  profilo di prova"). Verificato: pulsante assente sugli utenti reali.
- **Home · box "Migliori match" consolidato [4 lug]** — (1) **Altezza SEMPRE fissa**: gli slot mancanti hanno
  ora `h-12` (48px) uguale alle card piene → il box blu resta identico con 4, 2 o 1 match (prima si accorciava:
  336px vs 280px). NB: usato `h-12` standard, NON `min-h-[48px]` arbitrario (che Tailwind non generava → 0px).
  (2) **Niente card tratteggiate**: gli slot vuoti sono righe piene neutre (`bg-white/10`), non più `border-
  dashed`; testo "Nessun altro match disponibile" solo nel primo slot. (3) **Contatore coerente con le card
  mostrate**: "N scambi · N utenti" ora si basa su `topMatches` (max 4 mostrati), non sull'intero `currentPool`
  (prima "5 utenti" con 4 righe visibili, e scambi che includevano il 5° non mostrato).
- **Dettaglio album: contatori e filtri UNIFICATI [4 lug]** — i 4 box informativi (Totale/Possedute/Doppie/
  Mancanti, solo numeri) e i 4 pulsanti-filtro sotto (Tutte/Mie/Doppie/Mancanti) erano ridondanti: fusi in
  **4 card-pulsante** uniche (`AlbumDetail.tsx`), ognuna insieme **contatore + filtro**. Etichette Tutte/Mie/
  Doppie/Mancanti, numero colorato (nero/verde/rosso/grigio — Mancanti in grigio come le celle "mancante"
  della griglia, per coerenza [5 lug]), sfondo bianco, angoli arrotondati, touch-
  friendly; la card attiva ha bordo+anello primario. Conserva tap=filtra e **long-press=imposta tutte a quello
  stato** (bulk, tranne "Tutte"). Robusto anche con numeri a 4 cifre (verificato: nessun overflow). Barra %
  resta sotto. Meno refusi, più minimale.
- **Popup a scomparsa (toast): sfondo bianco + titolo arancione [4 lug]** — standardizzato lo stile di TUTTI i
  toast (unico sistema, nessun sonner): sfondo **`bg-popover`** (bianco PURO `0 0% 100%` — NON `bg-background`,
  che è azzurrino `205 100% 98%`) e **titolo `text-accent`** (arancione della palette, `--accent: 37 90% 55%`);
  i toast `destructive` restano col titolo su rosso. Coerente con la palette.
- **Utenti-prova: rifiniture UI + vetrina varia [4 lug]** — (1) **Toast al CENTRO** dello schermo (prima in
  alto a destra): la `ToastViewport` ora è `fixed inset-0 … items-center justify-center` con
  `pointer-events-none` sul wrapper (i click passano) e animazione fade+zoom invece di slide d'angolo — gli
  avvisi "chat/scambio non attivo" sono messaggi da leggere, non notifiche marginali. (2) **Bottone verde
  "Scambio fatto"** (FAB in chat): icona `Check` semplice e grande (`strokeWidth 3`) al posto di `CheckCircle2`
  (che aveva il cerchio interno bianco) — resta il cerchio verde del bottone. (3) **Vetrina dei 4 profili-prova
  DIVERSA e mista**: ogni profilo ha una `recipe` (in `demo-matches.ts`) con album da famiglie diverse del
  catalogo reale (Calciatori + Euro/Mondiali) e distribuzione dai/ricevi diversa → l'utente vede casi vari.
  `totalExchanges` e `albumsInCommon` sono DERIVATI dalla ricetta (`deriveTotals`) → card e dettaglio sempre
  coerenti. Standard IDENTICO per ogni nuovo utente (nessuna casualità). Verificato runtime: -101 Calciatori
  2025-26+Euro 2024, -102 Calciatori 2024-25+WC 2026, -103 Calciatori 2023-24+Euro 2020+WC 2022 (3 album),
  -104 Calciatori 2022-23+WC 2018; toast centro-Y=422/844; icona check senza cerchio.
- **Utenti-prova: percorso IDENTICO al reale, stop solo nei 2 punti finali [4 lug]** — corretto l'approccio
  precedente (che metteva un pulsante *"Scambio fatto"* fittizio nel dettaglio, inesistente per gli utenti
  veri). Ora il profilo-prova segue **esattamente lo stesso percorso del reale**: dal dettaglio si apre la
  chat (bottone tondo) → dentro la chat c'è il bottone verde → modale *"Conferma scambio"* → *"Avanti"* →
  selezione figurine → *"Conferma (N)"*. Stesse schermate (`ChatRoom`, `TradeConfirmDialog`), stessi bottoni.
  **Le 2 SOLE differenze**, ai due stop finali: (1) in chat, cliccando **invia** → toast *"Chat non attiva …
  con i profili di prova: il messaggio non viene inviato"* (il messaggio non parte); (2) nel modale, cliccando
  **"Conferma (N)"** → toast *"Scambio non attivo … con i profili di prova: il tuo album non viene aggiornato"*
  e chiusura (NIENTE doppia conferma rossa, che parlerebbe di aggiornare album reali). Entrambi i messaggi
  **specificano sempre** che è perché è un profilo di prova. **Isolamento totale**: la chat prova usa la rotta
  `/chat/demo{userId}` (riconosciuta da `ChatRoom` col prefisso `demo`) → **nessuna chiamata backend** (hook
  `useListChats`/`useGetChatMessages` disabilitati, `useRealtimeSignal` già `null` su chatId non finito); il
  modale prova (`isDemo`) disabilita `useGetChatTrade` e genera i gruppi con `buildDemoTradeGroups` (figurine
  di esempio da album REALI via `useListAlbums`, id sintetici non collidenti). Rimossi dal dettaglio: pulsante
  "Scambio fatto", nota "profilo di prova", `handleDemoTrade`. **NON toccati** (verificato via API+UI): flusso
  reale di dettaglio/chat/scambio (utente 3109: chat reale `/chat/433`, invio funzionante, scambio con doppia
  conferma). Typecheck+build OK; runtime verificato end-to-end su demo (chat estetica, invio bloccato con
  toast, modale fino a Conferma bloccata) e su reale (intatto).
- **Utenti-prova: hardening post-review multi-agente [4 lug]** — review adversariale (5 lenti + verifica)
  sulla feature onboarding: applicati i fix confermati. (1) **[ALTA]** flag di rimozione demo ora **per-utente**
  (chiave localStorage `demo_matches_dismissed_ids_v2:<userId>`, prima globale per browser): un nuovo account
  o lo switch U/A sullo stesso device rivede i profili-prova. (2) **Numeri coerenti** card↔dettaglio: il
  dettaglio mostra `totalExchanges` come la card (prima `min(tot, round(tot*0.8))` → 14 vs 11). (3) **Claim
  impossibili rimossi** per l'utente vergine: la card demo non mostra più "N album in comune / scambi fatti"
  (riga neutra "Profilo dimostrativo") e il dettaglio non dice "N figurine TUE doppie" (testo generico).
  (4) **Deep-link demo invalidi** (`/match/-999` o profilo già rimosso): redirect a `/match` invece di
  pagina fantasma. (5) **Area lontani** = "Altra zona" (non l'area dell'utente → basta "Milano · 151 km").
  (6) **Banner** solo quando ci sono card demo effettivamente visibili nella tab (non a raggio 1-4 km).
  (7) **Flash loading** eliminato: i demo non si calcolano finché `bestMatches` è in caricamento. (8)
  **Contatore Home** onesto: "N scambi di prova · N profili prova" quando il pool è solo demo. (9) Testo
  "a utente mancano" corretto; commenti 150→151 allineati. Verificato: typecheck+build, test logici
  (per-utente, coerenza, area) e visivi runtime (backend attivo, login reale, Home/Match/dettaglio, H5/H6).
- **Onboarding: 4 profili-prova per il nuovo utente [4 lug]** — per evitare l'impatto di una lista match
  vuota, il nuovo utente vede fino a **2 profili-prova nel raggio + 2 fuori** ("Utente" + badge PROVA
  arancione). **Solo FRONTEND** (`lib/demo-matches.ts`, userId negativi -101..-104): non esistono nel DB,
  quindi invisibili agli altri utenti e senza alcun conflitto con utenti reali (id positivi) — verificato
  con test incrociati. **Unica variabile = la distanza**, calcolata dal CAP dell'utente con la STESSA
  formula del backend (`estimateDistance`); capOffset tarati (+3/+8 = ~4.6/10.6 km vicini; +1500/+3000 =
  distanze). **DISTANZE**: i 2 VICINI dal CAP (+3/+8 → ~4.6/10.6 km, robusto su ogni CAP); i 2 LONTANI a
  **151 km FISSI** (`fixedKm`), oltre il raggio massimo dell'app → non entrano MAI in "Vicini" (la formula
  sul CAP non garantiva >150 km su tutti i CAP per via del suo tetto ~199 e del modulo interno). **SOGLIA**
  di vicinanza FISSA `NEAR_THRESHOLD_KM=30` (NON lo slider): decide near/far dei reali per capire quanti
  demo servono — usare lo slider ruppe la logica (a raggio grande tutti i reali sembravano vicini).
  **Vetrina**: dettaglio con dai/ricevi dimostrativi, **chat guidata** (messaggio fisso) e **scambio
  simulato** (toast, non tocca l'album). **Si SPEGNE da sola** quando l'utente ha già ≥2 match reali vicini
  (≤30 km) E ≥2 lontani (validi, con scambio); altrimenti riempie solo i posti mancanti fino a 2+2; non
  mostrata se `exchangesCompleted>0`. **Rimozione SINGOLA** dal dettaglio di ogni profilo ("Rimuovi questo
  profilo di prova" + conferma); dismissione per-id in localStorage → i rimossi non tornano (per
  dispositivo). Integrata in Home (box "Migliori match" invariato; il toggle 📍 "Vicini a me" ora FILTRA a
  ≤30 km — demo e reali — coi contatori coerenti, non più solo riordino), MatchList (banner informativo;
  filtro per raggio slider) e MatchDetail (router: userId<0 → `DemoMatchDetail`, isolato dagli hook del ramo
  reale). Contestualmente il **raggio max dello slider è passato da 100 a 150 km** (`RADIUS_MAX`; il backend
  non ha cap fisso, già compatibile). Verificato: typecheck + build OK, test logici (rimozione singola,
  persistenza, soglia 2+2 con 0/1/2/4 reali, no conflitti id, taratura su 5 CAP) e visivi con mock di utenti
  reali finti (Home Migliori/Vicini, Match tab Vicini a vari raggi, interazione demo+reali).
- **Audit privacy & sicurezza + hardening CORS [4 lug]** — audit enterprise sola-lettura (repo + chiave
  anon + connessione DB `postgres` per il catalogo RLS + header live del deploy). Esito: **rischio globale
  BASSO**. Verificato con prove: (1) **RLS ON su tutte le 15 tabelle con 0 policy = deny-all**; lettura
  anonima via PostgREST → **0 righe** da ogni tabella (anche `stickers`/`albums` che hanno dati). (2) Modello
  **backend-guardiano**: il frontend NON fa query dati a Supabase (`.from()` assente), usa il client solo per
  `auth`/realtime; tutti i dati passano da Express `/api/*`; `service_role` assente dal frontend/bundle,
  solo backend. (3) Nessuna RPC/vista custom in `public`. (4) `.env` gitignored e mai in git history.
  (5) GDPR: cancellazione (`DELETE /api/auth/me`) ed export (`GET /api/auth/me/export`) presenti; PII
  minimale (nickname/email/CAP); sanitizer PII sui log; font self-hosted; cookie banner minimale. (6) CSP/
  HSTS/CORS solidi (header live: `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
  HSTS `max-age=31536000`). **UNICO fix applicato**: CORS in prod usa ora il **dominio esatto**
  `https://stickers-matchbox.onrender.com` invece della regex jolly `*.onrender.com` (che ammetteva
  qualsiasi sotto-dominio onrender); fallback env `CORS_ORIGINS`/`RENDER_EXTERNAL_URL` invariati, dev
  localhost invariato; verificato comportamentalmente. **Rischi noti ACCETTATI**: pulsante U/A
  (`DevQuickSwitch`) visibile in prod (scelta owner, da rivalutare solo con utenti reali); token in
  localStorage (standard SPA, mitigato da CSP `script-src 'self'`); backup locale con PII (gitignored).
  **Rimandabili (media/bassa)**: `pnpm update` per DoS transitivi (`path-to-regexp`/`qs` su Express 5.2.1),
  `unsafe-inline` su style-src (splash). Nota: la migrazione 0004 era già stata applicata → nessuna colonna
  demo residua (un finding degli agenti su questo era obsoleto, letto dal backup vecchio).
- **Pulizia e alleggerimento pre-pubblicazione (stato vergine)** — in vista degli ultimi test prima del
  lancio, l'app è stata riportata a vergine e ripulita dai residui. (1) *DB*: eliminati ~3000 utenti di
  test e tutti i dati derivati (possessi, chat, messaggi, report, sblocchi); tenuti SOLO `Dero975` (id 69)
  e `admin` (id 70) resi vergini (0 album/figurine) per il pulsante U/A; catalogo `albums`/`stickers`
  INTATTO (regola: gli album non si eliminano mai, al massimo si resettano i possessi). Backup completo
  pre-pulizia in `BACKUP/`. (2) *Migrazione 0004_drop_demo APPLICATA*: rimosse le colonne `users.demo_started_at`/
  `demo_expires_at` e le settings `demo_hours`/`premium_demo_enabled` (residui della "demo premium" già
  ritirata) → DB ora 100% allineato allo schema Drizzle; isPremium/payments/paywall non toccati. (3) *Codice
  morto*: rimosse da `api-server/lib/auth.ts` le funzioni `hashPin`/`hashAnswer`/`verifyAnswer` (orfane dopo
  la rimozione della registrazione PIN; i seed hanno copie proprie) + import orfani; rimosso il hook
  `useIsMobile` (mai importato). `verifyPin` resta (login PIN legacy U/A). Typecheck 0 errori. (4) *Locale/git*:
  eliminati backup superati (snapshot 3 lug 25M, dump pre-reset, mini-backup legali), `.rollback-messaggi`,
  `album-source/scraped.json`, `dist/` e `tsbuildinfo` (~39M); rimossi il branch `replit-agent` (residuo
  Replit) e il remote `gitsafe-backup` (server locale morto). NB: `album-source/link/` NON si tocca (sorgente
  della pipeline dati album).
- **Rifiniture UI mobile (Profilo, Album, navbar Match)** — tre ritocchi estetici verificati sul
  DOM reale (Playwright, gap misurati, non a occhio): (1) *Profilo* — la firma DeroArts ora è
  ancorata in fondo, a ridosso della nav bar (gap 0px); `mt-auto` non veniva applicato → sostituito
  con uno spacer `flex-1` che spinge il footer in basso. (2) *Album* — i chip filtro categoria
  (Tutti/Campionati/Europei/Mondiali) spostati nella fascia fissa `shrink-0` FUORI dallo scroller:
  scorrono solo le card; `pb-3` sulla fascia dà uno stacco permanente ~12px (prima le card sfilavano
  a ridosso, 4px). (3) *Navbar* — icona Match = fulmine `Zap` (coerente col logo, non più le due
  sagome `Users`); da ATTIVO il fulmine è arancione PIENO (`fill-accent`) con contorno blu sottile
  (`text-primary` + `strokeWidth 0.75`). Nessun cambiamento funzionale/DB.
- **Email di supporto UNICA + testi legali in box unico** — l'email di supporto è ora una sola,
  gestita da `app_settings.support_email` (admin → Impostazioni) via hook condiviso
  `useSupportEmail()` (fallback `stickers@deroarts.com`): usata da Account bloccato, firma
  Profilo, info Pagamenti; nei testi legali il segnaposto `{EMAIL_SUPPORTO}` è sostituito al render
  in `LegalPage`. Prima l'email era hardcoded in 3 punti e il campo admin era inerte; ora cambiarla
  in admin la propaga ovunque (verificato e2e). In Impostazioni i 3 testi legali (privacy/termini/
  cookie) si gestiscono come UN unico testo (marcatori `===== … =====`, split ai campi DB al salvataggio,
  round-trip verificato) + "Copia tutto". Corretto il nome app "STICKERs matchbox" → "Stickers Matchbox"
  (fallback backend + testi DB). Sidebar admin: "Pannello Admin" meno spaziato.
- **Admin Errori/Segnalazioni — UI consolidata a colpo d'occhio** — pagina condivisa
  `AdminErrors`/`ErrorRow` (una per `group=auto|manual`): (1) rimossa la logica "criticità"
  dalla UI (card Critiche, badge/selettore priorità); colonna DB `priority` intatta ma non più
  esposta. (2) Filtri su UNA riga senza box contenitore (coerente con Messaggi/Utenti): cerca +
  Aggiorna (tondo, sola icona, che ricarica E azzera i filtri) + chip stato + "Copia tutto".
  (3) Nelle card lo STATO è sempre primo, reso come SOLO testo colorato (verde New, violetto in
  analisi, ecc.) — niente sfondo/contorno; il "New" verde sparisce all'apertura (new→investigating).
  (4) Il badge categoria mostra la scelta utente dal form (`Qualcosa non funziona`/`Errore album`/
  `Proposta`, colori rosso/ambra/blu) = provenienza a colpo d'occhio. (5) Sidebar admin senza icone
  (solo testo). NB: nickname "Anonimo" NON è un bug — il report cattura `userId` se loggato (join
  users→nickname); gli "Anonimo" sono dati di test seedati senza login.
- **Recupero PIN legacy rimosso + eliminazione account senza PIN** — il vecchio recupero
  (codice `STICK-XXXX` + domanda di sicurezza) apparteneva al sistema PIN, ormai soppiantato da
  Google/email; con soli utenti di test da eliminare prima del lancio, non serviva più. **Rimossi**:
  pagina `pages/auth/Recover.tsx` + route `/recover`, endpoint `POST /recover`, `/recover/lookup`,
  `/recover/answer`, `/recovery-code` (+ schemi Zod/handler), voce Profilo "Il mio codice di recupero",
  link "Password dimenticata" nel Login, riga `/recover` in `PAGE_LABEL`. Spec `openapi.yaml` ripulita
  (RecoverBody/RecoveryCodeResponse/PinConfirmBody + campo `recoveryCode` in AuthResponse) e client
  orval rigenerati. **NON toccati** (regola U/A): login nickname+PIN e `DevQuickSwitch`, che lo usa.
  Colonne DB `recovery_code`/`security_question`/`security_answer_hash` restano nullable (nessuna
  migrazione distruttiva), inutilizzate. **Eliminazione account**: non chiede più il PIN (gli utenti
  social non ne hanno, e `deleteMe` falliva per loro) → solo conferma `ELIMINA` + token; UI rifatta a
  **due conferme** (scrivi ELIMINA → "sei sicuro?") con **commiato** finale. Blocco "utente bloccato non
  può auto-eliminarsi" (403) invariato. Profilo ridisegnato: rimossi i titoli-sezione, **card unica
  compatta** (4 voci) che sta a schermo senza scroll, firma deroarts inclusa. Messaggio ErrorBoundary
  reso più sintetico ("segnalazione inviata: grazie").
- **Segnalazioni utente a 3 tipi (bug / errore contenuti / proposta)** — la modale unica "Segnala
  un problema" (solo testo libero) obbligava l'admin a indovinare tipo e cercare a mano l'album.
  Rifatta come `ReportDialog` a 2 passi (scelta tipo → form adattivo): **bug** (`user_report`),
  **errore nei contenuti** (`content_error`, con menu album + n° figurina), **proposta**
  (`feature_request`). ZERO migrazioni: il tipo va in `error_reports.errorType` (enum esteso lato
  backend), i dettagli in `meta` jsonb (albumId/albumTitle/stickerRef/requestKind). L'hash di
  dedup include il riferimento meta → segnalazioni su album/figurine diverse non si accorpano.
  Admin: DUE sezioni separate dalla stessa pagina (`AdminErrors` con prop `group`, filtro backend
  `?group=auto|manual`): **"Errori ricevuti"** (`/admin/segnalazioni`, tipi automatici
  crash/api_error/other) e **"Segnalazioni & proposte"** (`/admin/proposte`, tipi utente
  user_report/content_error/feature_request). Badge tipo (rosso/ambra/blu), box "Riferimento
  nell'album", meta nell'export "Copia per AI". Punto d'ingresso utente: "Segnala o proponi" in Profilo.
  `reportError`/ErrorBoundary invariati e retrocompatibili. Firma **deroarts** minimale in fondo
  al Profilo: solo il logo `deroarts_logo.svg` cliccabile (mailto per acquisto/collaborazioni).
- **12 album Mondiali+Europei caricati e pubblicati** — 6 World Cup (2006/2010/2014/2018/2022/2026)
  + 6 Euro Cup (2004/2008/2012/2016/2020/2024), tutti On Line. Il builder specifico
  `build:worldcup-data` è stato sostituito da `build:albums-data` GENERICO: deduce
  titolo+categoria dal nome file (`World Cup <anno>`→mondiali, `Euro Cup <anno>`→europei), un
  `.gz` per album; `restore:albums` fa auto-discovery di tutti i `.gz` (aggiungere un album =
  solo un `.md` + build, zero modifiche al codice). L'album 2026 esistente è stato rinominato
  in DB da "FIFA World Cup 2026" a "World Cup 2026" (id 34 invariato → 992 possessi intatti) per
  uniformare il formato. Refusi sorgente sistemati a monte: World Cup 2006 aveva 24 numeri
  condivisi da 2 giocatori (com'è nell'album Panini reale) → suffisso a/b nel .md, nessuna
  figurina persa; rimosso il .md doppione `panini_world_cup_2026.md`. La regola vincolante:
  gli album vergini non si eliminano mai senza autorizzazione esplicita dell'owner.
- **Categorie master degli album (Mondiali/Europei/Campionato, scalabile)** — con l'arrivo di
  più competizioni la lista piatta di album non regge. Scelto: colonna `albums.category`
  (mig. 0009 additiva) assegnata dall'admin da un menu, NON dedotta dal titolo (fragile: la
  vecchia `isWorldCup` regex è stata rimossa). Fonte unica `ALBUM_CATEGORIES`: in `@workspace/db`
  (validazione server) + replica in `@workspace/api-client-react` (UI) perché il frontend non
  può dipendere dal package DB (ha `pg`). Aggiungere una categoria futura = una riga nelle due
  liste + eventuale icona, zero migrazioni. User "Disponibili": chip-filtro per categoria
  (solo categorie presenti, >1); ordine per categoria poi titolo. Icone per categoria ottimizzate
  (mappa unica): world-cup.png / coppa-europei.png / scudetto.svg. Backend valida la category
  (input non valido → default/invariata). restore/export/build dati versionati includono category.
- **Album FIFA World Cup 2026 (primo album a codici alfanumerici)** — 992 figurine, 48 squadre,
  codici stampati tipo MEX10/FWC19/CC1: NESSUNA migrazione necessaria (lo schema aveva già
  `code` testuale separato da `number` posizionale). Pipeline: checklist testuale in
  `album-source/link/panini_world_cup_2026.md` → `build:worldcup-data` → dataset versionato
  `world-cup-2026.json.gz` → `restore:albums` (ora multi-sorgente; non tocca più
  `is_published` degli esistenti — pubblicare è dell'admin). Creato NON pubblicato (id 34).
  UI: figurine con stesse colonne/proporzioni degli altri album (griglia identica), codice
  lungo su 2 righe nella cella; **suddivisione in blocchi per nazione** con intestazione
  (nome + linea sottile) SOPRA la griglia del blocco, fuori dalla grid (scartato l'header
  `col-span-full` interno: rompeva su WebKit aspect-square+content-visibility). Icona coppa
  sulla card, Mondiali pinnati in cima. `export:albums` esclude i Mondiali; gli scambi/match
  mostrano il codice stampato (`code || number`, `lib/trade.ts` include `code`).
- **Blocco utente a prova di aggiramento (lista nera email + gate azioni)** — scoperto in audit che
  il blocco viveva solo su `users.is_blocked`: controllato SOLO al login, e un bloccato poteva
  eliminare l'account (hard delete) e re-iscriversi con la stessa email ripartendo pulito. Deciso:
  (1) migrazione additiva **0008** → tabella `blocked_emails` (unique `lower(email)`, RLS deny-all)
  allineata da admin blocca/sblocca — la traccia sopravvive all'eliminazione dell'account;
  (2) gate `requireNotBlocked` sulle route di azione + check inline su location/export/delete →
  bloccato fermato subito anche a sessione aperta (`/auth/me` escluso di proposito: serve alla shell);
  (3) un bloccato NON può auto-eliminarsi; (4) comunicazione unica: modale "Account bloccato" con
  mailto supporto (costante `SUPPORT_EMAIL` in `BlockedAccountDialog.tsx`, email provvisoria da
  definire), mostrato al login (PIN/Google/Email) E a sessione aperta via observer globale
  `setAccountBlockedObserver` → `BlockedGate`. Codice errore unificato a `ACCOUNT_BLOCKED`
  (il frontend accetta anche il legacy `BLOCKED`). Verificato end-to-end: 5/5 azioni 403,
  blocklist case-insensitive, sblocco ripristina tutto.
- **Eliminazione chat — soft-delete per-utente (stile WhatsApp)** — ognuno elimina la chat DAL PROPRIO
  lato, l'altro la conserva (policy + moderazione salve: nessuno distrugge la copia altrui). Migrazione
  additiva **0007** → `chats.deleted_by_user1/2` (bool, default false). `DELETE /api/chats/:chatId`
  (`chats.ts`, `deleteChat`): imposta il flag del chiamante; se l'altro l'aveva GIÀ eliminata → cancella
  davvero la riga (cascade su messages/reports/trade_confirmations) = **DB leggero senza violare la
  policy**, esattamente l'obiettivo dell'owner. `listChats` filtra via le chat eliminate dal lato del
  richiedente. **Resurrezione:** un nuovo messaggio (`sendMessage`) azzera entrambi i flag → la chat
  riappare per tutti (comportamento WhatsApp). Frontend: swipe-sinistra sulla card in `/messaggi`
  (`components/chat/ChatRow.tsx`, touch nativi, cassetto cestino 80px) → conferma AlertDialog → delete
  ottimistico. Scartati: "elimina per tutti" (sabota la moderazione) e cestino fisso nell'header (tap
  accidentale). Solo nella lista, non dentro la ChatRoom.
  **Protezione moderazione (la moderazione vince):** la cancellazione DEFINITIVA dal DB (quando entrambi
  eliminano) è bloccata se esiste un `report` con status `pending` sulla chat → resta nel DB come prova
  per l'admin, sparisce solo dalle liste utenti. Impedisce a un utente segnalato di distruggere le prove
  eliminando la chat. Il **blocco utente** è sull'account (`users.is_blocked`), indipendente dalla chat →
  eliminare la chat non sblocca nessuno. Bug trovato dall'owner in review: la FK `reports.chat_id` avrebbe
  perso il riferimento alla cancellazione.
  **Rimosso "Elimina chat" ADMIN** (pulsante + `DELETE /api/admin/chats/:chatId`): cancellava
  chat+messaggi+segnalazioni in modo irreversibile e SENZA la protezione moderazione → distruggeva prove.
  Per moderare bastano Chiudi (reversibile) + Blocca + Segna gestita, tutti non distruttivi. L'endpoint admin
  non era nello spec OpenAPI (era una fetch diretta), quindi nessun client da rigenerare.
  **Nota UX collegata:** freccia indietro della ChatRoom riportata a `setLocation("/messaggi")` fisso —
  `window.history.back()` era inaffidabile (history con redirect auth / dopo refresh → il pulsante non
  reagiva). Messaggi è ora la destinazione naturale dell'elenco chat da qualsiasi ingresso.
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
