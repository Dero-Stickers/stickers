# Sticker Matchbox — Project Overview

## Architecture

pnpm monorepo con 4 package principali:
- `artifacts/stickers-app` — React + Vite frontend (mobile-first PWA)
- `artifacts/api-server` — Express 5 + Drizzle ORM backend
- `lib/db` — Schema DB condiviso + client Supabase
- `lib/api-spec` — OpenAPI spec + hook React Query generati (`@workspace/api-client-react`)

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, shadcn/ui, Wouter, React Query, Zod
- **Backend**: Express 5, Drizzle ORM, PostgreSQL (Supabase)
- **Auth**: Token firmato HMAC-SHA256 formato `v1.<payload-b64url>.<sig-b64url>` (Authorization: Bearer …) con `iat`+`exp` (TTL 30 giorni). Hash PIN/risposta sicurezza con `scrypt` async (Node `crypto`). Rate limit in-memory: login 8/5min, recovery 5/15min per IP. localStorage `sticker_token` + `sticker_user`. Secret server: `SESSION_SECRET` (Replit Secret).
- **DB**: Supabase PostgreSQL via `SUPABASE_DATABASE_URL` (con SSL + trim automatico)

## Database — Supabase

- Progetto: `https://kuigzaqaewgcosfhahkv.supabase.co`
- Schema pushato con Drizzle Kit
- Seed completo: 6 utenti, 4 album, 120 figurine, match reciproci, chat, impostazioni
- Variabili richieste: `SUPABASE_DATABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`

## Colour Palette

| Token | Hex | Uso |
|---|---|---|
| Primary (teal) | `#1c7a9c` | Sidebar, header, accent |
| Dark navy | `#1a2d45` | Testo, sidebar scura |
| Gold (accent) | `#f5a623` | CTA, badge, accenti |
| Cream | `#f7f2e8` | Card figurine |
| Background | `#f0f4f7` | Sfondo principale |
| Green | `#22c55e` | Stato Posseduta |
| Red | `#ef4444` | Stato Doppia |

## Routes Frontend

| Path | Component | Auth |
|---|---|---|
| `/login` | Login | Public |
| `/` | Home | User |
| `/album` | AlbumList | User |
| `/album/:id` | AlbumDetail | User |
| `/match` | MatchList | User |
| `/match/:userId` | MatchDetail | User |
| `/chat/:chatId` | ChatRoom | User |
| `/profilo` | Profile | User |
| `/admin` | AdminDashboard | Admin |
| `/admin/album` | AdminAlbums | Admin |
| `/admin/figurine` | AdminFigurine | Admin |
| `/admin/utenti` | AdminUsers | Admin |
| `/admin/messaggi` | AdminMessages | Admin |
| `/admin/premium` | AdminPremium | Admin |
| `/admin/impostazioni` | AdminSettings | Admin |

## API Routes Backend (`/api`)

- `POST /api/auth/register` — Nuovo account (nickname, PIN, CAP, domanda sicurezza)
- `POST /api/auth/login` — Login (nickname + PIN)
- `GET /api/auth/me` — Profilo corrente
- `POST /api/auth/recover` — Recupero PIN via codice
- `POST /api/auth/recovery-code` — Mostra codice (richiede PIN)
- `GET /api/albums` — Album pubblicati
- `GET /api/albums/:albumId/stickers` — Figurine album
- `POST /api/albums` — Crea album (admin)
- `PUT /api/albums/:albumId` — Modifica album (admin)
- `PATCH /api/albums/:albumId/publish` — Pubblica/nascondi (admin)
- `GET /api/user-albums` — Album utente corrente
- `POST /api/user-albums/:albumId` — Aggiungi album
- `DELETE /api/user-albums/:albumId` — Rimuovi album
- `GET /api/user-albums/:albumId/stickers` — Figurine utente per album
- `PUT /api/user-albums/:albumId/stickers/:stickerId` — Aggiorna stato figurina
- `GET /api/matches` — Match migliori
- `GET /api/matches/nearby` — Match vicini per CAP
- `GET /api/matches/:userId` — Dettaglio match multi-album
- `GET /api/chats` — Lista chat
- `POST /api/chats` — Apri chat (otherUserId nel body)
- `GET /api/chats/unread-count` — Badge non letti
- `GET /api/chats/:chatId/messages` — Messaggi chat
- `POST /api/chats/:chatId/messages` — Invia messaggio
- `POST /api/chats/:chatId/report` — Segnala chat
- `GET /api/demo/status` — Stato demo utente
- `POST /api/demo/activate` — Attiva demo 24h
- `GET /api/admin/stats` — Statistiche dashboard
- `GET /api/admin/users` — Lista utenti
- `PATCH /api/admin/users/:userId/block` — Blocca/sblocca utente
- `GET /api/admin/chats` — Tutte le chat (moderazione)
- `PATCH /api/admin/chats/:chatId/close` — Chiudi chat
- `GET /api/admin/reports` — Segnalazioni
- `GET /api/admin/demo/config` — Config demo
- `PUT /api/admin/demo/config` — Aggiorna durata demo
- `GET /api/settings` — Impostazioni app
- `PUT /api/settings` — Aggiorna impostazioni (admin)
- `GET /api/healthz` — Health check

