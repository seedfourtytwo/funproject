import { describe, it, expect } from 'vitest';
import { createBreakout, movePaddle, launch, stepBall } from './breakout.js';
import {
  FIELD_X, FIELD_W, GRID_TOP, PADDLE_W, PADDLE_Y, BALL_R, LAUNCH_DELAY, VIEW_H, CELL, COLS, ROWS,
} from './config.js';

const speedOf = (b) => Math.hypot(b.vx, b.vy);

function flyingBall(x, y, vx, vy) {
  const s = createBreakout();
  Object.assign(s.ball, { x, y, vx, vy, stuck: false });
  s.speed = Math.hypot(vx, vy);
  return s;
}

describe('raquette', () => {
  it('se déplace du même nombre de pixels que le doigt', () => {
    const s = createBreakout();
    const x0 = s.paddle.x;
    movePaddle(s, 12);
    expect(s.paddle.x).toBe(x0 + 12);
  });

  it('reste entre les deux murs', () => {
    const s = createBreakout();
    movePaddle(s, -1000);
    expect(s.paddle.x).toBe(FIELD_X + PADDLE_W / 2);
    movePaddle(s, 5000);
    expect(s.paddle.x).toBe(FIELD_X + FIELD_W - PADDLE_W / 2);
  });
});

describe('lancement', () => {
  it('la balle attend sur la raquette et la suit', () => {
    const s = createBreakout();
    movePaddle(s, 30);
    stepBall(s, 0.1);
    expect(s.ball.stuck).toBe(true);
    expect(s.ball.x).toBe(s.paddle.x);
    expect(s.ball.y).toBe(PADDLE_Y - BALL_R);
  });

  it('part toute seule vers le haut après le délai', () => {
    const s = createBreakout();
    stepBall(s, LAUNCH_DELAY + 0.01);
    expect(s.ball.stuck).toBe(false);
    expect(s.ball.vy).toBeLessThan(0);
  });

  it('launch donne la vitesse courante dans la direction demandée', () => {
    const s = createBreakout();
    launch(s, Math.PI / 6);
    expect(speedOf(s.ball)).toBeCloseTo(s.speed);
    expect(s.ball.vx).toBeGreaterThan(0);
    expect(s.ball.vy).toBeLessThan(0);
  });
});

describe('rebonds', () => {
  it('sur le mur de gauche', () => {
    const s = flyingBall(FIELD_X + BALL_R + 1, 300, -200, -100);
    const events = stepBall(s, 0.05);
    expect(s.ball.vx).toBeGreaterThan(0);
    expect(s.ball.x).toBeGreaterThanOrEqual(FIELD_X + BALL_R);
    expect(events.some((e) => e.type === 'wall')).toBe(true);
  });

  it('sur le mur de droite', () => {
    const s = flyingBall(FIELD_X + FIELD_W - BALL_R - 1, 300, 200, -100);
    stepBall(s, 0.05);
    expect(s.ball.vx).toBeLessThan(0);
    expect(s.ball.x).toBeLessThanOrEqual(FIELD_X + FIELD_W - BALL_R);
  });

  it('sur le plafond', () => {
    const s = flyingBall(180, GRID_TOP + BALL_R + 1, 50, -250);
    stepBall(s, 0.05);
    expect(s.ball.vy).toBeGreaterThan(0);
    expect(s.ball.y).toBeGreaterThanOrEqual(GRID_TOP + BALL_R);
  });

  it('au centre de la raquette, la balle repart tout droit', () => {
    const s = createBreakout();
    Object.assign(s.ball, { x: s.paddle.x, y: PADDLE_Y - 10, vx: 0, vy: 260, stuck: false });
    const events = stepBall(s, 0.05);
    expect(s.ball.vx).toBeCloseTo(0);
    expect(s.ball.vy).toBeLessThan(0);
    expect(events.some((e) => e.type === 'paddle')).toBe(true);
  });

  it('au bord de la raquette, elle repart en biais, même vitesse', () => {
    const s = createBreakout();
    const edge = s.paddle.x + PADDLE_W / 2;
    Object.assign(s.ball, { x: edge, y: PADDLE_Y - 10, vx: 0, vy: 260, stuck: false });
    stepBall(s, 0.05);
    expect(s.ball.vx).toBeGreaterThan(0);
    expect(s.ball.vy).toBeLessThan(0);
    expect(speedOf(s.ball)).toBeCloseTo(s.speed);
    // 60° depuis la verticale au maximum
    expect(Math.abs(s.ball.vx / s.ball.vy)).toBeCloseTo(Math.tan(Math.PI / 3), 1);
  });

  it('ne rebondit pas sur la raquette en remontant', () => {
    const s = createBreakout();
    Object.assign(s.ball, { x: s.paddle.x, y: PADDLE_Y + 2, vx: 0, vy: -260, stuck: false });
    const events = stepBall(s, 0.01);
    expect(events.some((e) => e.type === 'paddle')).toBe(false);
  });
});

