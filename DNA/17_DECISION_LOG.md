# DNA — Decision Log

> Registro delle **decisioni tecniche rilevanti** (cosa è stato deciso e perché),
> non un changelog. Una riga per decisione, le più recenti in alto. Aggiungere qui
> ogni scelta architetturale/di prodotto non ricavabile rapidamente dal codice.
> Riferito dalla governance (`AGENTS.md`, `CLAUDE.md §3.5`).

## 2026-07

- **Dettaglio album: contatori e filtri UNIFICATI [4 lug]** — i 4 box informativi (Totale/Possedute/Doppie/
  Mancanti, solo numeri) e i 4 pulsanti-filtro sotto (Tutte/Mie/Doppie/Mancanti) erano ridondanti: fusi in
  **4 card-pulsante** uniche (`AlbumDetail.tsx`), ognuna insieme **contatore + filtro**. Etichette Tutte/Mie/
  Doppie/Mancanti, numero colorato (nero/verde/rosso/arancione), sfondo bianco, angoli arrotondati, touch-
  friendly; la card attiva ha bordo+anello primario. Conserva tap=filtra e **long-press=imposta tutte a quello
  stato** (bulk, tranne "Tutte"). Robusto anche con numeri a 4 cifre (verificato: nessun overflow). Barra %
  resta sotto. Meno refusi, più minimale.
- **Popup a scomparsa (toast): sfondo bianco + titolo arancione [4 lug]** — standardizzato lo stile di TUTTI i
  toast (unico sistema, nessun sonner): sfondo `bg-background` (bianco) e **titolo `text-accent`** (arancione
  della palette, `--accent: 37 90% 55%`); i toast `destructive` restano col titolo su rosso. Coerente con la
  palette.
- **Utenti-prova: rifiniture UI + vetrina varia [4 lug]** — (1) **Toast al CENTRO** dello schermo (prima in
  alto a destra): la `ToastViewport` ora è `fixed inset-0 … items-center justify-center` con
  `pointer-events-none` sul wrapper (i click passano) e animazione fade+zoom invece di slide d'angolo — gli
  avvisi "chat/scambio non attivo" sono messaggi da leggere, non notifiche marginali. (2) **Bottone verde
  "Scambio fatto"** (FAB in chat): icona `Check` semplice e grande (`strokeWidth 3`) al posto di `CheckCircle2`
  (che aveva il cerchio interno bianco) — resta il cerchio verde del bottone. (3) **Vetrina dei 4 profili-prova
  DIVERSA e mista**: ogni profilo ha una `recipe` (in `demo-matches.ts`) con album da famiglie diverse del
  catalogo reale (Calciatori + Euro/Mondiali) e distribuzione dai/ricevi diversa → l'utente vede casi vari.
  `totalExchanges` e `albumsInCommon` sono DERIVATI dalla ricetta (`deriveTotals`) → card e dettaglio sempre
  coerenti. Standard IDENTICO per ogni nuovo utente (nessuna casualità). Verificato runtime: -101 Calciatori
  2025-26+Euro 2024, -102 Calciatori 2024-25+WC 2026, -103 Calciatori 2023-24+Euro 2020+WC 2022 (3 album),
  -104 Calciatori 2022-23+WC 2018; toast centro-Y=422/844; icona check senza cerchio.
- **Utenti-prova: percorso IDENTICO al reale, stop solo nei 2 punti finali [4 lug]** — corretto l'approccio
  precedente (che metteva un pulsante *"Scambio fatto"* fittizio nel dettaglio, inesistente per gli utenti
  veri). Ora il profilo-prova segue **esattamente lo stesso percorso del reale**: dal dettaglio si apre la
  chat (bottone tondo) → dentro la chat c'è il bottone verde → modale *"Conferma scambio"* → *"Avanti"* →
  selezione figurine → *"Conferma (N)"*. Stesse schermate (`ChatRoom`, `TradeConfirmDialog`), stessi bottoni.
  **Le 2 SOLE differenze**, ai due stop finali: (1) in chat, cliccando **invia** → toast *"Chat non attiva …
  con i profili di prova: il messaggio non viene inviato"* (il messaggio non parte); (2) nel modale, cliccando
  **"Conferma (N)"** → toast *"Scambio non attivo … con i profili di prova: il tuo album non viene aggiornato"*
  e chiusura (NIENTE doppia conferma rossa, che parlerebbe di aggiornare album reali). Entrambi i messaggi
  **specificano sempre** che è perché è un profilo di prova. **Isolamento totale**: la chat prova usa la rotta
  `/chat/demo{userId}` (riconosciuta da `ChatRoom` col prefisso `demo`) → **nessuna chiamata backend** (hook
  `useListChats`/`useGetChatMessages` disabilitati, `useRealtimeSignal` già `null` su chatId non finito); il
  modale prova (`isDemo`) disabilita `useGetChatTrade` e genera i gruppi con `buildDemoTradeGroups` (figurine
  di esempio da album REALI via `useListAlbums`, id sintetici non collidenti). Rimossi dal dettaglio: pulsante
  "Scambio fatto", nota "profilo di prova", `handleDemoTrade`. **NON toccati** (verificato via API+UI): flusso
  reale di dettaglio/chat/scambio (utente 3109: chat reale `/chat/433`, invio funzionante, scambio con doppia
  conferma). Typecheck+build OK; runtime verificato end-to-end su demo (chat estetica, invio bloccato con
  toast, modale fino a Conferma bloccata) e su reale (intatto).
