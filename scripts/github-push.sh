#!/bin/bash
# Script per commit e push automatico su GitHub
# Uso: bash scripts/github-push.sh "messaggio commit"
# Richiede la variabile d'ambiente GITHUB_TOKEN

set -e

REPO_URL="https://github.com/Dero-Stickers/stickers.git"
BRANCH="main"
COMMIT_MSG="${1:-"chore: aggiornamento automatico $(date '+%Y-%m-%d %H:%M')"}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERRORE: la variabile GITHUB_TOKEN non è impostata."
  exit 1
fi

git config user.email "dero975@gmail.com"
git config user.name "Sticker Matchbox Bot"

git remote set-url origin "https://${GITHUB_TOKEN}@github.com/Dero-Stickers/stickers.git"

git add -A

if git diff --cached --quiet; then
  echo "Nessuna modifica da committare."
  git remote set-url origin "$REPO_URL"
  exit 0
fi

git commit -m "$COMMIT_MSG"
git push origin "$BRANCH"

git remote set-url origin "$REPO_URL"
echo "Push completato su $BRANCH."
