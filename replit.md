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
- **Auth**: Token base64(JSON{userId,isAdmin}) in Authorization header; localStorage `sticker_token` + `sticker_user`
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

## Workflows

- `artifacts/api-server: API Server` — Express backend su `:8080`
- `artifacts/stickers-app: web` — Vite frontend su `PORT` env var

## DNA Documentation

- `DNA/00_ARCHITETTURA.md` — Stack e struttura tecnica
- `DNA/01_STATO_SVILUPPO.md` — Stato corrente e todo list
- `DNA/02_DATABASE_SCHEMA.md` — Schema DB dettagliato
- `DNA/03_ROADMAP.md` — Roadmap fasi 1-5
- `DNA/05_PROSSIMO_PROMPT.md` — Prompt per sessioni future
- `DNA/06_RENDER_DEPLOY.md` — Guida deploy Render step-by-step
