import { describe, it, expect } from 'vitest';
import {
  createBreakout, movePaddle, launch, stepBall, applyPowerUp, dropItem,
} from './breakout.js';
import {
  FIELD_X, FIELD_W, GRID_TOP, PADDLE_W, PADDLE_Y, BALL_R, LAUNCH_DELAY, VIEW_H, CELL, COLS, ROWS,
  BIG_PADDLE_W, BIG_PADDLE_TIME, STAR_TIME,
} from './config.js';

const speedOf = (b) => Math.hypot(b.vx, b.vy);

// Une grille simple que la balle peut casser (dans le jeu, c'est le Tetris).
function solids(grid) {
  return {
    get: (c, r) => grid[r][c],
    clear(c, r) {
      const color = grid[r][c];
      grid[r][c] = 0;
      return { color };
    },
  };
}

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
    const events = stepBall(s, 0.1, solids(grid));
    expect(grid[5][4]).toBe(0);
    expect(s.ball.vy).toBeGreaterThan(0);
    expect(events).toContainEqual(expect.objectContaining({ type: 'cell', col: 4, row: 5, color: 3 }));
  });

  it('de côté, elle repart dans l’autre sens', () => {
    const grid = emptyGrid();
    grid[5][6] = 1;
    const [x, y] = cellCenter(5, 5);
    const s = flyingBall(x, y, 260, 0.0001);
    stepBall(s, 0.1, solids(grid));
    expect(grid[5][6]).toBe(0);
    expect(s.ball.vx).toBeLessThan(0);
  });

  it('entre deux cases, elle n’en casse qu’une', () => {
    const grid = emptyGrid();
    grid[5][4] = 1;
    grid[5][5] = 1;
    const x = FIELD_X + 5 * CELL; // pile sur la jointure
    const s = flyingBall(x, GRID_TOP + 7 * CELL, 0, -260);
    stepBall(s, 0.1, solids(grid));
    expect(grid[5][4] + grid[5][5]).toBe(1);
  });

  it('même très vite, elle ne traverse pas une rangée', () => {
    const grid = emptyGrid();
    for (let c = 0; c < COLS; c++) grid[3][c] = 2;
    const [x] = cellCenter(4, 0);
    const s = flyingBall(x, GRID_TOP + 10 * CELL, 0, -3000);
    stepBall(s, 0.1, solids(grid)); // 300 px en un seul appel
    expect(grid[3].filter((v) => v === 0)).toHaveLength(1);
    expect(s.ball.y).toBeGreaterThan(GRID_TOP + 4 * CELL - BALL_R - 0.01);
  });

  it('coincée dans une case (pièce verrouillée sur elle), elle la casse sans rebondir', () => {
    const grid = emptyGrid();
    grid[5][4] = 1;
    const [x, y] = cellCenter(4, 5);
    const s = flyingBall(x, y, 0, -260);
    const events = stepBall(s, 0.01, solids(grid));
    expect(grid[5][4]).toBe(0);
    expect(s.ball.vy).toBeLessThan(0);
    expect(events.some((e) => e.type === 'cell')).toBe(true);
  });
});

describe('bonus', () => {
  const emptyGrid = () => Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

  it('étoile : la fée casse sans rebondir, puis redevient normale', () => {
    const grid = emptyGrid();
    grid[5][4] = 1;
    grid[4][4] = 1;
    const x = FIELD_X + 4.5 * CELL;
    const s = flyingBall(x, GRID_TOP + 7 * CELL, 0, -260);
    applyPowerUp(s, 'star');
    stepBall(s, 0.2, solids(grid));
    expect(grid[5][4] + grid[4][4]).toBe(0);
    expect(s.ball.vy).toBeLessThan(0); // toujours vers le haut
    stepBall(s, STAR_TIME, null);
    expect(s.star).toBe(0);
  });

  it('champignon : planche plus large, puis normale', () => {
    const s = createBreakout();
    applyPowerUp(s, 'mushroom');
    expect(s.paddle.w).toBe(BIG_PADDLE_W);
    stepBall(s, BIG_PADDLE_TIME + 0.1);
    expect(s.paddle.w).toBe(PADDLE_W);
  });

  it('la planche large reste entre les murs', () => {
    const s = createBreakout();
    movePaddle(s, 5000);
    applyPowerUp(s, 'mushroom');
    expect(s.paddle.x + s.paddle.w / 2).toBeLessThanOrEqual(FIELD_X + FIELD_W);
  });

  it('un bonus qui tombe sur la planche est attrapé', () => {
    const s = createBreakout();
    dropItem(s, 'heart', s.paddle.x, PADDLE_Y - 30);
    let events = [];
    for (let i = 0; i < 120 && !events.length; i++) {
      events = stepBall(s, 1 / 60).filter((e) => e.type === 'item');
    }
    expect(events).toEqual([expect.objectContaining({ type: 'item', kind: 'heart' })]);
    expect(s.items).toHaveLength(0);
  });

  it('un bonus raté disparaît en bas de l’écran', () => {
    const s = createBreakout();
    dropItem(s, 'star', FIELD_X + 10, PADDLE_Y - 30);
    movePaddle(s, 5000);
    for (let i = 0; i < 600; i++) stepBall(s, 1 / 60);
    expect(s.items).toHaveLength(0);
  });
});
