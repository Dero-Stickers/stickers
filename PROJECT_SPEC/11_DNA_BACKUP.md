# DNA e Backup

## Cartella DNA

Contiene documentazione architetturale viva, aggiornata dopo ogni decisione importante.

### File DNA principali

| File | Contenuto |
|------|-----------|
| `00_ARCHITETTURA.md` | Stack, struttura, decisioni architetturali |
| `01_STATO_SVILUPPO.md` | Cosa è stato fatto, cosa manca, blocchi aperti |
| `02_DATABASE_SCHEMA.md` | Schema DB completo e SQL Supabase |
| `03_ROADMAP.md` | Roadmap e priorità |
| `04_REPORT_FINALE.md` | Report di fine sessione |
| `05_PROSSIMO_PROMPT.md` | Prompt operativo per continuare |

### Regola DNA

Il DNA viene aggiornato dopo ogni decisione tecnica importante.
Permette di riprendere il progetto senza dover ricostruire mentalmente le decisioni già prese.

## Cartella Backup

- Esiste dalla nascita del progetto
- NON usata automaticamente
- Backup creati SOLO su richiesta esplicita dell'utente

### Formato Backup

Nome file: `Backup_DAY MONTH_HH.MM.tar.xz`

Esempio: `Backup_1 Maggio_23.13.tar.xz`

Contenuto: tutto il necessario per riprendere il progetto.

Esclusi: `node_modules/`, cache, build temporanei, log inutili, file rigenerabili.

### Procedura Backup Manuale

```bash
tar -cJf "backup/Backup_$(date '+%e %B_%H.%M').tar.xz" \
  --exclude='*/node_modules' \
  --exclude='*/dist' \
  --exclude='*/.turbo' \
  --exclude='*/build' \
  .
```
