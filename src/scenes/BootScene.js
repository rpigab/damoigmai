import Phaser from 'phaser';
import { generateAllSprites } from '../sprites.js';
import { generateWorldTextures } from '../backgrounds.js';
import { SHIPS } from '../shipState.js';

const BG_CDN = 'https://rpigab.github.io/pixelagen/backgrounds/space/';
const SPACE_LAYERS = ['space_layer0', 'space_layer1', 'space_layer2', 'space_layer3'];

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    generateAllSprites(this);
    generateWorldTextures(this);

    // Ship sprites — CDN; failures handled gracefully in ShipSelectScene / GameScene.
    SHIPS.forEach(ship => this.load.image(ship.key, ship.url));

    // ESPACE background layers — CDN (160×90 PNG, displayed at ×3 via tileScale).
    // Falls back to Phaser missing-texture if CDN unreachable.
    SPACE_LAYERS.forEach(key => this.load.image(`bg_${key}`, `${BG_CDN}${key}.png`));
  }

  create() {
    this.scene.start('MenuScene');
  }
}