- **Utenti-prova: hardening post-review multi-agente [4 lug]** — review adversariale (5 lenti + verifica)
  sulla feature onboarding: applicati i fix confermati. (1) **[ALTA]** flag di rimozione demo ora **per-utente**
  (chiave localStorage `demo_matches_dismissed_ids_v2:<userId>`, prima globale per browser): un nuovo account
  o lo switch U/A sullo stesso device rivede i profili-prova. (2) **Numeri coerenti** card↔dettaglio: il
  dettaglio mostra `totalExchanges` come la card (prima `min(tot, round(tot*0.8))` → 14 vs 11). (3) **Claim
  impossibili rimossi** per l'utente vergine: la card demo non mostra più "N album in comune / scambi fatti"
  (riga neutra "Profilo dimostrativo") e il dettaglio non dice "N figurine TUE doppie" (testo generico).
  (4) **Deep-link demo invalidi** (`/match/-999` o profilo già rimosso): redirect a `/match` invece di
  pagina fantasma. (5) **Area lontani** = "Altra zona" (non l'area dell'utente → basta "Milano · 151 km").
  (6) **Banner** solo quando ci sono card demo effettivamente visibili nella tab (non a raggio 1-4 km).
  (7) **Flash loading** eliminato: i demo non si calcolano finché `bestMatches` è in caricamento. (8)
  **Contatore Home** onesto: "N scambi di prova · N profili prova" quando il pool è solo demo. (9) Testo
  "a utente mancano" corretto; commenti 150→151 allineati. Verificato: typecheck+build, test logici
  (per-utente, coerenza, area) e visivi runtime (backend attivo, login reale, Home/Match/dettaglio, H5/H6).
