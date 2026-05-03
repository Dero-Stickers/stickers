#!/usr/bin/env bash
# deploy.sh — commit + push automatico su GitHub main
# Uso:
#   ./deploy.sh                       # messaggio commit auto-generato
#   ./deploy.sh "il mio messaggio"    # messaggio commit personalizzato
#
# Richiede: GITHUB_TOKEN nelle env (già presente in Replit Secrets).

set -euo pipefail

REMOTE_URL="https://github.com/Dero-Stickers/stickers"
BRANCH="main"

# Colori output
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'; BLU='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLU}▸${NC} $*"; }
ok()    { echo -e "${GRN}✓${NC} $*"; }
warn()  { echo -e "${YLW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# 1. Controlli pre-volo
[ -n "${GITHUB_TOKEN:-}" ] || fail "GITHUB_TOKEN non impostato. Aggiungilo nei Secrets."
git rev-parse --git-dir >/dev/null 2>&1 || fail "Non sei dentro un repo git."

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$CURRENT_BRANCH" = "$BRANCH" ] || fail "Sei su '$CURRENT_BRANCH', non su '$BRANCH'. Operazione annullata."

AUTH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/Dero-Stickers/stickers"

# 2. Stage + commit (se ci sono modifiche)
info "Verifica modifiche locali…"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  MSG="${1:-chore: deploy $(TZ=Europe/Rome date '+%Y-%m-%d %H:%M')}"
  git -c user.email="deploy@stickers-matchbox.local" \
      -c user.name="Deploy Script" \
      commit -m "$MSG"
  ok "Commit creato: $MSG"
else
  ok "Nessuna modifica da committare."
fi

# 3. Fetch remote per vedere se è divergente
info "Fetch da GitHub…"
git fetch "$AUTH_URL" "$BRANCH" >/dev/null 2>&1 || fail "Fetch fallito. Token valido? Repo raggiungibile?"

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse FETCH_HEAD)
BASE=$(git merge-base HEAD FETCH_HEAD 2>/dev/null || echo "")

if [ "$LOCAL" = "$REMOTE" ]; then
  ok "Già allineato con origin/$BRANCH. Niente da pushare."
  exit 0
elif [ "$BASE" = "$REMOTE" ]; then
  info "Locale è avanti del remote → push diretto (fast-forward)."
elif [ "$BASE" = "$LOCAL" ]; then
  warn "Remote è avanti del locale → fast-forward del locale."
  git merge --ff-only FETCH_HEAD
  ok "Locale aggiornato dal remote."
else
  warn "Branch divergenti → eseguo merge non-fast-forward."
  if ! git -c user.email="deploy@stickers-matchbox.local" \
          -c user.name="Deploy Script" \
          merge --no-ff FETCH_HEAD \
          -m "Merge remote $BRANCH into local $BRANCH (deploy.sh)"; then
    fail "Merge in conflitto. Risolvi i conflitti a mano, poi rilancia ./deploy.sh"
  fi
  ok "Merge completato."
fi

# 4. Pre-push check: workflow files richiedono scope 'workflow' sul token
WORKFLOW_CHANGES=$(git diff --name-only "$REMOTE" HEAD -- '.github/workflows/' 2>/dev/null || true)
if [ -n "$WORKFLOW_CHANGES" ]; then
  warn "Il push include modifiche a file GitHub Actions:"
  echo "$WORKFLOW_CHANGES" | sed 's/^/    /'
  warn "Il tuo GITHUB_TOKEN potrebbe NON avere lo scope 'workflow' richiesto."
  warn "Se il push fallisce con 'refusing to allow a Personal Access Token…':"
  echo "    1. Vai su https://github.com/settings/tokens"
  echo "    2. Modifica il token esistente (o creane uno nuovo)"
  echo "    3. Spunta lo scope 'workflow' (oltre a 'repo')"
  echo "    4. Salva il nuovo token in Replit Secrets come GITHUB_TOKEN"
  echo "    5. Rilancia ./deploy.sh"
fi

# 5. Push
info "Push su GitHub $BRANCH…"
if ! git push "$AUTH_URL" "$BRANCH" 2>&1 | tee /tmp/deploy_push.log; then
  if grep -q "without .workflow. scope" /tmp/deploy_push.log; then
    fail "Token GitHub senza scope 'workflow'. Aggiorna il token come spiegato sopra e rilancia."
  fi
  fail "Push fallito. Controlla l'errore qui sopra."
fi
ok "Push completato → $REMOTE_URL"

# 5. Verifica
NEW_REMOTE=$(git ls-remote "$AUTH_URL" "refs/heads/$BRANCH" | awk '{print $1}')
NEW_LOCAL=$(git rev-parse HEAD)
if [ "$NEW_REMOTE" = "$NEW_LOCAL" ]; then
  ok "Verifica OK — locale e remote allineati su $NEW_LOCAL"
else
  fail "Disallineamento dopo il push: locale=$NEW_LOCAL remote=$NEW_REMOTE"
fi
