# Pannello Admin

## Caratteristiche Generali

- Solo per il proprietario del progetto
- NON soggetto al paywall chat
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
  Dashboard, Impostazioni); solo questo blocco scorre.
- **Stato chat utente** (`components/admin/ChatAccessBadge`): badge + logica di
  classificazione UNICA condivisa tra **Utenti** e **Monetizzazione** — `Free` (verde),
  `Alcune · N` (azzurro), `Tutte le chat` (giallo). Non duplicare la logica altrove.

## Sezioni Admin

### Dashboard
- Numero utenti
- Numero album
- Numero chat/messaggi
- Utenti con sblocco chat (singole / totale)
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
- Visualizza lista utenti (ordinabile per nickname A↔Z)
- Colonne: **Utente · CAP · Area · Stato · Scambi · Azioni** (CAP e città in colonne
  distinte). "Stato" = badge chat condiviso (Free / Alcune · N / Tutte le chat)
- Blocca/sblocca utente

### Messaggi
- Visualizza chat
- Revisiona chat (se necessario)
- Chiudi chat problematica
- Supporto moderazione

### Monetizzazione
- **Interruttore master** chat a pagamento (`chat_paywall_enabled`): Attiva/Disattiva
  tutta la sezione. OFF = tutte le chat gratis
- **Prezzi sblocco** in €: una chat (`price_single_cents`) e tutte le chat (`price_all_cents`)
- **Tabella unica consolidata** di tutti gli utenti con **filtri**: Tutti / Senza sblocco /
  Alcune chat / Tutte le chat (con conteggi). Stesso `AdminTable` di Album/Utenti
- Azione per riga: **Sblocca tutte** (grant manuale = premium) / **Revoca**
- Modello e gate in `06_PREMIUM_DEMO.md`

### Impostazioni
- **Account admin** (in cima a "Configurazione generale"): cambia **nickname e/o PIN**
  dell'account loggato. Conferma col **PIN attuale**. Backend `PATCH /api/auth/me/credentials`
  (verifica PIN via `verifyPin`, unicità nickname, ri-hash col nuovo PIN via `hashPin`);
  UI in `pages/admin/AdminAccountCard.tsx` (`AdminAccountFields`).
- Email di supporto (`app_settings.support_email` = `stickers@deroarts.com`)
- Testi legali (privacy/termini/cookie) + modalità guida interattiva

## Autenticazione Admin

- **Accesso admin:** login con nickname + PIN dell'account admin (attuale: `dero` / PIN 6 cifre).
  Il login con account `isAdmin=true` reindirizza a `/admin` ([Login.tsx]). In sviluppo esiste anche
  il pulsante U/A (DevQuickSwitch) che fa lo switch rapido Utente↔Admin.
- App 100% gratuita: nessun paywall (né per utenti né per admin).
- Accesso a dati sensibili (chat, utenti, segnalazioni, donazioni).
