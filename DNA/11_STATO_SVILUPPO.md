# DNA — Stato Sviluppo

Aggiornato: 29 giugno 2026

> Fotografia dello **stato attuale** (non un changelog). Tenere aggiornato questo
> file a fine sessione. I dati nel DB sono di **test/finti**.

## In sintesi

Sticker Matchbox è **funzionante in locale e live in produzione** su Render.
Stack: monorepo pnpm · React 19 + Vite + TS · Express 5 + Drizzle · Supabase.

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
- **Admin**: Dashboard, Album CRUD, Figurine, Utenti (blocco), Messaggi (moderazione), Monetizzazione, Impostazioni, Segnalazioni errori
- **Layout admin consolidato** (`components/admin/AdminPage` + `AdminTable` + `AdminScrollArea`): testata di pagina fissa, **solo il contenuto/lista scorre**; tabelle con intestazioni centrate e sticky, griglia verticale, righe a colorazione alternata, densità compatta. Album: azione unica **Gestisci** (rinomina + figurine), stato **On Line/Off Line**, colonna **Utenti** (`userCount` lato admin), ordine stabile per id (Off Line non sposta la riga). Vedi `07_ADMIN_PANNELLO.md`.
- **Monetizzazione — sblocco chat a pagamento** (giu 2026, sostituisce la demo a tempo): app 100% gratis, si paga **solo** per aprire la chat di un match. Due acquisti una tantum: **una chat** (`single`) o **tutte le chat** (`all` = `isPremium`). Interruttore master `chat_paywall_enabled` in `app_settings` (default **OFF** = tutte le chat gratis). Logica unica server-side in `api-server/src/lib/billing.ts` (`canOpenChat`/`grantChatUnlock`/`grantAllChats`); gate in `routes/chats.ts` (403 `PREMIUM_REQUIRED` solo per chat **nuova**). Tabelle `payments` + `chat_unlocks`. Pagamento reale **non ancora collegato** (`routes/billing.ts` → checkout stub inerte). Admin **Monetizzazione**: master switch + prezzi + tabella unica consolidata con filtri. Vedi `06_PREMIUM_DEMO.md`.
- Lazy loading route (bundle iniziale ~152 KB gzip), ErrorBoundary
- PWA mobile-first: manifest, icone, splash, safe-area (icone PNG ottimizzate con pngquant, ~−50% peso senza perdita visibile; logo `.webp`). **Service worker** via `vite-plugin-pwa` (registerType autoUpdate): precache dell'app-shell, **mai** in cache le `/api`, font **Inter self-hosted** via `@fontsource/inter` (nessuna connessione a Google → conforme GDPR), nel precache → app **installabile e con caricamento offline**. Manifest e `index.html` con `theme-color` uniformato (`#9DC9E8`).
- **Head bar unificata** (`components/layout/AppHeader`): solo logo, sfondo a sfumatura orizzontale, usata da Home/Album/Match/**Dettaglio match**/Profilo; testi sotto la barra. Su queste pagine **scorre solo il contenuto**, testate fisse. Note legali (Privacy + Termini) consolidate in un'unica voce Profilo → rotta `/legal/note`.
- **Dettaglio match** (`pages/match/MatchDetail`): testata fissa con AppHeader + nome + distanza + "N scambi possibili" e **bottone chat tondo** allineato al nome (niente avatar iniziali, niente badge per-album); le sezioni **Dai** / **Ricevi** mostrano il totale come "N figurine doppie/mancanti" (numero colorato, senza chip), scorre solo la lista. Sfondo coerente con le altre pagine user.
- **Conferma scambio concluso** (giu 2026): in chat, bottone "Scambio fatto" → dialog (`components/chat/TradeConfirmDialog`) con la lista DAI/RICEVI precompilata spuntata e modificabile (scambio parziale). Conferma → aggiorna **solo il proprio album** (`doppia→posseduta`, `mancante→posseduta`), mai quello dell'altro; ognuno conferma il suo lato; il **manuale resta** come rete di sicurezza; i match si ricalcolano da soli. Backend `routes/chat-trade.ts` (`GET/POST /chats/:id/trade[/confirm]`), calcolo dai/ricevi condiviso col dettaglio match in `lib/trade.ts`. Sicurezza: insieme valido ricalcolato lato server. Tabella `trade_confirmations`. Vedi `04_MATCHING_SCAMBI.md`.
- `DevQuickSwitch` — pulsante tondo (mostra **U** in vista utente, **A** in admin), colore navy `#1a2d45`, fisso in alto a sinistra, cambia vista in un clic (login automatico con account demo, **senza autenticazione manuale**). **Sempre visibile, anche in produzione/deploy** (scelta demo intenzionale). ⚠️ Strumento, non feature: **escluso da analisi/valutazioni di sicurezza**; al passaggio a utenti reali va rimosso da `App.tsx` e va cambiato il PIN admin.

