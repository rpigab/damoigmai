import Phaser from 'phaser';
import { installKeyboard, justDown } from '../input.js';

const W = 480, H = 270;

// ControlsScene — launched either from MenuScene (scene.start) or from
// PauseScene (scene.launch + scene.pause, returnTo:'pause' in data).
export default class ControlsScene extends Phaser.Scene {
  constructor() { super('ControlsScene'); }

  create(data) {
    installKeyboard();
    this.returnTo = data?.returnTo ?? 'menu';

    // Dark backdrop works in both contexts (menu bg or pause overlay).
    this.add.rectangle(W / 2, H / 2, W, H, 0x000814, 0.92).setDepth(40);

    this.add.text(W / 2, 14, 'CONTRÔLES', {
      fontFamily: 'Arial', fontSize: '16px', color: '#00ccff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(41);

    this.buildContent();

    const hint = this.returnTo === 'pause' ? '← Reprendre la partie' : '← Retour au menu';
    const backBtn = this.add.text(W / 2, H - 10, hint, {
      fontFamily: 'Arial', fontSize: '9px', color: '#5577aa',
    }).setOrigin(0.5, 0.5).setDepth(41).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#00ccff'));
    backBtn.on('pointerout',  () => backBtn.setColor('#5577aa'));
    backBtn.on('pointerdown', () => this.back());

    // Seed gamepad edge tracker so the button that opened this screen isn't
    // immediately re-read.
    const pad = this.input.gamepad?.pad1 ?? null;
    this._padB     = pad?.buttons[1]?.pressed ?? false;
    this._padStart = pad?.buttons[9]?.pressed ?? false;
  }

  // ── Layout helpers ──────────────────────────────────────────────────────────

  row(y, action, bindFn) {
    this.add.text(28, y, action, {
      fontFamily: 'Arial', fontSize: '9px', color: '#b8d4ee',
    }).setOrigin(0, 0.5).setDepth(41);
    bindFn(y);
  }

  // Plain right-aligned text binding.
  bindText(y, label, color = '#ffd07a') {
    this.add.text(452, y, label, {
      fontFamily: 'Arial', fontSize: '9px', color,
    }).setOrigin(1, 0.5).setDepth(41);
  }

  // Pill tag (RT, LB, RB, Start, Select …)
  bindTag(y, label, accentColor = 0x445566) {
    const tw = label.length * 5.2 + 10;
    const x  = 452 - tw;
    const g  = this.add.graphics().setDepth(40);
    g.fillStyle(0x0d1a2a, 0.9);
    g.fillRoundedRect(x, y - 7, tw, 13, 3);
    g.lineStyle(1, accentColor, 0.7);
    g.strokeRoundedRect(x, y - 7, tw, 13, 3);
    this.add.text(x + tw / 2, y, label, {
      fontFamily: 'Arial', fontSize: '8px', color: '#ccddf0',
    }).setOrigin(0.5, 0.5).setDepth(41);
  }

  // Colored face button (A/B/X/Y circle).
  faceBtn(cx, y, letter, fillColor) {
    const g = this.add.graphics().setDepth(41);
    g.fillStyle(fillColor, 1);
    g.fillCircle(cx, y, 6);
    this.add.text(cx, y, letter, {
      fontFamily: 'Arial', fontSize: '7px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(42);
  }

  sectionHeader(y, label) {
    // Use fillRect instead of path-based stroke — more compatible with Phaser 4.
    const g = this.add.graphics().setDepth(40);
    g.fillStyle(0x223344, 0.9);
    g.fillRect(28, y + 5, W - 56, 1);
    this.add.text(28, y, label, {
      fontFamily: 'Arial', fontSize: '8px', color: '#445e78', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(41);
  }

  // ── Content ─────────────────────────────────────────────────────────────────

  buildContent() {
    const RH = 11; // row height

    // ── MANETTE ─────────────────────────────────────────────────────────────
    this.sectionHeader(30, '── MANETTE');

    let y = 46;
    this.row(y, 'Déplacement vaisseau', y => this.bindText(y, 'Stick G · Croix'));

    y += RH;
    this.row(y, 'Tir', y => this.bindTag(y, 'RT', 0xff7733));

    y += RH;
    this.row(y, 'Invoquer un clone', y => {
      this.faceBtn(446, y, 'Y', 0xfdd835);
    });

    y += RH;
    this.row(y, 'Déplacer le clone', y => this.bindText(y, 'Stick D'));

    y += RH;
    this.row(y, 'Pause', y => this.bindTag(y, 'Start'));

    y += RH;
    this.row(y, 'Plein écran', y => this.bindTag(y, 'Select'));

    y += RH;
    this.row(y, 'Sacrifier 2 clones → +Vie', y => this.bindTag(y, 'LB'));

    y += RH;
    this.row(y, 'Sacrifier 2 clones → Bombe', y => this.bindTag(y, 'RB'));

    y += RH;
    this.row(y, 'Valider / Retour (fins de partie)', y => {
      this.faceBtn(436, y, 'A', 0x4caf50);
      this.add.text(444, y, '/', {
        fontFamily: 'Arial', fontSize: '8px', color: '#556677',
      }).setOrigin(0.5, 0.5).setDepth(41);
      this.faceBtn(452, y, 'B', 0xe53935);
    });

    // ── CLAVIER ─────────────────────────────────────────────────────────────
    y += RH + 4;
    this.sectionHeader(y, '── CLAVIER');

    y += 14;
    this.row(y, 'Déplacement vaisseau', y => this.bindText(y, 'ZQSD · WASD · ↑↓←→'));

    y += RH;
    this.row(y, 'Tir', y => this.bindText(y, 'Espace'));

    y += RH;
    this.row(y, 'Invoquer un clone', y => this.bindText(y, 'A (AZERTY)  /  Q (QWERTY)'));

    y += RH;
    this.row(y, 'Déplacer le clone', y => this.bindText(y, 'I J K L'));

    y += RH;
    this.row(y, 'Sacrifier 2 clones → +Vie', y => this.bindText(y, 'Shift G'));

    y += RH;
    this.row(y, 'Sacrifier 2 clones → Bombe', y => this.bindText(y, 'Shift D'));

    y += RH;
    this.row(y, 'Pause', y => this.bindText(y, 'Échap'));
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  back() {
    if (this.returnTo === 'pause') {
      this.scene.stop();
      this.scene.resume('PauseScene');
    } else {
      this.scene.start('MenuScene');
    }
  }

  update() {
    const pad      = this.input.gamepad?.pad1 ?? null;
    const padB     = pad?.buttons[1]?.pressed ?? false;
    const padStart = pad?.buttons[9]?.pressed ?? false;

    const goBack = justDown('Escape')
      || justDown('Backspace')
      || (padB     && !this._padB)
      || (padStart && !this._padStart);

    this._padB     = padB;
    this._padStart = padStart;

    if (goBack) this.back();
  }
}
