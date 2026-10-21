// Les sons, fabriqués en direct par le navigateur (WebAudio), façon console
// 8 bits : des ondes carrées et triangulaires, un peu de bruit pour les briques.
// Aucun fichier son à télécharger.
//
// Les navigateurs (surtout sur iPhone) interdisent le son tant qu'on n'a pas
// touché l'écran : unlock() est appelée au premier toucher.

let ctx = null;
let master = null;
let noise = null;

export function unlockAudio() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);

    // Une demi-seconde de bruit blanc, réutilisée pour les briques qui cassent.
    noise = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

// Une note : fréquence de départ, éventuellement glissée vers une autre.
function tone(freq, { dur = 0.1, type = 'square', vol = 0.3, to = null, at = 0 } = {}) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function crunch(vol = 0.25, dur = 0.08) {
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = noise;
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
  src.stop(t + dur);
}

const arpeggio = (notes, step, opts) => notes.forEach((f, i) => tone(f, { ...opts, at: i * step }));

const SOUNDS = {
  paddle: () => tone(330, { dur: 0.08, to: 660, vol: 0.25 }),
  wall: () => tone(220, { dur: 0.04, type: 'triangle', vol: 0.2 }),
  // Plus le combo est long, plus le son monte.
  cell: (combo = 0) => {
    crunch();
    tone(180 * 1.06 ** Math.min(combo, 24), { dur: 0.06, vol: 0.15, to: 90 });
  },
  combo: () => arpeggio([880, 1320], 0.06, { dur: 0.08, vol: 0.2 }),
  smash: () => { crunch(0.45, 0.25); tone(110, { dur: 0.3, vol: 0.35, to: 40 }); },
  pop: () => tone(500, { dur: 0.08, type: 'triangle', vol: 0.25, to: 1000 }),
  powerup: () => arpeggio([523, 784, 1047, 1568, 2093], 0.05, { dur: 0.1, type: 'triangle', vol: 0.3 }),
  move: () => tone(880, { dur: 0.02, vol: 0.08 }),
  rotate: () => tone(1175, { dur: 0.03, vol: 0.1 }),
  lock: () => tone(110, { dur: 0.1, type: 'triangle', vol: 0.4, to: 70 }),
  drop: () => tone(200, { dur: 0.12, to: 900, vol: 0.18 }),
  line: () => arpeggio([523, 659, 784, 1047], 0.06, { dur: 0.12, vol: 0.22 }),
  bigLine: () => arpeggio([523, 659, 784, 1047, 1319, 1568], 0.05, { dur: 0.14, vol: 0.24 }),
  level: () => arpeggio([784, 988, 1175, 1568], 0.07, { dur: 0.1, type: 'triangle', vol: 0.3 }),
  lost: () => tone(600, { dur: 0.5, to: 80, vol: 0.25 }),
  gameover: () => arpeggio([392, 330, 262, 196], 0.18, { dur: 0.25, type: 'triangle', vol: 0.4 }),
  start: () => arpeggio([392, 523, 659, 784], 0.08, { dur: 0.12, vol: 0.22 }),
};

export function play(name, arg) {
  if (!ctx || ctx.state !== 'running') return;
  SOUNDS[name]?.(arg);
}
