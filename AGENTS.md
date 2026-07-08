# AGENTS.md — Governance operativa (portabile, vincolante, autosufficiente)

> **Questo file È la governance canonica e portabile del progetto.** È versionato nel repo,
> quindi vale per QUALSIASI agent (Claude, Codex, Cursor, Copilot, …), in QUALSIASI chat nuova
> senza storico, su QUALSIASI dispositivo o clone. Va **letto e applicato automaticamente** a
> ogni sessione, senza doverlo ribadire. Contiene tutte le regole necessarie da solo: **non
> dipende dalla presenza di altri file** per essere applicabile.
>
> **`CLAUDE.md`** (root) è l'**estensione operativa** per Claude Code: aggiunge il protocollo
> di sessione e la sincronizzazione App Control. È in `.gitignore` (cache di un prompt gestito
> su App Control, **read-only** per l'agent) → **potrebbe non esserci** in una chat nuova o in un
> clone. Quando c'è, le sue regole valgono in aggiunta; quando manca, questo `AGENTS.md` basta.
> Il testo delle regole di `CLAUDE.md` si modifica **su App Control**, mai con edit locali.
> **In caso di conflitto tra i due, questo `AGENTS.md` (versionato) è la fonte di verità.**
>
> **Stato/architettura del progetto:** vive in `DNA/` (NON qui — la governance è "come si
> lavora", il DNA è "com'è fatto il progetto"). Leggere `DNA/` è obbligatorio (vedi sotto).
>
> **Caricamento automatico da altri agent:** `.cursor/rules/governance.mdc` (Cursor) e
> `.github/copilot-instructions.md` (GitHub Copilot) sono **puntatori leggeri** che rimandano
> qui — non copie. Questo garantisce che la governance venga applicata in automatico anche da
> agent che non leggono `AGENTS.md` nativamente. Se aggiungi regole, modificale **solo qui**:
> i puntatori non vanno tenuti allineati riga per riga (rimandano, non duplicano).

## Da leggere PRIMA di operare (ogni sessione)
1. `CLAUDE.md` (regole complete) — se presente.
2. `DNA/00_INDICE.md` → poi i soli file DNA pertinenti al task (non tutto il DNA).
3. `DNA/11_STATO_SVILUPPO.md` (stato corrente) e, a fine sessione, `DNA/15_PROSSIMO_PROMPT.md`.
   ⚠️ In cima a `DNA/11` c'è lo **STATO: SVILUPPO vs PRODUZIONE** e se i **dati sono di
   test o reali**: quello **vince su ogni assunzione** (anche sul linguaggio "da produzione"
   di CLAUDE.md). Se dice SVILUPPO/dati di test, NON trattare deploy/bug come incidenti
   critici di produzione. Lo cambia solo l'owner, esplicitamente.
4. `DNA/17_DECISION_LOG.md` per le decisioni tecniche già prese.

## ENFORCEMENT — le regole sono vincoli, non suggerimenti
Tratta questa governance come un **pre-commit hook mentale**: confronta ogni azione con le
regole **PRIMA** di eseguirla. Chi viola una regola crea debito tecnico che un altro dovrà
correggere. In particolare:
- **Limite righe file (350)**: se un file che stai creando/modificando supera 350 righe,
  **fermati e dividilo SUBITO**, non "dopo". (Eccezioni già documentate: `routes/auth.ts`,
  `pages/Profile.tsx`, file generati orval.)
- **Niente duplicazione di logiche**: cerca PRIMA se la logica esiste già; non scrivere
  codice nuovo senza aver verificato. (Es. `lib/trade.ts` è l'unica fonte del calcolo
  dai/ricevi; `trade-labels.ts` l'unica fonte delle etichette "Dai/Ricevi".)
- **Doc nello stesso intervento**: se la modifica incide su architettura/flussi/API/DB,
  aggiorna doc e DNA **ora**, non in un commit successivo.
- **Violazione scoperta in corsa** → **correggi subito**, non segnalarla come "da fare dopo".

## Vincoli operativi permanenti
- File piccoli e modulari (≤ 350 righe), responsabilità separate — applicato in scrittura.
- Non toccare aree non coinvolte dalla richiesta; nessun refactor massivo senza necessità documentata.
- Nessuna modifica a UX/layout/comportamento/architettura se non richiesta.
- **DB = unica fonte dei dati**: niente dati applicativi hardcoded/mock/locali a runtime
  (esempi solo in seed/test). **Parità admin/user**: ciò che l'admin gestisce, lo user lo
  legge dalla stessa fonte DB.
- **DB mai distruttivo**: schema solo via **migrazioni versionate additive** (`lib/db/migrations/`,
  `IF EXISTS`/`IF NOT EXISTS`), applicate a mano dopo conferma; **mai** `drizzle-kit push`/`--force`
  (lo schema Drizzle è parziale → un push droppa tabelle). **RLS attiva** su ogni tabella con dati.
- **Segreti**: `.env`/`.agent`/`.mcp.json` in `.gitignore`; mai stampare token/chiavi/URL con
  credenziali; service role solo lato backend, mai nel frontend/bundle.
- **Git**: `git status` prima di toccare/committare; mai committare `.env`/backup/file generati.
  **Push = deploy in produzione** (autoDeploy Render su `main`): **mai pushare senza ok esplicito**.
- **Performance e fluidità**: non introdurre regressioni (bundle, query N+1, re-render inutili,
  liste non virtualizzate, immagini non ottimizzate). Se una modifica pesa sulle prestazioni,
  segnalalo; free-tier → non saturare i limiti Supabase/Render, avvisa **prima** di avvicinarli.
- **Portabilità**: il progetto deve restare clonabile e avviabile altrove. Nessun percorso
  assoluto hardcoded, nessuna dipendenza dall'ambiente della macchina; ogni variabile richiesta
  passa da `.env` (mai valori di ambiente inline nel codice). Governance e DNA versionati.
- Ogni modifica dev'essere **verificabile, reversibile e tracciabile**; decisioni rilevanti nel decision-log.
- Prima di implementare: analizza lo stato reale del repo. Bug: riproduci e isola la causa radice.

## Selezione livello reasoning (triage)
Si applica solo se l'ambiente espone livelli selezionabili (es. Codex Low/Medium/High); senza
selettore, applica solo la triage e dichiara i task ad alto rischio procedendo con cautela.
Default **Medium**. Procedi diretto con Medium per: domande/analisi read-only, fix puntuali,
modifiche doc/config semplici, routine git/backup, UI/content circoscritte senza DB/sicurezza/architettura.
Fermati e scrivi `⬆️ SELEZIONA HIGH O EXTRA HIGH E RILANCIA — motivo: <una riga>` per:
- **HIGH**: refactor multi-file/architetturale, debug cross-layer (2+ tra FE/BE/API/DB), audit
  ampi, bonifiche con molte eliminazioni, modifiche a governance/workflow con impatto permanente.
- **EXTRA HIGH**: schema DB/migrazioni/RLS, sicurezza/auth/permessi ad ampio impatto,
  deploy/produzione/incident, eliminazioni massive, decisioni architetturali permanenti, o
  qualsiasi operazione dove un errore può causare perdita dati/downtime/esposizione segreti.
Se in corsa il task risulta più rischioso del previsto → fermati senza lasciare lavoro a metà e
chiedi l'upgrade. Se l'owner scrive "PROCEDI COMUNQUE" → esegui al livello attuale, rispettando
comunque tutte le regole di sicurezza, DB, Git, privacy e non distruttività. (Testo completo: `CLAUDE.md §2ter`.)

## Flusso controllato per ogni modifica al codice
1. **Comprensione** — riformula in 1-3 righe cosa è chiesto e cosa NON è incluso (max 2 domande se ambiguo).
2. **Piano** — file da toccare, impatto su DB/API/flussi, rischi. Procedi senza attendere, SALVO
   aree che richiedono autorizzazione (DB, secrets, deploy, architettura): lì **fermati e chiedi**.
3. **Implementazione** — minimo necessario, riusa l'esistente, non toccare aree non dichiarate;
   verifica i limiti di file in scrittura (dividi se serve).
4. **Verifica** — esegui i controlli del progetto (`pnpm typecheck`, `pnpm build`); non dichiarare
   test passati senza eseguirli; accerta che nulla si sia rotto.
5. **Chiusura** — aggiorna doc/DNA se la modifica incide su architettura/flussi/API/DB; report breve;
   registra le decisioni rilevanti in `DNA/17_DECISION_LOG.md`.
Per task banali (un testo, un colore) i punti 1-2 si riducono a una frase, mai saltati del tutto.

## Checklist PRE-modifica
- [ ] Letto `CLAUDE.md` + `DNA/00` + i file DNA pertinenti.
- [ ] Capito cosa NON va toccato; verificato che la logica non esista già.
- [ ] Il task tocca DB/auth/deploy/secrets/architettura? → piano + conferma esplicita.
- [ ] `git status` pulito/compreso prima di iniziare.

## Checklist POST-modifica
- [ ] File ≤ 350 righe, nessuna duplicazione introdotta, aree non coinvolte intatte.
- [ ] `pnpm typecheck` e `pnpm build` verdi.
- [ ] Doc/DNA aggiornati nello stesso intervento (se impattati); decisione rilevante loggata.
- [ ] `git status` ricontrollato; nessun `.env`/backup/segreto in staging. Push solo con ok esplicito.

## Quando NON intervenire
- Richiesta ambigua su punti sostanziali e rischio alto → chiedi prima.
- Operazione distruttiva/irreversibile senza autorizzazione → fermati e segnala.
- Tentazione di refactor/ottimizzazione non richiesti → proponi in una riga, non eseguire.

## Decision log (tracciamento decisioni)
Ogni decisione tecnica/di prodotto **rilevante** (scelta architetturale, deroga a una regola,
trade-off, motivo di un'implementazione non ovvia) va registrata in `DNA/17_DECISION_LOG.md`,
una riga per decisione, le più recenti in alto — **nello stesso intervento** che la prende, non
dopo. Non serve loggare fix banali o modifiche di testo. Scopo: chi arriva dopo capisce il
*perché*, non solo il *cosa*. (⚠️ Se `CLAUDE.md` cita `06_DECISION_LOG.md`, è un refuso: il file
reale è `17_DECISION_LOG.md`.)

## Handoff per le sessioni future
Chi apre una nuova sessione (stesso o altro agent) deve poter riprendere senza contesto verbale:
1. Legge questo `AGENTS.md` (regole) → `DNA/00_INDICE.md` → `DNA/11_STATO_SVILUPPO.md` (dov'è il
   progetto adesso) → `DNA/17_DECISION_LOG.md` (perché le cose stanno così).
2. `DNA/15_PROSSIMO_PROMPT.md` indica il prossimo passo previsto, se presente.
3. Lo stato SVILUPPO/PRODUZIONE e "dati test/reali" in cima a `DNA/11` **vince su ogni assunzione**.
Chi chiude una sessione con modifiche sostanziali aggiorna `DNA/11` (stato) e, se serve, `DNA/15`
(prossimo passo), così l'handoff resta vero. Documentazione allineata = handoff funzionante.

## Avvio app in locale
Dev su porta **5001**: backend `PORT=8080 pnpm run dev` (con `.env` caricato) + frontend
`PORT=5001 BASE_PATH=/ pnpm run dev`. Dettagli e stack in `DNA/`.
