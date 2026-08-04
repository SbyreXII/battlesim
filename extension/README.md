# Extension BattleSim

Extension de navigateur (Chrome, Brave, Edge, et autres navigateurs basés sur Chromium) qui récupère automatiquement le stuff dofusbook.net ouvert dans l'onglet actif et le teste contre un monstre dofensive.com, sans copier-coller.

## Prérequis

Le serveur local BattleSim doit tourner pendant que tu utilises l'extension :

```bash
npm run start
```

L'extension appelle `http://localhost:3000` pour faire les calculs — si le serveur n'est pas lancé, elle affiche une erreur claire te le rappelant.

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

Une fois le stuff et le lien monstre en main, l'extension envoie tout au serveur local (`POST http://localhost:3000/api/simulate`), qui fait tout le travail : récupération des sorts et caractéristiques (DofusDB), calcul des dégâts dans les deux sens, et simulation du combat tour par tour pour déterminer qui gagne. Le popup affiche juste le résultat.

## Permissions demandées

Déclarées dans `manifest.json` :

- **`activeTab` / `scripting`** — pour exécuter le script de récupération dans l'onglet dofusbook.net actif.
- **`tabs`** — pour lire l'URL d'un onglet dofensive.com ouvert (pré-remplissage du lien monstre).
- **`host_permissions`** sur `dofusbook.net` et `localhost:3000` — nécessaires pour que ces appels ne soient pas bloqués par la politique de sécurité du navigateur (CORS).

L'extension ne collecte ni n'envoie aucune donnée ailleurs qu'au serveur local que tu fais tourner toi-même.

## Dépannage

- **Rien ne se passe / erreur "Impossible de contacter le serveur"** → vérifie que `npm run start` tourne bien.
- **Le stuff n'est pas détecté** → assure-toi d'être sur une page dofusbook.net qui contient l'id du stuff dans l'URL (la page du stuff lui-même, pas une liste). Sinon, colle le JSON manuellement.
- **Sous Brave** → si le bouclier ("Shields") bloque quelque chose sans message clair, essaie de le désactiver pour `dofusbook.net` et de vérifier qu'il n'y a pas de restriction sur les connexions à `localhost`.
- **Presse-papier inaccessible** (pour le collage manuel) → le navigateur peut demander une autorisation la première fois ; accepte-la, ou colle avec Ctrl+V directement dans le champ.
