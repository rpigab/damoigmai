import Phaser from 'phaser';
import { generateAllSprites } from '../sprites.js';
import { generateWorldTextures } from '../backgrounds.js';
import { SHIPS } from '../shipState.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    generateAllSprites(this);
    generateWorldTextures(this);

    // Ship sprites — loaded from CDN; failures are handled gracefully in
    // ShipSelectScene (shows a coloured placeholder) and GameScene (falls back
    // to the procedural 'player' sprite).
    SHIPS.forEach(ship => this.load.image(ship.key, ship.url));
  }

  create() {
    this.scene.start('MenuScene');
  }
}
