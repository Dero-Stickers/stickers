# DNA — Architettura Sticker Matchbox

Ultimo aggiornamento: 1 Maggio 2026

## Stack Scelto

| Layer | Tecnologia | Motivo |
|-------|------------|--------|
| Frontend | React + Vite + TypeScript | Moderno, performante, ottimo per PWA |
| Routing | Wouter | Leggero, compatibile con Vite basepath |
| Styling | Tailwind CSS + shadcn/ui | Componenti accessibili, customizzabili |
| Backend | Node.js + Express 5 + TypeScript | Familiare, scalabile, già configurato nel monorepo |
| API contract | OpenAPI → Orval codegen | Type-safe end-to-end, hooks pronti |
| DB (dev) | PostgreSQL + Drizzle ORM | Type-safe, ORM leggero |
| DB (futuro) | Supabase | Postgres-compatible, nessuna riscrittura |
| Auth | Session + localStorage (mock) | Semplice, nessuna dipendenza esterna |
| State | React Context + React Query | Separazione stato server/UI |

## Struttura Cartelle Frontend

```
artifacts/stickers-app/src/
├── components/         ← Componenti riusabili
│   ├── ui/             ← shadcn/ui components
│   ├── layout/         ← Layout, Footer, Sidebar Admin
│   ├── album/          ← AlbumCard, StickerGrid, StickerCard
│   ├── match/          ← MatchCard, MatchDetail, ChatView
│   └── onboarding/     ← OnboardingGuide
├── pages/              ← Pagine (route)
│   ├── user/           ← Home, Album, Match, Profilo
│   └── admin/          ← Dashboard, Albums, Stickers, Users, ...
├── mock/               ← SEPARATO — dati mock rimovibili
│   ├── users.ts
│   ├── albums.ts
│   ├── stickers.ts
│   ├── matches.ts
│   ├── chats.ts
│   └── settings.ts
├── services/           ← Layer servizi (mock → API)
│   ├── auth.service.ts
│   ├── album.service.ts
│   ├── sticker.service.ts
│   ├── match.service.ts
│   ├── chat.service.ts
│   └── admin.service.ts
├── contexts/           ← React Context (Auth, Demo, etc.)
├── hooks/              ← Custom hooks
├── lib/                ← Utils, helpers
└── types/              ← TypeScript types condivisi
```

## Decisioni Architetturali

### 1. Mock Data Separata
Tutti i dati mock in `src/mock/` — facili da trovare e rimuovere.
I servizi importano dal mock ma l'interfaccia rimane la stessa.

### 2. Admin Panel nell'app React
Admin e user app nella stessa SPA, routing separato (`/admin/*` vs `/`).
Protezione admin tramite flag `is_admin` nell'utente loggato.

### 3. Session Storage
Sessione utente in localStorage (come da specifica: ricorda accesso sul dispositivo).
Al logout → pulizia localStorage.

### 4. Matching Algoritmo
Calcolato lato frontend dai dati mock.
In produzione: endpoint dedicato `/api/matches` che fa JOIN su DB.

### 5. Chat Realtime
Nella prima versione: polling ogni 5s.
In futuro: WebSocket o Supabase Realtime.

### 6. PWA
manifest.json + service worker configurati ma non attivati in dev.
Attivabili con configurazione Vite PWA plugin in futuro.
