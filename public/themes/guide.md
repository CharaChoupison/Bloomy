# Créer un thème pour Pronoti

Ce guide explique comment écrire un thème personnalisé pour Pronoti. Il s'adresse aussi bien à une personne qu'à une IA : tout ce qu'il faut savoir est sur cette page.

Le principe est le même que les thèmes Vencord : **un thème est un simple fichier `.css`** avec un en-tête qui lui donne un nom. L'élève l'importe dans **Plus › Réglages › Thèmes personnalisés**, puis l'active ou le désactive d'un geste.

---

## En bref

1. Crée un fichier `mon-theme.css`.
2. Commence par l'en-tête (voir plus bas).
3. Change les **variables CSS** (tokens) de l'app sur `:root`.
4. Importe le fichier dans Réglages. Le thème s'applique tout de suite.

Exemple minimal :

```css
/**
 * @name Orange
 * @author Camille
 * @description Accent orange et coins plus carrés.
 * @version 1.0.0
 */

:root {
  --accent: #c2410c;
  --accent-soft: #fdeadf;
  --radius-md: 6px;
  --radius-lg: 8px;
}

:root[data-scheme="dark"] {
  --accent: #fb9a5c;
  --accent-soft: #3a1d0c;
}
```

Deux thèmes complets servent d'exemples : [`minuit.css`](./minuit.css) (toujours sombre) et [`papier.css`](./papier.css) (clair + sombre).

---

## 1. L'en-tête

Le **premier commentaire** du fichier doit être un bloc `/** … */` avec une ligne `@champ valeur` par champ (même format que Vencord et BetterDiscord).

| Champ          | Obligatoire | Rôle                                                              |
| -------------- | ----------- | ----------------------------------------------------------------- |
| `@name`        | conseillé   | Nom affiché (60 caractères max). Sans lui : le nom du fichier.    |
| `@author`      | non         | Auteur, affiché « par … ».                                        |
| `@description` | non         | Une ou deux phrases (280 caractères max). Peut continuer sur plusieurs lignes. |
| `@version`     | non         | Version affichée, par exemple `1.2.0`.                            |

**Mise à jour :** importer un fichier avec le même `@name` remplace l'ancienne version (même place dans la liste).

---

## 2. Comment le thème est appliqué

À connaître pour que le thème fonctionne du premier coup :

- **Ton CSS gagne toujours sur l'app.** Chaque thème est placé dans sa propre couche CSS (`@layer`), déclarée après celles de l'app : il remplace les tokens et les styles de l'app **quelle que soit la spécificité**. Un simple `:root { --accent: … }` suffit, même en mode sombre.
- **Ordre :** les thèmes actifs s'appliquent dans l'ordre de la liste, puis le « CSS rapide » de l'élève. Le suivant gagne toujours sur le précédent, là aussi quelle que soit la spécificité. À l'intérieur d'un même thème, les règles CSS habituelles s'appliquent (`:root[data-scheme="dark"]` gagne sur `:root`).
- **Évite `!important`** : inutile ici, et il inverse l'ordre des couches (entre deux thèmes, c'est alors le premier de la liste qui gagnerait).
- **`@import` est permis** (par exemple une police Google Fonts) : l'app le remonte automatiquement en tête du CSS.
- **Le thème n'est jamais appliqué sur la page de connexion** (sécurité, voir § 6).
- **Mode secours :** si un thème rend l'app inutilisable, ouvrir `/reglages?sans-theme` désactive tous les thèmes le temps de la visite. On peut alors désactiver ou supprimer le coupable.
- Le thème est stocké **dans le navigateur de l'appareil** (pas de synchronisation). Taille maximale : **300 Ko** par fichier.

---

## 3. Clair, sombre et accent : les attributs de `<html>`

| Sélecteur                      | Quand                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- |
| `:root[data-scheme="light"]`   | L'app est **affichée** en clair (réglage Clair, ou Automatique + appareil clair). |
| `:root[data-scheme="dark"]`    | L'app est **affichée** en sombre. **C'est le sélecteur à utiliser** pour le mode sombre. |
| `:root[data-accent="violet"]`  | Couleur d'accent choisie par l'élève : `bleu`, `violet`, `framboise`, `ocean`, `sapin`, `graphite`. |
| `:root[data-theme="dark"]`     | Réglage forcé par l'élève (`light` / `dark`, absent si Automatique). Préfère `data-scheme`. |

N'utilise pas `@media (prefers-color-scheme: dark)` : il ignore le réglage Clair / Sombre de l'app.

**Trois façons de faire un thème :**

