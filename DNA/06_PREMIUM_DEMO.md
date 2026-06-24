# Free, Demo e Premium

## Versione Free

Cosa è permesso:
- Gestione album
- Gestione figurine (stati)
- Visualizzazione match

Limitazione principale: impossibile aprire chat di scambio.

## Versione Premium

Sblocca tutto al 100%:
- Gestione album + figurine
- Match (migliori + vicini)
- Dettaglio figurine scambiabili
- Apertura chat
- Scrittura messaggi
- Funzione scambio completa

## Demo Premium (24h)

### Quando inizia
Quando l'utente prova ad aprire una chat per la prima volta.

**NON inizia:**
- alla registrazione
- all'apertura dell'app
- visualizzando album
- visualizzando match

### Attivazione
Messaggio esplicito: l'utente sa che sta attivando la demo.
Il testo chiarisce che dopo la scadenza sarà necessario il pagamento.

### Durata
- Default: 24 ore
- **Configurabile dall'admin** (non hardcoded)

### Dopo la scadenza
Può ancora:
- Gestire album
- Cambiare stati figurine
- Visualizzare album e match

NON può più:
- Aprire chat di scambio
- Usare la funzione scambio

## Anti-abuso Demo

- Account nickname + PIN
- CAP
- Identificatore anonimo dispositivo/browser
- Controlli tecnici lato DB
- Gestione anomalie da admin

## Stato Utente

| Stato | Codice |
|-------|--------|
| Free | `free` |
| Demo attiva | `demo_active` |
| Demo scaduta | `demo_expired` |
| Premium | `premium` |

## Pagamenti (solo preparazione, NON implementati)

Struttura dati preparata per:
- Pagamento una tantum
- Abbonamento mensile
- Abbonamento annuale
- Paywall simulato (bottoni disabilitati o simulati)

La scelta definitiva tra i modelli di pagamento sarà definita in seguito.
