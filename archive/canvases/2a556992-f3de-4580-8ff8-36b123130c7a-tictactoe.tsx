import { Page, Section, Text, Button, Segmented, useState, useEffect, useGrokTheme } from 'grok/canvas';
type Mark = 'X' | 'O';
type Cell = Mark | null;
type Mode = 'ai' | 'pvp';
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function result(b: Cell[]): {winner: Mark | null; line: number[]; draw: boolean} {
  for (const l of lines) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return {winner:b[l[0]],line:l,draw:false};
  return {winner:null,line:[],draw:b.every((c: Cell) => c !== null)};
}
function minimax(b: Cell[], turn: Mark, ai: Mark, depth: number): number {
  const r = result(b);
  if (r.winner) return r.winner === ai ? 10-depth : depth-10;
  if (r.draw) return 0;
  let best = turn === ai ? -100 : 100;
  for (const i of [4,0,2,6,8,1,3,5,7]) if (!b[i]) {
    b[i] = turn;
    const score = minimax(b, turn === 'X' ? 'O' : 'X', ai, depth+1);
    b[i] = null;
    best = turn === ai ? Math.max(best,score) : Math.min(best,score);
  }
  return best;
}
function bestMove(board: Cell[], ai: Mark): number {
  const b = [...board]; let best = -100; let move = -1;
  for (const i of [4,0,2,6,8,1,3,5,7]) if (!b[i]) {
    b[i] = ai;
    const score = minimax(b, ai === 'X' ? 'O' : 'X', ai, 0);
    b[i] = null;
    if (score > best) {best=score;move=i;}
  }
  return move;
}
export default function App() {
  const t = useGrokTheme();
  const [mode,setMode] = useState<Mode>('ai');
  const [human,setHuman] = useState<Mark>('X');
  const [board,setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn,setTurn] = useState<Mark>('X');
  const [scores,setScores] = useState({X:0,O:0,draw:0});
  const r = result(board);
  const ai: Mark = human === 'X' ? 'O' : 'X';
  const thinking = mode === 'ai' && turn === ai && !r.winner && !r.draw;
  function reset() {setBoard(Array(9).fill(null));setTurn('X');}
  function clear() {reset();setScores({X:0,O:0,draw:0});}
  function play(i: number) {
    if (board[i] || r.winner || r.draw) return;
    const next = [...board]; next[i] = turn;
    const end = result(next);
    setBoard(next);setTurn(turn === 'X' ? 'O' : 'X');
    if (end.winner) {const w = end.winner;setScores((s: {X:number;O:number;draw:number}) => ({...s,[w]:s[w]+1}));}
    else if (end.draw) setScores((s: {X:number;O:number;draw:number}) => ({...s,draw:s.draw+1}));
  }
  useEffect(() => {
    if (!thinking) return;
    const id = setTimeout(() => {const i = bestMove(board,ai);if(i >= 0) play(i);}, 260);
    return () => clearTimeout(id);
  }, [board,turn,mode,human]);
  const label = (m: Mark): string => mode === 'pvp' ? '玩家 '+m : m === human ? '你 · '+m : 'AI · '+m;
  const status = r.winner ? label(r.winner)+' 获胜' : r.draw ? '平局，再来一局？' : thinking ? 'AI 正在思考…' : '轮到 '+label(turn);
  return <Page title="井字棋" width="wide" lang="zh-Hans" summary="三子连线即胜。双人同屏，或挑战不会输的 Minimax AI。">
    <Section heading="对局设置">
      <div style={{display:'flex',flexWrap:'wrap',gap:16,alignItems:'center',color:t.text.primary,fontFamily:t.font.family}}>
        <Segmented<Mode> value={mode} options={[{value:'ai',label:'挑战 AI'},{value:'pvp',label:'双人对战'}]} onChange={(v: Mode) => {setMode(v);clear();}} />
        {mode === 'ai' && <Segmented<Mark> value={human} options={[{value:'X',label:'执 X · 先手'},{value:'O',label:'执 O · 后手'}]} onChange={(v: Mark) => {setHuman(v);clear();}} />}
      </div>
    </Section>
    <Section heading="棋盘">
      <div style={{color:t.text.primary,fontFamily:t.font.family}}>
        <div aria-live="polite" role="status" style={{fontSize:22,fontWeight:600,marginBottom:20}}>{status}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',position:'relative',gap:8}}>
          {board.map((cell: Cell,i: number) => <button key={i} aria-label={'第'+(Math.floor(i/3)+1)+'行，第'+(i%3+1)+'列：'+(cell || '空')} disabled={!!cell || !!r.winner || r.draw || thinking} onClick={() => play(i)} style={{aspectRatio:'1.5',minHeight:76,border:'2px solid '+(r.line.includes(i) ? t.dataviz.categorical[0] : t.border.default),borderRadius:12,background:r.line.includes(i) ? t.fill.accentSubtle : t.bg.subtle,color:cell === 'X' ? t.dataviz.categorical[0] : t.dataviz.categorical[1],fontFamily:t.font.family,fontSize:'clamp(38px,8vw,100px)',fontWeight:600,cursor:!cell && !r.winner && !r.draw && !thinking ? 'pointer' : 'default',touchAction:'manipulation',opacity:1}}>{cell || '·'}</button>)}
          {r.line.length > 0 && <svg aria-hidden="true" viewBox="0 0 300 300" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}><line x1={(r.line[0]%3)*100+50} y1={Math.floor(r.line[0]/3)*100+50} x2={(r.line[2]%3)*100+50} y2={Math.floor(r.line[2]/3)*100+50} stroke={t.dataviz.categorical[0]} strokeWidth="4" strokeLinecap="round" opacity="0.65" /></svg>}
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:20}}><Button label={r.winner || r.draw ? '下一局' : '重新开始本局'} onClick={reset} variant="primary" /><Button label="清空比分" onClick={clear} /></div>
      </div>
    </Section>
    <Section heading="记分牌">
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,color:t.text.primary,fontFamily:t.font.family}}>
        {[{name:label('X'),value:scores.X},{name:'平局',value:scores.draw},{name:label('O'),value:scores.O}].map((s: {name:string;value:number}) => <div key={s.name} style={{borderTop:'1px solid '+t.border.default,paddingTop:16}}><div style={{fontSize:32,fontWeight:600}}>{s.value}</div><div style={{fontSize:14,color:t.text.secondary}}>{s.name}</div></div>)}
      </div>
    </Section>
    <Section heading="玩法"><Text>X 先手，横、竖或斜线连成三个棋子获胜。点击或触碰格子落子；也可用 Tab 选择、回车或空格落子。切换模式或执子会重置比分，刷新页面不保留战绩。</Text></Section>
  </Page>;
}
