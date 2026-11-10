import {
  Page,
  Section,
  Text,
  Button,
  Segmented,
  Toggle,
  useState,
  useEffect,
  useGrokTheme
} from '../compat/grok-canvas';
function solved(a:number[]){return a.every((v:number,i:number)=>v===(i+1)%a.length);}
function shuffle(n:number){const a=Array.from({length:n*n},(_:unknown,i:number)=>(i+1)%(n*n));let z=a.length-1, prev=-1;for(let k=0;k<n*n*35;k++){const choices=[z-n,z+n,z%n?z-1:-1,z%n<n-1?z+1:-1].filter((i:number)=>i>=0&&i<a.length&&i!==prev);const j=choices[Math.floor(Math.random()*choices.length)];a[z]=a[j];a[j]=0;prev=z;z=j;}if(solved(a)){const j=z%n?z-1:z+1;a[z]=a[j];a[j]=0;}return a;}
export default function App(){
 const t=useGrokTheme();const [n,setN]=useState(4);const [tiles,setTiles]=useState<number[]>(()=>shuffle(4));const [moves,setMoves]=useState(0);const [start,setStart]=useState<number|null>(null);const [elapsed,setElapsed]=useState(0);const [won,setWon]=useState(false);const [numbers,setNumbers]=useState(true);const [pattern,setPattern]=useState(false);const [history,setHistory]=useState<number[][]>([]);
 useEffect(()=>{if(start===null||won)return;const id=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),200);return()=>clearInterval(id);},[start,won]);
 function reset(size:number){setN(size);setTiles(shuffle(size));setMoves(0);setStart(null);setElapsed(0);setWon(false);setHistory([]);}
 function slide(i:number){if(won)return;const z=tiles.indexOf(0);if(Math.abs(Math.floor(i/n)-Math.floor(z/n))+Math.abs(i%n-z%n)!==1)return;const a=[...tiles];a[z]=a[i];a[i]=0;setHistory([...history,tiles]);setTiles(a);setMoves(moves+1);if(start===null)setStart(Date.now());if(solved(a)){setWon(true);if(start!==null)setElapsed(Math.floor((Date.now()-start)/1000));}}
 const correct=tiles.filter((v:number,i:number)=>v!==0&&v===i+1).length;
 const clock=`${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`;
 return <Page title="滑动拼图" summary="点一下空格旁的方块，把数字按从左到右、从上到下排好，空格留在右下角。" width="wide" lang="zh-Hans">
 <Section><div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',color:t.text.primary,fontFamily:t.font.family}}><Segmented value={String(n)} options={[{value:'3',label:'3 × 3'},{value:'4',label:'4 × 4'},{value:'5',label:'5 × 5'}]} onChange={(v:string)=>reset(Number(v))}/><Button label="新游戏" variant="primary" onClick={()=>reset(n)}/><Button label="撤销" disabled={!history.length||won} onClick={()=>{setTiles(history[history.length-1]);setHistory(history.slice(0,-1));setMoves(Math.max(0,moves-1));}}/><Toggle label="彩色图案" value={pattern} onChange={(v:boolean)=>{setPattern(v);if(!v)setNumbers(true);}}/><Toggle label="显示数字" value={numbers} disabled={!pattern} onChange={setNumbers}/></div></Section>
 <Section><div style={{display:'flex',flexWrap:'wrap',gap:24,color:t.text.primary,fontFamily:t.font.mono,marginBottom:20}}><span>步数 {moves}</span><span>用时 {clock}</span><span>归位 {correct}/{n*n-1}</span></div>
 <div role="group" aria-label={`${n}乘${n}滑动拼图`} style={{display:'grid',gridTemplateColumns:`repeat(${n},minmax(0,1fr))`,gap:6,aspectRatio:'1',background:t.bg.subtle,padding:6,border:`1px solid ${t.border.default}`,borderRadius:12}}>
 {tiles.map((v:number,i:number)=>{const z=tiles.indexOf(0);const active=Math.abs(Math.floor(i/n)-Math.floor(z/n))+Math.abs(i%n-z%n)===1;const row=Math.floor((v-1)/n),col=(v-1)%n;return v===0?<div key="blank" aria-label="空格" style={{border:`1px dashed ${t.border.weak}`,borderRadius:8}}/>:<button key={v} aria-label={`移动方块 ${v}`} disabled={!active||won} onClick={()=>slide(i)} style={{position:'relative',overflow:'hidden',minWidth:0,border:`${active?2:1}px solid ${active?t.border.focus:t.border.default}`,borderRadius:8,background:t.bg.elevated,color:t.text.primary,cursor:active&&!won?'pointer':'default',fontFamily:t.font.family,fontSize:`clamp(16px,4vw,38px)`,fontWeight:600,touchAction:'manipulation',padding:0}}>
 {pattern&&<svg viewBox="0 0 100 100" width="100%" height="100%" style={{position:'absolute',inset:0}} aria-hidden="true"><rect width="100" height="100" fill={t.dataviz.categorical[row%3]} opacity={0.16+0.09*col}/><path d={`M 0 ${20+row*12} L 100 ${20+row*12} M ${20+col*12} 0 L ${20+col*12} 100`} stroke={t.dataviz.categorical[row%3]} strokeWidth="8"/><circle cx={20+col*12} cy={20+row*12} r="12" fill={t.dataviz.categorical[(row+col)%3]}/></svg>}
 {numbers&&<span style={{position:'relative',background:pattern?t.bg.base:undefined,borderRadius:4,padding:'2px 7px'}}>{v}</span>}</button>;})}</div>
 <div aria-live="polite" style={{marginTop:16,color:won?t.text.success:t.text.secondary,fontFamily:t.font.family}}>{won?`完成！你用了 ${moves} 步，耗时 ${clock}。点“新游戏”再来一局。`:start===null?'点击相邻方块开始；计时从第一步启动。':'高亮边框的方块可以移动。'}</div></Section>
 <Section heading="玩法"><Text>所有局面都从完成状态通过合法移动打乱，保证可解。图案模式按线条与圆点的位置拼回整齐网格；可关闭数字增加挑战。切换尺寸会开始新的一局，页面关闭后不保留进度。</Text></Section>
 </Page>;
}
