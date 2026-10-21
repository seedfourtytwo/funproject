import { describe, it, expect } from 'vitest';
import {
  createTetris, stepTetris, tryMove, tryRotate, hardDrop, pieceCells, colorOf, TYPES,
  solidAt, breakPieceCell, solidsOf,
} from './tetris.js';
import { COLS, ROWS } from './config.js';

// Remplace la pièce active par une pièce choisie, pour des tests prévisibles.
function place(t, type, col, row, rot = 0) {
  t.piece = { type, col, row, rot, gone: [] };
}
const rowsOf = (t) => pieceCells(t.piece).map(([, r]) => r);
const colsOf = (t) => pieceCells(t.piece).map(([c]) => c);
const fillRow = (t, r, except = []) => {
  for (let c = 0; c < COLS; c++) t.board[r][c] = except.includes(c) ? 0 : 1;
};

describe('apparition', () => {
  it('la pièce apparaît collée au bas de la zone', () => {
    const t = createTetris();
    expect(Math.max(...rowsOf(t))).toBe(ROWS - 1);
    expect(t.next).toBeTruthy();
  });

  it('un sac de 7 : chaque pièce une fois avant de recommencer', () => {
    const t = createTetris();
    const seen = new Set([t.piece.type]);
    for (let i = 0; i < 6; i++) {
      hardDrop(t);
      seen.add(t.piece.type);
      t.board = t.board.map((row) => row.map(() => 0)); // place libre pour la suite
    }
    expect(seen.size).toBe(7);
  });
});

describe('gravité inversée', () => {
  it('la pièce monte d’une ligne par intervalle', () => {
    const t = createTetris();
    const top = Math.min(...rowsOf(t));
    stepTetris(t, t.interval * 0.5);
    expect(Math.min(...rowsOf(t))).toBe(top);
    stepTetris(t, t.interval * 0.6);
    expect(Math.min(...rowsOf(t))).toBe(top - 1);
  });

  it('elle se colle au plafond, puis la suivante apparaît en bas', () => {
    const t = createTetris();
    place(t, 'O', 4, 1);
    const events = stepTetris(t, t.interval * 3);
    expect(events.some((e) => e.type === 'lock')).toBe(true);
    expect(t.board[0][4]).not.toBe(0);
    expect(t.board[1][5]).not.toBe(0);
    expect(Math.max(...rowsOf(t))).toBe(ROWS - 1);
  });

  it('elle se colle sous le tas', () => {
    const t = createTetris();
    t.board[0][4] = 1;
    place(t, 'O', 4, 3);
    stepTetris(t, t.interval * 5);
    expect(t.board[1][4]).not.toBe(0);
    expect(t.board[2][5]).not.toBe(0);
  });
});

describe('déplacements', () => {
  it('gauche et droite, bloqués par les murs', () => {
    const t = createTetris();
    place(t, 'O', 0, 6);
    expect(tryMove(t, -1)).toBe(false);
    expect(tryMove(t, 1)).toBe(true);
    expect(Math.min(...colsOf(t))).toBe(1);
    place(t, 'O', COLS - 2, 6);
    expect(tryMove(t, 1)).toBe(false);
  });

  it('bloqués par une case verrouillée', () => {
    const t = createTetris();
    place(t, 'O', 4, 6);
    t.board[6][6] = 3;
    expect(tryMove(t, 1)).toBe(false);
  });
});

describe('rotation', () => {
  it('le T tourne et revient après 4 quarts de tour', () => {
    const t = createTetris();
    place(t, 'T', 4, 6);
    const before = pieceCells(t.piece).map(String).sort();
    expect(tryRotate(t, 1)).toBe(true);
    expect(pieceCells(t.piece).map(String).sort()).not.toEqual(before);
    tryRotate(t, 1); tryRotate(t, 1); tryRotate(t, 1);
    expect(pieceCells(t.piece).map(String).sort()).toEqual(before);
  });

  it('le O ne bouge pas en tournant', () => {
    const t = createTetris();
    place(t, 'O', 4, 6);
    const before = pieceCells(t.piece).map(String).sort();
    tryRotate(t, 1);
    expect(pieceCells(t.piece).map(String).sort()).toEqual(before);
  });

  it('contre un mur, la pièce est décalée pour pouvoir tourner', () => {
    const t = createTetris();
    place(t, 'I', -2, 6, 1); // I vertical collé au mur gauche
    expect(Math.min(...colsOf(t))).toBe(0);
    expect(tryRotate(t, 1)).toBe(true);
    expect(Math.min(...colsOf(t))).toBeGreaterThanOrEqual(0);
  });

  it('dans les deux sens', () => {
    const t = createTetris();
    place(t, 'L', 4, 6);
    tryRotate(t, -1);
    expect(t.piece.rot).toBe(3);
  });
});

describe('chute instantanée', () => {
  it('monte d’un coup jusqu’au plafond et se verrouille', () => {
    const t = createTetris();
    place(t, 'I', 3, ROWS - 2);
    const { climbed, events } = hardDrop(t);
    expect(climbed).toBe(ROWS - 1); // du bas (ligne 13) au plafond (ligne 0)
    expect(t.board[0].slice(3, 7)).toEqual([1, 1, 1, 1].map(() => TYPES.indexOf('I') + 1));
    expect(events.some((e) => e.type === 'lock')).toBe(true);
  });
});

