# 🐒 Monkeys Poker Club — Application de gestion

Application web pour gérer les joueurs, les tournois et le classement général
de l'association de poker "Monkeys". **Aucune base de données externe** :
toutes les données sont stockées dans un unique fichier `data/data.json`,
lu et modifié uniquement par le serveur.

## Architecture

```
/
├── server.js              # Serveur unique : routes API, auth, sécurité
├── create-user.js         # Script CLI pour créer/modifier un compte (admin/user)
├── lib/
│   ├── db.js               # Lecture / écriture atomique de data.json (file d'attente)
│   └── points.js            # Toute la logique du système de points (isolée, testable)
├── public/                 # Frontend statique servi tel quel (jamais data.json ici)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── data/
│   ├── data.json            # Données réelles — créé au démarrage, JAMAIS commité
│   └── data.example.json    # Exemple de structure, sûr à commiter
├── tests/
│   └── points.test.js       # Tests du calcul de points (node tests/points.test.js)
├── sessions_data/           # Sessions de connexion persistées sur disque (ignoré par git)
├── .env.example             # Modèle de configuration
├── .gitignore
├── package.json
└── README.md
```

Chaque fichier a un rôle unique et minimal : pas de framework frontend, pas de
build step, pas de fichiers superflus.

## Installation

```bash
npm install
cp .env.example .env
```

Éditez `.env` et générez un `SESSION_SECRET` fort :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Collez la valeur générée dans `.env`.

## Créer le premier compte administrateur

Il n'y a pas de page d'inscription publique (c'est volontaire, pour la
sécurité). Le premier compte se crée en ligne de commande :

```bash
node create-user.js admin@monassociation.fr "UnMotDePasseSolide!" admin "Pseudo admin"
```

Le mot de passe n'est **jamais** stocké en clair : il est haché avec bcrypt
avant d'être écrit dans `data.json`.

Pour créer un compte membre simple (lecture seule) :

```bash
node create-user.js membre@exemple.fr "AutreMotDePasse!" user "Pseudo"
```

## Lancement local

```bash
npm start
```

Puis ouvrez `http://localhost:3000`.

## Structure des données (`data/data.json`)

```json
{
  "users": [ { "id", "email", "passwordHash", "role", "nickname" } ],
  "players": [ { "id", "nickname", "active" } ],
  "seasons": [ { "id", "name" } ],
  "tournaments": [ { "id", "name", "date", "seasonId" } ],
  "results": [ { "id", "tournamentId", "playerId", "position", "isITM", "basePoints", "itmBonus", "totalPoints" } ]
}
```

- Un joueur n'a **aucune** donnée personnelle : uniquement un pseudo.
- Le nombre de participants d'un tournoi est toujours calculé automatiquement
  à partir des résultats enregistrés — jamais saisi manuellement.
- Le classement général n'est **jamais stocké** : il est recalculé à chaque
  consultation à partir de `tournaments` + `results`.

## Règles de calcul des points — Système 1 (saison 2026/2027)

Toute la logique est dans `lib/points.js`, avec des fonctions séparées et
testables :

- `getBasePoints(position)` — barème fixe pour les 10 premières places
  (100, 80, 65, 55, 45, 35, 25, 15, 10, 5), puis **1 point fixe** pour
  chaque position à partir de la 11e (pas un bonus, un score de base).
- `calculateITM(totalPlayers)` — nombre de joueurs "dans les points"
  (≈ 20 % des participants). **La règle d'arrondi est isolée dans cette
  fonction** (actuellement `Math.round`, modifiable à un seul endroit).
- `getITMBonusPool(totalPlayers)` — montant du bonus attribué à **chaque**
  joueur ITM (pas un total à partager) :
  - 1 à 10 joueurs → +0
  - 11 à 20 joueurs → +10 à chaque joueur ITM
  - 21 joueurs et plus → +20 à chaque joueur ITM
- `calculateITMBonus(totalPlayers, isITM)` — renvoie ce montant plein pour
  un joueur ITM donné, `0` sinon.
- `calculateTournamentPoints(position, totalPlayers, isITM)` — combine les
  deux : `{ basePoints, itmBonus, total }`. Un joueur absent (`position`
  null/undefined) obtient `0` partout.

Les tests (`node tests/points.test.js` ou `npm test`) vérifient notamment les
cas à 10, 11, 15, 20 et 21 joueurs, ainsi que le cas d'absence.

## Sécurité du stockage JSON

- `data/data.json` est **en dehors** du dossier `public/` : il n'est donc
  jamais servi par le serveur de fichiers statiques. Toute tentative
  d'accès direct (`/data/data.json`) retombe sur la page de connexion, pas
  sur les données.
- Le serveur est le **seul** point d'accès en lecture/écriture au fichier
  (module `lib/db.js`). Le frontend ne touche jamais ce fichier.