- **Thème qui suit Clair / Sombre** (recommandé) : valeurs communes sur `:root`, couleurs sur `:root[data-scheme="light"]` et `:root[data-scheme="dark"]`. Voir `papier.css`.
- **Thème toujours sombre (ou toujours clair)** : tout sur `:root`, plus `color-scheme: dark;`. Il faut alors redéfinir **tous** les tokens de couleur, y compris les couleurs d'état. Voir `minuit.css`.
- **Retouche légère** : juste quelques tokens (accent, arrondis, police). Le reste de l'app ne bouge pas.

**Respecter le choix d'accent de l'élève :** si ton thème ne définit pas `--accent`, le nuancier de Réglages continue de fonctionner. Tu peux aussi ajuster seulement les six accents (`--accent-bleu`, `--accent-bleu-soft`, etc.) pour qu'ils s'accordent à ton fond.

---

## 4. Référence des tokens

Ce sont les variables à modifier. **Tout le reste de l'interface en dérive** : en changeant ces valeurs, on change toute l'app de façon cohérente.

### Couleurs de base

| Token              | Rôle                                                       | Clair     | Sombre    |
| ------------------ | ---------------------------------------------------------- | --------- | --------- |
| `--bg`             | Fond de la page (aussi la barre du navigateur)             | `#f5f5f7` | `#0b0b0d` |
| `--surface`        | Fond des cartes, barres de navigation, champs              | `#ffffff` | `#17171a` |
| `--surface-sunken` | Zones en creux (contrôle segmenté, zones de code)          | `#ececf0` | `#222226` |
| `--ink`            | Texte principal                                            | `#1c1c1e` | `#f2f2f4` |
| `--ink-muted`      | Texte secondaire, légendes                                 | `#6b6b73` | `#9a9aa3` |
| `--line`           | Séparateurs et bordures discrètes                          | `#e4e4e9` | `#2a2a30` |
| `--line-strong`    | Bordures de champs, boutons secondaires, interrupteur éteint | `#8a8a93` | `#70707a` |
| `--overlay`        | Voile derrière les fenêtres                                | `rgba(11,11,13,.4)` | `rgba(0,0,0,.6)` |

### Accent

| Token           | Rôle                                                           | Clair (Bleu) | Sombre (Bleu) |
| --------------- | -------------------------------------------------------------- | ------------ | ------------- |
| `--accent`      | Boutons principaux, liens, onglet actif, focus clavier         | `#2156d9`    | `#86aefc`     |
| `--accent-soft` | Fond léger de l'élément actif (barre latérale, survol)         | `#e9effd`    | `#172440`     |
| `--on-accent`   | Texte / icône posé **sur** `--accent`                          | `#ffffff`    | `#0b0b0d`     |

Accents du nuancier (chacun avec sa version `-soft`) : `--accent-bleu`, `--accent-violet`, `--accent-framboise`, `--accent-ocean`, `--accent-sapin`, `--accent-graphite`.

### Couleurs d'état

Chaque état a une couleur de texte et un fond `-soft` sur lequel ce texte doit rester lisible.

| Token                          | Sens                                     | Clair                 | Sombre                |
| ------------------------------ | ---------------------------------------- | --------------------- | --------------------- |
| `--danger` / `--danger-soft`   | Erreur, absence, note sous la moyenne    | `#b4380a` / `#fdece2` | `#ffa071` / `#3d1a0c` |
| `--warn` / `--warn-soft`       | Avertissement, retard                    | `#8a4b00` / `#fdf1d8` | `#f5c46b` / `#3a2a0a` |
| `--test` / `--test-soft`       | Contrôle, évaluation                     | `#5b2dbf` / `#efe9fd` | `#c9b6ff` / `#2b1f4d` |
| `--success` / `--success-soft` | Fait, réussi                             | `#16733a` / `#e4f4e9` | `#6fdc95` / `#10301c` |
| `--neutral` / `--neutral-soft` | Information neutre                       | `#52525b` / `#ececef` | `#b4b4bd` / `#27272b` |

### Forme, ombre et police

