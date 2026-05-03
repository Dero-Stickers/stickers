# Prompt Operativo — Prossima Sessione

Incolla questo prompt in Replit Agent per continuare lo sviluppo:

---

Sono nello stesso progetto **Sticker Matchbox PWA** (pnpm monorepo, React+Vite+TS, Express 5 + Drizzle, Supabase).

**Stato attuale (3 Maggio 2026 — Sessione 8 chiusa):**
- ✅ Sistema Segnalazioni Errori opt-in (tabella `error_reports`, 4 endpoint, ErrorBoundary, Profile dialog, pagina admin `/admin/segnalazioni`)
- ✅ Sanitizer PII: PIN/JWT/email/IPv4/IPv6/path Unix+Windows/codici recovery, context-aware su numeri
- ✅ Cleanup enterprise: -67 file orfani UI, modularizzato `pages/admin/Errors.tsx`
- ✅ Auth firmata HMAC-SHA256, password scrypt, CORS allowlist
- ✅ Lazy loading routes (bundle iniziale ~152 KB gzip)
- ✅ Supabase verificato via psql, 11 tabelle, 27 indici integri

**Cosa fare ora**: descrivi tu cosa vuoi.

Se hai dubbi su cosa toccare, ricorda i vincoli enterprise:
- max 350 righe per file funzionali
- non modificare UX/layout senza richiesta esplicita
- non duplicare logiche (centralizza in `lib/` o `middlewares/`)
- aggiorna sempre `replit.md`, `DNA/01_STATO_SVILUPPO.md`
- a fine sessione: backup `.tar.gz` in `backups/` + `./deploy.sh "msg"`
