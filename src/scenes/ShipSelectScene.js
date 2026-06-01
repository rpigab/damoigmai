import Phaser from 'phaser';
import { createWorldBackground } from '../backgrounds.js';
import { installKeyboard, justDown } from '../input.js';
import { SHIPS, getSelectedShipIndex, setSelectedShipIndex } from '../shipState.js';

const W = 480, H = 270;

// Spacing for the thumbnail row
const THUMB_SCALE  = 0.45;   // 64 * 0.45 ≈ 29px per thumb
const THUMB_PITCH  = 36;     // horizontal distance between thumb centres
const THUMB_Y      = 232;
const PREVIEW_Y    = 118;
const PREVIEW_SCALE = 1.6;  // 64 * 1.6 = 102px — large enough to read detail

export default class ShipSelectScene extends Phaser.Scene {
  constructor() { super('ShipSelectScene'); }

  create() {
    installKeyboard();
    this.bgLayers = createWorldBackground(this, 0);

    // Start from previously selected index, defaulting to 0
    this.idx = getSelectedShipIndex() ?? 0;

    this.add.text(W / 2, 14, 'VAISSEAU', {
      fontFamily: 'Arial', fontSize: '18px', color: '#00ccff',
    }).setOrigin(0.5).setDepth(10);

    // Build thumbnail row — centred
    const totalW = (SHIPS.length - 1) * THUMB_PITCH;
    this.thumbStartX = W / 2 - totalW / 2;

    this.thumbBgs = [];
    this.thumbImgs = [];
    this.thumbErrors = []; // fallback squares for failed loads

    SHIPS.forEach((ship, i) => {
      const tx = this.thumbStartX + i * THUMB_PITCH;

      const bg = this.add.rectangle(tx, THUMB_Y, 31, 31, 0x001133, 0.7)
        .setDepth(9).setStrokeStyle(1, 0x224466, 1);
      this.thumbBgs.push(bg);

      const textureKey = ship.key;
      if (this.textures.exists(textureKey)) {
        const img = this.add.image(tx, THUMB_Y, textureKey)
          .setScale(THUMB_SCALE).setDepth(10);
        this.thumbImgs.push(img);
        this.thumbErrors.push(null);
      } else {
        // Texture failed to load — draw a coloured square as fallback
        const g = this.add.graphics().setDepth(10);
        g.fillStyle(0x334466, 1);
        g.fillRect(tx - 14, THUMB_Y - 14, 28, 28);
        this.thumbImgs.push(null);
        this.thumbErrors.push(g);
      }
    });

    // Large preview
    this.previewImg   = null;
    this.previewError = null;
    this.previewBg = this.add.rectangle(W / 2, PREVIEW_Y, 110, 110, 0x001133, 0.5)
      .setDepth(9).setStrokeStyle(1, 0x00ccff, 0.6);

    // Ship name
    this.nameTxt = this.add.text(W / 2, PREVIEW_Y + 62, '', {
      fontFamily: 'Arial', fontSize: '12px', color: '#00eeff',
    }).setOrigin(0.5).setDepth(10);

    // "Aucun vaisseau" option (use procedural sprite)
    this.noneLabel = this.add.text(W / 2, PREVIEW_Y + 76, '', {
      fontFamily: 'Arial', fontSize: '8px', color: '#445566',
    }).setOrigin(0.5).setDepth(10);

    // Footer
    this.add.text(W / 2, H - 12, '◄ ►  choisir      ESPACE / A : confirmer      ÉCHAP : retour', {
      fontFamily: 'Arial', fontSize: '9px', color: '#445566',
    }).setOrigin(0.5).setDepth(10);

    // "Aucun" option hint at top-left
    this.add.text(8, H - 12, 'AUCUN : sprite auto', {
      fontFamily: 'Arial', fontSize: '8px', color: '#334455',
    }).setOrigin(0, 1).setDepth(10);

    // Gamepad edge tracking
    const pad = this.input.gamepad?.pad1 ?? null;
    this._padL = (pad?.buttons[14]?.pressed ?? false) || (pad?.axes[0]?.getValue() ?? 0) < -0.5;
    this._padR = (pad?.buttons[15]?.pressed ?? false) || (pad?.axes[0]?.getValue() ?? 0) > 0.5;
    this._padB = pad?.buttons[1]?.pressed ?? false;
    this._padA = pad?.buttons[0]?.pressed ?? false;

    this.refreshView();
  }

  refreshView() {
    // Highlight selected thumbnail
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

    // Update large preview
    if (this.previewImg)   { this.previewImg.destroy();   this.previewImg   = null; }
    if (this.previewError) { this.previewError.destroy(); this.previewError = null; }

    const ship = SHIPS[this.idx];
    this.nameTxt.setText(ship.name);

    if (this.textures.exists(ship.key)) {
      this.previewImg = this.add.image(W / 2, PREVIEW_Y, ship.key)
        .setScale(PREVIEW_SCALE).setDepth(10);
    } else {
      // Fallback: coloured square with key name
      const g = this.add.graphics().setDepth(10);
      g.fillStyle(0x224466, 1);
      g.fillRect(W / 2 - 40, PREVIEW_Y - 40, 80, 80);
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

    if (back) { this.scene.start('MenuScene'); return; }

    if (left)  { this.idx = (this.idx - 1 + SHIPS.length) % SHIPS.length; this.refreshView(); }
    if (right) { this.idx = (this.idx + 1) % SHIPS.length; this.refreshView(); }

    if (confirm) {
      setSelectedShipIndex(this.idx);
      this.scene.start('MenuScene');
    }
  }
}
