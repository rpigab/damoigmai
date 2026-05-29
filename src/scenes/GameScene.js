import Phaser from 'phaser';
import { sfx } from '../audio.js';
import { WORLD_NAMES, createWorldBackground } from '../backgrounds.js';

const W = 480, H = 270;
const PLAYER_SPEED   = 180;
const WAVES_PER_WORLD = 3;

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
const WEAPON_NAMES  = { gatling: 'GATLING', spread: 'SPREAD ', plasma: 'PLASMA ' };

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

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys    = this.input.keyboard.addKeys('W,A,S,D,Z,R,Q,M');
    this.ctrlKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);

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

    this.weaponStack = [];
    this.clones      = [];
    this.cloneGroup  = this.physics.add.group();
    this.padCloneBtn = false;

    this.input.gamepad.on('connected', () => {
      const t = this.add.text(W / 2, 40, 'MANETTE CONNECTÉE', {
        fontFamily: 'monospace', fontSize: '8px', color: '#88ff88',
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: t, y: 20, alpha: 0, duration: 2500, onComplete: () => t.destroy() });
    });

    this.physics.add.overlap(this.enemyBullets, this.cloneGroup, this.onEnemyBulletHitClone, null, this);
    this.physics.add.overlap(this.cloneGroup,   this.powerups,   this.onPickupPowerup,        null, this);

    this.nextGroupId  = 1;
    this.enemyGroups  = {};
    this.powerupCycle = 0;

    // Gamepad tracking for game-over screen
    this._goA = false; this._goB = false; this._goStart = false; this._goBack = false;

    // HUD
    const hs = { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' };
    this.scoreTxt = this.add.text(W - 6, 6, `SCORE ${this.score}`, hs).setOrigin(1, 0).setDepth(20);
    this.livesTxt = this.add.text(6, 6, '♥ ♥ ♥', { ...hs, color: '#ff4455' }).setOrigin(0, 0).setDepth(20);

    if (this.mode === 'story') {
      this.worldTxt = this.add.text(W / 2, 6, `M${this.worldIndex + 1} ${WORLD_NAMES[this.worldIndex]}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#aaddee',
      }).setOrigin(0.5, 0).setDepth(20);
    }

    this.createWeaponHUD();

    if (this.mode === 'story') {
      this.showWorldIntro(() => this.startWave());
    } else {
      this.time.delayedCall(800, () => this.startWave());
    }
  }

  // -------------------------------------------------------------------------
  showWorldIntro(callback) {
    const bg  = this.add.rectangle(W / 2, H / 2, 300, 72, 0x000000, 0.82).setDepth(30);
    const t1  = this.add.text(W / 2, H / 2 - 16, `MONDE ${this.worldIndex + 1}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#00eeff',
    }).setOrigin(0.5).setDepth(31);
    const t2  = this.add.text(W / 2, H / 2 + 8, WORLD_NAMES[this.worldIndex], {
      fontFamily: 'monospace', fontSize: '11px', color: '#aaddee',
    }).setOrigin(0.5).setDepth(31);

    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: [bg, t1, t2], alpha: 0, duration: 500,
        onComplete: () => { bg.destroy(); t1.destroy(); t2.destroy(); callback(); },
      });
    });
  }

  // -------------------------------------------------------------------------
  createWeaponHUD() {
    this.weaponSlots = [];
    for (let i = 0; i < 4; i++) {
      const ry = H - 10 - i * 16;
      const x0 = W - 104;
      const bg   = this.add.rectangle(x0 + 48, ry, 98, 13, 0x000000, 0.4).setOrigin(0.5).setDepth(19);
      const icon = this.add.rectangle(x0 + 4, ry, 8, 8, 0xffffff).setOrigin(0.5).setDepth(20);
      const name = this.add.text(x0 + 12, ry, '', {
        fontFamily: 'monospace', fontSize: '7px', color: '#ffffff',
      }).setOrigin(0, 0.5).setDepth(20);
      const barBg = this.add.rectangle(x0 + 57, ry, 33, 4, 0x222233).setOrigin(0, 0.5).setDepth(20);
      const bar   = this.add.rectangle(x0 + 57, ry, 33, 4, 0x44cc44).setOrigin(0, 0.5).setDepth(20);
      const inf   = this.add.text(x0 + 57, ry, '∞', {
        fontFamily: 'monospace', fontSize: '8px', color: '#666666',
      }).setOrigin(0, 0.5).setDepth(20);
      [bg, icon, name, barBg, bar, inf].forEach(o => o.setVisible(false));
      this.weaponSlots.push({ bg, icon, name, barBg, bar, inf });
    }
    this.updateWeaponHUD();
  }

  updateWeaponHUD() {
    const fullStack = [{ type: 'gatling', ammo: Infinity, maxAmmo: Infinity }, ...this.weaponStack];
    const display   = fullStack.slice().reverse();
    this.weaponSlots.forEach((slot, i) => {
      if (i >= display.length) {
        [slot.bg, slot.icon, slot.name, slot.barBg, slot.bar, slot.inf].forEach(o => o.setVisible(false));
        return;
      }
      const w = display[i], isCurrent = (i === 0), alpha = isCurrent ? 1 : 0.45;
      slot.bg.setAlpha(isCurrent ? 0.55 : 0.25).setVisible(true);
      slot.icon.setFillStyle(WEAPON_COLORS[w.type]).setAlpha(alpha).setVisible(true);
      slot.name.setText(WEAPON_NAMES[w.type]).setAlpha(alpha)
               .setStyle({ fontFamily: 'monospace', fontSize: isCurrent ? '8px' : '7px', color: '#ffffff' })
               .setVisible(true);
      if (w.ammo === Infinity) {
        slot.barBg.setVisible(false); slot.bar.setVisible(false);
        slot.inf.setAlpha(alpha).setVisible(true);
      } else {
        const ratio = Math.max(0, w.ammo / w.maxAmmo);
        const bw    = Math.max(1, Math.round(33 * ratio));
        const col   = ratio > 0.5 ? 0x33cc33 : ratio > 0.25 ? 0xddcc00 : 0xdd2200;
        slot.barBg.setAlpha(alpha).setVisible(true);
        slot.bar.setSize(bw, 4).setFillStyle(col).setAlpha(alpha).setVisible(true);
        slot.inf.setVisible(false);
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
      return;
    }

    if (this.dead) {
      this.handleGameOverPad();
      return;
    }

    this.handleMovement();
    this.updateClones();
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

  handleGameOverPad() {
    if (!this.gameOverReady) return;
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

    const left  = this.cursors.left.isDown  || this.keys.A.isDown || (pad?.buttons[14]?.pressed ?? false) || gx < 0;
    const right = this.cursors.right.isDown || this.keys.D.isDown || (pad?.buttons[15]?.pressed ?? false) || gx > 0;
    const up    = this.cursors.up.isDown    || this.keys.W.isDown || (pad?.buttons[12]?.pressed ?? false) || gy < 0;
    const down  = this.cursors.down.isDown  || this.keys.S.isDown || (pad?.buttons[13]?.pressed ?? false) || gy > 0;

    let vx = left ? -PLAYER_SPEED : right ? PLAYER_SPEED : 0;
    let vy = up   ? -PLAYER_SPEED : down  ? PLAYER_SPEED : 0;
    if (gx !== 0) vx = gx * PLAYER_SPEED;
    if (gy !== 0) vy = gy * PLAYER_SPEED;

    this.player.setVelocity(vx, vy);
    this.player.x = Phaser.Math.Clamp(this.player.x, 20, W - 20);
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, H - 16);

    const yNow = pad?.buttons[3]?.pressed ?? false;
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q) || (yNow && !this.padCloneBtn)) {
      this.tryInvokeClone();
    }
    this.padCloneBtn = yNow;
  }

  handleFire(delta) {
    this.fireCD -= delta;
    const pad     = this.input.gamepad?.pad1 ?? null;
    const padFire = (pad?.buttons[7]?.value ?? 0) > 0.1 || (pad?.buttons[0]?.pressed ?? false);
    const firing  = this.cursors.space.isDown || this.keys.Z.isDown || padFire;
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
      this.tweens.add({ targets: this.weaponSlots[0].bg, fillColor: 0xff0000, duration: 80, yoyo: true });
      return;
    }
    this.weaponStack.splice(this.weaponStack.length - 2, 2);
    this.updateWeaponHUD();
    this.addClone(this.clones.length + 1);
    sfx.summon();
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

  updateClones() {
    if (this.clones.length === 0) return;
    const pad      = this.input.gamepad?.pad1 ?? null;
    const decoupled = this.ctrlKey.isDown || (pad?.buttons[6]?.value ?? 0) > 0.1;
    const b = this.clones[0];
    if (decoupled) { b.offsetX = b.sprite.x - this.player.x; b.offsetY = b.sprite.y - this.player.y; }
    else { b.sprite.x = this.player.x + b.offsetX; b.sprite.y = this.player.y + b.offsetY; }
    if (this.clones.length >= 2) {
      const c = this.clones[1];
      const bx = b.sprite.x - this.player.x, by = b.sprite.y - this.player.y;
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
      this.scoreTxt.setText(`SCORE ${this.score}`);
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
      fontFamily: 'monospace', fontSize: '9px', color: type === 'spread' ? '#55eeff' : '#ffcc00',
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
        fontFamily: 'monospace', fontSize: '20px', color: '#ff3344',
      }).setOrigin(0.5).setDepth(31);

      if (rank === 0) {
        this.add.text(W / 2, H / 2 - 26, '★ NOUVEAU RECORD ★', {
          fontFamily: 'monospace', fontSize: '8px', color: '#ffdd00',
        }).setOrigin(0.5).setDepth(31);
      }

      this.add.text(W / 2, H / 2 - 12, `SCORE  ${this.score}`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(31);

      if (this.mode === 'story') {
        this.add.text(W / 2, H / 2 + 4, `MONDE  ${this.worldIndex + 1}  ·  VAGUE  ${this.wave}`, {
          fontFamily: 'monospace', fontSize: '8px', color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(31);
      } else {
        this.add.text(W / 2, H / 2 + 4, `VAGUE  ${this.wave}`, {
          fontFamily: 'monospace', fontSize: '9px', color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(31);

        // Highscores
        const scores = loadScores();
        this.add.text(W / 2, H / 2 + 18, '— HIGHSCORES —', {
          fontFamily: 'monospace', fontSize: '6px', color: '#446688',
        }).setOrigin(0.5).setDepth(31);
        scores.slice(0, 5).forEach((s, i) => {
          this.add.text(W / 2, H / 2 + 28 + i * 10, `${i + 1}. ${s}`, {
            fontFamily: 'monospace', fontSize: '7px', color: i === rank ? '#ffdd00' : '#667788',
          }).setOrigin(0.5).setDepth(31);
        });
      }

      const hint = this.mode === 'story'
        ? 'R/A : recommencer    M/B : menu'
        : 'R/A : rejouer       M/B : menu';
      const hintY = this.mode === 'endless' ? H / 2 + 78 : H / 2 + 22;
      this.add.text(W / 2, hintY, hint, {
        fontFamily: 'monospace', fontSize: '6px', color: '#445566',
      }).setOrigin(0.5).setDepth(31);

      this.input.keyboard.once('keydown-R', () => { if (this.gameOverReady) { this.gameOverReady = false; this.doRestart(); } });
      this.input.keyboard.once('keydown-M', () => { if (this.gameOverReady) { this.gameOverReady = false; this.scene.start('MenuScene'); } });
      this.gameOverReady = true;
    });
  }

  // -------------------------------------------------------------------------
  triggerWorldComplete() {
    this.worldDone = true;
    const next = this.worldIndex + 1;

    this.add.rectangle(W / 2, H / 2, 320, 80, 0x000000, 0.88).setDepth(30);
    this.add.text(W / 2, H / 2 - 22, `MONDE ${this.worldIndex + 1} TERMINÉ !`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#00ff88',
    }).setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, H / 2 - 2, `SCORE  ${this.score}`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(31);

    if (next < 8) {
      this.add.text(W / 2, H / 2 + 16, `PROCHAIN : ${WORLD_NAMES[next]}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#aaddcc',
      }).setOrigin(0.5).setDepth(31);
      this.time.delayedCall(3200, () => {
        this.scene.start('GameScene', { mode: 'story', world: next, score: this.score });
      });
    } else {
      this.triggerVictory();
    }
  }

  triggerVictory() {
    this.add.text(W / 2, H / 2 + 28, '✦ VICTOIRE TOTALE ✦', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, H / 2 + 44, 'M / B : menu', {
      fontFamily: 'monospace', fontSize: '7px', color: '#667788',
    }).setOrigin(0.5).setDepth(31);

    this.input.keyboard.once('keydown-M', () => this.scene.start('MenuScene'));
    this._victoryPad = true;
  }
}
