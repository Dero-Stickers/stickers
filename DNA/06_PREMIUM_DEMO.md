# Donazioni — App 100% gratuita

> Modello cambiato (lug 2026): **niente più paywall.** L'app è **completamente
> gratuita**: album, figurine, match, chat — tutto libero, senza pagamenti. La
> monetizzazione a pagamento (sblocco chat) è stata RIMOSSA da tutto lo stack
> come se non fosse mai esistita. L'unico "introito" sarà la **donazione
> spontanea** via Ko-fi (liberalità, nessuna contropartita).

## Modello attuale

L'intera app è gratuita e sempre accessibile. Nessuna funzione è dietro
pagamento: aprire una chat con un match è gratis come tutto il resto.

Cosa è stato rimosso (era: "si paga per sbloccare la chat"):
- Backend: `lib/billing.ts`, `routes/billing.ts`, gli handler admin
  paywall/premium in `routes/admin.ts`, il gate 403 in `routes/chats.ts`, i
  flag `chatUnlocked`/`isPremium`/`paywallEnabled`/`hasAllChats` dai payload.
- Frontend: il modale "Sblocca la chat" in `MatchDetail`, la pagina admin
  Monetizzazione, il badge accesso-chat, i campi premium in AuthContext.
- Spec API (`openapi.yaml`): endpoint billing/paywall/premium e relativi schemi
  → i tipi/hook generati (`api-client-react`, `api-zod`) sono spariti alla
  rigenerazione.
- DB (schema Drizzle): tabelle `payments` e `chat_unlocks` rimosse dal codice.
  La colonna `users.is_premium` resta **INERTE** (non più letta/scritta, default
  false) — scelta owner: nessuna operazione distruttiva su `users`.

## Donazione Ko-fi (introito unico, di sola lettura)

L'unico introito è la **donazione volontaria** tramite Ko-fi — una liberalità:
non sblocca nulla, non dà vantaggi, non tocca permessi/RLS/feature. L'app non
tratta né salva dati di pagamento: tutto avviene su Ko-fi/PayPal.

- **Pagina Ko-fi:** `https://ko-fi.com/deroarts` (codice pagina `A6A522N3IW`).
- **Pulsante** = componente riusabile `components/brand/KofiButton.tsx`: link
  esterno (`target=_blank`) che apre la pagina Ko-fi — NON lo script `kofiwidget2`
  (rende male in React/PWA). **Replica FEDELE del widget ufficiale**: tazza bianca
  con cuore rosso (SVG inline), testo "Support me on Ko-fi", verde `#3dbd45`.
  `KOFI_URL`/`KOFI_LABEL` sono l'unico punto di verità.
- **Dove appare:** box donazione nel **Profilo** (sopra la firma DeroArts) e nel
  **modale finale della guida** (`GuideFinishDialog`, ex bottone PayPal rimosso).
- **Frase obbligatoria** dove il contributo è presentato: *"Non sblocca nulla:
  è solo un grazie."* — qualifica il pagamento come liberalità (niente P.IVA).
  MAI legare la gratuità dell'app alla donazione (es. "gratis solo se doni"):
  la trasformerebbe in corrispettivo.
- **Legali (DB, non codice):** i testi Privacy/ToS vivono in `app_settings`
  (editabili da Admin → Impostazioni). Le clausole sul contributo volontario
  esterno Ko-fi sono state **aggiunte** (5 lug): Termini ("Contributi volontari" —
  facoltativo, non dà accesso a funzioni a pagamento) e Privacy (l'app non tratta
  dati di pagamento, gestiti da Ko-fi/PayPal).

## Integrazione Ko-fi — COLLEGATA (webhook → DB → admin)

Catena completa e testata (5 lug), di **sola lettura** (nessun pagamento passa
dall'app):

1. **Webhook** `POST /api/kofi/webhook` (`routes/kofi.ts`, PUBBLICO, fuori dai
   gate auth). Ko-fi manda `application/x-www-form-urlencoded` con campo `data`
   = JSON. L'handler **verifica `verification_token`** contro l'env
   `KOFI_VERIFICATION_TOKEN` (in `.env` + App Control, segreto); se manca l'env →
   503 KOFI_NOT_CONFIGURED. **Idempotente**: `kofi_message_id` UNIQUE +
   `onConflictDoNothing` → i retry di Ko-fi non creano doppioni.
2. **Tabella** `donations` (schema Drizzle `donations.ts`, migrazione
   `0010_donations.sql` — additiva, applicata). Colonne: importo, valuta, nome,
   messaggio, tipo, id transazione, raw payload.
3. **Lettura admin** `GET /api/admin/donations` (`routes/admin.ts`, requireAdmin):
   riepilogo aggregato (totale, n°, media, ultima) + elenco (ultime 100).
4. **Pagina** `pages/admin/Donations.tsx` (voce menu "Donazioni",
   `/admin/donazioni`): usa l'hook generato `useGetAdminDonations`. Mostra le 4
   card + tabella; l'avviso "in attesa della prima donazione" appare solo finché
   è vuota.

**Config Ko-fi (owner, una tantum):** pannello Ko-fi → More → Webhooks →
Webhook URL = `<LINK_DEPLOY>/api/kofi/webhook`, e il **Verification Token** di
Ko-fi va copiato in `KOFI_VERIFICATION_TOKEN` (env Render + App Control). Poi le
donazioni compaiono in admin da sole.

## DB — cleanup da applicare a mano

Migrazione `lib/db/migrations/0005_drop_monetization.sql` (stile `0004`):
`DROP TABLE chat_unlocks` + `DROP TABLE payments` + `DELETE` delle 4 chiavi
paywall in `app_settings`. **NON** tocca `users.is_premium` (resta inerte).
⚠️ Le tabelle sono vuote (paywall mai attivato) → nessuna perdita dati.
**DA APPLICARE A MANO** sul DB (non gira in automatico), con conferma owner.
