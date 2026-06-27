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
- Layout **"per direzione"**: sezione **TU DAI** (con totale) poi **TU RICEVI**
  (con totale), ciascuna con le figurine **raggruppate per album** (titolo album +
  griglia numeri). Un album può comparire solo in "dai" o solo in "ricevi".
- Backend (`getMatchDetail`): `give[]` / `receive[]` = gruppi `{ albumId,
  albumTitle, stickers[] }`, più `totalGive` / `totalReceive` / `totalExchanges`.
- Bottone chat (tondo) sempre visibile in testata.

## Privacy Geografica

- NO GPS, NO geolocalizzazione reale
- Solo area generica basata su CAP
- Nel mock: distanza simulata con dati esempio
- In futuro Supabase: tabella CAP → area/zona + coordinate approssimative