## Dev Tools

### DevSwitcher (⚡)
Pulsante floating in basso a destra, visibile su **ogni pagina** inclusa la login.
- Mostra utente corrente e stato (demo_active, premium, free, admin)
- Switch con 1 clic tra tutti gli utenti di test
- Usa `/api/auth/login` direttamente — nessun logout manuale
- File: `artifacts/stickers-app/src/components/dev/DevSwitcher.tsx`
- Montato in `App.tsx` a livello Router (dentro AuthProvider + WouterRouter)

## Utenti di Test

| Nickname | PIN | Stato | Note |
|---|---|---|---|
| mario75 | 1234 | demo_active | ~20h rimaste |
| luca_fan | 5678 | premium | — |
| giulia_stickers | 9999 | free | — |
| sofia_ro | 1111 | demo_expired | — |
| roberto_collector | 2222 | premium | — |
| admin | 0000 | admin | Pannello admin |

## DB Schema (lib/db/src/schema/)

- `users` — id, nickname, pinHash, cap, area, isPremium, demoStartedAt, demoExpiresAt, exchangesCompleted, isAdmin, isBlocked, recoveryCode, securityQuestion, securityAnswerHash, createdAt
- `albums` — id, title, description, coverUrl, totalStickers, isPublished, createdAt
- `stickers` — id, albumId, number, name, description
- `userAlbums` — userId, albumId, addedAt
- `userStickers` — userId, stickerId, state (mancante/posseduta/doppia), updatedAt
- `chats` — id, user1Id, user2Id, status (active/closed), createdAt
- `messages` — id, chatId, senderId, text, isRead, createdAt
- `reports` — id, chatId, reporterId, reportedUserId, reason, status, createdAt
- `appSettings` — key, value, updatedAt

## Business Rules

- Scambio sempre 1:1 (doppia ceduta ↔ mancante ricevuta)
- Match multi-album: somma di tutti gli scambi possibili tra due utenti
- Demo parte SOLO quando si tenta di aprire la prima chat (non alla registrazione)
- Demo: 24h configurabili dall'admin — non hardcoded
- `demoStatus`: `free` | `demo_active` | `demo_expired` | `premium`
- Codice recupero: formato `STICK-XXXX-XXXX-XXXX`, visibile in Profilo dopo PIN
- Nickname unico per CAP (non globale)
- Chat polling ogni 5s (futuro: WebSocket o Supabase Realtime)
- Support email: dero975@gmail.com

## Deploy

- **Guida completa**: `DNA/06_RENDER_DEPLOY.md`
- In produzione (`NODE_ENV=production`) l'API server serve anche i file statici React
- Serving statico: `artifacts/api-server/src/app.ts`
- Static dir in production: `artifacts/stickers-app/dist/public`
- Health check: `GET /api/healthz` → `{"status":"ok"}`

## Key Architecture Decisions (Sessione 3)

- **ChatRoom route** usa `ProtectedChatRoute` (senza `MobileLayout`) — layout full-screen autonomo
- **Match queries** completamente batch: 5 query DB totali (era O(4N))
- **Distanza CAP** deterministica con formula numerica stabile (niente `Math.random()`)
- **Supabase keep-alive**: `artifacts/api-server/src/keepalive.ts` — ping ogni 12h
- **Error Boundary**: `artifacts/stickers-app/src/components/ErrorBoundary.tsx` — avvolge l'app intera
- **Admin mobile nav**: hamburger + dropdown in `AdminLayout.tsx`
- **Badge non letti**: `MobileLayout.tsx` mostra badge rosso su Match via `useListChats`

