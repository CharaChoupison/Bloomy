# Bloomy

Une interface Pronote repensée : plus claire, plus rapide et agréable sur téléphone comme sur ordinateur.

Bloomy se connecte à Pronote grâce à [Pawnote](https://github.com/LiterateInk/Pawnote) et affiche les informations de l'élève dans une application web moderne, avec thème clair/sombre et couleur d'accent personnalisable.

Chaque élève se connecte avec **son propre identifiant et mot de passe Pronote**. Le mot de passe n'est jamais enregistré : il sert une fois à obtenir un jeton Pronote, conservé chiffré sur le serveur avec une clé qui n'existe que dans le cookie de l'appareil.

## Fonctionnalités

- **Accueil** : le prochain cours en un coup d'œil
- **Semaine** : l'emploi du temps, en colonnes sur ordinateur
- **Cours** : le contenu des séances
- **Notes** : les notes et moyennes
- **Devoirs** : la liste des devoirs, avec la case « fait » enregistrée dans Pronote
- **Vie scolaire** : absences, retards et punitions
- **Actualités** et **Messagerie** (lecture seule)
- **Compte** : les informations de l'élève, valeurs sensibles masquées
- **Notifications** (facultatives, par appareil) : nouvelles notes, nouveaux devoirs, cours annulés ou modifiés
- **Réglages** : thème, couleur d'accent et thèmes personnalisés (fichiers `.css`, à la Vencord) : voir le [guide pour créer un thème](public/themes/guide.md), aussi servi par l'app sur `/themes/guide.md`

## Stack

- [Next.js](https://nextjs.org) 16, React 19, TypeScript
- [Pawnote](https://github.com/LiterateInk/Pawnote) pour la communication avec Pronote

## Lancer le projet

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run generate-secret      # ajoute le secret de signature des cookies
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires (runner intégré de Node, sans dépendance) |

> `npm install` applique automatiquement un petit correctif à Pawnote (`scripts/patch-pawnote.mjs`).

## Mise en ligne

Bloomy s'héberge gratuitement sur un serveur Oracle Cloud, avec mise à jour automatique à chaque push sur `main` : voir [deploy/README.md](deploy/README.md).

## Sécurité et données

| Protection | Où |
| --- | --- |
| Cookie de session signé (HMAC), `httpOnly`, révocable : la déconnexion supprime la session du serveur | `src/lib/auth/token.ts`, `src/lib/auth/session.ts` |
| Jeton Pronote chiffré (AES-256-GCM), un fichier par appareil dans `.data/sessions/`, clé uniquement dans le cookie | `src/lib/auth/session-store.ts` |
| Caches Next.js séparés par élève (identifiant non secret, jamais la clé) | `src/lib/pronote/*.ts`, `src/lib/pronote/cache-tags.ts` |
| Établissements autorisés (`PRONOTI_ALLOWED_HOSTS`) et refus des adresses IP privées, redirections comprises (anti-SSRF) | `src/lib/pronote/network.ts`, `src/lib/pronote/fetcher.ts` |
| Limite de tentatives par IP et par compte Pronote | `src/lib/auth/rate-limit.ts`, `src/app/login/actions.ts` |
| Notifications sur demande seulement : clé de session chiffrée avec une clé du serveur, messages chiffrés pour l'appareil (Web Push, RFC 8291), effacée avec la session | `src/lib/push/` |

Les secrets (`.env.local`) et les sessions (`.data/`) restent sur la machine et ne sont jamais versionnés. Ce que voient les élèves : page `/confidentialite`.
