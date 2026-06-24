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

## Calcolo Multi-Album

Il match si calcola tra tutti gli album condivisi dai due utenti.

Esempio:
- Album A: 20 scambi possibili
- Album B: 30 scambi possibili
- Album C: 50 scambi possibili
- **Totale match = 100 scambi 1:1 potenziali**

## Viste Lista Match

### Migliori match
Ordinati per numero massimo di scambi 1:1 possibili.

### Vicini a te
Ordinati per vicinanza (CAP → area generica → distanza approssimativa).

### Filtro Distanza (slider)
Valori: 5 km / 10 km / 20 km / 50 km / 100 km

## Dettaglio Match (Multi-Album)

- Nickname altro utente
- Area generica (da CAP)
- Totale scambi 1:1 potenziali
- Lista album coinvolti
- Numero scambi per album
- Lista figurine scambiabili per album
- Sezione "Tu dai" (Doppie che dai)
- Sezione "Tu ricevi" (Mancanti che ricevi)
- Bottone "Apri chat" sempre visibile

## Privacy Geografica

- NO GPS, NO geolocalizzazione reale
- Solo area generica basata su CAP
- Nel mock: distanza simulata con dati esempio
- In futuro Supabase: tabella CAP → area/zona + coordinate approssimative
