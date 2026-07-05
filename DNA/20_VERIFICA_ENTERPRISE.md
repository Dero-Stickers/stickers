# DNA — Mappa verifica finale (pre-pubblicazione, stato enterprise)

> **Scopo:** documento-MAPPA per la **verifica finale approfondita** prima della
> pubblicazione. Non ripete i contenuti degli altri file: li **indicizza**. Per
> ogni area dice **cosa verificare**, **dove** (file DNA + file di codice reale)
> e i **punti critici** da non dare per scontati. Da usare come checklist modulare:
> si può consolidare un'area alla volta senza tenere tutto in testa.
>
> **Come leggerlo:** ogni sezione = un modulo verificabile in autonomia. `▸ DNA`
> = dettaglio funzionale. `▸ Codice` = dove sta l'implementazione. `⚠` = punto
> critico o allineamento da controllare. `☐` = check da spuntare alla verifica.
>
> **Stato modello (lug 2026):** app **100% gratuita**, auth Google + Email/password
> (PIN solo per switch U/A dev), unico introito = donazione Ko-fi. Vedi §5 e §11.

---

## 0. Legenda percorsi rapidi

- **Frontend app:** `artifacts/stickers-app/src/`
- **Backend API:** `artifacts/api-server/src/`
- **Schema DB:** `lib/db/src/schema/` · **Migrazioni:** `lib/db/migrations/`
- **API spec (fonte tipi):** `lib/api-spec/openapi.yaml` → genera `lib/api-client-react` + `lib/api-zod`
- **Routing app:** `App.tsx` (wouter) · **Auth state:** `contexts/AuthContext.tsx`

---

## 1. Autenticazione & utenti
▸ DNA: `02_UTENTI_AUTENTICAZIONE.md`, `18_PIANO_AUTH.md`
▸ Codice: `pages/auth/Login.tsx`, `pages/auth/EmailAuth.tsx`, `contexts/AuthContext.tsx`,
  `routes/auth.ts`, `lib/auth.ts`, `lib/supabase-auth.ts`
- ☐ Login **Google** + **Email/password** funzionanti (in locale ok; ⚠ verificare env Google su Render).
- ☐ Registrazione: nickname (unico per CAP), CAP, checkbox **età ≥16** + accettazione legali.
- ☐ Sessione ricordata su device fino a logout; token in `localStorage` (`sticker_token`).
- ⚠ **Pulsante switch U/A (`DevQuickSwitch`)**: bypassa auth — NON rimuovere/gatare (regola assoluta owner). PIN sopravvive SOLO per questo.
- ⚠ **Recupero PIN legacy rimosso** (lug 2026): niente più codice STICK/domanda sicurezza/pagina `/recover`.
- ⚠ **Email auth in SPAM** (Brevo da gmail): nodo aperto, si risolve col dominio proprio → §10.

## 2. Album & figurine
▸ DNA: `03_ALBUM_FIGURINE.md`
▸ Codice: `pages/album/AlbumList.tsx`, `pages/album/AlbumDetail.tsx`, `routes/albums.ts`,
  `routes/user-albums.ts`, schema `albums`/`stickers`/`user_albums`/`user_stickers`
- ☐ "I miei album" / "Album disponibili"; aggiunta/rimozione album con conferma.
- ☐ Stati figurina ciclici (Mancante→Posseduta→Doppia), filtri, long-press modale, contatori + % completamento.
- ☐ Categorie master album (`albums.category`, admin-assegnate).
- ⚠ **Copertine album RIMOSSE** (scelta legale/IP): nessuna immagine Panini. Verificare che non ricompaiano.
- ⚠ **Scaling storage**: le "mancanti" NON si salvano come riga (mancante = album posseduto + nessuna riga). Vedi `16_STRESS_TEST_AUDIT.md`.

## 3. Matching & scambi
▸ DNA: `04_MATCHING_SCAMBI.md`
▸ Codice: `pages/match/MatchList.tsx`, `pages/match/MatchDetail.tsx`, `pages/match/SearchSticker.tsx`,
  `routes/matches.ts`, `lib/matchCache.ts`, `routes/chat-trade.ts`, `lib/trade.ts`
