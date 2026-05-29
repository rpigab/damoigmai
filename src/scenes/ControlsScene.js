import Phaser from 'phaser';
import { createWorldBackground } from '../backgrounds.js';
import { installKeyboard, justDown } from '../input.js';

const W = 480, H = 270;

export default class ControlsScene extends Phaser.Scene {
  constructor() { super('ControlsScene'); }

  create() {
    installKeyboard();
    this.bgLayers = createWorldBackground(this, 0);

    this.page = 0;
    this.pageObjects = [[], []];

    this.add.text(W / 2, 20, 'CONTRÔLES', {
      fontFamily: 'Arial', fontSize: '22px', color: '#00ccff',
    }).setOrigin(0.5).setDepth(10);

    this.buildGamepadPage();
    this.buildKeyboardPage();

    // Footer hint — kept large enough to stay legible once upscaled.
    this.add.text(W / 2, H - 12, '◄ ►  changer de page      ÉCHAP : retour', {
      fontFamily: 'Arial', fontSize: '11px', color: '#6688aa',
    }).setOrigin(0.5).setDepth(10);

    // Gamepad edge-tracking
    this._padL = false; this._padR = false; this._padB = false;
    this._padA = false; this._padLB = false; this._padRB = false;

    this.showPage(0);
  }

  // -------------------------------------------------------------------------
  buildGamepadPage() {
    const objs = this.pageObjects[0];
    const push = o => { objs.push(o); return o; };

    push(this.add.text(W / 2, 42, 'MANETTE (XBOX)', {
      fontFamily: 'Arial', fontSize: '11px', color: '#aaddee',
    }).setOrigin(0.5).setDepth(10));

    const cx = W / 2, cy = 132;
    this.drawController(push, cx, cy);

    // label = { text, color, anchor:{x,y} on the pad, side:'left'|'right', ty }
    const labels = [
      { t: 'Stick G — déplacement', anchor: [cx - 38, cy - 4],  side: 'left',  ty: 70 },
      { t: 'Croix — déplacement',   anchor: [cx - 24, cy + 16], side: 'left',  ty: 96 },
      { t: 'Select — plein écran',  anchor: [cx - 11, cy - 2],  side: 'left',  ty: 122 },
      { t: 'LB — sacrifier : +Vie', anchor: [cx - 52, cy - 30], side: 'left',  ty: 148 },
      { t: 'Stick D — clone',       anchor: [cx + 20, cy + 16], side: 'right', ty: 70 },
      { t: 'Y — invoquer clone',    anchor: [cx + 40, cy - 14], side: 'right', ty: 96 },
      { t: 'Start — pause',         anchor: [cx + 11, cy - 2],  side: 'right', ty: 122 },
      { t: 'RB — sacrifier : bombe',anchor: [cx + 52, cy - 30], side: 'right', ty: 148 },
      { t: 'RT — TIR',              anchor: [cx + 52, cy - 36], side: 'right', ty: 56,  hot: true },
    ];

    labels.forEach(l => {
      const left = l.side === 'left';
      const tx = left ? 40 : W - 40;
      const g = this.add.graphics().setDepth(9);
      objs.push(g);
      g.lineStyle(1, l.hot ? 0xff7733 : 0x335577, 0.8);
      g.beginPath();
      g.moveTo(l.anchor[0], l.anchor[1]);
      g.lineTo(left ? tx + 4 : tx - 4, l.ty);
      g.strokePath();
      g.fillStyle(l.hot ? 0xff7733 : 0x55aadd, 1);
      g.fillCircle(l.anchor[0], l.anchor[1], 1.6);
      push(this.add.text(tx, l.ty, l.t, {
        fontFamily: 'Arial', fontSize: '9px', color: l.hot ? '#ff9955' : '#cce4ff',
      }).setOrigin(left ? 0 : 1, 0.5).setDepth(10));
    });

    push(this.add.text(W / 2, 196, 'A / B : valider / retour aux écrans de fin', {
      fontFamily: 'Arial', fontSize: '9px', color: '#778899',
    }).setOrigin(0.5).setDepth(10));
  }

