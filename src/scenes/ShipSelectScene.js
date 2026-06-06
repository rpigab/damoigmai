import Phaser from 'phaser';
import { createWorldBackground } from '../backgrounds.js';
import { installKeyboard, justDown } from '../input.js';
import { SHIPS, getSelectedShipIndex, setSelectedShipIndex } from '../shipState.js';

const W = 480, H = 270;

const THUMB_SCALE  = 0.45;
const THUMB_PITCH  = 36;
const THUMB_Y      = 225;
const PREVIEW_Y    = 112;
const PREVIEW_SCALE = 1.6;

export default class ShipSelectScene extends Phaser.Scene {
  constructor() { super('ShipSelectScene'); }

  create() {
    installKeyboard();
    this.bgLayers = createWorldBackground(this, 0);
    this.idx = getSelectedShipIndex() ?? 0;

    this.add.text(W / 2, 14, 'VAISSEAU', {
      fontFamily: 'Arial', fontSize: '18px', color: '#00ccff',
    }).setOrigin(0.5).setDepth(10);

    // Thumbnail row
    const totalW = (SHIPS.length - 1) * THUMB_PITCH;
    this.thumbStartX = W / 2 - totalW / 2;
    this.thumbBgs = []; this.thumbImgs = []; this.thumbErrors = [];

    SHIPS.forEach((ship, i) => {
      const tx = this.thumbStartX + i * THUMB_PITCH;
      const bg = this.add.rectangle(tx, THUMB_Y, 31, 31, 0x001133, 0.7)
        .setDepth(9).setStrokeStyle(1, 0x224466, 1);
      this.thumbBgs.push(bg);

      if (this.textures.exists(ship.key)) {
        this.thumbImgs.push(this.add.image(tx, THUMB_Y, ship.key).setScale(THUMB_SCALE).setDepth(10));
        this.thumbErrors.push(null);
      } else {
        const g = this.add.graphics().setDepth(10);
        g.fillStyle(0x334466, 1); g.fillRect(tx - 14, THUMB_Y - 14, 28, 28);
        this.thumbImgs.push(null); this.thumbErrors.push(g);
      }

      // Tap to select
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => { this.idx = i; this.refreshView(); });
    });

    // Large preview
    this.previewImg = null; this.previewError = null;
    this.previewBg = this.add.rectangle(W / 2, PREVIEW_Y, 110, 110, 0x001133, 0.5)
      .setDepth(9).setStrokeStyle(1, 0x00ccff, 0.6);
    this.nameTxt = this.add.text(W / 2, PREVIEW_Y + 62, '', {
      fontFamily: 'Arial', fontSize: '12px', color: '#00eeff',
    }).setOrigin(0.5).setDepth(10);
    this.noneLabel = this.add.text(W / 2, PREVIEW_Y + 76, '', {
      fontFamily: 'Arial', fontSize: '8px', color: '#445566',
    }).setOrigin(0.5).setDepth(10);

    // ── Touch-friendly buttons ──────────────────────────────────────────────
    this._makeBtn(60, H - 16, '← Retour', 0x001133, 0x334455, () => {
      this.scene.start('MenuScene');
    });
    this._makeBtn(W - 60, H - 16, '✓ Confirmer', 0x003322, 0x00aa55, () => {
      setSelectedShipIndex(this.idx);
      this.scene.start('MenuScene');
    });

    // Keyboard hint
    this.add.text(W / 2, H - 16, '◄ ► choisir   A : confirmer', {
      fontFamily: 'Arial', fontSize: '8px', color: '#334455',
    }).setOrigin(0.5).setDepth(10);

    const pad = this.input.gamepad?.pad1 ?? null;
    this._padL = (pad?.buttons[14]?.pressed ?? false) || (pad?.axes[0]?.getValue() ?? 0) < -0.5;
    this._padR = (pad?.buttons[15]?.pressed ?? false) || (pad?.axes[0]?.getValue() ?? 0) > 0.5;
    this._padB = pad?.buttons[1]?.pressed ?? false;
    this._padA = pad?.buttons[0]?.pressed ?? false;

    this.refreshView();
  }

  // Draws a small rounded button with label and fires cb on tap/click.
  _makeBtn(cx, cy, label, fillHex, strokeHex, cb) {
    const w = label.length * 5.5 + 14, h = 18;
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(fillHex, 0.85); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 4);
    g.lineStyle(1, strokeHex, 0.8); g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 4);
    const zone = this.add.zone(cx, cy, w + 6, h + 6).setDepth(11).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', cb);
    this.add.text(cx, cy, label, {
      fontFamily: 'Arial', fontSize: '8px', color: '#aaccbb',
    }).setOrigin(0.5).setDepth(11);
  }

  refreshView() {
    this.thumbBgs.forEach((bg, i) => {
      const sel = i === this.idx;
      bg.setFillStyle(sel ? 0x003366 : 0x001133, sel ? 0.9 : 0.7);
      bg.setStrokeStyle(sel ? 1.5 : 1, sel ? 0x00ccff : 0x224466, 1);
    });
    this.thumbImgs.forEach((img, i) => {
      if (!img) return;
      img.setScale(i === this.idx ? THUMB_SCALE * 1.15 : THUMB_SCALE);
      img.setAlpha(i === this.idx ? 1 : 0.6);
    });

    if (this.previewImg)   { this.previewImg.destroy();   this.previewImg   = null; }
    if (this.previewError) { this.previewError.destroy(); this.previewError = null; }

    const ship = SHIPS[this.idx];
    this.nameTxt.setText(ship.name);

    if (this.textures.exists(ship.key)) {
      this.previewImg = this.add.image(W / 2, PREVIEW_Y, ship.key).setScale(PREVIEW_SCALE).setDepth(10);
    } else {
      const g = this.add.graphics().setDepth(10);
      g.fillStyle(0x224466, 1); g.fillRect(W / 2 - 40, PREVIEW_Y - 40, 80, 80);
      this.previewError = g;
      this.nameTxt.setText(ship.name + '\n(sprite manquant)');
    }
  }

  update() {
    this.bgLayers.forEach(l => { l.sprite.tilePositionX += l.speedX; });

    const pad = this.input.gamepad?.pad1 ?? null;
    const padL = (pad?.buttons[14]?.pressed ?? false) || (pad?.axes[0]?.getValue() ?? 0) < -0.5;
    const padR = (pad?.buttons[15]?.pressed ?? false) || (pad?.axes[0]?.getValue() ?? 0) > 0.5;
    const padB = pad?.buttons[1]?.pressed ?? false;
    const padA = pad?.buttons[0]?.pressed ?? false;

    const left    = justDown('ArrowLeft')  || (padL && !this._padL);
    const right   = justDown('ArrowRight') || (padR && !this._padR);
    const confirm = justDown('Space') || justDown('Enter') || (padA && !this._padA);
    const back    = justDown('Escape') || justDown('Backspace') || (padB && !this._padB);

    this._padL = padL; this._padR = padR; this._padB = padB; this._padA = padA;

    if (back)  { this.scene.start('MenuScene'); return; }
    if (left)  { this.idx = (this.idx - 1 + SHIPS.length) % SHIPS.length; this.refreshView(); }
    if (right) { this.idx = (this.idx + 1) % SHIPS.length; this.refreshView(); }
    if (confirm) { setSelectedShipIndex(this.idx); this.scene.start('MenuScene'); }
  }
}
