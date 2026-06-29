# Matching e Scambi

## Regola Base

Lo scambio è sempre **1:1**.
- L'utente A cede una Doppia che B non ha (Mancante)
- L'utente B cede una Doppia che A non ha (Mancante)
- NO scambi 2:1, 3:1 o di valore disequato

## Condizione Match Valido

Un match valido esiste solo se:
1. Utente A ha almeno una Doppia che B ha come Mancante
2. Utente B ha almeno una Doppia che A ha come Mancante

## Calcolo Cross-Album

Lo scambio è **cross-album**: conta tutte le figurine scambiabili tra i due
utenti su **qualsiasi album in comune**, senza bilanciare album per album.
- `totale dai` = tutte le tue Doppie che l'altro ha come Mancante (su tutti gli album)
- `totale ricevi` = tutte le sue Doppie che tu hai come Mancante
- **scambi possibili = min(totale dai, totale ricevi)** (lo scambio resta 1:1)

Esempio cross-album: dai 150 figurine dall'album 2025-26 e ricevi 150 dall'album
2024-25 → **150 scambi possibili**, anche se nessun singolo album si bilancia da
solo. Lista (Migliori/Vicini) e dettaglio usano la **stessa formula** (coerenti).

## Viste Lista Match

### Migliori match
Ordinati per numero massimo di scambi 1:1 possibili.

### Vicini a te
Ordinati per vicinanza (CAP → area generica → distanza approssimativa).

### Filtro Distanza (slider)
Valori: 5 km / 10 km / 20 km / 50 km / 100 km

## Dettaglio Match (cross-album)

- Nickname, area generica (da CAP), distanza
- **Scambi possibili** = `min(totale dai, totale ricevi)`
- Layout **"per direzione"**: sezione **DAI** (con totale) poi **RICEVI**
  (con totale), ciascuna con le figurine **raggruppate per album** (titolo album +
  griglia numeri). Un album può comparire solo in "dai" o solo in "ricevi".
- Backend (`getMatchDetail`): `give[]` / `receive[]` = gruppi `{ albumId,
  albumTitle, stickers[] }`, più `totalGive` / `totalReceive` / `totalExchanges`.
  Il calcolo dai/ricevi è in `api-server/src/lib/trade.ts` (`computeTradeBreakdown`),
  logica UNICA condivisa con la conferma scambio in chat — non duplicarla.
- Bottone chat (tondo) sempre visibile in testata.

## Conferma scambio concluso

Quando due collezionisti completano lo scambio **di persona**, ciascuno lo
conferma **dal proprio lato** dalla chat (bottone "Scambio fatto" nella testata
della chat). Modello scelto (ibrido):

- Bottone **"Scambio fatto"** nella chat → modale a **due passi**: (1) breve
  **spiegazione** di cosa succede + **"Conferma e aggiorna"** (un tap = conferma
  tutto); (2) **"Scegli figurine"** per lo scambio **parziale** — lista DAI/RICEVI
  a fisarmonica per album (stessa del dettaglio match), precompilata spuntata, da
  cui **togliere** ciò che non è stato scambiato.
- Applica gli stati **solo all'album di chi conferma**: figurine cedute
  `doppia → posseduta` (resta una copia), figurine ricevute `mancante → posseduta`.
  **Mai** scrittura sull'album dell'altro → stesso modello di sicurezza
  dell'aggiornamento manuale; ognuno gestisce il suo.
- Il **manuale resta** sempre disponibile (modifica diretta dell'album): è la rete
  di sicurezza. In ogni caso i **match si ricalcolano da soli** dallo stato delle
  figurine (cache match invalidata), quindi nessuna delle due strade rompe niente.
- Sicurezza: il backend **ricalcola l'insieme valido** e applica solo le figurine
  realmente scambiabili (ignora id arbitrari). Endpoint `GET /chats/:id/trade`
  (proposta + stato conferme) e `POST /chats/:id/trade/confirm` (`routes/chat-trade.ts`).
  Prima conferma in una chat = +1 `exchangesCompleted`. Pagamenti **non** coinvolti.

## Privacy Geografica

- NO GPS, NO geolocalizzazione reale
- Solo area generica basata su CAP
- Nel mock: distanza simulata con dati esempio
- In futuro Supabase: tabella CAP → area/zona + coordinate approssimative
