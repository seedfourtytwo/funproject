import {
  VIEW_W, PAUSE_BUTTON, STICK_RADIUS_PX, STICK_TRIGGER,
  REPEAT_DELAY, REPEAT_RATE, TAP_SLOP_PX, TAP_MS, PADDLE_DRAG_SENSITIVITY, PADDLE_KEY_SPEED,
} from './config.js';

// Les commandes des deux pouces.
//   gauche : un joystick pour la pièce. Il apparaît là où le pouce se pose
//            (son centre), et sa « tête » suit le pouce sans dépasser
//            STICK_RADIUS_PX. Gauche / droite = une colonne (répétée si on
//            tient), haut = chute au plafond, bas ou petite touche = rotation.
//   droite : la planche suit le doigt qui glisse, du même nombre de pixels.
// Ne connaît ni l'écran ni le jeu : on lui donne des positions (pixels
// d'écran) et des heures (ms), il appelle action('left' | 'right' | 'rotate' | 'drop').
export function createControls({ action }) {
  const sticks = new Map(); // un pouce par côté : 'left' / 'right'
  let paddleDx = 0; // glissé du pouce droit pas encore donné à la planche

  const find = (id) => [...sticks.values()].find((s) => s.id === id);

  // Où pointe le joystick gauche : 'left', 'right', 'up', 'down' ou null.
  function direction(s) {
    const dx = s.kx - s.ox;
    const dy = s.ky - s.oy;
    if (Math.hypot(dx, dy) < STICK_TRIGGER * STICK_RADIUS_PX) return null;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy < 0 ? 'up' : 'down';
  }

  const DIRECTION_ACTIONS = { left: 'left', right: 'right', up: 'drop', down: 'rotate' };

  return {
    down(id, x, y, t, side) {
      if (sticks.has(side)) return; // déjà un pouce de ce côté
      sticks.set(side, { id, side, ox: x, oy: y, kx: x, ky: y, t0: t, travel: 0, dir: null, repeat: 0 });
    },

    move(id, x, y) {
      const s = find(id);
      if (!s) return;
      const dx = x - s.ox;
      const dy = y - s.oy;
      const dist = Math.hypot(dx, dy);
      s.travel = Math.max(s.travel, dist);
      if (s.side === 'right') {
        paddleDx += x - s.kx;
        s.kx = x;
        return;
      }
      const k = dist > STICK_RADIUS_PX ? STICK_RADIUS_PX / dist : 1;
      s.kx = s.ox + dx * k;
      s.ky = s.oy + dy * k;

      const dir = direction(s);
      if (dir === s.dir) return;
      s.dir = dir;
      s.repeat = REPEAT_DELAY;
      if (dir) action(DIRECTION_ACTIONS[dir]);
    },

    up(id, x, y, t) {
      const s = find(id);
      if (!s) return;
      sticks.delete(s.side);
      const isTap = s.travel < TAP_SLOP_PX && t - s.t0 < TAP_MS;
      if (s.side === 'left' && isTap) action('rotate');
    },

    cancel(id) {
      const s = find(id);
      if (s) sticks.delete(s.side);
    },

    cancelAll() {
      sticks.clear();
      paddleDx = 0;
    },

    // Fait passer le temps : répète gauche / droite tant qu'on tient.
    update(dt) {
      const s = sticks.get('left');
      if (!s || (s.dir !== 'left' && s.dir !== 'right')) return;
      s.repeat -= dt;
      while (s.repeat <= 0) {
        action(s.dir);
        s.repeat += REPEAT_RATE;
      }
    },

    // Ce que le pouce droit a glissé depuis la dernière fois, en pixels
    // logiques. scale : pixels d'écran par pixel logique.
    takePaddle(scale = 1) {
      const dx = (paddleDx / scale) * PADDLE_DRAG_SENSITIVITY;
      paddleDx = 0;
      return dx;
    },

    // Le joystick de la pièce s'il est tenu, pour le dessiner : centre (ox, oy) et tête (kx, ky).
    sticks() {
      const s = sticks.get('left');
      return s ? [{ side: 'left', ox: s.ox, oy: s.oy, kx: s.kx, ky: s.ky }] : [];
    },
  };
}

// Branche les deux pouces et le clavier sur le canvas. Le jeu lit ensuite :
//   input.takeActions() : commandes de pièce en attente (et 'pause')
//   input.paddleMove(dt) : déplacement de la planche pendant dt secondes
//   input.takeTaps() : nombre de touchers, pour les écrans menu / pause / fin
//   input.sticks() : le joystick à dessiner, en pixels logiques
export function createInput(screen) {
  const input = { actions: [], taps: 0, keys: new Set() };
  const canvas = screen.canvas;
  const sticks = createControls({ action: (a) => input.actions.push(a) });

  // Position du doigt dans l'écran logique.
  const logicalX = (clientX) => (clientX - screen.left) / screen.scale;
  const logicalY = (clientY) => (clientY - screen.top) / screen.scale;
  const onPauseButton = (e) => {
    const b = PAUSE_BUTTON;
    const x = logicalX(e.clientX);
    const y = logicalY(e.clientY);
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  };

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (onPauseButton(e)) {
      input.actions.push('pause');
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    input.taps++;
    const side = logicalX(e.clientX) < VIEW_W / 2 ? 'left' : 'right';
    sticks.down(e.pointerId, e.clientX, e.clientY, e.timeStamp, side);
  });
  canvas.addEventListener('pointermove', (e) => sticks.move(e.pointerId, e.clientX, e.clientY));
  canvas.addEventListener('pointerup', (e) => sticks.up(e.pointerId, e.clientX, e.clientY, e.timeStamp));
  canvas.addEventListener('pointercancel', (e) => sticks.cancel(e.pointerId));
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

  input.update = (dt) => sticks.update(dt);

  // Planche : glissé du pouce droit, ou A / D au clavier.
  input.paddleMove = (dt) => {
    let keys = 0;
    if (input.keys.has('KeyA')) keys -= 1;
    if (input.keys.has('KeyD')) keys += 1;
    return sticks.takePaddle(screen.scale) + keys * PADDLE_KEY_SPEED * dt;
  };

  input.sticks = () => sticks.sticks().map((s) => ({
    side: s.side,
    ox: logicalX(s.ox), oy: logicalY(s.oy),
    kx: logicalX(s.kx), ky: logicalY(s.ky),
    r: STICK_RADIUS_PX / screen.scale,
  }));

  input.takeActions = () => input.actions.splice(0);
  input.resetGestures = () => {
    sticks.cancelAll();
    input.actions.length = 0;
  };
  input.takeTaps = () => {
    const n = input.taps;
    input.taps = 0;
    return n;
  };

  return input;
}