| Token                  | Rôle                                         | Valeur par défaut |
| ---------------------- | -------------------------------------------- | ----------------- |
| `--radius-sm`          | Petits éléments (pastilles, liens)           | `8px`             |
| `--radius-md`          | Boutons, champs, bandeaux                    | `12px`            |
| `--radius-lg`          | Cartes                                       | `16px`            |
| `--radius-xl`          | Grandes surfaces                             | `24px`            |
| `--shadow-float-value` | Ombre des éléments flottants (barre d'onglets, segment actif) | voir globals.css |
| `--font-sans`          | Police de toute l'interface                  | Geist, puis police système |
| `--font-mono`          | Police à chasse fixe                         | Geist Mono        |

Pour changer la police :

```css
@import url("https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap");

:root {
  --font-sans: "Atkinson Hyperlegible", system-ui, sans-serif;
}
```

Les tailles de texte (`--text-display`, `--text-title`, `--text-body`, etc.) existent aussi, mais **évite de les réduire** : elles sont calculées pour la lisibilité et le zoom.

---

## 5. Aller plus loin que les tokens

Les tokens couvrent presque tout. Si tu dois cibler un élément précis, **n'utilise pas les classes CSS de l'app** (`bg-surface`, `rounded-lg`, …) : ce sont des classes utilitaires qui changent sans prévenir et ton thème casserait.

Repères stables, à préférer :

| Sélecteur                                   | Élément                                          |
| ------------------------------------------- | ------------------------------------------------ |
| `nav[aria-label="Navigation principale"]`   | Barre latérale (ordinateur) et barre d'onglets (téléphone) |
| `[aria-current="page"]`                     | Lien de navigation de la page en cours            |
| `main`                                      | Contenu de l'écran                               |
| `main h1`                                   | Titre de l'écran                                 |
| `h2`, `h3`                                  | Titres de sections                               |
| `[role="switch"]`                           | Interrupteurs                                    |
| `button`, `a`, `input`, `textarea`          | Éléments natifs                                  |

Exemple, un fond en dégradé discret :

```css
body {
  background: linear-gradient(180deg, var(--accent-soft), var(--bg) 320px) no-repeat, var(--bg);
}
```

---

## 6. Règles à respecter

Un thème est du CSS qui s'exécute dans l'app de l'élève : il doit rester **lisible, accessible et sûr**.

**Accessibilité (WCAG 2.2 AA) : à vérifier avant de publier un thème**

- `--ink` sur `--bg`, `--surface` et `--surface-sunken` : contraste **≥ 4,5:1**.
- `--ink-muted` sur `--bg`, `--surface` et `--surface-sunken` : **≥ 4,5:1** (c'est du texte, même s'il est secondaire).
- `--accent` sur `--surface` et sur `--accent-soft` : **≥ 4,5:1** (liens, onglet actif).
- `--on-accent` sur `--accent` : **≥ 4,5:1** (texte des boutons principaux).
- Chaque couleur d'état sur son `-soft` : **≥ 4,5:1**.
- `--line-strong` sur `--surface` : **≥ 3:1** (bordures de champs, interrupteurs).
- Ne masque jamais le contour de focus (`:focus-visible`) et ne mets pas `outline: none`.
- Pas d'animation permanente ; si tu en ajoutes une, désactive-la dans `@media (prefers-reduced-motion: reduce)`.
- Ne cache pas de texte (`display: none` sur des libellés) : la couleur ne doit jamais être la seule information.

Outil pratique : https://webaim.org/resources/contrastchecker/

**Sécurité et confidentialité**

- N'importe que des thèmes **dont tu connais la source**. Du CSS peut charger des images ou des polices depuis un autre site, et donc signaler à ce site que tu utilises l'app.
- Un thème ne doit pas charger de ressources depuis des serveurs inconnus. Les polices Google Fonts sont acceptables.
- Pas de sélecteurs sur la valeur des champs (`input[value^="…"]`) : c'est une technique d'espionnage de saisie.
- C'est pour cette raison que la page de connexion n'est jamais thémée.

**Performance**

- Évite `:has()` sur de grands ensembles, les `filter` / `backdrop-filter` sur toute la page et les grosses images de fond : sur téléphone, l'app ralentirait.

---

## 7. Pour une IA : modèle de demande

Copie ce texte dans ton assistant IA en remplaçant la dernière ligne :

> Tu écris un thème pour l'app web « Pronoti » en suivant le guide ci-dessous [colle ce guide].
> Contraintes : un seul fichier CSS ; commence par l'en-tête `/** @name … @author … @description … @version … */` ;
> modifie surtout les tokens de la section 4 sur `:root` ; utilise `:root[data-scheme="light"]` et
> `:root[data-scheme="dark"]` pour les deux modes (ou `color-scheme: dark` sur `:root` pour un thème toujours sombre,
> en redéfinissant alors tous les tokens de couleur) ; n'utilise jamais les classes utilitaires de l'app ;
> respecte tous les contrastes de la section 6 et donne-moi le ratio calculé pour chacun.
> Le thème que je veux : **[décris l'ambiance, les couleurs, la police…]**

Teste ensuite le fichier : Réglages › Thèmes personnalisés › Importer un thème, en mode clair **et** en mode sombre, sur l'accueil, les notes et la messagerie.
