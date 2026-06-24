# Album e Figurine

## Struttura Album (creato dall'Admin)

| Campo | Note |
|-------|------|
| Titolo breve | Es. "Calciatori 2024-2025" |
| Poster/copertina | URL immagine |
| Lista figurine completa | Inserita dall'admin |
| Numero figurina | Identificativo unico nell'album |
| Nome/descrizione figurina | |

## Inserimento Rapido Figurine (Admin)

- Copy/paste lista numerata → inserimento massivo
- Dopo inserimento rapido: modifica manuale singole figurine (numero, nome, descrizione)

## Lato Utente — Sezioni Album

### "I miei album"
Album già aggiunti al profilo utente. Gestibili (stati figurine).

### "Album disponibili"
Album pubblicati dall'admin non ancora aggiunti. Clic su "Aggiungi album":
- Album aggiunto al profilo
- Tutte le figurine iniziano come **Mancante**

## Stati Figurine

| Stato | Colore |
|-------|--------|
| Mancante | Bianco |
| Posseduta | Verde |
| Doppia | Rosso |

Ciclo tapping: Mancante → Posseduta → Doppia → Mancante

## Griglia Figurine

- Compatta, scrollabile, touch-friendly
- Ogni card mostra: numero + colore stato
- Pressione lunga → modal centrato con numero + nome/descrizione

## Filtri Album

- Tutte / Mancanti / Possedute / Doppie

## Riepilogo Album

- Totale figurine
- Possedute
- Mancanti
- Doppie
- Percentuale completamento

## Rimozione Album

Quando l'utente rimuove un album:
- Album rimosso dal profilo
- Stati figurine rimossi
- Match ricalcolati senza quell'album
- Chat non eliminata automaticamente se rimangono altri album compatibili
- Se nessun match valido rimane con l'altro utente → chat nascosta/chiusa
