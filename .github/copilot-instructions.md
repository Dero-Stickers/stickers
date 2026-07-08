# Istruzioni per gli agent AI — questo progetto

La governance canonica, vincolante e completa è nel file **`AGENTS.md`** nella root del
repository. **Leggilo e applicalo integralmente** prima di qualsiasi modifica.

In sintesi (il dettaglio è in `AGENTS.md`, che è la fonte unica — non duplicare le regole qui):

- Le regole sono **vincoli, non suggerimenti**: confronta ogni azione con esse *prima* di agire.
- **File ≤ 350 righe**, responsabilità separate, applicato in fase di scrittura.
- **Non duplicare logiche**: cerca prima se esistono già.
- **DB = unica fonte dei dati**: niente dati applicativi hardcoded/mock a runtime.
- **Migrazioni DB additive e versionate**; mai operazioni distruttive senza autorizzazione.
- **Secrets**: `.env` in `.gitignore`, mai stampare token/chiavi; service role solo backend.
- **Push = deploy in produzione**: mai pushare senza ok esplicito dell'owner.
- **Leggi `DNA/`** (indice `DNA/00_INDICE.md`, stato `DNA/11_STATO_SVILUPPO.md`) prima di operare.
- Ogni decisione tecnica rilevante va tracciata in `DNA/17_DECISION_LOG.md`.

Se queste note e `AGENTS.md` divergessero, **vale `AGENTS.md`**.
