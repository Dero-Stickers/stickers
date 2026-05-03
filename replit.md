# Sticker Matchbox — Project Overview

## Overview

Sticker Matchbox is a pnpm monorepo project designed to create a mobile-first Progressive Web App (PWA) for managing sticker collections and facilitating exchanges. The platform allows users to track their sticker albums, identify missing and duplicate stickers, and connect with other collectors for trades. It features a robust backend for user authentication, data management, and real-time chat, alongside an administrative interface for content and user management. The project aims to provide a seamless and engaging experience for sticker enthusiasts, with a focus on intuitive UI/UX and performance.

## User Preferences

- I want iterative development.
- I prefer detailed explanations.
- Ask before making major changes.
- I prefer simple language.
- I like functional programming.
- Do not make changes to the folder `DNA`.

## System Architecture

The project is structured as a pnpm monorepo with four main packages: `artifacts/stickers-app` (React + Vite frontend, mobile-first PWA), `artifacts/api-server` (Express 5 + Drizzle ORM backend), `lib/db` (shared DB schema + Supabase client), and `lib/api-spec` (OpenAPI spec + generated React Query hooks).

**Frontend:**
- Built with React 18, Vite, TypeScript, TailwindCSS, shadcn/ui, Wouter, React Query, and Zod.
- Features a mobile-first PWA design with `100dvh` viewport, safe-area padding, and optimized touch interactions.
- UI uses a consistent color palette: Primary (teal), Dark navy, Gold (accent), Cream, Background, Green (possessed), Red (duplicate).
- Routes include user functionalities like AlbumList, MatchList, ChatRoom, Profile, and an AdminDashboard with specific admin sections.
- Implements lazy loading for non-critical routes using `React.lazy` and `Suspense` to optimize initial bundle size.
- Auth context hydrates synchronously from `localStorage` to prevent redirect flashes.
- `DevSwitcher` component (development-only) provides quick user switching and status display.
- Integrated brand logo (`logo.svg`) used across the application.
- Splash screen displayed on first session load.

**Backend:**
- Developed with Express 5 and Drizzle ORM, backed by PostgreSQL (Supabase).
- Authentication uses HMAC-SHA256 signed tokens with `iat`+`exp` (30-day TTL) and `scrypt` for PIN/security answer hashing.
- Implements rate limiting for login and recovery attempts.
- Centralized `lib/auth.ts` module for token signing, hashing, and rate limiting.
- `middlewares/auth.ts` handles `requireAuth`/`requireAdmin`/`getSession`.
- CORS allowlist configured for development and production environments.
- API endpoints cover user registration, authentication, album management, sticker status updates, match finding, chat, and admin functionalities.
- Health check endpoint `/api/healthz` for deployment monitoring.

**Database:**
- PostgreSQL via Supabase.
- Schema is pushed using Drizzle Kit.
- Local Replit PostgreSQL is synchronized with the schema and seed for development.
- `search_path` is explicitly set to `public` for Supabase compatibility.

**Core Features:**
- Sticker exchange is always 1:1 (one duplicate for one missing).
- Multi-album matching calculates total possible exchanges between users.
- Demo mode activates upon first chat attempt, with a configurable 24-hour duration.
- PIN recovery via a unique `STICK-XXXX-XXXX-XXXX` code.
- Nicknames are unique per CAP (postal code).
- Chat polling every 5 seconds (future plans for WebSockets).

## External Dependencies

- **Supabase:** Used for PostgreSQL database hosting and potentially for real-time functionalities in the future.
- **React 18:** Frontend library for building user interfaces.
- **Vite:** Next-generation frontend tooling for fast development.
- **TypeScript:** Superset of JavaScript for type safety.
- **TailwindCSS:** Utility-first CSS framework for rapid UI development.
- **shadcn/ui:** UI component library.
- **Wouter:** A tiny routing library for React.
- **React Query:** For data fetching, caching, and state management.
- **Zod:** TypeScript-first schema declaration and validation library.
- **Express 5:** Backend web application framework for Node.js.
- **Drizzle ORM:** TypeScript ORM for PostgreSQL.
- **Node.js `crypto` module:** For cryptographic operations like hashing and signing.
## Sessione 7 — Tema azzurro + logo centrato (delta)

- **Palette aggiornata** (`src/index.css`):
  - `--background` → `205 100% 96%` (azzurro chiarissimo, quasi bianco-azzurro)
  - `--sidebar` (headbar) → `205 70% 78%` (azzurro medio, leggermente più scuro del bg)
  - `--sidebar-foreground` → `214 55% 18%` (blu navy per contrasto su sidebar chiaro)
  - `--primary` → `199 75% 38%` (azzurro saturo per CTA)
  - Stessi valori in `.dark` per coerenza (nessun dark mode esposto in UI per ora)
