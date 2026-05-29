// Layout-independent keyboard input.
//
// Phaser identifies keys by `keyCode`, whose behaviour for letter keys varies
// between browsers and keyboard layouts. To make movement work identically on
// QWERTY, AZERTY, QWERTZ, … we track keys by `KeyboardEvent.code`, which always
// refers to the *physical* key position (US-QWERTY reference) regardless of the
// active layout.
//
// Concretely: the physical WASD diamond on a QWERTY keyboard is the exact same
// set of physical keys as ZQSD on a French AZERTY keyboard. By binding movement
// to the codes KeyW / KeyA / KeyS / KeyD, an AZERTY player naturally presses
// ZQSD and a QWERTY player presses WASD — same physical keys, no configuration.

const pressed = new Set();
const prev = new Map();
let installed = false;

// Codes whose default browser action (page scroll) we want to suppress in-game.
const PREVENT = new Set([
  'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

export function installKeyboard() {
  if (installed) return;
  installed = true;
  window.addEventListener('keydown', (e) => {
    pressed.add(e.code);
    if (PREVENT.has(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { pressed.delete(e.code); });
  // Release everything if the window loses focus, to avoid stuck keys.
  window.addEventListener('blur', () => pressed.clear());
}

// Is any of the given physical key codes currently held?
export function isDown(...codes) {
  for (const c of codes) if (pressed.has(c)) return true;
  return false;
}

// Edge-triggered: true on the frame a key transitions from up to down.
// Must be polled once per frame for the code to behave correctly.
export function justDown(code) {
  const now = pressed.has(code);
  const was = prev.get(code) || false;
  prev.set(code, now);
  return now && !was;
}

// True if any of the codes just transitioned to down this frame.
export function anyJustDown(...codes) {
  let hit = false;
  // Poll every code so each one's previous state stays in sync.
  for (const c of codes) if (justDown(c)) hit = true;
  return hit;
}
