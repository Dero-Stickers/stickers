# Obiettivo e Architettura — Sticker Matchbox

## Obiettivo del Progetto

Sticker è una web app/PWA che permette agli utenti di gestire, condividere e scambiare figurine Panini con altri utenti.

Non è un semplice prototipo: l'obiettivo è una fondazione tecnica professionale, organizzata, scalabile, pulita e realmente utilizzabile.

## Princìpi Tecnici Non Negoziabili

- Web app/PWA — NON app nativa, NON Expo
- Frontend React + backend Node/Express nello stesso progetto
- Preparato per deploy singolo su Render in futuro
- Mock data separata dal codice applicativo
- Futura integrazione Supabase senza riscrittura
- NO: pagamenti reali, GPS, email automatiche, analytics invasive

## Stack Tecnico Scelto

```
Frontend:  React + Vite (TypeScript)
Backend:   Node.js + Express 5 (TypeScript)
Database:  PostgreSQL + Drizzle ORM (dev) → Supabase (futuro)
Styling:   Tailwind CSS + shadcn/ui
Routing:   Wouter
API:       OpenAPI spec → Orval codegen → React Query hooks
Deploy:    Render (futuro) — unico servizio frontend+backend
```

## Struttura Cartelle

```
/
├── artifacts/
│   ├── stickers-app/       ← Frontend React+Vite (user app + admin panel)
│   └── api-server/         ← Backend Express
├── lib/
│   ├── api-spec/           ← OpenAPI spec (fonte di verità API)
│   ├── api-client-react/   ← Hook React Query generati
│   ├── api-zod/            ← Schemi Zod generati
│   └── db/                 ← Schema Drizzle + connessione DB
├── PROJECT_SPEC/           ← Specifica tecnica suddivisa
├── DNA/                    ← Documentazione architetturale viva
├── backup/                 ← Backup manuali su richiesta
└── scripts/                ← Script di utilità
```

## Separazione Mock Data

- Mock data in: `artifacts/stickers-app/src/mock/`
- Ogni dominio ha il suo file mock (users.ts, albums.ts, stickers.ts, ...)
- I servizi frontend importano da un layer intermedio che in futuro punterà a Supabase
- Rimozione mock: sostituire i mock con chiamate API reali, senza toccare i componenti

## Preparazione Render Deploy

- Il frontend viene buildato in `dist/public/` e servito dal backend Express
- Un unico processo Node gestisce sia le API (`/api/*`) che il frontend statico
- Variabili d'ambiente via `.env` (non hardcoded)
- `SESSION_SECRET` già disponibile come secret Replit
