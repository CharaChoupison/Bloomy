#!/usr/bin/env bash
# Déploie un commit de Pronoti sur le serveur. Installé dans /usr/local/bin/pronoti-deploy.
#
#   pronoti-deploy <sha du commit>
#
# Appelé par GitHub Actions via SSH (la clé de déploiement ne peut lancer que ce script),
# ou à la main : sudo -u pronoti -H pronoti-deploy <sha>
#
# Chaque version est construite dans son propre dossier pendant que l'ancienne reste en ligne,
# puis on bascule. Si la nouvelle version ne répond pas, on revient automatiquement à l'ancienne.

set -euo pipefail

REPO_URL="https://github.com/CharaChoupison/Bloomy.git"
BASE=/opt/pronoti
KEEP_RELEASES=3
HEALTH_URL="http://127.0.0.1:3000/login"

# Via SSH, le sha arrive dans SSH_ORIGINAL_COMMAND ; à la main, en argument.
SHA="${1:-${SSH_ORIGINAL_COMMAND:-}}"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "Usage : pronoti-deploy <sha complet du commit>" >&2; exit 2; }
[[ "$(id -un)" == "pronoti" ]] || { echo "À lancer en tant qu'utilisateur pronoti." >&2; exit 2; }

# Un seul déploiement à la fois.
exec 9>"$BASE/deploy.lock"
flock 9

RELEASE="$BASE/releases/$SHA"
PREVIOUS=$(readlink -f "$BASE/current" 2>/dev/null || true)

if [[ ! -f "$RELEASE/.next/BUILD_ID" ]]; then
  echo "▶ Récupération de ${SHA:0:7}"
  rm -rf "$RELEASE"
  git init -q "$RELEASE"
  # Historique complet : le nombre de commits sert de numéro de version (voir next.config.ts).
  git -C "$RELEASE" fetch -q "$REPO_URL" "$SHA"
  git -C "$RELEASE" checkout -q FETCH_HEAD

  # Secrets et token Pronote partagés entre les versions, jamais dans Git.
  ln -sfn "$BASE/shared/.env.local" "$RELEASE/.env.local"
  ln -sfn "$BASE/shared/.data" "$RELEASE/.data"

  echo "▶ Installation des dépendances"
  (cd "$RELEASE" && npm ci --no-audit --no-fund --loglevel=error)

  echo "▶ Build"
  # L'identifiant de déploiement force un rechargement complet des onglets ouverts sur l'ancienne version.
  if ! (cd "$RELEASE" && NEXT_TELEMETRY_DISABLED=1 NEXT_DEPLOYMENT_ID="${SHA:0:12}" npm run build); then
    rm -rf "$RELEASE"
    echo "✗ Build échoué : la version en ligne n'a pas changé." >&2
    exit 1
  fi
fi

switch_to() {
  ln -sfn "$1" "$BASE/current.tmp"
  mv -Tf "$BASE/current.tmp" "$BASE/current"
  sudo /usr/bin/systemctl restart pronoti
}

healthy() {
  for _ in $(seq 1 30); do
    curl -fsS -o /dev/null "$HEALTH_URL" 2>/dev/null && return 0
    sleep 1
  done
  return 1
}

echo "▶ Mise en ligne"
switch_to "$RELEASE"
if ! healthy; then
  echo "✗ La nouvelle version ne répond pas (journalctl -u pronoti pour le détail)." >&2
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" && "$PREVIOUS" != "$RELEASE" ]]; then
    echo "↩ Retour à la version précédente" >&2
    switch_to "$PREVIOUS"
  fi
  exit 1
fi

# Ménage : on garde les dernières versions pour pouvoir revenir en arrière.
CURRENT=$(readlink -f "$BASE/current")
ls -1dt "$BASE"/releases/*/ | sed 's:/$::' | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
  if [[ "$old" != "$CURRENT" ]]; then rm -rf "$old"; fi
done

echo "✓ ${SHA:0:7} en ligne"
