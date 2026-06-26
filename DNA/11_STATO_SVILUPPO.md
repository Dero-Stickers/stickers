# DNA — Stato Sviluppo

Aggiornato: 24 giugno 2026

> Fotografia dello **stato attuale** (non un changelog). Tenere aggiornato questo
> file a fine sessione. I dati nel DB sono di **test/finti**.

## In sintesi

Sticker Matchbox è **funzionante in locale e live in produzione** su Render.
Stack: monorepo pnpm · React 19 + Vite + TS · Express 5 + Drizzle · Supabase.

## Fatto

### Infrastruttura & deploy
- Monorepo: `artifacts/{stickers-app, api-server}` + `lib/{api-spec, api-client-react, api-zod, db}`
- Deploy unico su Render (`stickers-matchbox`), **autoDeploy** su push `main`
  - build via **corepack** (`corepack pnpm …`), start con **node diretto** sul bundle
- Supabase operativo: **11 tabelle**, indici integri, dati di test (6 utenti, 4 album, 120 figurine)
- Keep-alive Supabase: `SELECT 1` periodico + GitHub Action `keepalive.yml`
- **CI GitHub Actions** (`ci.yml`): typecheck + build su ogni push/PR su `main` (nessun deploy, zero costi)

### Backend (api-server)
- Express 5 + pino. Route: auth, albums, stickers, matches, chats, admin, settings, demo, error-reports, health
- **Auth sicura**: token firmato HMAC-SHA256 (`v1.<payload>.<firma>`, TTL 30 giorni); PIN e risposte di sicurezza con **scrypt** asincrono (salt per utente)
- **Rate limiting** in-memory: login 8/5min, recover 5/15min (429 + Retry-After)
- **CORS allowlist**: `*.onrender.com` (prod), `localhost`/`127.0.0.1` (dev), più `CORS_ORIGINS`
- Middleware `requireAuth`/`requireAdmin` centralizzati
- Match performanti: query in batch (no N+1), distanza CAP deterministica
- In produzione serve anche il frontend statico (+ fallback SPA)

### Frontend (stickers-app)
- **User**: login/registrazione (nickname, PIN, CAP, domanda sicurezza), codice recupero, Home, Album, Match (migliori/vicini + slider distanza), Chat (**realtime** via Supabase Broadcast, fallback polling adattivo 8s/30s, + segnalazione), Profilo
- **Admin**: Dashboard, Album CRUD, Figurine, Utenti (blocco), Messaggi (moderazione), Premium/Demo, Impostazioni, Segnalazioni errori
- **Interruttore globale Premium/Demo** (admin → Premium/Demo): setting `premium_demo_enabled` in `app_settings`. Se OFF, l'app funziona come se Premium/Demo non esistesse (accesso pieno, niente blocco chat/scadenza demo/etichette). Flag esposto nel profilo (`UserProfile.premiumDemoEnabled`); gate backend in `chats.requirePremium`. Default ON.
- Lazy loading route (bundle iniziale ~152 KB gzip), ErrorBoundary
- PWA mobile-first: manifest, icone, splash, safe-area (icone PNG ottimizzate con pngquant, ~−50% peso senza perdita visibile; logo `.webp`). **Service worker** via `vite-plugin-pwa` (registerType autoUpdate): precache dell'app-shell, **mai** in cache le `/api`, runtime cache solo font Google → app **installabile e con caricamento offline**. Manifest e `index.html` con `theme-color` uniformato (`#9DC9E8`).
- `DevQuickSwitch` — pulsante tondo (mostra **U** in vista utente, **A** in admin), colore navy `#1a2d45`, fisso in alto a sinistra, cambia vista in un clic (login automatico con account demo, **senza autenticazione manuale**). **Sempre visibile, anche in produzione/deploy** (scelta demo intenzionale). ⚠️ Strumento, non feature: **escluso da analisi/valutazioni di sicurezza**; al passaggio a utenti reali va rimosso da `App.tsx` e va cambiato il PIN admin.

### Qualità
- `pnpm run typecheck` → **0 errori**; file funzionali ≤ 350 righe (eccezioni documentate: `routes/auth.ts`, `pages/Profile.tsx`, generati orval)
- Sistema segnalazione errori con **sanitizer PII** (PIN/JWT/email/IP/path/codici)
- E2E Playwright in `artifacts/stickers-app/` (config + Chromium pronti; suite di test in completamento)
- **RLS attiva su tutte le 11 tabelle** (deny-by-default; backend `postgres` bypassa, anon bloccato via PostgREST). Vedi `09_DATABASE.md` → Sicurezza accessi.
- **Testi legali 100% da DB**: privacy/termini letti da `app_settings` (modificabili da admin); nessun testo legale hardcoded nel frontend (`LegalPage` mostra solo un messaggio neutro se il DB è vuoto).

## Da fare

### Alta priorità
- [ ] Test PWA installata su iOS Safari / Android Chrome reali (service worker già attivo)
- [ ] Attivare il realtime in produzione: aggiungere su Render `SUPABASE_SERVICE_ROLE_KEY` (backend) e `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (build frontend). Senza queste, la chat resta in fallback polling 30s.
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
| `SUPABASE_SERVICE_ROLE_KEY` (broadcast realtime, backend) | `.env` locale — **da aggiungere su Render** |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (realtime, build frontend) | `.env` locale — **da aggiungere su Render** |
| `SESSION_SECRET` | Render (auto) + `.env` locale |
| `GITHUB_TOKEN`, `RENDER_API_KEY` | `.env` locale |

> `.env`, `.agent/`, `CLAUDE.md` sono in `.gitignore` — mai committarli.

## Note operative
- Fine sessione: aggiornare questo file; backup compresso in `BACKUP/` (vedi `14_BACKUP_PROCESSO.md`)
- Deploy: `./deploy.sh "messaggio"` oppure `git push` su `main` (= deploy automatico su Render)
