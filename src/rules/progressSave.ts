/** 关卡解锁与成绩的本机存档：损坏、非 JSON、或缺字段时回退到安全默认值。 */

export type LevelSave = {
  unlocked: number;
  stars: number[];
  scores: number[];
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function defaultLevelSave(levelCount: number): LevelSave {
  const n = Math.max(0, Math.floor(levelCount));
  return {
    unlocked: n > 0 ? 1 : 0,
    stars: Array.from({ length: n }, () => 0),
    scores: Array.from({ length: n }, () => 0),
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function readArray(raw: unknown, levelCount: number, min: number, max: number): number[] {
  const out = Array.from({ length: levelCount }, () => 0);
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < levelCount; i++) {
    out[i] = clampInt(raw[i], min, max, 0);
  }
  return out;
}

export function parseLevelSave(raw: unknown, levelCount: number): LevelSave {
  const fallback = defaultLevelSave(levelCount);
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return fallback;
  const obj = raw as Record<string, unknown>;
  const unlocked = clampInt(obj.unlocked, 1, Math.max(1, levelCount), 1);
  return {
    unlocked: levelCount <= 0 ? 0 : Math.min(unlocked, levelCount),
    stars: readArray(obj.stars, levelCount, 0, 3),
    scores: readArray(obj.scores, levelCount, 0, 1_000_000_000),
  };
}

export function applyLevelClear(
  save: LevelSave,
  levelIndex0: number,
  stars: number,
  score: number,
  levelCount: number,
): LevelSave {
  const next = parseLevelSave(save, levelCount);
  if (levelIndex0 < 0 || levelIndex0 >= levelCount) return next;
  const star = clampInt(stars, 0, 3, 0);
  const sc = clampInt(score, 0, 1_000_000_000, 0);
  next.stars[levelIndex0] = Math.max(next.stars[levelIndex0] ?? 0, star);
  next.scores[levelIndex0] = Math.max(next.scores[levelIndex0] ?? 0, sc);
  next.unlocked = Math.max(next.unlocked, Math.min(levelCount, levelIndex0 + 2));
  return next;
}

export function safeLocalStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (!ls || typeof ls.getItem !== 'function' || typeof ls.setItem !== 'function') return null;
    return ls;
  } catch {
    return null;
  }
}

export function loadLevelSave(key: string, levelCount: number, storage?: StorageLike | null): LevelSave {
  const fallback = defaultLevelSave(levelCount);
  const store = storage === undefined ? safeLocalStorage() : storage;
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (raw == null || raw === '') return fallback;
    return parseLevelSave(JSON.parse(raw), levelCount);
  } catch {
    return fallback;
  }
}

/** 写入失败（禁用、配额、抛错）时返回 false，游戏继续用内存中的进度。 */
export function writeLevelSave(key: string, save: LevelSave, storage?: StorageLike | null): boolean {
  const store = storage === undefined ? safeLocalStorage() : storage;
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
