# Export ZIP per Replit — Guida

## Scopo

Replit limita l'import di ZIP a **200 MB**. Questo script genera un archivio pulito, sotto il limite, contenente tutto il necessario per continuare lo sviluppo dopo il reimport.

---

## Come usare lo script

### Export reale (crea lo ZIP)

```bash
bash scripts/export-replit-zip.sh
```

Il file ZIP viene salvato in `output/sticker-matchbox-YYYYMMDD-HHMMSS.zip`.

### Dry run (mostra cosa verrebbe escluso, senza creare file)

```bash
bash scripts/export-replit-zip.sh --dry-run
```

---

## Cosa viene escluso e perché

| Percorso | Motivo esclusione |
|---|---|
| `node_modules/` (root) | Dipendenze npm/pnpm, rigenerabili con `pnpm install` |
| `artifacts/*/node_modules/` | Stessa ragione |
| `lib/*/node_modules/` | Stessa ragione |
| `artifacts/api-server/dist/` | Build artifacts, rigenerabili con `pnpm run build` |
| `artifacts/stickers-app/dist/` | Build artifacts, rigenerabili |
| `lib/api-client-react/dist/` | Build artifacts, rigenerabili |
| `.local/` | Dati interni dell'agente Replit (skill, task, cache agente) |
| `.cache/` | Cache temporanea, rigenerabile |
| `attached_assets/` | Immagini/screenshot caricati durante sviluppo, non usati nel codice |
| `.git/` | Storico git, non necessario per reimport |
| `output/` | Cartella degli ZIP stessi (evita ricorsione) |
| `*.tsbuildinfo` | Cache TypeScript, rigenerabile |
| `*.log` | File di log temporanei |
| `.DS_Store`, `Thumbs.db` | File di sistema non necessari |

---

## Cosa viene INCLUSO (tutto il resto)

- `artifacts/stickers-app/src/` — Codice frontend completo
- `artifacts/api-server/src/` — Codice backend completo
- `artifacts/mockup-sandbox/` — Sandbox design (senza node_modules)
- `lib/` — Librerie condivise (db schema, api-spec, api-zod, api-client-react)
- `PROJECT_SPEC/` — Documentazione tecnica completa
- `DNA/` — Stato sviluppo e roadmap
- `DOCS/` — Guide operative
- `scripts/` — Script di utilità (push GitHub, export ZIP)
- `package.json`, `pnpm-workspace.yaml` — Configurazione monorepo
- `pnpm-lock.yaml` — Lockfile per installazione riproducibile
- `tsconfig.json`, `tsconfig.base.json` — Configurazione TypeScript
- `.replit`, `replit.nix`, `.npmrc` — Configurazione ambiente Replit
- `replit.md` — Documentazione progetto
- `.gitignore`, `.gitattributes`, `.replitignore` — File di controllo

---

## Come ripartire dopo il reimport

Dopo aver importato il ZIP su Replit:

```bash
# 1. Installa tutte le dipendenze
pnpm install

# 2. Avvia i workflow normalmente
#    (API Server + Stickers App si avviano dai workflow Replit)

# 3. Se necessario, rebuilda l'API server
pnpm --filter @workspace/api-server run build
```

---

## Personalizzare le esclusioni

Le esclusioni sono definite nell'array `EXCLUDES` in `scripts/export-replit-zip.sh`.

**Regola di sicurezza:** escludi solo ciò che puoi rigenerare automaticamente. In caso di dubbio, lascia il file incluso.

Esempio: per escludere una cartella aggiuntiva, aggiungi all'array:

```bash
EXCLUDES=(
  # ... esclusioni esistenti ...
  "percorso/cartella/da-escludere"
)
```

---

## Note

- Il limite Replit per import ZIP è **200 MB**. Lo script avvisa automaticamente se superato.
- Lo ZIP non include `.git/` — il progetto è già su GitHub (`https://github.com/Dero-Stickers/stickers`), quindi non serve includerlo.
- I file ZIP generati vengono salvati in `output/` che è già nel `.gitignore`.
