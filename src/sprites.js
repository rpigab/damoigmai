// Pixel art sprite generator — each cell = 1 logical pixel, drawn at PIXEL_SCALE
import Phaser from 'phaser';
export const PIXEL_SCALE = 3;

const W = 480, H = 270;

// color index 0 = transparent
function drawPixels(scene, key, pixels, palette) {
  const rows = pixels.length;
  const cols = pixels[0].length;
  const g = scene.add.graphics();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = pixels[y][x];
      if (c === 0) continue;
      g.fillStyle(palette[c], 1);
      g.fillRect(x * PIXEL_SCALE, y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
    }
  }
  g.generateTexture(key, cols * PIXEL_SCALE, rows * PIXEL_SCALE);
  g.destroy();
}

// ---------------------------------------------------------------------------
// Player ship — faces right, engines on left
// Palette: 1=dark hull, 2=blue body, 3=cyan highlight, 4=orange engine
const PLAYER_PAL = [0, 0x1a1c2c, 0x3b5dc9, 0x73eff7, 0xff7700];
const PLAYER_PIX = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [4,4,4,4,1,1,2,2,2,2,1,0,0,0,0,0],
  [4,4,4,4,1,2,2,2,2,2,2,2,1,0,0,0],
  [4,4,4,4,2,2,2,3,2,2,2,2,2,2,1,0],
  [4,4,4,4,2,2,2,2,2,2,2,2,2,2,2,3],
  [4,4,4,4,2,2,2,3,2,2,2,2,2,2,1,0],
  [4,4,4,4,1,2,2,2,2,2,2,2,1,0,0,0],
  [4,4,4,4,1,1,2,2,2,2,1,0,0,0,0,0],
  [0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ---------------------------------------------------------------------------
// Enemy 1 — small fast drone, red/orange
// Palette: 1=dark, 2=red body, 3=orange highlight
const ENEMY1_PAL = [0, 0x3d1a00, 0xaa3300, 0xff6622];
const ENEMY1_PIX = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,3,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,3,2,2,2,2,2,2,2,3,0,0,0,0],
  [0,0,3,2,2,2,2,3,2,2,2,2,2,3,0,0],
  [0,3,2,2,2,2,2,2,2,2,2,2,2,2,3,0],
  [0,0,3,2,2,2,2,3,2,2,2,2,2,3,0,0],
  [0,0,0,3,2,2,2,2,2,2,2,3,0,0,0,0],
  [0,0,0,0,0,3,2,2,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,3,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ---------------------------------------------------------------------------
// Enemy 2 — medium sinusoidal, green
// Palette: 1=dark, 2=green body, 3=lime highlight
const ENEMY2_PAL = [0, 0x003300, 0x1a7a1a, 0x55ee55];
const ENEMY2_PIX = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,0,2,2,2,3,3,2,2,2,0,0,0,0],
  [0,0,2,2,2,2,2,2,2,2,2,2,2,2,0,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3],
  [2,2,2,2,2,2,2,3,3,2,2,2,2,2,2,3],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3],
  [0,0,2,2,2,2,2,2,2,2,2,2,2,2,0,0],
  [0,0,0,0,2,2,2,3,3,2,2,2,0,0,0,0],
  [0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ---------------------------------------------------------------------------
// Enemy 3 — large diving ship, purple
// Palette: 1=dark, 2=purple body, 3=pink highlight
const ENEMY3_PAL = [0, 0x2d0066, 0x7700cc, 0xdd44ff];
const ENEMY3_PIX = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0],
  [0,0,0,0,2,2,2,3,3,2,2,2,0,0,0,0],
  [0,0,2,2,2,2,2,3,3,2,2,2,2,2,0,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0],
  [0,0,2,2,2,2,2,3,3,2,2,2,2,2,0,0],
  [0,0,0,0,2,2,2,3,3,2,2,2,0,0,0,0],
  [0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0],
];

// ---------------------------------------------------------------------------
// Bullets — drawn with Phaser Graphics directly (simpler for simple shapes)
function makeBullet1(scene) {
  const g = scene.add.graphics();
  // Machine gun: small yellow bolt
  g.fillStyle(0xffffff); g.fillRect(0, 1, 3, 1);
  g.fillStyle(0xffee00); g.fillRect(3, 0, 9, 3);
  g.fillStyle(0xff8800); g.fillRect(10, 1, 2, 1);
  g.generateTexture('bullet1', 12, 3);
  g.destroy();
}

function makeBullet2(scene) {
  const g = scene.add.graphics();
  // Spread: cyan diamond
  g.fillStyle(0x00ccff);
  g.fillRect(2, 0, 2, 1);
  g.fillRect(1, 1, 4, 1);
  g.fillRect(0, 2, 6, 2);
  g.fillRect(1, 4, 4, 1);
  g.fillRect(2, 5, 2, 1);
  g.fillStyle(0xffffff);
  g.fillRect(2, 2, 1, 2);
  g.generateTexture('bullet2', 6, 6);
  g.destroy();
}

function makeBullet3(scene) {
  const g = scene.add.graphics();
  // Power: large orange plasma orb
  g.fillStyle(0xff4400);
  g.fillEllipse(7, 5, 14, 10);
  g.fillStyle(0xff8800);
  g.fillEllipse(6, 5, 10, 7);
  g.fillStyle(0xffdd00);
  g.fillEllipse(4, 4, 6, 5);
  g.generateTexture('bullet3', 14, 10);
  g.destroy();
}

function makeEnemyBullet(scene) {
  const g = scene.add.graphics();
  g.fillStyle(0xff2222);
  g.fillRect(1, 0, 2, 1);
  g.fillRect(0, 1, 4, 2);
  g.fillRect(1, 3, 2, 1);
  g.generateTexture('enemyBullet', 4, 4);
  g.destroy();
}

// ---------------------------------------------------------------------------
// Star background — tiled scrolling texture
function makeStarTexture(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['damoigmai-stars']);
  const g = scene.add.graphics();
  for (let i = 0; i < 120; i++) {
    const x = rng.integerInRange(0, W - 1);
    const y = rng.integerInRange(0, H - 1);
    const bright = rng.integerInRange(80, 255);
    const size = rng.integerInRange(0, 5) === 0 ? 2 : 1;
    const col = (bright << 16) | (bright << 8) | bright;
    g.fillStyle(col, 1);
    g.fillRect(x, y, size, size);
  }
  // Occasional colored stars
  for (let i = 0; i < 8; i++) {
    const x = rng.integerInRange(0, W - 1);
    const y = rng.integerInRange(0, H - 1);
    g.fillStyle(rng.pick([0xaaccff, 0xffaaaa, 0xffffaa]), 0.8);
    g.fillRect(x, y, 2, 2);
  }
  g.generateTexture('stars', W, H);
  g.destroy();
}

// ---------------------------------------------------------------------------
export function generateAllSprites(scene) {
  drawPixels(scene, 'player',  PLAYER_PIX,  PLAYER_PAL);
  drawPixels(scene, 'enemy1',  ENEMY1_PIX,  ENEMY1_PAL);
  drawPixels(scene, 'enemy2',  ENEMY2_PIX,  ENEMY2_PAL);
  drawPixels(scene, 'enemy3',  ENEMY3_PIX,  ENEMY3_PAL);
  makeBullet1(scene);
  makeBullet2(scene);
  makeBullet3(scene);
  makeEnemyBullet(scene);
  makeStarTexture(scene);
}
