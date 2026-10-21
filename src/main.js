import './style.css';
import { VIEW_W, VIEW_H, STEP } from './config.js';
import { createScreen, drawFrame } from './render.js';

const screen = createScreen(document.getElementById('game'));

// Un carré qui rebondit, pour vérifier que la boucle tourne.
const world = { x: VIEW_W / 2, y: VIEW_H / 2, vx: 140, vy: 90 };

function update(dt) {
  world.x += world.vx * dt;
  world.y += world.vy * dt;
  if (world.x < 10 || world.x > VIEW_W - 10) world.vx = -world.vx;
  if (world.y < 10 || world.y > VIEW_H - 10) world.vy = -world.vy;
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
  drawFrame(screen.ctx, world);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
