# DNA — Stato Sviluppo

Aggiornato: 26 giugno 2026

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
- Supabase operativo: **11 tabelle**, indici integri. Dati **reali** caricati: **23 album Calciatori (2003-04→2025-26), 17.581 figurine** (import Panini via Playwright; pipeline in [[import-panini-collections]]); utenti: Dero975 (test) + admin. **Nessuna copertina/artwork** (feature rimossa, scelta legale — vedi `09_DATABASE.md`). DB a Londra (UK), hosting Render a Francoforte (UE)
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
- **Layout admin consolidato** (`components/admin/AdminPage` + `AdminTable` + `AdminScrollArea`): testata di pagina fissa, **solo il contenuto/lista scorre**; tabelle con intestazioni centrate e sticky, griglia verticale, righe a colorazione alternata, densità compatta. Album: azione unica **Gestisci** (rinomina + figurine), stato **On Line/Off Line**, colonna **Utenti** (`userCount` lato admin), ordine stabile per id (Off Line non sposta la riga). Vedi `07_ADMIN_PANNELLO.md`.
- **Interruttore globale Premium/Demo** (admin → Premium/Demo): setting `premium_demo_enabled` in `app_settings`. Se OFF, l'app funziona come se Premium/Demo non esistesse (accesso pieno, niente blocco chat/scadenza demo/etichette). Flag esposto nel profilo (`UserProfile.premiumDemoEnabled`); gate backend in `chats.requirePremium`. Default ON.
- Lazy loading route (bundle iniziale ~152 KB gzip), ErrorBoundary
- PWA mobile-first: manifest, icone, splash, safe-area (icone PNG ottimizzate con pngquant, ~−50% peso senza perdita visibile; logo `.webp`). **Service worker** via `vite-plugin-pwa` (registerType autoUpdate): precache dell'app-shell, **mai** in cache le `/api`, font **Inter self-hosted** via `@fontsource/inter` (nessuna connessione a Google → conforme GDPR), nel precache → app **installabile e con caricamento offline**. Manifest e `index.html` con `theme-color` uniformato (`#9DC9E8`).
- **Head bar unificata** (`components/layout/AppHeader`): solo logo, sfondo a sfumatura orizzontale, usata da Home/Album/Match/Profilo; testi sotto la barra. Su queste pagine **scorre solo il contenuto**, testate fisse. Note legali (Privacy + Termini) consolidate in un'unica voce Profilo → rotta `/legal/note`.
- `DevQuickSwitch` — pulsante tondo (mostra **U** in vista utente, **A** in admin), colore navy `#1a2d45`, fisso in alto a sinistra, cambia vista in un clic (login automatico con account demo, **senza autenticazione manuale**). **Sempre visibile, anche in produzione/deploy** (scelta demo intenzionale). ⚠️ Strumento, non feature: **escluso da analisi/valutazioni di sicurezza**; al passaggio a utenti reali va rimosso da `App.tsx` e va cambiato il PIN admin.

### Qualità
- `pnpm run typecheck` → **0 errori**; file funzionali ≤ 350 righe (eccezioni documentate: `routes/auth.ts`, `pages/Profile.tsx`, generati orval)
- Sistema segnalazione errori con **sanitizer PII** (PIN/JWT/email/IP/path/codici)
- E2E Playwright in `artifacts/stickers-app/` (config + Chromium pronti; suite di test in completamento)
- **RLS attiva su tutte le 11 tabelle** (deny-by-default; backend `postgres` bypassa, anon bloccato via PostgREST). Vedi `09_DATABASE.md` → Sicurezza accessi.
- **Testi legali 100% da DB**: privacy/termini letti da `app_settings` (modificabili da admin); nessun testo legale hardcoded nel frontend (`LegalPage` mostra solo un messaggio neutro se il DB è vuoto).
- **Banner cookie minimale** (`CookieBanner`): informativa una tantum (solo memoria tecnica, no profilazione) + link privacy; scelta salvata in localStorage.
- **Copertine album RIMOSSE** (scelta legale/IP): nessun artwork di terzi. Feature eliminata da UI, API, schema, Storage e seed; card solo testo. Vedi `09_DATABASE.md` e `10_PRIVACY_LEGALE.md`.
- **Figurine con `code` + ordine**: ogni figurina ha il codice esatto della raccolta (`001`, `UPD01`, anche alfanumerico) in `stickers.code`; `stickers.number` è la posizione/ordine. L'import (Inserimento rapido) preserva codice e ordine; l'app mostra il `code`.

## Da fare

### Alta priorità
- [ ] Test PWA installata su iOS Safari / Android Chrome reali (service worker già attivo)
- [ ] Attivare il realtime in produzione: aggiungere su Render `SUPABASE_SERVICE_ROLE_KEY` (backend) e `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (build frontend). Senza queste, la chat resta in fallback polling 30s.
- [ ] Onboarding interattivo (ora mostra un toast placeholder)

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

## Utenti nel DB (Supabase)

Solo **2 account reali** (il vecchio set di 6 utenti di test seed non è più presente):

| Nickname | Ruolo |
|----------|-------|
| admin | admin |
| Dero975 | free (utente di test) |

> I PIN non sono documentati qui (hash scrypt nel DB). In locale il `DevQuickSwitch`
> cambia vista U/A senza PIN.

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
