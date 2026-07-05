# DNA — Stato Sviluppo

Aggiornato: 4 luglio 2026

> Fotografia dello **stato attuale** (non un changelog). Tenere aggiornato questo
> file a fine sessione.

## 🟡 STATO: SVILUPPO — non pubblicata, dati di TEST (leggere PRIMA di tutto)

**L'app NON è mai stata pubblicata. Non esistono utenti reali. TUTTI i record nel
DB (utenti, possessi, chat, messaggi, scambi, segnalazioni) sono dati di TEST**
creati per provare l'app.

Conseguenze operative — NON trattare deploy/bug come incidenti critici di produzione:
un push su `main` fa partire l'autodeploy su Render ma **non impatta nessun utente
reale**; i bug lato client (es. cache Service Worker della PWA dopo un deploy) **non
sono urgenze**. Restano valide sempre: **push solo su richiesta esplicita** dell'owner,
**DB mai distruttivo** (migrazioni additive), regole segreti/`.env`.

**Questo stato lo cambia SOLO l'owner, esplicitamente** ("l'app è online, i dati sono
reali"). Solo allora: aggiornare questa intestazione a `🟢 PRODUZIONE` e trattare dati
e deploy come reali/ad alto rischio.

## In sintesi

Sticker Matchbox è **funzionante in locale** e **deployato su Render** (deploy tecnico
attivo, ma in **sviluppo** — vedi stato sopra: nessun utente reale, dati di test).
Stack: monorepo pnpm · React 19 + Vite + TS · Express 5 + Drizzle · Supabase.

> **⚡ AGGIORNAMENTO 1 lug 2026 — leggere prima:** accesso modernizzato (Google +
> Email/password via Supabase Auth), registrazione nickname+PIN **ritirata** (resta
> solo login storico/admin), app **AZZERATA a stato vergine** per la pubblicazione
> (0 utenti/chat/match, catalogo intatto), sezione Messaggi admin potenziata. Vedi
> il blocco "Sessioni giu-lug 2026" più sotto e `17_DECISION_LOG.md`. **Per pubblicare
> mancano: env Supabase su Render + decisione sul pulsante U/A** (vedi "Da fare").

## Sessioni giu-lug 2026 — novità principali (fatte)

- **[4 lug] Audit privacy & sicurezza (rischio BASSO) + hardening CORS** — audit enterprise sola-lettura:
  RLS deny-all verificata su tutte le 15 tabelle (0 righe leggibili da anon), modello backend-guardiano
  (il client non tocca il DB), segreti fuori dal frontend/git, GDPR ok (cancellazione+export), CSP/HSTS
  attivi in prod. Unico fix: CORS in prod ristretto al dominio esatto (non più `*.onrender.com`). Rischi
  noti accettati: pulsante U/A, token localStorage, backup locale con PII. Vedi `17_DECISION_LOG.md`.
- **[4 lug] Pulizia e alleggerimento pre-pubblicazione** — (a) DB riportato a STATO VERGINE: eliminati
  ~3000 utenti di test + tutti i dati derivati; restano SOLO `Dero975` (id 69) e `admin` (id 70), entrambi
  con 0 album/0 figurine; catalogo (35 album, 25.391 figurine) INTATTO. Backup pre-pulizia in
  `BACKUP/backup_2026-07-04T00-28-24.json`. (b) Migrazione `0004_drop_demo.sql` APPLICATA → DB 100%
  allineato allo schema Drizzle (via i residui demo). (c) Codice morto rimosso (hash PIN/answer legacy in
  `auth.ts`, hook `useIsMobile`). (d) Pulizia locale/git: backup superati, `.rollback-messaggi`,
  `scraped.json`, `dist/`; branch `replit-agent` e remote `gitsafe-backup` rimossi. Vedi `17_DECISION_LOG.md`.
- **[4 lug] Rifiniture UI mobile** — Profilo: firma DeroArts ancorata in fondo alla nav bar (spacer
  flex-1, non più a metà). Album: chip filtro categoria FISSI fuori dallo scroller (scorrono solo le
  card) + stacco ~12px dalle card. Navbar: icona Match = fulmine (Zap); da attivo arancione pieno con
  contorno blu sottile. Solo estetica, verificata sul DOM reale. Vedi `17_DECISION_LOG.md`.
