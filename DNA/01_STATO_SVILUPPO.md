# DNA — Stato Sviluppo

Ultimo aggiornamento: 1 Maggio 2026 — Sessione 2

## Completato ✅

### Infrastruttura
- Struttura monorepo (artifacts/stickers-app + artifacts/api-server)
- PROJECT_SPEC completo (00-11)
- DNA folder con documentazione aggiornata (00-06)
- OpenAPI spec per tutti gli endpoint
- Codegen (React Query hooks + Zod schemas)
- Schema DB (Drizzle ORM, type-safe)

### Database
- Schema Drizzle pushato su **Supabase** ✅
- Seed realistico su Supabase: 6 utenti, 4 album, 120 figurine, match, chat ✅
- `lib/db/src/index.ts` → usa `SUPABASE_DATABASE_URL` (con trim automatico) ✅
- `lib/db/drizzle.config.ts` → configurato per Supabase ✅

### Backend (API Server)
- Express 5 + TypeScript + pino logger
- Route complete: auth, albums, stickers, matches, chats, admin, settings, health
- Demo attivazione (configurabile dall'admin, non hardcoded)
- `app.ts` → serving file statici frontend in produzione (per Render) ✅

### Frontend (User App)
- Login + Registrazione (nickname, PIN, CAP, domanda sicurezza)
- Codice di recupero mostrato post-registrazione
- Home dashboard (album, match, stato demo)
- Album: I miei album + Album disponibili + griglia figurine + filtri
- Match: Migliori / Vicini a te + slider distanza + dettaglio multi-album
- Chat: polling 5s, segnalazione, avviso moderazione
- Profilo: codice recupero protetto da PIN, supporto, logout

### Frontend (Admin Panel)
- Dashboard con statistiche
- Album: CRUD completo
- Figurine: gestione per album
- Utenti: lista con stato demo/premium, blocco
- Messaggi: revisione e chiusura chat
- Premium/Demo: configurazione durata demo
- Impostazioni: email supporto, testi base

### Dev Tools
- **DevSwitcher** ✅ — pulsante floating in ogni pagina per switch rapido User↔Admin
  - 6 utenti di test preconfigurati (mario75, luca_fan, giulia_stickers, sofia_ro, roberto_collector, admin)
  - Un clic per cambiare utente senza logout manuale

### Deploy
- `DNA/06_RENDER_DEPLOY.md` ✅ — guida completa per Render
- Serving file statici React in produzione configurato in `api-server/src/app.ts`
- BASE_PATH configurato via env var

## In Progresso 🔄

- Test navigazione completa su tutti i flussi
- GitHub push (bloccato in sandbox Replit — richiede azione manuale o project task)

## Da Fare (Prossime Sessioni) 📋

### Alta Priorità
- [ ] PWA manifest + service worker (Fase 3 roadmap)
- [ ] Test su iOS Safari e Android Chrome
- [ ] Onboarding guide interattiva (attualmente mostra toast "in arrivo")
- [ ] Upload copertina album (admin — endpoint presente, UI mancante)

### Media Priorità
- [ ] Notifiche push (futuro)
- [ ] Pagamenti reali (Stripe o RevenueCat — scelta modello da definire)
- [ ] Landing page pubblica con dominio

### Bassa Priorità
- [ ] Statistiche avanzate admin (grafici)
- [ ] Esportazione dati utente (GDPR)
- [ ] Multilingua (mai nella v1)

## Utenti di Test (Supabase) 🔑

| Nickname | PIN | Stato | Note |
|----------|-----|-------|------|
| mario75 | 1234 | demo_active | ~20h rimaste |
| luca_fan | 5678 | premium | — |
| giulia_stickers | 9999 | free | — |
| sofia_ro | 1111 | demo_expired | — |
| roberto_collector | 2222 | premium | — |
| admin | 0000 | admin | Accesso pannello admin |

## Secrets Configurati

| Variabile | Dove | Note |
|-----------|------|------|
| `SUPABASE_DATABASE_URL` | Replit Secrets | Connessione DB Supabase (con SSL) |
| `SUPABASE_ANON_KEY` | Replit Secrets | Chiave pubblica Supabase |
| `GITHUB_TOKEN` | Replit Secrets | Push su github.com/Dero-Stickers/stickers |
| `SUPABASE_URL` | Replit Env | https://kuigzaqaewgcosfhahkv.supabase.co |

## Blocchi Aperti ⚠️

- GitHub push: `git push` è bloccato nel sandbox Replit principale.
  **Soluzione**: usare il progetto task di Replit o pushare manualmente dal terminale locale.
- PIN hash: attualmente usa base64 + salt (dev). In produzione → usare bcrypt.

## Decisioni da Prendere

- Modello pagamento (una tantum / mensile / annuale)
- Soglia affidabilità utente (quanti scambi = affidabile?)
- Gestione minori (serve verifica età?)
