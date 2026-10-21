import {
  FIELD_X, FIELD_W, GRID_TOP, VIEW_H, CELL, COLS, ROWS,
  PADDLE_W, PADDLE_H, PADDLE_Y, BALL_R, BALL_SPEED, LAUNCH_DELAY, MAX_BOUNCE_ANGLE,
  ITEM_SIZE, ITEM_FALL_SPEED, BIG_PADDLE_W, BIG_PADDLE_TIME, STAR_TIME,
} from './config.js';

const LEFT = FIELD_X;
const RIGHT = FIELD_X + FIELD_W;

// La balle n'avance jamais de plus de 2 px d'un coup : elle ne peut pas
// « sauter » par-dessus un mur ou la raquette entre deux calculs (anti-tunnel).
const MAX_MOVE = 2;

export function createBreakout() {
  const state = {
    paddle: { x: LEFT + FIELD_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: BALL_R, stuck: true, wait: LAUNCH_DELAY },
    speed: BALL_SPEED,
    items: [], // bonus qui tombent vers la planche
    star: 0, // secondes restantes où la fée traverse tout
    big: 0, // secondes restantes de planche large
  };
  resetBall(state);
  return state;
}

// Mouvement relatif : la raquette bouge d'autant que le doigt.
export function movePaddle(state, dx) {
  const half = state.paddle.w / 2;
  state.paddle.x = Math.min(RIGHT - half, Math.max(LEFT + half, state.paddle.x + dx));
}

// Un bonus attrapé. Le cœur (une vie) est géré par le jeu, pas ici.
export function applyPowerUp(state, kind) {
  if (kind === 'star') state.star = STAR_TIME;
  if (kind === 'mushroom') {
    state.big = BIG_PADDLE_TIME;
    state.paddle.w = BIG_PADDLE_W;
    movePaddle(state, 0); // la planche élargie reste entre les murs
  }
}

// Un bonus sort d'une brique cassée et tombe.
export function dropItem(state, kind, x, y) {
  state.items.push({ kind, x, y });
}

function stepItems(state, dt, events) {
  const p = state.paddle;
  const half = ITEM_SIZE / 2;
  state.items = state.items.filter((item) => {
    item.y += ITEM_FALL_SPEED * dt;
    const caught = item.y + half >= p.y && item.y - half <= p.y + p.h
      && Math.abs(item.x - p.x) <= p.w / 2 + half;
    if (caught) {
      events.push({ type: 'item', kind: item.kind, x: item.x, y: item.y });
      return false;
    }
    return item.y - half < VIEW_H;
  });
}

function stepTimers(state, dt) {
  state.star = Math.max(0, state.star - dt);
  if (state.big > 0) {
    state.big = Math.max(0, state.big - dt);
    if (state.big === 0) {
      state.paddle.w = PADDLE_W;
      movePaddle(state, 0);
    }
  }
}

// angle : 0 = tout droit vers le haut, positif = vers la droite.
export function launch(state, angle) {
  const b = state.ball;
  b.stuck = false;
  b.vx = state.speed * Math.sin(angle);
  b.vy = -state.speed * Math.cos(angle);
}

// Change la vitesse sans changer la direction (difficulté).
export function setSpeed(state, speed) {
  const b = state.ball;
  const current = Math.hypot(b.vx, b.vy);
  if (current > 0) {
    b.vx *= speed / current;
    b.vy *= speed / current;
  }
  state.speed = speed;
}

function resetBall(state) {
  const b = state.ball;
  state.star = 0;
  b.stuck = true;
  b.wait = LAUNCH_DELAY;
  b.vx = 0;
  b.vy = 0;
  b.x = state.paddle.x;
  b.y = state.paddle.y - b.r;
}

// La case pleine de la grille que la balle touche, la plus proche de son
// centre (une seule à la fois, même pile sur une jointure). Sinon null.
function touchedCell(b, solids) {
  if (!solids) return null;
  const c0 = Math.max(0, Math.floor((b.x - b.r - FIELD_X) / CELL));
  const c1 = Math.min(COLS - 1, Math.floor((b.x + b.r - FIELD_X) / CELL));
  const r0 = Math.max(0, Math.floor((b.y - b.r - GRID_TOP) / CELL));
  const r1 = Math.min(ROWS - 1, Math.floor((b.y + b.r - GRID_TOP) / CELL));
  let best = null;
  let bestDist = Infinity;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (!solids.get(c, r)) continue;
      const d = Math.hypot(FIELD_X + (c + 0.5) * CELL - b.x, GRID_TOP + (r + 0.5) * CELL - b.y);
      if (d < bestDist) {
        bestDist = d;
        best = { col: c, row: r };
      }
    }
  }
  return best;
}