- **[3 lug] Blocco utente consolidato (anti-aggiramento)** — lista nera email (`blocked_emails`, mig. 0008)
  + gate su tutte le azioni + no auto-eliminazione + modale "Account bloccato" con mailto supporto, mostrato
  in tutti i casi (login PIN/Google/Email e sessione aperta). Dettagli in `02_UTENTI_AUTENTICAZIONE.md`.
- **[3 lug] Export admin per AI** — pulsante "Copia" in admin Segnalazioni (errori raggruppati per messaggio
  + file:riga del codice, per debug) e in admin Messaggi (riepilogo + conversazioni complete, segnalate in
  cima, per moderazione). Testo ottimizzato da incollare in ChatGPT/Claude. Fallback clipboard multipli.
- **[3 lug] Eliminazione chat (soft-delete WhatsApp)** — swipe-sinistra sulla card in /messaggi → cestino →
  conferma. L'utente elimina la chat dal proprio lato (l'altro la conserva); quando entrambi eliminano, il
  DB la cancella davvero. Un nuovo messaggio la fa riapparire. Migrazione additiva **0007**
  (`chats.deleted_by_user1/2`), endpoint `DELETE /api/chats/:chatId`. Dettagli in `17_DECISION_LOG.md`.
- **[3 lug] Ricerca mirata per singola figurina** — 3ª tab "Cerca figurina" in Match (album → figurina →
  chi la offre come doppia, ordinati per distanza). Endpoint `GET /api/matches/by-sticker/:stickerId`
  (indice esistente, zero migrazioni). Ingressi: lente 🔍 in Home (box Migliori match) e pulsante
  "Chi ha questo doppione?" nel dialog figurina (solo se mancante). Card match condivisa in
  `components/match/MatchCard.tsx`. Dettagli in `17_DECISION_LOG.md`.
- **[3 lug] Sezione "Messaggi" (5ª voce navbar)** — pagina `/messaggi` con tutte le chat (card minimali:
  icona + nome + "Nuovi messaggi" in verde); badge non-letti spostato da Match a Messaggi (cap 99+).
  Fix: apertura chat spegne subito segnali/badge (invalidazione lista); freccia indietro chat =
  history.back (non più fissa su /match). Dettagli in `17_DECISION_LOG.md`.
- **Accesso moderno (Google + Email/password)** via Supabase Auth, accanto al login storico
  nickname+PIN. Ponte identità: frontend prende l'access token Supabase → backend lo verifica
  (`api-server/src/lib/supabase-auth.ts`) → `POST /api/auth/social` (+ `/social/complete`) → rilascia
  il NOSTRO token HMAC. Nuovo utente social: nickname (permanente) + CAP, niente PIN. Email/password +
  reset via **Brevo** SMTP (gratis 300/giorno, configurato in Supabase; mittente `dero975@gmail.com`).
  Migrazione **0006** (email/auth_provider/supabase_user_id; PIN/domanda/recovery nullable). Frontend:
  `pages/auth/{Login,EmailAuth}.tsx`, `lib/social-auth.ts`, `lib/supabase.ts`. Dettaglio in `18_PIANO_AUTH.md`.
  ⚠️ Le email Brevo partono ma **cadono in SPAM** (mittente su dominio gratuito) → fix con dominio proprio
  `deroarts.com` + DKIM/DMARC (vedi `19_DOMINIO_DEROARTS.md`).
- **Registrazione nickname+PIN RITIRATA** — i nuovi account si creano SOLO con Google/Email. Rimossi dal
  frontend il form register PIN, domanda di sicurezza, schermata codice STICK; dal backend l'handler
  `register`, la rotta `POST /api/auth/register`, `generateRecoveryCode`. Il form nickname+PIN resta SOLO
  come **accesso** (account storici/admin); login + `/recover` legacy intatti.
