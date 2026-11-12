import { describe, expect, it } from 'vitest';
import {
  COLS,
  KINDS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LEN,
  applyPendingGarbage,
  enqueueGarbage,
  freshGame,
  garbageForClears,
  generateRoomCode,
  hardDrop,
  isValidRoomCode,
  lock,
  move,
  normalizeRoomCode,
  piece,
  restartGame,
  startGame,
  takeSequence,
  wouldLockAbove,
} from './tetrisVersus';

describe('garbage counts', () => {
  it('sends 0 / 1 / 2 / 4 lines for clearing 1 / 2 / 3 / 4', () => {
    expect(garbageForClears(0)).toBe(0);
    expect(garbageForClears(1)).toBe(0);
    expect(garbageForClears(2)).toBe(1);
    expect(garbageForClears(3)).toBe(2);
    expect(garbageForClears(4)).toBe(4);
  });

  it('does not invent garbage for unexpected clear counts', () => {
    expect(garbageForClears(-1)).toBe(0);
    expect(garbageForClears(5)).toBe(0);
  });
});

describe('seeded 7-bag', () => {
  it('gives the same sequence for the same seed', () => {
    const a = takeSequence(42, 28);
    const b = takeSequence(42, 28);
    expect(a).toEqual(b);
    expect(a).toHaveLength(28);
  });

  it('uses every kind once in each bag of seven', () => {
    const seq = takeSequence(7, 21);
    for (const offset of [0, 7, 14]) {
      const bag = seq.slice(offset, offset + 7);
      expect([...bag].sort()).toEqual([...KINDS].sort());
    }
  });

  it('changes the sequence when the seed changes', () => {
    expect(takeSequence(1, 14)).not.toEqual(takeSequence(2, 14));
  });
});

describe('room-code format', () => {
  it('emits 5 unambiguous uppercase characters by default', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LEN);
    expect(isValidRoomCode(code)).toBe(true);
    for (const ch of code) expect(ROOM_CODE_ALPHABET.includes(ch)).toBe(true);
    expect(/[01IO]/.test(code)).toBe(false);
  });

  it('maps provided bytes through the 32-character alphabet without bias', () => {
    expect(generateRoomCode(5, Uint8Array.from([0, 31, 32, 63, 64]))).toBe('2Z2Z2');
  });

  it('accepts 4–6 character codes and rejects ambiguous or short values', () => {
    expect(isValidRoomCode('ab2c')).toBe(true);
    expect(isValidRoomCode('  AB23C ')).toBe(true);
    expect(isValidRoomCode('ABCDEF')).toBe(true);
    expect(isValidRoomCode('ABC')).toBe(false);
    expect(isValidRoomCode('ABCDEFG')).toBe(false);
    expect(isValidRoomCode('ABC0D')).toBe(false);
    expect(isValidRoomCode('ABCOD')).toBe(false);
    expect(isValidRoomCode('ABC1D')).toBe(false);
    expect(isValidRoomCode('ABCID')).toBe(false);
    expect(normalizeRoomCode('ab2c')).toBe('AB2C');
  });
});

describe('top-out detection', () => {
  it('treats locking a piece above the visible well as a top-out', () => {
    const g = restartGame(99);
    g.p = piece('T');
    g.p.y = -2;
    expect(wouldLockAbove(g.p)).toBe(true);
    const result = lock(g);
    expect(result.toppedOut).toBe(true);
    expect(result.reason).toBe('lock-above');
    expect(g.status).toBe('topout');
  });

  it('treats a blocked spawn after a lock as a top-out', () => {
    const g = restartGame(3);
    // Leave a gap so existing rows are not cleared, but occupy the spawn columns.
    for (let y = 0; y < 18; y++) g.board[y] = [0, 2, 2, 2, 2, 2, 2, 2, 2, 2];
    g.p = { kind: 'O', m: [[1, 1], [1, 1]], x: 4, y: 18 };
    const result = lock(g);
    expect(result.cleared).toBe(0);
    expect(result.toppedOut).toBe(true);
    expect(result.reason).toBe('spawn-blocked');
    expect(g.status).toBe('topout');
  });

  it('tops out when pending garbage pushes filled cells off the top, but only after the current piece locks', () => {
    const g = restartGame(11);
    // Top row must contain blocks but not be a complete line, or lock() would clear it first.
    g.board[0] = [3, 3, 3, 3, 3, 3, 3, 3, 3, 0];
    enqueueGarbage(g, [0]);
    expect(g.status).toBe('running');
    expect(g.board[19]!.every((cell) => cell === 0)).toBe(true);
    g.p = { kind: 'O', m: [[1, 1], [1, 1]], x: 4, y: 18 };
    const result = lock(g);
    expect(result.cleared).toBe(0);
    expect(result.garbageSent).toBe(0);
    expect(g.board[19]!.some(Boolean)).toBe(true);
    expect(result.toppedOut).toBe(true);
    expect(result.reason).toBe('garbage-overflow');
    expect(g.status).toBe('topout');
  });
});

describe('garbage application timing', () => {
  it('keeps pending garbage off the board until the active piece locks', () => {
    const g = restartGame(5);
    enqueueGarbage(g, [3, 7]);
    expect(g.pending).toHaveLength(2);
    expect(g.board[19]!.every((cell) => cell === 0)).toBe(true);
    move(g, 1, 0);
    expect(g.board[19]!.every((cell) => cell === 0)).toBe(true);
    const overflow = applyPendingGarbage(g);
    expect(overflow).toBe(false);
    expect(g.board[19]).toEqual([8, 8, 8, 8, 8, 8, 8, 0, 8, 8]);
    expect(g.board[18]).toEqual([8, 8, 8, 0, 8, 8, 8, 8, 8, 8]);
    expect(g.pending).toHaveLength(0);
  });

  it('hard drop still uses the single-player scoring of two points per cell', () => {
    const g = restartGame(8);
    startGame(g);
    const before = g.score;
    hardDrop(g);
    expect(g.score).toBeGreaterThanOrEqual(before + 2);
  });
});
