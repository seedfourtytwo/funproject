import {
  VIEW_W, VIEW_H, FIELD_X, GRID_TOP, CELL, COLS, ROWS, PAUSE_BUTTON, ITEM_SIZE, BIG_PADDLE_W,
} from './config.js';
import { pieceCells, shapeCells, colorOf } from './tetris.js';
import { createSprites, BRICK_COLORS, ART } from './sprites.js';

const FONT = '"Press Start 2P", monospace';

// Adapte le canvas à l'écran : on garde le format VIEW_W × VIEW_H, on l'agrandit
// au maximum sans le déformer (bandes noires sur les côtés si besoin, c'est
// le « letterbox »), et on dessine avec assez de pixels pour un écran Retina.
export function createScreen(canvas) {
  const ctx = canvas.getContext('2d');
  const screen = { canvas, ctx, scale: 1, left: 0, top: 0 };

  function fit() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.min(w / VIEW_W, h / VIEW_H);
    const cssW = Math.floor(VIEW_W * scale);
    const cssH = Math.floor(VIEW_H * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    screen.scale = scale;
    screen.left = Math.floor((w - cssW) / 2);
    screen.top = Math.floor((h - cssH) / 2);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.left = `${screen.left}px`;
    canvas.style.top = `${screen.top}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  fit();
  window.addEventListener('resize', fit);
  return screen;
}

let sprites = null;

// Dessine une image complète. Appelée à chaque image (60 fois par seconde).
export function drawFrame(screen, game) {
  const { ctx, canvas } = screen;
  sprites ??= createSprites();

  // On dessine en coordonnées logiques ; le canvas agrandit le tout.
  // Pas de lissage : les pixels du pixel art restent carrés et nets.
  ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
  ctx.imageSmoothingEnabled = false;

  const { fx } = game;
  ctx.save();
  if (fx.shake > 0.3) {
    ctx.translate((Math.random() - 0.5) * fx.shake * 2, (Math.random() - 0.5) * fx.shake * 2);
  }
  ctx.drawImage(sprites.background, 0, 0, VIEW_W, VIEW_H);
  drawTorches(ctx, game.time);
  drawBoard(ctx, game.tetris);
  if (game.state !== 'menu' && !game.tetris.over) drawPiece(ctx, game.tetris.piece, game.time);
  drawItems(ctx, game.breakout.items, game.time);
  drawPaddle(ctx, game.breakout, game.time);
  if (game.state !== 'menu') drawFairy(ctx, game.breakout, game.trail, game.time);
  drawParticles(ctx, fx);
  ctx.restore();

  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${fx.flash * 0.6})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if (game.state === 'play') drawSticks(ctx, game);
  drawHud(ctx, game);
  if (game.state === 'menu') drawMenu(ctx, game);
  else if (game.state === 'pause') drawPause(ctx);
  else if (game.state === 'over') drawGameOver(ctx, game);
}

function drawTorches(ctx, time) {
  const frame = sprites.torch[Math.floor(time * 6) % 2];
  const w = frame.width * ART;
  const h = frame.height * ART;
  for (const y of [150, 300, 470]) {
    ctx.drawImage(frame, FIELD_X / 2 - w / 2, y, w, h);
    ctx.drawImage(frame, VIEW_W - FIELD_X / 2 - w / 2, y, w, h);
  }
}

const cellX = (c) => FIELD_X + c * CELL;
const cellY = (r) => GRID_TOP + r * CELL;

function drawBoard(ctx, t) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = t.board[r][c];
      if (v) ctx.drawImage(sprites.bricks[v], cellX(c), cellY(r), CELL, CELL);
    }
  }
}

// La pièce active « respire » un peu, pour la distinguer du tas.
function drawPiece(ctx, piece, time) {
  const brick = sprites.bricks[colorOf(piece.type)];
  ctx.globalAlpha = 0.85 + 0.15 * Math.sin(time * 6);
  for (const [c, r] of pieceCells(piece)) ctx.drawImage(brick, cellX(c), cellY(r), CELL, CELL);
  ctx.globalAlpha = 1;
}

// Un bonus qui clignote vite = il va bientôt s'arrêter.
const ending = (left, time) => left > 0 && left < 2 && Math.floor(time * 8) % 2 === 0;

function drawPaddle(ctx, { paddle: p, big }, time) {
  const sprite = p.w === BIG_PADDLE_W ? sprites.bigPaddle : sprites.paddle;
  if (ending(big, time)) ctx.globalAlpha = 0.4;
  ctx.drawImage(sprite, p.x - p.w / 2, p.y, p.w, p.h);
  ctx.globalAlpha = 1;
}

function drawItems(ctx, items, time) {
  for (const item of items) {
    const bob = Math.round(Math.sin(time * 8 + item.x) * 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(sprites.starGlow, item.x - 24, item.y - 24);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const half = ITEM_SIZE / 2;
    ctx.drawImage(sprites.items[item.kind], item.x - half, item.y - half + bob, ITEM_SIZE, ITEM_SIZE);
  }
}

const RAINBOW = ['#e40048', '#f88800', '#f8d800', '#58d854', '#3cbcfc', '#d03ce8'];

function drawFairy(ctx, { ball, star }, trail, time) {
  // Traînée : des étincelles de plus en plus petites et pâles. Arc-en-ciel avec l'étoile.
  trail.forEach((pt, i) => {
    const k = (i + 1) / trail.length;
    const size = Math.max(2, Math.round(k * (star ? 7 : 4)));
    ctx.globalAlpha = k * 0.7;
    ctx.fillStyle = star ? RAINBOW[(i + Math.floor(time * 20)) % RAINBOW.length] : i % 2 ? '#fcfcfc' : '#fca8e4';
    ctx.fillRect(pt.x - size / 2, pt.y - size / 2, size, size);
  });
  ctx.globalAlpha = 1;

  ctx.globalCompositeOperation = 'lighter';
  const glow = star && !ending(star, time) ? sprites.starGlow : sprites.glow;
  ctx.drawImage(glow, ball.x - 24, ball.y - 24);
  ctx.globalCompositeOperation = 'source-over';

  const frame = sprites.fairy[Math.floor(time * 12) % 2];
  const w = frame.width * ART;
  const h = frame.height * ART;
  ctx.drawImage(frame, Math.round(ball.x - w / 2), Math.round(ball.y - h / 2), w, h);
}

function drawParticles(ctx, fx) {
  for (const p of fx.particles) {
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
    if (p.kind === 'chunk') {
      const { base, dark } = BRICK_COLORS[p.color];
      ctx.fillStyle = dark;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.fillStyle = base;
      ctx.fillRect(p.x - 3, p.y - 3, 4, 4);
    } else {
      ctx.fillStyle = '#fcfcfc';
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.min(1, t.life * 2);
    text(ctx, t.text, t.x, t.y, 10, t.color);
  }
  ctx.globalAlpha = 1;
}

// Texte en police pixel, avec une ombre noire décalée comme sur les vieilles consoles.
function text(ctx, str, x, y, size, color, align = 'center') {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const shadow = Math.max(1, Math.round(size / 8));
  ctx.fillStyle = '#000';
  ctx.fillText(str, x + shadow, y + shadow);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function drawHud(ctx, game) {
  // Cœurs de vie, en haut à gauche.
  const heartW = sprites.hearts.full.width * ART;
  const heartH = sprites.hearts.full.height * ART;
  for (let i = 0; i < Math.max(3, game.lives); i++) {
    const heart = i < game.lives ? sprites.hearts.full : sprites.hearts.empty;
    ctx.drawImage(heart, 12 + i * (heartW + 4), 10, heartW, heartH);
  }

  // Pièces d'or : le score.
  const coin = sprites.coin;
  ctx.drawImage(coin, 12, 31, coin.width * ART, coin.height * ART);
  text(ctx, String(game.score).padStart(6, '0'), 28, 39, 10, '#fcfcfc', 'left');

  // Niveau et record, au milieu.
  text(ctx, `NIV ${game.level}`, VIEW_W / 2 + 8, 18, 8, '#80d010');
  text(ctx, `REC ${game.best}`, VIEW_W / 2 + 8, 38, 8, '#a8a8b8');

  // Pièce suivante, dans un cadre doré.
  const box = { x: 296, y: 6, w: 54, h: 44 };
  ctx.fillStyle = '#f8d800';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = '#000';
  ctx.fillRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
  const cells = shapeCells(game.tetris.next);
  const size = 10;
  const cols = cells.map(([c]) => c);
  const rows = cells.map(([, r]) => r);
  const w = (Math.max(...cols) - Math.min(...cols) + 1) * size;
  const h = (Math.max(...rows) - Math.min(...rows) + 1) * size;
  const ox = box.x + (box.w - w) / 2 - Math.min(...cols) * size;
  const oy = box.y + (box.h - h) / 2 - Math.min(...rows) * size;
  const brick = sprites.bricks[colorOf(game.tetris.next)];
  for (const [c, r] of cells) ctx.drawImage(brick, ox + c * size, oy + r * size, size, size);

  // Bouton pause, gravé dans le mur.
  if (game.state === 'play') {
    const b = PAUSE_BUTTON;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#a8b4d0';
    ctx.fillRect(b.x + 12, b.y + 10, 5, b.h - 20);
    ctx.fillRect(b.x + b.w - 17, b.y + 10, 5, b.h - 20);
  }
}

const STICK_COLORS = { left: '#f8d800', right: '#3cbcfc' };
const STICK_HINT_TIME = 6; // secondes pendant lesquelles on montre où poser les pouces

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

// Les joysticks sous les pouces. En début de partie, deux repères pâles
// montrent où les poser (ils disparaissent dès qu'on s'en sert).
function drawSticks(ctx, game) {
  const sticks = game.sticks ?? [];
  if (game.time < STICK_HINT_TIME) {
    const fade = Math.min(1, STICK_HINT_TIME - game.time);
    const r = 32;
    const y = VIEW_H - 140;
    for (const [side, x, label] of [['left', 90, 'PIECE'], ['right', VIEW_W - 90, 'PLANCHE']]) {
      if (sticks.some((s) => s.side === side)) continue;
      ctx.globalAlpha = 0.5 * fade;
      ctx.lineWidth = 2;
      ctx.strokeStyle = STICK_COLORS[side];
      circle(ctx, x, y, r);
      ctx.stroke();
      text(ctx, label, x, y + r + 14, 8, STICK_COLORS[side]);
    }
    ctx.globalAlpha = 1;
  }

  for (const s of sticks) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    circle(ctx, s.ox, s.oy, s.r);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.strokeStyle = STICK_COLORS[s.side];
    circle(ctx, s.ox, s.oy, s.r);
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = STICK_COLORS[s.side];
    circle(ctx, s.kx, s.ky, s.r * 0.42);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function dim(ctx, alpha = 0.6) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

const blink = (time) => Math.floor(time * 2) % 2 === 0;

function drawMenu(ctx, game) {
  dim(ctx, 0.55);
  const cx = VIEW_W / 2;
  text(ctx, 'BRICK', cx, 190, 32, '#f8d800');
  text(ctx, 'TETRIS', cx, 236, 32, '#58d854');

  // La fée flotte au-dessus du message.
  const frame = sprites.fairy[Math.floor(game.time * 12) % 2];
  const fy = 290 + Math.sin(game.time * 3) * 6;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(sprites.glow, cx - 24, fy - 24);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(frame, cx - 7, fy - 6, frame.width * ART, frame.height * ART);

  if (blink(game.time)) text(ctx, 'TOUCHE POUR JOUER', cx, 350, 10, '#fcfcfc');
  if (game.best) text(ctx, `RECORD ${game.best}`, cx, 384, 8, '#f8d800');

  ctx.fillStyle = '#d0d8f0';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const help = [
    'Pouce gauche : joystick de la pièce.',
    '← → la bouge, ↑ la lance, ↓ ou touche la tourne.',
    'Pouce droit : joystick de la planche.',
    'La fée casse tout, même la pièce qui bouge.',
    'Attrape les bonus qui tombent !',
  ];
  help.forEach((line, i) => ctx.fillText(line, cx, 440 + i * 20));
}

function drawPause(ctx) {
  dim(ctx);
  text(ctx, 'PAUSE', VIEW_W / 2, VIEW_H / 2 - 20, 24, '#fcfcfc');
  ctx.fillStyle = '#d0d8f0';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Touche pour reprendre', VIEW_W / 2, VIEW_H / 2 + 24);
}

function drawGameOver(ctx, game) {
  dim(ctx, 0.65);
  const cx = VIEW_W / 2;
  text(ctx, 'GAME', cx, 220, 32, '#e40048');
  text(ctx, 'OVER', cx, 264, 32, '#e40048');
  text(ctx, `SCORE ${game.score}`, cx, 320, 12, '#fcfcfc');
  if (game.newBest) {
    if (blink(game.time)) text(ctx, 'NOUVEAU RECORD !', cx, 352, 10, '#f8d800');
  } else {
    text(ctx, `RECORD ${game.best}`, cx, 352, 10, '#f8d800');
  }
  if (game.overFor > 1) {
    ctx.fillStyle = '#d0d8f0';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Touche pour rejouer', cx, 410);
  }
}