- **Onboarding: 4 profili-prova per il nuovo utente [4 lug]** — per evitare l'impatto di una lista match
  vuota, il nuovo utente vede fino a **2 profili-prova nel raggio + 2 fuori** ("Utente" + badge PROVA
  arancione). **Solo FRONTEND** (`lib/demo-matches.ts`, userId negativi -101..-104): non esistono nel DB,
  quindi invisibili agli altri utenti e senza alcun conflitto con utenti reali (id positivi) — verificato
  con test incrociati. **Unica variabile = la distanza**, calcolata dal CAP dell'utente con la STESSA
  formula del backend (`estimateDistance`); capOffset tarati (+3/+8 = ~4.6/10.6 km vicini; +1500/+3000 =
  distanze). **DISTANZE**: i 2 VICINI dal CAP (+3/+8 → ~4.6/10.6 km, robusto su ogni CAP); i 2 LONTANI a
  **151 km FISSI** (`fixedKm`), oltre il raggio massimo dell'app → non entrano MAI in "Vicini" (la formula
  sul CAP non garantiva >150 km su tutti i CAP per via del suo tetto ~199 e del modulo interno). **SOGLIA**
  di vicinanza FISSA `NEAR_THRESHOLD_KM=30` (NON lo slider): decide near/far dei reali per capire quanti
  demo servono — usare lo slider ruppe la logica (a raggio grande tutti i reali sembravano vicini).
  **Vetrina**: dettaglio con dai/ricevi dimostrativi, **chat guidata** (messaggio fisso) e **scambio
  simulato** (toast, non tocca l'album). **Si SPEGNE da sola** quando l'utente ha già ≥2 match reali vicini
  (≤30 km) E ≥2 lontani (validi, con scambio); altrimenti riempie solo i posti mancanti fino a 2+2; non
  mostrata se `exchangesCompleted>0`. **Rimozione SINGOLA** dal dettaglio di ogni profilo ("Rimuovi questo
  profilo di prova" + conferma); dismissione per-id in localStorage → i rimossi non tornano (per
  dispositivo). Integrata in Home (box "Migliori match" invariato; il toggle 📍 "Vicini a me" ora FILTRA a
  ≤30 km — demo e reali — coi contatori coerenti, non più solo riordino), MatchList (banner informativo;
  filtro per raggio slider) e MatchDetail (router: userId<0 → `DemoMatchDetail`, isolato dagli hook del ramo
  reale). Contestualmente il **raggio max dello slider è passato da 100 a 150 km** (`RADIUS_MAX`; il backend
  non ha cap fisso, già compatibile). Verificato: typecheck + build OK, test logici (rimozione singola,
  persistenza, soglia 2+2 con 0/1/2/4 reali, no conflitti id, taratura su 5 CAP) e visivi con mock di utenti
  reali finti (Home Migliori/Vicini, Match tab Vicini a vari raggi, interazione demo+reali).
- **Audit privacy & sicurezza + hardening CORS [4 lug]** — audit enterprise sola-lettura (repo + chiave
  anon + connessione DB `postgres` per il catalogo RLS + header live del deploy). Esito: **rischio globale
  BASSO**. Verificato con prove: (1) **RLS ON su tutte le 15 tabelle con 0 policy = deny-all**; lettura
  anonima via PostgREST → **0 righe** da ogni tabella (anche `stickers`/`albums` che hanno dati). (2) Modello
  **backend-guardiano**: il frontend NON fa query dati a Supabase (`.from()` assente), usa il client solo per
  `auth`/realtime; tutti i dati passano da Express `/api/*`; `service_role` assente dal frontend/bundle,
  solo backend. (3) Nessuna RPC/vista custom in `public`. (4) `.env` gitignored e mai in git history.
  (5) GDPR: cancellazione (`DELETE /api/auth/me`) ed export (`GET /api/auth/me/export`) presenti; PII
  minimale (nickname/email/CAP); sanitizer PII sui log; font self-hosted; cookie banner minimale. (6) CSP/
  HSTS/CORS solidi (header live: `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
  HSTS `max-age=31536000`). **UNICO fix applicato**: CORS in prod usa ora il **dominio esatto**
  `https://stickers-matchbox.onrender.com` invece della regex jolly `*.onrender.com` (che ammetteva
  qualsiasi sotto-dominio onrender); fallback env `CORS_ORIGINS`/`RENDER_EXTERNAL_URL` invariati, dev
  localhost invariato; verificato comportamentalmente. **Rischi noti ACCETTATI**: pulsante U/A
  (`DevQuickSwitch`) visibile in prod (scelta owner, da rivalutare solo con utenti reali); token in
  localStorage (standard SPA, mitigato da CSP `script-src 'self'`); backup locale con PII (gitignored).
  **Rimandabili (media/bassa)**: `pnpm update` per DoS transitivi (`path-to-regexp`/`qs` su Express 5.2.1),
  `unsafe-inline` su style-src (splash). Nota: la migrazione 0004 era già stata applicata → nessuna colonna
  demo residua (un finding degli agenti su questo era obsoleto, letto dal backup vecchio).
- **Pulizia e alleggerimento pre-pubblicazione (stato vergine)** — in vista degli ultimi test prima del
  lancio, l'app è stata riportata a vergine e ripulita dai residui. (1) *DB*: eliminati ~3000 utenti di
  test e tutti i dati derivati (possessi, chat, messaggi, report, sblocchi); tenuti SOLO `Dero975` (id 69)
  e `admin` (id 70) resi vergini (0 album/figurine) per il pulsante U/A; catalogo `albums`/`stickers`
  INTATTO (regola: gli album non si eliminano mai, al massimo si resettano i possessi). Backup completo
  pre-pulizia in `BACKUP/`. (2) *Migrazione 0004_drop_demo APPLICATA*: rimosse le colonne `users.demo_started_at`/
  `demo_expires_at` e le settings `demo_hours`/`premium_demo_enabled` (residui della "demo premium" già
  ritirata) → DB ora 100% allineato allo schema Drizzle; isPremium/payments/paywall non toccati. (3) *Codice
  morto*: rimosse da `api-server/lib/auth.ts` le funzioni `hashPin`/`hashAnswer`/`verifyAnswer` (orfane dopo
  la rimozione della registrazione PIN; i seed hanno copie proprie) + import orfani; rimosso il hook
  `useIsMobile` (mai importato). `verifyPin` resta (login PIN legacy U/A). Typecheck 0 errori. (4) *Locale/git*:
  eliminati backup superati (snapshot 3 lug 25M, dump pre-reset, mini-backup legali), `.rollback-messaggi`,
  `album-source/scraped.json`, `dist/` e `tsbuildinfo` (~39M); rimossi il branch `replit-agent` (residuo
  Replit) e il remote `gitsafe-backup` (server locale morto). NB: `album-source/link/` NON si tocca (sorgente
  della pipeline dati album).
- **Rifiniture UI mobile (Profilo, Album, navbar Match)** — tre ritocchi estetici verificati sul
  DOM reale (Playwright, gap misurati, non a occhio): (1) *Profilo* — la firma DeroArts ora è
  ancorata in fondo, a ridosso della nav bar (gap 0px); `mt-auto` non veniva applicato → sostituito
  con uno spacer `flex-1` che spinge il footer in basso. (2) *Album* — i chip filtro categoria
  (Tutti/Campionati/Europei/Mondiali) spostati nella fascia fissa `shrink-0` FUORI dallo scroller:
  scorrono solo le card; `pb-3` sulla fascia dà uno stacco permanente ~12px (prima le card sfilavano
  a ridosso, 4px). (3) *Navbar* — icona Match = fulmine `Zap` (coerente col logo, non più le due
  sagome `Users`); da ATTIVO il fulmine è arancione PIENO (`fill-accent`) con contorno blu sottile
  (`text-primary` + `strokeWidth 0.75`). Nessun cambiamento funzionale/DB.
- **Email di supporto UNICA + testi legali in box unico** — l'email di supporto è ora una sola,
  gestita da `app_settings.support_email` (admin → Impostazioni) via hook condiviso
  `useSupportEmail()` (fallback `info-stickers@deroarts.com`): usata da Account bloccato, firma
  Profilo, info Pagamenti; nei testi legali il segnaposto `{EMAIL_SUPPORTO}` è sostituito al render
  in `LegalPage`. Prima l'email era hardcoded in 3 punti e il campo admin era inerte; ora cambiarla
  in admin la propaga ovunque (verificato e2e). In Impostazioni i 3 testi legali (privacy/termini/
  cookie) si gestiscono come UN unico testo (marcatori `===== … =====`, split ai campi DB al salvataggio,
  round-trip verificato) + "Copia tutto". Corretto il nome app "STICKERs matchbox" → "Stickers Matchbox"
  (fallback backend + testi DB). Sidebar admin: "Pannello Admin" meno spaziato.
- **Admin Errori/Segnalazioni — UI consolidata a colpo d'occhio** — pagina condivisa
  `AdminErrors`/`ErrorRow` (una per `group=auto|manual`): (1) rimossa la logica "criticità"
  dalla UI (card Critiche, badge/selettore priorità); colonna DB `priority` intatta ma non più
  esposta. (2) Filtri su UNA riga senza box contenitore (coerente con Messaggi/Utenti): cerca +
  Aggiorna (tondo, sola icona, che ricarica E azzera i filtri) + chip stato + "Copia tutto".
  (3) Nelle card lo STATO è sempre primo, reso come SOLO testo colorato (verde New, violetto in
  analisi, ecc.) — niente sfondo/contorno; il "New" verde sparisce all'apertura (new→investigating).
  (4) Il badge categoria mostra la scelta utente dal form (`Qualcosa non funziona`/`Errore album`/
  `Proposta`, colori rosso/ambra/blu) = provenienza a colpo d'occhio. (5) Sidebar admin senza icone
  (solo testo). NB: nickname "Anonimo" NON è un bug — il report cattura `userId` se loggato (join
  users→nickname); gli "Anonimo" sono dati di test seedati senza login.
- **Recupero PIN legacy rimosso + eliminazione account senza PIN** — il vecchio recupero
  (codice `STICK-XXXX` + domanda di sicurezza) apparteneva al sistema PIN, ormai soppiantato da
  Google/email; con soli utenti di test da eliminare prima del lancio, non serviva più. **Rimossi**:
  pagina `pages/auth/Recover.tsx` + route `/recover`, endpoint `POST /recover`, `/recover/lookup`,
  `/recover/answer`, `/recovery-code` (+ schemi Zod/handler), voce Profilo "Il mio codice di recupero",
  link "Password dimenticata" nel Login, riga `/recover` in `PAGE_LABEL`. Spec `openapi.yaml` ripulita
  (RecoverBody/RecoveryCodeResponse/PinConfirmBody + campo `recoveryCode` in AuthResponse) e client
  orval rigenerati. **NON toccati** (regola U/A): login nickname+PIN e `DevQuickSwitch`, che lo usa.
  Colonne DB `recovery_code`/`security_question`/`security_answer_hash` restano nullable (nessuna
  migrazione distruttiva), inutilizzate. **Eliminazione account**: non chiede più il PIN (gli utenti
  social non ne hanno, e `deleteMe` falliva per loro) → solo conferma `ELIMINA` + token; UI rifatta a
  **due conferme** (scrivi ELIMINA → "sei sicuro?") con **commiato** finale. Blocco "utente bloccato non
  può auto-eliminarsi" (403) invariato. Profilo ridisegnato: rimossi i titoli-sezione, **card unica
  compatta** (4 voci) che sta a schermo senza scroll, firma deroarts inclusa. Messaggio ErrorBoundary
  reso più sintetico ("segnalazione inviata: grazie").
- **Segnalazioni utente a 3 tipi (bug / errore contenuti / proposta)** — la modale unica "Segnala
  un problema" (solo testo libero) obbligava l'admin a indovinare tipo e cercare a mano l'album.
  Rifatta come `ReportDialog` a 2 passi (scelta tipo → form adattivo): **bug** (`user_report`),
  **errore nei contenuti** (`content_error`, con menu album + n° figurina), **proposta**
  (`feature_request`). ZERO migrazioni: il tipo va in `error_reports.errorType` (enum esteso lato
  backend), i dettagli in `meta` jsonb (albumId/albumTitle/stickerRef/requestKind). L'hash di
  dedup include il riferimento meta → segnalazioni su album/figurine diverse non si accorpano.
  Admin: DUE sezioni separate dalla stessa pagina (`AdminErrors` con prop `group`, filtro backend
  `?group=auto|manual`): **"Errori ricevuti"** (`/admin/segnalazioni`, tipi automatici
  crash/api_error/other) e **"Segnalazioni & proposte"** (`/admin/proposte`, tipi utente
  user_report/content_error/feature_request). Badge tipo (rosso/ambra/blu), box "Riferimento
  nell'album", meta nell'export "Copia per AI". Punto d'ingresso utente: "Segnala o proponi" in Profilo.
  `reportError`/ErrorBoundary invariati e retrocompatibili. Firma **deroarts** minimale in fondo
  al Profilo: solo il logo `deroarts_logo.svg` cliccabile (mailto per acquisto/collaborazioni).
- **12 album Mondiali+Europei caricati e pubblicati** — 6 World Cup (2006/2010/2014/2018/2022/2026)
  + 6 Euro Cup (2004/2008/2012/2016/2020/2024), tutti On Line. Il builder specifico
  `build:worldcup-data` è stato sostituito da `build:albums-data` GENERICO: deduce
  titolo+categoria dal nome file (`World Cup <anno>`→mondiali, `Euro Cup <anno>`→europei), un
  `.gz` per album; `restore:albums` fa auto-discovery di tutti i `.gz` (aggiungere un album =
  solo un `.md` + build, zero modifiche al codice). L'album 2026 esistente è stato rinominato
  in DB da "FIFA World Cup 2026" a "World Cup 2026" (id 34 invariato → 992 possessi intatti) per
  uniformare il formato. Refusi sorgente sistemati a monte: World Cup 2006 aveva 24 numeri
  condivisi da 2 giocatori (com'è nell'album Panini reale) → suffisso a/b nel .md, nessuna
  figurina persa; rimosso il .md doppione `panini_world_cup_2026.md`. La regola vincolante:
  gli album vergini non si eliminano mai senza autorizzazione esplicita dell'owner.
- **Categorie master degli album (Mondiali/Europei/Campionato, scalabile)** — con l'arrivo di
  più competizioni la lista piatta di album non regge. Scelto: colonna `albums.category`
  (mig. 0009 additiva) assegnata dall'admin da un menu, NON dedotta dal titolo (fragile: la
  vecchia `isWorldCup` regex è stata rimossa). Fonte unica `ALBUM_CATEGORIES`: in `@workspace/db`
  (validazione server) + replica in `@workspace/api-client-react` (UI) perché il frontend non
  può dipendere dal package DB (ha `pg`). Aggiungere una categoria futura = una riga nelle due
  liste + eventuale icona, zero migrazioni. User "Disponibili": chip-filtro per categoria
  (solo categorie presenti, >1); ordine per categoria poi titolo. Icone per categoria ottimizzate
  (mappa unica): world-cup.png / coppa-europei.png / scudetto.svg. Backend valida la category
  (input non valido → default/invariata). restore/export/build dati versionati includono category.
