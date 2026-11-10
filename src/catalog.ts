import type { ComponentType } from 'react';
import Tetris from './games/tetris';
import Snake from './games/snake';
import Contra from './games/contra';
import G2048 from './games/2048';
import Breakout from './games/breakout';
import Minesweeper from './games/minesweeper';
import Invaders from './games/invaders';
import Pacmaze from './games/pacmaze';
import Sokoban from './games/sokoban';
import Shooter from './games/shooter';
import Flappy from './games/flappy';
import Match3 from './games/match3';
import Sudoku from './games/sudoku';
import Pong from './games/pong';
import Memory from './games/memory';
import Tank from './games/tank';
import Fruit from './games/fruit';
import Jump from './games/jump';
import Gomoku from './games/gomoku';
import Rhythm from './games/rhythm';
import Huarong from './games/huarong';
import Slider from './games/slider';
import TicTacToe from './games/tictactoe';
import Whack from './games/whack';
import Lianliankan from './games/lianliankan';
import Reversi from './games/reversi';
import Connect4 from './games/connect4';
import Solitaire from './games/solitaire';
import Blackjack from './games/blackjack';
import Bubbles from './games/bubbles';
import Pinball from './games/pinball';
import Aeroplane from './games/aeroplane';
import Fishing from './games/fishing';
import Xiangqi from './games/xiangqi';
import Junqi from './games/junqi';
import TinyLang from './games/tinylang';

export type GameEntry = {
  slug: string;
  title: string;
  site: string;
  tip: string;
  canvasId: string;
  component: ComponentType;
  bonus?: boolean;
  saves?: string;
};

