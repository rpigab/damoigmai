import Phaser from 'phaser';

const W = 480, H = 270;

export const WORLD_NAMES = [
  'ESPACE', 'DÉSERT', 'OCÉAN', 'NEIGE', 'FORÊT', 'VILLE', 'TECHNO', 'ABSTRAIT',
];

export const WORLD_BG_COLORS = [
  0x00000a, 0x120800, 0x000818, 0x060c18, 0x020602, 0x040406, 0x000c0c, 0x060008,
];

// Parallax configs per world.
// Each entry: [textureKey, scrollSpeedX, opts?]
// opts.depth    — explicit depth (default = layer index)
// opts.tileScale — applied to tileSprite when texture is smaller than canvas
//                  (CDN 160×90 layers need tileScale:3 to fill 480×270 at PIXEL_SCALE=3)
const WORLD_CFGS = [
  // ESPACE — 4 CDN layers (160×90, tileScale:3). speedX already ÷3 vs full-size textures.
  [
    ['bg_space_layer0', 0.08, { depth: 0,  tileScale: 3 }],  // deep space, opaque
    ['bg_space_layer1', 0.12, { depth: 1,  tileScale: 3 }],  // nebula wash
    ['bg_space_layer2', 0.20, { depth: 2,  tileScale: 3 }],  // mid stars
    ['bg_space_layer3', 0.33, { depth: 12, tileScale: 3 }],  // foreground — above enemies (depth 9)
  ],
  [['bg_desert_far', 0.2], ['bg_desert_near', 0.7]],
  [['bg_ocean_far', 0.15], ['bg_ocean_near', 0.55]],
  [['bg_snow_far', 0.2], ['bg_snow_near', 0.65]],
  [['bg_forest_far', 0.2], ['bg_forest_near', 0.8]],
  [['bg_city_far', 0.15], ['bg_city_near', 0.7]],
  [['bg_techno_far', 0.3], ['bg_techno_near', 0.7]],
  [['bg_abstract_far', 0.25], ['bg_abstract_near', 0.65]],
];

export function createWorldBackground(scene, worldIndex) {
  return WORLD_CFGS[worldIndex].map(([key, speedX, opts = {}], i) => {
    const depth = opts.depth ?? i;
    const sprite = scene.add.tileSprite(0, 0, W, H, key).setOrigin(0, 0).setDepth(depth);
    if (opts.tileScale) sprite.setTileScale(opts.tileScale);
    return { sprite, speedX };
  });
}

export function generateWorldTextures(scene) {
  // makeSpaceLayers removed — ESPACE now uses CDN PNGs loaded in BootScene.
  makeDesertLayers(scene);
  makeOceanLayers(scene);
  makeSnowLayers(scene);
  makeForestLayers(scene);
  makeCityLayers(scene);
  makeTechnoLayers(scene);
  makeAbstractLayers(scene);
}

// ---- DÉSERT ----
function makeDesertLayers(scene) {
  const r1 = new Phaser.Math.RandomDataGenerator(['desert-far']);
  let g = scene.add.graphics();
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const r = Math.floor(0x12 + t * (0x8a - 0x12));
    const gr = Math.floor(0x06 + t * (0x54 - 0x06));
    const b = Math.floor(t * 0x08);
    g.fillStyle((r << 16) | (gr << 8) | b, 1);
    g.fillRect(0, y, W, 1);
  }
  g.fillStyle(0x8a5420, 1);
  for (let i = 0; i < 6; i++) {
    const cx = r1.integerInRange(0, W), w = r1.integerInRange(80, 180), h = r1.integerInRange(18, 45);
    g.fillEllipse(cx, H - h * 0.4, w, h);
  }
  g.generateTexture('bg_desert_far', W, H);
  g.destroy();

  const r2 = new Phaser.Math.RandomDataGenerator(['desert-near']);
  g = scene.add.graphics();
  g.fillStyle(0x5c3010, 1);
  for (let i = 0; i < 9; i++) {
    const cx = r2.integerInRange(0, W), w = r2.integerInRange(40, 110), h = r2.integerInRange(30, 80);
    g.fillEllipse(cx, H - h * 0.35, w, h);
  }
  for (let i = 0; i < 6; i++) {
    const rx = r2.integerInRange(0, W), rh = r2.integerInRange(40, 90), rw = r2.integerInRange(8, 22);
    g.fillStyle(0x3e1e06, 1);
    g.fillRect(rx - rw / 2, H - rh, rw, rh);
    g.fillTriangle(rx - rw / 2 - 5, H - rh, rx + rw / 2 + 5, H - rh, rx, H - rh - 18);
  }
  g.generateTexture('bg_desert_near', W, H);
  g.destroy();
}

