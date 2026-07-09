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
  con cuore rosso (SVG inline), testo IT "Sostieni Stickers" (no "Ko-fi" nel testo utente), verde `#3dbd45`.
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

## Invito a donare (una-tantum, admin → utente) — 5 lug 2026

Funzione **100% interna** (DB + backend nostri; Ko-fi entra solo se l'utente
sceglie di donare). Serve a invitare gentilmente gli utenti più attivi a
sostenere l'app, **senza spam** e nel rispetto delle policy store.

- **Tabella** `donation_nudges` (schema `donation-nudges.ts`, mig. `0011` +
  `0014_nudge_type.sql`): `user_id`, **`type`** (`dona` | `condividi`, default
  `dona`), `sent_at`, `seen_at`. UNIQUE su **`(user_id, type)`**: un invito-dona e
  un invito-condividi possono coesistere. Due tipi di invito, entrambi a discrezione
  admin, entrambi mostrati una volta al prossimo accesso:
  - **`dona`** (una tantum): invito a sostenere l'app via Ko-fi;
  - **`condividi`** (RIPETIBILE): invito a condividere l'app con gli amici (più
    persone = più match). Rinviandolo si riarma (`seen_at` azzerato).
- **Admin** (`pages/admin/Users.tsx`, colonna **"Invito"**): due bottoni **"Dona"**
  e **"Condividi"** (`POST /api/admin/users/:id/nudge` con `{type}`, upsert su
  `(user_id,type)`) — **con conferma**; ai **bloccati** non si invia ("—"). Storico
  anti-spam per tipo: "Dona/Condividi · inviato/visto" + "Reinvia". Nessun invio
  automatico di massa.
- **Utente** (`components/brand/NudgeDialog.tsx` → `<NudgeGate>` in `App.tsx`): al
  prossimo accesso `GET /api/me/nudge` restituisce l'invito non visto (con `type`) →
  modale **una volta sola**. Modale `dona` = CTA Ko-fi; modale `condividi` = logo +
  messaggio + link + "Copia link" + **WhatsApp/Telegram/Facebook** (icone/colori
  ufficiali; cliccare un social NON chiude il modale, così si condivide su più
  canali). `POST /api/me/nudge/seen` con `{type}` lo consuma. Route `/me/*` dietro
  gate auth+anti-blocco. Il `type` è validato con allowlist lato server.
- **Testo** (concordato con l'owner): dona = complimento ("sei tra i più attivi"),
  **mai** colpevolizzazione; condividi = "più collezionisti = più match". Contributo
  libero, non sblocca nulla, chiudibile.

## DB — cleanup APPLICATO (5 lug 2026)

`DROP TABLE chat_unlocks` + `DROP TABLE payments` (erano vuote) + `DELETE` delle
4 chiavi paywall in `app_settings` (`chat_paywall_enabled`, `paywall_currency`,
`price_single_cents`, `price_all_cents`) — corrisponde a
`lib/db/migrations/0005_drop_monetization.sql`, ora **eseguito** con conferma owner.
**NON** ha toccato `users.is_premium` (resta inerte). Codice e DB ora allineati:
`app_settings` contiene solo `app_name`, `cookie_policy`, `privacy_policy`,
`support_email`, `terms`. Vedi `09_DATABASE.md`.
