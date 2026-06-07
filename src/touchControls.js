// Virtual touch controls: 2 sticks + fire buttons + top action buttons.
// Only instantiate on touch devices; hidden when a real gamepad (≥2 axes) connects.
//
// API:
//   .leftAxis / .rightAxis   {x,y} normalised [-1,1]
//   .fireTapHeld             true while fire button is held
//   .fireToggle              toggled by AUTO button
//   .justClone / .justPause / .justLB / .justRB / .justFullscreen — edge flags
//   .clearJust()             call at end of each update()
//   .setVisible(bool)
//   .destroy()
import Phaser from 'phaser';

// ── Layout ─────────────────────────────────────────────────────────────────────
const LS = { cx: 72,  cy: 210, r: 42, kR: 18 }; // left stick (ship)  — +40%
const RS = { cx: 390, cy: 210, r: 39, kR: 17 }; // right stick (clone) — +40%
const ML = LS.r - LS.kR + 1; // 25
const MR = RS.r - RS.kR + 1; // 23

const FT = { cx: 455, cy: 242, r: 16 }; // fire-tap (hold = continuous)
const FA = { cx: 455, cy: 183, r: 12 }; // auto-fire toggle

// Top action buttons — fullscreen now in centre, clone at top-right
const TOP = [
  { cx: 60,  cy: 14, r: 11, key: 'justLB',         label: '+♥'  },
  { cx: 98,  cy: 14, r: 11, key: 'justRB',         label: '★'   },
  { cx: 240, cy: 14, r: 11, key: 'justFullscreen', label: '[ ]' },
  { cx: 416, cy: 14, r: 12, key: 'justClone',      label: 'CLN' },
  { cx: 456, cy: 14, r: 11, key: 'justPause',      label: '||'  },
];

const D = 50; // base depth