// ---- OCÉAN ----
function makeOceanLayers(scene) {
  const r1 = new Phaser.Math.RandomDataGenerator(['ocean-far']);
  let g = scene.add.graphics();
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const gr = Math.floor(0x08 + t * 0x1a);
    const b = Math.floor(0x18 + t * (0x62 - 0x18));
    g.fillStyle((gr << 8) | b, 1);
    g.fillRect(0, y, W, 1);
  }
  for (let i = 0; i < 5; i++) {
    const wy = r1.integerInRange(H * 0.3, H - 30);
    g.lineStyle(1, 0x1a5580, 0.35);
    g.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const wave = Math.sin(x * 0.04 + i * 1.7) * 4;
      x === 0 ? g.moveTo(x, wy + wave) : g.lineTo(x, wy + wave);
    }
    g.strokePath();
  }
  g.generateTexture('bg_ocean_far', W, H);
  g.destroy();

  const r2 = new Phaser.Math.RandomDataGenerator(['ocean-near']);
  g = scene.add.graphics();
  for (let i = 0; i < 4; i++) {
    const wy = r2.integerInRange(H * 0.4, H - 20);
    const amp = r2.integerInRange(6, 14);
    g.lineStyle(2, 0x88ddff, 0.45 - i * 0.07);
    g.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const wave = Math.sin(x * 0.03 + i * 1.4) * amp;
      x === 0 ? g.moveTo(x, wy + wave) : g.lineTo(x, wy + wave);
    }
    g.strokePath();
  }
  for (let i = 0; i < 18; i++) {
    const bx = r2.integerInRange(0, W), by = r2.integerInRange(H * 0.4, H);
    g.fillStyle(0x44aacc, 0.25);
    g.fillCircle(bx, by, r2.integerInRange(1, 4));
  }
  g.generateTexture('bg_ocean_near', W, H);
  g.destroy();
}

// ---- NEIGE ----
function makeSnowLayers(scene) {
  const r1 = new Phaser.Math.RandomDataGenerator(['snow-far']);
  let g = scene.add.graphics();
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const r = Math.floor(0x06 + t * 0x18);
    const gr = Math.floor(0x0c + t * 0x28);
    const b = Math.floor(0x18 + t * 0x50);
    g.fillStyle((r << 16) | (gr << 8) | b, 1);
    g.fillRect(0, y, W, 1);
  }
  for (let i = 0; i < 85; i++) {
    const x = r1.integerInRange(0, W - 1), y = r1.integerInRange(0, H - 1);
    const b = r1.integerInRange(160, 240);
    g.fillStyle((b << 16) | (b << 8) | 0xff, 0.55);
    g.fillRect(x, y, 1, 1);
  }
  g.generateTexture('bg_snow_far', W, H);
  g.destroy();

  const r2 = new Phaser.Math.RandomDataGenerator(['snow-near']);
  g = scene.add.graphics();
  for (let i = 0; i < 40; i++) {
    const x = r2.integerInRange(0, W - 1), y = r2.integerInRange(0, H - 1);
    g.fillStyle(0xddeeff, 0.65);
    g.fillRect(x - 1, y, 3, 1);
    g.fillRect(x, y - 1, 1, 3);
    g.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 12; i++) {
    const ix = r2.integerInRange(0, W), ih = r2.integerInRange(20, 65), iw = r2.integerInRange(4, 14);
    g.fillStyle(0x88aacc, 0.5);
    g.fillTriangle(ix - iw / 2, H, ix + iw / 2, H, ix, H - ih);
  }
  g.generateTexture('bg_snow_near', W, H);
  g.destroy();
}

