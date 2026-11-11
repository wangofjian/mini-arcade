import {
  Page,
  Section,
  Text,
  Button,
  Segmented,
  useGrokTheme,
  useRef,
  useState,
  useEffect
} from '../compat/grok-canvas';
import { DPad } from '../mobile/DPad';
import { swipeDirection } from '../mobile/swipe';
type Point = {x:number;y:number};
type Phase = 'ready'|'playing'|'paused'|'over'|'won';
type Spark = {x:number;y:number;vx:number;vy:number;life:number};
type Game = {snake:Point[]; dir:Point; queue:Point[]; food:Point|null; score:number; best:number; phase:Phase; wrap:boolean; sparks:Spark[]; clock:number; last:number};
const N=24, CELL=24, SIZE=N*CELL;
function spawn(snake:Point[]):Point|null { const free:Point[]=[]; for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!snake.some((p:Point)=>p.x===x&&p.y===y)) free.push({x,y}); return free.length?free[Math.floor(Math.random()*free.length)]:null; }
function fresh(best=0,wrap=false):Game {const snake=[{x:8,y:12},{x:7,y:12},{x:6,y:12},{x:5,y:12}];return {snake,dir:{x:1,y:0},queue:[],food:spawn(snake),score:0,best,phase:'ready',wrap,sparks:[],clock:0,last:0};}
function interval(score:number):number{return Math.max(62,160-Math.floor(score/30)*10);}
export default function App(){
 const theme=useGrokTheme(); const canvas=useRef<HTMLCanvasElement|null>(null); const swipeAt=useRef<{x:number;y:number}|null>(null); const game=useRef<Game>(fresh()); const [view,setView]=useState({score:0,best:0,phase:'ready' as Phase,wrap:false});
 const sync=()=>{const g=game.current;setView({score:g.score,best:g.best,phase:g.phase,wrap:g.wrap});};
 const start=()=>{const g=game.current;game.current=fresh(g.best,g.wrap);game.current.phase='playing';sync();canvas.current?.focus();};
 const pause=()=>{const g=game.current;if(g.phase==='playing')g.phase='paused';else if(g.phase==='paused'){g.phase='playing';g.clock=0;g.last=0;}sync();canvas.current?.focus();};
 const turn=(x:number,y:number)=>{const g=game.current;if(g.phase!=='playing')return;const last=g.queue.length?g.queue[g.queue.length-1]:g.dir;if(g.queue.length<2 && !(last.x===-x&&last.y===-y) && !(last.x===x&&last.y===y))g.queue.push({x,y});};
 const mode=(value:string)=>{const g=game.current;game.current=fresh(g.best,value==='wrap');sync();};
 useEffect(()=>{
  const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;let frame=0;
  const key=(e:globalThis.KeyboardEvent)=>{const k=e.key.toLowerCase();if(!['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','p','enter','r'].includes(k))return; if(e.target instanceof HTMLButtonElement && (k===' '||k==='enter'))return;e.preventDefault();if(e.repeat && [' ','p','enter','r'].includes(k))return;if(k==='r'){start();return;}if(k==='enter'){if(['ready','over','won'].includes(game.current.phase))start();else pause();return;}if(k===' '||k==='p'){if(game.current.phase==='ready')start();else pause();return;}if(k==='w'||k==='arrowup')turn(0,-1);if(k==='s'||k==='arrowdown')turn(0,1);if(k==='a'||k==='arrowleft')turn(-1,0);if(k==='d'||k==='arrowright')turn(1,0);};
  const blur=()=>{if(game.current.phase==='playing'){game.current.phase='paused';sync();}};
  const hidden=()=>{if(document.hidden)blur();};
  window.addEventListener('keydown',key);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
  const draw=(now:number)=>{const g=game.current;const dt=g.last?Math.min(now-g.last,100):0;g.last=now;
   if(g.phase==='playing'){g.clock+=dt;while(g.clock>=interval(g.score)&&g.phase==='playing'){g.clock-=interval(g.score);if(g.queue.length)g.dir=g.queue.shift()!;let head={x:g.snake[0].x+g.dir.x,y:g.snake[0].y+g.dir.y};if(g.wrap)head={x:(head.x+N)%N,y:(head.y+N)%N};const eat=g.food!==null&&head.x===g.food.x&&head.y===g.food.y;const body=eat?g.snake:g.snake.slice(0,-1);if(head.x<0||head.y<0||head.x>=N||head.y>=N||body.some((p:Point)=>p.x===head.x&&p.y===head.y)){g.phase='over';sync();break;}g.snake.unshift(head);if(eat){g.score+=10;g.best=Math.max(g.score,g.best);for(let j=0;j<16;j++){const a=Math.random()*Math.PI*2;g.sparks.push({x:(head.x+.5)*CELL,y:(head.y+.5)*CELL,vx:Math.cos(a)*100,vy:Math.sin(a)*100,life:1});}g.food=spawn(g.snake);if(!g.food)g.phase='won';sync();}else g.snake.pop();}}
   ctx.fillStyle='#091719';ctx.fillRect(0,0,SIZE,SIZE);ctx.strokeStyle='#13292c';ctx.lineWidth=1;ctx.beginPath();for(let i=1;i<N;i++){ctx.moveTo(i*CELL+.5,0);ctx.lineTo(i*CELL+.5,SIZE);ctx.moveTo(0,i*CELL+.5);ctx.lineTo(SIZE,i*CELL+.5);}ctx.stroke();
   if(g.food){const x=(g.food.x+.5)*CELL,y=(g.food.y+.5)*CELL;const pulse=1+Math.sin(now/180)*.1;ctx.fillStyle='#ffb86622';ctx.beginPath();ctx.arc(x,y,14*pulse,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffb866';ctx.beginPath();ctx.arc(x,y,7*pulse,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff1d9';ctx.beginPath();ctx.arc(x-2,y-2,2,0,Math.PI*2);ctx.fill();}
   g.snake.forEach((p:Point,i:number)=>{ctx.fillStyle=i===0?'#c0ffe0':`hsl(${155+i*.25},${Math.max(40,70-i*.3)}%,${Math.max(32,60-i*.45)}%)`;ctx.beginPath();ctx.roundRect(p.x*CELL+2,p.y*CELL+2,CELL-4,CELL-4,i===0?7:5);ctx.fill();});
   const h=g.snake[0];ctx.fillStyle='#10392c';const dx=g.dir.x,dy=g.dir.y;for(const side of [-1,1]){ctx.beginPath();ctx.arc((h.x+.5)*CELL+dx*5-dy*side*4,(h.y+.5)*CELL+dy*5+dx*side*4,2,0,Math.PI*2);ctx.fill();}
   if(g.phase==='playing')g.sparks=g.sparks.filter((p:Spark)=>{p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.life-=dt/550;return p.life>0;});g.sparks.forEach((p:Spark)=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle='#ffce86';ctx.fillRect(p.x-2,p.y-2,4,4);});ctx.globalAlpha=1;
   frame=requestAnimationFrame(draw);
  };frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',key);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
 },[]);
 const overlay=view.phase!=='playing';
 return <Page title="贪吃蛇" summary="一口一格，越吃越快。经典街机，也可以穿墙。" width="wide" lang="zh-Hans">
 <Section>
 <div style={{display:'flex',flexWrap:'wrap',gap:20,alignItems:'center',justifyContent:'space-between',marginBottom:20,color:theme.text.primary}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:24}}>{[{label:'得分',value:view.score},{label:'本页最高',value:view.best},{label:'速度 · 格/秒',value:(1000/interval(view.score)).toFixed(1)}].map((v:{label:string;value:number|string})=><div key={v.label}><div style={{fontSize:12,color:theme.text.secondary}}>{v.label}</div><div style={{fontSize:28,fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{v.value}</div></div>)}</div>
 <Segmented options={[{value:'wall',label:'经典围墙'},{value:'wrap',label:'穿墙模式'}]} value={view.wrap?'wrap':'wall'} onChange={mode}/>
 </div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))',gap:28,alignItems:'start'}}>
 <div style={{position:'relative',lineHeight:0}}>
 <canvas ref={canvas} width={SIZE} height={SIZE} tabIndex={0} aria-label="贪吃蛇游戏场地，用方向键、WASD、滑动或下方方向键控制" onPointerDown={(e)=>{swipeAt.current={x:e.clientX,y:e.clientY};try{e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);}catch{/* ignore */}}} onPointerUp={(e)=>{const o=swipeAt.current;swipeAt.current=null;if(!o)return;const d=swipeDirection(e.clientX-o.x,e.clientY-o.y);if(d==='left')turn(-1,0);if(d==='right')turn(1,0);if(d==='up')turn(0,-1);if(d==='down')turn(0,1);}} onPointerCancel={()=>{swipeAt.current=null;}} style={{display:'block',width:'100%',height:'auto',aspectRatio:'1',borderRadius:16,border:`1px solid ${theme.border.default}`,touchAction:'none'}}/>
 {overlay&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,lineHeight:1.5,background:theme.bg.base+'ed',borderRadius:16,color:theme.text.primary,padding:20,textAlign:'center'}}>
 <div style={{fontSize:28,fontWeight:600}}>{view.phase==='ready'?'准备开吃':view.phase==='paused'?'休息一下':view.phase==='won'?'占领全场！':'本局结束'}</div>
 <div style={{color:theme.text.secondary,fontSize:14}}>{view.phase==='ready'?'橙色食物 +10 分，别撞到自己。':view.phase==='paused'?'方向已保留，继续你的路线。':`拿下 ${view.score} 分，再挑战一次？`}</div>
 <Button label={view.phase==='paused'?'继续游戏':view.phase==='ready'?'开始游戏':'再来一局'} variant="primary" onClick={view.phase==='paused'?pause:start}/>
 </div>}
 </div>
 <div style={{color:theme.text.primary}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:24}}><Button label={view.phase==='playing'?'暂停':view.phase==='paused'?'继续':'开始'} variant="primary" onClick={view.phase==='playing'||view.phase==='paused'?pause:start}/><Button label="重新开始" onClick={start}/></div>
 <div style={{fontSize:14,color:theme.text.secondary,marginBottom:16}}>触屏：在棋盘上滑动，或点按方向键</div>
 <div style={{marginBottom:24}}><DPad mode="tap" onDir={(dir)=>{if(dir==='left')turn(-1,0);if(dir==='right')turn(1,0);if(dir==='up')turn(0,-1);if(dir==='down')turn(0,1);}} /></div>
 <div style={{fontSize:14,lineHeight:1.9,color:theme.text.secondary}}>方向键 / WASD 转向<br/>空格 / P 暂停与继续<br/>Enter 开始 · R 重开<br/>离开窗口会自动暂停</div>
 <div style={{marginTop:20,fontSize:12,lineHeight:1.7,color:theme.text.tertiary}}>每吃 3 颗提速一次。切换模式会开始新的待机局；最高分只在当前页面会话保留。</div>
 </div>
 </div>
 </Section>
 <Section heading="玩法"><Text>吃橙色食物长大，每颗 10 分。经典模式碰墙结束；穿墙模式从对侧出现。两种模式撞到自己都会结束，不能直接掉头。填满棋盘即可通关。</Text></Section>
 </Page>;
}
