import { describe, expect, it } from 'vitest';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LEN, generateRoomCode, isValidRoomCode, normalizeRoomCode } from './roomCode';
import {
  BOARD_SIZE,
  CELL_COUNT,
  emptyBoard,
  illegalReason,
  isBoardFull,
  placeStone,
  stoneOfSeat,
  winningLine,
  type Stone,
} from './gomoku';

function setLine(board: Stone[][], cells: Array<[number, number]>, stone: 1 | 2): void {
  for (const [r, c] of cells) board[r]![c] = stone;
}

describe('five-in-a-row detection', () => {
  it('detects a horizontal five', () => {
    const b = emptyBoard();
    setLine(b, [[7, 3], [7, 4], [7, 5], [7, 6], [7, 7]], 1);
    const line = winningLine(b, 7, 5, 1);
    expect(line.length).toBeGreaterThanOrEqual(5);
    const cells = new Set(line.map(([r, c]) => `${r},${c}`));
    for (const [r, c] of [[7, 3], [7, 4], [7, 5], [7, 6], [7, 7]]) expect(cells.has(`${r},${c}`)).toBe(true);
  });

  it('detects a vertical five', () => {
    const b = emptyBoard();
    setLine(b, [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8]], 2);
    expect(winningLine(b, 2, 8, 2).length).toBeGreaterThanOrEqual(5);
  });

  it('detects both diagonal directions', () => {
    const downRight = emptyBoard();
    setLine(downRight, [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]], 1);
    expect(winningLine(downRight, 3, 3, 1).length).toBeGreaterThanOrEqual(5);

    const downLeft = emptyBoard();
    setLine(downLeft, [[4, 10], [5, 9], [6, 8], [7, 7], [8, 6]], 2);
    expect(winningLine(downLeft, 8, 6, 2).length).toBeGreaterThanOrEqual(5);
  });

  it('treats six or more in a row as a win (free rules)', () => {
    const b = emptyBoard();
    setLine(b, [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]], 1);
    expect(winningLine(b, 0, 2, 1).length).toBe(6);
  });

  it('does not win on four in a row or a broken line', () => {
    const four = emptyBoard();
    setLine(four, [[10, 1], [10, 2], [10, 3], [10, 4]], 1);
    expect(winningLine(four, 10, 3, 1)).toEqual([]);

    const broken = emptyBoard();
    setLine(broken, [[9, 2], [9, 3], [9, 4], [9, 6]], 1);
    expect(winningLine(broken, 9, 3, 1)).toEqual([]);
  });

  it('does not count the opponent stone as part of a line', () => {
    const b = emptyBoard();
    setLine(b, [[5, 5], [5, 6], [5, 7], [5, 8]], 1);
    b[5]![9] = 2;
    expect(winningLine(b, 5, 7, 1)).toEqual([]);
  });
});

describe('full-board draw and illegal moves', () => {
  it('treats a completely filled board as full', () => {
    const b = emptyBoard();
    expect(isBoardFull(b)).toBe(false);
    let filled = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        b[r]![c] = ((r + c) % 2 === 0 ? 1 : 2);
        filled += 1;
      }
    }
    expect(filled).toBe(CELL_COUNT);
    expect(isBoardFull(b)).toBe(true);
  });

  it('declares a draw when the last empty intersection is filled without five in a row', () => {
    const b = emptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (r === 0 && c === 0) continue;
        b[r]![c] = 2;
      }
    }
    const result = placeStone(b, 0, 0, 0, 0, 'playing');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ended).toBe(true);
      expect(result.winner).toBe('draw');
      expect(result.winningLine).toEqual([]);
      expect(isBoardFull(result.board)).toBe(true);
    }
  });

  it('rejects occupied, out-of-bounds, wrong-turn, and finished-game moves', () => {
    const b = emptyBoard();
    b[7]![7] = 1;
    expect(illegalReason(b, 7, 7, 1, 1, 'playing')).toBe('occupied');
    expect(illegalReason(b, -1, 0, 0, 0, 'playing')).toBe('out_of_bounds');
    expect(illegalReason(b, 0, 15, 0, 0, 'playing')).toBe('out_of_bounds');
    expect(illegalReason(b, 1.5, 2, 0, 0, 'playing')).toBe('out_of_bounds');
    expect(illegalReason(b, 3, 3, 1, 0, 'playing')).toBe('not_your_turn');
    expect(illegalReason(b, 3, 3, 0, 0, 'lobby')).toBe('not_playing');
    expect(illegalReason(b, 3, 3, 0, 0, 'result')).toBe('game_over');
    expect(placeStone(b, 7, 7, 1, 1, 'playing').ok).toBe(false);
  });

  it('places a legal stone and then reports a win on the completing move', () => {
    const b = emptyBoard();
    setLine(b, [[2, 2], [2, 3], [2, 4], [2, 5]], 1);
    const first = placeStone(b, 8, 8, 1, 1, 'playing');
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.ended).toBe(false);

    const win = placeStone(b, 2, 6, 0, 0, 'playing');
    expect(win.ok).toBe(true);
    if (win.ok) {
      expect(win.ended).toBe(true);
      expect(win.winner).toBe(0);
      expect(win.winningLine.length).toBeGreaterThanOrEqual(5);
      expect(win.board[2]![6]).toBe(stoneOfSeat(0));
    }
  });
});

describe('shared room-code helper', () => {
  it('emits a 5-character code from the unambiguous alphabet', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LEN);
    expect(isValidRoomCode(code)).toBe(true);
    for (const ch of code) expect(ROOM_CODE_ALPHABET.includes(ch)).toBe(true);
    expect(/[01IO]/.test(code)).toBe(false);
  });

  it('normalizes case and rejects ambiguous characters', () => {
    expect(normalizeRoomCode(' ab2c ')).toBe('AB2C');
    expect(isValidRoomCode('AB2C')).toBe(true);
    expect(isValidRoomCode('ABC0D')).toBe(false);
    expect(isValidRoomCode('ABCOD')).toBe(false);
  });
});