- Les mots de passe sont hachés avec bcrypt (jamais stockés en clair, jamais
  renvoyés au frontend).
- Écriture atomique : chaque modification est écrite dans un fichier
  temporaire puis déplacée (`rename`) vers `data.json`, pour éviter tout
  fichier corrompu en cas d'interruption.
- File d'attente d'écriture : deux requêtes concurrentes ne peuvent jamais
  écrire en même temps ; elles s'exécutent l'une après l'autre.
- Toutes les routes `/api/*` (sauf `/api/login`) exigent une session valide ;
  les routes de modification exigent en plus le rôle `admin`. Ces
  vérifications sont faites **côté serveur** uniquement — le frontend ne
  fait que cacher des boutons, ce qui n'est jamais considéré comme une
  protection réelle.
- Limitation des tentatives de connexion (10 / 15 min / IP) contre le
  brute-force, et limitation générale de l'API contre les abus.
- En-têtes de sécurité HTTP via `helmet` (CSP, etc.).

## Sauvegarde

Un administrateur connecté peut télécharger une copie complète des données
(hors hash de mots de passe) via le bouton "💾 Sauvegarde" ou directement
`GET /api/backup`. Le fichier téléchargé s'appelle
`poker-backup-AAAA-MM-JJ.json`.

## Déploiement

### Ce qu'il faut comprendre avant de choisir un hébergeur

Cette application est un **serveur Node.js qui écrit sur son disque local**
(`data/data.json` et `sessions_data/`). Deux points bloquent beaucoup
d'hébergeurs gratuits :

1. **GitHub Pages ne convient pas du tout** : il ne sert que des fichiers
   statiques, il ne peut pas exécuter un serveur Node.js ni écrire de
   fichier.
2. **La plupart des plateformes gratuites de type "PaaS" (Render, Railway,
   Fly.io, Cyclic, etc.) utilisent un système de fichiers *éphémère*** :
   à chaque redéploiement, chaque mise en veille/réveil, ou parfois même
   à chaque redémarrage, le disque est réinitialisé et **`data.json` serait
   perdu**. Sur ces plateformes, seul un **disque persistant** (souvent
   payant, ou disponible en quantité limitée sur certains plans gratuits)
   garantit que le fichier survit aux redémarrages.

**Vérifiez explicitement, sur la page de tarifs de l'hébergeur choisi, s'il
propose un "persistent disk" / "volume" gratuit.** Si ce n'est pas garanti
noir sur blanc, ne partez pas du principe que vos données survivront.

Options courantes à évaluer vous-même au moment du déploiement (les offres
changent souvent) :

- Un hébergeur qui propose explicitement un petit volume disque persistant
  gratuit pour une application Node.js.
- Un service qui offre un "petit serveur" (VM) gratuit ou très bon marché,
  où vous contrôlez entièrement le disque (le fichier survit tant que le
  serveur n'est pas supprimé).
- À défaut de stockage disque persistant fiable et gratuit, une alternative
  consiste à sauvegarder régulièrement `data.json` (bouton de sauvegarde
  déjà présent) vers un espace de stockage externe que vous contrôlez.

Dans tous les cas : **testez la persistance vous-même** avant de faire
confiance à l'hébergement pour de vraies données — redémarrez le service et
vérifiez que `data.json` est toujours là.

### Étapes générales de déploiement

1. Créer un dépôt GitHub et y pousser le projet (`data/data.json` et `.env`
   sont exclus automatiquement par `.gitignore`).
2. Sur l'hébergeur choisi, connecter le dépôt GitHub.
3. Configurer les variables d'environnement (`SESSION_SECRET`, `NODE_ENV=production`)
   dans l'interface de l'hébergeur — jamais dans le code.
4. Définir la commande de démarrage : `npm install && npm start`.
5. Une fois déployé, se connecter en SSH/console (si disponible) ou exécuter
   une tâche ponctuelle pour lancer `node create-user.js ...` et créer le
   premier compte admin — sinon personne ne peut se connecter.
6. Vérifier la persistance de `data.json` en redémarrant le service.

### Domaine `.io`

- Un hébergement **gratuit** fournit presque toujours un sous-domaine
  gratuit du type `monapp.nomdelhebergeur.app` — ce n'est **pas** un
  domaine `.io`.
- Un vrai nom de domaine personnalisé en `.io` est un **achat annuel**
  auprès d'un bureau d'enregistrement (une trentaine d'euros par an en
  général, le `.io` étant plus cher que la moyenne des extensions). Il n'y
  a pas de `.io` gratuit légitime.
- Une fois le domaine acheté, il peut être pointé (DNS) vers n'importe quel
  hébergeur, gratuit ou non, qui héberge l'application.

## Tests

```bash
npm test
```

Vérifie le barème de points pour 10, 11, 15, 20 et 21 joueurs, le calcul du
nombre de joueurs ITM, la répartition du bonus, et le cas d'un joueur absent.
