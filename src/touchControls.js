// Virtual touch controls: 2 sticks + fire buttons + top action buttons.
// Only instantiate on touch devices; hide automatically when a gamepad connects.
//
// API (returned object):
//   .leftAxis  / .rightAxis  — {x, y} normalised [-1,1], updated each pointermove
//   .fireTapHeld             — true while fire-tap button is held
//   .fireToggle              — toggled on/off by the AUTO button
//   .justClone / .justPause / .justLB / .justRB / .justFullscreen — edge flags
//   .clearJust()             — call at end of each update() to reset edge flags
//   .setVisible(bool)        — hide/show all controls
//   .destroy()               — remove listeners + destroy GameObjects
import Phaser from 'phaser';

// ── Layout ────────────────────────────────────────────────────────────────────
const LS = { cx: 72,  cy: 215, r: 30, kR: 13 }; // left stick (ship)
const RS = { cx: 390, cy: 215, r: 28, kR: 12 }; // right stick (clone)
const ML = LS.r - LS.kR + 1;
const MR = RS.r - RS.kR + 1;

const FT = { cx: 455, cy: 240, r: 16 }; // fire-tap button
const FA = { cx: 455, cy: 185, r: 12 }; // auto-fire toggle

const TOP = [
  { cx: 24,  cy: 14, r: 11, key: 'justFullscreen', label: '[ ]' },
  { cx: 60,  cy: 14, r: 11, key: 'justLB',         label: '+♥'  },
  { cx: 98,  cy: 14, r: 11, key: 'justRB',         label: '★'   },
  { cx: 165, cy: 14, r: 12, key: 'justClone',      label: 'CLN' },
  { cx: 456, cy: 14, r: 11, key: 'justPause',      label: '||'  },
];

const D = 50; // base depth (above all game objects)

// ── Factory ───────────────────────────────────────────────────────────────────
export function createTouchControls(scene) {
  scene.input.addPointer(3); // ensure 5 simultaneous pointers

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

  // ── Static bases ─────────────────────────────────────────────────────────
  const baseGfx = reg(scene.add.graphics().setDepth(D));
  function drawBases() {
    baseGfx.clear();
    for (const { cx, cy, r } of [LS, RS]) {
      baseGfx.fillStyle(0x0a1520, 0.55); baseGfx.fillCircle(cx, cy, r);
      baseGfx.lineStyle(1.5, 0x2a4a6a, 0.7); baseGfx.strokeCircle(cx, cy, r);
    }
    // Fire-tap base (static red circle)
    baseGfx.fillStyle(0x881100, 0.75); baseGfx.fillCircle(FT.cx, FT.cy, FT.r);
    baseGfx.lineStyle(1.5, 0xff4422, 0.9); baseGfx.strokeCircle(FT.cx, FT.cy, FT.r);
  }
  drawBases();
  txt(FT.cx, FT.cy, '▶', 10, '#ff6644');

  // ── Auto-fire toggle ──────────────────────────────────────────────────────
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

  // ── Knobs (redrawn each move) ─────────────────────────────────────────────
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

  // ── Top action buttons ────────────────────────────────────────────────────
  for (const btn of TOP) {
    const g = reg(scene.add.graphics().setDepth(D));
    g.fillStyle(0x0a1825, 0.78);
    g.fillRoundedRect(btn.cx - btn.r, btn.cy - btn.r, btn.r * 2, btn.r * 2, 3);
    g.lineStyle(1, 0x334455, 0.65);
    g.strokeRoundedRect(btn.cx - btn.r, btn.cy - btn.r, btn.r * 2, btn.r * 2, 3);
    txt(btn.cx, btn.cy, btn.label, 6, '#7799aa');
  }

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const onDown = ({ x, y, id }) => {
    // Top buttons (narrow strip)
    if (y < 30) {
      for (const btn of TOP)
        if (Math.hypot(x - btn.cx, y - btn.cy) <= btn.r + 3) { s[btn.key] = true; return; }
    }
    // Auto-fire toggle
    if (Math.hypot(x - FA.cx, y - FA.cy) <= FA.r + 5) {
      s.fireToggle = !s.fireToggle; drawFA(); return;
    }
    // Fire-tap
    if (Math.hypot(x - FT.cx, y - FT.cy) <= FT.r + 5 && s._fPtr < 0) {
      s.fireTapHeld = true; s._fPtr = id; return;
    }
    // Left stick zone
    if (x < 200 && y > 140 && s._lPtr < 0) { s._lPtr = id; return; }
    // Right stick zone
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
    if (id === s._lPtr) {
      s._lPtr = -1; s.leftAxis.x = 0; s.leftAxis.y = 0; drawKnobs();
    } else if (id === s._rPtr) {
      s._rPtr = -1; s.rightAxis.x = 0; s.rightAxis.y = 0; drawKnobs();
    } else if (id === s._fPtr) {
      s._fPtr = -1; s.fireTapHeld = false;
    }
  };

  scene.input.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup',   onUp);

  // ── Public API ────────────────────────────────────────────────────────────
  s.clearJust = () => {
    s.justClone = s.justPause = s.justLB = s.justRB = s.justFullscreen = false;
  };

  s.setVisible = (v) => {
    objs.forEach(o => o.setVisible(v));
    if (v) { drawKnobs(); drawFA(); }
  };

  s.destroy = () => {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointermove', onMove);
    scene.input.off('pointerup',   onUp);
    objs.forEach(o => o.destroy());
  };

  return s;
}
