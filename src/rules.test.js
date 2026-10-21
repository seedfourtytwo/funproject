import { describe, it, expect } from 'vitest';
import {
  levelFor, riseInterval, ballSpeed, lineScore, comboMultiplier, itemFor,
  CELL_POINTS, DROP_POINTS, PIECE_CELL_POINTS, PIECE_BREAK_BONUS,
} from './rules.js';
import { MAX_LIVES } from './config.js';

describe('score', () => {
  it('une ligne rapporte bien plus qu’une case cassée', () => {
    expect(lineScore(1, 1)).toBeGreaterThan(CELL_POINTS * 10);
  });
  it('plusieurs lignes d’un coup rapportent plus que séparément', () => {
    expect(lineScore(4, 1)).toBeGreaterThan(lineScore(1, 1) * 4);
    expect(lineScore(2, 1)).toBeGreaterThan(lineScore(1, 1) * 2);
  });
  it('le niveau multiplie le bonus de lignes', () => {
    expect(lineScore(1, 3)).toBe(lineScore(1, 1) * 3);
  });
  it('aucune ligne, aucun point', () => {
    expect(lineScore(0, 5)).toBe(0);
  });
  it('la chute instantanée rapporte un peu', () => {
    expect(DROP_POINTS).toBeGreaterThan(0);
  });
});

describe('difficulté', () => {
  it('niveau 1 au départ, puis monte avec le score', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(1999)).toBe(1);
    expect(levelFor(2000)).toBe(2);
  });
  it('plafonne', () => {
    expect(levelFor(10 ** 9)).toBe(levelFor(10 ** 10));
  });
  it('les pièces montent plus vite à chaque niveau, sans devenir instantanées', () => {
    expect(riseInterval(2)).toBeLessThan(riseInterval(1));
    expect(riseInterval(99)).toBeGreaterThanOrEqual(0.12);
  });
  it('la balle accélère à chaque niveau, avec une limite', () => {
    expect(ballSpeed(2)).toBeGreaterThan(ballSpeed(1));
    expect(ballSpeed(99)).toBeLessThanOrEqual(520);
  });
});

describe('combo', () => {
  it('×1 au départ, puis monte toutes les 3 cases cassées sans toucher la planche', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(2)).toBe(1);
    expect(comboMultiplier(3)).toBe(2);
    expect(comboMultiplier(6)).toBe(3);
  });
  it('plafonne à ×5', () => {
    expect(comboMultiplier(1000)).toBe(5);
  });
  it('casser une case de la pièce qui bouge rapporte plus qu’une case du tas', () => {
    expect(PIECE_CELL_POINTS).toBeGreaterThan(CELL_POINTS);
    expect(PIECE_BREAK_BONUS).toBeGreaterThan(PIECE_CELL_POINTS * 4);
  });
});

describe('bonus qui tombent', () => {
  // Un faux hasard qui renvoie les valeurs qu'on lui donne, dans l'ordre.
  const dice = (...values) => () => values.shift();

  it('la plupart des briques ne lâchent rien', () => {
    expect(itemFor(dice(0.99), 3)).toBeNull();
  });
  it('parfois un bonus : champignon, étoile ou cœur', () => {
    expect(['mushroom', 'star', 'heart']).toContain(itemFor(dice(0, 0.5), 3));
  });
  it('jamais de cœur quand les vies sont au maximum', () => {
    for (let k = 0; k < 1; k += 0.05) expect(itemFor(dice(0, k), MAX_LIVES)).not.toBe('heart');
  });
  it('un cœur possible quand il manque des vies', () => {
    const kinds = new Set();
    for (let k = 0; k < 1; k += 0.05) kinds.add(itemFor(dice(0, k), 1));
    expect(kinds.has('heart')).toBe(true);
  });
});
