import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import ControlsScene from './scenes/ControlsScene.js';
import ShipSelectScene from './scenes/ShipSelectScene.js';
import PauseScene from './scenes/PauseScene.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#00000a',
  pixelArt: true,
  input: { gamepad: true },
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { y: 0 } },
  },
  scene: [BootScene, MenuScene, ControlsScene, ShipSelectScene, GameScene, PauseScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 270,
  },
};

new Phaser.Game(config);
