# DNA — Decision Log

> Registro delle **decisioni tecniche rilevanti** (cosa è stato deciso e perché),
> non un changelog. Una riga per decisione, le più recenti in alto. Aggiungere qui
> ogni scelta architetturale/di prodotto non ricavabile rapidamente dal codice.
> Riferito dalla governance (`AGENTS.md`, `CLAUDE.md §3.5`).

## 2026-06

- **Governance portabile** — aggiunto `AGENTS.md` versionato (le regole complete restano in
  `CLAUDE.md`, gestito su App Control e in `.gitignore`): serve a far rispettare la governance
  anche da agent diversi e in cloni/chat senza storico. Fonte canonica unica = `CLAUDE.md`;
  `AGENTS.md` ne porta gli essenziali vincolanti e vi rimanda. ⚠️ Il riferimento in CLAUDE.md a
  `DNA/06_DECISION_LOG.md` è errato (06 = Premium): il decision-log è questo file (`17`).
- **Scroll "app nativa"** — documento bloccato (`html/body/#root` height 100% + `overflow:hidden`),
  un solo contenitore scrollabile per pagina, tutte le altezze passate a `h-full` (eliminato
  `dvh` che causava micro-salti). `MobileLayout` allineato al pattern già funzionante di
  `AdminLayout` (tab-bar come elemento fisso della colonna, non più `position:fixed`). Motivo:
  eliminare il rimbalzo/rubber-band iOS senza toccare layout/logica. Vedi `08_NAVIGAZIONE_UI.md`.
- **CSP abilitata** — header via Helmet (script-src 'self', frame-ancestors 'none', connect-src
  limitato a self + Supabase). Lo splash inline è stato esternalizzato (`public/splash-gate.js`)
  per tenere script-src stretto. Vale solo in produzione (Express serve la SPA). Vedi audit in `16`.
- **Conferma scambio concluso** — ogni utente conferma dal proprio lato; aggiorna SOLO il proprio
  album (doppia→posseduta, mancante→posseduta), mai quello dell'altro (stesso modello di sicurezza
  dell'update manuale). Modello ibrido (auto + selezione parziale), insieme valido ricalcolato lato
  server. Tabella `trade_confirmations`. Vedi `04_MATCHING_SCAMBI.md`.
- **Monetizzazione = solo sblocco chat** — app 100% gratis; si paga SOLO per aprire la chat di un
  match (acquisto `single` o `all`, una tantum, niente abbonamenti). Interruttore master
  `chat_paywall_enabled` (default OFF). Demo a tempo **eliminata**. Provider senza P.IVA
  (PayPal/simili) da collegare alla fine. Vedi `06_PREMIUM_DEMO.md`.
- **Identità slegata dal CAP** — nickname unico globale, login nickname+PIN, CAP modificabile.
  Recupero via email = prossimo passo. Vedi `02_UTENTI_AUTENTICAZIONE.md`.
- **Copertine album rimosse** — nessun artwork di terzi (scelta legale/IP): solo dati testuali.
  Vedi `09_DATABASE.md`.