  // Stylised Xbox-style controller drawn entirely with primitives.
  drawController(push, cx, cy) {
    const g = this.add.graphics().setDepth(8);
    push(g);

    // Body + grips
    g.fillStyle(0x2a2e40, 1);
    g.fillCircle(cx - 56, cy + 14, 22);
    g.fillCircle(cx + 56, cy + 14, 22);
    g.fillRoundedRect(cx - 64, cy - 22, 128, 46, 16);
    g.fillStyle(0x363b52, 1);
    g.fillRoundedRect(cx - 60, cy - 20, 120, 40, 14);

    // Bumpers (top)
    g.fillStyle(0x1e2030, 1);
    g.fillRoundedRect(cx - 58, cy - 30, 26, 8, 3);
    g.fillRoundedRect(cx + 32, cy - 30, 26, 8, 3);

    // Triggers (above bumpers) — RT highlighted as the fire button
    g.fillStyle(0x1a1c2c, 1);
    g.fillRoundedRect(cx - 56, cy - 38, 22, 7, 3);
    g.fillStyle(0xff7733, 1);
    g.fillRoundedRect(cx + 34, cy - 38, 22, 7, 3);

    // Left stick
    g.fillStyle(0x14151f, 1); g.fillCircle(cx - 38, cy - 4, 9);
    g.fillStyle(0x4a4f6a, 1);  g.fillCircle(cx - 38, cy - 4, 6);

    // D-pad
    g.fillStyle(0x1a1c2c, 1);
    g.fillRect(cx - 27, cy + 12, 6, 14);
    g.fillRect(cx - 31, cy + 16, 14, 6);

    // ABXY
    const bx = cx + 38, by = cy - 4;
    const drawBtn = (dx, dy, col) => { g.fillStyle(col, 1); g.fillCircle(bx + dx, by + dy, 4); };
    drawBtn(0, 8, 0x4caf50);   // A
    drawBtn(8, 0, 0xe53935);   // B
    drawBtn(-8, 0, 0x1e88e5);  // X
    drawBtn(0, -8, 0xfdd835);  // Y

    // Right stick
    g.fillStyle(0x14151f, 1); g.fillCircle(cx + 18, cy + 16, 9);
    g.fillStyle(0x4a4f6a, 1);  g.fillCircle(cx + 18, cy + 16, 6);

    // Start / Select
    g.fillStyle(0x1a1c2c, 1);
    g.fillCircle(cx - 11, cy - 2, 3);
    g.fillCircle(cx + 11, cy - 2, 3);
  }

  // -------------------------------------------------------------------------
  buildKeyboardPage() {
    const objs = this.pageObjects[1];
    const push = o => { objs.push(o); return o; };

    push(this.add.text(W / 2, 42, 'CLAVIER', {
      fontFamily: 'Arial', fontSize: '11px', color: '#aaddee',
    }).setOrigin(0.5).setDepth(10));

    // Bindings are by physical key position, so AZERTY ZQSD == QWERTY WASD.
    const rows = [
      ['Déplacement vaisseau', 'ZQSD / WASD / Flèches'],
      ['Tir',                  'Espace'],
      ['Invoquer un clone',    'A (AZERTY) / Q (QWERTY)'],
      ['Déplacer le clone',    'I J K L'],
      ['Pause',                'Échap'],
      ['Game over — rejouer',  'Espace / Entrée'],
      ['Game over — menu',     'Échap'],
    ];

    const x0 = 70, x1 = W - 70;
    rows.forEach((r, i) => {
      const y = 70 + i * 19;
      push(this.add.text(x0, y, r[0], {
        fontFamily: 'Arial', fontSize: '11px', color: '#cce4ff',
      }).setOrigin(0, 0.5).setDepth(10));
      push(this.add.text(x1, y, r[1], {
        fontFamily: 'Arial', fontSize: '11px', color: '#ffd27a',
      }).setOrigin(1, 0.5).setDepth(10));
    });

    push(this.add.text(W / 2, 70 + rows.length * 19 + 6,
      'Astuce : les touches sont liées à leur position physique,\nle clavier AZERTY est donc géré nativement.', {
      fontFamily: 'Arial', fontSize: '8px', color: '#667788', align: 'center',
    }).setOrigin(0.5, 0).setDepth(10));
  }

  // -------------------------------------------------------------------------
  showPage(p) {
    this.page = (p + this.pageObjects.length) % this.pageObjects.length;
    this.pageObjects.forEach((objs, i) => {
      const vis = i === this.page;
      objs.forEach(o => o.setVisible(vis));
    });
  }

  update() {
    this.bgLayers.forEach(l => { l.sprite.tilePositionX += l.speedX; });

    const pad = this.input.gamepad?.pad1 ?? null;
    const padL  = (pad?.buttons[14]?.pressed ?? false) || (pad?.axes[0]?.getValue() ?? 0) < -0.5;
    const padR  = (pad?.buttons[15]?.pressed ?? false) || (pad?.axes[0]?.getValue() ?? 0) > 0.5;
    const padB  = pad?.buttons[1]?.pressed ?? false;
    const padA  = pad?.buttons[0]?.pressed ?? false;
    const padLB = pad?.buttons[4]?.pressed ?? false;
    const padRB = pad?.buttons[5]?.pressed ?? false;

    const left  = justDown('ArrowLeft')  || (padL  && !this._padL)  || (padLB && !this._padLB);
    const right = justDown('ArrowRight') || (padR  && !this._padR)  || (padRB && !this._padRB)
                || (padA && !this._padA);
    const back  = justDown('Escape') || justDown('Backspace') || (padB && !this._padB);

    this._padL = padL; this._padR = padR; this._padB = padB;
    this._padA = padA; this._padLB = padLB; this._padRB = padRB;

    if (back) { this.scene.start('MenuScene'); return; }
    if (left)  this.showPage(this.page - 1);
    if (right) this.showPage(this.page + 1);
  }
}
