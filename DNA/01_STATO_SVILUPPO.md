# DNA — Stato Sviluppo

Ultimo aggiornamento: 1 Maggio 2026 — Sessione 1

## Completato ✅

- Struttura monorepo (artifacts/stickers-app + artifacts/api-server)
- PROJECT_SPEC completo (00-11)
- DNA folder con documentazione
- Backup folder pronto
- OpenAPI spec per tutti gli endpoint
- Codegen (React Query hooks + Zod schemas)
- Schema DB (Drizzle)
- Backend Express con route complete
- Mock data realistici (utenti, album, figurine, match, chat)
- Frontend React completo (user app + admin panel)
- Design system (palette logo/screenshot)

## In Progresso 🔄

- Test navigazione completa
- Verifica flussi utente critici

## Da Fare (Prossime Sessioni) 📋

### Alta Priorità
- [ ] Integrazione Supabase (variabile DATABASE_URL)
- [ ] Rimozione mock data → API reali
- [ ] PWA manifest + service worker
- [ ] Test su iOS Safari e Android Chrome

### Media Priorità
- [ ] Upload copertina album (admin)
- [ ] Notifiche push (futuro)
- [ ] Pagamenti (uno dei modelli scelto)
- [ ] Landing page pubblica

### Bassa Priorità
- [ ] Statistiche avanzate admin
- [ ] Esportazione dati utente (GDPR)
- [ ] Multilingua

## Blocchi Aperti ⚠️

- Nessun blocco critico al momento
- Supabase non ancora connesso (by design — fase mock)

## Decisioni da Prendere

- Modello pagamento (una tantum / mensile / annuale)
- Soglia affidabilità utente (quanti scambi = affidabile?)
- Gestione minori (serve verifica età?)
