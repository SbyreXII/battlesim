# Extension BattleSim

Extension de navigateur (Chrome, Brave, Edge, et autres navigateurs basés sur Chromium) qui récupère automatiquement le stuff dofusbook.net ouvert dans l'onglet actif et le teste contre un monstre dofensive.com, sans copier-coller.

**Autonome : aucun serveur à lancer.** Le moteur de calcul tourne entièrement dans le popup de l'extension (fichier `engine.bundle.js`, déjà généré et versionné dans ce dossier) — il appelle directement l'API ouverte de DofusDB, sans passer par le serveur Node du site.

## Installation

L'extension n'est pas publiée sur le Chrome Web Store : il faut la charger manuellement en mode développeur (2 minutes, à faire une seule fois).

1. Ouvre `chrome://extensions` dans ton navigateur (sous Brave : `brave://extensions`, l'alias `chrome://extensions` fonctionne aussi).
2. Active **"Mode développeur"** (interrupteur en haut à droite de la page).
3. Clique sur **"Charger l'extension non empaquetée"**.
4. Sélectionne le dossier `extension/` de ce projet (celui qui contient `manifest.json`).
5. L'icône BattleSim apparaît dans la barre d'extensions. Épingle-la (icône puzzle 🧩 → épingle) pour y accéder facilement.

## Utilisation

1. Va sur la page de ton stuff sur dofusbook.net.
2. (Optionnel) Ouvre aussi un onglet sur la page du monstre que tu veux tester, sur dofensive.com.
3. Clique sur l'icône de l'extension.
4. Le popup détecte et récupère ton stuff automatiquement. Si un onglet dofensive.com est ouvert, le lien du monstre se pré-remplit aussi.
5. Renseigne tes PV réels (visibles sur ta fiche personnage en jeu) pour un résultat fiable — l'estimation automatique sous-estime fortement, faute de connaître les PV de base classe/niveau et le bonus des parchemins.
6. Clique sur **"Calculer"**.

Si tu n'es pas sur une page dofusbook.net quand tu ouvres le popup, un champ apparaît pour coller le JSON du stuff manuellement (voir le README principal pour comment le récupérer).

## Comment ça marche

### Récupération du stuff

dofusbook.net est protégé par Cloudflare, qui bloque les requêtes automatisées venant d'ailleurs que du navigateur de l'utilisateur — un simple appel serveur ou une extension qui interrogerait directement l'API depuis son propre contexte se ferait rejeter.

L'astuce : l'extension utilise `chrome.scripting.executeScript` pour exécuter un petit script **directement dans l'onglet dofusbook.net ouvert**. Comme ce script tourne dans le contexte de la page elle-même (même origine), il peut appeler l'API interne de dofusbook.net (`/api/stuffs/dofus/public/<id>`) exactement comme le ferait le site lui-même — aucun blocage. Le script récupère l'id du stuff depuis l'URL de l'onglet, fait l'appel, et renvoie le JSON au popup de l'extension.

### Récupération du monstre

Plus simple : dofensive.com n'a pas de protection équivalente, donc l'extension se contente de lire l'URL d'un onglet dofensive.com ouvert (permission `tabs`) et l'envoie telle quelle au serveur, qui décode le lien lui-même.

### Le calcul

Une fois le stuff et le lien monstre en main, le popup appelle directement `runSimulation()`, le même moteur que celui utilisé par le site (récupération des sorts et caractéristiques sur DofusDB, calcul des dégâts dans les deux sens, simulation du combat tour par tour). Ce moteur est écrit en TypeScript dans `src/lib`/`src/engine` à la racine du projet, et **compilé en un seul fichier JavaScript autonome** (`engine.bundle.js`) via [esbuild](https://esbuild.github.io/), pour pouvoir tourner directement dans le popup sans dépendre de Node ni d'un serveur.

Les appels à DofusDB depuis le popup fonctionnent sans blocage CORS grâce à `host_permissions` sur `api.dofusdb.fr` déclaré dans `manifest.json` — les extensions Chrome sont dispensées de la politique CORS classique pour les hôtes qu'elles déclarent explicitement.

### Régénérer `engine.bundle.js`

Nécessaire seulement si tu modifies le moteur de calcul (`src/lib`, `src/engine`) et veux que l'extension reflète le changement :

```bash
npm run build:extension
```

Puis recharge l'extension dans `chrome://extensions` (icône ↻) pour que le popup charge la nouvelle version.

## Permissions demandées

Déclarées dans `manifest.json` :

- **`activeTab` / `scripting`** — pour exécuter le script de récupération dans l'onglet dofusbook.net actif.
- **`tabs`** — pour lire l'URL d'un onglet dofensive.com ouvert (pré-remplissage du lien monstre).
- **`storage`** — pour mémoriser tes overrides (PA/PM/PV) et le dernier monstre testé entre deux ouvertures du popup.
- **`host_permissions`** sur `dofusbook.net` (récupération du stuff, même origine) et `api.dofusdb.fr` (calcul, appelé en direct depuis le popup).

L'extension ne collecte ni n'envoie aucune donnée à un serveur tiers autre que l'API ouverte de DofusDB (sorts, monstres, classes — aucune donnée personnelle).

## Dépannage

- **Le stuff n'est pas détecté** → assure-toi d'être sur une page dofusbook.net qui contient l'id du stuff dans l'URL (la page du stuff lui-même, pas une liste). Sinon, colle le JSON manuellement.
- **Erreur au clic sur "Calculer"** → le message affiché vient directement du moteur (ex: lien monstre invalide, DofusDB indisponible) ; il est normalement assez explicite pour savoir quoi corriger.
- **Sous Brave** → si le bouclier ("Shields") bloque quelque chose sans message clair, essaie de le désactiver pour `dofusbook.net` et `api.dofusdb.fr`.
- **Presse-papier inaccessible** (pour le collage manuel) → le navigateur peut demander une autorisation la première fois ; accepte-la, ou colle avec Ctrl+V directement dans le champ.
- **Après un `git pull`** → si `src/lib`/`src/engine` a changé, régénère le bundle (`npm run build:extension`) et recharge l'extension, sinon elle continue de tourner sur l'ancienne version du moteur.
