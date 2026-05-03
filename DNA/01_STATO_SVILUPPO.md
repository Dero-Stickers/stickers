# DNA — Stato Sviluppo

Ultimo aggiornamento: 2 Maggio 2026 — Sessione 6 (Security Hardening + Performance + Enterprise Final)

## Fix Sessione 6 — Security Hardening + Performance ✅

### Sicurezza autenticazione (BLOCKER risolti) 🔐
- **Token firmati HMAC-SHA256** ✅ — sostituito il vecchio
  `base64(JSON({userId,isAdmin}))` con un token a 3 segmenti firmato:
  `v1.<payload-base64url>.<HMAC-SHA256-base64url>`. Implementazione in
  `artifacts/api-server/src/lib/auth.ts` usando `crypto.createHmac` (zero
  dipendenze esterne) + `timingSafeEqual` per evitare timing attack. La chiave
  di firma usa `SESSION_SECRET` (già presente come Replit Secret).
- **Backward-compat legacy rimossa** ✅ — il vecchio decoder base64 era una
  vulnerabilità grave (qualunque utente poteva forgiare un token admin
  scrivendo `base64('{"userId":6,"isAdmin":true}')`). Rimosso completamente
  dopo il re-seed con i nuovi hash. Test di forgery: legacy base64 → 401,
  v1 con firma errata → 401, token valido firmato → 200.
- **Password hashing scrypt** ✅ — `pinHash` e `securityAnswerHash` ora usano
  `crypto.scryptSync` (Node built-in, OWASP-compliant) con salt random per
  utente. Formato: `scrypt$<salt-base64>$<hash-base64>`. Il vecchio
  `Buffer.from(pin + "sticker_salt").toString("base64")` (insicuro: salt
  costante, niente stretching) è stato sostituito sia nel server (`lib/auth.ts`)
  sia nel seed (`lib/db/src/seed.ts`). DB re-seedato con i nuovi hash.
- **CORS lockdown** ✅ — `app.use(cors())` permissivo sostituito con allowlist:
  `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN`, `*.replit.app` (sempre), `*.replit.dev`
  (solo dev), `localhost:*` (solo dev), più `CORS_ORIGINS` env var per origini
  custom in produzione. Test: origin valido → 204 + ACAO header, origin non
  in allowlist → 200 senza ACAO (browser blocca, comportamento corretto).

### Code consolidation 🧹
- **Middleware `requireAuth`/`requireAdmin` centralizzato** ✅ — eliminate
  6 copie duplicate del decoder base64 sparse fra `matches.ts`, `chats.ts`,
  `albums.ts`, `user-albums.ts`, `admin.ts`, `settings.ts`. Tutto ora passa
  per `artifacts/api-server/src/middlewares/auth.ts` (un'unica fonte di
  verità). Legacy DRY violation chiusa.
- **`lib/auth.ts`** ✅ — modulo unico per token signing, scrypt hashing e
  verifica timing-safe. Riusabile, testabile, isolato.

### Performance frontend ⚡
- **Lazy loading route** ✅ — `App.tsx` ora carica le pagine pesanti via
  `React.lazy` + `Suspense`: tutte le 7 pagine admin + le 5 pagine utente
  non critiche (AlbumDetail, MatchList, MatchDetail, ChatRoom, Profile)
  sono code-split. Login + Home + AlbumList restano eager (above-the-fold).
  Fallback: `PageSkeleton` con shadcn `Skeleton` componente.
- **Bundle size** ✅ — bundle iniziale ~493 KB (152 KB gzip), pagine
  separate 2-7 KB ciascuna gzippate. Build production verificata
  (`vite build`).

### Hardening enterprise extra (review architect Sessione 6) ⚙️
- **scrypt asincrono** ✅ — `hashPin`/`verifyPin`/`hashAnswer` sono ora
  `async` e usano `crypto.scrypt` promisificato (`util.promisify`). In
  precedenza `scryptSync` bloccava l'event-loop sotto burst di login,
  creando un rischio DoS. Aggiornati tutti i call site in
  `routes/auth.ts` (await + loop esplicito su `verifyPin` per supportare
  più match nickname/CAP).