// ---- FORÊT ----
function makeForestLayers(scene) {
  const r1 = new Phaser.Math.RandomDataGenerator(['forest-far']);
  let g = scene.add.graphics();
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const r = Math.floor(0x01 + t * 0x05);
    const gr = Math.floor(0x06 + t * 0x12);
    const b = Math.floor(0x01 + t * 0x04);
    g.fillStyle((r << 16) | (gr << 8) | b, 1);
    g.fillRect(0, y, W, 1);
  }
  g.fillStyle(0x0a2a0a, 1);
  for (let i = 0; i < 20; i++) {
    const tx = r1.integerInRange(0, W), th = r1.integerInRange(40, 90), tw = r1.integerInRange(20, 40);
    g.fillTriangle(tx - tw / 2, H, tx + tw / 2, H, tx, H - th);
    g.fillRect(tx - 3, H - 18, 6, 18);
  }
  g.generateTexture('bg_forest_far', W, H);
  g.destroy();

  const r2 = new Phaser.Math.RandomDataGenerator(['forest-near']);
  g = scene.add.graphics();
  for (let i = 0; i < 11; i++) {
    const tx = r2.integerInRange(0, W), th = r2.integerInRange(80, 170), tw = r2.integerInRange(40, 75);
    g.fillStyle(0x051405, 1);
    g.fillTriangle(tx - tw / 2, H, tx + tw / 2, H, tx, H - th);
    g.fillTriangle(tx - tw * 0.38, H - th * 0.38, tx + tw * 0.38, H - th * 0.38, tx, H - th - th * 0.28);
    g.fillStyle(0x030e03, 1);
    g.fillRect(tx - 4, H - 28, 8, 28);
  }
  g.generateTexture('bg_forest_near', W, H);
  g.destroy();
}

// ---- VILLE ----
function makeCityLayers(scene) {
  const r1 = new Phaser.Math.RandomDataGenerator(['city-far']);
  let g = scene.add.graphics();
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const v = Math.floor(0x04 + t * 0x0a);
    g.fillStyle((v << 16) | (v << 8) | (v + 6), 1);
    g.fillRect(0, y, W, 1);
  }
  g.fillStyle(0x331a00, 0.18);
  g.fillRect(0, H * 0.55, W, H * 0.45);
  let bx = 0;
  while (bx < W) {
    const bw = r1.integerInRange(22, 52), bh = r1.integerInRange(30, 110);
    g.fillStyle(0x0a0a0f, 1);
    g.fillRect(bx, H - bh, bw - 2, bh);
    for (let wy = H - bh + 4; wy < H - 4; wy += 7) {
      for (let wx = bx + 3; wx < bx + bw - 4; wx += 6) {
        if (r1.integerInRange(0, 2) !== 0) {
          g.fillStyle(0xffee88, 0.55);
          g.fillRect(wx, wy, 3, 4);
        }
      }
    }
    bx += bw;
  }
  g.generateTexture('bg_city_far', W, H);
  g.destroy();

  const r2 = new Phaser.Math.RandomDataGenerator(['city-near']);
  g = scene.add.graphics();
  bx = 0;
  while (bx < W) {
    const bw = r2.integerInRange(30, 72), bh = r2.integerInRange(80, H);
    g.fillStyle(0x050508, 1);
    g.fillRect(bx, H - bh, bw - 3, bh);
    if (r2.integerInRange(0, 1) === 0) {
      g.fillStyle(0x080810, 1);
      g.fillRect(bx + bw / 2 - 1, H - bh - 16, 2, 16);
      g.fillStyle(0xff2222, 0.75);
      g.fillCircle(bx + bw / 2, H - bh - 18, 2);
    }
    for (let wy = H - bh + 6; wy < H - 6; wy += 9) {
      for (let wx = bx + 4; wx < bx + bw - 6; wx += 8) {
        if (r2.integerInRange(0, 3) !== 0) {
          const lit = r2.integerInRange(0, 2) !== 0;
          g.fillStyle(lit ? 0xffee88 : 0x111118, lit ? 0.65 : 1);
          g.fillRect(wx, wy, 4, 5);
        }
      }
    }
    bx += bw;
  }
  g.generateTexture('bg_city_near', W, H);
  g.destroy();
}

