# DAMOIGMAI

Shoot'em up 2D à défilement horizontal, en pixel art, propulsé par
[Phaser 4](https://phaser.io/). Tout est **généré par code** — sprites, fonds
parallaxes, bruitages **et** musiques chiptune : aucun fichier d'asset binaire.

## Modes de jeu

- **Histoire** — 8 mondes successifs (ESPACE, DÉSERT, OCÉAN, NEIGE, FORÊT,
  VILLE, TECHNO, ABSTRAIT), chacun avec son ambiance et sa musique 8-bit. Les
  armes et les clones accumulés sont conservés d'un monde à l'autre.
- **Endless** — vagues infinies de difficulté croissante, avec tableau des
  meilleurs scores enregistré localement.

Chaque monde possède sa propre boucle musicale chiptune (mélodie + basse en
ondes carrée/triangle), générée en temps réel via la Web Audio API.

## Armes & clones

- **Gatling** (munitions infinies), **Spread** et **Plasma** (munitions
  limitées) ramassés en éliminant des groupes d'ennemis. Les armes s'empilent.
- **Clones** : sacrifiez 2 armes de la pile pour invoquer un clone (max 2). Le
  premier clone est pilotable indépendamment ; avec 2 clones, sacrifiez-les
  pour gagner une vie ou déclencher une bombe d'écran.

## Lancer le jeu

```bash
npm install
npm run dev      # serveur de développement (Vite)
npm run build    # build de production dans dist/
```

Puis ouvrez l'URL indiquée par Vite dans un navigateur.

## Contrôles

### Manette (compatible Xbox / standard gamepad)

| Commande                         | Action                                   |
| -------------------------------- | ---------------------------------------- |
| **Stick gauche** / **Croix**     | Déplacer le vaisseau                      |
| **RT** (gâchette droite)         | Tirer                                     |
| **Stick droit**                  | Déplacer le clone pilotable               |
| **Y**                            | Invoquer un clone (coûte 2 armes)         |
| **LB**                           | Sacrifier les 2 clones → +1 vie           |
| **RB**                           | Sacrifier les 2 clones → bombe d'écran    |
| **Start**                        | Pause                                     |
| **Select / Back**                | Plein écran                               |
| **A / B**                        | Valider / retour sur les écrans de fin    |

> Le bouton **A ne tire plus** : seule la gâchette **RT** déclenche le tir.

### Clavier

Les touches sont liées à leur **position physique**, pas au caractère imprimé :
le cluster **ZQSD** d'un clavier **AZERTY** correspond exactement aux mêmes
touches physiques que **WASD** sur un **QWERTY**. Aucune configuration n'est
nécessaire, quelle que soit la disposition du clavier.

| Commande                | Touches                          |
| ----------------------- | -------------------------------- |
| Déplacer le vaisseau    | **ZQSD** / **WASD** / **Flèches**|
| Tirer                   | **Espace**                       |
| Invoquer un clone       | **A** (AZERTY) / **Q** (QWERTY)  |
| Déplacer le clone       | **I J K L**                      |
| Pause                   | **Échap**                        |
| Rejouer (game over)     | **Espace** / **Entrée**          |
| Retour menu (game over) | **Échap**                        |

Un écran **Contrôles** (accessible depuis le menu principal) affiche un schéma
de la manette ainsi que la liste des touches clavier.

## Pause

Appuyez sur **Start** (manette) ou **Échap** (clavier) en cours de partie pour
ouvrir le menu pause : **Reprendre** la partie ou revenir au **Menu principal**
(la progression de la partie en cours est alors perdue).

## Structure du projet

```
src/
  game.js                 configuration Phaser et enregistrement des scènes
  input.js                clavier indépendant de la disposition (event.code)
  audio.js                bruitages synthétisés (Web Audio API)
  music.js                moteur chiptune + thèmes par monde
  sprites.js              génération des sprites pixel art
  backgrounds.js          génération des fonds parallaxes par monde
  scenes/
    BootScene.js          préchargement / génération des textures
    MenuScene.js          menu principal
    ControlsScene.js      écran d'aide (manette + clavier)
    GameScene.js          boucle de jeu
    PauseScene.js         menu pause superposé
```
