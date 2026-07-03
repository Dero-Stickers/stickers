# Album e Figurine

## Struttura Album (creato dall'Admin)

| Campo | Note |
|-------|------|
| Titolo breve | Es. "Calciatori 2024-2025" |
| Lista figurine completa | Inserita dall'admin |
| Numero figurina | Identificativo unico nell'album |
| Nome/descrizione figurina | |

## Inserimento Rapido Figurine (Admin)

- Copy/paste lista numerata → inserimento massivo
- Dopo inserimento rapido: modifica manuale singole figurine (numero, nome, descrizione)

## Lato Utente — Sezioni Album

### "I miei album"
Album già aggiunti al profilo utente. Gestibili (stati figurine).
Default tab: se l'utente non ha ancora album, la pagina apre direttamente su
"Disponibili" (al primo caricamento; poi la scelta del tab resta libera).

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
- Ogni card mostra: codice stampato (o numero) + colore stato
- **Codici alfanumerici + blocchi per nazione (lug 2026)**: gli album Mondiali hanno le
  figurine con **le stesse colonne e proporzioni** dei Calciatori (griglia identica); il
  codice lungo (MEX10, FWC19) entra nella cella quadrata standard su **2 righe** (sigla
  piccola/attenuata sopra, numero sotto) in `StickerCell`. **Suddivisione in blocchi**: al
  cambio di sigla (MEX→RSA) inizia un nuovo blocco con **intestazione** (nome nazione +
  linea sottile) messa SOPRA la sua griglia, in un contenitore separato — NON dentro la grid
  (un header `col-span-full` dentro l'unica grid rompeva su WebKit `aspect-square` +
  `content-visibility`, prima cella a tutto schermo). Etichetta = squadra maggioritaria dal
  suffisso " - Team", altrimenti la sigla; blocchi di 1 figurina (logo "00") muti. Attivo solo
  per album con codici > 3 char; i Calciatori restano una griglia unica, identici.
- Mondiali: icona coppa (`world-cup.png`) sulla card album + pin in cima alla lista.
- Scambi/match: le chip mostrano il **codice stampato** (`code || number`) — `lib/trade.ts`
  include `code` (era già required nello schema OpenAPI `Sticker`).
- Pressione lunga → modal centrato con numero + nome/descrizione

## Filtri Album

- Tutte / Mancanti / Possedute / Doppie (tap = cambia filtro)
- **Pressione lunga su Mie/Doppie/Mancanti** → conferma → imposta TUTTE le figurine
  dell'album a quello stato, sovrascrivendo le selezioni attuali ("Mancanti" = azzera
  l'album). "Tutte" non ha azione (solo filtro). Endpoint additivo
  `POST /user/albums/:id/stickers/bulk` `{state}`: un solo UPDATE, tocca solo le righe
  che cambiano, su dati propri; invalida la cache match. Reversibile dall'utente.

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
