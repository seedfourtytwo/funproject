// Le pixel art du jeu, dessiné en code au démarrage (pas de fichiers image).
// Un « pixel d'art » vaut 2 pixels logiques : l'écran 360 × 640 fait 180 × 320
// pixels d'art (plus sur un écran allongé). On dessine en petit, puis on agrandit sans lissage : c'est ce
// qui donne l'aspect net des vieilles consoles.
import {
  VIEW_W, VIEW_H, FIELD_X, FIELD_W, GRID_TOP, GRID_BOTTOM, CELL, COLS, ROWS,
  PADDLE_W, BIG_PADDLE_W, PADDLE_H,
} from './config.js';

export const ART = 2; // pixels logiques par pixel d'art

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

// Transforme un petit dessin en texte (une lettre = une couleur, '.' = vide) en image.
function fromPattern(rows, palette) {
  const [canvas, ctx] = makeCanvas(rows[0].length, rows.length);
  rows.forEach((line, y) => {
    [...line].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}

// Un hasard toujours le même, pour que l'herbe ne change pas à chaque partie.
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

// Les 7 couleurs de briques (I O T S Z J L) : face, reflet, ombre.
export const BRICK_COLORS = [
  null,
  { base: '#3cbcfc', light: '#a4e4fc', dark: '#0058c8' },
  { base: '#f8d800', light: '#fcfc9c', dark: '#a88800' },
  { base: '#d03ce8', light: '#f8a0fc', dark: '#7c0090' },
  { base: '#58d854', light: '#c0f878', dark: '#007800' },
  { base: '#e40048', light: '#fc88a8', dark: '#900020' },
  { base: '#4870fc', light: '#a8b8fc', dark: '#1c1ca0' },
  { base: '#f88800', light: '#fcc888', dark: '#a04800' },
];

// Brique en relief façon bloc de plateforme : bord sombre, reflet en haut à
// gauche, ombre en bas à droite, quatre rivets et un éclat de lumière.
function makeBrick({ base, light, dark }) {
  const n = CELL / ART; // 13
  const [canvas, ctx] = makeCanvas(n, n);
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  ctx.fillStyle = '#10080c';
  ctx.fillRect(0, 0, n, n);
  ctx.fillStyle = base;
  ctx.fillRect(1, 1, n - 2, n - 2);
  ctx.fillStyle = light;
  ctx.fillRect(1, 1, n - 2, 1);
  ctx.fillRect(1, 1, 1, n - 2);
  ctx.fillStyle = dark;
  ctx.fillRect(1, n - 2, n - 2, 1);
  ctx.fillRect(n - 2, 2, 1, n - 3);
  for (const [x, y] of [[3, 3], [n - 4, 3], [3, n - 4], [n - 4, n - 4]]) {
    px(x, y, dark);
    px(x - 1, y - 1, light);
  }
  px(2, 2, '#fff');
  px(3, 2, '#fff');
  px(2, 3, '#fff');
  return canvas;
}

// Cœur de vie, plein ou vide.
const HEART = [
  '.RR.RR.',
  'RWRRRRR',
  'RRRRRRR',
  '.RRRRR.',
  '..RRR..',
  '...R...',
];

const COIN = [
  '.YYY.',
  'YWYYD',
  'YWYYD',
  'YWYYD',
  'YWYYD',
  'YWYYD',
  '.YDD.',
];

// La fée : la balle du jeu. Deux images pour le battement d'ailes.
const FAIRY = [
  [
    'BB...BB',
    'BBB.BBB',
    '.BWWWB.',
    '..WWW..',
    '.BWWWB.',
    'BB...BB',
  ],
  [
    '.......',
    'B.....B',
    'BBWWWBB',
    '..WWW..',
    'BBWWWBB',
    'B.....B',
  ],
];

// Les bonus qui tombent des briques cassées.
const MUSHROOM = [
  '..RRRR..',
  '.RWWRRR.',
  'RWWRRWWR',
  'RRRRRWWR',
  'RRRRRRRR',
  '.KSSSSK.',
  '..SSSS..',
  '..SSSS..',
];
const STAR = [
  '...YY...',
  '...YY...',
  'YYYYYYYY',
  '.YYWYYY.',
  '..YYYY..',
  '.YYYYYY.',
  '.YY..YY.',
  'YY....YY',
];

// Torche murale, deux flammes qui alternent.
const TORCH = [
  [
    '..Y..',
    '.YOY.',
    '.OYO.',
    'ROYOR',
    '.ROR.',
    'GGGGG',
    '.BBB.',
    '..B..',
    '..B..',
  ],
  [
    '.Y...',
    '..YO.',
    '.OYO.',
    'RYOOR',
    '.ROR.',
    'GGGGG',
    '.BBB.',
    '..B..',
    '..B..',
  ],
];
const TORCH_COLORS = { Y: '#fcf8a8', O: '#fc9838', R: '#d82800', G: '#f8d800', B: '#6c3c14' };

// La raquette : une planche de bois cerclée d'or. width en pixels logiques.
function makePaddle(width) {
  const w = width / ART;
  const h = PADDLE_H / ART; // 5
  const [canvas, ctx] = makeCanvas(w, h);
  const rect = (x, y, rw, rh, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, rw, rh); };
  rect(1, 0, w - 2, h, '#3c1c00');
  rect(0, 1, w, h - 2, '#3c1c00');
  rect(1, 1, w - 2, h - 2, '#a85c1c');
  rect(2, 1, w - 4, 1, '#e0903c');
  for (let x = 6; x < w - 6; x += 6) rect(x, 3, 2, 1, '#7c3c0c');
  for (const x of [3, w - 5]) {
    rect(x, 0, 2, h, '#a88800');
    rect(x, 1, 1, h - 2, '#f8d800');
  }
  return canvas;
}

// Le décor fixe (murs, sol du donjon, prairie) dessiné une seule fois.
function makeBackground() {
  const w = VIEW_W / ART;
  const h = VIEW_H / ART;
  const [canvas, ctx] = makeCanvas(w, h);
  const rect = (x, y, rw, rh, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, rw, rh); };
  const rnd = seeded(42);

  const fx = FIELD_X / ART;
  const fw = FIELD_W / ART;
  const top = GRID_TOP / ART;
  const mid = GRID_BOTTOM / ART;
  const cell = CELL / ART;

  // Murs de pierre du château, briques décalées une rangée sur deux.
  rect(0, 0, w, h, '#1c2438');
  for (let y = 0, row = 0; y < h; y += 7, row++) {
    for (let x = (row % 2) * -6; x < w; x += 12) {
      rect(x + 1, y + 1, 11, 6, '#4c5a78');
      rect(x + 1, y + 1, 11, 1, '#7484a8');
      rect(x + 1, y + 6, 11, 1, '#343e58');
    }
  }

  // Bandeau noir du haut, pour le score et les cœurs.
  rect(0, 0, w, top, '#000');
  rect(0, top - 1, w, 1, '#343e58');

  // Sol du donjon derrière la grille : dalles sombres, à peine visibles.
  rect(fx, top, fw, mid - top, '#0e1428');
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = fx + c * cell;
      const y = top + r * cell;
      rect(x, y, cell, 1, '#141c36');
      rect(x, y, 1, cell, '#141c36');
    }
  }

  // Prairie en bas : herbe, brins et quelques fleurs.
  rect(fx, mid, fw, h - mid, '#2a7a36');
  for (let i = 0; i < 260; i++) {
    const x = fx + Math.floor(rnd() * fw);
    const y = mid + 3 + Math.floor(rnd() * (h - mid - 3));
    rect(x, y, 1, 2, rnd() < 0.5 ? '#3c9c48' : '#1e5e28');
  }
  for (let i = 0; i < 14; i++) {
    const x = fx + 2 + Math.floor(rnd() * (fw - 4));
    const y = mid + 6 + Math.floor(rnd() * (h - mid - 20));
    const petal = rnd() < 0.5 ? '#fcfcfc' : '#fc9cb8';
    rect(x - 1, y, 3, 1, petal);
    rect(x, y - 1, 1, 3, petal);
    rect(x, y, 1, 1, '#f8d800');
  }

  // Seuil de pierre entre le donjon et la prairie.
  rect(fx, mid - 1, fw, 1, '#7484a8');
  rect(fx, mid, fw, 1, '#343e58');

  // Bords du terrain : une fine arête claire contre les murs.
  rect(fx - 1, top, 1, h - top, '#0a0e1c');
  rect(fx + fw, top, 1, h - top, '#0a0e1c');
  return canvas;
}