- **Album FIFA World Cup 2026 (primo album a codici alfanumerici)** — 992 figurine, 48 squadre,
  codici stampati tipo MEX10/FWC19/CC1: NESSUNA migrazione necessaria (lo schema aveva già
  `code` testuale separato da `number` posizionale). Pipeline: checklist testuale in
  `album-source/link/panini_world_cup_2026.md` → `build:worldcup-data` → dataset versionato
  `world-cup-2026.json.gz` → `restore:albums` (ora multi-sorgente; non tocca più
  `is_published` degli esistenti — pubblicare è dell'admin). Creato NON pubblicato (id 34).
  UI: figurine con stesse colonne/proporzioni degli altri album (griglia identica), codice
  lungo su 2 righe nella cella; **suddivisione in blocchi per nazione** con intestazione
  (nome + linea sottile) SOPRA la griglia del blocco, fuori dalla grid (scartato l'header
  `col-span-full` interno: rompeva su WebKit aspect-square+content-visibility). Icona coppa
  sulla card, Mondiali pinnati in cima. `export:albums` esclude i Mondiali; gli scambi/match
  mostrano il codice stampato (`code || number`, `lib/trade.ts` include `code`).
- **Blocco utente a prova di aggiramento (lista nera email + gate azioni)** — scoperto in audit che
  il blocco viveva solo su `users.is_blocked`: controllato SOLO al login, e un bloccato poteva
  eliminare l'account (hard delete) e re-iscriversi con la stessa email ripartendo pulito. Deciso:
  (1) migrazione additiva **0008** → tabella `blocked_emails` (unique `lower(email)`, RLS deny-all)
  allineata da admin blocca/sblocca — la traccia sopravvive all'eliminazione dell'account;
  (2) gate `requireNotBlocked` sulle route di azione + check inline su location/export/delete →
  bloccato fermato subito anche a sessione aperta (`/auth/me` escluso di proposito: serve alla shell);
  (3) un bloccato NON può auto-eliminarsi; (4) comunicazione unica: modale "Account bloccato" con
  mailto supporto (costante `SUPPORT_EMAIL` in `BlockedAccountDialog.tsx`, email provvisoria da
  definire), mostrato al login (PIN/Google/Email) E a sessione aperta via observer globale
  `setAccountBlockedObserver` → `BlockedGate`. Codice errore unificato a `ACCOUNT_BLOCKED`
  (il frontend accetta anche il legacy `BLOCKED`). Verificato end-to-end: 5/5 azioni 403,
  blocklist case-insensitive, sblocco ripristina tutto.
- **Eliminazione chat — soft-delete per-utente (stile WhatsApp)** — ognuno elimina la chat DAL PROPRIO
  lato, l'altro la conserva (policy + moderazione salve: nessuno distrugge la copia altrui). Migrazione
  additiva **0007** → `chats.deleted_by_user1/2` (bool, default false). `DELETE /api/chats/:chatId`
  (`chats.ts`, `deleteChat`): imposta il flag del chiamante; se l'altro l'aveva GIÀ eliminata → cancella
  davvero la riga (cascade su messages/reports/trade_confirmations) = **DB leggero senza violare la
  policy**, esattamente l'obiettivo dell'owner. `listChats` filtra via le chat eliminate dal lato del
  richiedente. **Resurrezione:** un nuovo messaggio (`sendMessage`) azzera entrambi i flag → la chat
  riappare per tutti (comportamento WhatsApp). Frontend: swipe-sinistra sulla card in `/messaggi`
  (`components/chat/ChatRow.tsx`, touch nativi, cassetto cestino 80px) → conferma AlertDialog → delete
  ottimistico. Scartati: "elimina per tutti" (sabota la moderazione) e cestino fisso nell'header (tap
  accidentale). Solo nella lista, non dentro la ChatRoom.
  **Protezione moderazione (la moderazione vince):** la cancellazione DEFINITIVA dal DB (quando entrambi
  eliminano) è bloccata se esiste un `report` con status `pending` sulla chat → resta nel DB come prova
  per l'admin, sparisce solo dalle liste utenti. Impedisce a un utente segnalato di distruggere le prove
  eliminando la chat. Il **blocco utente** è sull'account (`users.is_blocked`), indipendente dalla chat →
  eliminare la chat non sblocca nessuno. Bug trovato dall'owner in review: la FK `reports.chat_id` avrebbe
  perso il riferimento alla cancellazione.
  **Rimosso "Elimina chat" ADMIN** (pulsante + `DELETE /api/admin/chats/:chatId`): cancellava
  chat+messaggi+segnalazioni in modo irreversibile e SENZA la protezione moderazione → distruggeva prove.
  Per moderare bastano Chiudi (reversibile) + Blocca + Segna gestita, tutti non distruttivi. L'endpoint admin
  non era nello spec OpenAPI (era una fetch diretta), quindi nessun client da rigenerare.
  **Nota UX collegata:** freccia indietro della ChatRoom riportata a `setLocation("/messaggi")` fisso —
  `window.history.back()` era inaffidabile (history con redirect auth / dopo refresh → il pulsante non
  reagiva). Messaggi è ora la destinazione naturale dell'elenco chat da qualsiasi ingresso.
