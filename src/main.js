import './style.css';
import { STEP } from './config.js';
import { createScreen, drawFrame } from './render.js';
import { createInput } from './input.js';
import { createBreakout, movePaddle, stepBall } from './breakout.js';

const screen = createScreen(document.getElementById('game'));
const input = createInput(screen);
const game = { breakout: createBreakout() };

function update(dt) {
  movePaddle(game.breakout, input.takePaddle() + input.keyPaddle(dt));
  stepBall(game.breakout, dt);
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