### Qualità
- `pnpm run typecheck` → **0 errori**; file funzionali ≤ 350 righe (eccezioni documentate: `routes/auth.ts`, `pages/Profile.tsx`, generati orval)
- Sistema segnalazione errori con **sanitizer PII** (PIN/JWT/email/IP/path/codici)
- E2E Playwright in `artifacts/stickers-app/` (config + Chromium pronti; suite di test in completamento)
- **RLS attiva su tutte le 11 tabelle** (deny-by-default; backend `postgres` bypassa, anon bloccato via PostgREST). Vedi `09_DATABASE.md` → Sicurezza accessi.
- **Testi legali 100% da DB**: privacy/termini letti da `app_settings` (modificabili da admin); nessun testo legale hardcoded nel frontend (`LegalPage` mostra solo un messaggio neutro se il DB è vuoto).
- **Banner cookie minimale** (`CookieBanner`): informativa una tantum (solo memoria tecnica, no profilazione) + link privacy; scelta salvata in localStorage.
- **Copertine album RIMOSSE** (scelta legale/IP): nessun artwork di terzi. Feature eliminata da UI, API, schema, Storage e seed; card solo testo. Vedi `09_DATABASE.md` e `10_PRIVACY_LEGALE.md`.
- **Figurine con `code` + ordine**: ogni figurina ha il codice esatto della raccolta (`001`, `UPD01`, anche alfanumerico) in `stickers.code`; `stickers.number` è la posizione/ordine. L'import (Inserimento rapido) preserva codice e ordine; l'app mostra il `code`.

## Da fare

### Alta priorità
- [ ] **Email di recupero**: attivare un servizio di invio email (SMTP / Supabase). La struttura auth è già pronta (login nickname+PIN, identità slegata dal CAP); una volta attiva, il recupero può passare all'email e si può ritirare la domanda di sicurezza. Vedi `02_UTENTI_AUTENTICAZIONE.md` → "Email di recupero (futuro)".
- [ ] **Verifica da telefono** i flussi cambiati (sessione 28 giu 2026): login **solo nickname+PIN**, Profilo → **Cambia zona (CAP)**, dettaglio match **a fisarmonica**, match **cross-album multi-album**.
- [ ] Test PWA installata su iOS Safari / Android Chrome reali (service worker già attivo)
- [ ] Attivare il realtime in produzione: aggiungere su Render `SUPABASE_SERVICE_ROLE_KEY` (backend) e `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (build frontend). Senza queste, la chat resta in fallback polling 30s.
- [ ] Onboarding interattivo (ora mostra un toast placeholder)

### Media priorità
- [ ] **Scaling oltre ~2.000 utenti (free)**: leva #1 = non salvare le righe "mancante" (mancante = album posseduto + nessuna riga) → 2-3× tetto storage; poi modello bitmap per album per i 50k. Intervento profondo, vedi `16_STRESS_TEST_AUDIT.md`
- [ ] Notifiche push
- [ ] **Collegare il pagamento reale** (ultimo step monetizzazione): provider **senza P.IVA** (PayPal o simili — Stripe richiede P.IVA), prima in **test**. Il checkout (`routes/billing.ts`, oggi stub inerte) deve creare la riga `payments` pending + URL pagamento; un **webhook** sul pagamento confermato chiama `grantChatUnlock`/`grantAllChats`. Schema e gate già pronti. Vedi `06_PREMIUM_DEMO.md`
- [ ] Applicare la migrazione `0004_drop_demo.sql` (DROP colonne/impostazioni demo — distruttiva, a mano, da confermare)
- [ ] Landing page pubblica con dominio

### Bassa priorità
- [ ] `admin_actions` tracking (schema definito, non popolato)
- [ ] Statistiche admin avanzate (grafici), export dati GDPR, multilingua (post-v1)

## Decisioni aperte
- ~~Modello di pagamento~~ **DECISO** (giu 2026): solo sblocco chat a pagamento, una tantum (single/all), niente abbonamenti. Resta da scegliere il **provider** (PayPal/simili senza P.IVA)
- Soglia di affidabilità utente (quanti scambi = affidabile?)
- Gestione minori (serve verifica età?)

## Utenti nel DB (Supabase)

Account base: **admin** (id 6) e **Dero975** (id 1, free, CAP 40138 Bologna).
Dero975 possiede gli album **11, 12, 13, 14** (collezione ampliata per i match incrociati multi-album).

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

## Dove stanno i segreti

| Variabile | Dove |
|-----------|------|
| `SUPABASE_DATABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Render + `.env` locale |
| `SUPABASE_SERVICE_ROLE_KEY` (broadcast realtime, backend) | `.env` locale — **da aggiungere su Render** |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (realtime, build frontend) | `.env` locale — **da aggiungere su Render** |
| `SESSION_SECRET` | Render (auto) + `.env` locale |
| `GITHUB_TOKEN`, `RENDER_API_KEY` | `.env` locale |

> `.env`, `.agent/`, `CLAUDE.md` sono in `.gitignore` — mai committarli.

## Note operative
- Fine sessione: aggiornare questo file; backup compresso in `BACKUP/` (vedi `14_BACKUP_PROCESSO.md`)
- Deploy: `./deploy.sh "messaggio"` oppure `git push` su `main` (= deploy automatico su Render)