- **Sezione "Messaggi" dedicata (5ª voce navbar)** — le conversazioni escono dall'ambiguità con "Match":
  nuova pagina `pages/chat/Messages.tsx` (rotta `/messaggi`, lazy + prefetch) che elenca TUTTE le chat
  (non lette in cima, poi per recency), card minimali volute dall'owner: icona + nickname + scritta verde
  "Nuovi messaggi" (niente anteprima/contatore nella card). Il **badge rosso non-letti spostato da Match
  a Messaggi** in navbar (5 icone: Home, Album, Match, Messaggi, Profilo — verificato touch-friendly,
  ~72px/icona su iPhone SE ≥ minimo 44px), cap visualizzazione **99+**. Fix coerenza: (1) `ChatRoom`
  ora invalida `listChats` quando apre una chat con non-letti → segnale card + badge navbar si spengono
  subito senza reload (prima il backend marcava letto ma la cache lista restava stantia); (2) freccia
  indietro della chat = `history.back()` con fallback `/messaggi` (prima era fissa su `/match`, incoerente
  arrivando da Messaggi). Scartata l'alternativa "badge sulle card match": mescolava scoperta persone e
  conversazioni. Rollback point: `.rollback-messaggi/` (gitignored).
- **Ricerca mirata per singola figurina** — l'utente cerca UNA figurina e vede chi la offre come doppia.
  Backend: `GET /api/matches/by-sticker/:stickerId` (`matches.ts`), query leggera sull'indice esistente
  `(sticker_id, state)` — nessuna migrazione DB — LIMIT 500 SQL, top 100 per distanza CAP; cache dedicata
  `u:{id}:sticker:{stickerId}` (pulita da `invalidateUser`). Spec OpenAPI + client orval rigenerati
  (`useGetMatchesBySticker`). Frontend: 3ª tab "Cerca figurina" in `MatchList` (select album → figurina,
  pre-compilabile via query string `?tab=search&album=&sticker=`), card risultato estratta nel condiviso
  `components/match/MatchCard.tsx` (riusata da tutte le tab, niente markup duplicato). Ingressi: lente 🔍
  nel box "Migliori match" in Home (solo icona, sobria) e pulsante "Chi ha questo doppione?" nel dialog
  figurina di `AlbumDetail` (SOLO se stato `mancante`). `totalExchanges:1` fisso nel risultato = shape
  `MatchSummary` riusato; il dettaglio vero resta su `/matches/:userId`.
