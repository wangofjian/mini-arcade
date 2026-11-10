import { Page, Section, Text, Grid, LinkCards, Table, useGrokTheme } from "grok/canvas";
const games = [
{title:"俄罗斯方块",site:"经典方块，踢墙/暂存/幽灵落点",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/0ec334d7-8623-4d7f-b7d1-faaf3b268081",tip:"先看幽灵落点，再决定摆放；暂存能救场。"},
{title:"贪吃蛇",site:"穿墙、提速",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/b718e570-8b77-49b4-95a8-da5ee2cc312c",tip:"留出回转空间，熟悉节奏后再挑战提速。"},
{title:"丛林突击",site:"魂斗罗风横版射击",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/504f45ad-4e14-4d85-8b91-2b1aa0e87604",tip:"边移动边射击，跳跃避开迎面的攻击。"},
{title:"2048",site:"滑动合并",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/231ec411-01c8-4b7e-9de0-3d1d3594eff2",tip:"尽量把最大数字留在一个角落。"},
{title:"打砖块",site:"三关弹球",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/af68b29d-66a7-4a77-b8cf-72d718b1a0b8",tip:"观察球的回落方向，提前移动挡板接球。"},
{title:"扫雷",site:"三档难度",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/c0a47b24-5cca-4b9c-b36f-908afb3cb40c",tip:"数字表示相邻雷数，先处理能确定的格子。"},
{title:"星际入侵",site:"太空侵略者风",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/367d80b9-3fe6-47c4-82dc-37eabf90eb75",tip:"保持移动，利用屏障争取射击机会。"},
{title:"迷宫豆豆",site:"吃豆迷宫",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/f58a6340-23e1-4db7-bfbe-e94f23fab73a",tip:"先规划绕行路线，避免把自己堵进死角。"},
{title:"推箱子",site:"八关可解谜题",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/acc54e29-9781-482b-b050-78eef7ffbb65",tip:"先想后推，卡住就撤销；步数越少越好。"},
{title:"星际战机",site:"飞机大战风纵向射击",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/707833c5-8706-4399-80cc-dd786358d91c",tip:"保持走位，捡强化，Boss 来时优先躲弹幕。"},
{title:"蹦跳小鸟",site:"一点就飞",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/7331d520-b5ad-4479-a52a-4a6d389a28ba",tip:"节奏比力气重要，贴着缺口下沿飞更稳。"},
{title:"消消乐",site:"三消连锁",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/c264550d-2dd6-4f60-93fa-3608ca68c60d",tip:"优先做能连锁的交换，步数比眼前一分更重要。"},
{title:"数独",site:"三档唯一解",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/44f906d9-6936-4bf0-b7ae-25ee8ffa841a",tip:"先填只能唯一确定的格，笔记模式很有用。"},
{title:"乒乓",site:"人机/双人对打",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/bd697708-1277-4874-9191-e70400919e80",tip:"用拍面边缘打出角度，比正中间回球更难接。"},
{title:"翻牌记忆",site:"翻牌配对",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/1662bd19-4761-4a5c-b6ae-d4bc933ef1f7",tip:"先扫一遍再翻，记住大概位置比乱点省步数。"},
{title:"坦克对战",site:"基地防守三关",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/1cbfff36-9e17-4247-a494-3b3dd9dfc5c4",tip:"砖墙可拆，钢墙挡弹；别让敌人摸到基地。"},
{title:"接水果",site:"下落接取",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/4b6025ed-a3f0-44c3-a18f-c85ef0d78ab1",tip:"烂果别接；连击时稳住左右，别贪远的。"},
{title:"跳一跳",site:"蓄力跳远",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/80ed57f6-a5ce-459c-984e-9f3b801b27c0",tip:"看距离松手，踩中心才有连击。"},
{title:"五子棋",site:"双人/人机",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/14239be4-a132-4c13-919e-c1280b45df1c",tip:"攻防兼顾；活三别随便给对手。"},
{title:"节奏点按",site:"四轨打拍",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/cd7c4d60-54ad-4b30-8a72-8bc5db4f3f61",tip:"DFJK 对四轨，贴判定线再按，连击别断。"},
{title:"华容道",site:"滑块逃生",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/908fc54f-97a7-4608-b85d-2af59702f517",tip:"先给曹操腾出竖向通道，别把自己堵死。"},
{title:"滑动拼图",site:"数字滑块",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/e5d930c7-a8bc-4904-ac2c-715bc477a008",tip:"先排好一行再解下一行，别把空白卡死在角里。"},
{title:"井字棋",site:"双人/无败AI",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/2a556992-f3de-4580-8ff8-36b123130c7a",tip:"对 AI 最多平局；想赢就找朋友双人。"},
{title:"打地鼠",site:"限时点洞",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/d9cbd155-ae39-4463-8a89-c9220903e15d",tip:"盯最快冒头的洞，别空点；越往后越快。"},
{title:"连连看",site:"两弯连通消对",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/d5af817d-5ead-41b4-adfb-617e59865d22",tip:"先清边角和直线；卡住就用重排，别空耗时间。"},
{title:"黑白棋",site:"双人/人机奥赛罗",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/76be132f-638b-43b1-96e1-e76ae496bebe",tip:"抢角、控边；别轻易给对手角点。"},
{title:"四子棋",site:"双人/人机重力四连",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/1df99db2-2f61-45f3-89b9-a427df7e0443",tip:"优先堵对手三连，中间列价值更高。"},
{title:"纸牌接龙",site:"Klondike单张/三张",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/cca2289c-e1c5-4999-b2fa-d370e428c462",tip:"先翻暗牌；能收基础牌就收，别堵同色长龙。"},
{title:"二十一点",site:"虚拟筹码，要牌/停牌/加倍",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/106e6be9-3b29-49e6-9bc2-15abbd35222f",tip:"天然二十一点按 3:2 赔；没把握就停，别轻易爆牌。"},
{title:"泡泡龙",site:"瞄准发射，三色消除",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/ad65a45b-2105-48a9-a9c6-c32c2da65898",tip:"借墙反弹打到边角同色；注意别把泡泡堆到虚线。"},
{title:"弹球",site:"弹珠台三球记分",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/c6ea6157-d5bd-4371-8f3b-accc8be0807b",tip:"先蓄力发射，再用左右挡板把球打回弹射器。"},
{title:"飞行棋",site:"四色简化人机",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/2dd74d62-138b-40da-afce-d8f29d3a82e0",tip:"先把棋子飞出来；能撞就撞，终点要点数刚好。"},
{title:"钓鱼",site:"抛竿咬钩收线",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/1fdc1b83-7f4c-4a27-b8a6-16db1ae0b67e",tip:"咬钩立刻提竿，收线时把张力留在绿色区间。"},
{title:"中国象棋",site:"标准棋盘本地双人",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/83489b60-1f35-42b4-86d4-8d71861306ee",tip:"先看将帅照面和蹩马腿；被将军必须先应将。"},
{title:"军棋",site:"双人暗棋翻棋",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/f8651a64-0109-4e1c-b44e-5e555c8d490e",tip:"工兵才能排雷，炸弹同归于尽；目标是吃掉军旗。"}
];
export default function App() {
 const theme = useGrokTheme();
 return <Page title="小游戏厅" summary="三十五款小游戏，一个入口。选一张卡片，直接开玩。" width="wide" lang="zh-Hans">
 <Text><span style={{color:theme.text.secondary}}>这里收齐了已做好的小游戏：想练反应就选街机，想慢慢琢磨就选益智。点击游戏名称打开对应 Page，具体操作见各游戏内说明。</span></Text>
 <Section heading="挑一款，开始玩">
 <Grid columns={3}>{games.map((game: typeof games[number]) => <LinkCards key={game.title} links={[{title:game.title,site:game.site,href:game.href}]} />)}</Grid>
 </Section>
 <Section heading="上手小贴士">
 <Table columns={["游戏","一句话提示"]} align={["start","start"]} rows={games.map((game: typeof games[number]) => [game.title,game.tip])} />
 </Section>
 <Section heading="加映：写点小程序">
 <Text>不想打游戏？到 TinyLang 游乐场，试试页内语言解释器。</Text>
 <LinkCards links={[{title:"TinyLang 玩具解释器",site:"页内语言解释器 · 示例、Tokens 与 AST",href:"https://cursor.com/canvas/store-0972d805-7417-48c1-af25-2f4cf76da740/1a5318c3-f844-43c8-a428-e3fdeb7ace6c"}]} />
 </Section>
 </Page>;
}