## Key Architecture Decisions (Sessione 6 — Security Hardening)

- **Modulo `lib/auth.ts`** centralizza signing token (HMAC-SHA256 + `timingSafeEqual`), hashing scrypt asincrono, helper rate-limit. Zero dipendenze esterne (solo `crypto`).
- **Middleware `middlewares/auth.ts`** unico `requireAuth`/`requireAdmin`/`getSession` — eliminato 6× decoder duplicato base64 nelle route.
- **CORS allowlist**: `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN`, `*.replit.app`, `*.replit.dev` (dev), `localhost` (dev), `CORS_ORIGINS` env (prod). Origini non permesse: nessun header `Access-Control-Allow-Origin` → browser blocca.
- **Lazy routes** in `App.tsx` con `React.lazy` + `Suspense<PageSkeleton>` per tutte le pagine admin + 5 pagine utente non-critiche. Login/Home/AlbumList restano eager. Bundle iniziale ~152 KB gzip.
- **Token rotation note**: cambiare `SESSION_SECRET` invalida tutti i token esistenti (hard logout globale). Ruotare solo in caso di compromissione.

## Key Architecture Decisions (Sessione 5 — E2E Testing Pass)

- **Auth race condition fix**: `AuthContext.tsx` ora idrata sincronamente da localStorage tramite `readInitialAuth()` chiamata nello stato iniziale di `useState`. Così le route protette vedono `isAuthenticated=true` al primo render — niente più flash su `/login` quando si fa deep-link/refresh. Aggiunto flag `isLoading`. Il refresh server `/api/auth/me` ora anche pulisce sessioni stale se il server rifiuta il token.
- **`useAuthRedirect` hook**: in `App.tsx`, i `setLocation` durante il render erano un anti-pattern. Ora wrappati in `useEffect` tramite hook dedicato.
- **Demo gating**: nuovo `DemoExpiredScreen.tsx`. `ProtectedUserRoute` accetta `requirePremium` flag — `/match` e `/match/:userId` lo abilitano. `ProtectedChatRoute` blocca sempre `demo_expired`. `/`, `/album`, `/album/:id`, `/profilo` restano accessibili (l'utente vede ciò che ha e può fare upgrade).
- **Hydration warning**: `Home.tsx` linea 92 — `<p>` che avvolgeva `<Skeleton>` (un `<div>`) cambiato in `<div>`.
- **Workflow consolidation**: rimossi i duplicati custom `API Server` / `Stickers App`. Ora gestiti dagli artifact: `artifacts/api-server: API Server` e `artifacts/stickers-app: web`.

## Key Architecture Decisions (Sessione 4)

- **search_path fix**: `lib/db/src/index.ts` — `pool.on("connect", client => client.query("SET search_path TO public"))` per Supabase. La versione precedente con `options: "--search_path=public"` era sintassi errata; il formato corretto PostgreSQL è `-c guc=value`, ma l'approccio `connect` event è più robusto.
- **DB Setup workflow**: rimosso dall'avvio automatico. Rieseguire manualmente `cd lib/db && pnpm push-force && pnpm seed` per reset completo dati.
- **Doppio database**: il DB locale Replit PostgreSQL (via `DATABASE_URL`, env vars `PG*`) è ora anche sincronizzato con lo schema + seed. Il server in produzione usa `SUPABASE_DATABASE_URL` (Replit Secret), in dev usa `DATABASE_URL` come fallback.
- **Validazione end-to-end completa**: tutti gli endpoint testati e funzionanti (login, matches, nearby, user-albums, chats, messages, unread-count, admin/stats, admin/users, demo/status, settings, healthz).

## Workflows

- `API Server` — Express backend su `:8080`
- `Stickers App` — Vite frontend su `:18931`, `BASE_PATH=/`
- `DB Setup (Supabase)` — **manuale** — push schema + seed su Supabase (richiede Replit Secrets)

## DNA Documentation

- `DNA/00_ARCHITETTURA.md` — Stack e struttura tecnica
- `DNA/01_STATO_SVILUPPO.md` — Stato corrente e todo list
- `DNA/02_DATABASE_SCHEMA.md` — Schema DB dettagliato
- `DNA/03_ROADMAP.md` — Roadmap fasi 1-5
- `DNA/05_PROSSIMO_PROMPT.md` — Prompt per sessioni future
- `DNA/06_RENDER_DEPLOY.md` — Guida deploy Render step-by-step
