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
  suffisso " - Team", altrimenti la sigla; blocchi di 1 figurina (logo "00") muti. **Attivazione
  (fix 9 lug)**: i blocchi si attivano SOLO se i codici alfabetici sono la **maggioranza**
  dell'album (Mondiali/Europei a nazioni), non se basta un solo codice > 3 char — altrimenti i
  Calciatori (numerici 001,002… + poche speciali tipo UPD01) finivano a blocchi e, non avendo
  sigla, ogni figurina faceva blocco a sé → una per riga. Ora i Calciatori (e World Cup 2006,
  numerico) restano griglia unica. **Intestazioni tradotte in italiano** via `translateNation`
  (`lib/nations.ts`), solo a display (dati DB invariati): South Korea→Corea del Sud, Germany Top
  XI→Germania Top XI; voci non-nazione (FIFA Museum, sigle) invariate.
- **Categorie master (lug 2026)**: ogni album ha `category`. Chiavi stabili `campionato`/
  `europei`/`mondiali`, label mostrate **Campionati/Europei/Mondiali** (la key resta
  `campionato`). L'ORDINE della lista `ALBUM_CATEGORIES` (Campionati → Europei → Mondiali)
  guida chip-filtro, menu admin e ordinamento album. Fonte unica `ALBUM_CATEGORIES` (in
  `@workspace/db` per validazione server, replicata IDENTICA — ordine incluso — in
  `@workspace/api-client-react` per la UI: il frontend non può importare il package DB).
  Aggiungere/riordinare una categoria = modifica in ENTRAMBE le liste. **Admin**: menu categoria
  in crea/gestisci album + colonna in tabella (con icona) + chip-filtro categoria sulla STESSA
  riga di Cerca/stato (via prop `extra` di `AdminFilterBar`), mostrati solo se >1 categoria.
  **User**: chip-filtro in ENTRAMBE le tab ("I miei album" e "Disponibili") — riga bloccata
  (`w-full`, mai scrollabile): "Tutti" compatto + master `flex-1` uguali; visibili solo se >1
  categoria presente; ordinamento per categoria poi titolo. Icona per categoria (mappa
  `CATEGORY_ICON` in `AlbumList.tsx` — via componente `CategoryIcon` con colonna a larghezza
  fissa per allineare i testi delle card — e in admin `Albums.tsx`): `world-cup.png` (mondiali,
  +10%), `coppa-europei.png` (europei, ottimizzata 46×96/6KB, lieve compressione verticale),
  `scudetto.svg` (campionato). Rimossa la vecchia deduzione fragile dal titolo (`isWorldCup`).
- **Album presenti (lug 2026)**: 3 master, tutti On Line. **Campionato**: 23 Calciatori
  (2003-04 → 2025-26). **Mondiali**: World Cup 2006/2010/2014/2018/2022/2026. **Europei**:
  Euro Cup 2004/2008/2012/2016/2020/2024. Formato titolo vincolante: `World Cup <anno>` /
  `Euro Cup <anno>` (l'album 2026 in DB è stato rinominato da "FIFA World Cup 2026", id 34
  invariato → possessi intatti). Numerazione mista: album vecchi = numeri puri (griglia liscia),
  2022/2026 + Euro 2024 = codici a sigle (blocchi-nazione automatici).
- **Pipeline dati album** (`lib/db`): sorgenti testuali in `album-source/link/*.md`
  (`CODICE Nome[ - Squadra][ FOIL]`). `build:albums-data` (generico) deduce titolo+categoria
  dal NOME FILE (World Cup→mondiali, Euro Cup→europei) e genera un `<slug>.json.gz` per album
  in `src/data/`. `restore:albums` fa AUTO-DISCOVERY di tutti i `.gz` (additivo, non tocca
  is_published né i possessi). Codici duplicati nel sorgente = errore bloccante: le collisioni
  note (World Cup 2006, 2 giocatori per numero) sono risolte a monte con suffisso a/b nel .md.
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
