import { describe, it, expect } from 'vitest';
import { createControls } from './input.js';
import { STICK_RADIUS_PX as R, REPEAT_DELAY, REPEAT_RATE, PADDLE_DRAG_SENSITIVITY } from './config.js';

function setup() {
  const actions = [];
  const s = createControls({ action: (a) => actions.push(a) });
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

describe('pouce droit : la planche suit le doigt', () => {
  it('poser le doigt ne téléporte pas la planche', () => {
    const { s } = setup();
    s.down(2, 300, 500, 0, 'right');
    expect(s.takePaddle()).toBe(0);
  });

  it('elle bouge exactement comme le doigt, en pixels logiques', () => {
    const { s } = setup();
    s.down(2, 300, 500, 0, 'right');
    s.move(2, 340, 520);
    expect(s.takePaddle(2)).toBeCloseTo((40 / 2) * PADDLE_DRAG_SENSITIVITY); // écran agrandi 2×
  });

  it('chaque mouvement n’est compté qu’une fois', () => {
    const { s } = setup();
    s.down(2, 300, 500, 0, 'right');
    s.move(2, 310, 500);
    s.takePaddle(1);
    expect(s.takePaddle(1)).toBe(0);
    s.move(2, 305, 500);
    expect(s.takePaddle(1)).toBeCloseTo(-5 * PADDLE_DRAG_SENSITIVITY);
  });

  it('pas de joystick à dessiner à droite', () => {
    const { s } = setup();
    s.down(2, 300, 500, 0, 'right');
    expect(s.sticks()).toEqual([]);
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
    s.move(2, 330, 500);
    s.move(1, 100 - R, 500);
    expect(actions).toEqual(['left']);
    expect(s.takePaddle(1)).toBeCloseTo(30 * PADDLE_DRAG_SENSITIVITY);
    expect(s.sticks()).toHaveLength(1);
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
    s.cancelAll();
    s.move(2, 340, 500);
    s.up(1, 100, 500, 50);
    expect(actions).toEqual([]);
    expect(s.takePaddle(1)).toBe(0);
    expect(s.sticks()).toHaveLength(0);
  });
});
