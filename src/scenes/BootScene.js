import Phaser from 'phaser';
import { generateAllSprites } from '../sprites.js';
import { generateWorldTextures } from '../backgrounds.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    generateAllSprites(this);
    generateWorldTextures(this);
  }

  create() {
    this.scene.start('MenuScene');
  }
}