function breakCell(solids, hit, events) {
  const info = solids.clear(hit.col, hit.row);
  events.push({
    type: 'cell', col: hit.col, row: hit.row, ...info,
    x: FIELD_X + (hit.col + 0.5) * CELL, y: GRID_TOP + (hit.row + 0.5) * CELL,
  });
}

// Fait avancer la balle et les bonus de dt secondes. solids (facultatif) :
// ce que la balle peut casser, avec get(col, row) pour savoir si une case est
// pleine et clear(col, row) pour la casser. Dans le jeu, c'est le Tetris.
// Renvoie la liste de ce qui s'est passé (rebonds, cases cassées, bonus
// attrapés, balle perdue) pour que le reste du jeu réagisse.
export function stepBall(state, dt, solids = null) {
  const events = [];
  const b = state.ball;
  stepTimers(state, dt);
  stepItems(state, dt, events);

  if (b.stuck) {
    b.x = state.paddle.x;
    b.y = state.paddle.y - b.r;
    b.wait -= dt;
    if (b.wait <= 0) launch(state, (Math.random() - 0.5) * (Math.PI / 4));
    return events;
  }

  const distance = Math.hypot(b.vx, b.vy) * dt;
  const steps = Math.max(1, Math.ceil(distance / MAX_MOVE));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    if (moveOnce(state, h, events, solids)) break;
  }
  return events;
}

// Un petit pas. Renvoie true si la balle est perdue.
function moveOnce(state, h, events, solids) {
  const b = state.ball;
  const p = state.paddle;
  const prevY = b.y;

  // Une pièce vient de se verrouiller sur la balle : elle casse ce qui
  // l'entoure sans rebondir, sinon elle resterait prisonnière.
  for (let hit = touchedCell(b, solids); hit; hit = touchedCell(b, solids)) breakCell(solids, hit, events);

  // On avance d'abord en x puis en y : on sait ainsi de quel côté la balle
  // a touché une case, donc quelle direction inverser. Avec l'étoile, elle
  // casse tout sur son passage sans rebondir.
  b.x += b.vx * h;
  const hitX = touchedCell(b, solids);
  if (hitX && !state.star) {
    b.x -= b.vx * h;
    b.vx = -b.vx;
  }
  if (hitX) breakCell(solids, hitX, events);
  if (b.x - b.r < LEFT) {
    b.x = LEFT + b.r;
    b.vx = Math.abs(b.vx);
    events.push({ type: 'wall', x: b.x, y: b.y });
  } else if (b.x + b.r > RIGHT) {
    b.x = RIGHT - b.r;
    b.vx = -Math.abs(b.vx);
    events.push({ type: 'wall', x: b.x, y: b.y });
  }

  b.y += b.vy * h;
  const hitY = touchedCell(b, solids);
  if (hitY && !state.star) {
    b.y -= b.vy * h;
    b.vy = -b.vy;
  }
  if (hitY) breakCell(solids, hitY, events);
  if (b.y - b.r < GRID_TOP) {
    b.y = GRID_TOP + b.r;
    b.vy = Math.abs(b.vy);
    events.push({ type: 'wall', x: b.x, y: b.y });
  }

  // La raquette ne compte que si la balle descend et franchit son bord haut.
  const crossedTop = b.vy > 0 && prevY + b.r <= p.y && b.y + b.r >= p.y;
  if (crossedTop && Math.abs(b.x - p.x) <= p.w / 2 + b.r) {
    // Plus on tape loin du centre, plus la balle repart en biais.
    const offset = Math.max(-1, Math.min(1, (b.x - p.x) / (p.w / 2)));
    const angle = offset * MAX_BOUNCE_ANGLE;
    b.y = p.y - b.r;
    b.vx = state.speed * Math.sin(angle);
    b.vy = -state.speed * Math.cos(angle);
    events.push({ type: 'paddle', x: b.x, y: b.y });
  }

  if (b.y - b.r > VIEW_H) {
    events.push({ type: 'lost' });
    resetBall(state);
    return true;
  }
  return false;
}