- **Nickname** alfanumerico MISTO obbligatorio (≥1 lettera E ≥1 numero), **non modificabile** dopo la creazione.
- **App AZZERATA a stato vergine (pre-pubblicazione)** — eliminati TUTTI gli utenti (admin/Dero975 inclusi),
  chat, messaggi, sblocchi, pagamenti, conferme, segnalazioni, possessi; catalogo (23 album + 17.581 figurine)
  e `app_settings` INTATTI. `auth.users` Supabase = 0. Backup pre-reset in `BACKUP/db_pre_reset_*.sql.gz`.
- **Account demo ricreati per il pulsante U/A**: `Dero975` (pin 1234, utente) + `admin` (pin 0000, admin) —
  servono al `DevQuickSwitch` per il bypass. ⛔ NON eliminarli, NON toccare il pulsante U/A senza ordine
  esplicito dell'owner: vedi memoria `sticker-pulsante-ua-non-toccare` e `17_DECISION_LOG.md`.
- **Cattura errori completa** (mini-Sentry self-hosted, no dipendenze esterne): ogni errore → Segnalazioni.
- **Sezione Messaggi admin potenziata (per 2.000-3.000 utenti)**: `listChats` senza N+1 (poche query aggregate);
  nuovo `DELETE /api/admin/chats/:chatId`; dialog con **Elimina chat** + **Blocca partecipante**. Vedi `07`.
- **Privacy/Termini aggiornati** (DB `app_settings`) per Google/Email: raccolta email, fornitori Google(OAuth)+Brevo.
- **Dominio `deroarts.com`** dell'owner acquistato (Cloudflare + Zoho Mail) — per l'integrazione FUTURA di
  Stickers (`stickers.deroarts.com`, email `stickers@deroarts.com` già attiva, anti-spam). Dominio non ancora collegato. Vedi `19`.

## Fatto

### Infrastruttura & deploy
- Monorepo: `artifacts/{stickers-app, api-server}` + `lib/{api-spec, api-client-react, api-zod, db}`
- Deploy unico su Render (`stickers-matchbox`), **autoDeploy** su push `main`
  - build via **corepack** (`corepack pnpm …`), start con **node diretto** sul bundle
- Supabase operativo: **14 tabelle**, indici integri. Dati **reali** caricati: **23 album Calciatori (2003-04→2025-26), 17.581 figurine** (import Panini via Playwright; pipeline in [[import-panini-collections]]); utenti: Dero975 (test) + admin. **Nessuna copertina/artwork** (feature rimossa, scelta legale — vedi `09_DATABASE.md`). DB a Londra (UK), hosting Render a Francoforte (UE)
- Keep-alive Supabase: `SELECT 1` periodico + GitHub Action `keepalive.yml`
- **CI GitHub Actions** (`ci.yml`): typecheck + build su ogni push/PR su `main` (nessun deploy, zero costi)

