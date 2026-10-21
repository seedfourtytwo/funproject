import { COLS, ROWS } from './config.js';

// Les 7 tétriminos, dessinés dans leur boîte carrée (N × N).
// Chaque case est [colonne, ligne] ; la ligne 0 est en haut de la boîte.
// Sur la grille, une case vaut 0 (vide) ou 1 à 7 : le numéro de la pièce, donc sa couleur.
export const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const SHAPES = {
  I: { n: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { n: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { n: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { n: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { n: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { n: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { n: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

// Tourner d'un quart de tour dans la boîte, comme le fait la rotation SRS officielle.
function rotateCell([c, r], n, times) {
  for (let i = 0; i < times; i++) [c, r] = [n - 1 - r, c];
  return [c, r];
}
const ROTATIONS = Object.fromEntries(
  TYPES.map((t) => {
    const { n, cells } = SHAPES[t];
    return [t, [0, 1, 2, 3].map((k) => cells.map((cell) => rotateCell(cell, n, k)))];
  }),
);

// Si la rotation tombe dans un mur ou une case, on essaie de décaler la pièce
// un peu (« wall kick »), dans cet ordre. C'est une version simplifiée du SRS.
const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0]];

export const colorOf = (type) => TYPES.indexOf(type) + 1;

// Les cases de la pièce, en coordonnées de la grille.
export function pieceCells({ type, rot, col, row }) {
  return ROTATIONS[type][rot].map(([c, r]) => [col + c, row + r]);
}

export const shapeCells = (type) => ROTATIONS[type][0];

function emptyBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function fits(board, piece) {
  return pieceCells(piece).every(
    ([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS && board[r][c] === 0,
  );
}

// Le « sac de 7 » : on pioche les 7 pièces dans un ordre au hasard, puis on
// remet les 7 dans le sac. Jamais trop longtemps sans la barre.
function draw(t) {
  if (t.bag.length === 0) {
    t.bag = [...TYPES];
    for (let i = t.bag.length - 1; i > 0; i--) {
      const j = Math.floor(t.rng() * (i + 1));
      [t.bag[i], t.bag[j]] = [t.bag[j], t.bag[i]];
    }
  }
  return t.bag.pop();
}

// Nouvelle pièce, posée en bas de la zone, centrée. Gravité inversée : elle va monter.
function spawn(t) {
  const type = t.next;
  t.next = draw(t);
  const { n } = SHAPES[type];
  const lowest = Math.max(...ROTATIONS[type][0].map(([, r]) => r));
  t.piece = { type, rot: 0, col: Math.floor((COLS - n) / 2), row: ROWS - 1 - lowest };
  t.timer = 0;
  if (!fits(t.board, t.piece)) t.over = true;
}

export function createTetris(rng = Math.random) {
  const t = {
    board: emptyBoard(), piece: null, next: null, bag: [], rng,
    interval: 0.8, // secondes pour monter d'une ligne (la difficulté le réduit)
    timer: 0, over: false,
  };
  t.next = draw(t);
  spawn(t);
  return t;
}

export function tryMove(t, dc, dr = 0) {
  const moved = { ...t.piece, col: t.piece.col + dc, row: t.piece.row + dr };
  if (!fits(t.board, moved)) return false;
  t.piece = moved;
  return true;
}

// dir : 1 = sens des aiguilles d'une montre, -1 = l'inverse.
export function tryRotate(t, dir) {
  const rot = (t.piece.rot + dir + 4) % 4;
  for (const [dc, dr] of KICKS) {
    const turned = { ...t.piece, rot, col: t.piece.col + dc, row: t.piece.row + dr };
    if (fits(t.board, turned)) {
      t.piece = turned;
      return true;
    }
  }
  return false;
}

// La pièce devient des cases de la grille. Puis on efface les lignes pleines,
// on vérifie la défaite et on fait apparaître la pièce suivante.
function lock(t) {
  const events = [];
  const cells = pieceCells(t.piece);
  const color = colorOf(t.piece.type);
  for (const [c, r] of cells) t.board[r][c] = color;
  events.push({ type: 'lock', cells, color });

  const full = [];
  t.board.forEach((row, r) => { if (row.every((v) => v !== 0)) full.push(r); });
  if (full.length) {
    // Le tas pend du plafond : on garde les autres lignes dans l'ordre, tassées
    // vers le haut, et on ajoute des lignes vides en bas.
    const kept = t.board.filter((_, r) => !full.includes(r));
    t.board = [...kept, ...emptyBoard().slice(0, full.length)];
    events.push({ type: 'lines', rows: full, count: full.length });
  }

  // Défaite : le tas touche la ligne du bas, là où les pièces apparaissent.
  if (t.board[ROWS - 1].some((v) => v !== 0)) t.over = true;
  if (!t.over) spawn(t);
  if (t.over) events.push({ type: 'gameover' });
  return events;
}

// Chute instantanée : vers le haut, puisque la gravité est inversée.
export function hardDrop(t) {
  let climbed = 0;
  while (tryMove(t, 0, -1)) climbed++;
  return { climbed, events: lock(t) };
}

// Fait passer le temps : la pièce monte d'une ligne à chaque intervalle,
// et se verrouille quand elle ne peut plus monter.
export function stepTetris(t, dt) {
  if (t.over) return [];
  t.timer += dt;
  while (t.timer >= t.interval) {
    t.timer -= t.interval;
    if (!tryMove(t, 0, -1)) return lock(t);
  }
  return [];
}
