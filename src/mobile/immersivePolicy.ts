import type { PadDir } from './DPad';

export type ImmersiveKind = 'pad' | 'touch' | 'skip';
export type ImmersiveLayout = 'overlay' | 'banded';
export type PadDirMode = 'hold' | 'tap' | 'tap-repeat';

export type PolicyDir = {
  mode: PadDirMode;
  /** Short description of the existing game action this direction maps to. */
  mapsTo: string;
  optional?: boolean;
};

export type PolicyAction = {
  label: string;
  mapsTo: string;
  mode?: 'hold' | 'tap';
};

export type GameImmersivePolicy = {
  kind: ImmersiveKind;
  layout: ImmersiveLayout;
  /** Logical playfield size used to fit the stage without changing aspect. */
  logical?: { w: number; h: number };
  dirs?: Partial<Record<PadDir, PolicyDir>>;
  actions?: PolicyAction[];
  notes?: string;
};

export const PHONE_FRAMES = [
  [320, 568],
  [375, 667],
  [390, 844],
  [430, 932],
  [568, 320],
  [667, 375],
  [844, 390],
  [932, 430],
] as const;

/** Per-game immersive policy. TinyLang is a tool and is intentionally skipped. */
export const IMMERSIVE_POLICY: Record<string, GameImmersivePolicy> = {
  tetris: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 300, h: 600 },
    dirs: {
      left: { mode: 'tap-repeat', mapsTo: 'left / A 移动' },
      right: { mode: 'tap-repeat', mapsTo: 'right / D 移动' },
      down: { mode: 'hold', mapsTo: '↓ / S 软降' },
      up: { mode: 'tap', mapsTo: '硬降（触控专用，键盘 ↑ 仍为旋转）' },
    },
    actions: [{ label: '↻', mapsTo: '顺时针旋转' }],
  },
  'tetris-vs': {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 300, h: 600 },
    dirs: {
      left: { mode: 'tap-repeat', mapsTo: 'left / A 移动' },
      right: { mode: 'tap-repeat', mapsTo: 'right / D 移动' },
      down: { mode: 'hold', mapsTo: '↓ / S 软降' },
      up: { mode: 'tap', mapsTo: '硬降（触控专用，键盘 ↑ 仍为旋转）' },
    },
    actions: [{ label: '↻', mapsTo: '顺时针旋转' }],
    notes: '全屏时本方棋盘为主，对手棋盘缩在角落，不挡住十字键。',
  },
  snake: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 1, h: 1 },
    dirs: {
      left: { mode: 'tap', mapsTo: '左转' },
      right: { mode: 'tap', mapsTo: '右转' },
      up: { mode: 'tap', mapsTo: '向上' },
      down: { mode: 'tap', mapsTo: '向下' },
    },
  },
  pacmaze: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 504, h: 504 },
    dirs: {
      left: { mode: 'tap', mapsTo: '向左（提前转弯）' },
      right: { mode: 'tap', mapsTo: '向右' },
      up: { mode: 'tap', mapsTo: '向上' },
      down: { mode: 'tap', mapsTo: '向下' },
    },
  },
  sokoban: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 16, h: 16 },
    dirs: {
      left: { mode: 'tap-repeat', mapsTo: '左移 / A' },
      right: { mode: 'tap-repeat', mapsTo: '右移 / D' },
      up: { mode: 'tap-repeat', mapsTo: '上移 / W' },
      down: { mode: 'tap-repeat', mapsTo: '下移 / S' },
    },
    actions: [{ label: '撤销', mapsTo: 'Z 撤销' }],
  },
  contra: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 900, h: 460 },
    dirs: {
      left: { mode: 'hold', mapsTo: '← / A 移动' },
      right: { mode: 'hold', mapsTo: '→ / D 移动' },
      up: { mode: 'hold', mapsTo: '↑ / W / Space 跳跃' },
      down: { mode: 'hold', mapsTo: '↓（无原功能，禁用）', optional: true },
    },
    actions: [{ label: '开火', mapsTo: 'J / Z 按住连射', mode: 'hold' }],
  },
  invaders: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 800, h: 620 },
    dirs: {
      left: { mode: 'hold', mapsTo: '← / A 移动' },
      right: { mode: 'hold', mapsTo: '→ / D 移动' },
    },
    actions: [{ label: '开火', mapsTo: '空格 / ↑ 持续射击', mode: 'hold' }],
  },
  shooter: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 480, h: 680 },
    dirs: {
      left: { mode: 'hold', mapsTo: '← / A 移动' },
      right: { mode: 'hold', mapsTo: '→ / D 移动' },
      up: { mode: 'hold', mapsTo: '↑ / W 移动' },
      down: { mode: 'hold', mapsTo: '↓ / S 移动' },
    },
    notes: '自动开火；画布拖动仍可用。',
  },
  tank: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 1, h: 1 },
    dirs: {
      up: { mode: 'hold', mapsTo: '↑ / W 移动' },
      down: { mode: 'hold', mapsTo: '↓ / S 移动' },
      left: { mode: 'hold', mapsTo: '← / A 移动' },
      right: { mode: 'hold', mapsTo: '→ / D 移动' },
    },
    actions: [{ label: '开火', mapsTo: '空格 / J 开火', mode: 'hold' }],
  },
  fruit: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 800, h: 540 },
    dirs: {
      left: { mode: 'hold', mapsTo: '← / A 移动篮子' },
      right: { mode: 'hold', mapsTo: '→ / D 移动篮子' },
    },
    notes: '也可在画布上拖动篮子。',
  },
  breakout: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 900, h: 600 },
    dirs: {
      left: { mode: 'hold', mapsTo: '← 移动挡板' },
      right: { mode: 'hold', mapsTo: '→ 移动挡板' },
    },
    actions: [{ label: '发射', mapsTo: '空格发球' }],
    notes: '也可在场地上滑动挡板。',
  },
  pong: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 960, h: 540 },
    dirs: {
      up: { mode: 'hold', mapsTo: 'AI 模式：W / ↑ 玩家一上移；双人：W 玩家一上移' },
      down: { mode: 'hold', mapsTo: 'AI 模式：S / ↓ 玩家一下移；双人：S 玩家一下移' },
    },
    actions: [
      { label: '↑', mapsTo: '双人模式：玩家二 ArrowUp', mode: 'hold' },
      { label: '↓', mapsTo: '双人模式：玩家二 ArrowDown', mode: 'hold' },
    ],
    notes: '画布拖动仍可用；双人右侧圆形键控制玩家二。',
  },
  pinball: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 360, h: 640 },
    dirs: {
      left: { mode: 'hold', mapsTo: '左挡板（← / Z / A）' },
      right: { mode: 'hold', mapsTo: '右挡板（→ / M / L）' },
    },
    actions: [{ label: '发射', mapsTo: '空格 / Enter 蓄力发射', mode: 'hold' }],
  },
  '2048': {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 1, h: 1 },
    dirs: {
      left: { mode: 'tap', mapsTo: '左滑 / ← / A' },
      right: { mode: 'tap', mapsTo: '右滑 / → / D' },
      up: { mode: 'tap', mapsTo: '上滑 / ↑ / W' },
      down: { mode: 'tap', mapsTo: '下滑 / ↓ / S' },
    },
    notes: '棋盘滑动仍可用。',
  },
  huarong: {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 4, h: 5 },
    dirs: {
      left: { mode: 'tap', mapsTo: '已选棋子左移' },
      right: { mode: 'tap', mapsTo: '已选棋子右移' },
      up: { mode: 'tap', mapsTo: '已选棋子上移' },
      down: { mode: 'tap', mapsTo: '已选棋子下移' },
    },
    notes: '拖动棋子仍可用。',
  },
  flappy: {
    kind: 'touch',
    layout: 'banded',
    logical: { w: 440, h: 600 },
    notes: '点画布或空格拍翅，不强加方向键。',
  },
  jump: {
    kind: 'touch',
    layout: 'banded',
    logical: { w: 760, h: 660 },
    notes: '按住画布或空格蓄力，松开起跳。',
  },
  fishing: {
    kind: 'touch',
    layout: 'banded',
    logical: { w: 4, h: 3 },
    notes: '全屏保留抛竿 / 提竿 / 收线按钮，无方向键。',
  },
  bubbles: {
    kind: 'touch',
    layout: 'banded',
    logical: { w: 420, h: 640 },
    notes: '在场地上按住瞄准、松开发射。',
  },
  rhythm: {
    kind: 'touch',
    layout: 'banded',
    logical: { w: 720, h: 560 },
    notes: '底部四轨按钮对应 D/F/J/K，可同时按两轨；不使用十字键。',
  },
  minesweeper: { kind: 'touch', layout: 'banded', logical: { w: 30, h: 16 }, notes: '点击翻开，长按插旗。' },
  match3: { kind: 'touch', layout: 'banded', logical: { w: 1, h: 1 }, notes: '滑动或点选交换。' },
  sudoku: { kind: 'touch', layout: 'banded', logical: { w: 9, h: 9 }, notes: '点格填写，保留数字键区。' },
  memory: { kind: 'touch', layout: 'banded', logical: { w: 4, h: 4 }, notes: '点牌配对。' },
  gomoku: { kind: 'touch', layout: 'banded', logical: { w: 15, h: 15 }, notes: '点交叉落子。' },
  'gomoku-vs': { kind: 'touch', layout: 'banded', logical: { w: 15, h: 15 }, notes: '点交叉落子；房间号联机，不强加方向键。' },
  slider: { kind: 'touch', layout: 'banded', logical: { w: 1, h: 1 }, notes: '点滑块移动。' },
  tictactoe: { kind: 'touch', layout: 'banded', logical: { w: 3, h: 3 }, notes: '点格落子。' },
  whack: { kind: 'touch', layout: 'banded', logical: { w: 3, h: 3 }, notes: '点洞打击。' },
  lianliankan: { kind: 'touch', layout: 'banded', logical: { w: 10, h: 8 }, notes: '点选配对消除。' },
  reversi: { kind: 'touch', layout: 'banded', logical: { w: 8, h: 8 }, notes: '点格落子。' },
  connect4: { kind: 'touch', layout: 'banded', logical: { w: 7, h: 6 }, notes: '点列落子。' },
  solitaire: { kind: 'touch', layout: 'banded', logical: { w: 7, h: 5 }, notes: '点选与移动纸牌；棋盘过长时可滚动。' },
  blackjack: { kind: 'touch', layout: 'banded', logical: { w: 4, h: 3 }, notes: '保留要牌 / 停牌 / 加倍。' },
  aeroplane: { kind: 'touch', layout: 'banded', logical: { w: 1, h: 1 }, notes: '点棋子与掷骰。' },
  xiangqi: { kind: 'touch', layout: 'banded', logical: { w: 9, h: 10 }, notes: '点选走子。' },
  junqi: { kind: 'touch', layout: 'banded', logical: { w: 5, h: 12 }, notes: '点选翻棋与走子。' },
  tinylang: { kind: 'skip', layout: 'banded', notes: '非游戏工具，不强加全屏。' },
  'yard-defense': { kind: 'touch', layout: 'banded', logical: { w: 800, h: 560 }, notes: '点选单位再点格子布置，不强加方向键。' },
  'sling-workshop': { kind: 'touch', layout: 'banded', logical: { w: 960, h: 540 }, notes: '在弹弓附近拖拽拉弓、松开发射，不强加方向键。' },
  'roll-quest': {
    kind: 'pad',
    layout: 'overlay',
    logical: { w: 800, h: 450 },
    dirs: {
      left: { mode: 'hold', mapsTo: '← / A 向左' },
      right: { mode: 'hold', mapsTo: '→ / D 向右' },
      up: { mode: 'hold', mapsTo: '↑ / W / Space 按住跳跃' },
      down: { mode: 'hold', mapsTo: '↓（无原功能，禁用）', optional: true },
    },
    actions: [{ label: '跳', mapsTo: '按住跳跃，松手提前下落', mode: 'hold' }],
    notes: '按住跳得更高；可同时按方向与跳跃。',
  },
  'street-rush': { kind: 'touch', layout: 'banded', logical: { w: 840, h: 480 }, notes: '点画面射击、右下角换弹，不强加方向键；键盘可用方向键移准星。' },
};

