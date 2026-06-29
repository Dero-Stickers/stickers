# Monetizzazione — Sblocco chat a pagamento

> Modello cambiato (giu 2026): **niente più demo a tempo, niente piani/abbonamenti.**
> L'app è **100% gratis e visibile**; si paga **solo** per **sbloccare la chat** di un
> match. La vecchia "demo premium 24h" è stata eliminata da tutto lo stack.

## Modello

L'intera app è gratuita: album, figurine, match (migliori + vicini), dettaglio
scambi. L'**unica** cosa a pagamento è **aprire una chat** con un match.

Due acquisti (una tantum, mai ricorrenti):
- **Una chat** (`single`) — sblocca la conversazione con **quel** match.
- **Tutte le chat** (`all`) — pagamento unico più alto, sblocca **tutte** le chat a
  vita (= flag `isPremium` dell'utente).

Prezzi in **centesimi interi** (mai float), configurabili da admin:
`price_single_cents` (default 199), `price_all_cents` (default 999), `paywall_currency` (EUR).

## Interruttore master (admin)

Setting `chat_paywall_enabled` in `app_settings` (default **false** = SPENTO):
- **OFF** → tutte le chat sono **gratis**, l'app funziona come se il paywall non esistesse.
- **ON** → per aprire una **nuova** chat con un match serve uno sblocco (single o all).

Esposto nel profilo come `UserProfile.paywallEnabled` e in `AdminUser` come
`hasAllChats` + `unlockedChats`. Le chat **già aperte** restano sempre accessibili.

## Gate e concessioni (solo lato server)

Logica unica in `api-server/src/lib/billing.ts` (NON duplicare altrove):
- `isChatPaywallEnabled()` — legge il master switch.
- `canOpenChat(userId, otherUserId)` — `true` se: paywall OFF **oppure** utente premium
  (`hasAllChats`) **oppure** esiste una riga `chat_unlocks` per la coppia. Altrimenti `false`.
- `grantAllChats(userId)` — imposta `isPremium=true` (sblocco totale).
- `grantChatUnlock(userId, otherUserId, paymentId?)` — inserisce in `chat_unlocks`
  (idempotente, `onConflictDoNothing`).

Il gate è in `routes/chats.ts` (apertura chat): se la chat **non** esiste ancora e
`canOpenChat` è `false` → **403 PREMIUM_REQUIRED**. Le concessioni avvengono **solo**
server-side; mai dal frontend.

## Pagamenti reali — DA COLLEGARE (ultimo step, non ancora attivo)

`routes/billing.ts` → `POST /billing/checkout` è uno **stub inerte**: ritorna
`{ status: "not_configured" }`, **non addebita nulla**. Da fare alla fine:
- collegare provider **senza partita IVA** (PayPal o simili — Stripe richiede P.IVA);
  prima in **modalità test** (pagamenti di prova fatti dall'owner);
- il checkout crea una riga `payments` (status `pending`) e ritorna l'URL di pagamento;
- un **webhook** sul pagamento confermato chiama `grantChatUnlock`/`grantAllChats`
  (idempotenza via `payments.provider_ref`).

Distribuzione **fuori dagli store** (link Render condiviso): nessuna commissione del 30%.

## Tabelle DB

`payments` (audit/incassi) e `chat_unlocks` (sblocchi singoli) — schema in
`09_DATABASE.md`. Create dalla migrazione additiva `0003_monetization_foundation.sql`
(già applicata). Il cleanup demo `0004_drop_demo.sql` è **da applicare a mano** (vedi
`09_DATABASE.md` → divergenza codice/DB).