- **Logo centrato in ogni headbar**:
  - Mobile AdminLayout: logo dead-center, label "Admin" assoluta a sinistra, hamburger assoluto a destra
  - Sidebar desktop AdminLayout: logo + sottotitolo centrati (flex-col items-center)
  - Home: logo centrato in alto, sotto riga `Ciao {nickname}` + badge demo
- **Theme-color meta** PWA aggiornato a `#9DC9E8` per coerenza con la headbar.

## Convenzione backup (memorizzata)

- **Formato nome file**: `Backup_<giorno> <Mese italiano>_<H.MM>.tar.gz`
  - Esempio: `Backup_3 Maggio_2.04.tar.gz`
  - Giorno senza zero iniziale, mese in italiano (Gennaio, Febbraio, …, Dicembre), ora in formato `H.MM` (24h, senza zero iniziale sull'ora).
  - Timezone: **Europe/Rome**.
- **Formato compressione**: `tar.gz` (mai zip).
- **Cartella**: sempre dentro `backups/`.
- Esclusi dall'archivio: `node_modules`, `dist`, `.git`, `backups`, `*.log`.

## Recupero account & cambio nickname (sessione recovery)

**Endpoint backend** (tutti rate-limited):
- `POST /api/auth/recover` — reset PIN tramite **codice di recupero** STICK-XXXX-XXXX-XXXX (esistente).
- `POST /api/auth/recover/lookup` — body `{nickname, cap}` → restituisce sempre status 200 con `{securityQuestion: string|null}` (anti-enumerazione: stessa shape per utente esistente/inesistente).
- `POST /api/auth/recover/answer` — body `{nickname, cap, securityAnswer, newPin}` → reset PIN se la risposta è corretta. PIN validato `/^\d{4,6}$/`.
- `PATCH /api/auth/me/nickname` — autenticato, body `{pin, newNickname}`. Rate-limited 5/15min per `userId+IP`. Race-safe via DB unique index `(cap, nickname)`.
- `POST /api/auth/recovery-code` — autenticato, mostra codice a chi conosce il PIN (esistente).

**Frontend**:
- Nuova pagina pubblica `/recover` (`Recover.tsx`) con due flussi: "Ho il codice di recupero" e "Rispondi alla domanda di sicurezza". Link "Hai dimenticato il PIN o il nickname?" sotto il form di Login.
- In `Profile.tsx` nuova voce "Cambia nickname" (dialog con PIN re-confirmation).

**DB**: aggiunto unique index `users_nickname_cap_unique` su `(cap, nickname)` per garantire unicità a livello DB e prevenire race condition.

**PIN policy**: tutti gli endpoint che impostano un PIN richiedono `^\d{4,6}$` (solo cifre).

## Conformità Privacy / GDPR (sessione legal)

**Cosa è stato aggiunto** (minimo legale, niente di superfluo):
- Pagine pubbliche `/legal/privacy` e `/legal/termini` (componente `LegalPage`). Mostrano i testi inseriti dall'admin in `app_settings` (chiavi `privacy_policy` e `terms`); se mancanti, fallback a un testo italiano GDPR-compliant predefinito.
- Link discreti "Privacy · Termini" sotto il form di Login.
- Checkbox obbligatoria di accettazione Privacy + Termini + dichiarazione ≥14 anni nel form di registrazione (zod `acceptTerms: z.literal(true)`).
- Diritto di accesso/portabilità (Art.20): endpoint `GET /api/auth/me/export` + pulsante "Scarica i miei dati" in Profilo. Restituisce JSON con profilo, chat, messaggi, album, figurine. Esclude PIN, codice di recupero, risposta sicurezza.
- Diritto alla cancellazione (Art.17): endpoint `DELETE /api/auth/me` (richiede PIN + parola "ELIMINA") + link discreto "Elimina definitivamente l'account" in Profilo. NON visibile per admin (l'admin non può autocancellarsi). Cascade automatico su chats/messages/user_albums/user_stickers; pulizia esplicita di reports/admin_actions.

**Cosa NON serve** (e quindi non è stato aggiunto):
- Banner cookie: l'app usa solo storage tecnico essenziale (auth token + sessionStorage splash), niente cookie di profilazione né analytics di terzi.
- DPO / registro trattamenti formale: non obbligatori per dati non sensibili e bassi volumi.
- Doppio opt-in email: non si raccolgono email.

## Album Calciatori 2025-2026 + admin Figurine consolidate

**Seed album ufficiale** — `lib/db/src/seed-calciatori.ts`:
- Crea l'album "Calciatori 2025-2026" (pubblicato) con 624 figurine: 618 numeriche (001-618) + 6 bonus K01-K06 (Kinder) mappate a 619-624.
- Idempotente: se l'album esiste già con ≥624 figurine non fa nulla; se esiste con meno, fa wipe & reinsert.
- Eseguire da `lib/db/`: `pnpm exec tsx src/seed-calciatori.ts`.
- Sorgente: `attached_assets/Pasted-001-Trofeo-Serie-A-Enilive-...txt` (path relativo `../../attached_assets/...`).

**Consolidamento admin Figurine → Album**:
- Rimossa pagina `/admin/figurine` (file `pages/admin/Figurine.tsx` cancellato, voce sidebar e route in `App.tsx` eliminate).
- Nuovo componente riutilizzabile `components/admin/AlbumStickersManager.tsx` (inserimento rapido + lista figurine con edit inline).
- Nella tabella di `pages/admin/Albums.tsx` ogni riga ha ora un bottone **Figurine** che apre un Dialog con `AlbumStickersManager` scoped sull'album cliccato. Le figurine non hanno più una sezione admin separata.

## Keep-alive Supabase + Render (24h)

Doppia ridondanza per evitare lo sleep dopo 7gg di inattività su Supabase free e lo spin-down dopo 15min su Render free:

1. **Scheduler interno** (api-server) — fa `SELECT 1` ogni 12h appena il server è up. Log `[keepalive] Started — pinging Supabase every 12h`.
2. **GitHub Actions cron** — `.github/workflows/keepalive.yml`, schedule `17 6 * * *` (06:17 UTC quotidiano). Fa `curl` su `${PROD_URL}/api/healthz/db` (fallback `https://stickers-api.onrender.com`). Sveglia Render e tocca Supabase. Configurabile via repository secret `PROD_URL`.

**Endpoint backend**: `GET /api/healthz/db` → `{status, db, latencyMs, timestamp}`. Pubblico (read-only, niente dati sensibili).

## Hardening admin album/figurine (sessione consolidamento)

Audit architect → fix definitivi su `artifacts/api-server/src/routes/albums.ts`:
- Aggiunto middleware `requireAdmin` su tutte le mutation del catalogo: `POST /api/albums`, `PUT /api/albums/:albumId`, `PATCH /api/albums/:albumId/publish`, `POST /api/albums/:albumId/stickers`, `PUT /api/albums/:albumId/stickers/:stickerId`. Caller non autenticati → 401, non-admin → 403.
- IDOR fix su `updateSticker`: WHERE constraint ora include sia `stickerId` sia `albumId` (impedisce di modificare figurine di altri album passando `:albumId` arbitrario).
- Seed `seed-calciatori.ts`: wipe+reinsert e create+insert ora avvengono in una **transazione Drizzle** (`db.transaction`), così un fallimento parziale non lascia il DB in stato inconsistente.

## Predisposizione produzione multi-utente (5K-10K paying users)

App, DB e server sono stati induriti per gestire migliaia di utenti paganti senza perdita dati. Modifiche fatte in codice + checklist di azioni manuali che SOLO l'utente può eseguire.

### 1. Database (Supabase) — indici e pool

**Indici creati** (via `drizzle-kit push`, già in produzione):

| Tabella | Indice | Scopo |
|---|---|---|
| `stickers` | `stickers_album_number_unique` (UNIQUE album_id+number) | Impedisce duplicati per numero, accelera lookup |
| `stickers` | `stickers_album_idx` (album_id) | List-by-album |
| `user_stickers` | `user_stickers_user_sticker_unique` (UNIQUE user_id+sticker_id) | Anti race-condition + lookup principale |
| `user_stickers` | `user_stickers_user_album_idx` (user_id+album_id) | "tutte le mie figurine di un album" |
| `user_stickers` | `user_stickers_sticker_idx` (sticker_id) | Statistiche sticker |
| `user_albums` | `user_albums_user_album_unique` (UNIQUE) | Anti duplicato + lookup |
| `user_albums` | `user_albums_album_idx` | "chi ha questo album" |
| `chats` | `chats_user1_idx` / `chats_user2_idx` (user+status) | Inbox utente |
| `messages` | `messages_chat_created_idx` (chat_id+created_at) | Ordinamento cronologico chat |
| `messages` | `messages_sender_idx` | Audit per mittente |
| `reports` | `reports_status_idx` (status+created_at) | Coda moderazione |
| `reports` | `reports_reported_user_idx` | Storico utente segnalato |
| `admin_actions` | `admin_actions_admin_created_idx` / `admin_actions_target_user_idx` | Audit log admin |

**Pool pg** (`lib/db/src/index.ts`): max=10 conn, idle=30s, connect-timeout=10s, `allowExitOnIdle:false`, error-handler. Configurabile via env `DB_POOL_MAX`, `DB_POOL_IDLE_MS`, `DB_POOL_CONNECT_TIMEOUT_MS`. `closePool()` esportata per shutdown pulito.

### 2. API server hardening

- **Helmet** attivo (HSTS, X-Frame, X-Content-Type-Options, ecc.). CSP disabilitato perché la SPA serve il proprio.
- **Compression** (gzip/br) — risparmio bandwidth significativo su `/api/albums/*/stickers` (624 figurine).
- **Body limit** 256kb su json/urlencoded (no upload, protezione DoS memoria).
- **Graceful shutdown** in `index.ts`: SIGTERM/SIGINT → stop accept → drain → `closePool()` → exit. Timeout 25s prima del kill forzato. Render manda SIGTERM ad ogni deploy: prima senza, ora le query in-flight finiscono e Supabase non vede TCP rotti.
- **Safety nets**: `unhandledRejection` e `uncaughtException` loggati invece di crashare.
- **Trust proxy** (già presente): `app.set("trust proxy", 1)` per IP rate-limit corretto dietro Render.
- **Rate limit auth** (già presente in `lib/auth.ts`) — in-memory: OK con 1 worker Render, da migrare a Redis se si scala a >1 worker.

### 2.b Fix scalabilità endpoint critici (audit architect)

Riscritti i percorsi caldi che sarebbero collassati con migliaia di utenti:

- **`/api/matches` & `/api/matches/nearby`** (`routes/matches.ts`): prima caricavano in memoria Node TUTTI gli utenti + tutte le loro figurine (≈8MB+/request a 10K utenti). Ora un'unica query con CTE PostgreSQL (`my_dups`, `my_miss`, `my_albums` → JOIN aggregati) ritorna direttamente i top-20 candidati, ordinati per `LEAST(you_give, you_receive)`. `/nearby` aggiunge un pre-filtro per prefisso CAP (3 cifre se ≤5km, 2 se ≤30km) per ridurre il pool prima dell'aggregazione. Latenza attesa: ~50-200ms con 10K utenti vs decine di secondi prima.

- **`GET /api/chats`** (`routes/chats.ts`): prima 3 query per chat (N+1, 50 chat = 150 query). Ora **una singola query** con `LEFT JOIN LATERAL` per ultimo messaggio + COUNT unread, usando gli indici `messages_chat_created_idx` e `chats_user{1,2}_idx`. Ordering già fatto in DB.

- **`GET /api/chats/unread-count`**: prima un loop con 1 query per chat. Ora un singolo `SELECT COUNT(DISTINCT chat_id)` con join, usa l'indice `messages_chat_created_idx`.

- **`POST /api/chats` (openChat)**: race condition risolta con **transazione + advisory lock** `pg_advisory_xact_lock(LEAST, GREATEST)` sulla coppia di user-id ordinati. Due richieste concorrenti per la stessa coppia ora si serializzano e solo un INSERT viene eseguito → niente duplicati di chat.

- **`POST /api/user/albums/:id` (addAlbum)**: prima 2 INSERT non atomici (album + stickers). Ora un'**unica transazione Drizzle** con `onConflictDoNothing` sull'unique index `user_albums_user_album_unique` e `user_stickers_user_sticker_unique`. Idempotente, niente stato inconsistente "album presente, figurine no".

### 3. AZIONI OBBLIGATORIE PER L'UTENTE prima del lancio

Senza questi step l'app **non regge** 5K-10K utenti paganti:

1. **Supabase Pro ($25/mo)** — il piano Free ha:
   - 500 MB DB (10K utenti la saturano in poche settimane)
   - 60 connessioni max
   - **NESSUN PITR** (Point-In-Time Recovery): se un admin cancella per sbaglio, perdi dati
   - Pausa dopo 7gg inattività
   Pro sblocca: 8GB DB, PITR 7 giorni, 200 connessioni dedicate, backup giornalieri 14gg.

2. **Connessione via Pooler Supabase** — usare la URL `aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true` (Transaction mode) come `SUPABASE_DATABASE_URL`, non la `db.<ref>.supabase.co:5432` diretta. Senza pooler, ogni connessione Render consuma uno slot Postgres reale; con pooler 200 connessioni Postgres servono migliaia di client.

3. **Render Starter ($7/mo) o Standard ($25/mo)** — il piano Free:
   - Si addormenta dopo 15min di inattività (cold start ~30s = utenti pagano e vedono pagina bianca)
   - 512 MB RAM, 0.1 CPU
   Starter: always-on, 512 MB ma no sleep. Standard: 2 GB RAM, scalabile orizzontalmente.

4. **Monitoring** — aggiungere Sentry (free tier 5K errori/mese basta) per tracking errori e performance. Variabile `SENTRY_DSN`. Senza monitoring si scoprono i bug solo quando gli utenti lamentano.

5. **Backup esterni** — oltre ai backup automatici Supabase, considera un dump giornaliero su Object Storage / S3 con `pg_dump` (cron via GitHub Actions). 30 secondi di setup salvano da disaster catastrofici.
