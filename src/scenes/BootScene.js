import Phaser from 'phaser';
import { generateAllSprites } from '../sprites.js';
import { generateBossSprites } from '../bosses.js';
import { generateWorldTextures } from '../backgrounds.js';
import { SHIPS } from '../shipState.js';

const BG_LAYERS = [
  ['space/space_layer0',     'bg_space_layer0'],
  ['space/space_layer1',     'bg_space_layer1'],
  ['space/space_layer2',     'bg_space_layer2'],
  ['space/space_layer3',     'bg_space_layer3'],
  ['desert/desert_layer0',   'bg_desert_layer0'],
  ['desert/desert_layer1',   'bg_desert_layer1'],
  ['ocean/ocean_layer0',     'bg_ocean_layer0'],
  ['ocean/ocean_layer1',     'bg_ocean_layer1'],
  ['snow/snow_layer0',       'bg_snow_layer0'],
  ['snow/snow_layer1',       'bg_snow_layer1'],
  ['forest/forest_layer0',   'bg_forest_layer0'],
  ['forest/forest_layer1',   'bg_forest_layer1'],
  ['city/city_layer0',       'bg_city_layer0'],
  ['city/city_layer1',       'bg_city_layer1'],
  ['techno/techno_layer0',   'bg_techno_layer0'],
  ['techno/techno_layer1',   'bg_techno_layer1'],
  ['abstract/abstract_layer0', 'bg_abstract_layer0'],
  ['abstract/abstract_layer1', 'bg_abstract_layer1'],
];

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    generateAllSprites(this);
    generateBossSprites(this);
    generateWorldTextures(this);

    SHIPS.forEach(ship => this.load.image(ship.key, ship.url));

    BG_LAYERS.forEach(([path, key]) => this.load.image(key, `assets/backgrounds/${path}.png`));

    this.load.image('pu_spread', 'assets/other/powerup_spread.png');
    this.load.image('pu_plasma', 'assets/other/powerup_plasma.png');
  }

  create() {
    this.scene.start('MenuScene');
  }
}