describe('lignes complètes', () => {
  it('une ligne pleine disparaît et le tas se recolle au plafond', () => {
    const t = createTetris();
    fillRow(t, 0, [3, 4, 5, 6]);
    t.board[1][0] = 2; // une case sous la ligne
    place(t, 'I', 3, 8);
    const { events } = hardDrop(t);
    const lines = events.find((e) => e.type === 'lines');
    expect(lines.rows).toEqual([0]);
    expect(lines.cells).toHaveLength(COLS); // pour faire éclater chaque case effacée
    expect(lines.cells[3]).toEqual([3, 0, colorOf('I')]);
    expect(t.board[0][0]).toBe(2); // la case est remontée
    expect(t.board[1][0]).toBe(0);
  });

  it('plusieurs lignes d’un coup', () => {
    const t = createTetris();
    for (let r = 0; r < 4; r++) fillRow(t, r, [0]);
    place(t, 'I', -2, 8, 1); // I vertical dans la colonne 0
    const { events } = hardDrop(t);
    expect(events.find((e) => e.type === 'lines').rows).toEqual([0, 1, 2, 3]);
    expect(t.board.flat().every((v) => v === 0)).toBe(true);
  });
});

describe('fin de partie', () => {
  it('quand le tas atteint la ligne d’apparition', () => {
    const t = createTetris();
    for (let r = 0; r < ROWS - 4; r++) t.board[r][0] = 1; // une colonne qui descend presque en bas
    place(t, 'I', -2, ROWS - 4, 1); // I vertical juste dessous : il touche la dernière ligne
    const { events } = hardDrop(t);
    expect(events.some((e) => e.type === 'gameover')).toBe(true);
    expect(t.over).toBe(true);
  });

  it('quand la nouvelle pièce n’a plus la place d’apparaître', () => {
    const t = createTetris();
    for (let c = 3; c < 7; c++) t.board[ROWS - 2][c] = 1; // juste au-dessus de la dernière ligne
    t.next = 'O'; // le O apparaît sur les deux dernières lignes : il n'a plus la place
    place(t, 'O', 0, 4);
    const { events } = hardDrop(t);
    expect(events.some((e) => e.type === 'gameover')).toBe(true);
  });

  it('une partie finie ne bouge plus', () => {
    const t = createTetris();
    t.over = true;
    const before = JSON.stringify(t.piece);
    stepTetris(t, 10);
    expect(JSON.stringify(t.piece)).toBe(before);
  });
});

describe('casser la pièce qui bouge', () => {
  it('la balle voit les cases de la pièce active', () => {
    const t = createTetris();
    place(t, 'O', 4, 6);
    expect(solidAt(t, 4, 6)).toBe(colorOf('O'));
    expect(solidAt(t, 3, 6)).toBe(0);
    t.board[2][2] = 5;
    expect(solidAt(t, 2, 2)).toBe(5);
  });

  it('une case cassée disparaît de la pièce, qui continue avec les autres', () => {
    const t = createTetris();
    place(t, 'O', 4, 6);
    const hit = breakPieceCell(t, 5, 7);
    expect(hit).toEqual({ color: colorOf('O'), pieceGone: false });
    expect(pieceCells(t.piece)).toHaveLength(3);
    hardDrop(t);
    expect(t.board[0][4] + t.board[0][5] + t.board[1][4] + t.board[1][5]).toBe(3 * colorOf('O'));
  });

  it('la case cassée le reste après une rotation', () => {
    const t = createTetris();
    place(t, 'T', 4, 6);
    breakPieceCell(t, 4, 7);
    tryRotate(t, 1);
    expect(pieceCells(t.piece)).toHaveLength(3);
  });

  it('les 4 cases cassées : la pièce est détruite et la suivante apparaît', () => {
    const t = createTetris();
    place(t, 'O', 4, 6);
    t.next = 'I';
    breakPieceCell(t, 4, 6);
    breakPieceCell(t, 5, 6);
    breakPieceCell(t, 4, 7);
    const hit = breakPieceCell(t, 5, 7);
    expect(hit.pieceGone).toBe(true);
    expect(t.piece.type).toBe('I');
    expect(t.board.flat().every((v) => v === 0)).toBe(true);
  });

  it('casser là où la pièce n’est pas ne fait rien', () => {
    const t = createTetris();
    place(t, 'O', 4, 6);
    expect(breakPieceCell(t, 0, 0)).toBeNull();
    expect(pieceCells(t.piece)).toHaveLength(4);
  });

  it('solids() : casse une case du tas ou de la pièce, au choix de ce qui est là', () => {
    const t = createTetris();
    place(t, 'O', 4, 6);
    t.board[0][0] = 3;
    const solids = solidsOf(t);
    expect(solids.clear(0, 0)).toEqual({ color: 3, fromPiece: false, pieceGone: false });
    expect(t.board[0][0]).toBe(0);
    expect(solids.clear(4, 6)).toEqual({ color: colorOf('O'), fromPiece: true, pieceGone: false });
  });
});
