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
  (rende male in React/PWA). Verde Ko-fi `#3dbd45`, icona cuore, "Dona ora".
  `KOFI_URL` è l'unico punto di verità del link.
- **Dove appare:** box donazione nel **Profilo** (sopra la firma DeroArts) e nel
  **modale finale della guida** (`GuideFinishDialog`, ex bottone PayPal rimosso).
- **Frase obbligatoria** dove il contributo è presentato: *"Non sblocca nulla:
  è solo un grazie."* — qualifica il pagamento come liberalità (niente P.IVA).
  MAI legare la gratuità dell'app alla donazione (es. "gratis solo se doni"):
  la trasformerebbe in corrispettivo.
- **Legali (DB, non codice):** i testi Privacy/ToS vivono in `app_settings`
  (editabili da Admin → Impostazioni). Va aggiunta a mano lì una riga sul
  contributo volontario esterno Ko-fi: facoltativo, non dà accesso a funzioni a
  pagamento, l'app non tratta dati di pagamento (gestiti da Ko-fi/PayPal).

## Pagina admin "Donazioni" (predisposta)

`pages/admin/Donations.tsx` (voce menu "Donazioni", rotta `/admin/donazioni`) —
riusa il layout admin. Mostra un riepilogo (totale, n°, media, ultima) e una
tabella. **Stato: predisposta ma non collegata** — Ko-fi invia i dati via
**webhook** SOLO con l'app online e il webhook configurato. È di **sola lettura**:
nessun pagamento passa dall'app. Integrazione Ko-fi = passo separato.

## DB — cleanup da applicare a mano

Migrazione `lib/db/migrations/0005_drop_monetization.sql` (stile `0004`):
`DROP TABLE chat_unlocks` + `DROP TABLE payments` + `DELETE` delle 4 chiavi
paywall in `app_settings`. **NON** tocca `users.is_premium` (resta inerte).
⚠️ Le tabelle sono vuote (paywall mai attivato) → nessuna perdita dati.
**DA APPLICARE A MANO** sul DB (non gira in automatico), con conferma owner.
