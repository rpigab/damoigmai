// Boss & mid-boss definitions + procedural sprite generator.
//
// Zero binary assets: every boss sprite is generated at runtime as a large,
// vertically-symmetric pixel-art warship facing left (cannons toward the
// player, engines to the right). One unique boss + one mid-boss per world.
//
// A boss "def" is purely declarative data — gameplay (movement + bullet
// patterns) is interpreted by GameScene, so adding/tuning a boss never touches
// the scene code.

import Phaser from 'phaser';
import { PIXEL_SCALE } from './sprites.js';

const W = 480;

// Palette: index 0 transparent, 1 outline, 2 body, 3 light, 4 accent, 5 core, 6 engine.
const P = (outline, body, light, accent, core, engine) =>
  [0x000000, outline, body, light, accent, core, engine];

// ---------------------------------------------------------------------------
// Per-world boss roster. `boss` = end-of-world, `mid` = mid-world.
// move/attacks are read by GameScene; w/h are the art-grid size (×PIXEL_SCALE
// gives the on-screen pixel size).
export const BOSS_WORLDS = [
  { // 0 ESPACE — armoured cruiser
    name: 'DREADNOUGHT', midName: 'CROISEUR',
    pal: P(0x0b0e1a, 0x39507a, 0x8fb8e8, 0xc0392b, 0x73eff7, 0xff8833), tint: 0x9ad1ff,
    boss: { style: 'cruiser', w: 42, h: 34, hp: 52, station: W - 78,
      move: { type: 'patrol', ampX: 14, ampY: 74, wx: 0.0011, wy: 0.0016 },
      attacks: [ { type: 'aimed', count: 5, spread: 0.13, speed: 165, cooldown: 1200 },
                 { type: 'fan',   count: 9, arc: 1.5, aim: true, speed: 140, cooldown: 1500 },
                 { type: 'ring',  count: 16, speed: 120, cooldown: 1700 } ] },
    mid: { style: 'saucer', w: 28, h: 24, hp: 26, station: W - 72,
      move: { type: 'patrol', ampX: 10, ampY: 54, wx: 0.0014, wy: 0.002 },
      attacks: [ { type: 'aimed', count: 3, spread: 0.2, speed: 160, cooldown: 1100 },
                 { type: 'fan',   count: 5, arc: 1.2, aim: true, speed: 140, cooldown: 1500 } ] },
  },
  { // 1 DÉSERT — sand scarab
    name: 'SCARABÉE', midName: 'ÉCLAIREUR',
    pal: P(0x241405, 0x7a4a12, 0xd8a24a, 0x6fae3a, 0xffd86b, 0xff7a1f), tint: 0xffcf73,
    boss: { style: 'organic', w: 40, h: 36, hp: 64, station: W - 80,
      move: { type: 'figure8', ampX: 26, ampY: 52, w: 0.0016 },
      attacks: [ { type: 'fan',    count: 7, arc: 1.1, aim: true, speed: 150, cooldown: 1100 },
                 { type: 'aimed',  count: 3, spread: 0.22, speed: 185, cooldown: 950 },
                 { type: 'spiral', arms: 2, ticks: 18, interval: 70, da: 0.30, speed: 150, cooldown: 1900 } ] },
    mid: { style: 'cruiser', w: 28, h: 26, hp: 30, station: W - 74,
      move: { type: 'patrol', ampX: 12, ampY: 50, wx: 0.0015, wy: 0.0021 },
      attacks: [ { type: 'fan',   count: 5, arc: 1.0, aim: true, speed: 150, cooldown: 1300 },
                 { type: 'aimed', count: 3, spread: 0.22, speed: 170, cooldown: 1000 } ] },
  },
  { // 2 OCÉAN — leviathan, long & low
    name: 'LÉVIATHAN', midName: 'RAIE',
    pal: P(0x041820, 0x126e7a, 0x47d6d6, 0xe85d75, 0x9bffe6, 0x66e0ff), tint: 0x7af0e6,
    boss: { style: 'saucer', w: 52, h: 28, hp: 76, station: W - 100,
      move: { type: 'swoop', ampX: 70, ampY: 36, w: 0.0013 },
      attacks: [ { type: 'wall',  count: 12, gap: 44, speed: 120, cooldown: 1700 },
                 { type: 'ring',  count: 18, speed: 110, cooldown: 1600 },
                 { type: 'aimed', count: 5, spread: 0.14, speed: 160, cooldown: 1100 } ] },
    mid: { style: 'saucer', w: 34, h: 22, hp: 36, station: W - 86,
      move: { type: 'hover', ampX: 30, ampY: 30 },
      attacks: [ { type: 'ring',  count: 10, speed: 120, cooldown: 1500 },
                 { type: 'aimed', count: 3, spread: 0.16, speed: 160, cooldown: 1100 } ] },
  },
  { // 3 NEIGE — frost crystal, fixed turret
    name: 'GIVRE', midName: 'ESQUILLE',
    pal: P(0x16263a, 0x4f7ea6, 0xbfe6ff, 0x9fd0ff, 0xffffff, 0x88ccff), tint: 0xcdebff,
    boss: { style: 'crystal', w: 40, h: 40, hp: 88, station: W - 66,
      move: { type: 'fixed' },
      attacks: [ { type: 'ring',   count: 20, speed: 100, cooldown: 1500 },
                 { type: 'spiral', arms: 4, ticks: 30, interval: 55, da: 0.22, speed: 120, cooldown: 2200 },
                 { type: 'aimed',  count: 3, spread: 0.1, speed: 150, cooldown: 1000 } ] },
    mid: { style: 'crystal', w: 28, h: 28, hp: 40, station: W - 72,
      move: { type: 'patrol', ampX: 8, ampY: 46, wx: 0.0016, wy: 0.0022 },
      attacks: [ { type: 'ring',  count: 12, speed: 110, cooldown: 1500 },
                 { type: 'aimed', count: 3, spread: 0.12, speed: 150, cooldown: 1100 } ] },
  },
  { // 4 FORÊT — living sylvan
    name: 'SYLVE', midName: 'RONCE',
    pal: P(0x06210c, 0x1f6e2a, 0x6fd66f, 0xb5651d, 0xd8ff8a, 0x66ff88), tint: 0x9aff8a,
    boss: { style: 'organic', w: 40, h: 38, hp: 96, station: W - 74,
      move: { type: 'hover', ampX: 8, ampY: 26 },
      attacks: [ { type: 'fan',   count: 9, arc: 1.8, aim: true, speed: 135, cooldown: 1300 },
                 { type: 'aimed', count: 4, spread: 0.18, speed: 170, cooldown: 1000 },
                 { type: 'ring',  count: 14, speed: 120, cooldown: 1600 } ] },
    mid: { style: 'organic', w: 28, h: 26, hp: 44, station: W - 72,
      move: { type: 'hover', ampX: 6, ampY: 30 },
      attacks: [ { type: 'fan',   count: 6, arc: 1.4, aim: true, speed: 140, cooldown: 1300 },
                 { type: 'aimed', count: 3, spread: 0.2, speed: 160, cooldown: 1100 } ] },
  },
  { // 5 VILLE — fortress, fixed
    name: 'FORTERESSE', midName: 'TOURELLE',
    pal: P(0x1a1a1f, 0x4a4a55, 0x9aa0aa, 0xcc3322, 0xffcc33, 0xff5533), tint: 0xffb499,
    boss: { style: 'fortress', w: 38, h: 44, hp: 108, station: W - 70,
      move: { type: 'fixed' },
      attacks: [ { type: 'wall',  count: 13, gap: 42, speed: 115, cooldown: 1500 },
                 { type: 'aimed', count: 6, spread: 0.1, speed: 160, cooldown: 1100 },
                 { type: 'ring',  count: 16, speed: 110, cooldown: 1700 } ] },
    mid: { style: 'fortress', w: 26, h: 30, hp: 50, station: W - 74,
      move: { type: 'patrol', ampX: 6, ampY: 40, wx: 0.0015, wy: 0.002 },
      attacks: [ { type: 'aimed', count: 4, spread: 0.12, speed: 155, cooldown: 1100 },
                 { type: 'wall',  count: 9, gap: 40, speed: 110, cooldown: 1700 } ] },
  },
  { // 6 TECHNO — cyber mech, fast
    name: 'NEXUS', midName: 'SENTINELLE',
    pal: P(0x0a0a14, 0x2a2a52, 0x5a7aff, 0x00ffaa, 0xffffff, 0x00ffd0), tint: 0x8affff,
    boss: { style: 'mech', w: 44, h: 36, hp: 120, station: W - 76,
      move: { type: 'patrol', ampX: 18, ampY: 82, wx: 0.0014, wy: 0.0024 },
      attacks: [ { type: 'spiral', arms: 3, ticks: 28, interval: 48, da: 0.34, speed: 165, cooldown: 1900 },
                 { type: 'fan',    count: 7, arc: 1.0, aim: true, speed: 185, cooldown: 1000 },
                 { type: 'ring',   count: 18, speed: 140, cooldown: 1500 } ] },
    mid: { style: 'mech', w: 30, h: 26, hp: 54, station: W - 76,
      move: { type: 'figure8', ampX: 20, ampY: 50, w: 0.0018 },
      attacks: [ { type: 'spiral', arms: 2, ticks: 16, interval: 60, da: 0.3, speed: 150, cooldown: 1800 },
                 { type: 'aimed',  count: 3, spread: 0.16, speed: 175, cooldown: 1000 } ] },
  },
  { // 7 ABSTRAIT — chaos core, hardest
    name: 'CHAOS', midName: 'FRAGMENT',
    pal: P(0x140014, 0x6a1f6a, 0xd66fd6, 0xffee00, 0xff66cc, 0xaa66ff), tint: 0xff9ae6,
    boss: { style: 'core', w: 46, h: 42, hp: 140, station: W - 92,
      move: { type: 'figure8', ampX: 40, ampY: 68, w: 0.0015 },
      attacks: [ { type: 'spiral', arms: 4, ticks: 34, interval: 45, da: 0.40, speed: 160, cooldown: 2000 },
                 { type: 'ring',   count: 22, speed: 120, cooldown: 1500 },
                 { type: 'fan',    count: 11, arc: 2.2, aim: true, speed: 150, cooldown: 1300 },
                 { type: 'aimed',  count: 5, spread: 0.2, speed: 200, cooldown: 950 } ] },
    mid: { style: 'core', w: 30, h: 28, hp: 62, station: W - 86,
      move: { type: 'figure8', ampX: 26, ampY: 54, w: 0.0017 },
      attacks: [ { type: 'ring', count: 12, speed: 120, cooldown: 1400 },
                 { type: 'fan',  count: 7, arc: 1.6, aim: true, speed: 145, cooldown: 1300 } ] },
  },
];

