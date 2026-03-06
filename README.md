# Projet Labyrinthe - Refactorisation Complète

## Structure du Projet

```
src/
├── config.js           # Centralisé toutes les constantes
├── Game.js            # Classe principale qui gère le jeu
├── Player.js          # Gestion du joueur (stamina, caméra, etc.)
├── Map.js             # Génération et construction de la carte
├── LightingSystem.js  # Système d'éclairage
├── AudioManager.js    # Gestion des sons
├── UIManager.js       # Interface utilisateur
└── InputController.js # Contrôles clavier/souris
```

## Améliorations Apportées

### 1. Architecture Modulaire

- Code divisé en classes réutilisables
- Responsabilités bien séparées
- Facile à maintenir et déboguer

### 2. Configuration Centralisée

- Toutes les constantes dans `config.js`
- Modification facile des paramètres
- Pas de valeurs codées en dur

### 3. Classe Game

- Orchestre tous les systèmes
- Gère le cycle principal (animate)
- Contrôle l'état du jeu

### 4. Classes Spécialisées

- **Player**: Stamina, camera bob, FOV
- **Map**: Génération, construction, collision
- **LightingSystem**: Flashlight, torche, lumières
- **AudioManager**: Gestion des sons
- **UIManager**: Loading, pause, timer, stamina
- **InputController**: Clavier et souris

## Comment Utiliser

Le jeu fonctionne exactement comme avant, mais avec une meilleure architecture.
Pour modifier des paramètres, éditez simplement `src/config.js`.

## Exemple d'Extension

Pour ajouter une nouvelle fonctionnalité, créez une nouvelle classe:

```javascript
export class EnemySystem {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
  }

  update(time) {
    // Update logic
  }
}
```

Puis ajoutez-la à `Game.js`:

```javascript
this.enemies = new EnemySystem(this.scene);
```

Et appelez-la dans le `animate()`.
