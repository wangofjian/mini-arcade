import {
  Page,
  Section,
  Text,
  Button,
  useGrokTheme,
  useRef,
  useEffect,
  useState,
  type PointerEvent
} from '../compat/grok-canvas';
import { HandheldPad } from '../mobile/HandheldPad';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { useStageFit } from '../mobile/useStageFit';
type Box={x:number;y:number;w:number;h:number};
type Enemy=Box&{home:number;dir:number;hp:number;cool:number;boss:boolean};
type Bullet={x:number;y:number;vx:number;vy:number;life:number;bad:boolean};
type Spark={x:number;y:number;vx:number;vy:number;t:number};
type World={p:Box&{vy:number;dir:number;ground:boolean;inv:number;hp:number},enemies:Enemy[],bullets:Bullet[],sparks:Spark[],score:number,lives:number,cp:number,cam:number,shot:number,power:number,pickups:{x:number;y:number;used:boolean}[],mode:'ready'|'play'|'pause'|'over'|'win',time:number,jumpHeld:boolean};
const W=900,H=460,LENGTH=5700;
const platforms:Box[]=[{x:0,y:400,w:5700,h:60},...Array.from({length:15},(_:unknown,i:number)=>({x:320+i*345,y:i%3===0?294:320,w:150,h:18}))];
function fresh():World{return {p:{x:70,y:356,w:25,h:44,vy:0,dir:1,ground:true,inv:1,hp:3},enemies:Array.from({length:25},(_:unknown,i:number)=>({x:480+i*190,y:360,w:26,h:40,home:480+i*190,dir:i%2?1:-1,hp:2,cool:1+i%4*.4,boss:false})).concat([{x:5470,y:322,w:66,h:78,home:5470,dir:-1,hp:36,cool:1,boss:true}]),bullets:[],sparks:[],score:0,lives:4,cp:0,cam:0,shot:0,power:0,pickups:[650,1820,2800,3820,4800].map((x:number)=>({x,y:365,used:false})),mode:'ready',time:0,jumpHeld:false};}
export default function App(){
 const theme=useGrokTheme();const canvas=useRef<HTMLCanvasElement|null>(null);const stageRef=useRef<HTMLDivElement|null>(null);const game=useRef<World>(fresh());const keys=useRef<Record<string,boolean>>({});const [mode,setMode]=useState('ready');const [hud,setHud]=useState('生命 4 · HP 3 · 得分 0');
 const {active:immersive}=useImmersivePlay();
 const fit=useStageFit(stageRef,W,H,immersive,true);
 const hold=(key:string,on:boolean)=>{keys.current[key]=on;};
 const change=(m:World['mode'])=>{game.current.mode=m;setMode(m);};
 const start=()=>{game.current=fresh();keys.current={};change('play');canvas.current?.focus();};
 const pause=()=>{if(game.current.mode==='play')change('pause');else if(game.current.mode==='pause')change('play');};
 useEffect(()=>{const node=canvas.current;if(!node)return;const ctx=node.getContext('2d');if(!ctx)return;let raf=0,last=0,ui=0;
 const down=(e:globalThis.KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS','KeyJ','KeyZ','KeyP'].includes(e.code)){e.preventDefault();keys.current[e.code]=true;if(e.code==='KeyP'&&!e.repeat){const g=game.current;if(g.mode==='play'){g.mode='pause';setMode('pause');}else if(g.mode==='pause'){g.mode='play';setMode('play');}}}};
 const up=(e:globalThis.KeyboardEvent)=>{keys.current[e.code]=false;};
 const blur=()=>{keys.current={};if(game.current.mode==='play'){game.current.mode='pause';setMode('pause');}};
 node.addEventListener('keydown',down);node.addEventListener('keyup',up);window.addEventListener('blur',blur);
 const overlap=(a:Box,b:Box)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const burst=(g:World,x:number,y:number)=>{for(let i=0;i<10;i++)g.sparks.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,t:.45});};
 const hurt=(g:World)=>{const p=g.p;if(p.inv>0)return;p.hp--;p.inv=1.5;burst(g,p.x+12,p.y+15);if(p.hp<=0){g.lives--;if(g.lives<=0){g.mode='over';setMode('over');return;}p.hp=3;p.x=g.cp+60;p.y=340;p.vy=0;p.inv=3;g.bullets=g.bullets.filter((b:Bullet)=>!b.bad);}};
 const step=(dt:number)=>{const g=game.current;if(g.mode!=='play')return;g.time+=dt;const p=g.p,k=keys.current;const left=k.ArrowLeft||k.KeyA||k.left,right=k.ArrowRight||k.KeyD||k.right,jump=k.Space||k.ArrowUp||k.KeyW||k.jump,shoot=k.KeyJ||k.KeyZ||k.shoot;
 const vx=((right?1:0)-(left?1:0))*245;if(vx)p.dir=vx>0?1:-1;p.x=Math.max(g.cp,Math.min(LENGTH-p.w,p.x+vx*dt));if(jump&&!g.jumpHeld&&p.ground){p.vy=-590;p.ground=false;}g.jumpHeld=!!jump;
 const oldBottom=p.y+p.h;p.vy+=1450*dt;p.y+=p.vy*dt;p.ground=false;for(const b of platforms){if(p.x+p.w>b.x&&p.x<b.x+b.w&&oldBottom<=b.y+2&&p.y+p.h>=b.y&&p.vy>=0){p.y=b.y-p.h;p.vy=0;p.ground=true;}}
 p.inv=Math.max(0,p.inv-dt);g.power=Math.max(0,g.power-dt);g.shot-=dt;if(shoot&&g.shot<=0){g.shot=g.power>0?.13:.22;for(const angle of g.power>0?[-.18,0,.18]:[0])g.bullets.push({x:p.x+12+p.dir*18,y:p.y+19,vx:640*p.dir*Math.cos(angle),vy:640*Math.sin(angle),life:1.35,bad:false});}
 for(const c of [1900,3800])if(p.x>c&&g.cp<c){g.cp=c;g.score+=250;p.hp=3;}
 for(const item of g.pickups)if(!item.used&&overlap(p,{x:item.x,y:item.y,w:25,h:25})){item.used=true;g.power=15;g.score+=100;}
 for(const e of g.enemies){if(e.hp<=0||Math.abs(e.x-p.x)>740)continue;e.x+=e.dir*(e.boss?24:48)*dt;if(Math.abs(e.x-e.home)>(e.boss?70:60))e.dir*=-1;e.cool-=dt;if(e.cool<=0&&Math.abs(e.x-p.x)<680){e.cool=e.boss?.75:1.8;const dx=p.x+12-(e.x+e.w/2),dy=p.y+20-(e.y+18),len=Math.hypot(dx,dy)||1;for(const a of e.boss?[-.23,0,.23]:[0]){const v=225,ang=Math.atan2(dy,dx)+a;g.bullets.push({x:e.x+e.w/2,y:e.y+18,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,life:4,bad:true});}}if(overlap(p,e))hurt(g);}
 for(const b of g.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;const box={x:b.x-4,y:b.y-4,w:8,h:8};if(b.bad){if(overlap(p,box)){b.life=0;hurt(g);}}else for(const e of g.enemies)if(e.hp>0&&overlap(e,box)){e.hp--;b.life=0;burst(g,b.x,b.y);if(e.hp===0)g.score+=e.boss?2000:100;break;}}
 g.bullets=g.bullets.filter((b:Bullet)=>b.life>0&&b.y>-100&&b.y<H);for(const s of g.sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.t-=dt;}g.sparks=g.sparks.filter((s:Spark)=>s.t>0);g.cam=Math.max(0,Math.min(LENGTH-W,p.x-280));if(p.x>5600&&g.enemies[g.enemies.length-1].hp<=0){g.mode='win';g.score+=1000;setMode('win');}};
 const render=()=>{const g=game.current,p=g.p,c=g.cam;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0c2029';ctx.fillRect(0,0,W,H);
 for(let layer=0;layer<3;layer++){ctx.fillStyle=['#143239','#1b4543','#24534a'][layer];const spacing=layer===2?175:230;for(let i=-2;i<12;i++){const x=i*spacing-(c*(.12+layer*.12)%spacing);const y=150-layer*20;ctx.fillRect(x+45,y,18,260);ctx.beginPath();ctx.moveTo(x-25,y+110);ctx.lineTo(x+54,y-70);ctx.lineTo(x+130,y+110);ctx.fill();}}
 ctx.save();ctx.translate(-Math.round(c),0);
 for(const b of platforms){ctx.fillStyle='#374b41';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#75a762';ctx.fillRect(b.x,b.y,b.w,5);ctx.fillStyle='#263a33';for(let x=b.x;x<b.x+b.w;x+=32)ctx.fillRect(x,b.y+12,20,5);}
 for(const x of [1900,3800]){ctx.fillStyle='#c1c9bc';ctx.fillRect(x,305,5,95);ctx.fillStyle=g.cp>=x?'#72e2ad':'#ecc05f';ctx.fillRect(x+5,305,40,24);ctx.font='12px '+theme.font.mono;ctx.fillText('CP',x+11,322);}
 ctx.fillStyle='#749cbd';ctx.fillRect(5620,260,12,140);ctx.fillStyle='#d3ebe3';ctx.fillRect(5632,260,65,40);ctx.fillStyle='#143239';ctx.font='14px '+theme.font.mono;ctx.fillText('EXIT',5637,285);
 for(const q of g.pickups)if(!q.used){const y=q.y+Math.sin(g.time*5)*4;ctx.fillStyle='#f7d86b';ctx.fillRect(q.x,y,25,25);ctx.fillStyle='#17342e';ctx.font='bold 18px '+theme.font.mono;ctx.fillText('S',q.x+7,y+19);}
 const soldier=(x:number,y:number,dir:number,color:string,boss:boolean)=>{ctx.save();ctx.translate(Math.round(x),Math.round(y));if(boss){ctx.fillStyle='#5c6872';ctx.fillRect(0,12,66,58);ctx.fillStyle='#d78e5d';ctx.fillRect(12,0,42,20);ctx.fillStyle='#fbd983';ctx.fillRect(14,27,38,9);ctx.fillStyle='#29383e';ctx.fillRect(-8,40,80,12);ctx.fillRect(5,70,18,8);ctx.fillRect(43,70,18,8);}else{const walk=Math.sin(g.time*14)*4;ctx.fillStyle='#d7b28b';ctx.fillRect(7,4,14,12);ctx.fillStyle=color;ctx.fillRect(4,0,20,7);ctx.fillRect(3,17,21,16);ctx.fillStyle='#233337';ctx.fillRect(4,31+walk,8,12-walk);ctx.fillRect(17,31-walk,8,12+walk);ctx.fillStyle='#c4cdd0';ctx.fillRect(dir>0?17:-10,20,26,6);}ctx.restore();};
 for(const e of g.enemies)if(e.hp>0&&e.x>c-80&&e.x<c+W+80){soldier(e.x,e.y,e.dir,'#c47b64',e.boss);if(e.boss){ctx.fillStyle='#253538';ctx.fillRect(e.x-5,e.y-15,76,6);ctx.fillStyle='#efad70';ctx.fillRect(e.x-5,e.y-15,76*e.hp/36,6);}}
 if(p.inv<=0||Math.floor(g.time*14)%2===0)soldier(p.x,p.y,p.dir,'#70dcbd',false);
 for(const b of g.bullets){ctx.fillStyle=b.bad?'#ff977a':'#fcf1a4';ctx.fillRect(b.x-4,b.y-2,b.bad?7:12,5);}for(const s of g.sparks){ctx.fillStyle='#ffca7e';ctx.fillRect(s.x,s.y,4,4);}ctx.restore();
 ctx.fillStyle='#0a1926';ctx.fillRect(0,0,W,49);ctx.fillStyle='#e5f3e9';ctx.font='bold 16px '+theme.font.mono;ctx.fillText('JUNGLE / '+(Math.min(3,Math.floor(p.x/1900)+1))+'     SCORE '+String(g.score).padStart(6,'0'),20,30);ctx.fillText('HP '+p.hp+'   LIVES '+g.lives+(g.power>0?'   SPREAD '+Math.ceil(g.power)+'s':''),470,30);
 ctx.fillStyle='#427061';ctx.fillRect(20,445,860,4);ctx.fillStyle='#a6e2b5';ctx.fillRect(20,445,860*p.x/LENGTH,4);
 if(g.mode!=='play'){ctx.fillStyle='rgba(4,15,24,.8)';ctx.fillRect(0,49,W,H-49);ctx.textAlign='center';ctx.fillStyle='#e5f3e9';ctx.font='bold 34px '+theme.font.mono;ctx.fillText(g.mode==='ready'?'丛林突击':g.mode==='pause'?'已暂停':g.mode==='win'?'任务完成':'任务失败',W/2,205);ctx.font='17px '+theme.font.mono;ctx.fillText(g.mode==='ready'?'突破三段防线，击败装甲守卫，到达出口':g.mode==='pause'?'按 P 或点击继续':g.mode==='win'?'最终得分 '+g.score:'点击重新开始，再试一次',W/2,248);ctx.textAlign='left';}};
 const loop=(t:number)=>{const dt=Math.min((t-last)/1000||.016,.035);last=t;step(dt);render();if(t-ui>200){ui=t;const g=game.current;setHud('生命 '+g.lives+' · HP '+g.p.hp+' · 得分 '+g.score+' · 检查点 '+g.cp/1900+'/2');}raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);return()=>{cancelAnimationFrame(raf);node.removeEventListener('keydown',down);node.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
 },[theme.font.mono]);
 const control=(key:string,label:string)=><button key={key} aria-label={label} onPointerDown={(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);keys.current[key]=true;}} onPointerUp={(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();keys.current[key]=false;}} onPointerCancel={()=>{keys.current[key]=false;}} onLostPointerCapture={()=>{keys.current[key]=false;}} style={{background:theme.bg.subtle,color:theme.text.primary,border:'1px solid '+theme.border.default,padding:'15px 21px',fontFamily:theme.font.family,fontSize:18,touchAction:'none',userSelect:'none'}}>{label}</button>;
 return <Page title="丛林突击" summary="原创像素风横版跑跳射击 · 三段防线，一次突围。" width="wide" lang="zh-Hans">
 <ImmersiveFrame
  layout="overlay"
  stageRef={stageRef}
  focusRef={canvas}
  intro={<Text>手机可点「全屏游玩」：画面铺满屏幕，半透明十字键左右移动、上键跳跃，右侧圆形键开火。电脑仍可用键盘。</Text>}
  hudStats={<span>{hud}</span>}
  hudActions={<><Button label={mode==='ready'?'开始':'重开'} onClick={start} variant="primary"/><Button label={mode==='pause'?'继续':'暂停'} onClick={pause} disabled={mode!=='pause'&&mode!=='play'}/></>}
  side={<>
   <Text>{hud}</Text>
   <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}}><Button label={mode==='ready'?'开始突围':'重新开始'} onClick={start} variant="primary"/><Button label={mode==='pause'?'继续':'暂停'} onClick={pause} disabled={mode!=='pause'&&mode!=='play'}/></div>
   <div className="imm-inline-controls" style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}}>{control('left','←')}{control('right','→')}{control('jump','跳跃')}{control('shoot','开火')}</div>
   <div className="imm-default-only">
    <Text>点击开始后：A/D 或 ←/→ 移动，Space、W 或 ↑ 跳跃，J/Z 按住连射，P 暂停。手机可同时按住方向与开火按钮。</Text>
    <Text>拾取 S 获得 15 秒散射。旗帜是检查点，并回复 HP；每条命有 3 HP，受击后短暂无敌。最后击败装甲守卫，再跑进出口通关。</Text>
    <Text>四条命用尽则任务失败。离开游戏画面会自动暂停；继续键盘操作前请点一下画面。原创角色与场景，无外部素材。</Text>
   </div>
  </>}
  pad={<HandheldPad
   dirs={{
    left:{mode:'hold',onDown:()=>hold('left',true),onUp:()=>hold('left',false),ariaLabel:'向左'},
    right:{mode:'hold',onDown:()=>hold('right',true),onUp:()=>hold('right',false),ariaLabel:'向右'},
    up:{mode:'hold',onDown:()=>hold('jump',true),onUp:()=>hold('jump',false),ariaLabel:'跳跃'},
    down:{mode:'hold',disabled:true,ariaLabel:'向下（无操作）'},
   }}
   actions={[{label:'开火',ariaLabel:'开火',onDown:()=>hold('shoot',true),onUp:()=>hold('shoot',false)}]}
  />}
  padOverlayOnly
  help={<Text>全屏十字键：左右移动，上键跳跃，右侧圆形键按住连射（可同时按）。A/D 或 ←/→ 移动，Space、W 或 ↑ 跳跃，J/Z 按住连射，P 暂停，Esc 退出全屏。拾取 S 获得 15 秒散射。旗帜是检查点，并回复 HP；每条命有 3 HP，受击后短暂无敌。最后击败装甲守卫，再跑进出口通关。四条命用尽则任务失败。离开游戏画面会自动暂停；继续键盘操作前请点一下画面。</Text>}
 >
 <canvas ref={canvas} width={W} height={H} tabIndex={0} aria-label="丛林突击游戏画面，点击后使用键盘操作" onBlur={()=>{keys.current={};if(game.current.mode==='play')change('pause');}} style={immersive?{width:fit.width,height:fit.height,maxWidth:'none',display:'block',outlineColor:theme.border.focus,touchAction:'none'}:{width:'100%',display:'block',outlineColor:theme.border.focus,touchAction:'none'}}/>
 </ImmersiveFrame>
 </Page>;
}
