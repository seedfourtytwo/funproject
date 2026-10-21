import { describe, it, expect } from 'vitest';
import { createGestures } from './input.js';
import { MOVE_STEP_PX, SWIPE_UP_PX, PADDLE_SENSITIVITY } from './config.js';

function setup(scale = 1) {
  const actions = [];
  let paddle = 0;
  const g = createGestures({
    scale: () => scale,
    action: (a) => actions.push(a),
    paddle: (dx) => { paddle += dx; },
  });
  return { g, actions, paddle: () => paddle };
}

describe('zone haute : la pièce', () => {
  it('un toucher bref la fait tourner', () => {
    const { g, actions } = setup();
    g.down(1, 100, 100, 0, 'piece');
    g.up(1, 103, 101, 120);
    expect(actions).toEqual(['rotate']);
  });

  it('un toucher trop long ne fait rien', () => {
    const { g, actions } = setup();
    g.down(1, 100, 100, 0, 'piece');
    g.up(1, 100, 100, 900);
    expect(actions).toEqual([]);
  });

  it('glisser à droite : une colonne par tranche de 30 px', () => {
    const { g, actions } = setup();
    g.down(1, 100, 100, 0, 'piece');
    g.move(1, 100 + MOVE_STEP_PX - 1, 100, 50);
    expect(actions).toEqual([]);
    g.move(1, 100 + MOVE_STEP_PX * 2 + 5, 102, 100);
    g.up(1, 100 + MOVE_STEP_PX * 2 + 5, 102, 150);
    expect(actions).toEqual(['right', 'right']);
  });

  it('glisser à gauche puis revenir', () => {
    const { g, actions } = setup();
    g.down(1, 200, 100, 0, 'piece');
    g.move(1, 200 - MOVE_STEP_PX, 100, 50);
    g.move(1, 200, 100, 100);
    expect(actions).toEqual(['left', 'right']);
  });

  it('glisser vers le haut : une seule chute instantanée', () => {
    const { g, actions } = setup();
    g.down(1, 100, 300, 0, 'piece');
    g.move(1, 102, 300 - SWIPE_UP_PX - 5, 80);
    g.move(1, 104, 300 - SWIPE_UP_PX * 3, 120);
    g.up(1, 104, 300 - SWIPE_UP_PX * 3, 150);
    expect(actions).toEqual(['drop']);
  });

  it('après la chute, le même doigt ne déplace plus la pièce suivante', () => {
    const { g, actions } = setup();
    g.down(1, 100, 300, 0, 'piece');
    g.move(1, 100, 300 - SWIPE_UP_PX - 1, 80);
    g.move(1, 100 + MOVE_STEP_PX * 3, 300 - SWIPE_UP_PX - 1, 200);
    expect(actions).toEqual(['drop']);
  });

  it('un glissé surtout horizontal ne déclenche pas la chute', () => {
    const { g, actions } = setup();
    g.down(1, 100, 300, 0, 'piece');
    g.move(1, 100 + MOVE_STEP_PX * 4, 300 - SWIPE_UP_PX - 1, 100);
    expect(actions).not.toContain('drop');
  });

  it('cancelAll oublie tous les doigts posés (début de partie, reprise)', () => {
    const { g, actions } = setup();
    g.down(1, 100, 100, 0, 'piece');
    g.cancelAll();
    g.up(1, 100, 100, 50);
    expect(actions).toEqual([]);
  });

  it('un geste annulé par le système ne fait rien', () => {
    const { g, actions } = setup();
    g.down(1, 100, 100, 0, 'piece');
    g.cancel(1);
    g.up(1, 100, 100, 50);
    expect(actions).toEqual([]);
  });
});

describe('zone basse : la raquette', () => {
  it('suit le doigt en relatif, converti en pixels logiques', () => {
    const { g, paddle } = setup(2); // écran agrandi 2×
    g.down(2, 100, 600, 0, 'paddle');
    g.move(2, 140, 610, 20);
    expect(paddle()).toBeCloseTo((40 / 2) * PADDLE_SENSITIVITY);
  });

  it('poser le doigt ne téléporte pas la raquette', () => {
    const { g, paddle } = setup();
    g.down(2, 300, 600, 0, 'paddle');
    expect(paddle()).toBe(0);
  });

  it('un toucher en bas ne fait pas tourner la pièce', () => {
    const { g, actions } = setup();
    g.down(2, 100, 600, 0, 'paddle');
    g.up(2, 100, 600, 50);
    expect(actions).toEqual([]);
  });
});

describe('deux pouces à la fois', () => {
  it('chaque doigt garde son rôle', () => {
    const { g, actions, paddle } = setup();
    g.down(1, 100, 100, 0, 'piece');
    g.down(2, 100, 600, 5, 'paddle');
    g.move(2, 120, 600, 10);
    g.move(1, 100 + MOVE_STEP_PX, 100, 20);
    g.move(2, 130, 600, 30);
    expect(actions).toEqual(['right']);
    expect(paddle()).toBeCloseTo(30 * PADDLE_SENSITIVITY);
  });
});
