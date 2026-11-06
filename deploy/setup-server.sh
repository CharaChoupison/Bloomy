#!/usr/bin/env bash
# Installation de Pronoti sur un serveur Ubuntu neuf (pensé pour Oracle Cloud Always Free, ARM ou x86).
#
# Usage, une seule fois, connecté en SSH avec l'utilisateur par défaut (ubuntu) :
#   git clone https://github.com/CharaChoupison/Pronoti.git && sudo bash Pronoti/deploy/setup-server.sh
#
# Pour utiliser ton propre nom de domaine plutôt que l'adresse sslip.io automatique :
#   sudo DOMAIN=pronoti.mondomaine.fr bash Pronoti/deploy/setup-server.sh
#
# Le script peut être relancé sans risque : il ne redemande pas les secrets déjà enregistrés.

set -euo pipefail

REPO_URL="https://github.com/CharaChoupison/Pronoti.git"
NODE_MAJOR=24
APP_USER=pronoti
BASE=/opt/pronoti
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
ok() { printf '\033[32m✓ %s\033[0m\n' "$1"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Lance ce script avec sudo."
[[ -f /etc/os-release ]] && . /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "Ce script est prévu pour Ubuntu."
export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------------
step "Mise à jour du système"
apt-get update -q
apt-get upgrade -yq
apt-get install -yq ca-certificates curl git gnupg debian-keyring debian-archive-keyring \
  apt-transport-https unattended-upgrades fail2ban
ok "Système à jour"

# ---------------------------------------------------------------------------
step "Mises à jour de sécurité automatiques"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
cat >/etc/apt/apt.conf.d/52pronoti-upgrades <<'EOF'
// Redémarre la nuit si une mise à jour l'exige ; Pronoti redémarre tout seul ensuite.
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
ok "Correctifs de sécurité installés chaque jour"

# ---------------------------------------------------------------------------
step "Protection de SSH"
cat >/etc/ssh/sshd_config.d/99-pronoti.conf <<'EOF'
# Connexion par clé uniquement.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
sshd -t || die "Configuration SSH invalide, rien n'a été appliqué."
systemctl reload ssh 2>/dev/null || systemctl reload sshd
systemctl enable --now fail2ban >/dev/null
ok "SSH par clé uniquement, fail2ban actif"

# ---------------------------------------------------------------------------
step "Pare-feu (ports 22, 80 et 443 seulement)"
if command -v netfilter-persistent >/dev/null && iptables -S INPUT | grep -q REJECT; then
  # Images Oracle : iptables rejette tout sauf SSH. On ouvre 80 et 443 juste avant la règle REJECT.
  for port in 80 443; do
    if ! iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
      pos=$(iptables -L INPUT --line-numbers -n | awk '/REJECT/ {print $1; exit}')
      iptables -I INPUT "$pos" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    fi
  done
  netfilter-persistent save >/dev/null
else
  apt-get install -yq ufw
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null
fi
ok "Pare-feu configuré"

# ---------------------------------------------------------------------------
# Les petites machines (1 Go) manquent de mémoire pour le build Next.js : on ajoute 2 Go de swap.
if [[ $(awk '/MemTotal/ {print $2}' /proc/meminfo) -lt 3000000 && ! -f /swapfile ]]; then
  step "Ajout de mémoire d'échange (swap)"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >>/etc/fstab
  ok "2 Go de swap ajoutés"
fi

# ---------------------------------------------------------------------------
step "Installation de Node.js $NODE_MAJOR"
if ! node -v 2>/dev/null | grep -q "^v$NODE_MAJOR\."; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  apt-get install -yq nodejs
fi
ok "Node $(node -v)"

# ---------------------------------------------------------------------------
step "Installation de Caddy (HTTPS automatique)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' |
    gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    >/etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -yq caddy
fi
ok "Caddy $(caddy version | cut -d' ' -f1)"

# ---------------------------------------------------------------------------
step "Utilisateur et dossiers de l'app"
id "$APP_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" -m 755 "$BASE" "$BASE/releases"
install -d -o "$APP_USER" -g "$APP_USER" -m 700 "$BASE/shared" "$BASE/shared/.data"
install -m 755 "$SCRIPT_DIR/pronoti-deploy.sh" /usr/local/bin/pronoti-deploy
install -m 644 "$SCRIPT_DIR/pronoti.service" /etc/systemd/system/pronoti.service
# Le déploiement a seulement le droit de redémarrer le service, rien d'autre.
echo "$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart pronoti" >/etc/sudoers.d/pronoti
chmod 440 /etc/sudoers.d/pronoti
visudo -cf /etc/sudoers.d/pronoti >/dev/null
systemctl daemon-reload
systemctl enable pronoti >/dev/null
ok "Service pronoti prêt"

# ---------------------------------------------------------------------------
ENV_FILE="$BASE/shared/.env.local"
if [[ ! -s "$ENV_FILE" ]]; then
  step "Secrets de l'app (enregistrés uniquement sur ce serveur)"
  while true; do
    read -rsp "Mot de passe d'accès à Pronoti (12 caractères minimum) : " APP_PASSWORD </dev/tty; echo
    if [[ ${#APP_PASSWORD} -lt 12 ]]; then echo "Trop court."; continue; fi
    read -rsp "Retape-le pour confirmer : " APP_PASSWORD_CONFIRM </dev/tty; echo
    [[ "$APP_PASSWORD" == "$APP_PASSWORD_CONFIRM" ]] && break
    echo "Les deux mots de passe ne sont pas identiques."
  done
  read -rp "URL Pronote [http://nice.ilec.fr/mobile.eleve.html] : " PRONOTE_URL </dev/tty
  PRONOTE_URL=${PRONOTE_URL:-http://nice.ilec.fr/mobile.eleve.html}
  read -rp "Identifiant Pronote : " PRONOTE_USERNAME </dev/tty
  read -rsp "Mot de passe Pronote : " PRONOTE_PASSWORD </dev/tty; echo

  # Les valeurs passent par l'environnement, jamais par la ligne de commande (visible dans `ps`).
  # Next.js interprète les `$` même entre apostrophes : on les échappe en `\$`.
  umask 077
  APP_PASSWORD="$APP_PASSWORD" PRONOTE_URL="$PRONOTE_URL" PRONOTE_USERNAME="$PRONOTE_USERNAME" \
    PRONOTE_PASSWORD="$PRONOTE_PASSWORD" node -e '
    const c = require("node:crypto");
    const quote = (name) => {
      const value = process.env[name];
      if (/[\x27\r\n]/.test(value)) {
        console.error(`${name} ne doit contenir ni apostrophe ni retour à la ligne.`);
        process.exit(1);
      }
      return `${name}=\x27${value.replaceAll("$", "\\$")}\x27`;
    };
    const salt = c.randomBytes(16);
    const hash = c.scryptSync(process.env.APP_PASSWORD, salt, 64);
    console.log(`APP_PASSWORD_HASH=scrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
    console.log(`APP_SESSION_SECRET=${c.randomBytes(32).toString("base64url")}`);
    console.log(quote("PRONOTE_URL"));
    console.log(quote("PRONOTE_USERNAME"));
    console.log(quote("PRONOTE_PASSWORD"));
  ' >"$ENV_FILE" || { rm -f "$ENV_FILE"; die "Secrets non enregistrés, relance le script."; }
  umask 022
  unset APP_PASSWORD APP_PASSWORD_CONFIRM PRONOTE_PASSWORD
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ok "Secrets enregistrés dans $ENV_FILE"
else
  ok "Secrets déjà présents, conservés"
fi

# ---------------------------------------------------------------------------
step "Adresse du site et HTTPS"
if [[ -z "${DOMAIN:-}" ]]; then
  PUBLIC_IP=$(curl -fsS4 https://api.ipify.org) || die "Impossible de trouver l'IP publique : relance avec DOMAIN=..."
  DOMAIN="${PUBLIC_IP//./-}.sslip.io"
fi
sed "s/__DOMAIN__/$DOMAIN/" "$SCRIPT_DIR/Caddyfile" >/etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl reload caddy
ok "Site configuré sur https://$DOMAIN"

# ---------------------------------------------------------------------------
step "Clé de déploiement pour GitHub Actions"
AUTH_KEYS="/home/$APP_USER/.ssh/authorized_keys"
install -d -o "$APP_USER" -g "$APP_USER" -m 700 "/home/$APP_USER/.ssh"
if ! grep -q "pronoti-github-deploy" "$AUTH_KEYS" 2>/dev/null; then
  TMP_KEY=$(mktemp -u)
  ssh-keygen -q -t ed25519 -N "" -C "pronoti-github-deploy" -f "$TMP_KEY"
  # Cette clé ne peut QUE lancer un déploiement : pas de shell, pas de tunnel.
  echo "command=\"/usr/local/bin/pronoti-deploy\",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding $(cat "$TMP_KEY.pub")" >>"$AUTH_KEYS"
  chown "$APP_USER:$APP_USER" "$AUTH_KEYS"
  chmod 600 "$AUTH_KEYS"
  DEPLOY_PRIVATE_KEY=$(cat "$TMP_KEY")
  rm -f "$TMP_KEY" "$TMP_KEY.pub"
else
  DEPLOY_PRIVATE_KEY=""
fi

# ---------------------------------------------------------------------------
step "Premier déploiement (le build prend quelques minutes)"
SHA=$(git ls-remote "$REPO_URL" refs/heads/main | cut -f1)
# Un échec ici ne doit pas interrompre le script : la clé de déploiement ci-dessous
# n'est affichée qu'une fois, elle serait perdue.
if sudo -u "$APP_USER" -H /usr/local/bin/pronoti-deploy "$SHA"; then
  printf '\n\033[1;32m✅ Pronoti est en ligne : https://%s\033[0m\n' "$DOMAIN"
  printf '   (le certificat HTTPS peut mettre une minute à arriver la première fois)\n'
else
  printf '\n\033[1;33m⚠ Le déploiement a échoué (détail ci-dessus). Le serveur est prêt quand même :\n'
  printf '  configure GitHub ci-dessous, corrige le problème et pousse sur main pour redéployer.\033[0m\n'
fi
cat <<EOF

────────────────────────────────────────────────────────────────────
Pour les mises à jour automatiques, va dans ton dépôt GitHub :
Settings → Secrets and variables → Actions

1. Onglet « Variables » → New repository variable
   Nom : DEPLOY_HOST     Valeur : $DOMAIN

2. Onglet « Secrets » → New repository secret
   Nom : DEPLOY_KNOWN_HOSTS     Valeur (une ligne) :
$DOMAIN $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)
EOF
if [[ -n "$DEPLOY_PRIVATE_KEY" ]]; then
  cat <<EOF

3. Onglet « Secrets » → New repository secret
   Nom : DEPLOY_SSH_KEY     Valeur (tout le bloc, lignes BEGIN et END comprises) :
$DEPLOY_PRIVATE_KEY

Cette clé n'est affichée qu'une fois et n'est pas gardée sur le serveur.
Elle ne permet que de lancer un déploiement.
EOF
else
  echo
  echo "3. DEPLOY_SSH_KEY : déjà créée lors d'une installation précédente, rien à changer."
fi
echo "────────────────────────────────────────────────────────────────────"
