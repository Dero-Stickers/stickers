# DNA e Backup

## Cartella DNA

Contiene documentazione architetturale viva, aggiornata dopo ogni decisione importante.

### File DNA principali

L'elenco completo dei file e l'ordine di lettura sono in `00_INDICE.md`.

### Regola DNA

Il DNA viene aggiornato dopo ogni decisione tecnica importante.
Permette di riprendere il progetto senza dover ricostruire mentalmente le decisioni già prese.

## Cartella Backup

- Esiste dalla nascita del progetto
- NON usata automaticamente
- Backup creati SOLO su richiesta esplicita dell'utente

### Formato Backup

Nome file: `Backup_DAY MONTH_HH.MM.tar.gz`

Esempio: `Backup_1 Maggio_23.13.tar.gz`

Contenuto: tutto il necessario per riprendere il progetto.

Esclusi: `node_modules/`, cache, build temporanei, log inutili, file rigenerabili.

### Procedura Backup Manuale

```bash
tar -czf "backups/Backup_$(date '+%e %B_%H.%M').tar.gz" \
  --exclude='*/node_modules' \
  --exclude='*/dist' \
  --exclude='*/.turbo' \
  --exclude='*/build' \
  .
```