- **Token TTL** ✅ — il payload firmato include ora `iat` + `exp` (default
  30 giorni). `verifyToken` rifiuta i token con `exp` passato (401). Test
  con token sintetico expired: 401 confermato.
- **Rate limiting in-memory** ✅ — nuovo helper `checkRateLimit` /
  `resetRateLimit` in `lib/auth.ts` (sliding-window per chiave). Applicato
  a `POST /api/auth/login` (8 tentativi / 5 min per IP+nickname) e
  `POST /api/auth/recover` (5 tentativi / 15 min per IP). Il limit reset
  al primo login riuscito. Risponde `429` con header `Retry-After`.
  Cleanup automatico del Map ogni 60s. Test verificato: 8 tentativi
  errati → 401, dal nono → 429.

---

Ultimo aggiornamento precedente: 2 Maggio 2026 — Sessione 5 (E2E Testing + Enterprise Cleanup)

## Fix Sessione 5 — E2E Testing + Enterprise Cleanup ✅

### Bug critici corretti (scoperti via Replit App Testing)
- **Auth race condition** ✅ — `AuthContext.tsx` ora idrata sincronamente da
  localStorage tramite `readInitialAuth()` chiamata nello stato iniziale.
  Le route protette vedono `isAuthenticated=true` al primo render, niente più
  flash su `/login` su deep-link/refresh.
- **Hardening refresh sessione** ✅ — `/api/auth/me` ora pulisce la sessione
  **solo** su 401/403 (non più su 5xx). `AbortController` scope il fetch al
  ciclo di vita del componente. Guard `localStorage.getItem(TOKEN_KEY) === token`
  previene overwrite da risposte stale dopo user switch.
- **`useAuthRedirect` hook** ✅ — `setLocation` chiamato durante il render era
  un anti-pattern; ora wrappato in `useEffect` tramite hook dedicato in `App.tsx`.
- **Demo gating mancante** ✅ — utenti `demo_expired` ora vedono
  `DemoExpiredScreen` su `/match`, `/match/:userId`, `/chat/:chatId`. Le route
  `/`, `/album`, `/profilo` restano accessibili (visibilità + upgrade).
- **Hydration warning Home.tsx** ✅ — `<p>` che avvolgeva `<Skeleton>` (un `<div>`)
  cambiato in `<div>` (linea 92).

### Code governance ✅
- **Dead code rimosso** ✅ — eliminata cartella `artifacts/stickers-app/src/mock/`
  (6 file: albums, chats, matches, settings, stickers, users) — zero referenze
  nel codice attivo, era residuo della Fase 1.
- **TypeScript pulito** ✅ — `pnpm run typecheck` ora passa interamente.
  Le declarations dei lib (`lib/db`, `lib/api-zod`, `lib/api-client-react`)
  sono buildate; lo script `typecheck` root le rigenera automaticamente.
- **Workflow consolidation** ✅ — rimossi i workflow custom duplicati
  `API Server` / `Stickers App`. Ora gestiti dagli artifact registrati:
  `artifacts/api-server: API Server` e `artifacts/stickers-app: web`.

### Database (Sessione 4)
- **search_path Supabase** ✅ — `lib/db/src/index.ts` usa
  `pool.on("connect", c => c.query("SET search_path TO public"))`. Il vecchio
  `options: "--search_path=public"` era sintassi sbagliata e causava
  `relation "users" does not exist`.
- **Doppio DB allineato** ✅ — schema + seed pushati sia su Supabase (via
  `SUPABASE_DATABASE_URL` Replit Secret) sia sul Replit PostgreSQL locale
  (`DATABASE_URL`, fallback dev).
- **DB Setup workflow** rimosso dall'avvio automatico — manuale via
  `cd lib/db && pnpm push-force && pnpm seed`.

---

Ultimo aggiornamento precedente: 2 Maggio 2026 — Sessione 3 (Production Readiness Pass)

## Completato ✅

### Infrastruttura
- Struttura monorepo (artifacts/stickers-app + artifacts/api-server)
- PROJECT_SPEC completo (00-11)
- DNA folder con documentazione aggiornata (00-06)
- OpenAPI spec per tutti gli endpoint
- Codegen (React Query hooks + Zod schemas)
- Schema DB (Drizzle ORM, type-safe)

