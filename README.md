# PokeSmash — dépôt d'hébergement

Jeu de combat de plateforme façon Smash Bros (fan game non officiel, sans but lucratif) avec **comptes**, **sauvegarde de la progression**, **amis**, **invitations** et **salons en ligne**.

```
public/index.html        ← le jeu (un seul fichier) + manifest et service worker (application installable, hors-ligne)
server.js                ← petit serveur sans dépendance : sert le jeu + comptes + amis + salons + sauvegarde sur GitHub
render.yaml              ← réglages de déploiement automatique sur Render (gratuit)
src/                     ← sources du jeu en morceaux (facultatif, pour les curieux)
test/                    ← tests automatiques du serveur (npm test)
```

## Comment ça marche (en 4 lignes)

1. **Render** (hébergeur gratuit) fait tourner `server.js` : il sert le jeu **et** gère comptes, amis, invitations, salons publics.
2. Chaque modification (progression, amis, comptes) est enregistrée sur le serveur, puis **copiée automatiquement toutes les ~20 s dans un dépôt GitHub privé** (`db.json`). C'est votre « fichier de sauvegarde » : chaque version reste dans l'historique des commits.
3. Si Render redémarre (ça arrive), le serveur **recharge tout depuis GitHub** : rien n'est perdu.
4. Les combats en ligne passent directement de joueur à joueur (WebRTC via PeerJS) ; le serveur ne fait que présenter les amis et les salons.

> **Pourquoi pas GitHub seul ?** GitHub Pages ne sait qu'afficher des fichiers : il ne peut ni vérifier un mot de passe ni écrire des données. Et mettre un jeton GitHub dans `index.html` donnerait l'accès à tout le monde. Le petit serveur garde donc le jeton **secret**, côté Render.

---

## Tutoriel pas à pas (sans ligne de commande)

### Étape 1 — Mettre le projet sur GitHub
1. Sur github.com → **New repository** → nom `pokesmash` → *Create*.
2. **Add file → Upload files** : glissez **tout le contenu de ce dossier** (dossiers `public`, `src`, `test`, `.github` + fichiers `server.js`, `package.json`, `render.yaml`, `README.md`, `.gitignore`, `.env.example`) → *Commit changes*.
   *(Si vous aviez déjà un `index.html` à la racine, supprimez-le : le jeu est maintenant dans `public/index.html`.)*

### Étape 2 — Créer le dépôt qui contiendra les sauvegardes (privé !)
1. **New repository** → nom `pokesmash-data` → cochez **Private** → cochez *Add a README* → *Create*.
2. Il contiendra un fichier `db.json` (comptes + progression). **Il doit rester privé** : il contient les empreintes (hachées, non lisibles) des mots de passe.

### Étape 3 — Créer le jeton d'accès GitHub (limité à ce seul dépôt)
1. GitHub → votre photo → **Settings** → tout en bas **Developer settings** → **Personal access tokens → Fine-grained tokens → Generate new token**.
2. *Token name* : `pokesmash` · *Expiration* : 1 an (ou plus) · *Repository access* : **Only select repositories → `pokesmash-data`**.
3. *Permissions → Repository permissions → **Contents : Read and write*** (rien d'autre).
4. **Generate token** puis **copiez-le** (il commence par `github_pat_…`, il ne sera plus affiché).

### Étape 4 — Héberger sur Render (gratuit)
1. Sur render.com → *Get started* → **Sign in with GitHub** → autorisez l'accès au dépôt `pokesmash`.
2. **New + → Blueprint** → choisissez `pokesmash` (Render lit `render.yaml`).
   *(Ou **New + → Web Service** : Runtime **Node**, Build Command `echo ok`, Start Command `node server.js`, plan **Free**.)*
3. Renseignez les variables d'environnement :
   | Nom | Valeur |
   |---|---|
   | `GH_TOKEN` | le jeton de l'étape 3 |
   | `GH_REPO` | `votrepseudo/pokesmash-data` |
   | `GH_BRANCH` | `main` |
4. **Deploy**. Au bout d'1–2 minutes, Render donne une adresse du type **`https://pokesmash.onrender.com`**. Ouvrez-la : c'est votre jeu !

### Étape 5 — Vérifier
1. Dans le jeu : **☁️ Compte & amis → Créer un compte**. Jouez un combat.
2. Après ~30 secondes, ouvrez le dépôt `pokesmash-data` : un fichier **`db.json`** est apparu (et un nouveau commit « sauvegarde auto » à chaque changement).
3. Pour jouer avec un ami : il crée son compte, vous l'ajoutez par son pseudo (**Amis → Ajouter**), il accepte. Ensuite : *En ligne → Héberger un salon → 📨 Inviter un ami* → une notification « Rejoindre » apparaît chez lui (dans les 15 s).
4. Sur téléphone : ouvrez l'adresse dans Chrome → menu ⋮ → **Installer l'application** (plein écran, fonctionne hors-ligne pour les sprites déjà vus ; *Paramètres → Réseau → Précharger* télécharge les Pokémon à l'avance).

### Mettre à jour le jeu plus tard
Remplacez simplement `public/index.html` dans GitHub (*Add file → Upload files*, même nom) : Render redéploie tout seul. **Les comptes et sauvegardes ne sont pas touchés** (ils sont dans l'autre dépôt).

---

## À savoir

- **Plan gratuit Render** : le serveur s'endort après ~15 min sans visite ; la première ouverture prend 30–60 s. Pour l'éviter : un moniteur gratuit (ex. UptimeRobot) qui appelle `https://…onrender.com/api/health` toutes les 5 min. Les données ne sont jamais perdues (elles sont sur GitHub).
- **Plusieurs appareils** : connectez-vous avec le même compte, la progression se fusionne (le meilleur score/compteur l'emporte, les succès s'additionnent).
- **Fichier de sauvegarde manuel** : *Compte & amis → 💾 Exporter* télécharge un `.json` (utile aussi sans compte) ; *Importer* le fusionne dans une autre installation.
- **Mots de passe** : jamais stockés en clair (hachage `scrypt` + sel). Pas de récupération par e-mail : un mot de passe perdu = compte à recréer (ou suppression manuelle de l'entrée dans `db.json`).
- **Limites** : ~16 caractères de pseudo, 450 Ko de sauvegarde par joueur, anti-abus intégré (création de comptes et tentatives limitées). Conçu pour une communauté d'amis (quelques centaines de comptes).
- **Combats en ligne** : certaines connexions (réseaux d'entreprise, 4G très restrictive) bloquent le pair-à-pair ; il faudrait alors un serveur TURN (non inclus).
- **Autre hébergement du jeu** (GitHub Pages) : activez `Settings → Pages → GitHub Actions` (workflow fourni), puis écrivez l'adresse Render dans `window.POKESMASH_SERVER = '…'` en haut de `public/index.html`. Le serveur autorise déjà les appels depuis un autre site.
- **Tester chez soi** : `node server.js` (Node 18+, rien à installer) puis http://localhost:3000 ; `npm test` lance les tests du serveur.

## Crédits et licences
Fait par **Mathieu Owen**. Sprites : *PMDCollab SpriteCollab* (CC BY-NC 4.0, usage non commercial, chargés à l'exécution depuis leur dépôt). Pokémon © Nintendo / Game Freak / Creatures : projet de fan sans but lucratif, non affilié. Multijoueur : PeerJS.
