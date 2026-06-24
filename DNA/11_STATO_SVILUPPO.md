# DNA — Stato Sviluppo

Aggiornato: 24 giugno 2026

> Fotografia dello **stato attuale** (non un changelog). Tenere aggiornato questo
> file a fine sessione. I dati nel DB sono di **test/finti**.

## In sintesi

Sticker Matchbox è **funzionante in locale e live in produzione** su Render.
Stack: monorepo pnpm · React 19 + Vite + TS · Express 5 + Drizzle · Supabase.

## Fatto

### Infrastruttura & deploy
- Monorepo: `artifacts/{stickers-app, api-server, mockup-sandbox}` + `lib/{api-spec, api-client-react, api-zod, db}`
- Deploy unico su Render (`stickers-matchbox`), **autoDeploy** su push `main`
  - build via **corepack** (`corepack pnpm …`), start con **node diretto** sul bundle
- Supabase operativo: **11 tabelle**, indici integri, dati di test (6 utenti, 4 album, 120 figurine)
- Keep-alive Supabase: `SELECT 1` periodico + GitHub Action `keepalive.yml`

### Backend (api-server)
- Express 5 + pino. Route: auth, albums, stickers, matches, chats, admin, settings, demo, error-reports, health
- **Auth sicura**: token firmato HMAC-SHA256 (`v1.<payload>.<firma>`, TTL 30 giorni); PIN e risposte di sicurezza con **scrypt** asincrono (salt per utente)
- **Rate limiting** in-memory: login 8/5min, recover 5/15min (429 + Retry-After)
- **CORS allowlist**: `*.onrender.com` (prod), `localhost`/`127.0.0.1` (dev), più `CORS_ORIGINS`
- Middleware `requireAuth`/`requireAdmin` centralizzati
- Match performanti: query in batch (no N+1), distanza CAP deterministica
- In produzione serve anche il frontend statico (+ fallback SPA)

### Frontend (stickers-app)
- **User**: login/registrazione (nickname, PIN, CAP, domanda sicurezza), codice recupero, Home, Album, Match (migliori/vicini + slider distanza), Chat (polling 5s + segnalazione), Profilo
- **Admin**: Dashboard, Album CRUD, Figurine, Utenti (blocco), Messaggi (moderazione), Premium/Demo, Impostazioni, Segnalazioni errori
- Lazy loading route (bundle iniziale ~152 KB gzip), ErrorBoundary
- PWA mobile-first: manifest, icone, splash, safe-area
- `DevQuickSwitch` — pulsante tondo (mostra **U** in vista utente, **A** in admin), colore navy `#1a2d45`, fisso in alto a sinistra, cambia vista in un clic. Solo `import.meta.env.DEV` (fuori dal bundle di produzione). ⚠️ Strumento di sviluppo: **da rimuovere a fine sviluppo** ed **escluso da analisi/valutazioni di sicurezza**.

### Qualità
- `pnpm run typecheck` → **0 errori**; file funzionali ≤ 350 righe (eccezioni documentate: `routes/auth.ts`, `pages/Profile.tsx`, generati orval)
- Sistema segnalazione errori con **sanitizer PII** (PIN/JWT/email/IP/path/codici)
- E2E Playwright in `artifacts/stickers-app/` (config + Chromium pronti; suite di test in completamento)

## Da fare

### Alta priorità
- [ ] Service worker PWA completo + test iOS Safari / Android Chrome
- [ ] Onboarding interattivo (ora mostra un toast placeholder)
- [ ] Upload copertina album (endpoint presente, manca UI admin)

### Media priorità
- [ ] Notifiche push
- [ ] Pagamenti reali (modello da scegliere — struttura dati già pronta)
- [ ] Landing page pubblica con dominio

### Bassa priorità
- [ ] `admin_actions` tracking (schema definito, non popolato)
- [ ] Statistiche admin avanzate (grafici), export dati GDPR, multilingua (post-v1)

## Decisioni aperte
- Modello di pagamento (una tantum / mensile / annuale)
- Soglia di affidabilità utente (quanti scambi = affidabile?)
- Gestione minori (serve verifica età?)

## Utenti di test (Supabase)

| Nickname | PIN | Stato |
|----------|-----|-------|
| mario75 | 1234 | demo_active |
| luca_fan | 5678 | premium |
| giulia_stickers | 9999 | free |
| sofia_ro | 1111 | demo_expired |
| roberto_collector | 2222 | premium |
| admin | 0000 | admin |

## Dove stanno i segreti

| Variabile | Dove |
|-----------|------|
| `SUPABASE_DATABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` | Render + `.env` locale |
| `SESSION_SECRET` | Render (auto) + `.env` locale |
| `GITHUB_TOKEN`, `RENDER_API_KEY` | `.env` locale |

> `.env`, `.agent/`, `CLAUDE.md` sono in `.gitignore` — mai committarli.

## Note operative
- Fine sessione: aggiornare questo file; backup `.tar.gz` in `backups/` (vedi `14_BACKUP_PROCESSO.md`)
- Deploy: `./deploy.sh "messaggio"` oppure `git push` su `main` (= deploy automatico su Render)
