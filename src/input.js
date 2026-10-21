import {
  VIEW_W, PAUSE_BUTTON, STICK_RADIUS_PX, STICK_TRIGGER, STICK_DEADZONE,
  REPEAT_DELAY, REPEAT_RATE, TAP_SLOP_PX, TAP_MS, PADDLE_STICK_SPEED, PADDLE_KEY_SPEED,
} from './config.js';

// Les deux joysticks. Chacun apparaît là où le pouce se pose (son centre),
// et la « tête » suit le pouce sans dépasser STICK_RADIUS_PX.
//   gauche : la pièce. Gauche / droite = une colonne (répétée si on tient),
//            haut = chute au plafond, bas ou petite touche = rotation.
//   droite : la planche. Plus on pousse, plus elle va vite.
// Ne connaît ni l'écran ni le jeu : on lui donne des positions (pixels
// d'écran) et des heures (ms), il appelle action('left' | 'right' | 'rotate' | 'drop').
export function createSticks({ action }) {
  const sticks = new Map(); // un joystick par côté : 'left' / 'right'

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
      const k = dist > STICK_RADIUS_PX ? STICK_RADIUS_PX / dist : 1;
      s.kx = s.ox + dx * k;
      s.ky = s.oy + dy * k;

      if (s.side !== 'left') return;
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

    // Vitesse demandée pour la planche, de -1 (à fond à gauche) à 1.
    // Courbe douce : petite poussée = petite vitesse, pour viser.
    paddle() {
      const s = sticks.get('right');
      if (!s) return 0;
      const v = (s.kx - s.ox) / STICK_RADIUS_PX;
      const a = Math.abs(v);
      if (a < STICK_DEADZONE) return 0;
      return Math.sign(v) * ((a - STICK_DEADZONE) / (1 - STICK_DEADZONE)) ** 1.6;
    },

    // Les joysticks en cours, pour les dessiner : centre (ox, oy) et tête (kx, ky).
    sticks() {
      return [...sticks.values()].map(({ side, ox, oy, kx, ky }) => ({ side, ox, oy, kx, ky }));
    },
  };
}

// Branche les joysticks et le clavier sur le canvas. Le jeu lit ensuite :
//   input.takeActions() : commandes de pièce en attente (et 'pause')
//   input.paddleMove(dt) : déplacement de la planche pendant dt secondes
//   input.takeTaps() : nombre de touchers, pour les écrans menu / pause / fin
//   input.sticks() : les joysticks à dessiner, en pixels logiques
export function createInput(screen) {
  const input = { actions: [], taps: 0, keys: new Set() };
  const canvas = screen.canvas;
  const sticks = createSticks({ action: (a) => input.actions.push(a) });

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

  // Planche : joystick droit, ou A / D au clavier.
  input.paddleMove = (dt) => {
    let keys = 0;
    if (input.keys.has('KeyA')) keys -= 1;
    if (input.keys.has('KeyD')) keys += 1;
    return sticks.paddle() * PADDLE_STICK_SPEED * dt + keys * PADDLE_KEY_SPEED * dt;
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
