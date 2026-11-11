import {
  Page,
  useEffect,
  useRef,
  useState,
  useGrokTheme,
  Button
} from '../compat/grok-canvas';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { useStageFit } from '../mobile/useStageFit';
type Pipe = { x:number; y:number; counted:boolean };
type Mode = 'ready'|'play'|'over'|'paused';
export default function App(){
 const theme=useGrokTheme();
 const canvas=useRef<HTMLCanvasElement|null>(null);
 const stageRef=useRef<HTMLDivElement|null>(null);
 const {active:immersive}=useImmersivePlay();
 const fit=useStageFit(stageRef,440,600,immersive,true);
 const game=useRef({y:260,v:0,pipes:[] as Pipe[],score:0,best:0,mode:'ready' as Mode,time:0,spawn:0,deadAt:0});
 const [hud,setHud]=useState({score:0,best:0,mode:'ready' as Mode});
 const sync=()=>{const g=game.current;setHud({score:g.score,best:g.best,mode:g.mode});};
 const reset=()=>{const g=game.current;g.y=260;g.v=0;g.pipes=[];g.score=0;g.spawn=0;g.mode='ready';sync();};
 const flap=()=>{const g=game.current;if(g.mode==='paused')return;if(g.mode==='over'){if(performance.now()-g.deadAt<450)return;reset();}if(g.mode==='ready'){g.mode='play';g.spawn=0.7;sync();}g.v=-335;};
 const pause=()=>{const g=game.current;if(g.mode==='play')g.mode='paused';else if(g.mode==='paused')g.mode='play';sync();};
 useEffect(()=>{
  const c=canvas.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;
  let raf=0,last=0;
  const die=()=>{const g=game.current;g.mode='over';g.deadAt=performance.now();g.best=Math.max(g.best,g.score);sync();};
  const key=(e:globalThis.KeyboardEvent)=>{if((e.target as HTMLElement)?.tagName==='BUTTON')return;if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat)flap();}if(e.code==='KeyP'){e.preventDefault();if(!e.repeat)pause();}if(e.code==='KeyR'&&!e.repeat)reset();};
  const hide=()=>{if(document.hidden&&game.current.mode==='play'){game.current.mode='paused';sync();}};
  window.addEventListener('keydown',key);document.addEventListener('visibilitychange',hide);
  const frame=(t:number)=>{
   const dt=Math.min((t-(last||t))/1000,0.033);last=t;const g=game.current;
   if(g.mode!=='paused')g.time+=dt;
   if(g.mode==='play'){
    g.v+=1000*dt;g.y+=g.v*dt;g.spawn+=dt;
    const speed=148+Math.min(g.score,25)*2;
    const gap=170-Math.min(g.score,20)*1.1;
    if(g.spawn>1.58){g.spawn=0;g.pipes.push({x:465,y:150+Math.random()*235,counted:false});}
    for(const p of g.pipes){p.x-=speed*dt;const nearX=Math.max(p.x-5,Math.min(120,p.x+65));const top=p.y-gap/2;const bottom=p.y+gap/2;const topY=Math.max(0,Math.min(g.y,top));const bottomY=Math.max(bottom,Math.min(g.y,550));if((120-nearX)**2+(g.y-topY)**2<14**2||(120-nearX)**2+(g.y-bottomY)**2<14**2){die();break;}if(!p.counted&&p.x+65<106){p.counted=true;g.score++;g.best=Math.max(g.best,g.score);sync();}}
    g.pipes=g.pipes.filter((p:Pipe)=>p.x>-85);
    if(g.mode==='play'&&(g.y<14||g.y>536))die();
   }
   ctx.clearRect(0,0,440,600);
   const sky=ctx.createLinearGradient(0,0,0,550);sky.addColorStop(0,'#b9e7f4');sky.addColorStop(1,'#f0faf0');ctx.fillStyle=sky;ctx.fillRect(0,0,440,600);
   for(let i=0;i<5;i++){const x=((i*133-g.time*13)%650+650)%650-90;const y=60+(i%3)*68;ctx.fillStyle='#ffffffb8';ctx.beginPath();ctx.ellipse(x,y,43,13,0,0,Math.PI*2);ctx.ellipse(x+15,y-10,22,20,0,0,Math.PI*2);ctx.fill();}
   ctx.fillStyle='#c2dfc0';ctx.beginPath();ctx.moveTo(0,550);for(let x=0;x<=440;x+=10)ctx.lineTo(x,508+22*Math.sin(x/67));ctx.lineTo(440,550);ctx.fill();
   const gap=170-Math.min(g.score,20)*1.1;
   for(const p of g.pipes){const top=p.y-gap/2,bottom=p.y+gap/2;ctx.fillStyle='#337c69';ctx.fillRect(p.x,0,60,top);ctx.fillRect(p.x,bottom,60,550-bottom);ctx.fillStyle='#65b88e';ctx.fillRect(p.x+5,0,10,top);ctx.fillRect(p.x+5,bottom,10,550-bottom);ctx.fillStyle='#226451';ctx.fillRect(p.x-5,top-18,70,18);ctx.fillRect(p.x-5,bottom,70,18);ctx.fillStyle='#8dd5a7';ctx.fillRect(p.x-3,top-17,66,5);ctx.fillRect(p.x-3,bottom+1,66,5);}
   ctx.fillStyle='#91ba76';ctx.fillRect(0,550,440,8);ctx.fillStyle='#e3d2a1';ctx.fillRect(0,558,440,42);ctx.fillStyle='#c4b384';for(let i=0;i<15;i++)ctx.fillRect(((i*38-g.time*80)%570+570)%570-40,570,17,4);
   const by=g.mode==='ready'?260+Math.sin(g.time*3)*9:g.y;
   ctx.save();ctx.translate(120,by);ctx.rotate(Math.max(-0.35,Math.min(1.1,g.v/650)));ctx.fillStyle='#eba854';ctx.beginPath();ctx.moveTo(-14,2);ctx.lineTo(-29,-8);ctx.lineTo(-24,9);ctx.closePath();ctx.fill();ctx.fillStyle='#ffcf67';ctx.beginPath();ctx.ellipse(0,0,21,17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff1b8';ctx.beginPath();ctx.ellipse(6,7,12,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#df9549';ctx.beginPath();ctx.ellipse(-8,3,10,6,Math.sin(g.time*18)*0.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(10,-6,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#233944';ctx.beginPath();ctx.arc(13,-6,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ee8252';ctx.beginPath();ctx.moveTo(20,-1);ctx.lineTo(31,3);ctx.lineTo(20,7);ctx.fill();ctx.restore();
   ctx.textAlign='center';ctx.font='bold 48px '+theme.font.family;ctx.lineWidth=5;ctx.strokeStyle='#2e556d';ctx.fillStyle='#fff';ctx.strokeText(String(g.score),220,70);ctx.fillText(String(g.score),220,70);
   if(g.mode!=='play'){
    ctx.fillStyle='#15394bce';ctx.fillRect(30,205,380,170);ctx.fillStyle='#fff';ctx.font='bold 28px '+theme.font.family;ctx.fillText(g.mode==='ready'?'准备起飞':g.mode==='paused'?'休息一下':'下次一定飞更远',220,253);ctx.font='17px '+theme.font.family;ctx.fillText(g.mode==='over'?'本次 '+g.score+'  ·  最佳 '+g.best:g.mode==='paused'?'按 P 或点击「继续」':'轻点一下，穿过绿色通道',220,294);ctx.fillText(g.mode==='ready'?'点击 / 轻触 / 空格':g.mode==='over'?'轻点再来一局':'保持节奏，不着急',220,333);
   }
   raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hide);};
 },[]);
 return <Page title="蹦跳小鸟" summary="一拍翅膀，一段冒险。穿过通道，挑战自己的最高纪录。" width="wide" lang="zh-Hans">
<ImmersiveFrame
 layout="banded"
 stageRef={stageRef}
 focusRef={canvas}
 intro={<p style={{margin:0,color:theme.text.secondary}}>手机可点「全屏游玩」：画面铺满屏幕，点画面或「拍翅」起飞。不强加方向键。</p>}
 hudStats={<><span>得分 {hud.score}</span><span>最佳 {hud.best}</span><span>{hud.mode==='play'?'飞行中':hud.mode==='paused'?'已暂停':hud.mode==='over'?'挑战结束':'等待起飞'}</span></>}
 hudActions={<><Button label={hud.mode==='over'?'再飞一次':'拍翅 / 起飞'} variant="primary" onClick={flap}/><Button label={hud.mode==='paused'?'继续':'暂停'} onClick={pause} disabled={hud.mode==='ready'||hud.mode==='over'}/><Button label="重开" onClick={reset}/></>}
 side={<>
  <div className="imm-default-only" style={{display:'flex',flexWrap:'wrap',gap:20,justifyContent:'center'}}><span>得分 {hud.score}</span><span>本次会话最佳 {hud.best}</span><span style={{color:theme.text.secondary}}>{hud.mode==='play'?'飞行中':hud.mode==='paused'?'已暂停':hud.mode==='over'?'挑战结束':'等待起飞'}</span></div>
  <div style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center'}}><Button label={hud.mode==='over'?'再飞一次':'拍翅 / 起飞'} variant="primary" onClick={flap}/><Button label={hud.mode==='paused'?'继续':'暂停'} onClick={pause} disabled={hud.mode==='ready'||hud.mode==='over'}/><Button label="重新开始" onClick={reset}/></div>
 </>}
 help={<p style={{margin:0,color:theme.text.secondary,textAlign:'center'}}>全屏后点画面或拍翅按钮即可。点击、轻触或空格拍翅 · P 暂停 · R 重开 · Esc 退出全屏<br/>别碰通道、地面和天空边缘。最高纪录仅保留在当前页面会话。</p>}
>
<canvas ref={canvas} width={440} height={600} tabIndex={0} aria-label="蹦跳小鸟游戏区域，点击或按空格拍翅，P 暂停，R 重开" onPointerDown={(e)=>{e.preventDefault();e.currentTarget.focus();flap();}} style={immersive?{width:fit.width,height:fit.height,maxWidth:'none',display:'block',borderRadius:16,touchAction:'none',border:'1px solid '+theme.border.default}:{width:'100%',maxWidth:440,height:'auto',display:'block',borderRadius:16,touchAction:'none',border:'1px solid '+theme.border.default}}/>
</ImmersiveFrame>
</Page>;
}
