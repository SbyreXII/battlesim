# BattleSim

Prototype d'optimiseur de dégâts Dofus : donne un stuff [dofusbook.net](https://www.dofusbook.net) et un monstre [dofensive.com](https://dofensive.com), l'outil calcule la meilleure rotation de sorts pour le tuer le plus vite possible, s'il vaut le coup de se booster avant d'attaquer, et si le monstre te tue avant que tu ne le tues.

⚠️ **Prototype en cours de vérification.** Certaines valeurs sont encore approximatives — voir [Limites connues](#limites-connues) avant de s'y fier pour de vraies décisions en jeu.

## Fonctionnalités

- Meilleure combinaison de sorts jouable par tour (sous contrainte de PA, de lancers max par tour et par cible)
- Analyse "faut-il se booster avant d'attaquer" (comparaison avec/sans buff)
- Dégâts infligés par le monstre en retour
- Simulation du combat tour par tour dans les deux sens pour déterminer qui gagne
- Trois façons d'utiliser l'outil : site web, bookmarklet, ou [extension navigateur](extension/README.md)

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

### Les PA et PV réels

Le calcul automatique des PA et des PV du joueur est approximatif (voir plus bas). Deux champs optionnels permettent de renseigner les vraies valeurs (visibles sur ta fiche personnage en jeu) pour un résultat fiable.

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

- **PA du joueur** : calculé comme `6 (base) + bonus d'objets`, sans le bonus de monture/familier ni d'éventuelles autres sources — souvent inférieur au vrai total. Utiliser le champ "PA/tour" pour le corriger manuellement.
- **PV du joueur** : approximé par la Vitalité seule (objets + points de caractéristiques), sans les PV de base liés à la classe/au niveau ni le bonus des parchemins — largement sous-estimé. Utiliser le champ "PV réels" pour le corriger.
- **Dégâts Neutre des monstres** : la formule des dégâts de monstre (`dés bruts × (1 + caractéristique/100)`) est vérifiée sur les éléments Terre et Eau, mais pas confirmée pour l'élément Neutre (qui n'a pas de caractéristique associée, comme pour un joueur). Dans la pratique, la plupart des monstres ont leurs 4 caractéristiques égales, ce qui limite l'impact de cette incertitude.
- **Arme du personnage** : pas prise en compte comme option d'attaque, seulement les sorts.
- **Sorts passifs** (ex: Accumulation, Pugilat chez l'Iop) : pas modélisés.
- **Effets conditionnels/cumulatifs** : les sorts dont les dégâts dépendent d'un état de jeu (ex: augmentent à chaque lancer, ou changent de cible) ne comptent que leur valeur de base.
- **Un seul buff à la fois** : l'analyse "faut-il se booster" ne teste jamais la combinaison de plusieurs buffs.
- **Initiative** : la simulation "qui gagne" suppose que le joueur agit toujours en premier — pas de vraie gestion d'ordre de passage.
- **Kite** (Tacle, Fuite, retrait PM/PA, esquive) : pas encore modélisé.

## Développement

```bash
npm run typecheck   # vérifie les types sans compiler
npm run dev          # serveur avec rechargement automatique
```

Les scripts dans `src/cli/` servent à tester le moteur sans passer par l'interface web, ex :

```bash
npx tsx src/cli/test-race.ts
```
