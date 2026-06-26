# Pannello Admin

## Caratteristiche Generali

- Solo per il proprietario del progetto
- NON soggetto a limitazioni demo
- Desktop priority, usabile anche da mobile
- Sidebar fissa a sinistra (desktop)
- Badge numero in cima al pannello

## Layout Sidebar

- Brand/nome app in cima
- Voci di menu organizzate con icone
- Voce attiva evidenziata
- Contenuto principale a destra

## Layout tabelle (standard condiviso, enterprise)

Componenti riusabili in `components/admin/` — fonte unica dello stile, applicata a
TUTTE le sezioni admin per coerenza:

- `AdminPage` — shell con **testata FISSA** (titolo + azioni) e corpo che riempie
  l'altezza disponibile. **Scorre solo il contenuto**: sidebar e testata restano
  ferme (`AdminLayout` ha altezza piena e `overflow-hidden`).
- `AdminTable` — tabella standard: intestazioni **centrate e sticky**, **griglia
  verticale** tra le colonne, righe a **colorazione alternata fissa**, **densità
  compatta**. Le pagine passano solo gli `<th>` (`head`) e le righe; lo stile è
  centralizzato nel componente.
- `AdminScrollArea` — area scrollabile per pagine non tabellari (form/card:
  Dashboard, Premium/Demo, Impostazioni); solo questo blocco scorre.

## Sezioni Admin

### Dashboard
- Numero utenti
- Numero album
- Numero chat/messaggi
- Utenti in demo/premium
- Stato generale app

### Album
- Crea album (solo titolo) — nessuna copertina/immagine (feature rimossa)
- Tabella standard (vedi "Layout tabelle"): colonne **Titolo · Figurine · Stato
  (On Line / Off Line) · Utenti · Azioni**. "Utenti" = quanti hanno l'album tra
  "I miei album" (`userCount`, calcolato lato backend solo per l'admin)
- **Ordine stabile per id**: un album messo Off Line NON cambia posizione in lista
  (il backend ordina per `id`)
- Azione **unica "Gestisci"** (un solo pulsante): apre un dialog che permette di
  **rinominare** l'album (l'unico dato che "Modifica" gestiva) **e** gestire le sue
  figurine. Prima erano due pulsanti separati (Figurine + Modifica), ora consolidati
- Pulsante **On Line / Off Line** per pubblicare/nascondere

### Figurine (dentro "Gestisci")
- Inserisci lista figurine (copy/paste, codice + ordine preservati)
- Modifica singole figurine (numero/nome/descrizione)

### Utenti
- Visualizza lista utenti
- Colonne: nickname, CAP/area, stato demo/premium, num. album, blocco
- Blocca/sblocca utente

### Messaggi
- Visualizza chat
- Revisiona chat (se necessario)
- Chiudi chat problematica
- Supporto moderazione

### Premium / Demo
- Utenti in demo
- Utenti premium
- Configura durata demo
- Controlla demo scadute
- Prepara piani futuri

### Impostazioni
- Email di supporto (default: stickersmatchbox@hotmail.com)
- Durata demo
- Testi base app
- Impostazioni privacy/supporto
- Preparazione pagamento futuro

## Autenticazione Admin

- Login separato con credenziali admin
- Nessuna limitazione demo
- Accesso a dati sensibili (chat, utenti, segnalazioni)
