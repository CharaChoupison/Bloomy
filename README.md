# Pronoti

Une interface Pronote repensée : plus claire, plus rapide et agréable sur téléphone comme sur ordinateur.

Pronoti se connecte à Pronote grâce à [Pawnote](https://github.com/LiterateInk/Pawnote) et affiche les informations de l'élève dans une application web moderne, avec thème clair/sombre et couleur d'accent personnalisable.

## Fonctionnalités

- **Accueil** : le prochain cours en un coup d'œil
- **Semaine** : l'emploi du temps, en colonnes sur ordinateur
- **Cours** : le contenu des séances
- **Notes** : les notes et moyennes
- **Devoirs** : la liste des devoirs, avec la case « fait » enregistrée dans Pronote
- **Vie scolaire** : absences, retards et punitions
- **Actualités** et **Messagerie** (lecture seule)
- **Compte** : les informations de l'élève, valeurs sensibles masquées
- **Réglages** : thème, couleur d'accent et thèmes personnalisés (fichiers `.css`, à la Vencord) : voir le [guide pour créer un thème](public/themes/guide.md), aussi servi par l'app sur `/themes/guide.md`

## Stack

- [Next.js](https://nextjs.org) 16, React 19, TypeScript
- [Pawnote](https://github.com/LiterateInk/Pawnote) pour la communication avec Pronote

## Lancer le projet

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run hash-password        # définit le mot de passe d'accès à l'app
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |

> `npm install` applique automatiquement un petit correctif à Pawnote (`scripts/patch-pawnote.mjs`).

## Mise en ligne

Pronoti s'héberge gratuitement sur un serveur Oracle Cloud, avec mise à jour automatique à chaque push sur `main` : voir [deploy/README.md](deploy/README.md).

## Données locales

Les secrets (`.env.local`) et le jeton Pronote (`.data/`) restent sur la machine et ne sont jamais versionnés.
