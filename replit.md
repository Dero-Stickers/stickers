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
