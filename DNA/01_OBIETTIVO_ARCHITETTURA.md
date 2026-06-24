# Obiettivo e Architettura — Sticker Matchbox

## Obiettivo del progetto

Sticker è una web app / PWA che permette agli utenti di gestire, condividere e
scambiare figurine (Panini-style) con altri collezionisti vicini.

Non è un prototipo usa-e-getta: l'obiettivo è una fondazione tecnica
professionale, organizzata, scalabile, pulita e realmente utilizzabile.

## Princìpi tecnici non negoziabili

- Web app / PWA — **non** app nativa, **non** Expo
- Frontend React + backend Node/Express nello **stesso** progetto (monorepo)
- Deploy **singolo** su Render (un solo servizio serve frontend + API)
- Nessun segreto hardcoded: tutto via variabili d'ambiente (`.env` / Render)
- Integrazione Supabase senza riscrittura del codice applicativo

## Stack tecnico

| Layer | Tecnologia | Note |
|-------|------------|------|
| Frontend | React 19 + Vite + TypeScript | PWA mobile-first |
| Routing | Wouter | Leggero, compatibile con basepath Vite |
| Styling | Tailwind CSS + shadcn/ui | Componenti accessibili |
| State | React Context + React Query | Stato UI vs stato server separati |
| Backend | Node.js + Express 5 + TypeScript | Logger pino |
| API contract | OpenAPI → Orval codegen | Hook React Query + schemi Zod type-safe |
| ORM | Drizzle ORM | Type-safe |
| Database | PostgreSQL su **Supabase** | SSL, connessione via `SUPABASE_DATABASE_URL` |
| Auth | Token firmato HMAC-SHA256 (`v1.<payload>.<firma>`) | PIN/risposte con scrypt |

## Struttura cartelle

```
/
├── artifacts/
│   ├── stickers-app/     ← Frontend React+Vite (user app + pannello admin)
│   ├── api-server/       ← Backend Express (API + serving statico in prod)
│   └── mockup-sandbox/   ← Tool di sviluppo: anteprima componenti UI
├── lib/
│   ├── api-spec/         ← OpenAPI spec (fonte di verità API) + config Orval
│   ├── api-client-react/ ← Hook React Query generati
│   ├── api-zod/          ← Schemi Zod generati
│   └── db/               ← Schema Drizzle, client DB, seed
├── DNA/                  ← Documentazione viva (spec + stato + operatività)
├── scripts/              ← Script di utilità
├── backups/              ← Backup .tar.gz locali (non versionati)
├── render.yaml           ← Configurazione deploy Render
└── deploy.sh             ← Commit + push su main (= deploy)
```

### Struttura frontend (`artifacts/stickers-app/src/`)

```
components/  → ui (shadcn), layout, album, match, dev (DevSwitcher)
pages/       → user (Home, Album, Match, Profilo) e admin (Dashboard, …)
services/    → layer servizi verso l'API
contexts/    → React Context (Auth, …)
hooks/ lib/ types/  → utilità condivise
```

## Decisioni architetturali

1. **Frontend + API insieme** — in produzione (`NODE_ENV=production`) il server
   Express serve sia `/api/*` sia i file statici del frontend (build Vite) con
   fallback SPA. Un solo processo Node, un solo servizio Render.
2. **Admin nell'app React** — user e admin nella stessa SPA, routing separato
   (`/admin/*` vs `/`), protezione tramite flag `is_admin`.
3. **Sessione su localStorage** — il token firmato è salvato lato client
   (`sticker_token` + `sticker_user`); al logout viene ripulito.
4. **API type-safe end-to-end** — l'OpenAPI spec in `lib/api-spec` genera (Orval)
   gli hook React Query e gli schemi Zod, condivisi tra frontend e backend.
5. **Dati reali su Supabase** — i vecchi mock (`src/mock/`) sono stati rimossi; i
   servizi parlano con l'API, che usa Drizzle su Supabase.
6. **Matching 1:1 multi-album** — calcolato lato backend con JOIN sul DB.
7. **Chat** — polling ogni 5s (futuro: WebSocket o Supabase Realtime).
8. **PWA** — manifest + service worker previsti (Fase 3 roadmap).