- **Comunicazione blocco/segnalazioni all'utente** — concetto unico "l'utente sa cosa succede, senza
  mai sapere chi lo ha segnalato". 3 pezzi non invasivi: (1) **bloccato** → modale dedicato con email
  supporto cliccabile `stickers@deroarts.com` (segnaposto, casella da creare). Scatta su TUTTI i canali:
  login PIN (`Login.tsx`, intercetta `error: ACCOUNT_BLOCKED`), Google ed Email — `social-auth.ts`
  propaga un `kind:"blocked"` (prima il codice si perdeva → login Google bloccato restava MUTO; bug
  trovato in revisione adversarial). (2) **chi segnala** → toast "L'admin sta esaminando il caso"
  (`ChatRoom.tsx`). (3) **segnalato** → banner generico di sistema in `MobileLayout` ("Alcune tue
  conversazioni sono sotto revisione"), chiudibile per sessione, guidato dal campo `UserProfile.underReview`
  (calcolato SOLO in `GET /api/auth/me`: esiste ≥1 report **pending** a suo carico). Scartate: rivelare il
  segnalante e bloccare la chat in automatico (ritorsioni + abuso). L'avviso NON è agganciato alla singola
  chat né al momento.
  **Archiviazione segnalazioni (admin):** nuovo `PATCH /api/admin/chats/:chatId/resolve-report`
  (`resolveChatReports`, solo admin) porta i report pending→**resolved** (storico conservato). Pulsante
  verde "Segna come gestita" nel dettaglio chat (`Messages.tsx`). Serviva perché prima nessun flusso
  cambiava lo status → il banner "sotto revisione" restava a vita su utenti innocenti (bug di design
  trovato in revisione). Ora sparisce quando l'admin archivia. Verificato E2E: pending→resolve→underReview
  passa true→false; endpoint nega non-admin (403) e anonimi (401).
- **Admin UI consolidata (componenti condivisi)** — creati 3 componenti riusabili per uniformare
  tutte le tabelle admin: `SortHeader` (una sola icona a 3 linee crescenti, senza testo, colorata
  quando attiva), `AdminFilterBar` (ricerca + chip di stato, sfondo bianco, gap minimo con la
  tabella via `-mt`) e `ConfirmDialog`/`useConfirm` (modale coerente Radix AlertDialog che sostituisce
  TUTTI i `window.confirm` nativi). Applicati a Utenti, Album, Messaggi, Segnalazioni, Monetizzazione.
  Regole: ricerca + filtro stato + ordinamento si combinano (AND); ogni pulsante rosso/distruttivo
  chiede conferma; nessun popup nativo del browser. Motivo: coerenza visiva e sicurezza uniforme.
- **Stato accesso chat a 3 livelli in Gestione Utenti** — filtro utenti allineato ai badge reali:
  Free (nessuno sblocco), Alcune chat (`chat_unlocks` singoli), Tutte le chat (premium/sblocco totale),
  più Bloccati. Classificazione unica via `classifyAccess` (none/some/full), stessa fonte dei badge.
- **Chat admin — Elimina + Riapri** — `deleteChat` (DELETE, rimuove prima le segnalazioni poi la chat)
  e `reopenChat` (PATCH `/reopen`, status→active). "Chiudi" ora è realmente reversibile (Riapri) e
  chiede conferma con nota sulla sua funzione. Segnalazioni: `deleteErrors` (DELETE bulk, singola o
  selezione multipla). Vedi `07_ADMIN_PANNELLO.md`.
- **HARD TEST 3.000 utenti — 2 bug di scaling admin trovati e risolti** — popolata l'app come
  "pubblicata da tempo" (3.000 utenti su 50 città, ~116k figurine, media 34.9 doppie+mancanti/utente,
  400 chat, 2009 messaggi, 34 segnalazioni) via `lib/db/src/seed-hardtest.ts` (additivo, marchio
  `STICK-TST-`, non tocca il catalogo). Peso DB: **33 MB / 500 MB** (6.6%, ampio margine). I test di
  performance hanno scoperto 2 endpoint admin che collassavano sotto carico:
  (1) **`GET /api/admin/users`** — N+1 (una query album per ogni utente) → con 3.000 utenti **500 dopo
  10s** (pool saturo). Fix: conteggio album in UNA query `GROUP BY` → **445 ms**.
  (2) **`GET /api/admin/stats`** — scaricava intere tabelle in RAM per contarle (`select().from(messages)`
  ecc.) → lento e sprecone. Fix: unica query con `COUNT(*)` → **491 ms → 44 ms**.
  Gli endpoint match (cache 60s) e `listChats` (già ottimizzato) erano OK. La cattura errori funziona
  (2 crash residui vecchi in `error_reports`, non del test). Pulizia post-test: `DELETE ... STICK-TST-%`.
- **Sezione Messaggi admin — moderazione completa + scaling** — preparata per 2.000-3.000 utenti.
  (1) `listChats` riscritto da N+1 (1 + 4·N query) a **poche query aggregate** (nickname via
  `id = ANY`, conteggi messaggi GROUP BY, ultima segnalazione DISTINCT ON) → regge migliaia di chat;
  aggiunti `user1Id`/`user2Id` al payload. (2) Nuovo `DELETE /api/admin/chats/:chatId` (solo admin):
  toglie prima le `reports` collegate (FK NO ACTION) poi la chat → messaggi/conferme spariscono per
  CASCADE. (3) Dialog Messaggi: pulsanti **Elimina chat** + **Blocca** (per ciascun partecipante,
  riusa `PATCH /users/:id/block`), con conferma. Frontend usa `fetch`+`authHeaders` (no rigenerazione
  OpenAPI). Verificato live (lista campi ok, delete a cascata ok). Vedi `08_NAVIGAZIONE_UI.md`.
- **⛔ Pulsante switch U/A (DevQuickSwitch) — INTOCCABILE per regola dell'owner** — il pulsante
  tondo "U/A" (in `components/dev/DevQuickSwitch.tsx`) **bypassa l'autenticazione** (login automatico
  con account demo Dero975/admin, switch istantaneo vista Utente↔Admin) ed è una scelta INTENZIONALE,
  sempre attiva anche in produzione. NON va rimosso, gated o modificato, né vanno cancellati gli
  account demo, **senza ordine esplicito** dell'owner — "consolida/ripulisci/azzera" NON autorizzano.
  L'azzeramento app di giu 2026 aveva cancellato gli account demo rompendo il pulsante → **ripristinati**
  (`Dero975` pin 1234, `admin` pin 0000). Protezione resa permanente: guardia nel codice + memoria
  `sticker-pulsante-ua-non-toccare`. Errore ricorrente da non ripetere.