export function createSprites() {
  const hearts = {
    full: fromPattern(HEART, { R: '#e40048', W: '#fcfcfc' }),
    empty: fromPattern(HEART, { R: '#3c3c4c', W: '#5c5c6c' }),
  };
  const coin = fromPattern(COIN, { Y: '#f8d800', W: '#fcfcfc', D: '#a88800' });
  const fairy = FAIRY.map((p) => fromPattern(p, { B: '#a8e4fc', W: '#fcfcfc' }));
  const torch = TORCH.map((p) => fromPattern(p, TORCH_COLORS));

  // Halo lumineux de la fée : rose d'habitude, doré avec l'étoile.
  // Les seuls dégradés du jeu, calculés une fois.
  const makeGlow = (core, mid) => {
    const [glow, g] = makeCanvas(48, 48);
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, core);
    grad.addColorStop(0.3, mid);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    return glow;
  };
  const glow = makeGlow('rgba(255, 220, 255, 0.9)', 'rgba(255, 140, 230, 0.35)');
  const starGlow = makeGlow('rgba(255, 250, 200, 1)', 'rgba(255, 210, 0, 0.5)');

  const items = {
    heart: hearts.full,
    mushroom: fromPattern(MUSHROOM, { R: '#e40048', W: '#fcfcfc', K: '#3c1c00', S: '#fce0a8' }),
    star: fromPattern(STAR, { Y: '#f8d800', W: '#fcfcfc' }),
  };

  return {
    background: makeBackground(),
    bricks: BRICK_COLORS.map((c) => (c ? makeBrick(c) : null)),
    paddle: makePaddle(PADDLE_W),
    bigPaddle: makePaddle(BIG_PADDLE_W),
    hearts, coin, fairy, torch, glow, starGlow, items,
  };
}
