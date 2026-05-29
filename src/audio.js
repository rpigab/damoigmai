// Web Audio API — synthesized sound effects, no files needed

let ctx = null;

// Shared AudioContext, used by both the SFX here and the music engine
// (music.js) so everything mixes through the same graph.
export function getAudioContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const getCtx = getAudioContext;

function tone(freq, endFreq, duration, type = 'square', vol = 0.25) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + duration);
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

function noise(duration, vol = 0.35) {
  const c = getCtx();
  const bufSize = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.5);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  src.connect(gain);
  gain.connect(c.destination);
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  src.start(c.currentTime);
}

export const sfx = {
  // Machine gun — short high blip
  shoot1() { tone(900, 500, 0.08, 'square', 0.15); },

  // Spread — triple woosh (slightly lower, sawtooth)
  shoot2() {
    tone(600, 200, 0.15, 'sawtooth', 0.12);
    setTimeout(() => tone(650, 220, 0.15, 'sawtooth', 0.10), 30);
    setTimeout(() => tone(580, 190, 0.15, 'sawtooth', 0.10), 60);
  },

  // Plasma — deep thump + low pitch sweep
  shoot3() {
    tone(180, 80, 0.3, 'square', 0.3);
    tone(300, 100, 0.2, 'sine', 0.15);
  },

  // Powerup pickup — ascending chime
  pickup() {
    tone(500, 1000, 0.12, 'sine', 0.2);
    setTimeout(() => tone(700, 1400, 0.15, 'sine', 0.15), 80);
    setTimeout(() => tone(1000, 2000, 0.2, 'sine', 0.12), 180);
  },

  // Clone summon — harmonic split chord
  summon() {
    tone(440, 880, 0.25, 'sine', 0.22);
    setTimeout(() => tone(554, 1108, 0.25, 'sine', 0.18), 40);
    setTimeout(() => tone(659, 1318, 0.3, 'sine', 0.15), 80);
  },

  // Clone absorbs bullet — quick metallic ping
  cloneAbsorb() { tone(1200, 600, 0.08, 'sine', 0.15); },

  // Enemy bullet
  enemyShoot() { tone(400, 200, 0.1, 'sawtooth', 0.08); },

  // Hit (non-lethal)
  hit() { tone(300, 150, 0.05, 'square', 0.2); },

  // Explosion
  explosion() { noise(0.4, 0.5); tone(120, 40, 0.3, 'sawtooth', 0.2); },

  // Small explosion (enemy1)
  smallExplosion() { noise(0.2, 0.3); tone(200, 80, 0.15, 'square', 0.15); },

  // Player death
  playerDie() {
    noise(0.6, 0.6);
    tone(200, 30, 0.5, 'sawtooth', 0.3);
  },
};