### Backend (api-server)
- Express 5 + pino. Route: auth, albums, stickers, matches, chats, admin, settings, billing, error-reports, health (route `demo` **rimossa**)
- **Auth sicura**: token firmato HMAC-SHA256 (`v1.<payload>.<firma>`, TTL 30 giorni); PIN e risposte di sicurezza con **scrypt** asincrono (salt per utente)
- **Identità slegata dal CAP** (giu 2026): nickname **unico globale** (`users_nickname_lower_unique`), login **solo nickname + PIN**, recupero per **solo nickname**, CAP modificabile (`PATCH /me/location`, ricalcolo area via `deriveArea`). Migrazione `lib/db/migrations/0001_nickname_global_unique.sql`. Email di recupero = prossimo passo (serve servizio email). Vedi `02_UTENTI_AUTENTICAZIONE.md`
- **Rate limiting** in-memory: login 8/5min, recover 5/15min (429 + Retry-After)
- **CORS allowlist**: `*.onrender.com` (prod), `localhost`/`127.0.0.1` (dev), più `CORS_ORIGINS`
- Middleware `requireAuth`/`requireAdmin` centralizzati
- Match performanti: query in batch (no N+1), distanza CAP deterministica, **indice composto** `user_stickers(sticker_id,state)` (−42% sulla query) e **cache in memoria** delle liste match (TTL 60s, invalidata sui cambi dell'utente — `lib/matchCache.ts`). Soglie di tenuta free tier in `16_STRESS_TEST_AUDIT.md`
- In produzione serve anche il frontend statico (+ fallback SPA)

### Frontend (stickers-app)
- **User**: login/registrazione (nickname, PIN, CAP, domanda sicurezza), codice recupero, Home, Album, Match (migliori/vicini + slider distanza), Chat (**realtime** via Supabase Broadcast, fallback polling adattivo 8s/30s, + segnalazione), Profilo
- **Admin**: Dashboard, Album CRUD, Figurine, Utenti (blocco), Messaggi (moderazione), Donazioni (Ko-fi, sola lettura), Impostazioni, Segnalazioni errori
- **Layout admin consolidato** (`components/admin/AdminPage` + `AdminTable` + `AdminScrollArea`): testata di pagina fissa, **solo il contenuto/lista scorre**; tabelle con intestazioni centrate e sticky, griglia verticale, righe a colorazione alternata, densità compatta. Album: azione unica **Gestisci** (rinomina + figurine), stato **On Line/Off Line**, colonna **Utenti** (`userCount` lato admin), ordine stabile per id (Off Line non sposta la riga). Vedi `07_ADMIN_PANNELLO.md`.
- ~~**Monetizzazione — sblocco chat a pagamento** (giu 2026)~~ → **SUPERATO (lug 2026): RIMOSSO da codice E DB.** L'app è 100% gratuita, la chat è sempre apribile. Tolti paywall/`billing.ts`/`payments`/`chat_unlocks`/chiavi paywall. Unico introito = **donazione Ko-fi** (liberalità, admin → Donazioni). Vedi `06_PREMIUM_DEMO.md` e `09_DATABASE.md`.
- Lazy loading route (bundle iniziale ~152 KB gzip), ErrorBoundary
- PWA mobile-first: manifest, icone, splash, safe-area (icone PNG ottimizzate con pngquant, ~−50% peso senza perdita visibile; logo `.webp`). **Service worker** via `vite-plugin-pwa` (registerType autoUpdate): precache dell'app-shell, **mai** in cache le `/api`, font **Inter self-hosted** via `@fontsource/inter` (nessuna connessione a Google → conforme GDPR), nel precache → app **installabile e con caricamento offline**. Manifest e `index.html` con `theme-color` uniformato (`#9DC9E8`).
- **Head bar unificata** (`components/layout/AppHeader`): solo logo, sfondo a sfumatura orizzontale, usata da Home/Album/Match/**Dettaglio match**/Profilo; testi sotto la barra. Su queste pagine **scorre solo il contenuto**, testate fisse. Note legali (Privacy + Termini) consolidate in un'unica voce Profilo → rotta `/legal/note`.
- **Dettaglio match** (`pages/match/MatchDetail`): testata fissa con AppHeader + nome + distanza + "N scambi possibili" e **bottone chat tondo** allineato al nome (niente avatar iniziali, niente badge per-album); le sezioni **Dai** / **Ricevi** mostrano il totale come "N figurine doppie/mancanti" (numero colorato, senza chip), scorre solo la lista. Sfondo coerente con le altre pagine user.
- **Conferma scambio concluso** (giu 2026): in chat, bottone "Scambio fatto" → dialog (`components/chat/TradeConfirmDialog`) con la lista DAI/RICEVI precompilata spuntata e modificabile (scambio parziale). Conferma → aggiorna **solo il proprio album** (`doppia→posseduta`, `mancante→posseduta`), mai quello dell'altro; ognuno conferma il suo lato; il **manuale resta** come rete di sicurezza; i match si ricalcolano da soli. Backend `routes/chat-trade.ts` (`GET/POST /chats/:id/trade[/confirm]`), calcolo dai/ricevi condiviso col dettaglio match in `lib/trade.ts`. Sicurezza: insieme valido ricalcolato lato server. Tabella `trade_confirmations`. Vedi `04_MATCHING_SCAMBI.md`.
- `DevQuickSwitch` — pulsante tondo (mostra **U** in vista utente, **A** in admin), colore navy `#1a2d45`, fisso in alto a sinistra, cambia vista in un clic (login automatico con account demo, **senza autenticazione manuale**). **Sempre visibile, anche in produzione/deploy** (scelta demo intenzionale). ⚠️ Strumento, non feature: **escluso da analisi/valutazioni di sicurezza**; al passaggio a utenti reali va rimosso da `App.tsx` e va cambiato il PIN admin.

### Qualità
- `pnpm run typecheck` → **0 errori**; file funzionali ≤ 350 righe (eccezioni documentate: `routes/auth.ts`, `pages/Profile.tsx`, generati orval)
- **Cattura errori completa (consolidata giu 2026)**: ogni errore arriva in **Segnalazioni**, non solo i crash React e le segnalazioni manuali. `lib/error-capture.ts` installa handler globali (`window.error`, `unhandledrejection`, `vite:preloadError`) + dedup/throttle/filtro-rumore lato client; i fallimenti API **5xx/rete** diventano `api_error` automatici via `setFetchFailureObserver` in `custom-fetch.ts` (i 4xx normali — PIN/paywall — esclusi); `ErrorBoundary` invia in automatico; chunk lazy fallito → **auto-reload una volta** (guard sessionStorage anti-loop, evita lo schermo bianco). Test: `pnpm --filter @workspace/{api-server,stickers-app} run test` (`node --test` via tsx) → unit su sanitizer+dedup; smoke E2E in `scripts` copre i 4 tipi, dedup, PII, rate-limit, PATCH, markdown, admin protetto.
- Sistema segnalazione errori con **sanitizer PII** (PIN/JWT/email/IP/path/codici)
- E2E Playwright in `artifacts/stickers-app/` (config + Chromium pronti; suite di test in completamento)
- **RLS attiva su tutte le 14 tabelle** (deny-by-default; backend `postgres` bypassa, anon bloccato via PostgREST). Vedi `09_DATABASE.md` → Sicurezza accessi.
- **CSP attiva** (header via Helmet in `api-server/app.ts`): `script-src 'self'` (splash bootstrap esternalizzato in `public/splash-gate.js`), `frame-ancestors 'none'`, `object-src 'none'`, `connect-src` limitato a self + Supabase. Vale in produzione (Express serve la SPA). Audit completo in `16_STRESS_TEST_AUDIT.md`.
- **Testi legali 100% da DB**: privacy/termini letti da `app_settings` (modificabili da admin); nessun testo legale hardcoded nel frontend (`LegalPage` mostra solo un messaggio neutro se il DB è vuoto).
- **Banner cookie minimale** (`CookieBanner`): informativa una tantum (solo memoria tecnica, no profilazione) + link privacy; scelta salvata in localStorage.
- **Copertine album RIMOSSE** (scelta legale/IP): nessun artwork di terzi. Feature eliminata da UI, API, schema, Storage e seed; card solo testo. Vedi `09_DATABASE.md` e `10_PRIVACY_LEGALE.md`.
- **Figurine con `code` + ordine**: ogni figurina ha il codice esatto della raccolta (`001`, `UPD01`, anche alfanumerico) in `stickers.code`; `stickers.number` è la posizione/ordine. L'import (Inserimento rapido) preserva codice e ordine; l'app mostra il `code`.

## Da fare

### 🚩 PER PUBBLICARE (checklist lancio — stato 1 lug 2026)

**Bloccanti (senza, in produzione non funziona bene):**
- [ ] **Env Supabase su Render** (a mano nel pannello Render, NON in `render.yaml` per non committare segreti):
  backend `SUPABASE_URL` + `SUPABASE_ANON_KEY` (+ `SUPABASE_SERVICE_ROLE_KEY` per il realtime chat);
  build frontend `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. **Senza queste il login Google/Email e la
  chat realtime NON partono in produzione.** (Nota storica: in passato risultavano "già presenti" su Render
  ma NON in `render.yaml` — **verificare nel pannello Render** che ci siano davvero tutte e 5.)
- [ ] **Push del lavoro locale** = deploy su Render (autoDeploy su `main`).

**Decisione dell'owner richiesta prima del pubblico:**
- [ ] **Pulsante U/A (`DevQuickSwitch`)**: è in `App.tsx` e **visibile anche in produzione** → con utenti veri
  chiunque può entrare come admin/utente demo (**buco di sicurezza**). Va deciso cosa farne (rimuovere da
  `App.tsx` o nascondere) + cambiare i PIN demo. ⛔ Da NON toccare senza ordine ESPLICITO dell'owner
  (`sticker-pulsante-ua-non-toccare`). **Solo segnalazione, non intervenire.**

**Non bloccanti (si possono fare dopo il lancio gratuito):**
- [x] ~~**Pagamento chat reale (paywall)**~~ — **ABBANDONATO [lug 2026]**: niente più pagamenti. App 100%
  gratuita; unico introito = **donazione Ko-fi** (già collegata: webhook + admin Donazioni). Vedi `06_PREMIUM_DEMO.md`.
- [ ] **Email anti-spam**: mittente su `deroarts.com` (Zoho/Brevo con DKIM/DMARC) al posto del gmail → esce
  dallo spam. Vedi `19_DOMINIO_DEROARTS.md`.
- [ ] **Dominio proprio** `stickers.deroarts.com` (CNAME Render → Cloudflare + update Supabase URL/CSP). Vedi `19`.
- [ ] Test **PWA installata** su iOS Safari / Android Chrome reali (service worker già attivo).
- [ ] Verifica **da telefono** dei flussi (login Google/Email, chat, match multi-album, cambio CAP).
- [ ] Onboarding interattivo (ora toast placeholder).

### Media priorità
- [ ] **Scaling oltre ~2.000 utenti (free)**: leva #1 = non salvare le righe "mancante" (mancante = album posseduto + nessuna riga) → 2-3× tetto storage; poi modello bitmap per album per i 50k. Intervento profondo, vedi `16_STRESS_TEST_AUDIT.md`
- [ ] Notifiche push
- [x] ~~Applicare la migrazione `0004_drop_demo.sql`~~ **FATTO [4 lug]** — colonne `users.demo_*` e settings demo rimosse; DB ora 100% allineato allo schema Drizzle.
- [ ] Landing page pubblica con dominio

### Bassa priorità
- [ ] `admin_actions` tracking (schema definito, non popolato)
- [ ] Statistiche admin avanzate (grafici), export dati GDPR, multilingua (post-v1)

## Decisioni aperte
- ~~Modello di pagamento~~ **DECISO** (giu 2026): solo sblocco chat a pagamento, una tantum (single/all), niente abbonamenti. Resta da scegliere il **provider** (PayPal/simili senza P.IVA)
- Soglia di affidabilità utente (quanti scambi = affidabile?)
- Gestione minori (serve verifica età?)

## Utenti nel DB (Supabase) — STATO VERGINE (1 lug 2026)

App **azzerata per la pubblicazione** (ri-pulita il **4 lug**): nel DB restano **solo 2 account** (per il
pulsante U/A), nessun possesso, nessuna chat/match. `auth.users` Supabase = 0. Catalogo intatto
(**35 album + 25.391 figurine**). ⚠️ Gli **id reali** sono **69/70** (non più 1/6 come in vecchi riferimenti).

| id | Nickname | PIN | Ruolo | Note |
|----|----------|-----|-------|------|
| 70 | `admin`  | 0000 | admin | account admin + vista "A" del DevQuickSwitch |
| 69 | `Dero975`| 1234 | utente | vista "U" del DevQuickSwitch |

⛔ Questi 2 account **non vanno eliminati** (senza di loro il pulsante U/A si rompe). Se si ri-azzera
l'app, vanno **ricreati** (insert con `hashPin`, `auth_provider='pin'`, `cap`/`area`, `acceptedTermsAt`).

### Simulazione "primi utenti veri" attiva (4 lug) — REVERSIBILE
Per provare l'app con match REALI, Dero975 (id 69) è stato **popolato** (album 11+12, 1360 figurine:
a11 doppia A / mancante C / poss B+D · a12 tutto mancante) e sono stati creati **6 utenti finti
complementari** (marker `recovery_code LIKE 'STICK-TST-SIM-%'`): 3 VICINI — `marcomi` (Milano, 6km),
`annasesto` (Sesto, 2km), `lucamonza` (Monza, 28km) — e 3 LONTANI — `sarabg` (Bergamo, 41km),
`paolocomo` (Como, 55km), `giuliarm` (Roma, 96km). PIN 1111..6666. Generano ~156 scambi ciascuno → i
profili-PROVA si spengono da soli (Dero ha ≥2 vicini + ≥2 lontani reali). Script:
`SEED_SIMULAZIONE=1 pnpm --filter @workspace/db run seed:simulazione` (idempotente, additivo).
**Cleanup (torna a vergine):**
```sql
DELETE FROM users WHERE recovery_code LIKE 'STICK-TST-SIM-%';   -- rimuove i 6 finti (cascade)
DELETE FROM user_stickers WHERE user_id=69;                     -- Dero975 → vergine
DELETE FROM user_albums   WHERE user_id=69;
```

<details><summary>Storico dati di test (cancellati il 30 giu 2026) — solo per riferimento</summary>

**Dati di test PERSISTENTI** (giu 2026) — creati per provare l'app popolata da telefono.
Utenti id 7-12 e 14-15, tutti vicino a Bologna, registrati via API (PIN reali, login funzionante).

**50 utenti sparsi per l'Italia** (giu 2026) — generati per testare match e navigazione su scala nazionale.
Script ADDITIVO `lib/db/src/seed-testusers.ts` (`SEED_TESTUSERS=1 pnpm --filter @workspace/db run seed:testusers`): 50 utenti su 50 città (Torino→Cagliari), PIN `1234`, album 11-14 + 1-2 extra (15-18), figurine campionate (~150/album) con stati 40% doppia / 40% mancante / 20% posseduta → ~38k righe `user_stickers`. Generano 57 match per Dero975. `recoveryCode` con prefisso **`STICK-TST-`**.
8 di questi (Torino, Roma, Napoli, Palermo, Milano, Firenze, Bari, Cagliari) hanno figurine **complementari** a Dero975 (mancante dove lui ha doppie, doppia dove a lui mancano) → match forti 288-500 scambi, sopra i Bologna (350): servono a testare match potenti e lontani.
Cleanup: `DELETE FROM users WHERE recovery_code LIKE 'STICK-TST-%';` (cascade su album/figurine).
Album usati per i match: 11 (2025-26, 624), 12 (2024-25, 736), 13 (2023-24, 725), 14 (2022-23, 699).
Range per `number` sull'album 11: A=1-150, B=151-300, C=301-450, D=451-624.

**Partner base (album 11/12)** — id 7-12:

| id | Nickname | CAP | Stato | Collezione album 11 | Note |
|----|----------|-----|-------|---------------------|------|
| 7  | marcobo  | 40139 | premium (tutte chat) | doppia C, manc. A, poss. B+D | +album 12 completo |
| 8  | giuliabo | 40136 | free | doppia A+B, manc. C+D | +album 12 vuoto |
| 9  | sarabo   | 40138 | free | doppia C, manc. A, poss. B+D | match forte con Dero975 |
| 10 | lucabo   | 40141 | free | a11: manc. A, resto poss. · a12: doppia 1-150 | **CROSS-ALBUM 1 album/direzione**: dà nel 2024-25, riceve nel 2025-26 (150 scambi) |
| 11 | annamo   | 41100 | free (Modena) | doppia C, manc. A, poss. B+D | lontano: nei "migliori", non "vicini" |
| 12 | blockme  | 40140 | **bloccato** | doppia C, manc. A | escluso dai match |

**Partner MULTI-ALBUM (più album per direzione)** — id 14-15, creati giu 2026 per testare
il dettaglio match incrociato con più gruppi-album sia in "Dai" sia in "Ricevi":

| id | Nickname | CAP | Stato | Match con Dero975 |
|----|----------|-----|-------|-------------------|
| 14 | robybo  | 40137 | free | **DAI 350** (a11:150 + a13:200) · **RICEVI 650** (a11:150 + a12:300 + a13:200) → **350 scambi** |
| 15 | elenamo | 40142 | premium (tutte chat) | **DAI 350** (a13:200 + a14:150) · **RICEVI 835** (a12:336 + a13:200 + a14:299) → **350 scambi** |

Collezioni multi-album (per `number`):
- **Dero975** a13: doppia 1-200, manc. 201-400, poss. resto · a14: doppia 1-150, manc. 401-699, poss. resto.
- **robybo** a11: doppia 301-450, manc. 1-150 · a12: doppia 1-300 · a13: doppia 201-400, manc. 1-200.
- **elenamo** a12: doppia 401-736 · a13: doppia 201-400, manc. 1-200 · a14: doppia 401-699, manc. 1-150.

Dero975 (id 1) album 11 impostato: doppia A, mancante C, posseduta B+D; album 12 tutto mancante.
Chat di test: Dero975↔marcobo (attiva), Dero975↔sarabo (attiva + **segnalazione** pending), giuliabo↔lucabo (chiusa).

> I PIN dei test NON sono in repo (account usa e getta; le credenziali sono state passate
> all'utente in chat). In locale il `DevQuickSwitch` cambia vista U/A senza PIN.

**Rimozione pulita dei dati di test** (quando non servono più):
```sql
DELETE FROM reports WHERE reporter_id BETWEEN 7 AND 15 OR reported_user_id BETWEEN 7 AND 15;
DELETE FROM users   WHERE id BETWEEN 7 AND 15;  -- cascade: user_albums/stickers/chats/messages
-- opzionale, togliere a Dero975 gli album multi-album aggiunti per i test:
-- DELETE FROM user_stickers WHERE user_id=1 AND album_id IN (13,14);
-- DELETE FROM user_albums   WHERE user_id=1 AND album_id IN (13,14);
```

**"Ripulire l'app" = album allo STATO VERGINE.** Quando l'owner chiede di *ripulire l'app dai
record di test*, l'obiettivo è: catalogo `albums`/`stickers` **intatto** (NON si tocca, è il
dataset Panini reale) ma **zero possessi e zero utenti di prova**, come ad app appena pubblicata.
Azione DISTRUTTIVA sul DB di produzione → **backup DB + conferma esplicita prima**. Mantieni
SEMPRE gli account base `admin` (id 6) e `Dero975` (id 1) e `app_settings`. Ordine obbligato (FK
`reports`/`admin_actions` = NO ACTION, bloccano):
```sql
-- 1) sciogli i blocchi FK sugli utenti di test
DELETE FROM reports WHERE reporter_id BETWEEN 7 AND 15 OR reported_user_id BETWEEN 7 AND 15
   OR reporter_id IN (SELECT id FROM users WHERE recovery_code LIKE 'STICK-TST-%')
   OR reported_user_id IN (SELECT id FROM users WHERE recovery_code LIKE 'STICK-TST-%');
