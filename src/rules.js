// Les règles du score et de la difficulté, à un seul endroit pour les régler.
import { MAX_LIVES } from './config.js';

export const CELL_POINTS = 10; // une case cassée par la balle
export const DROP_POINTS = 2; // par ligne montée en chute instantanée
const LINE_POINTS = [0, 300, 800, 1500, 2500]; // 0 à 4 lignes d'un coup
const POINTS_PER_LEVEL = 2000;
const MAX_LEVEL = 15;

export const lineScore = (count, level) => LINE_POINTS[count] * level;

export const levelFor = (score) => Math.min(MAX_LEVEL, 1 + Math.floor(score / POINTS_PER_LEVEL));

// Secondes pour qu'une pièce monte d'une ligne : 0,8 s au niveau 1, 15 % plus vite à chaque niveau.
export const riseInterval = (level) => Math.max(0.12, 0.8 * 0.85 ** (level - 1));

// Pixels par seconde de la balle.
export const ballSpeed = (level) => Math.min(520, 260 + 20 * (level - 1));

// Casser la pièce qui bouge est plus dur : plus de points, et un gros bonus
// si on la détruit entièrement avant qu'elle se colle.
export const PIECE_CELL_POINTS = 25;
export const PIECE_BREAK_BONUS = 250;

// Combo : chaque série de 3 cases cassées sans que la fée touche la planche
// multiplie les points des cases (jusqu'à ×5).
export const comboMultiplier = (combo) => Math.min(5, 1 + Math.floor(combo / 3));

// Une brique cassée lâche parfois un bonus. rng : le hasard (Math.random dans
// le jeu, un faux hasard prévisible dans les tests).
const ITEM_CHANCE = 0.1;
export function itemFor(rng, lives) {
  if (rng() >= ITEM_CHANCE) return null;
  const roll = rng();
  if (lives < MAX_LIVES && roll < 0.2) return 'heart';
  return roll < 0.6 ? 'mushroom' : 'star';
}