### Database
- Schema Drizzle pushato su **Supabase** ✅
- Seed realistico su Supabase: 6 utenti, 4 album, 120 figurine, match, chat ✅
- `lib/db/src/index.ts` → usa `SUPABASE_DATABASE_URL` (con trim automatico) ✅
- `lib/db/drizzle.config.ts` → configurato per Supabase ✅

### Backend (API Server)
- Express 5 + TypeScript + pino logger
- Route complete: auth, albums, stickers, matches, chats, admin, settings, health
- Demo attivazione (configurabile dall'admin, non hardcoded)
- `app.ts` → serving file statici frontend in produzione (per Render) ✅

### Frontend (User App)
- Login + Registrazione (nickname, PIN, CAP, domanda sicurezza)
- Codice di recupero mostrato post-registrazione
- Home dashboard (album, match, stato demo)
- Album: I miei album + Album disponibili + griglia figurine + filtri
- Match: Migliori / Vicini a te + slider distanza + dettaglio multi-album
- Chat: polling 5s, segnalazione, avviso moderazione
- Profilo: codice recupero protetto da PIN, supporto, logout

### Frontend (Admin Panel)
- Dashboard con statistiche
- Album: CRUD completo
- Figurine: gestione per album
- Utenti: lista con stato demo/premium, blocco
- Messaggi: revisione e chiusura chat
- Premium/Demo: configurazione durata demo
- Impostazioni: email supporto, testi base
- **Navigazione mobile** ✅ — hamburger menu top bar per admin su mobile

### Dev Tools
- **DevSwitcher** ✅ — pulsante floating in ogni pagina per switch rapido User↔Admin
  - 6 utenti di test preconfigurati (mario75, luca_fan, giulia_stickers, sofia_ro, roberto_collector, admin)
  - Un clic per cambiare utente senza logout manuale

### Deploy
- `DNA/06_RENDER_DEPLOY.md` ✅ — guida completa per Render
- Serving file statici React in produzione configurato in `api-server/src/app.ts`
- BASE_PATH configurato via env var

---

## Fix Sessione 3 — Production Readiness Pass ✅

### Performance (Critica)
- **N+1 queries eliminato** ✅ — `getBestMatches` / `getNearbyMatches` ora eseguono
  esattamente **5 query DB** indipendentemente dal numero di utenti (era O(4N))
- **Distanza deterministica** ✅ — `estimateDistance()` ora usa formula stabile basata
  su differenza numerica CAP; niente più `Math.random()` (risultati inconsistenti)
- **`getMatchDetail` ottimizzato** ✅ — 4 query parallele invece di N×4 query sequenziali
  (sticker details ora con `inArray` batch, non `.slice(0, 10)` + N queries per sticker)

### Correttezza Dati
- **`batchInsertStickers` totalStickers** ✅ — ora conta TUTTE le figurine nell'album
  dopo l'inserimento (era solo il batch corrente → valore sbagliato su inserimenti multipli)

### UX / Layout
- **Chat room layout** ✅ — ChatRoom non è più dentro MobileLayout (che aveva una nav bar
  fissa in fondo che si sovrapponeva all'input chat); ora usa `ProtectedChatRoute` dedicato
- **Back button chat** ✅ — `window.history.back()` invece di hardcoded `/match`
- **Admin navigazione mobile** ✅ — hamburger menu con dropdown per tutte le sezioni admin
- **Badge messaggi non letti** ✅ — icona Match nella bottom nav mostra badge rosso
  con contatore messaggi non letti

### Resilienza
- **React Error Boundary** ✅ — `<ErrorBoundary>` avvolge l'intera app; qualsiasi
  errore non gestito mostra una schermata di recupero invece di crashare
- **Supabase keep-alive** ✅ — `keepalive.ts` esegue `SELECT 1` ogni 12 ore per
  mantenere il progetto Supabase Free attivo

---

## In Progresso 🔄

- Test navigazione completa su tutti i flussi post-fix
- GitHub push (bloccato in sandbox Replit — richiede azione manuale o project task)

## Da Fare (Prossime Sessioni) 📋

### Alta Priorità
- [ ] PWA manifest + service worker (Fase 3 roadmap)
- [ ] Test su iOS Safari e Android Chrome
- [ ] Onboarding guide interattiva (attualmente mostra toast "in arrivo")
- [ ] Upload copertina album (admin — endpoint presente, UI mancante)
- [ ] Auth: passare a bcrypt + JWT firmato (attualmente base64 JSON — noto, per produzione)

### Media Priorità
- [ ] Rate limiting sulle API (attualmente nessun throttling)
- [ ] Notifiche push (futuro)
- [ ] Pagamenti reali (Stripe o RevenueCat — scelta modello da definire)
- [ ] Landing page pubblica con dominio
- [ ] CORS ristretto a domini di produzione (attualmente `cors()` aperto)

### Bassa Priorità
- [ ] `adminActionsTable` tracking (schema definito, mai popolato)
- [ ] Statistiche avanzate admin (grafici)
- [ ] Esportazione dati utente (GDPR)
- [ ] Multilingua (mai nella v1)

---

## Utenti di Test (Supabase) 🔑

| Nickname | PIN | Stato | Note |
|----------|-----|-------|------|
| mario75 | 1234 | demo_active | ~20h rimaste |
| luca_fan | 5678 | premium | — |
| giulia_stickers | 9999 | free | — |
| sofia_ro | 1111 | demo_expired | — |
| roberto_collector | 2222 | premium | — |
| admin | 0000 | admin | Accesso pannello admin |

## Secrets Configurati

| Variabile | Dove | Note |
|-----------|------|------|
| `SUPABASE_DATABASE_URL` | Replit Secrets | Connessione DB Supabase (con SSL) |
| `SUPABASE_ANON_KEY` | Replit Secrets | Chiave pubblica Supabase |
| `GITHUB_TOKEN` | Replit Secrets | Push su github.com/Dero-Stickers/stickers |
| `SUPABASE_URL` | Replit Env | https://kuigzaqaewgcosfhahkv.supabase.co |

## Blocchi Aperti ⚠️

- GitHub push: `git push` è bloccato nel sandbox Replit principale.
  **Soluzione**: usare il progetto task di Replit o pushare manualmente dal terminale locale.
- PIN hash: attualmente usa base64 + salt (dev). In produzione → usare bcrypt + JWT firmato.
- Auth token: `base64(JSON{userId,isAdmin})` è forgiabile; non adatto a produzione.
  **Soluzione pianificata**: migrare a `jsonwebtoken` con secret env var.

## Decisioni da Prendere

- Modello pagamento (una tantum / mensile / annuale)
- Soglia affidabilità utente (quanti scambi = affidabile?)
- Gestione minori (serve verifica età?)

## Sessione 7 (2026-05-02)

### Bug fix
- Risolto "Errore di connessione" su login: aggiunto Vite proxy `/api -> http://localhost:8080`.

### Frontend cleanup mock
- Cancellato `DevSwitcher.tsx` con array hardcoded utenti.
- Rimosso hint "Demo: mario75/1234 — Admin: admin/0000" dalla Login.
- Tutti i dati ora arrivano esclusivamente da Supabase via API.

### Dev tooling
- Aggiunto `DevQuickSwitch` (cerchio U/A) bottom-right su tutte le pagine, attivo solo `import.meta.env.DEV`.

### PWA mobile-first
- `index.html` con viewport-fit=cover, theme-color, apple-mobile-web-app-* meta, OG tags.
- `manifest.webmanifest` completo (display standalone, orientation portrait, icons any+maskable).
- Set icone ottimizzato: favicon.ico, favicon-16/32, apple-touch-icon 180, icon-192, icon-512, icon-maskable-512 (~120KB totali).
- CSS mobile: 100dvh, safe-area, overscroll, no auto-zoom iOS, utility pb-safe/pt-safe/mb-safe.

### Brand
- Logo `logo.svg` integrato via componente `<AppLogo />` in Login, Home, AdminLayout (sostituite scritte STICKERS/MATCHBOX).
- Splash screen 4.5s con fade in/out, gestito da sessionStorage (1 volta per sessione).

### E2E + review
- runTest E2E completo PASS: auth, user flows (album, match, profilo), admin flows, isolamento sessioni multi-utente, nessun errore connessione/CORS.
- Architect review PASS round 4: typecheck + build OK, nessun import rotto, proxy corretto.