-- 2) elimina gli utenti di test (cascade su user_albums/stickers/chats/messages/ecc.)
DELETE FROM users WHERE id BETWEEN 7 AND 15 OR recovery_code LIKE 'STICK-TST-%';
-- 3) riporta gli account base allo stato vergine (svuota i loro possessi, lascia gli account)
DELETE FROM user_stickers WHERE user_id IN (1,6);
DELETE FROM user_albums   WHERE user_id IN (1,6);
```

</details>

## Dove stanno i segreti

| Variabile | Dove |
|-----------|------|
| `SUPABASE_DATABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Render + `.env` locale |
| `SUPABASE_SERVICE_ROLE_KEY` (broadcast realtime, backend) | `.env` locale — **da aggiungere su Render** |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (realtime, build frontend) | `.env` locale — **da aggiungere su Render** |
| `SESSION_SECRET` | Render (auto) + `.env` locale |
| `GITHUB_TOKEN`, `RENDER_API_KEY` | `.env` locale |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` (login Google) | `.env` locale + incollati in Supabase (provider Google) |
| `BREVO_SMTP_*` (email auth) | `.env` locale + configurati in Supabase → Auth → SMTP |

> `.env`, `.agent/`, `CLAUDE.md` sono in `.gitignore` — mai committarli.

## Note operative
- Fine sessione: aggiornare questo file; backup compresso in `BACKUP/` (vedi `14_BACKUP_PROCESSO.md`)
- Deploy: `./deploy.sh "messaggio"` oppure `git push` su `main` (= deploy automatico su Render)