// ── Factory ───────────────────────────────────────────────────────────────────
export function createTouchControls(scene) {
  scene.input.addPointer(3);

  const s = {
    leftAxis:  { x: 0, y: 0 },
    rightAxis: { x: 0, y: 0 },
    fireTapHeld:    false,
    fireToggle:     false,
    justClone:      false,
    justPause:      false,
    justLB:         false,
    justRB:         false,
    justFullscreen: false,
    _lPtr: -1, _rPtr: -1, _fPtr: -1,
  };

  const objs = [];
  const reg = (o) => { objs.push(o); return o; };
  const txt = (x, y, label, size, color) =>
    reg(scene.add.text(x, y, label, { fontFamily: 'Arial', fontSize: `${size}px`, color })
      .setOrigin(0.5).setDepth(D + 1));

  // ── Static bases (fire-tap only — sticks show knob only, no outer ring) ──
  const baseGfx = reg(scene.add.graphics().setDepth(D));
  function drawBases() {
    baseGfx.clear();
    baseGfx.fillStyle(0x881100, 0.75); baseGfx.fillCircle(FT.cx, FT.cy, FT.r);
    baseGfx.lineStyle(1.5, 0xff4422, 0.9); baseGfx.strokeCircle(FT.cx, FT.cy, FT.r);
  }
  drawBases();
  txt(FT.cx, FT.cy, '▶', 10, '#ff6644');

  // ── Auto-fire toggle ─────────────────────────────────────────────────────
  const faGfx = reg(scene.add.graphics().setDepth(D));
  function drawFA() {
    faGfx.clear();
    faGfx.fillStyle(s.fireToggle ? 0xcc3300 : 0x1a3040, s.fireToggle ? 0.88 : 0.7);
    faGfx.fillCircle(FA.cx, FA.cy, FA.r);
    faGfx.lineStyle(1, s.fireToggle ? 0xff6633 : 0x334455, 0.8);
    faGfx.strokeCircle(FA.cx, FA.cy, FA.r);
  }
  drawFA();
  txt(FA.cx, FA.cy, 'AUTO', 5, '#6688aa');

  // ── Knobs (dynamic) ──────────────────────────────────────────────────────
  const knobGfx = reg(scene.add.graphics().setDepth(D + 1));
  function drawKnobs() {
    knobGfx.clear();
    const lx = LS.cx + s.leftAxis.x * ML, ly = LS.cy + s.leftAxis.y * ML;
    const rx = RS.cx + s.rightAxis.x * MR, ry = RS.cy + s.rightAxis.y * MR;
    knobGfx.fillStyle(0x3366dd, 0.9);  knobGfx.fillCircle(lx, ly, LS.kR);
    knobGfx.lineStyle(1, 0x66aaff, 0.7); knobGfx.strokeCircle(lx, ly, LS.kR);
    knobGfx.fillStyle(0x22aa88, 0.9);  knobGfx.fillCircle(rx, ry, RS.kR);
    knobGfx.lineStyle(1, 0x55ddbb, 0.7); knobGfx.strokeCircle(rx, ry, RS.kR);
  }
  drawKnobs();

  // ── Top action buttons ───────────────────────────────────────────────────
  for (const btn of TOP) {
    const g = reg(scene.add.graphics().setDepth(D));
    g.fillStyle(0x0a1825, 0.78);
    g.fillRoundedRect(btn.cx - btn.r, btn.cy - btn.r, btn.r * 2, btn.r * 2, 3);
    g.lineStyle(1, 0x334455, 0.65);
    g.strokeRoundedRect(btn.cx - btn.r, btn.cy - btn.r, btn.r * 2, btn.r * 2, 3);
    txt(btn.cx, btn.cy, btn.label, 6, '#7799aa');
  }

  // ── Pointer handlers ─────────────────────────────────────────────────────
  const onDown = ({ x, y, id }) => {
    if (y < 30) {
      for (const btn of TOP)
        if (Math.hypot(x - btn.cx, y - btn.cy) <= btn.r + 3) { s[btn.key] = true; return; }
    }
    if (Math.hypot(x - FA.cx, y - FA.cy) <= FA.r + 5) { s.fireToggle = !s.fireToggle; drawFA(); return; }
    if (Math.hypot(x - FT.cx, y - FT.cy) <= FT.r + 5 && s._fPtr < 0) {
      s.fireTapHeld = true; s._fPtr = id; return;
    }
    if (x < 200 && y > 140 && s._lPtr < 0) { s._lPtr = id; return; }
    if (x > 280 && y > 140 && s._rPtr < 0) { s._rPtr = id; }
  };

  const onMove = ({ id, x, y }) => {
    if (id === s._lPtr) {
      const dx = Phaser.Math.Clamp(x - LS.cx, -ML, ML);
      const dy = Phaser.Math.Clamp(y - LS.cy, -ML, ML);
      s.leftAxis.x = dx / ML; s.leftAxis.y = dy / ML; drawKnobs();
    } else if (id === s._rPtr) {
      const dx = Phaser.Math.Clamp(x - RS.cx, -MR, MR);
      const dy = Phaser.Math.Clamp(y - RS.cy, -MR, MR);
      s.rightAxis.x = dx / MR; s.rightAxis.y = dy / MR; drawKnobs();
    }
  };

  const onUp = ({ id }) => {
    if (id === s._lPtr) { s._lPtr = -1; s.leftAxis.x = 0; s.leftAxis.y = 0; drawKnobs(); }
    else if (id === s._rPtr) { s._rPtr = -1; s.rightAxis.x = 0; s.rightAxis.y = 0; drawKnobs(); }
    else if (id === s._fPtr) { s._fPtr = -1; s.fireTapHeld = false; }
  };

  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup',   onUp);

  // ── Public API ────────────────────────────────────────────────────────────
  s.clearJust = () => {
    s.justClone = s.justPause = s.justLB = s.justRB = s.justFullscreen = false;
  };

  s.setFireToggle = (val) => { s.fireToggle = val; drawFA(); };

  s.setVisible = (v) => { objs.forEach(o => o.setVisible(v)); if (v) { drawKnobs(); drawFA(); } };

  s.destroy = () => {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup',   onUp);
    objs.forEach(o => o.destroy());
  };

  return s;
}
