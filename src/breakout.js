import {
  FIELD_X, FIELD_W, GRID_TOP, VIEW_H,
  PADDLE_W, PADDLE_H, PADDLE_Y, BALL_R, BALL_SPEED, LAUNCH_DELAY, MAX_BOUNCE_ANGLE,
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
  };
  resetBall(state);
  return state;
}

// Mouvement relatif : la raquette bouge d'autant que le doigt.
export function movePaddle(state, dx) {
  const half = state.paddle.w / 2;
  state.paddle.x = Math.min(RIGHT - half, Math.max(LEFT + half, state.paddle.x + dx));
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
  b.stuck = true;
  b.wait = LAUNCH_DELAY;
  b.vx = 0;
  b.vy = 0;
  b.x = state.paddle.x;
  b.y = state.paddle.y - b.r;
}

// Fait avancer la balle de dt secondes. Renvoie la liste de ce qui s'est
// passé (rebonds, balle perdue) pour que le reste du jeu réagisse :
// son, vibration, vies...
export function stepBall(state, dt) {
  const events = [];
  const b = state.ball;

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
    if (moveOnce(state, h, events)) break;
  }
  return events;
}

// Un petit pas. Renvoie true si la balle est perdue.
function moveOnce(state, h, events) {
  const b = state.ball;
  const p = state.paddle;
  const prevY = b.y;

  b.x += b.vx * h;
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
