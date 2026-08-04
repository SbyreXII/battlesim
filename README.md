# BattleSim

Prototype d'optimiseur de dégâts Dofus : donne un stuff [dofusbook.net](https://www.dofusbook.net) et un monstre [dofensive.com](https://dofensive.com), l'outil calcule la meilleure rotation de sorts pour le tuer le plus vite possible, s'il vaut le coup de se booster avant d'attaquer, et si le monstre te tue avant que tu ne le tues.

⚠️ **Prototype en cours de vérification.** Certaines valeurs sont encore approximatives — voir [Limites connues](#limites-connues) avant de s'y fier pour de vraies décisions en jeu.

## Fonctionnalités

- Meilleure combinaison de sorts jouable par tour (sous contrainte de PA, de lancers max par tour et par cible)
- Analyse "faut-il se booster avant d'attaquer" (comparaison avec/sans buff)
- Dégâts infligés par le monstre en retour
- Simulation du combat tour par tour dans les deux sens pour déterminer qui gagne
- Trois façons d'utiliser l'outil : site web, bookmarklet, ou [extension navigateur](extension/README.md) (celle-ci est autonome — pas besoin de lancer le serveur)
- Transparence sur les effets d'objets et les sorts non pris en compte dans le calcul (aide à comprendre les écarts avec tes vraies stats)
- Derniers inputs mémorisés automatiquement (site : stuff/monstre/overrides ; extension : overrides + dernier monstre testé) pour ne pas tout recoller à chaque test
- Requêtes DofusDB mises en cache et réessayées automatiquement en cas d'erreur transitoire, pour des calculs plus rapides et plus fiables

## Installation

```bash
npm install
npm run start
```

Puis ouvre [http://localhost:3000](http://localhost:3000).

## Utilisation

### Le monstre

Colle simplement un lien de monstre dofensive.com (ex : `https://dofensive.com/fr/monster/2819?q=...`).

### Le stuff

dofusbook.net est protégé par Cloudflare, qui bloque les requêtes automatisées — impossible de simplement coller un lien de stuff et le laisser récupérer tout seul côté serveur. Trois façons de contourner ça, toutes basées sur le même principe (faire la requête depuis un contexte que dofusbook.net reconnaît comme légitime, pas depuis un serveur tiers) :

1. **Bookmarklet** (le plus simple) : sur la page d'accueil du site, glisse le bouton "📋 Copier mon stuff" dans ta barre de favoris. Va sur ta page de stuff dofusbook.net, clique dessus, reviens sur BattleSim et clique sur "Coller depuis le presse-papier".
2. **Extension navigateur** : automatise complètement l'étape ci-dessus. Voir [extension/README.md](extension/README.md).
3. **Manuel** : ouvre `https://www.dofusbook.net/api/stuffs/dofus/public/<id-du-stuff>` dans ton navigateur (l'id est dans l'URL ou le slug de ton stuff), copie le JSON affiché, colle-le dans le champ prévu.

### Les PA, PM et PV réels

Le calcul automatique des PA, PM et PV du joueur est approximatif (voir plus bas). Trois champs optionnels permettent de renseigner les vraies valeurs (visibles sur ta fiche personnage en jeu) pour un résultat fiable.

Astuce : si le titre de ton stuff suit le format "... 12 PA / 5 PM ..." (convention courante sur dofusbook.net), l'outil l'affiche à titre indicatif et prévient si ça ne correspond pas au calcul automatique. Ce n'est qu'un texte libre tapé par le créateur du stuff — ni calculé ni vérifié par dofusbook — donc à utiliser comme recoupement, pas comme source fiable en cas de désaccord.

## Structure du projet

```
src/
  lib/           # Parsing (dofusbook, dofensive), stats du personnage, accès DofusDB
  engine/        # Formule de dégâts et optimiseur (moteur pur, sans dépendance réseau)
  server/        # API Express (POST /api/simulate)
  cli/           # Scripts de test/démo en ligne de commande
public/          # Site web (HTML/JS/CSS vanilla, servi par le serveur Express)
extension/       # Extension navigateur (voir son propre README)
fixtures/        # Stuff d'exemple utilisé par "Charger un exemple"
```

Aucune base de données ni compte : tout est calculé à la volée à partir de trois sources externes :
- [DofusDB](https://dofusdb.fr) (API ouverte) pour les sorts, monstres et classes
- dofusbook.net pour le stuff du joueur (via bookmarklet/extension, cf. ci-dessus)
- dofensive.com pour l'identification du monstre et de ses buffs

## Limites connues

Le moteur de dégâts a été vérifié empiriquement (comparaison avec les valeurs affichées par dofensive.com), mais plusieurs approximations restent en place :

- **PA/PM du joueur** : calculés comme `base stricte (6 PA / 3 PM) + bonus d'objets + bonus de familier/monture (stuffFm.fm)`. Ce sont les 3 seules sources de PA/PM que dofusbook connaît lui-même (il n'a aucune information sur les quêtes de récompense du compte) — formule vérifiée exacte sur deux stuffs réels différents. Utiliser le champ "PA/tour" pour corriger si un familier non standard ou une quête spécifique change la donne.
- **PV du joueur** : approximé par la Vitalité seule (objets + points de caractéristiques), sans les PV de base liés à la classe/au niveau — sous-estimé (vérifié : ~2930 calculé contre ~3250 affiché par dofusbook sur le même stuff Enutrof, donc encore ~300+ manquants, sans compter d'éventuels PV de base supplémentaires). Utiliser le champ "PV réels" pour corriger.
- **Dégâts Neutre des monstres** : la formule des dégâts de monstre (`dés bruts × (1 + caractéristique/100)`) est vérifiée sur les éléments Terre et Eau, mais pas confirmée pour l'élément Neutre (qui n'a pas de caractéristique associée, comme pour un joueur). Dans la pratique, la plupart des monstres ont leurs 4 caractéristiques égales, ce qui limite l'impact de cette incertitude.
- **Arme** : prise en compte comme option d'attaque, mais élément Neutre par défaut (pas de donnée d'élément d'arme disponible côté dofusbook) et pas de jet critique séparé.
- **Effets conditionnels/cumulatifs** : les sorts dont les dégâts dépendent d'un état de jeu (ex: augmentent à chaque lancer, ou changent de cible) ne comptent que leur valeur de base. Ça inclut ce qu'on appelle parfois "sorts passifs" (ex: Accumulation, Pugilat chez l'Iop) — recherché spécifiquement, et il s'avère que ce ne sont pas de simples bonus fixes toujours actifs mais des mécaniques de stack conditionnelles ("lancer un sort augmente les dégâts, l'effet se dissipe après avoir infligé des dégâts") : même catégorie de limite que les sorts à effet cumulatif, pas un système séparé à ajouter.
- **Combinaisons de buffs** : testées (tous les sous-ensembles), mais la durée du groupe est simplifiée au minimum des durées individuelles — après l'expiration du premier buff du groupe, on repasse directement à "sans buff" plutôt que de ne retirer que celui-là.
- **Initiative** : la simulation "qui gagne" suppose que le joueur agit toujours en premier — pas de vraie gestion d'ordre de passage.
- **Kite** : estimation très simplifiée, faute de tout modèle positionnel (pas de grille, pas de ligne de vue). Le kite est jugé "possible" si le joueur a un sort à portée > 1 et au moins autant de PM que le monstre ; si oui, on suppose qu'il évite tous les sorts de mêlée (portée ≤ 1) du monstre pour le reste du combat. La vraie chance d'y arriver dépend du Tacle du monstre contre la Fuite du joueur, dont la formule officielle n'est pas connue ici — donc optimiste si le monstre a un gros Tacle.

## Développement

```bash
npm run typecheck   # vérifie les types sans compiler
npm test             # tests unitaires (node --test)
npm run dev          # serveur avec rechargement automatique
```

Les scripts dans `src/cli/` servent à tester le moteur sans passer par l'interface web, ex :

```bash
npx tsx src/cli/test-race.ts
```
