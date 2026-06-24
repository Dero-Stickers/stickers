# Prompt Operativo — Prossima Sessione

Incolla questo prompt nel tuo agente AI per continuare lo sviluppo:

---

Sono nel progetto **Sticker Matchbox** (PWA): monorepo pnpm · React + Vite + TS ·
Express 5 + Drizzle · Supabase · deploy su Render.

Prima di toccare qualcosa, leggi `DNA/00_INDICE.md` e in particolare
`DNA/11_STATO_SVILUPPO.md` (stato attuale, cosa è fatto e cosa manca).

**Cosa fare ora**: descrivi tu cosa vuoi.

Vincoli operativi:
- File funzionali ≤ 350 righe; non duplicare logica (centralizza in `lib/` o `middlewares/`)
- Non modificare UX/layout senza richiesta esplicita
- Nessun segreto nel codice; `.env`/`.agent/`/`CLAUDE.md` restano fuori da git
- I dati nel DB sono di test/finti
- A fine sessione: aggiorna `DNA/11_STATO_SVILUPPO.md`, backup `.tar.gz` in `backups/`, poi `./deploy.sh "messaggio"` (push su `main` = deploy)