export const games: GameEntry[] = [
  { slug: 'tetris', title: '俄罗斯方块', site: '经典方块，踢墙/暂存/幽灵落点', tip: '先看幽灵落点，再决定摆放；暂存能救场。', canvasId: '0ec334d7-8623-4d7f-b7d1-faaf3b268081', component: Tetris },
  { slug: 'snake', title: '贪吃蛇', site: '穿墙、提速', tip: '留出回转空间，熟悉节奏后再挑战提速。', canvasId: 'b718e570-8b77-49b4-95a8-da5ee2cc312c', component: Snake },
  { slug: 'contra', title: '丛林突击', site: '魂斗罗风横版射击', tip: '边移动边射击，跳跃避开迎面的攻击。', canvasId: '504f45ad-4e14-4d85-8b91-2b1aa0e87604', component: Contra },
  { slug: '2048', title: '2048', site: '滑动合并', tip: '尽量把最大数字留在一个角落。', canvasId: '231ec411-01c8-4b7e-9de0-3d1d3594eff2', component: G2048 },
  { slug: 'breakout', title: '打砖块', site: '三关弹球', tip: '观察球的回落方向，提前移动挡板接球。', canvasId: 'af68b29d-66a7-4a77-b8cf-72d718b1a0b8', component: Breakout },
  { slug: 'minesweeper', title: '扫雷', site: '三档难度', tip: '数字表示相邻雷数，先处理能确定的格子。', canvasId: 'c0a47b24-5cca-4b9c-b36f-908afb3cb40c', component: Minesweeper },
  { slug: 'invaders', title: '星际入侵', site: '太空侵略者风', tip: '保持移动，利用屏障争取射击机会。', canvasId: '367d80b9-3fe6-47c4-82dc-37eabf90eb75', component: Invaders },
  { slug: 'pacmaze', title: '迷宫豆豆', site: '吃豆迷宫', tip: '先规划绕行路线，避免把自己堵进死角。', canvasId: 'f58a6340-23e1-4db7-bfbe-e94f23fab73a', component: Pacmaze },
  { slug: 'sokoban', title: '推箱子', site: '八关可解谜题', tip: '先想后推，卡住就撤销；步数越少越好。', canvasId: 'acc54e29-9781-482b-b050-78eef7ffbb65', component: Sokoban },
  { slug: 'shooter', title: '星际战机', site: '飞机大战风纵向射击', tip: '保持走位，捡强化，Boss 来时优先躲弹幕。', canvasId: '707833c5-8706-4399-80cc-dd786358d91c', component: Shooter },
  { slug: 'flappy', title: '蹦跳小鸟', site: '一点就飞', tip: '节奏比力气重要，贴着缺口下沿飞更稳。', canvasId: '7331d520-b5ad-4479-a52a-4a6d389a28ba', component: Flappy },
  { slug: 'match3', title: '消消乐', site: '三消连锁', tip: '优先做能连锁的交换，步数比眼前一分更重要。', canvasId: 'c264550d-2dd6-4f60-93fa-3608ca68c60d', component: Match3 },
  { slug: 'sudoku', title: '数独', site: '三档唯一解', tip: '先填只能唯一确定的格，笔记模式很有用。', canvasId: '44f906d9-6936-4bf0-b7ae-25ee8ffa841a', component: Sudoku },
  { slug: 'pong', title: '乒乓', site: '人机/双人对打', tip: '用拍面边缘打出角度，比正中间回球更难接。', canvasId: 'bd697708-1277-4874-9191-e70400919e80', component: Pong },
  { slug: 'memory', title: '翻牌记忆', site: '翻牌配对', tip: '先扫一遍再翻，记住大概位置比乱点省步数。', canvasId: '1662bd19-4761-4a5c-b6ae-d4bc933ef1f7', component: Memory },
  { slug: 'tank', title: '坦克对战', site: '基地防守三关', tip: '砖墙可拆，钢墙挡弹；别让敌人摸到基地。', canvasId: '1cbfff36-9e17-4247-a494-3b3dd9dfc5c4', component: Tank },
  { slug: 'fruit', title: '接水果', site: '下落接取', tip: '烂果别接；连击时稳住左右，别贪远的。', canvasId: '4b6025ed-a3f0-44c3-a18f-c85ef0d78ab1', component: Fruit },
  { slug: 'jump', title: '跳一跳', site: '蓄力跳远', tip: '看距离松手，踩中心才有连击。', canvasId: '80ed57f6-a5ce-459c-984e-9f3b801b27c0', component: Jump, saves: '本机 localStorage 键 hop-original-best，仅保存最高分，不跨设备同步。' },
  { slug: 'gomoku', title: '五子棋', site: '双人/人机', tip: '攻防兼顾；活三别随便给对手。', canvasId: '14239be4-a132-4c13-919e-c1280b45df1c', component: Gomoku },
  { slug: 'rhythm', title: '节奏点按', site: '四轨打拍', tip: 'DFJK 对四轨，贴判定线再按，连击别断。', canvasId: 'cd7c4d60-54ad-4b30-8a72-8bc5db4f3f61', component: Rhythm },
  { slug: 'huarong', title: '华容道', site: '滑块逃生', tip: '先给曹操腾出竖向通道，别把自己堵死。', canvasId: '908fc54f-97a7-4608-b85d-2af59702f517', component: Huarong },
  { slug: 'slider', title: '滑动拼图', site: '数字滑块', tip: '先排好一行再解下一行，别把空白卡死在角里。', canvasId: 'e5d930c7-a8bc-4904-ac2c-715bc477a008', component: Slider },
  { slug: 'tictactoe', title: '井字棋', site: '双人/无败AI', tip: '对 AI 最多平局；想赢就找朋友双人。', canvasId: '2a556992-f3de-4580-8ff8-36b123130c7a', component: TicTacToe },
  { slug: 'whack', title: '打地鼠', site: '限时点洞', tip: '盯最快冒头的洞，别空点；越往后越快。', canvasId: 'd9cbd155-ae39-4463-8a89-c9220903e15d', component: Whack },
  { slug: 'lianliankan', title: '连连看', site: '两弯连通消对', tip: '先清边角和直线；卡住就用重排，别空耗时间。', canvasId: 'd5af817d-5ead-41b4-adfb-617e59865d22', component: Lianliankan },
  { slug: 'reversi', title: '黑白棋', site: '双人/人机奥赛罗', tip: '抢角、控边；别轻易给对手角点。', canvasId: '76be132f-638b-43b1-96e1-e76ae496bebe', component: Reversi },
  { slug: 'connect4', title: '四子棋', site: '双人/人机重力四连', tip: '优先堵对手三连，中间列价值更高。', canvasId: '1df99db2-2f61-45f3-89b9-a427df7e0443', component: Connect4 },
  { slug: 'solitaire', title: '纸牌接龙', site: 'Klondike单张/三张', tip: '先翻暗牌；能收基础牌就收，别堵同色长龙。', canvasId: 'cca2289c-e1c5-4999-b2fa-d370e428c462', component: Solitaire },
  { slug: 'blackjack', title: '二十一点', site: '虚拟筹码，要牌/停牌/加倍', tip: '天然二十一点按 3:2 赔；没把握就停，别轻易爆牌。', canvasId: '106e6be9-3b29-49e6-9bc2-15abbd35222f', component: Blackjack },
  { slug: 'bubbles', title: '泡泡龙', site: '瞄准发射，三色消除', tip: '借墙反弹打到边角同色；注意别把泡泡堆到虚线。', canvasId: 'ad65a45b-2105-48a9-a9c6-c32c2da65898', component: Bubbles },
  { slug: 'pinball', title: '弹球', site: '弹珠台三球记分', tip: '先蓄力发射，再用左右挡板把球打回弹射器。', canvasId: 'c6ea6157-d5bd-4371-8f3b-accc8be0807b', component: Pinball },
  { slug: 'aeroplane', title: '飞行棋', site: '四色简化人机', tip: '先把棋子飞出来；能撞就撞，终点要点数刚好。', canvasId: '2dd74d62-138b-40da-afce-d8f29d3a82e0', component: Aeroplane },
  { slug: 'fishing', title: '钓鱼', site: '抛竿咬钩收线', tip: '咬钩立刻提竿，收线时把张力留在绿色区间。', canvasId: '1fdc1b83-7f4c-4a27-b8a6-16db1ae0b67e', component: Fishing },
  { slug: 'xiangqi', title: '中国象棋', site: '标准棋盘本地双人', tip: '先看将帅照面和蹩马腿；被将军必须先应将。', canvasId: '83489b60-1f35-42b4-86d4-8d71861306ee', component: Xiangqi },
  { slug: 'junqi', title: '军棋', site: '双人暗棋翻棋', tip: '工兵才能排雷，炸弹同归于尽；目标是吃掉军旗。', canvasId: 'f8651a64-0109-4e1c-b44e-5e555c8d490e', component: Junqi },
];

export const bonus: GameEntry[] = [
  { slug: 'tinylang', title: 'TinyLang 玩具解释器', site: '页内语言解释器 · 示例、Tokens 与 AST', tip: '在页内运行示例，查看词法与语法树。', canvasId: '1a5318c3-f844-43c8-a428-e3fdeb7ace6c', component: TinyLang, bonus: true },
];

export const allEntries: GameEntry[] = games.concat(bonus);

export function findGame(slug: string | undefined): GameEntry | undefined {
  if (!slug) return undefined;
  return allEntries.find((g: GameEntry) => g.slug === slug);
}
