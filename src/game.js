import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#00000a',
  pixelArt: true,
  input: { gamepad: true },
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { y: 0 } },
  },
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 270,
  },
};

new Phaser.Game(config);