- **App azzerata a stato vergine (pre-pubblicazione)** — eliminati TUTTI gli utenti (60, admin
  e Dero975 inclusi), chat, messaggi, sblocchi, pagamenti, conferme scambio, segnalazioni e
  possessi (`user_albums`/`user_stickers`); resta INTATTO il catalogo (`albums` 23 + `stickers`
  17.581) e `app_settings`. Anche `auth.users` Supabase = 0. Backup completo pre-operazione in
  `BACKUP/db_pre_reset_*.sql.gz`. Motivo: l'app va pubblicata "come nuova". Eseguito in singola
  transazione, ordine FK-safe (prima `reports`/`admin_actions` NO ACTION, poi cascata).
- **Registrazione nickname+PIN RITIRATA** — i nuovi account si creano SOLO con Google o Email
  (Supabase Auth). Rimossi dal frontend (`Login.tsx`): form di registrazione PIN, campi domanda/
  risposta di sicurezza, schermata "salva il codice STICK". Rimossi dal backend (`routes/auth.ts`):
  handler `register`, rotta `POST /api/auth/register`, `generateRecoveryCode`, import inutili. Il
  form nickname+PIN resta SOLO come accesso (account storici/admin); login + `/recover` legacy intatti.
  Schema generato `RegisterBody` (api-zod/api-client) lasciato com'è (codice generato, mai chiamato).
