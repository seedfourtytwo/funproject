import './style.css';
import '@fontsource/press-start-2p/latin-400.css'; // police pixel, servie avec le jeu (marche hors ligne)
import { STEP, FIELD_X, GRID_TOP, CELL, VIEW_W, MAX_LIVES } from './config.js';
import { createScreen, drawFrame } from './render.js';
import { createInput } from './input.js';
import {
  createBreakout, movePaddle, stepBall, setSpeed, applyPowerUp, dropItem,
} from './breakout.js';
import { createTetris, stepTetris, tryMove, tryRotate, hardDrop, solidsOf } from './tetris.js';
import {
  levelFor, riseInterval, ballSpeed, lineScore, comboMultiplier, itemFor,
  CELL_POINTS, DROP_POINTS, PIECE_CELL_POINTS, PIECE_BREAK_BONUS,
} from './rules.js';
import { createFx, stepFx, burst, sparkle, floatText, shake, flash, vibrate } from './fx.js';
import { unlockAudio, play } from './audio.js';

const LIVES = 3;
const TRAIL_LENGTH = 10;
const BEST_KEY = 'brick-tetris.best';

const screen = createScreen(document.getElementById('game'));
const input = createInput(screen);

// Le meilleur score reste dans le navigateur. En navigation privée,
// localStorage peut refuser : le jeu marche quand même, sans record.
function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // tant pis, le record ne sera pas gardé
  }
}

// Tout l'état d'une partie. « state » dit où on en est :
// 'menu' (écran titre), 'play', 'pause' ou 'over' (perdu).
function newGame(state) {
  return {
    state, score: 0, level: 1, lives: LIVES, best: loadBest(), newBest: false,
    tetris: createTetris(), breakout: createBreakout(),
    fx: createFx(), trail: [], time: 0, overFor: 0,
    combo: 0, // cases cassées depuis le dernier rebond sur la planche
  };
}

let game = newGame('menu');

function addScore(points) {
  game.score += points;
  const level = levelFor(game.score);
  if (level !== game.level) {
    game.level = level;
    game.tetris.interval = riseInterval(level);
    setSpeed(game.breakout, ballSpeed(level));
    floatText(game.fx, VIEW_W / 2, 470, `NIVEAU ${level}`, '#80d010');
    play('level');
  }
}

function endGame() {
  if (game.state === 'over') return;
  game.state = 'over';
  game.overFor = 0;
  if (game.score > game.best) {
    game.best = game.score;
    game.newBest = true;
    saveBest(game.score);
  }
  play('gameover');
  shake(game.fx, 10);
  vibrate([80, 60, 120]);
}

// Ce que Tetris raconte (verrouillage, lignes, défaite) et ce que la balle
// raconte (rebonds, cases cassées, balle perdue) devient du score, des vies,
// des sons et des effets.
function handle(events) {
  const { fx } = game;
  for (const e of events) {
    switch (e.type) {
      case 'lock':
        play('lock');
        break;
      case 'lines': {
        const points = lineScore(e.count, game.level);
        addScore(points);
        for (const [c, r, color] of e.cells) {
          if ((c + r) % 2 === 0) burst(fx, FIELD_X + (c + 0.5) * CELL, GRID_TOP + (r + 0.5) * CELL, color);
        }
        floatText(fx, VIEW_W / 2, GRID_TOP + (e.rows[0] + 0.5) * CELL, `+${points}`);
        shake(fx, 4 + 2 * e.count);
        flash(fx, 0.25 + 0.1 * e.count);
        vibrate(40);
        play(e.count >= 2 ? 'bigLine' : 'line');
        break;
      }
      case 'cell': {
        const before = comboMultiplier(game.combo);
        game.combo++;
        const multiplier = comboMultiplier(game.combo);
        addScore((e.fromPiece ? PIECE_CELL_POINTS : CELL_POINTS) * multiplier);
        burst(fx, e.x, e.y, e.color);
        play('cell', game.combo);
        if (multiplier > before) {
          floatText(fx, e.x, e.y - 14, `COMBO x${multiplier}`, '#3cbcfc');
          play('combo');
        }
        if (e.pieceGone) {
          addScore(PIECE_BREAK_BONUS * multiplier);
          floatText(fx, e.x, e.y + 14, `BOUM +${PIECE_BREAK_BONUS * multiplier}`, '#f88800');
          shake(fx, 7);
          flash(fx, 0.2);
          vibrate(30);
          play('smash');
        }
        const item = itemFor(Math.random, game.lives);
        if (item) {
          dropItem(game.breakout, item, e.x, e.y);
          play('pop');
        }
        break;
      }
      case 'item':
        if (e.kind === 'heart') game.lives = Math.min(MAX_LIVES, game.lives + 1);
        else applyPowerUp(game.breakout, e.kind);
        floatText(fx, e.x, e.y - 20, ITEM_LABELS[e.kind], '#f8d800');
        sparkle(fx, e.x, e.y, 12);
        vibrate(20);
        play('powerup');
        break;
      case 'paddle':
        game.combo = 0;
        sparkle(fx, e.x, e.y, 5);
        vibrate(12);
        play('paddle');
        break;
      case 'wall':
        play('wall');
        break;
      case 'lost':
        game.lives--;
        game.combo = 0;
        game.trail = [];
        shake(fx, 6);
        vibrate([60, 40, 60]);
        play('lost');
        if (game.lives <= 0) endGame();
        break;
      case 'gameover':
        endGame();
        break;
    }
  }
}

