# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (requires Node 24.16 via nvs)
npm run build    # Production build → dist/
```

No test suite. Manual verification in browser is the only way to validate changes.

## Architecture

**Stack**: Phaser 4 + Vite (ESM). Canvas 480×270, `pixelArt: true`, FIT scaling.

**Core principle — zero binary assets**: every sprite, parallax background, sound effect, and chiptune track is generated entirely by code at runtime (Web Audio API + Phaser `Graphics.generateTexture`). Never load external files for gameplay assets.

### Scene graph

```
BootScene → MenuScene → ShipSelectScene → GameScene ↔ PauseScene
                      ↘ ControlsScene
```

`BootScene.preload()` generates all procedural textures (via `sprites.js` and `backgrounds.js`) and loads the 8 ship PNGs from CDN before transitioning to `MenuScene`.

### Module responsibilities

| File | Role |
|---|---|
| `game.js` | Phaser config, scene registration |
| `input.js` | Keyboard via `event.code` (layout-independent: AZERTY/QWERTY same physical key) |
| `audio.js` | Web Audio API SFX synthesis |
| `music.js` | Procedural chiptune step-sequencer; one theme per world (square/triangle oscillators) |
| `sprites.js` | Pixel art sprite generator (`drawPixels` → `generateTexture`); `PIXEL_SCALE = 3` |
| `backgrounds.js` | Parallax world textures, one palette/style per world index |
| `shipState.js` | Singleton holding the selected ship across scene transitions |

### GameScene internals

- Launched with `{ mode, worldIndex, score, weaponStack, cloneCount }` in `scene.settings.data`
- `mode`: `'story'` (8 worlds, weapons/clones persist between worlds) or `'endless'` (infinite waves, high scores in `localStorage`)
- Weapon stack: `gatling` (infinite ammo, base), `spread`, `plasma` (limited). Current weapon = rightmost in stack. HUD shows up to 10 cells.
- Clones: cost 2 weapons to spawn (max 2). First clone is steerable (right stick / IJKL). With 2 clones: LB = sacrifice for +1 life, RB = screen bomb.
- Enemy types 1–3 defined in `ENEMY_DEF`; 6 waves per world (`WAVES_PER_WORLD`)

### Ship sprites

Loaded from `https://rpigab.github.io/pixelagen/`. If a CDN image fails to load, `ShipSelectScene` shows a coloured placeholder and `GameScene` falls back to the procedural `'player'` texture. Always check `this.textures.exists(ship.key)` before using a CDN key.

### Deployment

Push to `master` → GitHub Actions builds and deploys to GitHub Pages automatically (`pages.yml`). The `vite.config.js` sets `base` to `/${CI_PROJECT_NAME}/` when that env var is set (GitLab CI), otherwise `/` (local dev).
