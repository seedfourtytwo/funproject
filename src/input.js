import {
  GRID_BOTTOM, MOVE_STEP_PX, SWIPE_UP_PX, TAP_SLOP_PX, TAP_MS,
  PADDLE_SENSITIVITY, PADDLE_KEY_SPEED,
} from './config.js';

// Reconnaît les gestes, doigt par doigt. Ne connaît ni l'écran ni le jeu :
// on lui donne des positions (en pixels d'écran) et des heures (en ms),
// il appelle action('left' | 'right' | 'rotate' | 'drop') ou paddle(dx).
export function createGestures({ scale, action, paddle }) {
  const fingers = new Map();

  return {
    down(id, x, y, t, zone) {
      fingers.set(id, { zone, x0: x, y0: y, t0: t, lastX: x, stepX: 0, travel: 0, dropped: false });
    },

    move(id, x, y) {
      const f = fingers.get(id);
      if (!f) return;
      const dx = x - f.lastX;
      f.lastX = x;
      f.travel = Math.max(f.travel, Math.hypot(x - f.x0, y - f.y0));

      if (f.zone === 'paddle') {
        paddle((dx / scale()) * PADDLE_SENSITIVITY);
        return;
      }
      if (f.dropped) return;

      const totalX = x - f.x0;
      const totalY = y - f.y0;
      if (-totalY >= SWIPE_UP_PX && -totalY > Math.abs(totalX)) {
        f.dropped = true;
        action('drop');
        return;
      }

      f.stepX += dx;
      while (f.stepX >= MOVE_STEP_PX) {
        f.stepX -= MOVE_STEP_PX;
        action('right');
      }
      while (f.stepX <= -MOVE_STEP_PX) {
        f.stepX += MOVE_STEP_PX;
        action('left');
      }
    },

    up(id, x, y, t) {
      const f = fingers.get(id);
      if (!f) return;
      this.move(id, x, y);
      fingers.delete(id);
      const isTap = f.travel < TAP_SLOP_PX && t - f.t0 < TAP_MS;
      if (f.zone === 'piece' && isTap) action('rotate');
    },

    cancel(id) {
      fingers.delete(id);
    },
  };
}

// Branche les gestes et le clavier sur le canvas. Le jeu lit ensuite :
//   input.actions : liste des commandes de pièce en attente (on la vide en la lisant)
//   input.paddleDx : déplacement de raquette accumulé (idem)
//   input.taps : nombre de touchers, pour les écrans menu / pause / fin
export function createInput(screen) {
  const input = { actions: [], paddleDx: 0, taps: 0, keys: new Set() };
  const canvas = screen.canvas;

  const gestures = createGestures({
    scale: () => screen.scale,
    action: (a) => input.actions.push(a),
    paddle: (dx) => { input.paddleDx += dx; },
  });

  // Coordonnée verticale du doigt dans l'écran logique 360 × 640.
  const logicalY = (e) => (e.clientY - screen.top) / screen.scale;

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    input.taps++;
    const zone = logicalY(e) < GRID_BOTTOM ? 'piece' : 'paddle';
    gestures.down(e.pointerId, e.clientX, e.clientY, e.timeStamp, zone);
  });
  canvas.addEventListener('pointermove', (e) => {
    // Les mouvements intermédiaires groupés par le navigateur, pour plus de précision.
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const c of events.length ? events : [e]) gestures.move(e.pointerId, c.clientX, c.clientY);
  });
  canvas.addEventListener('pointerup', (e) => gestures.up(e.pointerId, e.clientX, e.clientY, e.timeStamp));
  canvas.addEventListener('pointercancel', (e) => gestures.cancel(e.pointerId));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // Safari iOS : empêche le zoom à deux doigts.
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  const KEY_ACTIONS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'drop',
    KeyZ: 'rotateLeft', KeyX: 'rotate',
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat && e.code === 'ArrowUp') return;
    const a = KEY_ACTIONS[e.code];
    if (a) input.actions.push(a);
    if (e.code === 'Space' || e.code === 'Enter') input.taps++;
    if (e.code === 'KeyP' || e.code === 'Escape') input.actions.push('pause');
    input.keys.add(e.code);
    if (a || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());

  // Raquette au clavier (A / D maintenues).
  input.keyPaddle = (dt) => {
    let dir = 0;
    if (input.keys.has('KeyA')) dir -= 1;
    if (input.keys.has('KeyD')) dir += 1;
    return dir * PADDLE_KEY_SPEED * dt;
  };

  input.takeActions = () => input.actions.splice(0);
  input.takePaddle = () => {
    const dx = input.paddleDx;
    input.paddleDx = 0;
    return dx;
  };
  input.takeTaps = () => {
    const n = input.taps;
    input.taps = 0;
    return n;
  };

  return input;
}