export const GAME_SOURCE_FILES: Record<string, string> = {
  tetris: 'src/games/tetris.tsx',
  'tetris-vs': 'src/games/tetrisVs.tsx',
  snake: 'src/games/snake.tsx',
  contra: 'src/games/contra.tsx',
  '2048': 'src/games/2048.tsx',
  breakout: 'src/games/breakout.tsx',
  minesweeper: 'src/games/minesweeper.tsx',
  invaders: 'src/games/invaders.tsx',
  pacmaze: 'src/games/pacmaze.tsx',
  sokoban: 'src/games/sokoban.tsx',
  shooter: 'src/games/shooter.tsx',
  flappy: 'src/games/flappy.tsx',
  match3: 'src/games/match3.tsx',
  sudoku: 'src/games/sudoku.tsx',
  pong: 'src/games/pong.tsx',
  memory: 'src/games/memory.tsx',
  tank: 'src/games/tank.tsx',
  fruit: 'src/games/fruit.tsx',
  jump: 'src/games/jump.tsx',
  gomoku: 'src/games/gomoku.tsx',
  'gomoku-vs': 'src/games/gomokuVs.tsx',
  rhythm: 'src/games/rhythm.tsx',
  huarong: 'src/games/huarong.tsx',
  slider: 'src/games/slider.tsx',
  tictactoe: 'src/games/tictactoe.tsx',
  whack: 'src/games/whack.tsx',
  lianliankan: 'src/games/lianliankan.tsx',
  reversi: 'src/games/reversi.tsx',
  connect4: 'src/games/connect4.tsx',
  solitaire: 'src/games/solitaire.tsx',
  blackjack: 'src/games/blackjack.tsx',
  bubbles: 'src/games/bubbles.tsx',
  pinball: 'src/games/pinball.tsx',
  aeroplane: 'src/games/aeroplane.tsx',
  fishing: 'src/games/fishing.tsx',
  xiangqi: 'src/games/xiangqi.tsx',
  junqi: 'src/games/junqi.tsx',
  tinylang: 'src/games/tinylang.tsx',
  'yard-defense': 'src/games/yardDefense.tsx',
  'sling-workshop': 'src/games/slingWorkshop.tsx',
  'roll-quest': 'src/games/rollQuest.tsx',
  'street-rush': 'src/games/streetRush.tsx',
};
