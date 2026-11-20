import { describe, expect, it } from 'vitest';
import {
  GAME_CATEGORIES,
  allEntries,
  bonus,
  games,
  gamesInCategory,
  type GameCategoryId,
} from './catalog';

const expected: Record<GameCategoryId, string[]> = {
  classic: ['minesweeper', 'solitaire', 'pinball'],
  arcade: ['tetris', 'snake', 'breakout', 'pacmaze', 'flappy', 'whack', 'bubbles', 'rhythm'],
  shooter: ['contra', 'invaders', 'shooter', 'tank', 'street-rush', 'ash-shed'],
  puzzle: [
    '2048',
    'sokoban',
    'match3',
    'sudoku',
    'memory',
    'jump',
    'huarong',
    'slider',
    'lianliankan',
    'sling-workshop',
    'roll-quest',
  ],
  board: [
    'gomoku',
    'tictactoe',
    'reversi',
    'connect4',
    'blackjack',
    'aeroplane',
    'xiangqi',
    'junqi',
    'landlord',
    'go',
    'mahjong',
  ],
  strategy: ['yard-defense', 'tactic-sketch', 'slope-camp'],
  sports: [
    'pong',
    'fruit',
    'fishing',
    'curve-sprint',
    'alley-dash',
    'pitch-clash',
    'pool',
    'snooker',
    'tennis',
  ],
  online: ['tetris-vs', 'gomoku-vs'],
};

describe('大厅游戏分类', () => {
  it('分类列表稳定，含中文标签且不自行拆得更碎', () => {
    expect(GAME_CATEGORIES.map((c) => c.id)).toEqual([
      'classic',
      'arcade',
      'shooter',
      'puzzle',
      'board',
      'strategy',
      'sports',
      'online',
    ]);
    expect(GAME_CATEGORIES.map((c) => c.label)).toEqual([
      '经典桌面',
      '街机动作',
      '射击对抗',
      '益智解谜',
      '棋牌',
      '策略',
      '体育竞速',
      '联机专区',
    ]);
  });

  it('53 款正式游戏与 TinyLang 加映都不丢失', () => {
    expect(games).toHaveLength(53);
    expect(bonus.map((g) => g.slug)).toEqual(['tinylang']);
    expect(bonus.every((g) => g.bonus === true && g.category === undefined)).toBe(true);
    expect(allEntries).toHaveLength(54);
    expect(new Set(allEntries.map((g) => g.slug)).size).toBe(54);
  });

  it('每一款正式游戏（含联机两款，不含 TinyLang）恰好一个主分类', () => {
    const ids = new Set(GAME_CATEGORIES.map((c) => c.id));
    for (const game of games) {
      expect(ids.has(game.category), game.slug).toBe(true);
    }
    const assigned = games.map((g) => g.slug).sort();
    const fromCategories = GAME_CATEGORIES.flatMap((c) => gamesInCategory(c.id).map((g) => g.slug)).sort();
    expect(fromCategories).toEqual(assigned);
    expect(assigned).toHaveLength(53);
  });

  it('关键分类的 slug 集合与预期一致，联机两款不出现在街机或棋牌', () => {
    for (const [id, slugs] of Object.entries(expected) as Array<[GameCategoryId, string[]]>) {
      expect(gamesInCategory(id).map((g) => g.slug).sort(), id).toEqual([...slugs].sort());
    }
    expect(gamesInCategory('arcade').some((g) => g.slug === 'tetris-vs')).toBe(false);
    expect(gamesInCategory('board').some((g) => g.slug === 'gomoku-vs' || g.slug === 'tetris-vs')).toBe(false);
    expect(gamesInCategory('online').map((g) => g.slug).sort()).toEqual(['gomoku-vs', 'tetris-vs']);
  });
});