- ☐ Scambio **sempre 1:1**; match valido solo se reciproco; conteggio = max scambi 1:1 possibili, **multi-album**.
- ☐ Viste "Migliori match" / "Vicini a te"; filtro **raggio CAP** (max 150 km); "Tu dai / Tu ricevi".
- ☐ Ricerca figurina (`SearchSticker`), presente anche in Home (icona lente).
- ☐ Conferma scambio concluso (`trade_confirmations`, aggiorna album lato singolo utente).
- ⚠ **Profili-prova** (4 per nuovo utente, solo frontend) + "56 scambi di prova": verificare che siano isolati e rimovibili, non inquinino dati reali.
- ⚠ **`matchCache`**: TTL/limiti (env `MATCH_CACHE_*`) — controllare coerenza dati dopo cambi stato.

## 4. Chat & moderazione
▸ DNA: `05_CHAT_MODERAZIONE.md`
▸ Codice: `pages/chat/Messages.tsx`, `pages/chat/ChatRoom.tsx`, `routes/chats.ts`, schema `chats`/`messages`/`reports`
- ☐ **Chat sempre gratuita e apribile** (nessun paywall — verificare che non ci sia gate 403).
- ☐ Una sola chat per coppia utenti (non per album); apre solo da match valido.
- ☐ Avviso moderazione; pulsante "Segnala"; bell badge = n° chat con non letti (non n° messaggi).
- ☐ Soft-delete chat; admin può vedere/chiudere/riaprire chat e bloccare utente.
- ⚠ **Chat via Supabase Realtime** (`lib/realtime.ts`): verificare che funzioni online (service role su Render).

## 5. Donazioni Ko-fi (unico introito)
▸ DNA: `06_PREMIUM_DEMO.md`, `19_DOMINIO_DEROARTS.md` §2bis
▸ Codice: `components/brand/KofiButton.tsx`, `pages/admin/Donations.tsx`, `routes/kofi.ts`,
  `routes/admin.ts` (`getDonations`), schema `donations`
- ☐ Pulsante "Support Stickers" (fonte unica `KofiButton`) in Profilo + modale guida.
- ☐ Webhook `POST /api/kofi/webhook`: verifica `KOFI_VERIFICATION_TOKEN`, idempotente (`kofi_message_id` UNIQUE). **Testato LIVE**.
- ☐ Admin → Donazioni: riepilogo + elenco (sola lettura); avviso "in attesa" finché vuoto.
- ⚠ **Nessuna monetizzazione residua**: paywall/billing/payments/chat_unlocks rimossi da codice E DB. `users.is_premium` inerte.
- ⚠ Frase obbligatoria "non sblocca nulla, è solo un grazie" (liberalità, non corrispettivo) — non legarla mai alla gratuità.
- ⚠ Config Ko-fi = passo owner (URL webhook + token già impostati); al dominio cambiare solo l'URL webhook.

## 6. Pannello admin
▸ DNA: `07_ADMIN_PANNELLO.md`
▸ Codice: `pages/admin/*` (`Dashboard`, `Albums`, `Users`, `Messages`, `Donations`, `Errors`, `Settings`),
  `components/admin/*` (`AdminPage`/`AdminTable`/`AdminScrollArea`), `routes/admin.ts`
- ☐ Sezioni: Dashboard · Album · Utenti · Messaggi · **Donazioni** · Segnalazioni/Proposte · Errori · Impostazioni.
- ☐ Layout consolidato (testata fissa, solo lista scorre; tabelle sticky/compatte).
- ☐ Album: Gestisci (rinomina+figurine), On Line/Off Line, colonna Utenti.
- ☐ Utenti: blocco/sblocco (+ `blocked_emails` a prova di aggiramento). Messaggi: moderazione.
- ☐ Impostazioni: support_email, testi legali, **modalità guida** (off/first/always, default off).
- ⚠ Admin **non** subisce limitazioni; verificare che `requireAdmin` protegga TUTTE le rotte `/admin/*`.

## 7. Guida interattiva (onboarding)
▸ DNA: `18_GUIDA_INTERATTIVA.md`
▸ Codice: `lib/guide/*` (`steps.ts`, `GuideContext.tsx`) + `components/guide/*` (`GuideOverlay.tsx`, `GuideFinishDialog.tsx`, `guide-theme.css`), `App.tsx` (`GuideAutoStart`)
- ☐ Modalità globale da admin: `off` (default) / `first` / `always` — letta via `useGetAppSettings`.
- ☐ Step coerenti con le pagine reali; modale finale "Welcome in Stickers!" → "Inizia" porta in Home.
- ⚠ Owner ha scelto **off** per ora: verificare che non parta da sola.

