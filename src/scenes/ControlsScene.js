import Phaser from 'phaser';
import { installKeyboard, justDown } from '../input.js';

const W = 480, H = 270;
const COL_L = 232; // action column right edge (right-aligned)
const COL_R = 248; // binding column left edge (left-aligned)

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

    // Pause PauseScene now that this scene is fully initialised.
    if (this.returnTo === 'pause') this.scene.pause('PauseScene');

    // Seed gamepad edge tracker so the button that opened this screen isn't
    // immediately re-read.
    const pad = this.input.gamepad?.pad1 ?? null;
    this._padB     = pad?.buttons[1]?.pressed ?? false;
    this._padStart = pad?.buttons[9]?.pressed ?? false;
  }

  // ── Layout helpers ──────────────────────────────────────────────────────────

  // Action label: right-aligned at COL_L (left column).
  row(y, action, bindFn) {
    this.add.text(COL_L, y, action, {
      fontFamily: 'Arial', fontSize: '9px', color: '#b8d4ee',
    }).setOrigin(1, 0.5).setDepth(41);
    bindFn(y);
  }

  // Binding: left-aligned at COL_R (right column).
  bindText(y, label, color = '#ffd07a') {
    this.add.text(COL_R, y, label, {
      fontFamily: 'Arial', fontSize: '9px', color,
    }).setOrigin(0, 0.5).setDepth(41);
  }

  // For RT/LB/RB/Start/Select — plain text, no pill.
  bindTag(y, label) {
    this.bindText(y, label, '#ffd07a');
  }

  // Colored face button (A/B/X/Y circle), placed at binding column start.
  faceBtn(cx, y, letter, fillColor) {
    const g = this.add.graphics().setDepth(41);
    g.fillStyle(fillColor, 1);
    g.fillCircle(cx, y, 4);
    this.add.text(cx, y, letter, {
      fontFamily: 'Arial', fontSize: '6px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(42);
  }

  sectionHeader(y, label) {
    const g = this.add.graphics().setDepth(40);
    g.fillStyle(0x223344, 0.9);
    g.fillRect(28, y + 5, W - 56, 1);
    this.add.text(W / 2, y, label, {
      fontFamily: 'Arial', fontSize: '8px', color: '#445e78', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(41);
  }

  // ── Content ─────────────────────────────────────────────────────────────────

  buildContent() {
    const RH = 11; // row height

    // ── MANETTE ─────────────────────────────────────────────────────────────
    this.sectionHeader(30, '── MANETTE ──');

    let y = 46;
    this.row(y, 'Déplacement vaisseau', y => this.bindText(y, 'Stick G · Croix'));

    y += RH;
    this.row(y, 'Tir', y => this.bindTag(y, 'RT'));

    y += RH;
    this.row(y, 'Invoquer un clone', y => {
      this.faceBtn(COL_R + 5, y, 'Y', 0xfdd835);
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
      this.faceBtn(COL_R + 5,  y, 'A', 0x4caf50);
      this.add.text(COL_R + 14, y, '/', {
        fontFamily: 'Arial', fontSize: '8px', color: '#556677',
      }).setOrigin(0.5, 0.5).setDepth(41);
      this.faceBtn(COL_R + 23, y, 'B', 0xe53935);
    });

    // ── CLAVIER ─────────────────────────────────────────────────────────────
    y += RH + 4;
    this.sectionHeader(y, '── CLAVIER ──');

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
      this.scene.resume('PauseScene');
      this.scene.stop();
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
