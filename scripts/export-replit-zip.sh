#!/bin/bash
# ============================================================
# export-replit-zip.sh — Export ZIP pulito per reimport Replit
# Uso: bash scripts/export-replit-zip.sh [--dry-run]
# ============================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/output"
ZIP_NAME="sticker-matchbox-$(date '+%Y%m%d-%H%M%S').zip"
ZIP_PATH="$OUTPUT_DIR/$ZIP_NAME"
MAX_MB=200
DRY_RUN=false

# Parsing argomenti
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
  esac
done

# ---- ESCLUSIONI -----------------------------------------------
# Ogni elemento è documentato con la motivazione dell'esclusione.

EXCLUDES=(
  # Dipendenze npm/pnpm — regenerabili con `pnpm install`
  "node_modules"
  "*/node_modules"
  "**/node_modules"

  # Build artifacts — regenerabili con `pnpm run build`
  "artifacts/api-server/dist"
  "artifacts/stickers-app/dist"
  "lib/api-client-react/dist"

  # File temporanei e cache — regenerabili
  ".cache"
  "**/.cache"
  "*.tsbuildinfo"
  "tmp"
  "out-tsc"

  # Cartella Replit interna — dati agente, skill, task: non portabili
  ".local"

  # Asset di riferimento — immagini caricate durante sviluppo, non usate nel codice
  "attached_assets"

  # Git history — non necessaria per reimport/sviluppo
  ".git"

  # Cartella output degli ZIP stessi — evita ricorsione
  "output"

  # File di sistema macOS/Windows
  ".DS_Store"
  "Thumbs.db"

  # Log
  "*.log"
  "npm-debug.log"
  "yarn-error.log"
)

# ---- FUNZIONE: costruisci parametri zip ----------------------
build_zip_params() {
  local params=()
  for ex in "${EXCLUDES[@]}"; do
    params+=("--exclude=${ex}")
    params+=("--exclude=./${ex}")
    params+=("--exclude=./${ex}/*")
  done
  echo "${params[@]}"
}

# ---- DRY RUN -------------------------------------------------
if [ "$DRY_RUN" = true ]; then
  echo "========================================"
  echo " DRY RUN — Nessun file verrà creato"
  echo "========================================"
  echo ""
  echo "Esclusioni configurate:"
  for ex in "${EXCLUDES[@]}"; do
    echo "  ✗ $ex"
  done
  echo ""
  echo "File che sarebbero INCLUSI nello ZIP (anteprima):"
  cd "$PROJECT_ROOT"
  
  EXCLUDE_PARAMS=()
  for ex in "${EXCLUDES[@]}"; do
    EXCLUDE_PARAMS+=("--exclude=$ex")
    EXCLUDE_PARAMS+=("--exclude=./$ex")
  done
  
  # Stima dimensione senza creare il file
  ESTIMATED=$(zip -r -q --dry-run /dev/null . "${EXCLUDE_PARAMS[@]}" 2>/dev/null | wc -l || echo "N/D")
  echo "  (usa: bash scripts/export-replit-zip.sh per creare il vero ZIP)"
  echo ""
  echo "Dimensioni cartelle principali incluse:"
  du -sh --exclude=node_modules --exclude=.local --exclude=.cache --exclude=.git --exclude=output --exclude=attached_assets \
    artifacts lib PROJECT_SPEC DNA scripts DOCS package.json pnpm-workspace.yaml replit.md replit.nix .replit 2>/dev/null | sort -rh
  exit 0
fi

# ---- EXPORT ZIP ----------------------------------------------
echo "========================================"
echo " Sticker Matchbox — Export ZIP Replit"
echo "========================================"
echo ""

# Crea cartella output
mkdir -p "$OUTPUT_DIR"

# Elimina ZIP precedenti nella cartella output
OLD_ZIPS=("$OUTPUT_DIR"/sticker-matchbox-*.zip)
if [ -e "${OLD_ZIPS[0]}" ]; then
  echo "🗑  Eliminazione ZIP precedenti in output/..."
  rm -f "$OUTPUT_DIR"/sticker-matchbox-*.zip
fi

echo "📦 Creazione ZIP: $ZIP_NAME"
echo ""

cd "$PROJECT_ROOT"

# Costruisci parametri di esclusione per zip
EXCLUDE_PARAMS=()
for ex in "${EXCLUDES[@]}"; do
  EXCLUDE_PARAMS+=("--exclude=$ex")
  EXCLUDE_PARAMS+=("--exclude=./$ex")
  EXCLUDE_PARAMS+=("--exclude=*/$ex")
  EXCLUDE_PARAMS+=("--exclude=./$ex/*")
done

zip -r "$ZIP_PATH" . \
  "${EXCLUDE_PARAMS[@]}" \
  -q

echo "✅ ZIP creato con successo!"
echo ""

# ---- VERIFICA DIMENSIONE -------------------------------------
ZIP_BYTES=$(stat -c%s "$ZIP_PATH" 2>/dev/null || stat -f%z "$ZIP_PATH" 2>/dev/null)
ZIP_MB=$(echo "scale=1; $ZIP_BYTES/1048576" | bc)

echo "📊 Dimensione ZIP: ${ZIP_MB} MB"
echo "   Percorso: $ZIP_PATH"
echo ""

if (( $(echo "$ZIP_MB > $MAX_MB" | bc -l) )); then
  echo "❌ ERRORE: Il file ZIP supera il limite di ${MAX_MB} MB per il reimport su Replit."
  echo "   Aggiungi ulteriori esclusioni in scripts/export-replit-zip.sh (sezione EXCLUDES)."
  exit 1
else
  echo "✅ Dimensione OK (limite: ${MAX_MB} MB)"
fi

# ---- RIEPILOGO -----------------------------------------------
echo ""
echo "========================================"
echo " Riepilogo esclusioni applicate:"
echo "========================================"
for ex in "${EXCLUDES[@]}"; do
  echo "  ✗ $ex"
done

echo ""
echo "========================================"
echo " ZIP pronto per reimport su Replit."
echo " Istruzioni: vedi DOCS/replit-export.md"
echo "========================================"
