// Procedural 8-bit chiptune music — no audio files.
//
// A tiny step-sequencer built on the Web Audio API. Each world has its own
// looping theme (lead + bass, sometimes an arpeggio) using square / triangle
// oscillators for that classic NES-ish flavour. Mixed quietly so it sits under
// the sound effects.

import { getAudioContext } from './audio.js';

// ---- note helpers ---------------------------------------------------------
const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

function freq(note) {
  if (!note) return 0; // null / '' → rest
  const m = /^([A-G]#?)(-?\d)$/.exec(note);
  if (!m) return 0;
  const semis = SEMI[m[1]] + (parseInt(m[2], 10) - 4) * 12 - 9; // relative to A4
  return 440 * Math.pow(2, semis / 12);
}

// Expand a compact pattern. Tokens: a note ("C4"), '.' = rest, '-' = hold the
// previous note (extends its duration by one step).
function pattern(str) {
  const toks = str.trim().split(/\s+/);
  const out = [];
  for (const t of toks) {
    if (t === '-' && out.length) { out[out.length - 1].dur++; continue; }
    out.push({ note: t === '.' || t === '-' ? null : t, dur: 1 });
  }
  return out;
}

// ---- world themes ---------------------------------------------------------
// 16 sixteenth-note steps per bar. Voices loop independently.
const THEMES = [
  // 0 ESPACE — slow, mysterious minor (A minor), sparse
  {
    bpm: 88,
    voices: [
      { type: 'triangle', vol: 0.12, pat: pattern('A3 - - - E3 - - - A3 - - - C4 - - -') },
      { type: 'square',   vol: 0.07, duty: 0.5, pat: pattern('A4 . E4 . C5 - B4 - A4 . . E4 . . . .') },
    ],
  },
  // 1 DÉSERT — Phrygian-ish, mid tempo, exotic
  {
    bpm: 104,
    voices: [
      { type: 'triangle', vol: 0.12, pat: pattern('D3 - D3 - A3 - A3 - D3 - D3 - A#3 - A3 -') },
      { type: 'square',   vol: 0.07, duty: 0.25, pat: pattern('D4 E4 F4 E4 D4 . A4 G4 F4 E4 D4 . E4 F4 E4 .') },
    ],
  },
  // 2 OCÉAN — calm, flowing major (G), gentle arpeggio
  {
    bpm: 96,
    voices: [
      { type: 'triangle', vol: 0.12, pat: pattern('G3 - - - D3 - - - C3 - - - D3 - - -') },
      { type: 'square',   vol: 0.06, duty: 0.5, pat: pattern('G4 B4 D5 B4 G4 B4 D5 B4 C5 E5 G5 E5 D5 B4 G4 .') },
    ],
  },
  // 3 NEIGE — bright, sparse, high & crystalline (C major)
  {
    bpm: 92,
    voices: [
      { type: 'triangle', vol: 0.11, pat: pattern('C3 - - - G3 - - - A3 - - - F3 - - -') },
      { type: 'square',   vol: 0.06, duty: 0.5, pat: pattern('E5 . G5 . C6 - B5 - G5 . E5 . D5 . . .') },
    ],
  },
  // 4 FORÊT — folk-ish minor pentatonic (E minor), bouncy
  {
    bpm: 120,
    voices: [
      { type: 'triangle', vol: 0.12, pat: pattern('E3 - B3 - E3 - B3 - A3 - E3 - G3 - B3 -') },
      { type: 'square',   vol: 0.07, duty: 0.5, pat: pattern('E4 G4 A4 B4 D5 B4 A4 G4 E4 G4 A4 G4 E4 D4 E4 .') },
    ],
  },
  // 5 VILLE — driving, syncopated minor (A minor), urban
  {
    bpm: 132,
    voices: [
      { type: 'square',   vol: 0.09, duty: 0.25, pat: pattern('A2 - A2 . A2 - E3 . F3 - F3 . G3 - G3 .') },
      { type: 'square',   vol: 0.07, duty: 0.5, pat: pattern('A4 . C5 E5 . A4 . G4 F4 . E4 . D4 . E4 .') },
    ],
  },
  // 6 TECHNO — fast energetic arpeggios (A minor add), pulsing
  {
    bpm: 150,
    voices: [
      { type: 'square',   vol: 0.08, duty: 0.125, pat: pattern('A2 A2 A2 A2 A2 A2 A2 A2 G2 G2 G2 G2 F2 F2 F2 F2') },
      { type: 'square',   vol: 0.06, duty: 0.5, pat: pattern('A4 C5 E5 A5 E5 C5 A4 C5 G4 B4 E5 G5 F4 A4 C5 E5') },
    ],
  },
  // 7 ABSTRAIT — whole-tone, dreamy & dissonant
  {
    bpm: 100,
    voices: [
      { type: 'triangle', vol: 0.11, pat: pattern('C3 - - - D3 - - - E3 - - - F#3 - - -') },
      { type: 'square',   vol: 0.06, duty: 0.5, pat: pattern('C5 - D5 - E5 - F#5 - G#5 - F#5 - E5 - D5 -') },
    ],
  },
];

// ---- scheduler ------------------------------------------------------------
const LOOKAHEAD = 0.12;   // seconds of audio scheduled ahead
const TICK_MS   = 30;     // scheduler wake interval

let timer    = null;
let master   = null;
let theme    = null;
let stepDur  = 0.125;
let step     = 0;
let nextTime = 0;

function scheduleNote(ctx, voice, idx, when) {
  const cell = voice.pat[idx % voice.pat.length];
  if (!cell || !cell.note) return;
  const f = freq(cell.note);
  if (!f) return;
  const dur = cell.dur * stepDur * 0.92; // tiny gap between notes

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = voice.type; // 'square' (pulse-like) or 'triangle' for that 8-bit feel
  osc.frequency.setValueAtTime(f, when);

  const v = voice.vol;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(v, when + 0.01);
  gain.gain.setValueAtTime(v, when + dur * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  osc.connect(gain);
  gain.connect(master);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function tick() {
  if (!theme) return;
  const ctx = getAudioContext();
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    theme.voices.forEach(v => scheduleNote(ctx, v, step, nextTime));
    step++;
    nextTime += stepDur;
  }
}

export function startMusic(worldIndex) {
  stopMusic();
  const ctx = getAudioContext();
  theme = THEMES[worldIndex % THEMES.length];
  stepDur = 60 / theme.bpm / 4; // sixteenth note
  step = 0;
  nextTime = ctx.currentTime + 0.05;

  master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.6); // fade in
  master.connect(ctx.destination);

  tick();
  timer = setInterval(tick, TICK_MS);
}

export function stopMusic() {
  if (timer) { clearInterval(timer); timer = null; }
  theme = null;
  if (master) {
    const ctx = getAudioContext();
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    } catch { /* context may be closing */ }
    const m = master;
    setTimeout(() => { try { m.disconnect(); } catch { /* already gone */ } }, 250);
    master = null;
  }
}
