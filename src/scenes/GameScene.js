import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { startMusic, stopMusic } from '../music.js';
import { installKeyboard, isDown, justDown } from '../input.js';
import { createWorldBackground } from '../backgrounds.js';

const W = 480, H = 270;
const PLAYER_SPEED   = 180;
const WAVES_PER_WORLD = 6;

const ENEMY_DEF = {
  1: { hp: 1, speed: 160, pts: 100, shootMs: 3500 },
  2: { hp: 3, speed: 90,  pts: 250, shootMs: 2500 },
  3: { hp: 5, speed: 65,  pts: 500, shootMs: 2000 },
};

const FIRE_CONFIG = {
  gatling: { cooldown: 120 },
  spread:  { cooldown: 280 },
  plasma:  { cooldown: 480 },
};

const AMMO = { spread: 60, plasma: 25 };

const WEAPON_COLORS = { gatling: 0xddcc00, spread: 0x00aadd, plasma: 0xff6600 };

// ---- Highscores (endless mode) ----
function loadScores() {
  try { return JSON.parse(localStorage.getItem('damoigmai_hs') || '[]'); }
  catch { return []; }
}
function saveScore(score) {
  const scores = loadScores();
  scores.push(score);
  scores.sort((a, b) => b - a);
  const rank = scores.findIndex(s => s === score);
  localStorage.setItem('damoigmai_hs', JSON.stringify(scores.slice(0, 5)));
  return rank < 5 ? rank : -1;
}

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // -------------------------------------------------------------------------
  create() {
    const data = this.scene.settings.data ?? {};
    this.mode       = data.mode  ?? 'endless';
    this.worldIndex = data.world ?? 0;
    this.score      = data.score ?? 0;

    installKeyboard();
    startMusic(this.worldIndex);

    // Background parallax layers
    this.bgLayers = createWorldBackground(this, this.worldIndex);

    this.bullets      = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemies      = this.physics.add.group();
    this.powerups     = this.physics.add.group();

    this.player = this.physics.add.sprite(70, H / 2, 'player').setDepth(10);
    this.player.setCollideWorldBounds(true);

    this.physics.add.overlap(this.bullets,      this.enemies,  this.onBulletHitEnemy,  null, this);
    this.physics.add.overlap(this.enemyBullets, this.player,   this.onBulletHitPlayer, null, this);
    this.physics.add.overlap(this.enemies,      this.player,   this.onEnemyHitPlayer,  null, this);
    this.physics.add.overlap(this.player,       this.powerups, this.onPickupPowerup,   null, this);

    this.score       = data.score ?? 0;
    this.lives       = 3;
    this.fireCD      = 0;
    this.invTimer    = 0;
    this.dead        = false;
    this.worldDone   = false;
    this.gameOverReady  = false;
    this.waveActive  = false;
    this.waveCanEnd  = false;
    this.wave        = this.worldIndex * WAVES_PER_WORLD; // base for this world

    this.weaponStack   = data.weaponStack ?? [];
    this.clones        = [];
    this.cloneGroup    = this.physics.add.group();
    this.padCloneBtn   = false;

    this.input.gamepad.on('connected', () => {
      const t = this.add.text(W / 2, 40, 'MANETTE CONNECTÉE', {
        fontFamily: 'Arial', fontSize: '8px', color: '#88ff88',
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: t, y: 20, alpha: 0, duration: 2500, onComplete: () => t.destroy() });
    });

    this.physics.add.overlap(this.enemyBullets, this.cloneGroup, this.onEnemyBulletHitClone, null, this);
    this.physics.add.overlap(this.cloneGroup,   this.powerups,   this.onPickupPowerup,        null, this);

    // Conserve les clones entre les mondes (mode histoire).
    const carriedClones = Math.min(data.cloneCount ?? 0, 2);
    for (let i = 1; i <= carriedClones; i++) this.addClone(i);

    this.nextGroupId  = 1;
    this.enemyGroups  = {};
    this.powerupCycle = 0;

    // Gamepad tracking for game-over screen
    this._goA = false; this._goB = false; this._goStart = false; this._goBack = false;
    this._padSelect = false;
    this._padLB = false; this._padRB = false;
    this._padStart = false;
    this.victoryReady = false;

    // HUD
    const hs = { fontFamily: 'Arial', fontSize: '10px', color: '#ffffff' };
    this.scoreTxt = this.add.text(W - 6, 6, `${this.score}`, hs).setOrigin(1, 0).setDepth(20);
    this.livesTxt = this.add.text(6, 6, '♥ ♥ ♥', { ...hs, color: '#ff4455' }).setOrigin(0, 0).setDepth(20);

    this.createWeaponHUD();

    this.time.delayedCall(800, () => this.startWave());
  }

  // -------------------------------------------------------------------------
  // Weapon stack HUD — a horizontal strip anchored to the bottom-right corner.
  // The 4 topmost weapons (current = rightmost) are shown in detail (bullet
  // icon + ammo gauge). Deeper weapons are shown as plain colour-coded squares
  // extending leftward. Beyond 10 squares the oldest are dropped and the
  // leftmost square becomes "…" to signal the omission.
  createWeaponHUD() {
    const cy = H - 13;
    const DW = 26;                 // detailed cell pitch
    const dRight = W - 16;         // centre x of the rightmost (current) cell

    this.detailedSlots = [];
    for (let i = 0; i < 4; i++) {
      const cx = dRight - i * DW;
      const bg    = this.add.rectangle(cx, cy, 24, 22, 0x000000, 0.4).setDepth(19);
      const gfx   = this.add.graphics().setDepth(20);
      const barBg = this.add.rectangle(cx - 9, cy + 7, 18, 3, 0x222233).setOrigin(0, 0.5).setDepth(20);
      const bar   = this.add.rectangle(cx - 9, cy + 7, 18, 3, 0x44cc44).setOrigin(0, 0.5).setDepth(20);
      const inf   = this.add.text(cx, cy + 7, '∞', {
        fontFamily: 'Arial', fontSize: '9px', color: '#888888',
      }).setOrigin(0.5).setDepth(20);
      [bg, gfx, barBg, bar, inf].forEach(o => o.setVisible(false));
      this.detailedSlots.push({ cx, cy, bg, gfx, barBg, bar, inf });
    }

    const SW = 11;                 // square cell pitch
    const sRight = (dRight - 3 * DW - DW / 2) - 2 - 5; // just left of the 4th cell
    this.squareSlots = [];
    for (let j = 0; j < 10; j++) {
      const cx = sRight - j * SW;
      const rect = this.add.rectangle(cx, cy, 9, 9, 0xffffff).setDepth(20);
      const dots = this.add.graphics().setDepth(21);
      [rect, dots].forEach(o => o.setVisible(false));
      this.squareSlots.push({ cx, cy, rect, dots });
    }

    this.updateWeaponHUD();
  }

  drawWeaponIcon(gfx, type, cx, cy) {
    gfx.clear();
    const col = WEAPON_COLORS[type];
    gfx.fillStyle(col, 1);
    if (type === 'gatling') {
      gfx.fillRect(cx - 1, cy - 3, 3, 6);
      gfx.fillRect(cx + 2, cy - 1, 2, 2);
    } else if (type === 'spread') {
      gfx.fillRect(cx - 3, cy - 1, 5, 2);   // centre
      gfx.fillRect(cx - 4, cy - 5, 4, 2);   // upper
      gfx.fillRect(cx - 4, cy + 3, 4, 2);   // lower
      gfx.fillRect(cx + 2, cy - 1, 2, 1);   // centre tip
      gfx.fillRect(cx, cy - 5, 2, 1);       // upper tip
      gfx.fillRect(cx, cy + 3, 2, 1);       // lower tip
    } else {
      gfx.fillCircle(cx, cy, 4);
      gfx.fillStyle(0xffffff, 0.4);
      gfx.fillCircle(cx - 1, cy - 1, 1);    // highlight
    }
  }

  renderDetailed(slot, w, isCurrent) {
    if (!w) {
      [slot.bg, slot.gfx, slot.barBg, slot.bar, slot.inf].forEach(o => o.setVisible(false));
      slot.gfx.clear();
      return;
    }
    const alpha = isCurrent ? 1 : 0.5;
    slot.bg.setFillStyle(WEAPON_COLORS[w.type], isCurrent ? 0.35 : 0.18).setVisible(true);
    this.drawWeaponIcon(slot.gfx, w.type, slot.cx, slot.cy - 4);
    slot.gfx.setAlpha(alpha).setVisible(true);
    if (w.ammo === Infinity) {
      slot.barBg.setVisible(false); slot.bar.setVisible(false);
      slot.inf.setAlpha(alpha).setVisible(true);
    } else {
      const ratio = Math.max(0, w.ammo / w.maxAmmo);
      const bw    = Math.max(1, Math.round(18 * ratio));
      const col   = ratio > 0.5 ? 0x33cc33 : ratio > 0.25 ? 0xddcc00 : 0xdd2200;
      slot.barBg.setAlpha(alpha).setVisible(true);
      slot.bar.setSize(bw, 3).setFillStyle(col).setAlpha(alpha).setVisible(true);
      slot.inf.setVisible(false);
    }
  }

  updateWeaponHUD() {
    // stack[0] = gatling base (oldest), stack[last] = current weapon.
    const stack = [{ type: 'gatling', ammo: Infinity, maxAmmo: Infinity }, ...this.weaponStack];
    const n = stack.length;

    // Detailed cells: rank 0 (current) at the rightmost cell, older to the left.
    this.detailedSlots.forEach((slot, i) => {
      const w = i < n ? stack[n - 1 - i] : null;
      this.renderDetailed(slot, w, i === 0);
    });

    // Squares: everything below the top 4, newest adjacent to the cells.
    const deeper   = Math.max(0, n - 4);
    const overflow = deeper > 10;
    const real     = overflow ? 9 : deeper; // leave room for the "…" marker
    this.squareSlots.forEach((slot, j) => {
      if (j < real) {
        const w = stack[n - 1 - (4 + j)];
        slot.rect.setFillStyle(WEAPON_COLORS[w.type], 1).setVisible(true);
        slot.dots.clear().setVisible(false);
      } else if (overflow && j === 9) {
        slot.rect.setVisible(false);
        slot.dots.clear().setVisible(true);
        slot.dots.fillStyle(0x99aabb, 1);
        const { cx, cy } = slot;
        slot.dots.fillRect(cx - 4, cy - 1, 2, 2);
        slot.dots.fillRect(cx - 1, cy - 1, 2, 2);
        slot.dots.fillRect(cx + 2, cy - 1, 2, 2);
      } else {
        slot.rect.setVisible(false);
        slot.dots.clear().setVisible(false);
      }
    });
  }

  // -------------------------------------------------------------------------
  getCurrentWeaponType() {
    return this.weaponStack.length === 0 ? 'gatling' : this.weaponStack[this.weaponStack.length - 1].type;
  }

  consumeAmmo() {
    if (this.weaponStack.length === 0) return;
    const top = this.weaponStack[this.weaponStack.length - 1];
    top.ammo--;
    if (top.ammo <= 0) this.weaponStack.pop();
    this.updateWeaponHUD();
  }

  // -------------------------------------------------------------------------
  update(time, delta) {
    this.bgLayers.forEach(l => { l.sprite.tilePositionX += l.speedX; });

    if (this.worldDone) {
      this.player.setVelocity(0, 0);
      if (this.victoryReady) this.handleVictoryInput();
      return;
    }

    if (this.dead) {
      this.handleGameOverPad();
      return;
    }

    if (this.checkPause()) return;

    this.handleMovement();
    this.updateClones(delta);
    this.handleFire(delta);
    this.updateEnemies(time, delta);
    this.tickInvincibility(delta);
    this.cleanup();

    if (this.waveActive && this.waveCanEnd && this.enemies.countActive(true) === 0) {
      this.waveActive = false;
      if (this.mode === 'story' && this.wave >= (this.worldIndex + 1) * WAVES_PER_WORLD) {
        this.time.delayedCall(900, () => this.triggerWorldComplete());
      } else {
        this.time.delayedCall(2200, () => this.startWave());
      }
    }
  }

  // Start (gamepad) or Échap (keyboard) opens the pause overlay.
  checkPause() {
    const pad = this.input.gamepad?.pad1 ?? null;
    const padStart = pad?.buttons[9]?.pressed ?? false;
    const open = justDown('Escape') || (padStart && !this._padStart);
    this._padStart = padStart;
    if (open) {
      this.player.setVelocity(0, 0);
      this.scene.pause();
      this.scene.launch('PauseScene', { world: this.worldIndex });
      return true;
    }
    return false;
  }

  handleGameOverPad() {
    if (!this.gameOverReady) return;

    // Keyboard: Espace / Entrée rejouent, Échap retourne au menu.
    if (justDown('Space') || justDown('Enter')) { this.gameOverReady = false; this.doRestart(); return; }
    if (justDown('Escape'))                      { this.gameOverReady = false; this.scene.start('MenuScene'); return; }

    const pad = this.input.gamepad?.pad1 ?? null;
    if (!pad) return;

    const aBtn    = pad.buttons[0]?.pressed  ?? false;
    const bBtn    = pad.buttons[1]?.pressed  ?? false;
    const start   = pad.buttons[9]?.pressed  ?? false;
    const back    = pad.buttons[8]?.pressed  ?? false;

    if ((aBtn && !this._goA) || (start && !this._goStart)) {
      this.gameOverReady = false;
      this.doRestart();
    } else if ((bBtn && !this._goB) || (back && !this._goBack)) {
      this.gameOverReady = false;
      this.scene.start('MenuScene');
    }

    this._goA = aBtn; this._goB = bBtn; this._goStart = start; this._goBack = back;
  }

  handleVictoryInput() {
    const pad = this.input.gamepad?.pad1 ?? null;
    const bBtn  = pad?.buttons[1]?.pressed ?? false;
    const back  = pad?.buttons[8]?.pressed ?? false;
    if (justDown('Escape') || justDown('Enter') || (bBtn && !this._goB) || (back && !this._goBack)) {
      this.victoryReady = false;
      stopMusic();
      this.scene.start('MenuScene');
    }
    this._goB = bBtn; this._goBack = back;
  }

  doRestart() {
    if (this.mode === 'story') {
      this.scene.start('GameScene', { mode: 'story', world: 0, score: 0 });
    } else {
      this.scene.restart({ mode: 'endless', world: 0, score: 0 });
    }
  }

  // -------------------------------------------------------------------------
  handleMovement() {
    const pad  = this.input.gamepad?.pad1 ?? null;
    const DEAD = 0.15;
    const ax   = pad ? (pad.axes[0]?.getValue() ?? 0) : 0;
    const ay   = pad ? (pad.axes[1]?.getValue() ?? 0) : 0;
    const gx   = Math.abs(ax) > DEAD ? ax : 0;
    const gy   = Math.abs(ay) > DEAD ? ay : 0;

    // Movement is bound to physical key positions (KeyW/A/S/D) so AZERTY ZQSD
    // and QWERTY WASD are the same physical keys. Arrows work everywhere.
    const left  = isDown('KeyA', 'ArrowLeft')  || (pad?.buttons[14]?.pressed ?? false) || gx < 0;
    const right = isDown('KeyD', 'ArrowRight') || (pad?.buttons[15]?.pressed ?? false) || gx > 0;
    const up    = isDown('KeyW', 'ArrowUp')    || (pad?.buttons[12]?.pressed ?? false) || gy < 0;
    const down  = isDown('KeyS', 'ArrowDown')  || (pad?.buttons[13]?.pressed ?? false) || gy > 0;

    let vx = left ? -PLAYER_SPEED : right ? PLAYER_SPEED : 0;
    let vy = up   ? -PLAYER_SPEED : down  ? PLAYER_SPEED : 0;
    if (gx !== 0) vx = gx * PLAYER_SPEED;
    if (gy !== 0) vy = gy * PLAYER_SPEED;

    this.player.setVelocity(vx, vy);
    this.player.x = Phaser.Math.Clamp(this.player.x, 20, W - 20);
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, H - 16);

    const yNow      = pad?.buttons[3]?.pressed ?? false;
    const selectNow = pad?.buttons[8]?.pressed ?? false;
    const lbNow     = pad?.buttons[4]?.pressed ?? false;
    const rbNow     = pad?.buttons[5]?.pressed ?? false;
    if (justDown('KeyQ') || (yNow && !this.padCloneBtn)) {
      this.tryInvokeClone();
    }
    if (selectNow && !this._padSelect) {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    }
    if (lbNow && !this._padLB) this.trySacrificeClones('life');
    if (rbNow && !this._padRB) this.trySacrificeClones('bomb');
    this.padCloneBtn  = yNow;
    this._padSelect   = selectNow;
    this._padLB       = lbNow;
    this._padRB       = rbNow;
  }

  handleFire(delta) {
    this.fireCD -= delta;
    const pad     = this.input.gamepad?.pad1 ?? null;
    // Only RT (right trigger) fires on gamepad — the A button no longer shoots.
    const padFire = (pad?.buttons[7]?.value ?? 0) > 0.1;
    const firing  = isDown('Space') || padFire;
    if (firing && this.fireCD <= 0) {
      this.fire();
      this.fireCD = FIRE_CONFIG[this.getCurrentWeaponType()].cooldown;
    }
  }

  fire() {
    const w = this.getCurrentWeaponType();
    this.fireBurstAt(this.player.x + this.player.width * 0.45, this.player.y, w);
    this.clones.forEach(c => this.fireBurstAt(c.sprite.x + c.sprite.width * 0.45, c.sprite.y, w));
    switch (w) {
      case 'gatling': sfx.shoot1(); break;
      case 'spread':  sfx.shoot2(); break;
      case 'plasma':  sfx.shoot3(); break;
    }
    this.consumeAmmo();
  }

  fireBurstAt(x, y, w) {
    switch (w) {
      case 'gatling':
        this.spawnBullet(x, y, 620, 0, 'bullet1');
        break;
      case 'spread':
        this.spawnBullet(x, y, 520, -0.32, 'bullet2');
        this.spawnBullet(x, y, 520,  0,    'bullet2');
        this.spawnBullet(x, y, 520,  0.32, 'bullet2');
        break;
      case 'plasma': {
        const b = this.spawnBullet(x, y, 360, 0, 'bullet3');
        if (b) { b.piercesLeft = 3; b.hitEnemies = new Set(); }
        break;
      }
    }
  }

  spawnBullet(x, y, speed, angle, key) {
    const b = this.bullets.create(x, y, key);
    if (!b) return null;
    b.setDepth(8).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    return b;
  }

  // -------------------------------------------------------------------------
  tryInvokeClone() {
    if (this.clones.length >= 2) return;
    if (this.weaponStack.length < 2) {
      this.tweens.add({ targets: this.detailedSlots[0].bg, fillColor: 0xff0000, duration: 80, yoyo: true });
      return;
    }
    this.weaponStack.splice(this.weaponStack.length - 2, 2);
    this.updateWeaponHUD();
    this.addClone(this.clones.length + 1);
    sfx.summon();
  }

  trySacrificeClones(action) {
    if (this.clones.length < 2) return;
    const positions = this.clones.map(c => ({ x: c.sprite.x, y: c.sprite.y }));
    this.clones.forEach(c => { this.explodeAt(c.sprite.x, c.sprite.y, false); c.sprite.destroy(); });
    this.clones = [];
    if (action === 'life') {
      this.lives = Math.min(this.lives + 1, 9);
      this.livesTxt.setText(('♥ ').repeat(this.lives).trim());
      sfx.pickup();
      const popup = this.add.text(this.player.x, this.player.y - 20, '+VIE', {
        fontFamily: 'Arial', fontSize: '10px', color: '#ff88aa',
      }).setOrigin(0.5).setDepth(25);
      this.tweens.add({ targets: popup, y: popup.y - 25, alpha: 0, duration: 900, onComplete: () => popup.destroy() });
    } else {
      this.enemies.getChildren().slice().forEach(e => {
        if (!e.active) return;
        this.trackGroupKill(e);
        this.explodeAt(e.x, e.y, e.enemyType >= 2);
        e.enemyType >= 2 ? sfx.explosion() : sfx.smallExplosion();
        this.score += ENEMY_DEF[e.enemyType].pts;
        e.destroy();
      });
      this.scoreTxt.setText(`${this.score}`);
      // flash screen
      const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.7).setDepth(50);
      this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
      sfx.explosion();
    }
  }

  addClone(index) {
    const offset = this.computeCloneOffset(index);
    const tint   = index === 1 ? 0x44ddff : 0xdd44ff;
    const sprite = this.physics.add.sprite(this.player.x + offset.x, this.player.y + offset.y, 'player');
    sprite.setTint(tint).setAlpha(0.82).setDepth(10);
    this.cloneGroup.add(sprite);
    this.clones.push({ sprite, offsetX: offset.x, offsetY: offset.y });
    const flash = this.add.circle(sprite.x, sprite.y, 18, 0xffffff, 0.9).setDepth(25);
    this.tweens.add({ targets: flash, scaleX: 3, scaleY: 3, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
  }

  computeCloneOffset(index) {
    if (index === 1) return { x: 0, y: -34 };
    const b = this.clones[0];
    const bx = b.sprite.x - this.player.x, by = b.sprite.y - this.player.y;
    const cos60 = 0.5, sin60 = Math.sqrt(3) / 2;
    return { x: bx * cos60 - by * sin60, y: bx * sin60 + by * cos60 };
  }

  updateClones(delta) {
    if (this.clones.length === 0) return;
    const pad  = this.input.gamepad?.pad1 ?? null;
    const DEAD = 0.15;
    const step = PLAYER_SPEED * (delta / 1000);

    // --- Premier clone : suit le vaisseau (stick gauche), et le stick droit / IJKL
    // ajoute son propre vecteur par-dessus. Les deux mouvements se somment :
    // si on lâche le stick droit, le clone continue de suivre le vaisseau sans rien retoggler.
    const a = this.clones[0];

    const rx = pad ? (pad.axes[2]?.getValue() ?? 0) : 0;
    const ry = pad ? (pad.axes[3]?.getValue() ?? 0) : 0;
    const sx = Math.abs(rx) > DEAD ? rx : 0;
    const sy = Math.abs(ry) > DEAD ? ry : 0;

    const kx = (isDown('KeyJ') ? -1 : 0) + (isDown('KeyL') ? 1 : 0);
    const ky = (isDown('KeyI') ? -1 : 0) + (isDown('KeyK') ? 1 : 0);

    a.offsetX += (sx + kx) * step;
    a.offsetY += (sy + ky) * step;
    a.sprite.x = Phaser.Math.Clamp(this.player.x + a.offsetX, 20, W - 20);
    a.sprite.y = Phaser.Math.Clamp(this.player.y + a.offsetY, 16, H - 16);
    // Re-synchronise l'offset si le clamp a tronqué la position (évite la dérive au bord).
    a.offsetX = a.sprite.x - this.player.x;
    a.offsetY = a.sprite.y - this.player.y;

    // --- Dernier clone : non contrôlable, complète le triangle équilatéral.
    if (this.clones.length >= 2) {
      const c = this.clones[1];
      const bx = a.sprite.x - this.player.x, by = a.sprite.y - this.player.y;
      const cos60 = 0.5, sin60 = Math.sqrt(3) / 2;
      c.offsetX = bx * cos60 - by * sin60; c.offsetY = bx * sin60 + by * cos60;
      c.sprite.x = this.player.x + c.offsetX; c.sprite.y = this.player.y + c.offsetY;
    }
  }

  onEnemyBulletHitClone(bullet, cloneSprite) {
    bullet.destroy();
    sfx.cloneAbsorb();
    cloneSprite.setTint(0xffffff);
    this.time.delayedCall(80, () => {
      if (!cloneSprite.active) return;
      const clone = this.clones.find(c => c.sprite === cloneSprite);
      if (clone) cloneSprite.setTint(clone === this.clones[0] ? 0x44ddff : 0xdd44ff);
    });
  }

  // -------------------------------------------------------------------------
  startWave() {
    this.wave++;
    this.waveActive = true;
    this.waveCanEnd = false;

    const schedule  = this.buildWaveSchedule();
    const lastDelay = schedule.reduce((m, s) => Math.max(m, s.delay), 0);

    schedule.forEach(({ type, delay, groupId }) => {
      this.time.delayedCall(delay, () => {
        if (this.dead) return;
        const e = this.spawnEnemy(type);
        if (groupId !== undefined) e.groupId = groupId;
      });
    });

    this.time.delayedCall(lastDelay + 1000, () => { this.waveCanEnd = true; });
  }

  buildWaveSchedule() {
    const w = this.wave;
    const schedule = [];
    let t = 300;

    const single = (type, gap = 450) => { schedule.push({ type, delay: t }); t += gap; };
    const group  = (type) => {
      const gid  = this.nextGroupId++;
      const pType = this.powerupCycle % 2 === 0 ? 'spread' : 'plasma';
      this.powerupCycle++;
      this.enemyGroups[gid] = { total: 4, killed: 0, dropX: W / 2, dropY: H / 2, powerupType: pType };
      for (let i = 0; i < 4; i++) { schedule.push({ type, delay: t, groupId: gid }); t += 320; }
      t += 300;
    };

    if (w === 1) { group(1); single(1); single(1); }
    else if (w === 2) { single(1); single(1); group(1); single(2); }
    else if (w === 3) { group(2); single(1); single(1); single(1); single(2); }
    else {
      const n1 = Math.min(2 + w, 8);
      for (let i = 0; i < n1; i++) single(1);
      group(w <= 5 ? 1 : 2);
      const n2 = Math.min(Math.floor(w / 2), 5);
      for (let i = 0; i < n2; i++) single(2, 500);
      if (w >= 4) group(2);
      if (w >= 5) { const n3 = Math.min(Math.floor((w - 3) / 2), 3); for (let i = 0; i < n3; i++) single(3, 700); }
      if (w >= 6) group(3);
    }

    return schedule;
  }

  spawnEnemy(type) {
    const def = ENEMY_DEF[type];
    const y = Phaser.Math.Between(22, H - 22);
    const e = this.enemies.create(W + 24, y, `enemy${type}`);
    e.setDepth(9).setFlipX(true);
    e.enemyType  = type;
    e.hp         = def.hp;
    e.shootTimer = Phaser.Math.Between(def.shootMs * 0.5, def.shootMs);
    e.spawnTime  = this.time.now;
    e.startY     = y;
    e.diving     = false;
    e.diveDelay  = Phaser.Math.Between(1500, 3500);
    e.setVelocityX(-def.speed);
    return e;
  }

  // -------------------------------------------------------------------------
  updateEnemies(time, delta) {
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      if (e.enemyType === 2) {
        e.y = e.startY + Math.sin((time - e.spawnTime) * 0.0025) * 55;
      } else if (e.enemyType === 3 && !e.diving) {
        e.diveDelay -= delta;
        if (e.diveDelay <= 0) {
          e.diving = true;
          const dx = this.player.x - e.x, dy = this.player.y - e.y;
          const len = Math.hypot(dx, dy) || 1;
          e.setVelocity((dx / len) * 280, (dy / len) * 280);
        }
      }
      e.shootTimer -= delta;
      if (e.shootTimer <= 0) {
        this.enemyShoot(e);
        e.shootTimer = ENEMY_DEF[e.enemyType].shootMs + Phaser.Math.Between(-500, 500);
      }
    });
  }

  enemyShoot(enemy) {
    let vx = -220, vy = 0;
    if (enemy.enemyType === 3) {
      const dx = this.player.x - enemy.x, dy = this.player.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      vx = (dx / len) * 260; vy = (dy / len) * 260;
    }
    const b = this.enemyBullets.create(enemy.x - 8, enemy.y, 'enemyBullet');
    if (!b) return;
    b.setDepth(8).setVelocity(vx, vy);
    sfx.enemyShoot();
  }

  // -------------------------------------------------------------------------
  onBulletHitEnemy(bullet, enemy) {
    if (bullet.hitEnemies) {
      if (bullet.hitEnemies.has(enemy)) return;
      bullet.hitEnemies.add(enemy);
    }
    const dmg = bullet.texture.key === 'bullet3' ? 3 : 1;
    enemy.hp -= dmg;
    if (enemy.hp <= 0) {
      this.trackGroupKill(enemy);
      const large = enemy.enemyType >= 2;
      this.explodeAt(enemy.x, enemy.y, large);
      large ? sfx.explosion() : sfx.smallExplosion();
      this.score += ENEMY_DEF[enemy.enemyType].pts;
      this.scoreTxt.setText(`${this.score}`);
      enemy.destroy();
    } else {
      enemy.setTint(0xff6666);
      this.time.delayedCall(90, () => { if (enemy.active) enemy.clearTint(); });
      sfx.hit();
    }
    if (bullet.piercesLeft !== undefined) {
      bullet.piercesLeft--;
      if (bullet.piercesLeft <= 0) bullet.destroy();
    } else {
      bullet.destroy();
    }
  }

  trackGroupKill(enemy) {
    if (enemy.groupId === undefined) return;
    const g = this.enemyGroups[enemy.groupId];
    if (!g) return;
    g.killed++;
    g.dropX = enemy.x; g.dropY = enemy.y;
    if (g.killed >= g.total) {
      this.spawnPowerup(g.dropX, g.dropY, g.powerupType);
      delete this.enemyGroups[enemy.groupId];
    }
  }

  spawnPowerup(x, y, type) {
    const p = this.powerups.create(x, y, `pu_${type}`);
    if (!p) return;
    p.setDepth(11);
    p.powerupType = type;
    p.setVelocity(-55, Phaser.Math.Between(-25, 25));
    this.tweens.add({ targets: p, y: y + 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: p, scaleX: 1.15, scaleY: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onPickupPowerup(player, powerup) {
    const type = powerup.powerupType;
    const px = powerup.x, py = powerup.y;
    powerup.destroy();
    this.weaponStack.push({ type, ammo: AMMO[type], maxAmmo: AMMO[type] });
    this.updateWeaponHUD();
    sfx.pickup();
    const popup = this.add.text(px, py - 8, type === 'spread' ? '+SPREAD' : '+PLASMA', {
      fontFamily: 'Arial', fontSize: '9px', color: type === 'spread' ? '#55eeff' : '#ffcc00',
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: popup, y: py - 30, alpha: 0, duration: 900, onComplete: () => popup.destroy() });
  }

  // -------------------------------------------------------------------------
  onBulletHitPlayer(player, bullet) {
    if (this.invTimer > 0) return;
    bullet.destroy();
    this.damagePlayer();
  }

  onEnemyHitPlayer(player, enemy) {
    if (this.invTimer > 0) return;
    this.explodeAt(enemy.x, enemy.y, false);
    sfx.smallExplosion();
    enemy.destroy();
    this.damagePlayer();
  }

  damagePlayer() {
    this.lives--;
    this.livesTxt.setText(('♥ ').repeat(Math.max(0, this.lives)).trim());
    this.invTimer = 2200;
    if (this.lives <= 0) { this.triggerGameOver(); return; }
    sfx.hit();
    this.tweens.add({ targets: this.player, alpha: 0.2, duration: 80, yoyo: true, repeat: 12, onComplete: () => this.player.setAlpha(1) });
  }

  tickInvincibility(delta) { if (this.invTimer > 0) this.invTimer -= delta; }

  // -------------------------------------------------------------------------
  explodeAt(x, y, large) {
    const r1 = large ? 6 : 3, r2 = large ? 12 : 6, dur = large ? 500 : 320;
    const inner = this.add.circle(x, y, r1, 0xffffff, 1).setDepth(15);
    const outer = this.add.circle(x, y, r2, 0xff6600, 0.85).setDepth(14);
    this.tweens.add({ targets: [inner, outer], scaleX: large ? 5 : 3.5, scaleY: large ? 5 : 3.5, alpha: 0, duration: dur, ease: 'Power2', onComplete: () => { inner.destroy(); outer.destroy(); } });
  }

  cleanup() {
    const m = 60;
    [this.bullets, this.enemyBullets, this.enemies, this.powerups].forEach(g => {
      g.getChildren().forEach(o => {
        if (!o.active) return;
        if (o.x < -m || o.x > W + m || o.y < -m || o.y > H + m) o.destroy();
      });
    });
  }

  // -------------------------------------------------------------------------
  triggerGameOver() {
    this.dead = true;
    stopMusic();
    sfx.playerDie();
    this.explodeAt(this.player.x, this.player.y, true);
    this.player.setVisible(false);
    this.clones.forEach(c => c.sprite.destroy());
    this.clones = [];

    let rank = -1;
    if (this.mode === 'endless') rank = saveScore(this.score);

    this.time.delayedCall(800, () => {
      this.add.rectangle(W / 2, H / 2, 280, 130, 0x000000, 0.88).setDepth(30);
      this.add.text(W / 2, H / 2 - 46, 'GAME  OVER', {
        fontFamily: 'Arial', fontSize: '20px', color: '#ff3344',
      }).setOrigin(0.5).setDepth(31);

      if (rank === 0) {
        this.add.text(W / 2, H / 2 - 26, '★ NOUVEAU RECORD ★', {
          fontFamily: 'Arial', fontSize: '8px', color: '#ffdd00',
        }).setOrigin(0.5).setDepth(31);
      }

      this.add.text(W / 2, H / 2 - 12, `SCORE  ${this.score}`, {
        fontFamily: 'Arial', fontSize: '12px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(31);

      if (this.mode === 'story') {
        this.add.text(W / 2, H / 2 + 4, `MONDE  ${this.worldIndex + 1}  ·  VAGUE  ${this.wave}`, {
          fontFamily: 'Arial', fontSize: '8px', color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(31);
      } else {
        this.add.text(W / 2, H / 2 + 4, `VAGUE  ${this.wave}`, {
          fontFamily: 'Arial', fontSize: '9px', color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(31);

        // Highscores
        const scores = loadScores();
        this.add.text(W / 2, H / 2 + 18, '— HIGHSCORES —', {
          fontFamily: 'Arial', fontSize: '6px', color: '#446688',
        }).setOrigin(0.5).setDepth(31);
        scores.slice(0, 5).forEach((s, i) => {
          this.add.text(W / 2, H / 2 + 28 + i * 10, `${i + 1}. ${s}`, {
            fontFamily: 'Arial', fontSize: '7px', color: i === rank ? '#ffdd00' : '#667788',
          }).setOrigin(0.5).setDepth(31);
        });
      }

      const hint = 'ESPACE / A : rejouer      ÉCHAP / B : menu';
      const hintY = this.mode === 'endless' ? H / 2 + 78 : H / 2 + 22;
      this.add.text(W / 2, hintY, hint, {
        fontFamily: 'Arial', fontSize: '9px', color: '#5a6e82',
      }).setOrigin(0.5).setDepth(31);

      this.gameOverReady = true;
    });
  }

  // -------------------------------------------------------------------------
  triggerWorldComplete() {
    this.worldDone = true;
    const next = this.worldIndex + 1;

    this.add.rectangle(W / 2, H / 2, 320, 80, 0x000000, 0.88).setDepth(30);
    this.add.text(W / 2, H / 2 - 22, `MONDE ${this.worldIndex + 1} TERMINÉ !`, {
      fontFamily: 'Arial', fontSize: '16px', color: '#00ff88',
    }).setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, H / 2 - 2, `SCORE  ${this.score}`, {
      fontFamily: 'Arial', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(31);

    if (next < 8) {
      this.time.delayedCall(3200, () => {
        this.scene.start('GameScene', { mode: 'story', world: next, score: this.score, weaponStack: this.weaponStack, cloneCount: this.clones.length });
      });
    } else {
      this.triggerVictory();
    }
  }

  triggerVictory() {
    this.add.text(W / 2, H / 2 + 28, '✦ VICTOIRE TOTALE ✦', {
      fontFamily: 'Arial', fontSize: '10px', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, H / 2 + 44, 'ÉCHAP / B : menu', {
      fontFamily: 'Arial', fontSize: '9px', color: '#667788',
    }).setOrigin(0.5).setDepth(31);

    this.victoryReady = true;
  }
}