describe('balle perdue', () => {
  it('passe sous la raquette : un événement « lost », la balle revient sur la raquette', () => {
    const s = flyingBall(FIELD_X + 5 + BALL_R, VIEW_H - 2, 0, 300);
    s.paddle.x = FIELD_X + FIELD_W - PADDLE_W / 2; // raquette loin de la balle
    const events = stepBall(s, 0.1);
    expect(events.some((e) => e.type === 'lost')).toBe(true);
    expect(s.ball.stuck).toBe(true);
  });
});

describe('collisions avec la grille', () => {
  const emptyGrid = () => Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  const cellCenter = (c, r) => [FIELD_X + (c + 0.5) * CELL, GRID_TOP + (r + 0.5) * CELL];

  it('la balle qui monte casse la case et redescend', () => {
    const grid = emptyGrid();
    grid[5][4] = 3;
    const [x, y] = cellCenter(4, 5);
    const s = flyingBall(x, y + CELL, 0, -260);
    const events = stepBall(s, 0.1, grid);
    expect(grid[5][4]).toBe(0);
    expect(s.ball.vy).toBeGreaterThan(0);
    expect(events).toContainEqual(expect.objectContaining({ type: 'cell', col: 4, row: 5, color: 3 }));
  });

  it('de côté, elle repart dans l’autre sens', () => {
    const grid = emptyGrid();
    grid[5][6] = 1;
    const [x, y] = cellCenter(5, 5);
    const s = flyingBall(x, y, 260, 0.0001);
    stepBall(s, 0.1, grid);
    expect(grid[5][6]).toBe(0);
    expect(s.ball.vx).toBeLessThan(0);
  });

  it('entre deux cases, elle n’en casse qu’une', () => {
    const grid = emptyGrid();
    grid[5][4] = 1;
    grid[5][5] = 1;
    const x = FIELD_X + 5 * CELL; // pile sur la jointure
    const s = flyingBall(x, GRID_TOP + 7 * CELL, 0, -260);
    stepBall(s, 0.1, grid);
    expect(grid[5][4] + grid[5][5]).toBe(1);
  });

  it('même très vite, elle ne traverse pas une rangée', () => {
    const grid = emptyGrid();
    for (let c = 0; c < COLS; c++) grid[3][c] = 2;
    const [x] = cellCenter(4, 0);
    const s = flyingBall(x, GRID_TOP + 10 * CELL, 0, -3000);
    stepBall(s, 0.1, grid); // 300 px en un seul appel
    expect(grid[3].filter((v) => v === 0)).toHaveLength(1);
    expect(s.ball.y).toBeGreaterThan(GRID_TOP + 4 * CELL - BALL_R - 0.01);
  });

  it('coincée dans une case (pièce verrouillée sur elle), elle la casse sans rebondir', () => {
    const grid = emptyGrid();
    grid[5][4] = 1;
    const [x, y] = cellCenter(4, 5);
    const s = flyingBall(x, y, 0, -260);
    const events = stepBall(s, 0.01, grid);
    expect(grid[5][4]).toBe(0);
    expect(s.ball.vy).toBeLessThan(0);
    expect(events.some((e) => e.type === 'cell')).toBe(true);
  });
});
