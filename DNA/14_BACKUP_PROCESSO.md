# DNA e Backup

## Cartella DNA

Contiene documentazione architetturale viva, aggiornata dopo ogni decisione importante.

### File DNA principali

L'elenco completo dei file e l'ordine di lettura sono in `00_INDICE.md`.

### Regola DNA

Il DNA viene aggiornato dopo ogni decisione tecnica importante.
Permette di riprendere il progetto senza dover ricostruire mentalmente le decisioni già prese.

## Cartella BACKUP

- Cartella `BACKUP/` nella root (ignorata da git, mai committata)
- Backup creati SOLO su richiesta esplicita dell'utente
- Un solo file compresso per backup (snapshot progetto) + eventuale snapshot dati DB

### Backup dati DB (logico)

- `pnpm --filter @workspace/db run backup` → `BACKUP/backup_<timestamp>.json`: snapshot
  logico di tutte le tabelle (righe complete). Alternativa a `pg_dump` quando non è
  installato; sufficiente per ripristinare i dati dopo test/pulizie.
- Gli album "default" hanno inoltre un ripristino dedicato e additivo: vedi
  `09_DATABASE.md` → `restore:albums`.

### Formato Backup

Nome file: `Backup_Giorno Mese_HH.MM` — file compresso singolo, **senza estensione**

Esempio: `Backup_24 Giugno_18.30`

Contenuto: tutto il necessario per riprendere il progetto.

Esclusi: `node_modules/`, cache, build temporanei, log inutili, file rigenerabili.

### Procedura Backup Manuale

```bash
tar -czf "BACKUP/Backup_$(date '+%-d %B_%H.%M')" \
  --exclude='./.git' --exclude='./BACKUP' --exclude='./backups' \
  --exclude='*/node_modules' --exclude='./node_modules' \
  --exclude='*/dist' --exclude='*.tsbuildinfo' \
  --exclude='*/.cache' --exclude='.DS_Store' --exclude='*.tar.gz' \
  .
```
