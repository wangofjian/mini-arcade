import {
  Page,
  useState,
  useRef,
  useEffect,
  useGrokTheme,
  Button,
  type PointerEvent
} from '../compat/grok-canvas';
type Tile = { id: number; value: number; r: number; c: number; fresh?: boolean; merged?: boolean };
type Game = { tiles: Tile[]; score: number; moves: number; continued: boolean };
type Dir = 'up' | 'down' | 'left' | 'right';
let serial = 0;
function spawn(tiles: Tile[]): Tile[] {
 const free: number[] = []; for(let p=0;p<16;p++) if(!tiles.some((t:Tile)=>t.r*4+t.c===p)) free.push(p);
 if(!free.length) return tiles;
 const p=free[Math.floor(Math.random()*free.length)];
 return [...tiles,{id:++serial,value:Math.random()<0.9?2:4,r:Math.floor(p/4),c:p%4,fresh:true}];
}
function start():Game { return {tiles:spawn(spawn([])),score:0,moves:0,continued:false}; }
function possible(tiles:Tile[]):boolean {
 if(tiles.length<16)return true;
 return tiles.some((a:Tile)=>tiles.some((b:Tile)=>a.value===b.value && Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1));
}
function slide(tiles:Tile[],dir:Dir) {
 const final:Tile[]=[]; const moving:Tile[]=[]; let gain=0;
 for(let lane=0;lane<4;lane++) {
 const cells = [0,1,2,3].map((i:number)=>dir==='left'?{r:lane,c:i}:dir==='right'?{r:lane,c:3-i}:dir==='up'?{r:i,c:lane}:{r:3-i,c:lane});
 const line:Tile[]=[]; cells.forEach((p:{r:number;c:number})=>{const t=tiles.find((x:Tile)=>x.r===p.r&&x.c===p.c);if(t)line.push(t);});
 let dest=0;
 for(let i=0;i<line.length;i++) {
 const a=line[i];const p=cells[dest++];
 moving.push({...a,...p,fresh:false,merged:false});
 if(i+1<line.length&&line[i+1].value===a.value) {
 const b=line[++i];moving.push({...b,...p,fresh:false,merged:false});
 gain+=a.value*2;final.push({id:++serial,value:a.value*2,...p,merged:true});
 } else final.push({...a,...p,fresh:false,merged:false});
 }
 }
 const changed=moving.some((t:Tile)=>{const old=tiles.find((o:Tile)=>o.id===t.id);return old?.r!==t.r||old?.c!==t.c;});
 return {final,moving,gain,changed};
}
const colors:Record<number,string>={2:'#ece5d9',4:'#e5d4b4',8:'#f3b477',16:'#ee9462',32:'#ec765c',64:'#dc5747',128:'#d9b74c',256:'#cfa035',512:'#b88a27',1024:'#a6751c',2048:'#896119'};
export default function App(){
 const theme=useGrokTheme();
 const [game,setGame]=useState<Game>(()=>start());
 const [visual,setVisual]=useState<Tile[]|null>(null);
 const [best,setBest]=useState(0);const [undo,setUndo]=useState<Game|null>(null);
 const [gain,setGain]=useState(0);const [busy,setBusy]=useState(false);
 const current=useRef(game);current.current=game;
 const lock=useRef(false);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const origin=useRef<{x:number;y:number}|null>(null);
 const action=useRef<(dir:Dir)=>void>(()=>{});
 const won=game.tiles.some((t:Tile)=>t.value>=2048)&&!game.continued;
 const over=!possible(game.tiles);
 const reset=()=>{if(timer.current)clearTimeout(timer.current);lock.current=false;setBusy(false);setVisual(null);setUndo(null);setGain(0);const g=start();current.current=g;setGame(g);};
 action.current=(dir:Dir)=>{
 const g=current.current;
 if(lock.current||(!g.continued&&g.tiles.some((t:Tile)=>t.value>=2048))||!possible(g.tiles))return;
 const next=slide(g.tiles,dir);if(!next.changed)return;
 lock.current=true;setBusy(true);setUndo(g);setGain(0);setVisual(next.moving);
 timer.current=setTimeout(()=>{
 const updated={tiles:spawn(next.final),score:g.score+next.gain,moves:g.moves+1,continued:g.continued};
 current.current=updated;setGame(updated);setBest((b:number)=>Math.max(b,updated.score));setGain(next.gain);setVisual(null);setBusy(false);lock.current=false;
 },145);
 };
 useEffect(()=>{
 const key=(e:globalThis.KeyboardEvent)=>{
 if(e.altKey||e.ctrlKey||e.metaKey)return;
 const target=e.target as HTMLElement|null;if(target?.tagName==='INPUT'||target?.tagName==='TEXTAREA')return;
 const dirs:Record<string,Dir>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
 const dir=dirs[e.key]||dirs[e.key.toLowerCase()];if(dir){e.preventDefault();action.current(dir);}
 };
 window.addEventListener('keydown',key,{passive:false});return()=>{window.removeEventListener('keydown',key);if(timer.current)clearTimeout(timer.current);};
 },[]);
 const rewind=()=>{if(!undo||busy)return;current.current=undo;setGame(undo);setUndo(null);setGain(0);setVisual(null);};
 const swipeStart=(e:PointerEvent<HTMLDivElement>)=>{origin.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);};
 const swipeEnd=(e:PointerEvent<HTMLDivElement>)=>{const p=origin.current;origin.current=null;if(!p)return;const x=e.clientX-p.x,y=e.clientY-p.y;if(Math.max(Math.abs(x),Math.abs(y))<22)return;action.current(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'down':'up');};
 const tiles=visual||game.tiles;
 return <Page title="2048" summary="滑动、合并，再来一步。把相同数字拼成 2048。" width="wide" lang="zh-Hans">
 <style>{`@keyframes tileAppear{0%{transform:scale(.65);opacity:.25}100%{transform:scale(1);opacity:1}}@keyframes tileMerge{0%{transform:scale(.9)}55%{transform:scale(1.13)}100%{transform:scale(1)}}@keyframes gainFloat{0%{opacity:1;transform:translateY(3px)}100%{opacity:0;transform:translateY(-20px)}}.tile2048{transition:left 140ms cubic-bezier(.2,.7,.2,1),top 140ms cubic-bezier(.2,.7,.2,1)}.control2048:active{transform:scale(.94)}@media(prefers-reduced-motion:reduce){.tile2048{transition:none}.face2048{animation:none!important}}`}</style>
 <div style={{display:'flex',flexWrap:'wrap',gap:36,alignItems:'flex-start',fontFamily:theme.font.family,color:theme.text.primary}}>
 <div style={{flex:'1 1 320px',maxWidth:520,minWidth:0}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:24,alignItems:'center',marginBottom:18}}>
 <div><div style={{fontSize:12,color:theme.text.secondary,letterSpacing:1}}>得分</div><div style={{fontSize:32,fontWeight:600,fontVariantNumeric:'tabular-nums',position:'relative'}} aria-live="polite">{game.score.toLocaleString()}{gain>0&&<span key={game.moves} style={{position:'absolute',left:'100%',top:0,fontSize:17,animation:'gainFloat 950ms ease-out forwards',paddingLeft:8}}>+{gain}</span>}</div></div>
 <div><div style={{fontSize:12,color:theme.text.secondary,letterSpacing:1}}>本次最佳</div><div style={{fontSize:32,fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{best.toLocaleString()}</div></div>
 <div style={{marginLeft:'auto',fontSize:13,color:theme.text.tertiary}}>{game.moves} 步</div>
 </div>
 <div onPointerDown={swipeStart} onPointerUp={swipeEnd} onPointerCancel={()=>{origin.current=null;}} onLostPointerCapture={()=>{origin.current=null;}} aria-label="2048 游戏棋盘，可在棋盘上滑动" style={{touchAction:'none',position:'relative',width:'100%',aspectRatio:'1',background:theme.bg.subtle,border:`1px solid ${theme.border.default}`,borderRadius:18,padding:6,boxSizing:'border-box',userSelect:'none'}}>
 <div style={{position:'relative',width:'100%',height:'100%'}}>
 {Array.from({length:16},(_:unknown,i:number)=><div key={i} style={{position:'absolute',left:`${i%4*25}%`,top:`${Math.floor(i/4)*25}%`,width:'25%',height:'25%',padding:5,boxSizing:'border-box'}}><div style={{width:'100%',height:'100%',background:theme.fill.secondary,borderRadius:10}}/></div>)}
 {tiles.map((t:Tile)=><div className="tile2048" key={t.id} style={{position:'absolute',left:`${t.c*25}%`,top:`${t.r*25}%`,width:'25%',height:'25%',padding:5,boxSizing:'border-box',zIndex:t.merged?2:1}}><div className="face2048" style={{width:'100%',height:'100%',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',background:colors[t.value]||'#334b56',color:t.value<=4?'#514b41':'#fffaf0',fontSize:t.value>=1024?'clamp(19px,4vw,30px)':'clamp(26px,5vw,42px)',fontWeight:600,fontVariantNumeric:'tabular-nums',animation:t.merged?'tileMerge 220ms ease-out':t.fresh?'tileAppear 180ms ease-out':undefined}}>{t.value}</div></div>)}
 </div>
 {(won||over)&&!busy&&<div style={{position:'absolute',inset:0,background:theme.bg.elevated+'ed',borderRadius:18,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:24,textAlign:'center',zIndex:5}}><div style={{fontSize:32,fontWeight:600}}>{won?'2048，达成！':'暂无可移动方块'}</div><div style={{color:theme.text.secondary}}>{won?'漂亮！你可以继续挑战更大的数字。':`本局 ${game.score.toLocaleString()} 分 · ${game.moves} 步`}</div><div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:10}}>{won&&<Button label="继续挑战" variant="primary" onClick={()=>{const g={...current.current,continued:true};current.current=g;setGame(g);}}/>}<Button label="再来一局" onClick={reset}/>{over&&undo&&<Button label="撤销一步" onClick={rewind}/>}</div></div>}
 </div>
 <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:18}}><Button label="新游戏" variant="primary" onClick={reset}/><Button label="撤销一步" onClick={rewind} disabled={!undo||busy}/></div>
 </div>
 <div style={{flex:'1 1 200px',maxWidth:310,paddingTop:8}}>
 <div style={{fontSize:20,fontWeight:600,marginBottom:12}}>每一步，都有可能。</div>
 <p style={{fontSize:15,lineHeight:1.8,color:theme.text.secondary,margin:'0 0 24px'}}>使用方向键或 W A S D 移动。手机上可直接滑动棋盘，也可点击下面的方向按钮。</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0,1fr))',gap:8,maxWidth:220,marginBottom:28}}>
 {['','↑','','←','↓','→'].map((label:string,i:number)=>label?<button key={i} className="control2048" aria-label={{'↑':'向上','↓':'向下','←':'向左','→':'向右'}[label]} onClick={()=>action.current(({'↑':'up','↓':'down','←':'left','→':'right'} as Record<string,Dir>)[label])} style={{fontFamily:theme.font.family,fontSize:26,minHeight:54,border:`1px solid ${theme.border.default}`,borderRadius:10,background:theme.bg.elevated,color:theme.text.primary,cursor:'pointer',touchAction:'manipulation'}}>{label}</button>:<div key={i}/>)}
 </div>
 <div style={{borderTop:`1px solid ${theme.border.default}`,paddingTop:20,fontSize:14,lineHeight:1.9,color:theme.text.secondary}}>相同数字碰撞时合并，每个方块每步最多合并一次。有效移动后随机出现一个 2 或 4。合成 2048 即获胜；棋盘填满且无法合并时结束。</div>
 <p style={{fontSize:13,lineHeight:1.8,color:theme.text.tertiary}}>小提示：把最大的数字留在角落，尽量维持从大到小的排列。最佳分数仅保留在本次页面会话。</p>
 </div>
 </div>
 </Page>;
}
