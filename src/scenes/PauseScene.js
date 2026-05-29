import Phaser from 'phaser';
import { installKeyboard, justDown } from '../input.js';
import { stopMusic } from '../music.js';

const W = 480, H = 270;

// Overlay launched on top of a paused GameScene. Resume continues the run;
// "Menu principal" abandons it and returns to the main menu (progress lost).
export default class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  create(data) {
    installKeyboard();
    this.worldIndex = data?.world ?? 0;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setDepth(40);
    this.add.text(W / 2, H / 2 - 56, 'PAUSE', {
      fontFamily: 'Arial', fontSize: '26px', color: '#00ccff',
    }).setOrigin(0.5).setDepth(41);

    this.selected = 0;
    const ITEMS = [
      { label: 'REPRENDRE',      action: 'resume' },
      { label: 'MENU PRINCIPAL', action: 'menu'   },
    ];

    this.items = ITEMS.map((item, i) => {
      const y = H / 2 - 8 + i * 30;
      const bg  = this.add.rectangle(W / 2, y, 220, 24, 0x001133, 0.6).setDepth(40);
      const lbl = this.add.text(W / 2, y, item.label, {
        fontFamily: 'Arial', fontSize: '13px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(41);
      return { bg, lbl, action: item.action };
    });

    this.add.text(W / 2, H / 2 + 64, 'la progression est perdue en quittant', {
      fontFamily: 'Arial', fontSize: '9px', color: '#667788',
    }).setOrigin(0.5).setDepth(41);

    // The Start / Escape that opened this menu is still held — seed the edge
    // trackers as "pressed" so it doesn't instantly close the pause menu.
    this._padUp = false; this._padDown = false;
    this._padStart = true; this._padA = false; this._padB = false;
    justDown('Escape'); // prime so the opening press isn't re-read

    this.refresh();
  }

  refresh() {
    this.items.forEach((it, i) => {
      const sel = i === this.selected;
      it.bg.setFillStyle(sel ? 0x002255 : 0x000d22, sel ? 0.85 : 0.45);
      it.lbl.setStyle({ fontFamily: 'Arial', fontSize: sel ? '15px' : '12px', color: sel ? '#00eeff' : '#889aa9' });
    });
  }

  resume() {
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  toMenu() {
    stopMusic();
    this.scene.stop('GameScene');
    this.scene.stop();
    this.scene.start('MenuScene');
  }

  update() {
    const pad = this.input.gamepad?.pad1 ?? null;
    const padUp    = (pad?.buttons[12]?.pressed ?? false) || (pad?.axes[1]?.getValue() ?? 0) < -0.5;
    const padDown  = (pad?.buttons[13]?.pressed ?? false) || (pad?.axes[1]?.getValue() ?? 0) > 0.5;
    const padStart = pad?.buttons[9]?.pressed ?? false;
    const padA     = pad?.buttons[0]?.pressed ?? false;
    const padB     = pad?.buttons[1]?.pressed ?? false;

    const up      = justDown('ArrowUp')   || (padUp && !this._padUp);
    const down    = justDown('ArrowDown') || (padDown && !this._padDown);
    const confirm = justDown('Space') || justDown('Enter') || (padA && !this._padA);
    const close   = justDown('Escape') || (padStart && !this._padStart);
    const cancel  = padB && !this._padB;

    this._padUp = padUp; this._padDown = padDown; this._padStart = padStart;
    this._padA = padA; this._padB = padB;

    if (close || cancel) { this.resume(); return; }

    const n = this.items.length;
    if (up)   { this.selected = (this.selected - 1 + n) % n; this.refresh(); }
    if (down) { this.selected = (this.selected + 1) % n;     this.refresh(); }

    if (confirm) {
      if (this.items[this.selected].action === 'resume') this.resume();
      else this.toMenu();
    }
  }
}