## 8. Navigazione & UI
▸ DNA: `08_NAVIGAZIONE_UI.md`
▸ Codice: `App.tsx` (rotte wouter), `components/layout/*` (AppHeader, footer nav)
- ☐ Footer 5 voci: Home · Album · Match · **Messaggi** · Profilo.
- ☐ Rotte utente: `/`, `/album`, `/album/:id`, `/match`, `/match/:userId`, `/messaggi`, `/chat/:chatId`, `/profilo`, `/legal/:doc`, `/login`.
- ☐ Rotte admin: `/admin`, `/admin/album|utenti|messaggi|donazioni|segnalazioni|proposte|impostazioni`.
- ☐ Light mode only, mobile-first, head bar unificata, solo contenuto scorre.
- ⚠ PWA installabile (service worker, manifest, Inter self-hosted): testare su iOS/Android reali.

## 9. Database & sicurezza dati
▸ DNA: `09_DATABASE.md`, `16_STRESS_TEST_AUDIT.md`
▸ Codice: `lib/db/src/schema/*`, `lib/db/migrations/*`
- ☐ **14 tabelle**, tutte con **RLS ON** (verificare `donations` inclusa). Accesso solo backend (service role/postgres).
- ☐ `app_settings` = 5 chiavi (app_name, cookie_policy, privacy_policy, support_email, terms). Nessun residuo paywall.
- ☐ Schema Drizzle allineato al DB reale; migrazioni additive; mai `db push --force` su prod.
- ⚠ **Free tier Supabase**: soglie di tenuta e keepalive — vedi `16_STRESS_TEST_AUDIT.md`. Segnalare prima di saturare.
- ⚠ **`is_premium` inerte**: presente ma non usata. Non ripristinarla.

## 10. Sicurezza, segreti & privacy
▸ DNA: `10_PRIVACY_LEGALE.md`
▸ Codice/DB: `.env` (gitignored), `app_settings` (privacy_policy/terms/cookie_policy)
- ☐ `.env` sempre in `.gitignore`; mai segreti nel codice/commit; service role solo backend.
- ☐ Testi legali nel DB coerenti: **età 16** (privacy = scelta titolare, non obbligo di legge), clausola donazioni Ko-fi.
- ☐ Cookie/privacy EU minimale; niente tracking/marketing.
- ⚠ **Rotazione segreti**: token GitHub + password DB + chiavi esposte in chat → rigenerare **prima del go-live store** (non prima). Vedi memoria progetto.
- ⚠ App **non affiliata Panini**: verificare nota legale + assenza loghi/grafiche protette.

## 11. Deploy, dominio & go-live
▸ DNA: `13_DEPLOY_RENDER.md`, `19_DOMINIO_DEROARTS.md`
▸ Infra: Render (`stickers-matchbox`, deploy unico frontend+backend), GitHub `Dero-Stickers/stickers`
- ☐ App online: `https://stickers-matchbox.onrender.com` (LIVE). Deploy unico (Express serve la build React).
- ☐ Push su main = deploy prod (alto rischio): solo su ok esplicito owner.
- ☐ Env su Render allineate a `.env` + App Control (incluso `KOFI_VERIFICATION_TOKEN`).
- ⚠ **Passaggio a dominio** `stickers.deroarts.com`: CNAME Render→Cloudflare, update Supabase Auth URL/CSP, URL webhook Ko-fi, email `stickers@deroarts.com`. Checklist completa in `19` §8.

## 12. Store readiness (iOS/Android)
▸ DNA: `10_PRIVACY_LEGALE.md` (store readiness), `12_ROADMAP.md`
- ☐ Privacy/Termini/Cookie rivisti; dati raccolti dichiarati; moderazione + blocco + segnalazioni attivi.
- ☐ Utenti minori (≥16); testi store (breve/lunga descrizione, categoria, note privacy/sicurezza).
- ☐ Recupero account; nessun pagamento in-app (donazione esterna Ko-fi, verificare compatibilità regole store).
- ⚠ Questo è l'ultimo miglio: la verifica finale approfondita userà questo file §1→§12 come sequenza.

---

## Come consolidare (metodo efficiente)

1. Si sceglie **un'area** (§1–§12) e si verifica solo quella: DNA → codice → punti ⚠.
2. Ogni disallineamento trovato → si corregge **nello stesso intervento** e si aggiorna il file DNA di quell'area.
3. Le decisioni rilevanti vanno nel **decision-log** (`17_DECISION_LOG.md`).
4. A fine giro, questo file resta la **fotografia** di cosa è stato verificato: aggiornare i ☐ o annotare lo stato.
