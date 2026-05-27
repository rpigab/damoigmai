import Phaser from 'phaser';
import { WORLD_NAMES, createWorldBackground } from '../backgrounds.js';

const W = 480, H = 270;

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this.bgLayers = createWorldBackground(this, 0); // space background

    // Title
    this.add.text(W / 2, 55, 'DAMOIGMAI', {
      fontFamily: 'monospace', fontSize: '30px', color: '#00ccff',
    }).setOrigin(0.5).setDepth(10);
    this.add.text(W / 2, 82, 'SHOOTEUR GALACTIQUE', {
      fontFamily: 'monospace', fontSize: '7px', color: '#335577',
    }).setOrigin(0.5).setDepth(10);

    // Menu items
    this.selected = 0;
    const ITEMS = [
      { label: 'HISTOIRE',  sub: `8 mondes : ${WORLD_NAMES.join(' · ')}`,   mode: 'story' },
      { label: 'ENDLESS',   sub: 'vagues infinies · highscores',              mode: 'endless' },
    ];

    this.menuItems = ITEMS.map((item, i) => {
      const y = H / 2 + 10 + i * 48;
      const bg   = this.add.rectangle(W / 2, y, 360, 34, 0x001133, 0.6).setDepth(9);
      const lbl  = this.add.text(W / 2, y - 6, item.label, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(10);
      const sub  = this.add.text(W / 2, y + 9, item.sub, {
        fontFamily: 'monospace', fontSize: '5px', color: '#557788',
      }).setOrigin(0.5).setDepth(10);
      return { bg, lbl, sub, mode: item.mode };
    });

    this.add.text(W / 2, H - 10, '↑↓ / croix   ESPACE / A : lancer', {
      fontFamily: 'monospace', fontSize: '6px', color: '#223344',
    }).setOrigin(0.5).setDepth(10);

    this.cursors  = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this._padUp   = false;
    this._padDown = false;
    this._padA    = false;

    this.refreshMenu();
  }

  refreshMenu() {
    this.menuItems.forEach((item, i) => {
      const sel = i === this.selected;
      item.bg.setFillStyle(sel ? 0x002255 : 0x000d22, sel ? 0.85 : 0.45);
      item.lbl.setStyle({ fontFamily: 'monospace', fontSize: sel ? '16px' : '13px', color: sel ? '#00eeff' : '#778899' });
      item.sub.setStyle({ fontFamily: 'monospace', fontSize: '5px', color: sel ? '#88aabb' : '#445566' });
    });
  }

  update() {
    this.bgLayers.forEach(l => { l.sprite.tilePositionX += l.speedX; });

    const pad     = this.input.gamepad?.pad1 ?? null;
    const padUp   = (pad?.buttons[12]?.pressed ?? false) || (pad?.axes[1]?.getValue() ?? 0) < -0.5;
    const padDown = (pad?.buttons[13]?.pressed ?? false) || (pad?.axes[1]?.getValue() ?? 0) > 0.5;
    const padA    = pad?.buttons[0]?.pressed ?? false;

    const upJust    = Phaser.Input.Keyboard.JustDown(this.cursors.up)   || (padUp && !this._padUp);
    const downJust  = Phaser.Input.Keyboard.JustDown(this.cursors.down) || (padDown && !this._padDown);
    const confirm   = Phaser.Input.Keyboard.JustDown(this.spaceKey)
                   || Phaser.Input.Keyboard.JustDown(this.enterKey)
                   || (padA && !this._padA);

    this._padUp   = padUp;
    this._padDown = padDown;
    this._padA    = padA;

    const n = this.menuItems.length;
    if (upJust)   { this.selected = (this.selected - 1 + n) % n; this.refreshMenu(); }
    if (downJust) { this.selected = (this.selected + 1) % n;     this.refreshMenu(); }

    if (confirm) {
      const { mode } = this.menuItems[this.selected];
      if (mode === 'story') {
        this.scene.start('GameScene', { mode: 'story', world: 0, score: 0 });
      } else {
        this.scene.start('GameScene', { mode: 'endless', world: 0, score: 0 });
      }
    }
  }
}
