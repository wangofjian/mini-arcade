import {
  Page,
  Section,
  Text,
  Button,
  Segmented,
  useState,
  useEffect,
  useMemo,
  useGrokTheme,
  useRef
} from '../compat/grok-canvas';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { useStageFit } from '../mobile/useStageFit';
type Move={r:number;c:number;p:number};
const N=15;const dirs=[[1,0],[0,1],[1,1],[1,-1]];
function boardOf(ms:Move[]){const b:number[][]=Array.from({length:N},()=>Array(N).fill(0));ms.forEach((m:Move)=>{b[m.r][m.c]=m.p;});return b;}
function line(b:number[][],r:number,c:number,p:number):number[][]{for(const [dr,dc] of dirs){const a:number[][]=[[r,c]];for(const s of [-1,1]){let y=r+dr*s,x=c+dc*s;while(y>=0&&y<N&&x>=0&&x<N&&b[y][x]===p){a.push([y,x]);y+=dr*s;x+=dc*s;}}if(a.length>=5)return a;}return [];}
function potential(b:number[][],r:number,c:number,p:number){let total=0;b[r][c]=p;for(const [dr,dc] of dirs){let count=1,open=0;for(const s of [-1,1]){let y=r+dr*s,x=c+dc*s;while(y>=0&&y<N&&x>=0&&x<N&&b[y][x]===p){count++;y+=dr*s;x+=dc*s;}if(y>=0&&y<N&&x>=0&&x<N&&b[y][x]===0)open++;}if(count>=5)total+=10000000;else if(open){const values=[0,3,40,700,18000];total+=values[count]*(open===2?5:1);}}b[r][c]=0;return total;}
function candidates(b:number[][]){const out:{r:number;c:number;s:number}[]=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(b[r][c])continue;let near=false;for(let y=Math.max(0,r-2);y<=Math.min(N-1,r+2)&&!near;y++)for(let x=Math.max(0,c-2);x<=Math.min(N-1,c+2);x++)if(b[y][x]){near=true;break;}if(near)out.push({r,c,s:Math.max(potential(b,r,c,2),potential(b,r,c,1)*1.08)});}return out.sort((a,b)=>b.s-a.s);}
function choose(b:number[][]){const all=candidates(b);if(!all.length)return {r:7,c:7};for(const p of [2,1])for(const m of all){b[m.r][m.c]=p;const win=line(b,m.r,m.c,p).length>0;b[m.r][m.c]=0;if(win)return m;}let best=all[0],score=-Infinity;for(const m of all.slice(0,12)){const attack=potential(b,m.r,m.c,2);const block=potential(b,m.r,m.c,1);b[m.r][m.c]=2;const reply=candidates(b).slice(0,10);let worst=0;for(const q of reply)worst=Math.max(worst,potential(b,q.r,q.c,1));b[m.r][m.c]=0;const s=attack+block*0.8-worst*1.15-(Math.abs(m.r-7)+Math.abs(m.c-7))*0.3;if(s>score){score=s;best=m;}}return best;}
export default function App(){
 const stageRef=useRef<HTMLDivElement|null>(null);
 const {active:immersive}=useImmersivePlay();
 const fit=useStageFit(stageRef,15,15,immersive,true);
const t=useGrokTheme();const [mode,setMode]=useState('ai');const [moves,setMoves]=useState<Move[]>([]);const b=useMemo(()=>boardOf(moves),[moves]);const last=moves[moves.length-1];const winning=last?line(b,last.r,last.c,last.p):[];const ended=winning.length>0||moves.length===225;const turn=moves.length%2+1;const thinking=mode==='ai'&&turn===2&&!ended;
useEffect(()=>{if(!thinking)return;const timer=setTimeout(()=>{const m=choose(boardOf(moves));setMoves((prev:Move[])=>prev.length===moves.length?[...prev,{r:m.r,c:m.c,p:2}]:prev);},260);return ()=>clearTimeout(timer);},[thinking,moves]);
function play(r:number,c:number){if(ended||thinking||b[r][c])return;setMoves([...moves,{r,c,p:turn}]);}
function undo(){setMoves((prev:Move[])=>prev.slice(0,Math.max(0,prev.length-(mode==='ai'&&prev.length%2===0?2:1))));}
const status=winning.length?((last.p===1?'黑方':'白方')+'获胜！'):moves.length===225?'棋盘已满 · 和棋':thinking?'白方 AI 思考中…':('轮到'+(turn===1?'黑方':'白方')+'落子');
return <Page title="五子棋" summary="十五路棋盘，一线连五。与朋友对弈，或挑战会进攻也会防守的 AI。" width="wide" lang="zh-Hans">
      <ImmersiveFrame
        layout="banded"
        stageRef={stageRef}
        intro={<Text>手机可点「全屏游玩」：棋盘铺满屏幕，点交叉落子。不强加方向键。</Text>}
      >
<Section><div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',color:t.text.primary}}><Segmented value={mode} options={[{value:'ai',label:'人机对弈'},{value:'pvp',label:'双人同屏'}]} onChange={(v:string)=>{setMode(v);setMoves([]);}}/><Button label="重新开始" variant="primary" onClick={()=>setMoves([])}/><Button label="悔棋" disabled={!moves.length} onClick={undo}/><span aria-live="polite">{status} · 第 {moves.length} 手</span></div></Section><Section><div style={{display:'flex',justifyContent:'center'}}><svg viewBox="0 0 640 640" width="100%" role="group" aria-label="十五乘十五五子棋棋盘" style={{display:'block',maxHeight:'76vh',aspectRatio:'1',touchAction:'manipulation',background:t.bg.subtle,borderRadius:12}}><rect x="0" y="0" width="640" height="640" fill={t.bg.subtle}/>{Array.from({length:15},(_:unknown,i:number)=><g key={i}><line x1="40" y1={40+i*40} x2="600" y2={40+i*40} stroke={t.border.strong} strokeWidth="1"/><line x1={40+i*40} y1="40" x2={40+i*40} y2="600" stroke={t.border.strong} strokeWidth="1"/><text x={40+i*40} y="23" textAnchor="middle" fill={t.text.tertiary} fontSize="12" fontFamily={t.font.family}>{String.fromCharCode(65+i)}</text><text x="18" y={44+i*40} textAnchor="middle" fill={t.text.tertiary} fontSize="12" fontFamily={t.font.family}>{15-i}</text></g>)}{[3,7,11].flatMap((r:number)=>[3,7,11].map((c:number)=><circle key={'dot'+r+','+c} cx={40+c*40} cy={40+r*40} r="3" fill={t.text.tertiary}/>))}{moves.map((m:Move,i:number)=><g key={i}><circle cx={40+m.c*40} cy={40+m.r*40} r="16" fill={m.p===1?t.text.primary:t.bg.base} stroke={t.text.primary} strokeWidth="2"/>{winning.some((q:number[])=>q[0]===m.r&&q[1]===m.c)&&<circle cx={40+m.c*40} cy={40+m.r*40} r="19" fill="none" stroke={t.dataviz.categorical[0]} strokeWidth="3"/>}{i===moves.length-1&&<rect x={36+m.c*40} y={36+m.r*40} width="8" height="8" fill={t.dataviz.categorical[0]}/>}</g>)}{Array.from({length:225},(_:unknown,i:number)=>{const r=Math.floor(i/15),c=i%15;return <rect key={'hit'+i} x={21+c*40} y={21+r*40} width="38" height="38" fill="transparent" role="button" tabIndex={!ended&&!thinking&&!b[r][c]?0:-1} aria-label={String.fromCharCode(65+c)+(15-r)+(b[r][c]?' 已有棋子':' 落子')} onClick={()=>play(r,c)} onKeyDown={(e:import('../compat/grok-canvas').KeyboardEvent<SVGRectElement>)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();play(r,c);}}} style={{cursor:!ended&&!thinking&&!b[r][c]?'pointer':'default'}}/>;})}</svg></div></Section><div className="imm-help"><Section heading="对弈说明"><Text>黑方先行。横、竖、斜任意方向连续五子或以上即获胜；自由规则，不设禁手。人机模式你执黑，悔棋退回到你落子之前。切换模式会清空棋盘。</Text><Text>方形标记为最后一手，胜利棋子显示蓝色轮廓。AI 使用局部候选、连子评分与两层攻防预判；所有计算在页面内完成，刷新不保留棋局。深色主题中，实心棋为黑方、空心棋为白方。</Text></Section></div>
      </ImmersiveFrame>
    </Page>;}
