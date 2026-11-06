# Mettre Pronoti en ligne (Oracle Cloud, gratuit)

Compte environ 30 à 45 minutes la première fois. Ensuite, chaque `git push` sur `main` met le site à jour tout seul.

## Vue d'ensemble

```
Navigateur ──HTTPS──▶ Caddy (ports 80/443, certificat automatique)
                        │
                        ▼ 127.0.0.1:3000
                      Pronoti (service systemd « pronoti »)
                        │
                        ▼
                      Pronote
```

| Sur le serveur | Rôle |
| --- | --- |
| `/opt/pronoti/current` | Lien vers la version en ligne |
| `/opt/pronoti/releases/<commit>` | Les 3 dernières versions, pour revenir en arrière |
| `/opt/pronoti/shared/.env.local` | Secrets (mot de passe d'accès haché, identifiants Pronote) |
| `/opt/pronoti/shared/.data/` | Token Pronote du serveur |

## 1. Créer une clé SSH sur ton Mac

Si tu n'en as pas déjà une (`ls ~/.ssh/id_ed25519.pub` ne trouve rien) :

```bash
ssh-keygen -t ed25519 -C "pronoti-oracle"
```

Appuie sur Entrée pour l'emplacement par défaut. Une phrase de passe est conseillée.

## 2. Créer le compte Oracle Cloud

1. Inscris-toi sur [oracle.com/cloud/free](https://www.oracle.com/cloud/free/).
2. **Région principale : France Central (Paris) ou France South (Marseille).** Ce choix est définitif.
3. La carte bancaire sert seulement à vérifier ton identité. Reste sur le compte gratuit (ne passe pas en « Pay As You Go »).

## 3. Créer la machine

Menu ☰ → **Compute → Instances → Create instance**.

| Réglage | Valeur |
| --- | --- |
| Name | `pronoti` |
| Image | **Canonical Ubuntu 24.04** |
| Shape | **Ampere → VM.Standard.A1.Flex**, 1 OCPU et 6 Go de RAM (c'est large) |
| Networking | Laisse le réseau proposé, avec **« Assign a public IPv4 address »** coché |
| Add SSH keys | **Paste public keys** → colle le résultat de `cat ~/.ssh/id_ed25519.pub` |

Clique sur **Create**. Si Oracle répond **« Out of capacity »**, change d'« Availability domain » ou réessaie un peu plus tard.

Note l'**adresse IP publique** affichée sur la page de l'instance.

## 4. Ouvrir les ports 80 et 443 côté Oracle

Sur la page de l'instance : **Subnet** (lien bleu) → **Security** → la *Security List* par défaut → **Add Ingress Rules**, deux fois :

| Source CIDR | IP Protocol | Destination port |
| --- | --- | --- |
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

Sans cette étape, le site reste injoignable et le certificat HTTPS ne peut pas être obtenu.

## 5. Installer Pronoti

Depuis ton Mac (remplace par ton IP) :

```bash
ssh ubuntu@123.45.67.89
```

Puis, sur le serveur :

```bash
git clone https://github.com/CharaChoupison/Pronoti.git && sudo bash Pronoti/deploy/setup-server.sh
```

Le script :

- met le système à jour ;
- active les mises à jour de sécurité automatiques ;
- configure SSH par clé uniquement, fail2ban et le pare-feu ;
- installe Node et Caddy ;
- te demande ton **mot de passe d'accès** (12 caractères minimum ; une phrase de 4 mots ou plus, c'est idéal) et tes **identifiants Pronote** ;
- fait le premier déploiement.

À la fin, il affiche l'adresse du site, par exemple `https://123-45-67-89.sslip.io`, et trois valeurs à copier dans GitHub.

> Le serveur se connecte à Pronote avec ses propres identifiants et obtient **son propre token**. Ne copie pas ton `.data/pronote-token.json` local sur le serveur : le token change à chaque connexion, donc ton Mac et le serveur se l'invalideraient l'un l'autre.

## 6. Activer les mises à jour automatiques

Dans le dépôt GitHub : **Settings → Secrets and variables → Actions**. Ajoute ce que le script a affiché :

| Où | Nom | Valeur |
| --- | --- | --- |
| Variables | `DEPLOY_HOST` | l'adresse du site, sans `https://` |
| Secrets | `DEPLOY_KNOWN_HOSTS` | la ligne d'empreinte du serveur |
| Secrets | `DEPLOY_SSH_KEY` | la clé privée, lignes `BEGIN` et `END` comprises |

Pour tester : **Actions → Vérification et déploiement → Run workflow**.

La clé de déploiement ne peut rien faire d'autre que lancer un déploiement : pas de terminal, pas de tunnel.

## Au quotidien

| Besoin | Commande (sur le serveur) |
| --- | --- |
| Voir les journaux de l'app | `sudo journalctl -u pronoti -f` |
| Redémarrer l'app | `sudo systemctl restart pronoti` |
| Revenir à une version précédente | `ls /opt/pronoti/releases`, puis `sudo -u pronoti -H pronoti-deploy <commit>` |
| Modifier un secret | `sudo -u pronoti nano /opt/pronoti/shared/.env.local`, puis redémarrer l'app |

Sur ton Mac, `git revert` puis `git push` fait aussi revenir en arrière.

Si un build échoue, la version en ligne ne change pas. Si la nouvelle version ne répond pas au démarrage, le script remet automatiquement la précédente.

### Utiliser ton propre nom de domaine

1. Fais pointer un enregistrement DNS `A` vers l'IP du serveur.
2. Relance `sudo DOMAIN=pronoti.mondomaine.fr bash Pronoti/deploy/setup-server.sh`.
3. Mets à jour `DEPLOY_HOST` et `DEPLOY_KNOWN_HOSTS` dans GitHub.

### Retirer le mot de passe Pronote du serveur (facultatif)

Une fois le site utilisé une première fois, le token est enregistré dans `/opt/pronoti/shared/.data/`. Tu peux alors vider la ligne `PRONOTE_PASSWORD` du `.env.local`. Il faudra la remettre si Pronote refuse un jour le token.

### Si Oracle arrête la machine

Sur un compte gratuit, Oracle peut arrêter une machine restée presque inactive pendant 7 jours. Rien n'est perdu : **Compute → Instances → pronoti → Start**. Le site redémarre tout seul.
