# Sticker Matchbox — Project Overview

## Architecture

pnpm monorepo with 3 main artifacts:
- `artifacts/stickers-app` — React + Vite frontend (mobile-first PWA)
- `artifacts/api-server` — Express + Drizzle ORM backend
- `lib/db` — Shared DB schema and client (composite lib)
- `lib/api-spec` — OpenAPI spec + generated React Query hooks (`@workspace/api-client-react`)

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, shadcn/ui, Wouter, React Query, react-hook-form + Zod
- **Backend**: Express 5, Drizzle ORM, PostgreSQL
- **Auth**: Base64 token in Authorization header, localStorage key `sticker_user`
- **DB**: Replit PostgreSQL via `DATABASE_URL`

## Colour Palette

| Token | Hex |
|---|---|
| Primary (teal) | `#1c7a9c` |
| Dark navy | `#1a2d45` |
| Gold (accent) | `#f5a623` |
| Cream | `#f7f2e8` |
| Background | `#f0f4f7` |

## Routes

### Frontend (`/`)

| Path | Component | Auth |
|---|---|---|
| `/login` | Login | Public |
| `/` | Home | User |
| `/album` | AlbumList | User |
| `/album/:albumId` | AlbumDetail | User |
| `/match` | MatchList | User |
| `/match/:matchId` | MatchDetail | User |
| `/chat/:chatId` | ChatRoom | User |
| `/profile` | Profile | User |
| `/admin` | AdminDashboard | Admin |
| `/admin/albums` | AdminAlbums | Admin |
| `/admin/figurine` | AdminFigurine | Admin |
| `/admin/users` | AdminUsers | Admin |
| `/admin/messages` | AdminMessages | Admin |
| `/admin/premium` | AdminPremium | Admin |
| `/admin/settings` | AdminSettings | Admin |

### Backend (`/api`)

- `POST /api/auth/register` — New account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `PUT /api/auth/me` — Update profile (CAP, PIN)
- `POST /api/auth/recover` — PIN recovery via recovery code
- `GET /api/albums` — All published albums
- `GET /api/albums/:albumId` — Album + stickers
- `POST /api/albums` — Create album (admin)
- `PUT /api/albums/:albumId` — Update album (admin)
- `PATCH /api/albums/:albumId/publish` — Toggle publish (admin)
- `DELETE /api/albums/:albumId` — Delete album (admin)
- `POST /api/albums/:albumId/stickers` — Add sticker (admin)
- `GET /api/me/albums` — User's owned albums
- `POST /api/me/albums/:albumId/stickers/:stickerId` — Mark sticker owned/duplicate
- `DELETE /api/me/albums/:albumId/stickers/:stickerId` — Remove sticker ownership
- `GET /api/matches` — Available matches for user
- `POST /api/matches` — Create match offer
- `PUT /api/matches/:matchId/accept` — Accept match
- `DELETE /api/matches/:matchId` — Cancel match
- `GET /api/chats` — User's chats
- `GET /api/chats/:chatId` — Chat + messages
- `POST /api/chats/:chatId/messages` — Send message
- `POST /api/chats/:chatId/report` — Report chat
- `GET /api/admin/stats` — Dashboard stats
- `GET /api/admin/users` — All users
- `POST /api/admin/users/:userId/toggle-block` — Block/unblock user
- `GET /api/admin/chats` — All chats
- `POST /api/admin/chats/:chatId/close` — Close chat
- `POST /api/admin/messages/:messageId/delete` — Delete message
- `GET /api/admin/reports` — All reports
- `POST /api/admin/reports/:reportId/resolve` — Resolve report
- `GET /api/settings` — App settings
- `PUT /api/settings` — Update settings (admin)

## DB Schema (lib/db/src/schema/)

- `users` — id, nickname, pinHash, cap, area, isPremium, demoStatus, demoExpiresAt, exchangesCompleted, isAdmin, isBlocked, recoveryCodeHash, securityQuestion, securityAnswerHash, createdAt
- `albums` — id, title, description, coverUrl, totalStickers, isPublished, createdAt
- `stickers` — id, albumId, number, name, description, imageUrl
- `userAlbums` — userId, albumId, completedAt
- `userStickers` — userId, stickerId, isDuplicate, acquiredAt
- `chats` — id, participants (array), matchId, status, createdAt
- `messages` — id, chatId, senderId, text, isRead, sentAt
- `reports` — id, chatId, reporterId, reason, status, createdAt
- `appSettings` — key (PK), value, updatedAt

## Mock Data (frontend, src/mock/)

- `users.ts` — 5 users incl. admin; `MockUserWithPin` type adds `pin`, `recoveryCode`, `securityQuestion`, `securityAnswer`
- `albums.ts` — 3 sample albums
- `stickers.ts` — stickers per album
- `matches.ts` — sample match offers
- `chats.ts` — sample chats + messages
- `settings.ts` — app settings

### Demo Credentials

| Role | Nickname | PIN | CAP |
|---|---|---|---|
| User | mario75 | 1234 | 20100 |
| Premium | luca_fan | 5678 | 20121 |
| Admin | admin | 0000 | 00000 |

## Business Rules

- New users get 24h free demo (then `demoStatus: "demo_expired"`)
- `demoStatus`: `free` | `demo_active` | `demo_expired` | `premium`
- Recovery code format: `STICK-XXXX-XXXX-XXXX`
- Support email: dero975@gmail.com
- Admin default: nickname=admin, pin=0000

## Current Phase

**Mock Data Phase** — frontend uses local mock data. API routes are fully written and type-safe but frontend still reads from `src/mock/`. Next phase: wire frontend to real API with React Query hooks.

## Workflows

- `artifacts/api-server: API Server` — Express backend on `:8080`
- `artifacts/stickers-app: web` — Vite frontend on `PORT` env var

## Deployment

Prepared for Render deploy. API server listens on `process.env.PORT ?? 8080`.