- **Privacy/Termini aggiornati per Google/Email** — testi in `app_settings` (DB, unica fonte): la
  privacy ora dichiara la raccolta dell'**email** (Google/Email), elenca **Google (OAuth)** e
  **Brevo** tra i fornitori, e cifratura di password/PIN; rimossa la frase falsa "Non raccogliamo
  email". Termini: account creato con Google/Email, nickname non modificabile, account PIN storici
  ancora validi. Modifica via UPDATE su `privacy_policy`/`terms`, niente testo legale hardcoded.
- **Accesso con Email/password (Brevo SMTP), no costi** — aggiunto "Continua con Email"
  (registrazione+accesso+reset password) via Supabase Auth + Brevo (gratis 300/giorno). UI
  `EmailAuth.tsx` (conferma password + occhio + avviso spam), template email brandizzati. Mittente
  verificato su Brevo = `dero975@gmail.com`. **Nodo aperto:** mail consegnate ma in SPAM perché
  inviate da dominio gratuito → per la prod serve un dominio proprio con DKIM/DMARC. Vedi `18_PIANO_AUTH.md`.
- **Accesso moderno con Google (Supabase Auth), no costi** — adottato "Continua con Google" via
  Supabase Auth (già nel progetto), mantenendo nickname+PIN legacy. Ponte identità: il frontend
  ottiene l'access token Supabase → backend lo verifica presso Supabase (`lib/supabase-auth.ts`) →
  crea/collega l'utente nel nostro DB e rilascia il NOSTRO token HMAC (resto app invariato). Nuovo
  utente social sceglie nickname (permanente) + CAP, niente PIN/domanda/codice STICK. Migrazione
  additiva 0006 (email/auth_provider/supabase_user_id; PIN/domanda/recovery_code → nullable, indici
  unici parziali). Free tier ampio (50k MAU; Google login non manda email → illimitato). Email/
  password + reset = quando ci sarà SMTP gratuito (Brevo). Vedi `18_PIANO_AUTH.md`.
- **Cattura errori silenti (mini-Sentry self-hosted, no dipendenze esterne)** — scelto di NON
  adottare Sentry (dato fuori UE/GDPR, costo, free tier) e di potenziare il sistema interno:
  handler globali client (`lib/error-capture.ts`: window.error + unhandledrejection +
  vite:preloadError) con dedup/throttle/filtro-rumore; API 5xx/rete → `api_error` automatico via
  un `FetchFailureObserver` in `custom-fetch.ts` (lib resta indipendente: chiama l'hook solo se
  registrato); i 4xx normali esclusi (rumore); ErrorBoundary auto-invio; chunk fallito → reload
  una volta (guard sessionStorage) per evitare lo schermo bianco. Test via `node --test`+tsx
  (no nuove dep di runtime; tsx era già transitiva). Nota infra: i binari nativi darwin-arm64
  (rollup/esbuild/lightningcss) sono disabilitati negli override di `pnpm-workspace.yaml` (deploy
  Linux); per buildare/dev in locale su Mac vanno reinstallati a mano nel rispettivo pkg.
- **Home/Profilo più standard (UI)** — Home: "Migliori match" mostra **4** anteprime (3 erano poche); a
  meno di 4 match gli slot mancanti restano placeholder tratteggiati per **altezza card fissa**. Profilo:
  voci consolidate in 3 sezioni con titoletto (Account / Aiuto e supporto / Informazioni), sottotitoli
  rimossi, freccia `›` per riga; **"Contatta il supporto" rimosso** (ridondante con "Segnala un problema");
  due pulsanti finali speculari e `rounded-xl` (Esci = bianco/rosso, Elimina = rosso pieno). Solo frontend,
  nessun impatto DB/API. Vedi `08_NAVIGAZIONE_UI.md`.
- **Fluidità render (no nuove dipendenze, layout invariato)** — il rallentamento al
  "popolamento" era lato React, non DB (query figurine ~12ms, indici ok). Fix: cella griglia
  in `StickerCell` (`React.memo`) + callback stabili → al tap si ri-renderizza solo la cella
  toccata; lista filtrata e conteggi in `useMemo`; stesso pattern per i derivati di
  Home/Album/Match. Virtualizzazione **scartata** per ora (cambierebbe scroll/layout;
  `content-visibility` già salta il paint fuori schermo) — da valutare solo se l'apertura di
  album da 700+ resta lenta su device. Vedi `08_NAVIGAZIONE_UI.md`.
- **Azioni di massa sugli stati figurina** — sui chip Mie/Doppie/Mancanti la pressione lunga
  apre una conferma e imposta TUTTE le figurine dell'album a quello stato, sovrascrivendo le
  selezioni ("Mancanti" = reset album). "Tutte" senza azione; tap singolo = filtro. Endpoint
  additivo `POST /user/albums/:id/stickers/bulk` `{state}` (un solo UPDATE sulle sole righe che
  cambiano, dati propri, cache match invalidata). Modale in `BulkStateDialog`. Motivo: album
  passati già completati + necessità di un reset (l'azione è reversibile dall'utente). Scartata
  l'idea iniziale "completa solo le mancanti" perché non reversibile. Vedi `03_ALBUM_FIGURINE.md`.
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