// Flat config consumed by GameScene.spawnBoss().
export function bossSpawnConfig(world, tier) {
  const Wd = BOSS_WORLDS[world];
  const d  = tier === 'boss' ? Wd.boss : Wd.mid;
  return {
    key:      `${tier === 'boss' ? 'boss' : 'mboss'}${world}`,
    name:     tier === 'boss' ? Wd.name : Wd.midName,
    tier,
    hp:       d.hp,
    pts:      tier === 'boss' ? 3000 + world * 1000 : 1200 + world * 350,
    stationX: d.station,
    move:     d.move,
    attacks:  d.attacks,
    tint:     Wd.tint,
    gridW:    d.w,
    gridH:    d.h,
  };
}

// ---------------------------------------------------------------------------
// Procedural sprite generation.
//
// Each boss is built as a grid of palette indices then rasterised. The body is
// inherently top/bottom symmetric (every row is a function of |ny|), so the
// ship always reads as a balanced warship. A final outline pass darkens the
// silhouette edge for a clean pixel-art border.

// Half-width profile (0..1) of the hull at normalised vertical offset ny∈[-1,1].
function profile(style, ny) {
  const a = Math.abs(ny);
  switch (style) {
    case 'saucer':   return Math.sqrt(Math.max(0, 1 - ny * ny));
    case 'crystal':  return Math.max(0, 1 - a * 1.15);
    case 'fortress': return 1 - 0.12 * a;
    case 'organic':  return Math.max(0, 1 - 0.45 * ny * ny + 0.12 * Math.sin(ny * 3.3));
    case 'mech':     return 1 - 0.5 * ny * ny;
    case 'core':     return Math.sqrt(Math.max(0, 1 - ny * ny));
    case 'cruiser':
    default:         return 1 - 0.5 * ny * ny;
  }
}

