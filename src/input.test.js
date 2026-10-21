import { describe, it, expect } from 'vitest';
import { createSticks } from './input.js';
import { STICK_RADIUS_PX as R, REPEAT_DELAY, REPEAT_RATE, STICK_DEADZONE } from './config.js';

function setup() {
  const actions = [];
  const s = createSticks({ action: (a) => actions.push(a) });
  return { s, actions };
}

describe('joystick gauche : la pièce', () => {
  it('pousser à droite : une colonne tout de suite', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100 + R * 0.8, 500);
    expect(actions).toEqual(['right']);
  });

  it('une petite poussée ne fait rien', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100 + R * 0.3, 505);
    s.update(1);
    expect(actions).toEqual([]);
  });

  it('tenir à gauche répète après un court délai', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100 - R, 500);
    s.update(REPEAT_DELAY - 0.01);
    expect(actions).toEqual(['left']);
    s.update(0.02 + REPEAT_RATE * 3);
    expect(actions.length).toBeGreaterThanOrEqual(4);
    expect(actions.every((a) => a === 'left')).toBe(true);
  });

  it('relâcher arrête la répétition', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100 + R, 500);
    s.up(1, 100 + R, 500, 400);
    s.update(1);
    expect(actions).toEqual(['right']);
  });

  it('revenir au centre arrête aussi la répétition', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100 + R, 500);
    s.move(1, 100, 500);
    s.update(1);
    expect(actions).toEqual(['right']);
  });

  it('vers le haut : une seule chute, même en tenant', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100, 500 - R);
    s.update(1);
    s.move(1, 103, 500 - R);
    expect(actions).toEqual(['drop']);
  });

  it('pour relancer, il faut revenir au centre', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100, 500 - R);
    s.move(1, 100, 500);
    s.move(1, 100, 500 - R);
    expect(actions).toEqual(['drop', 'drop']);
  });

  it('vers le bas : la pièce tourne une fois', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100, 500 + R);
    s.update(1);
    expect(actions).toEqual(['rotate']);
  });

  it('une petite touche fait tourner', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.up(1, 102, 501, 120);
    expect(actions).toEqual(['rotate']);
  });

  it('un flick vers le bas ne fait pas tourner deux fois', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100, 500 + R);
    s.up(1, 100, 500 + R, 100);
    expect(actions).toEqual(['rotate']);
  });

  it('de droite à haut : déplace puis lance', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100 + R, 500);
    s.move(1, 100, 500 - R);
    expect(actions).toEqual(['right', 'drop']);
  });

  it('on lit la position du joystick pour le dessiner, limitée à sa course', () => {
    const { s } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.move(1, 100 + R * 3, 500);
    const [stick] = s.sticks();
    expect(stick).toMatchObject({ side: 'left', ox: 100, oy: 500, kx: 100 + R, ky: 500 });
  });
});

describe('joystick droit : la planche', () => {
  it('au centre, la planche ne bouge pas', () => {
    const { s } = setup();
    expect(s.paddle()).toBe(0);
    s.down(2, 300, 500, 0, 'right');
    expect(s.paddle()).toBe(0);
  });

  it('à fond à droite : vitesse maximale', () => {
    const { s } = setup();
    s.down(2, 300, 500, 0, 'right');
    s.move(2, 300 + R * 2, 500);
    expect(s.paddle()).toBe(1);
    s.move(2, 300 - R, 500);
    expect(s.paddle()).toBe(-1);
  });

  it('petite poussée : petite vitesse, pour viser', () => {
    const { s } = setup();
    s.down(2, 300, 500, 0, 'right');
    s.move(2, 300 + R * 0.4, 500);
    expect(s.paddle()).toBeGreaterThan(0);
    expect(s.paddle()).toBeLessThan(0.3);
  });

  it('zone morte : un pouce qui tremble ne bouge pas la planche', () => {
    const { s } = setup();
    s.down(2, 300, 500, 0, 'right');
    s.move(2, 300 + R * STICK_DEADZONE * 0.9, 500);
    expect(s.paddle()).toBe(0);
  });

  it('seul le mouvement horizontal compte', () => {
    const { s } = setup();
    s.down(2, 300, 500, 0, 'right');
    s.move(2, 300, 500 - R);
    expect(s.paddle()).toBe(0);
  });

  it('relâcher : la planche s’arrête', () => {
    const { s } = setup();
    s.down(2, 300, 500, 0, 'right');
    s.move(2, 300 + R, 500);
    s.up(2, 300 + R, 500, 300);
    expect(s.paddle()).toBe(0);
  });

  it('une touche à droite ne fait pas tourner la pièce', () => {
    const { s, actions } = setup();
    s.down(2, 300, 500, 0, 'right');
    s.up(2, 300, 500, 50);
    expect(actions).toEqual([]);
  });
});

describe('deux pouces', () => {
  it('chaque joystick garde son rôle', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.down(2, 300, 500, 5, 'right');
    s.move(2, 300 + R, 500);
    s.move(1, 100 - R, 500);
    expect(actions).toEqual(['left']);
    expect(s.paddle()).toBe(1);
    expect(s.sticks()).toHaveLength(2);
  });

  it('un deuxième doigt du même côté est ignoré', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.down(3, 120, 400, 5, 'left');
    s.move(3, 120 + R, 400);
    s.up(3, 120 + R, 400, 50);
    expect(actions).toEqual([]);
    expect(s.sticks()).toHaveLength(1);
  });

  it('cancelAll oublie tout (début de partie, reprise)', () => {
    const { s, actions } = setup();
    s.down(1, 100, 500, 0, 'left');
    s.down(2, 300, 500, 0, 'right');
    s.move(2, 300 + R, 500);
    s.cancelAll();
    s.up(1, 100, 500, 50);
    expect(actions).toEqual([]);
    expect(s.paddle()).toBe(0);
    expect(s.sticks()).toHaveLength(0);
  });
});
