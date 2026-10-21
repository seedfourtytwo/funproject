import './style.css';
import { STEP } from './config.js';
import { createScreen, drawFrame } from './render.js';
import { createInput } from './input.js';
import { createBreakout, movePaddle, stepBall, setSpeed } from './breakout.js';
import { createTetris, stepTetris, tryMove, tryRotate, hardDrop } from './tetris.js';
import { levelFor, riseInterval, ballSpeed, lineScore, CELL_POINTS, DROP_POINTS } from './rules.js';

const LIVES = 3;

const screen = createScreen(document.getElementById('game'));
const input = createInput(screen);

// Tout l'état d'une partie. « state » dit où on en est : 'play' ou 'over'.
let game = newGame();

function newGame() {
  return {
    state: 'play', score: 0, level: 1, lives: LIVES,
    tetris: createTetris(), breakout: createBreakout(),
  };
}

function addScore(points) {
  game.score += points;
  const level = levelFor(game.score);
  if (level !== game.level) {
    game.level = level;
    game.tetris.interval = riseInterval(level);
    setSpeed(game.breakout, ballSpeed(level));
  }
}

// Ce que Tetris raconte (verrouillage, lignes, défaite) et ce que la balle
// raconte (cases cassées, balle perdue) devient du score et des vies.
function handle(events) {
  for (const e of events) {
    if (e.type === 'lines') addScore(lineScore(e.count, game.level));
    else if (e.type === 'cell') addScore(CELL_POINTS);
    else if (e.type === 'gameover') game.state = 'over';
    else if (e.type === 'lost') {
      game.lives--;
      if (game.lives <= 0) game.state = 'over';
    }
  }
}

const PIECE_ACTIONS = {
  left: (t) => tryMove(t, -1),
  right: (t) => tryMove(t, 1),
  rotate: (t) => tryRotate(t, 1),
  rotateLeft: (t) => tryRotate(t, -1),
  drop: (t) => {
    const { climbed, events } = hardDrop(t);
    addScore(climbed * DROP_POINTS);
    handle(events);
  },
};

function update(dt) {
  const taps = input.takeTaps();
  const actions = input.takeActions();
  const paddleDx = input.takePaddle() + input.keyPaddle(dt);

  if (game.state === 'over') {
    if (taps) game = newGame();
    return;
  }

  for (const a of actions) {
    if (game.state === 'play') PIECE_ACTIONS[a]?.(game.tetris);
  }
  if (game.state !== 'play') return;
  movePaddle(game.breakout, paddleDx);
  handle(stepTetris(game.tetris, dt));
  handle(stepBall(game.breakout, dt, game.tetris.board));
}

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
  drawFrame(screen.ctx, game);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
