import { describe, expect, it } from 'vitest';
import {
  applyLevelClear,
  defaultLevelSave,
  loadLevelSave,
  parseLevelSave,
  writeLevelSave,
  type StorageLike,
} from './progressSave';

function mem(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

describe('关卡存档解析与兜底', () => {
  it('缺省从第一关解锁，成绩为 0', () => {
    const s = defaultLevelSave(8);
    expect(s.unlocked).toBe(1);
    expect(s.stars).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(s.scores).toHaveLength(8);
  });

  it('损坏 JSON、空值、数组都回退默认', () => {
    expect(parseLevelSave(null, 4).unlocked).toBe(1);
    expect(parseLevelSave('nope', 4).unlocked).toBe(1);
    expect(parseLevelSave([1, 2], 4).unlocked).toBe(1);
    const store = mem({ k: '{not json' });
    expect(loadLevelSave('k', 4, store).unlocked).toBe(1);
  });

  it('裁剪越界字段并忽略多余项，缺项补零', () => {
    const s = parseLevelSave(
      { unlocked: 99, stars: [3, 5, -1, 2, 1], scores: [10, '20', Number.NaN] },
      4,
    );
    expect(s.unlocked).toBe(4);
    expect(s.stars).toEqual([3, 3, 0, 2]);
    expect(s.scores).toEqual([10, 20, 0, 0]);
  });

  it('存储不可用或写入抛错时不中断，返回默认或 false', () => {
    expect(loadLevelSave('k', 3, null).unlocked).toBe(1);
    const boom: StorageLike = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('quota');
      },
    };
    expect(loadLevelSave('k', 3, boom).stars).toEqual([0, 0, 0]);
    expect(writeLevelSave('k', defaultLevelSave(3), boom)).toBe(false);
    expect(writeLevelSave('k', defaultLevelSave(3), null)).toBe(false);
  });

  it('通关只提升更高星级与分数，并解锁下一关', () => {
    let s = defaultLevelSave(6);
    s = applyLevelClear(s, 0, 2, 400, 6);
    expect(s.unlocked).toBe(2);
    expect(s.stars[0]).toBe(2);
    expect(s.scores[0]).toBe(400);
    s = applyLevelClear(s, 0, 1, 100, 6);
    expect(s.stars[0]).toBe(2);
    expect(s.scores[0]).toBe(400);
    s = applyLevelClear(s, 0, 3, 900, 6);
    expect(s.stars[0]).toBe(3);
    expect(s.scores[0]).toBe(900);
    s = applyLevelClear(s, 5, 1, 10, 6);
    expect(s.unlocked).toBe(6);
  });

  it('往返读写保持数值', () => {
    const store = mem();
    const saved = applyLevelClear(defaultLevelSave(5), 1, 3, 1200, 5);
    expect(writeLevelSave('roll-quest-save', saved, store)).toBe(true);
    const loaded = loadLevelSave('roll-quest-save', 5, store);
    expect(loaded).toEqual(saved);
  });
});