// ---- TECHNO ----
function makeTechnoLayers(scene) {
  const r1 = new Phaser.Math.RandomDataGenerator(['techno-far']);
  let g = scene.add.graphics();
  g.fillStyle(0x000c0c, 1);
  g.fillRect(0, 0, W, H);
  g.lineStyle(1, 0x003333, 0.35);
  for (let x = 0; x < W; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.strokePath(); }
  for (let y = 0; y < H; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.strokePath(); }
  for (let x = 0; x < W; x += 24) {
    for (let y = 0; y < H; y += 24) {
      if (r1.integerInRange(0, 3) === 0) {
        g.fillStyle(0x00ff88, 0.28);
        g.fillCircle(x, y, 2);
      }
    }
  }
  g.generateTexture('bg_techno_far', W, H);
  g.destroy();

  const r2 = new Phaser.Math.RandomDataGenerator(['techno-near']);
  g = scene.add.graphics();
  for (let i = 0; i < 28; i++) {
    const x1 = r2.integerInRange(0, W), y1 = r2.integerInRange(0, H);
    const x2 = Phaser.Math.Clamp(x1 + r2.integerInRange(-90, 90), 0, W);
    const y2 = Phaser.Math.Clamp(y1 + r2.integerInRange(-70, 70), 0, H);
    const col = r2.pick([0x00ff88, 0x00ccff, 0xff6600, 0xcc00ff]);
    const alpha = r2.realInRange(0.25, 0.6);
    g.lineStyle(1, col, alpha);
    g.beginPath();
    if (r2.integerInRange(0, 1) === 0) {
      g.moveTo(x1, y1); g.lineTo(x2, y1); g.lineTo(x2, y2);
    } else {
      g.moveTo(x1, y1); g.lineTo(x1, y2); g.lineTo(x2, y2);
    }
    g.strokePath();
    g.fillStyle(col, alpha + 0.1);
    g.fillCircle(x2, y2, 2);
  }
  g.generateTexture('bg_techno_near', W, H);
  g.destroy();
}

// ---- ABSTRAIT ----
function makeAbstractLayers(scene) {
  const r1 = new Phaser.Math.RandomDataGenerator(['abstract-far']);
  let g = scene.add.graphics();
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const r = Math.floor(0x06 + t * 0x08);
    const b = Math.floor(0x08 + t * 0x0e);
    g.fillStyle((r << 16) | b, 1);
    g.fillRect(0, y, W, 1);
  }
  const darkCols = [0x440066, 0x220044, 0x003355, 0x330033];
  for (let i = 0; i < 14; i++) {
    const x = r1.integerInRange(0, W), y = r1.integerInRange(0, H), s = r1.integerInRange(15, 52);
    g.fillStyle(r1.pick(darkCols), 0.32);
    if (r1.integerInRange(0, 1) === 0) {
      g.fillTriangle(x, y - s, x - s * 0.87, y + s * 0.5, x + s * 0.87, y + s * 0.5);
    } else {
      g.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }
  g.generateTexture('bg_abstract_far', W, H);
  g.destroy();

  const r2 = new Phaser.Math.RandomDataGenerator(['abstract-near']);
  g = scene.add.graphics();
  const brightCols = [0xaa00ff, 0x00aaff, 0xff00aa, 0xffaa00, 0x00ffaa];
  for (let i = 0; i < 16; i++) {
    const x = r2.integerInRange(0, W), y = r2.integerInRange(0, H), s = r2.integerInRange(10, 45);
    const col = r2.pick(brightCols);
    const alpha = r2.realInRange(0.18, 0.45);
    g.lineStyle(1, col, alpha);
    const shape = r2.integerInRange(0, 2);
    if (shape === 0) {
      g.beginPath();
      g.moveTo(x, y - s);
      g.lineTo(x - s * 0.87, y + s * 0.5);
      g.lineTo(x + s * 0.87, y + s * 0.5);
      g.closePath();
      g.strokePath();
    } else if (shape === 1) {
      g.strokeRect(x - s / 2, y - s / 2, s, s);
    } else {
      g.strokeCircle(x, y, s / 2);
    }
  }
  g.generateTexture('bg_abstract_near', W, H);
  g.destroy();
}