const ITEM_LABELS = { heart: '+1 VIE', mushroom: 'PLANCHE XL', star: 'ETOILE !' };

const PIECE_ACTIONS = {
  left: (t) => tryMove(t, -1) && play('move'),
  right: (t) => tryMove(t, 1) && play('move'),
  rotate: (t) => tryRotate(t, 1) && play('rotate'),
  rotateLeft: (t) => tryRotate(t, -1) && play('rotate'),
  drop: (t) => {
    const { climbed, events } = hardDrop(t);
    addScore(climbed * DROP_POINTS);
    play('drop');
    handle(events);
  },
};

function start() {
  // Le doigt qui a lancé la partie ne doit pas aussi faire tourner la première pièce.
  input.resetGestures();
  game = newGame('play');
  play('start');
}

function update(dt) {
  game.time += dt;
  stepFx(game.fx, dt);

  const taps = input.takeTaps();
  const actions = input.takeActions();
  const paddleDx = input.takePaddle() + input.keyPaddle(dt);
  const pausePressed = actions.includes('pause');

  switch (game.state) {
    case 'menu':
      if (taps) start();
      return;
    case 'pause':
      if (taps || pausePressed) {
        input.resetGestures();
        game.state = 'play';
      }
      return;
    case 'over':
      game.overFor += dt;
      // Une seconde d'attente : un toucher frénétique en fin de partie ne relance pas tout de suite.
      if (taps && game.overFor > 1) start();
      return;
  }

  if (pausePressed) {
    game.state = 'pause';
    return;
  }
  for (const a of actions) {
    if (game.state === 'play') PIECE_ACTIONS[a]?.(game.tetris);
  }
  if (game.state !== 'play') return;

  movePaddle(game.breakout, paddleDx);
  handle(stepTetris(game.tetris, dt));
  handle(stepBall(game.breakout, dt, solidsOf(game.tetris)));
  // Casser toute la pièce fait apparaître la suivante : elle peut ne plus avoir la place.
  if (game.tetris.over) endGame();

  const ball = game.breakout.ball;
  if (!ball.stuck) {
    game.trail.push({ x: ball.x, y: ball.y });
    if (game.trail.length > TRAIL_LENGTH) game.trail.shift();
    if (Math.random() < dt * 12) sparkle(game.fx, ball.x, ball.y);
  }
}

// Le canvas ne télécharge pas la police tout seul : on la demande.
document.fonts?.load('16px "Press Start 2P"');

// Le son ne peut démarrer qu'après un geste de la personne qui joue.
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Le téléphone sonne, on change d'appli : le jeu se met en pause tout seul.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'play') game.state = 'pause';
});

// La boucle de jeu. requestAnimationFrame appelle frame() avant chaque image.
// La physique avance par petits pas fixes (STEP) : on « rattrape » le temps
// écoulé depuis la dernière image, quel que soit le nombre d'images par seconde.
let last = performance.now();
let lag = 0;

function frame(now) {
  // Si l'onglet a dormi, on ne rejoue pas des secondes de physique d'un coup.
  lag += Math.min((now - last) / 1000, 0.1);
  last = now;
  while (lag >= STEP) {
    update(STEP);
    lag -= STEP;
  }
  drawFrame(screen, game);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Hors ligne et installable : seulement dans la version publiée, pas pendant
// le développement (sinon on garderait de vieilles copies en travaillant).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
