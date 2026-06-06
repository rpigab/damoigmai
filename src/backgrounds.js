const W = 480, H = 270;

export const WORLD_NAMES = [
  'ESPACE', 'DÉSERT', 'OCÉAN', 'NEIGE', 'FORÊT', 'VILLE', 'TECHNO', 'ABSTRAIT',
];

export const WORLD_BG_COLORS = [
  0x00000a, 0x120800, 0x000818, 0x060c18, 0x020602, 0x040406, 0x000c0c, 0x060008,
];

// Parallax configs per world. Each entry: [textureKey, scrollSpeedX, opts?]
// opts.depth — explicit Phaser depth (default = layer index).
// All CDN PNGs tile at 1 art pixel = 1 Phaser canvas pixel.
// 160×90 tiles 3×3 in 480×270 (star/grid worlds); 160×270 tiles 3×1 (ground worlds).
const WORLD_CFGS = [
  // ESPACE — 4 layers (160×90)
  [
    ['bg_space_layer0', 0.25],
    ['bg_space_layer1', 0.35],
    ['bg_space_layer2', 0.60],
    ['bg_space_layer3', 1.00, { depth: 12 }], // foreground — above enemies (depth 9)
  ],
  // DÉSERT — 2 layers (160×270)
  [['bg_desert_layer0', 0.20], ['bg_desert_layer1', 0.70]],
  // OCÉAN — 2 layers (160×270)
  [['bg_ocean_layer0', 0.15], ['bg_ocean_layer1', 0.55]],
  // NEIGE — 2 layers (160×270)
  [['bg_snow_layer0', 0.20], ['bg_snow_layer1', 0.65]],
  // FORÊT — 2 layers (160×270)
  [['bg_forest_layer0', 0.20], ['bg_forest_layer1', 0.80]],
  // VILLE — 2 layers (160×270)
  [['bg_city_layer0', 0.15], ['bg_city_layer1', 0.70]],
  // TECHNO — 2 layers (160×90)
  [['bg_techno_layer0', 0.30], ['bg_techno_layer1', 0.70]],
  // ABSTRAIT — 2 layers (160×90)
  [['bg_abstract_layer0', 0.25], ['bg_abstract_layer1', 0.65]],
];

export function createWorldBackground(scene, worldIndex) {
  return WORLD_CFGS[worldIndex].map(([key, speedX, opts = {}], i) => {
    const depth = opts.depth ?? i;
    const sprite = scene.add.tileSprite(0, 0, W, H, key).setOrigin(0, 0).setDepth(depth);
    return { sprite, speedX };
  });
}

// All worlds now use CDN PNGs — no procedural generation needed.
export function generateWorldTextures(_scene) {}
