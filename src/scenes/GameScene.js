import Phaser from 'phaser';
import { generateAllSprites } from '../sprites.js';
import { sfx } from '../audio.js';

const W = 480, H = 270;
const PLAYER_SPEED = 180;

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

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // -------------------------------------------------------------------------
  preload() {
    generateAllSprites(this);
  }

  // -------------------------------------------------------------------------
  create() {
    this.stars = this.add.tileSprite(0, 0, W, H, 'stars').setOrigin(0, 0).setDepth(0);

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
    this.keys    = this.input.keyboard.addKeys('W,A,S,D,Z,R');

    // Game state
    this.score       = 0;
    this.lives       = 3;
    this.fireCD      = 0;
    this.invTimer    = 0;
    this.dead        = false;
    this.waveActive  = false;
    this.waveCanEnd  = false;
    this.wave        = 0;

    // Weapon stack — base GATLING is always implicit at bottom
    this.weaponStack = [];  // [{type, ammo, maxAmmo}], most recent = last

    // Enemy group tracking for powerup drops
    this.nextGroupId  = 1;
    this.enemyGroups  = {};  // id -> { total, killed, dropX, dropY, powerupType }
    this.powerupCycle = 0;   // alternates spread/plasma

    // HUD
    const hs = { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' };
    this.scoreTxt = this.add.text(W - 6, 6, 'SCORE 0', hs).setOrigin(1, 0).setDepth(20);
    this.livesTxt = this.add.text(6, 6, '♥ ♥ ♥', { ...hs, color: '#ff4455' }).setOrigin(0, 0).setDepth(20);

    this.createWeaponHUD();

    this.time.delayedCall(800, () => this.startWave());
  }

  // -------------------------------------------------------------------------
  createWeaponHUD() {
    // 4 slots, bottom-right corner, slot 0 = current (bottom), slot N = oldest (top)
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
    // Build full display list — base first, then stack, reversed so index 0 = current
    const fullStack = [
      { type: 'gatling', ammo: Infinity, maxAmmo: Infinity },
      ...this.weaponStack,
    ];
    const display = fullStack.slice().reverse(); // display[0] = most recent = current

    this.weaponSlots.forEach((slot, i) => {
      if (i >= display.length) {
        [slot.bg, slot.icon, slot.name, slot.barBg, slot.bar, slot.inf].forEach(o => o.setVisible(false));
        return;
      }
      const w = display[i];
      const isCurrent = (i === 0);
      const alpha = isCurrent ? 1 : 0.45;

      slot.bg.setAlpha(isCurrent ? 0.55 : 0.25).setVisible(true);
      slot.icon.setFillStyle(WEAPON_COLORS[w.type]).setAlpha(alpha).setVisible(true);
      slot.name.setText(WEAPON_NAMES[w.type]).setAlpha(alpha)
               .setStyle({ fontSize: isCurrent ? '8px' : '7px', color: '#ffffff' })
               .setVisible(true);

      if (w.ammo === Infinity) {
        slot.barBg.setVisible(false);
        slot.bar.setVisible(false);
        slot.inf.setAlpha(alpha).setVisible(true);
      } else {
        const ratio = Math.max(0, w.ammo / w.maxAmmo);
        const bw = Math.max(1, Math.round(33 * ratio));
        const col = ratio > 0.5 ? 0x33cc33 : ratio > 0.25 ? 0xddcc00 : 0xdd2200;
        slot.barBg.setAlpha(alpha).setVisible(true);
        slot.bar.setSize(bw, 4).setFillStyle(col).setAlpha(alpha).setVisible(true);
        slot.inf.setVisible(false);
      }
    });
  }

  // -------------------------------------------------------------------------
  getCurrentWeaponType() {
    if (this.weaponStack.length === 0) return 'gatling';
    return this.weaponStack[this.weaponStack.length - 1].type;
  }

  consumeAmmo() {
    if (this.weaponStack.length === 0) return;
    const top = this.weaponStack[this.weaponStack.length - 1];
    top.ammo--;
    if (top.ammo <= 0) {
      this.weaponStack.pop();
    }
    this.updateWeaponHUD();
  }

  // -------------------------------------------------------------------------
  update(time, delta) {
    if (this.dead) return;

    this.stars.tilePositionX += 0.6;

    this.handleMovement();
    this.handleFire(delta);
    this.updateEnemies(time, delta);
    this.tickInvincibility(delta);
    this.cleanup();

    if (this.waveActive && this.waveCanEnd && this.enemies.countActive(true) === 0) {
      this.waveActive = false;
      this.time.delayedCall(2200, () => this.startWave());
    }
  }

  // -------------------------------------------------------------------------
  handleMovement() {
    const left  = this.cursors.left.isDown  || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up    = this.cursors.up.isDown    || this.keys.W.isDown;
    const down  = this.cursors.down.isDown  || this.keys.S.isDown;

    this.player.setVelocity(
      left ? -PLAYER_SPEED : right ? PLAYER_SPEED : 0,
      up   ? -PLAYER_SPEED : down  ? PLAYER_SPEED : 0,
    );
    this.player.x = Phaser.Math.Clamp(this.player.x, 20, W * 0.45);
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, H - 16);
  }

  handleFire(delta) {
    this.fireCD -= delta;
    const firing = this.cursors.space.isDown || this.keys.Z.isDown;
    if (firing && this.fireCD <= 0) {
      this.fire();
      this.fireCD = FIRE_CONFIG[this.getCurrentWeaponType()].cooldown;
    }
  }

  fire() {
    const x = this.player.x + this.player.width * 0.45;
    const y = this.player.y;

    switch (this.getCurrentWeaponType()) {
      case 'gatling':
        this.spawnBullet(x, y, 620, 0, 'bullet1');
        sfx.shoot1();
        break;
      case 'spread':
        this.spawnBullet(x, y, 520, -0.32, 'bullet2');
        this.spawnBullet(x, y, 520,  0,    'bullet2');
        this.spawnBullet(x, y, 520,  0.32, 'bullet2');
        sfx.shoot2();
        break;
      case 'plasma':
        this.spawnBullet(x, y, 360, 0, 'bullet3');
        sfx.shoot3();
        break;
    }
    this.consumeAmmo();
  }

  spawnBullet(x, y, speed, angle, key) {
    const b = this.bullets.create(x, y, key);
    if (!b) return;
    b.setDepth(8).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  // -------------------------------------------------------------------------
  startWave() {
    this.wave++;
    this.waveActive = true;
    this.waveCanEnd = false;

    const schedule = this.buildWaveSchedule();
    const lastDelay = schedule.reduce((m, s) => Math.max(m, s.delay), 0);

    schedule.forEach(({ type, delay, groupId }) => {
      this.time.delayedCall(delay, () => {
        if (this.dead) return;
        const e = this.spawnEnemy(type);
        if (groupId !== undefined) e.groupId = groupId;
      });
    });

    // Wave can only end 1s after the last enemy has spawned
    this.time.delayedCall(lastDelay + 1000, () => { this.waveCanEnd = true; });
  }

  buildWaveSchedule() {
    const w = this.wave;
    const schedule = [];
    let t = 300;

    const single = (type, gap = 450) => {
      schedule.push({ type, delay: t });
      t += gap;
    };

    const group = (type) => {
      const gid = this.nextGroupId++;
      const pType = this.powerupCycle % 2 === 0 ? 'spread' : 'plasma';
      this.powerupCycle++;
      this.enemyGroups[gid] = { total: 4, killed: 0, dropX: W / 2, dropY: H / 2, powerupType: pType };
      for (let i = 0; i < 4; i++) {
        schedule.push({ type, delay: t, groupId: gid });
        t += 320;
      }
      t += 300;
    };

    // Wave composition ramps up with wave number
    if (w === 1) {
      // Intro: one group of 4 type-1 → guaranteed first powerup
      group(1);
      single(1); single(1);
    } else if (w === 2) {
      single(1); single(1);
      group(1);
      single(2);
    } else if (w === 3) {
      group(2);
      single(1); single(1); single(1);
      single(2);
    } else {
      // General escalation
      const n1 = Math.min(2 + w, 8);
      for (let i = 0; i < n1; i++) single(1);

      group(w <= 5 ? 1 : 2);

      const n2 = Math.min(Math.floor(w / 2), 5);
      for (let i = 0; i < n2; i++) single(2, 500);

      if (w >= 4) {
        group(2);
      }

      if (w >= 5) {
        const n3 = Math.min(Math.floor((w - 3) / 2), 3);
        for (let i = 0; i < n3; i++) single(3, 700);
      }

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
    bullet.destroy();
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
  }

  trackGroupKill(enemy) {
    if (enemy.groupId === undefined) return;
    const g = this.enemyGroups[enemy.groupId];
    if (!g) return;
    g.killed++;
    g.dropX = enemy.x;
    g.dropY = enemy.y;
    if (g.killed >= g.total) {
      this.spawnPowerup(g.dropX, g.dropY, g.powerupType);
      delete this.enemyGroups[enemy.groupId];
    }
  }

  spawnPowerup(x, y, type) {
    const key = `pu_${type}`;
    const p = this.powerups.create(x, y, key);
    if (!p) return;
    p.setDepth(11);
    p.powerupType = type;
    p.setVelocity(-55, Phaser.Math.Between(-25, 25));

    // Gentle bob
    this.tweens.add({
      targets: p,
      y: y + 12,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtle glow pulse via scale
    this.tweens.add({
      targets: p,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  onPickupPowerup(player, powerup) {
    const type = powerup.powerupType;
    const px = powerup.x, py = powerup.y;
    powerup.destroy();

    this.weaponStack.push({ type, ammo: AMMO[type], maxAmmo: AMMO[type] });
    this.updateWeaponHUD();
    sfx.pickup();

    // Popup text
    const label = type === 'spread' ? '+SPREAD' : '+PLASMA';
    const col   = type === 'spread' ? '#55eeff' : '#ffcc00';
    const popup = this.add.text(px, py - 8, label, {
      fontFamily: 'monospace', fontSize: '9px', color: col,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: popup, y: py - 30, alpha: 0, duration: 900,
      onComplete: () => popup.destroy(),
    });
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
    this.tweens.add({
      targets: this.player, alpha: 0.2, duration: 80,
      yoyo: true, repeat: 12,
      onComplete: () => this.player.setAlpha(1),
    });
  }

  tickInvincibility(delta) {
    if (this.invTimer > 0) this.invTimer -= delta;
  }

  // -------------------------------------------------------------------------
  explodeAt(x, y, large) {
    const r1 = large ? 6 : 3, r2 = large ? 12 : 6, dur = large ? 500 : 320;
    const inner = this.add.circle(x, y, r1, 0xffffff, 1).setDepth(15);
    const outer = this.add.circle(x, y, r2, 0xff6600, 0.85).setDepth(14);
    this.tweens.add({
      targets: [inner, outer],
      scaleX: large ? 5 : 3.5, scaleY: large ? 5 : 3.5,
      alpha: 0, duration: dur, ease: 'Power2',
      onComplete: () => { inner.destroy(); outer.destroy(); },
    });
  }

  // -------------------------------------------------------------------------
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

    this.time.delayedCall(800, () => {
      this.add.rectangle(W / 2, H / 2, 220, 90, 0x000000, 0.85).setDepth(30);
      this.add.text(W / 2, H / 2 - 26, 'GAME  OVER', {
        fontFamily: 'monospace', fontSize: '20px', color: '#ff3344',
      }).setOrigin(0.5).setDepth(31);
      this.add.text(W / 2, H / 2 + 2, `SCORE  ${this.score}`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(31);
      this.add.text(W / 2, H / 2 + 18, `WAVE  ${this.wave}`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(31);
      this.add.text(W / 2, H / 2 + 36, 'PRESS  R  TO  RESTART', {
        fontFamily: 'monospace', fontSize: '8px', color: '#666688',
      }).setOrigin(0.5).setDepth(31);

      this.input.keyboard.once('keydown-R', () => this.scene.restart());
    });
  }
}
