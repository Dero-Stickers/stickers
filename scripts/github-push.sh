#!/bin/bash
# Script per commit e push automatico su GitHub
# Uso: ./scripts/github-push.sh "messaggio commit"
# Richiede la variabile d'ambiente GITHUB_TOKEN

set -e

REPO_URL="https://github.com/Dero-Stickers/stickers.git"
BRANCH="main"
COMMIT_MSG="${1:-"chore: aggiornamento automatico $(date '+%Y-%m-%d %H:%M')"}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Errore: la variabile GITHUB_TOKEN non è impostata."
  echo "   Chiedi all'agente di impostarla prima di eseguire il push."
  exit 1
fi

echo "🔧 Configurazione identità Git..."
git config user.email "dero975@gmail.com"
git config user.name "Sticker Matchbox Bot"

echo "🔗 Configurazione remote con token..."
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/Dero-Stickers/stickers.git"

echo "📦 Aggiunta file modificati..."
git add -A

# Controlla se ci sono modifiche da committare
if git diff --cached --quiet; then
  echo "✅ Nessuna modifica da committare."
  git remote set-url origin "$REPO_URL"
  exit 0
fi

echo "💬 Commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "🚀 Push su $BRANCH..."
git push origin "$BRANCH"

echo "🔒 Ripristino URL remote senza token..."
git remote set-url origin "$REPO_URL"

echo "✅ Push completato con successo!"
