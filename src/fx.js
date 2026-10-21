// Les effets : éclats de briques, étincelles, textes qui flottent,
// tremblement de l'écran, flash et vibrations. Rien ici ne change la partie,
// c'est juste pour que ce soit agréable à regarder.

export const MAX_PARTICLES = 400;
const GRAVITY = 700; // les éclats retombent (px par seconde²)

export function createFx() {
  return { particles: [], texts: [], shake: 0, flash: 0 };
}

function add(fx, p) {
  if (fx.particles.length < MAX_PARTICLES) fx.particles.push(p);
}

// Une brique qui éclate en quatre morceaux, comme dans les jeux de plateforme.
// color : le numéro de la pièce (1 à 7).
export function burst(fx, x, y, color) {
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const life = 0.6 + Math.random() * 0.3;
    add(fx, {
      kind: 'chunk', color, x: x + dx * 5, y: y + dy * 5,
      vx: dx * (60 + Math.random() * 60), vy: dy * 40 - 160 - Math.random() * 80,
      life, max: life,
    });
  }
}

// Petites étoiles, pour la fée.
export function sparkle(fx, x, y, count = 1) {
  for (let i = 0; i < count; i++) {
    const life = 0.3 + Math.random() * 0.3;
    add(fx, {
      kind: 'spark', x, y,
      vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50,
      life, max: life,
    });
  }
}

export function floatText(fx, x, y, text, color = '#f8d800') {
  fx.texts.push({ x, y, text, color, life: 1, max: 1 });
}

export function shake(fx, amount) {
  fx.shake = Math.max(fx.shake, amount);
}

export function flash(fx, amount) {
  fx.flash = Math.max(fx.flash, amount);
}

// Vibration du téléphone, si le navigateur sait faire (pas sur iPhone).
export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // certains navigateurs refusent tant qu'on n'a pas touché l'écran
  }
}

export function stepFx(fx, dt) {
  for (const p of fx.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'chunk') p.vy += GRAVITY * dt;
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);

  for (const t of fx.texts) {
    t.life -= dt;
    t.y -= 30 * dt;
  }
  fx.texts = fx.texts.filter((t) => t.life > 0);

  fx.shake *= Math.exp(-8 * dt);
  fx.flash = Math.max(0, fx.flash - dt * 2);
}
