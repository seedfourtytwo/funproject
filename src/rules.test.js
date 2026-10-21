import { describe, it, expect } from 'vitest';
import { levelFor, riseInterval, ballSpeed, lineScore, CELL_POINTS, DROP_POINTS } from './rules.js';

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