// Extra forward (left) extension of the nose at row ny, as a 0..1 factor.
function nose(style, ny) {
  const c = Math.max(0, 1 - ny * ny);
  switch (style) {
    case 'crystal':  return c * c;
    case 'saucer':   return c * 0.4;
    case 'fortress': return c * 0.25;
    case 'organic':  return c * 0.7;
    case 'mech':     return c * 0.6;
    case 'core':     return 0;
    case 'cruiser':
    default:         return c * 0.9;
  }
}

function buildGrid(key, d) {
  const { w, h, style } = d;
  const rng  = new Phaser.Math.RandomDataGenerator([key]);
  const grid = Array.from({ length: h }, () => new Array(w).fill(0));
  const cy = (h - 1) / 2;
  const bodyCx  = w * 0.52;
  const bodyHalf = w * 0.40;
  const noseMax  = w * 0.20;

  // Hull fill — vertical shading bands + sparse darker greebles.
  for (let y = 0; y < h; y++) {
    const ny = (y - cy) / (cy || 1);
    const half = bodyHalf * profile(style, ny);
    if (half < 0.6) continue;
    const left  = Phaser.Math.Clamp(Math.round(bodyCx - half - noseMax * nose(style, ny)), 0, w - 1);
    const right = Phaser.Math.Clamp(Math.round(bodyCx + half), 0, w - 1);
    for (let x = left; x <= right; x++) {
      grid[y][x] = Math.abs(ny) < 0.42 ? 3 : 2;
      if (rng.frac() < 0.06) grid[y][x] = 2; // speckle
    }
  }

  // Core glow — bright "weak point" just behind the nose, on the centre rows.
  const coreW = Math.max(2, Math.round(w * 0.11));
  for (let y = 0; y < h; y++) {
    const ny = (y - cy) / (cy || 1);
    if (Math.abs(ny) > 0.30) continue;
    let lx = -1; for (let x = 0; x < w; x++) if (grid[y][x]) { lx = x; break; }
    if (lx < 0) continue;
    const start = lx + Math.round(w * 0.10);
    for (let x = start; x < start + coreW && x < w; x++) if (grid[y][x]) grid[y][x] = 5;
  }

  // Engine glow — two trailing columns at the rear centre.
  for (let y = 0; y < h; y++) {
    const ny = (y - cy) / (cy || 1);
    if (Math.abs(ny) > 0.5) continue;
    let rx = -1; for (let x = w - 1; x >= 0; x--) if (grid[y][x]) { rx = x; break; }
    if (rx < 0) continue;
    for (let x = rx; x > rx - 2 && x >= 0; x--) if (grid[y][x]) grid[y][x] = 6;
  }

  // Forward cannon nubs (accent) — skipped for pointed crystal / core shapes.
  if (style !== 'crystal' && style !== 'core') {
    [0.55, 0.85].forEach(f => {
      [cy - cy * f, cy + cy * f].forEach(ryf => {
        const ry = Math.round(ryf);
        if (ry < 0 || ry >= h) return;
        let lx = -1; for (let x = 0; x < w; x++) if (grid[ry][x]) { lx = x; break; }
        if (lx < 1) return;
        grid[ry][lx - 1] = 4;
        if (lx - 2 >= 0) grid[ry][lx - 2] = 4;
      });
    });
  }

  // Core/crystal styles: a large pulsing core eye + accent spokes.
  if (style === 'core' || style === 'crystal') {
    const cx = Math.round(bodyCx);
    const cr = w * (style === 'core' ? 0.18 : 0.13);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!grid[y][x]) continue;
      const dx = x - cx, dy = (y - cy) * 1.1;
      const dist = Math.hypot(dx, dy);
      if (dist < cr) grid[y][x] = 5;
      else if (dist < cr + 1.4) grid[y][x] = 4;
    }
  }

  // Outline pass — body cells (2/3) bordering empty space become dark outline.
  const out = grid.map(r => r.slice());
  const empty = (x, y) => x < 0 || y < 0 || x >= w || y >= h || grid[y][x] === 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = grid[y][x];
    if (c !== 2 && c !== 3) continue;
    if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) out[y][x] = 1;
  }
  return out;
}

function gridToTexture(scene, key, grid, palette) {
  const h = grid.length, w = grid[0].length;
  const g = scene.add.graphics();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = grid[y][x];
    if (!c) continue;
    g.fillStyle(palette[c], 1);
    g.fillRect(x * PIXEL_SCALE, y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
  }
  g.generateTexture(key, w * PIXEL_SCALE, h * PIXEL_SCALE);
  g.destroy();
}

export function generateBossSprites(scene) {
  BOSS_WORLDS.forEach((Wd, world) => {
    [['boss', Wd.boss], ['mboss', Wd.mid]].forEach(([prefix, d]) => {
      const key = `${prefix}${world}`;
      gridToTexture(scene, key, buildGrid(key, d), Wd.pal);
    });
  });
}
