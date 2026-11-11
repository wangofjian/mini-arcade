import {
  Page,
  Text,
  Button,
  Select,
  useGrokTheme,
  useRef,
  useState,
  useEffect,
  type PointerEvent
} from '../compat/grok-canvas';
import { HandheldPad } from '../mobile/HandheldPad';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { useStageFit } from '../mobile/useStageFit';
const W=960,H=540,PH=96,R=9;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
function initial(){return {y:[270,270],vel:[0,0],x:480,b:270,vx:360,vy:120,score:[0,0],wait:0.9,paused:true,started:false,win:-1,hits:0,trail:[] as {x:number,y:number}[]};}
export default function App(){
const t=useGrokTheme(),cv=useRef<HTMLCanvasElement|null>(null),stageRef=useRef<HTMLDivElement|null>(null),g=useRef(initial()),keys=useRef<Record<string,boolean>>({}),touch=useRef<Record<number,{side:number,y:number}>>({});
const [mode,setMode]=useState('ai'),[level,setLevel]=useState('medium'),[goal,setGoal]=useState('7'),[status,setStatus]=useState('准备开球'),[score,setScore]=useState([0,0]),[paused,setPaused]=useState(true);
 const {active:immersive}=useImmersivePlay();
 const fit=useStageFit(stageRef,W,H,immersive,true);
 const holdCode=(code:string,on:boolean)=>{keys.current[code]=on;};
const settings=useRef({mode,level,goal}); settings.current={mode,level,goal};
const pause=()=>{const s=g.current;if(s.win>=0)return;s.started=true;s.paused=!s.paused;setPaused(s.paused);setStatus(s.paused?'已暂停':'比赛中');};
const reset=()=>{g.current=initial();touch.current={};keys.current={};setScore([0,0]);setPaused(true);setStatus('准备开球');};
useEffect(()=>{reset();},[mode,level,goal]);
useEffect(()=>{
const down=(e:globalThis.KeyboardEvent)=>{if(['KeyW','KeyS','ArrowUp','ArrowDown','Space'].includes(e.code)){e.preventDefault();keys.current[e.code]=true;if(e.code==='Space'&&!e.repeat)pause();}};
const up=(e:globalThis.KeyboardEvent)=>{keys.current[e.code]=false;};
const blur=()=>{keys.current={};touch.current={};if(!g.current.paused&&g.current.win<0){g.current.paused=true;setPaused(true);setStatus('已暂停');}};
window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
let id=0,last=0;
const frame=(now:number)=>{const dt=Math.min((now-last)/1000||0,0.035);last=now;const s=g.current,cfg=settings.current;const canvas=cv.current,ctx=canvas?.getContext('2d');
if(!s.paused&&s.win<0){
const before=[...s.y];
let left=(keys.current.KeyS?1:0)-(keys.current.KeyW?1:0);if(cfg.mode==='ai')left+=(keys.current.ArrowDown?1:0)-(keys.current.ArrowUp?1:0);
s.y[0]+=clamp(left,-1,1)*440*dt;
if(cfg.mode==='two')s.y[1]+=((keys.current.ArrowDown?1:0)-(keys.current.ArrowUp?1:0))*440*dt;
else {const speed=cfg.level==='easy'?205:cfg.level==='hard'?420:295;let target=s.vx>0?s.b:270;if(cfg.level==='hard'&&s.vx>0){let projected=s.b+(912-s.x)/s.vx*s.vy;const period=2*(H-2*R);projected=((projected-R)%period+period)%period;target=R+(projected>H-2*R?period-projected:projected);}target+=Math.sin(now/700)*(cfg.level==='easy'?48:cfg.level==='medium'?22:8);const d=target-s.y[1];s.y[1]+=clamp(d,-speed*dt,speed*dt);}
Object.values(touch.current).forEach((p:{side:number,y:number})=>{if(p.side===0||cfg.mode==='two')s.y[p.side]=p.y;});
for(let j=0;j<2;j++){s.y[j]=clamp(s.y[j],PH/2+8,H-PH/2-8);s.vel[j]=dt?clamp((s.y[j]-before[j])/dt,-700,700):0;}
if(s.wait>0){s.wait-=dt;}else{
const steps=Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy)*dt/7));for(let step=0;step<steps;step++){
const oldx=s.x;s.x+=s.vx*dt/steps;s.b+=s.vy*dt/steps;
if(s.b<R){s.b=2*R-s.b;s.vy=Math.abs(s.vy);}if(s.b>H-R){s.b=2*(H-R)-s.b;s.vy=-Math.abs(s.vy);}
let side=-1;if(s.vx<0&&oldx>=48+R&&s.x<=48+R&&Math.abs(s.b-s.y[0])<PH/2+R)side=0;
if(s.vx>0&&oldx<=W-48-R&&s.x>=W-48-R&&Math.abs(s.b-s.y[1])<PH/2+R)side=1;
if(side>=0){const angle=clamp((s.b-s.y[side])/(PH/2),-1,1)*1.02;const speed=Math.min(760,Math.hypot(s.vx,s.vy)*1.055);s.vy=clamp(Math.sin(angle)*speed+s.vel[side]*0.23,-speed*0.88,speed*0.88);s.vx=(side===0?1:-1)*Math.sqrt(speed*speed-s.vy*s.vy);s.x=side===0?48+R:W-48-R;s.hits++;}
if(s.x< -R||s.x>W+R){const who=s.x<0?1:0;s.score[who]++;setScore([...s.score]);if(s.score[who]>=Number(cfg.goal)){s.win=who;s.paused=true;setPaused(true);setStatus(who===0?'玩家一获胜':cfg.mode==='ai'?'AI 获胜':'玩家二获胜');}s.x=W/2;s.b=H/2;s.vx=(who===0?-1:1)*360;s.vy=(Math.random()*2-1)*170;s.wait=1;s.hits=0;s.trail=[];break;}
}
s.trail.push({x:s.x,y:s.b});if(s.trail.length>12)s.trail.shift();}}
if(ctx){ctx.fillStyle='#08151e';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#203843';ctx.lineWidth=2;ctx.strokeRect(12,12,W-24,H-24);ctx.setLineDash([8,14]);ctx.beginPath();ctx.moveTo(W/2,20);ctx.lineTo(W/2,H-20);ctx.stroke();ctx.setLineDash([]);
ctx.font='bold 70px '+t.font.mono;ctx.textAlign='center';ctx.fillStyle='#25434e';ctx.fillText(String(s.score[0]),W/2-105,105);ctx.fillText(String(s.score[1]),W/2+105,105);
s.trail.forEach((p:{x:number,y:number},i:number)=>{ctx.globalAlpha=i/35;ctx.fillStyle='#effaff';ctx.beginPath();ctx.arc(p.x,p.y,R*(i+1)/12,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
ctx.fillStyle='#70e1d5';ctx.fillRect(34,s.y[0]-PH/2,14,PH);ctx.fillStyle='#f2c75c';ctx.fillRect(W-48,s.y[1]-PH/2,14,PH);ctx.fillStyle='#f4fbff';ctx.beginPath();ctx.arc(s.x,s.b,R,0,Math.PI*2);ctx.fill();
if(s.paused||s.wait>0){ctx.fillStyle='#08151ec9';ctx.fillRect(240,210,480,120);ctx.fillStyle='#f4fbff';ctx.font='24px '+t.font.family;ctx.fillText(s.win>=0?(s.win===0?'玩家一获胜！':cfg.mode==='ai'?'AI 获胜！':'玩家二获胜！'):s.paused?(s.started?'已暂停 · 点击继续':'准备好了吗？'):'准备发球',W/2,260);ctx.font='16px '+t.font.family;ctx.fillText(s.win>=0?'点击「重新开始」再来一局':s.paused?'空格或下方按钮开始 / 暂停':'保持球拍移动，打出旋转回球',W/2,296);}}
id=requestAnimationFrame(frame);};id=requestAnimationFrame(frame);
return()=>{cancelAnimationFrame(id);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
},[t]);
const point=(e:PointerEvent<HTMLCanvasElement>,start:boolean)=>{e.preventDefault();const c=e.currentTarget,r=c.getBoundingClientRect(),id=e.nativeEvent.pointerId;const old=touch.current[id];if(!start&&!old)return;if(start)c.setPointerCapture(id);touch.current[id]={side:old?.side??(settings.current.mode==='ai'?0:((e.clientX-r.left)/r.width<0.5?0:1)),y:(e.clientY-r.top)/r.height*H};};
const release=(e:PointerEvent<HTMLCanvasElement>)=>{delete touch.current[e.nativeEvent.pointerId];};
return <Page title="乒乓" width="wide" lang="zh-Hans" summary="一来一回，先到目标分获胜。单人挑战 AI，或与朋友同屏对战。">
<ImmersiveFrame
 layout="overlay"
 stageRef={stageRef}
 intro={<Text>手机可点「全屏游玩」：球场铺满屏幕，半透明十字键上下移动玩家一；双人时右侧圆形键控制玩家二。也可在画面上拖动球拍。电脑仍可用键盘。</Text>}
 hudStats={<><span>玩家一 {score[0]} : {score[1]} {mode==='ai'?'AI':'玩家二'}</span><span>{status}</span></>}
 hudActions={<><Button label={paused?'开始 / 继续':'暂停'} variant="primary" onClick={pause} disabled={g.current.win>=0}/><Button label="重开" onClick={reset}/></>}
 pageActions={<>
  <Select label="模式" value={mode} onChange={setMode} options={[{value:'ai',label:'单人 vs AI'},{value:'two',label:'双人同屏'}]}/>
  <Select label="AI 难度" value={level} onChange={setLevel} disabled={mode==='two'} options={[{value:'easy',label:'轻松'},{value:'medium',label:'标准'},{value:'hard',label:'挑战'}]}/>
  <Select label="获胜分数" value={goal} onChange={setGoal} options={[{value:'7',label:'7 分'},{value:'11',label:'11 分'}]}/>
 </>}
 side={<>
  <div className="imm-default-only" style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8,color:t.text.secondary,marginBottom:8}}><span>玩家一 {score[0]} : {score[1]} {mode==='ai'?'AI':'玩家二'}</span><span aria-live="polite">{status}</span></div>
  <div style={{display:'flex',flexWrap:'wrap',gap:10}}><Button label={paused?'开始 / 继续':'暂停'} variant="primary" onClick={pause} disabled={g.current.win>=0}/><Button label="重新开始" onClick={reset}/></div>
 </>}
 pad={<HandheldPad
  dirs={{
    up:{mode:'hold',onDown:()=>holdCode('KeyW',true),onUp:()=>holdCode('KeyW',false),ariaLabel:'玩家一上移'},
    down:{mode:'hold',onDown:()=>holdCode('KeyS',true),onUp:()=>holdCode('KeyS',false),ariaLabel:'玩家一下移'},
  }}
  actions={mode==='two'?[{label:'↑',ariaLabel:'玩家二上移',onDown:()=>holdCode('ArrowUp',true),onUp:()=>holdCode('ArrowUp',false)},{label:'↓',ariaLabel:'玩家二下移',onDown:()=>holdCode('ArrowDown',true),onUp:()=>holdCode('ArrowDown',false)}]:undefined}
 />}
 help={<Text>全屏十字键上下移动玩家一（对应 W / S）；双人时右侧圆形键控制玩家二（↑ / ↓）。也可拖动球拍，双人时各拖自己半场。玩家一：W / S；单人模式也可用 ↑ / ↓。空格暂停，Esc 退出全屏。球拍移动和击球位置影响回球角度；切换设置会重开比赛。</Text>}
>
<canvas ref={cv} width={W} height={H} aria-label="乒乓球场：左侧玩家一，右侧 AI 或玩家二" onPointerDown={(e:PointerEvent<HTMLCanvasElement>)=>point(e,true)} onPointerMove={(e:PointerEvent<HTMLCanvasElement>)=>point(e,false)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} style={immersive?{width:fit.width,height:fit.height,maxWidth:'none',display:'block',touchAction:'none',borderRadius:12}:{width:'100%',height:'auto',display:'block',touchAction:'none',borderRadius:12}}/>
</ImmersiveFrame>
</Page>;
}
