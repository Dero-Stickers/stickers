# DNA — Indice

Questa cartella è la **documentazione viva** del progetto Sticker Matchbox:
riunisce la specifica funzionale, lo stato di sviluppo e le guide operative.
(Le ex cartelle `PROJECT_SPEC` e `DNA` sono state consolidate qui.)

## Ordine di lettura

### Specifica funzionale e tecnica
| File | Contenuto |
|------|-----------|
| `01_OBIETTIVO_ARCHITETTURA.md` | Obiettivo del progetto, princìpi, stack, struttura |
| `02_UTENTI_AUTENTICAZIONE.md` | Registrazione, login, recupero account |
| `03_ALBUM_FIGURINE.md` | Gestione album e figurine |
| `04_MATCHING_SCAMBI.md` | Logica di matching e scambi 1:1 |
| `05_CHAT_MODERAZIONE.md` | Chat, segnalazioni, moderazione admin |
| `06_PREMIUM_DEMO.md` | Monetizzazione: sblocco chat a pagamento (no demo, no abbonamenti) |
| `07_ADMIN_PANNELLO.md` | Pannello admin — sezioni e funzionalità |
| `08_NAVIGAZIONE_UI.md` | Navigazione utente, layout, stile UI |
| `09_DATABASE.md` | Schema DB (Drizzle), Supabase, distanza CAP |
| `10_PRIVACY_LEGALE.md` | Privacy, termini, cookie, store readiness |

### Stato e operatività
| File | Contenuto |
|------|-----------|
| `11_STATO_SVILUPPO.md` | Cosa è fatto, cosa manca, blocchi aperti (stato corrente) |
| `12_ROADMAP.md` | Roadmap per fasi |
| `13_DEPLOY_RENDER.md` | Guida deploy su Render |
| `14_BACKUP_PROCESSO.md` | Convenzioni documentazione e backup |
| `15_PROSSIMO_PROMPT.md` | Prompt operativo per la prossima sessione |
| `16_STRESS_TEST_AUDIT.md` | Audit stress test: soglie di tenuta free tier, misure, migliorie |
| `17_DECISION_LOG.md` | Decisioni tecniche rilevanti (registro, le più recenti in alto) |
| `18_PIANO_AUTH.md` | Sistema di accesso: Google + Email/password, nickname, stato |
| `19_DOMINIO_DEROARTS.md` | Dominio deroarts.com (Cloudflare + Zoho Mail): riferimento per l'integrazione FUTURA di Stickers (sottodomini, email dedicata, anti-spam) |

### Archivio
| File | Contenuto |
|------|-----------|
| `99_SPEC_COMPLETA_ORIGINALE.md` | Specifica tecnica completa originale (inglese) |

## Convenzioni

- Testo per l'utente in **italiano**; codice/file/cartelle in **inglese**.
- Documentazione tecnica in italiano (salvo termini tecnici standard).
- `11_STATO_SVILUPPO.md` è il documento da tenere **sempre aggiornato**.
