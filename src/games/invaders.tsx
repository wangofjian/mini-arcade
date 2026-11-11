import {
  Page,
  Section,
  Text,
  Button,
  useEffect,
  useRef,
  useState,
  useGrokTheme,
  type PointerEvent
} from '../compat/grok-canvas';
import { HandheldPad } from '../mobile/HandheldPad';
import { ImmersiveFrame } from '../mobile/ImmersiveFrame';
import { useImmersivePlay } from '../mobile/immersivePlay';
import { useStageFit } from '../mobile/useStageFit';
type Alien={x:number;y:number;row:number;alive:boolean};
type Shot={x:number;y:number;v:number;enemy:boolean;dead:boolean};
type Block={x:number;y:number;hp:number};
type Spark={x:number;y:number;vx:number;vy:number;t:number;c:string};
type Mode='ready'|'play'|'pause'|'clear'|'lost'|'won';
type Game={mode:Mode;score:number;lives:number;wave:number;x:number;aliens:Alien[];shots:Shot[];blocks:Block[];sparks:Spark[];dir:number;step:number;fire:number;cool:number;inv:number;timer:number;ufo:number;ufoWait:number;total:number;tick:number;bonus:string;bonusT:number};
const W=800,H=620;
function formation(g:Game){g.aliens=[];const cols=8+Math.min(g.wave-1,3),rows=3+Math.floor(g.wave/2);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)g.aliens.push({x:90+c*48,y:108+r*35,row:r,alive:true});g.total=g.aliens.length;g.shots=[];g.dir=1;g.step=0;g.fire=.8;g.inv=2;g.ufo=-90;g.ufoWait=9;g.blocks=[];for(let k=0;k<4;k++)for(let r=0;r<6;r++)for(let c=0;c<10;c++){if((r===0&&(c<2||c>7))||(r>3&&c>2&&c<7))continue;g.blocks.push({x:95+k*172+c*6,y:465+r*6,hp:3});}}
function fresh():Game{const g:Game={mode:'ready',score:0,lives:3,wave:1,x:400,aliens:[],shots:[],blocks:[],sparks:[],dir:1,step:0,fire:1,cool:0,inv:0,timer:0,ufo:-90,ufoWait:9,total:0,tick:0,bonus:'',bonusT:0};formation(g);return g;}
const sprites=[['00100100','01111110','11011011','11111111','00100100','01011010'],['00011000','01111110','11011011','11111111','01100110','11000011'],['00111100','01111110','11100111','11111111','01011010','10000001']];
export default function App(){const theme=useGrokTheme();const canvas=useRef<HTMLCanvasElement|null>(null);const stageRef=useRef<HTMLDivElement|null>(null);const game=useRef<Game>(fresh());const held=useRef<Record<string,boolean>>({});const [hud,setHud]=useState({score:0,lives:3,wave:1,mode:'ready' as Mode});const action=useRef<(s:string)=>void>(()=>{});
 const {active:immersive}=useImmersivePlay();
 const fit=useStageFit(stageRef,W,H,immersive,true);
 const hold=(key:string,on:boolean)=>{held.current[key]=on;};
useEffect(()=>{const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;let raf=0,last=0,ui=0;const keys=held.current;const g=game.current;
const sync=()=>setHud({score:g.score,lives:g.lives,wave:g.wave,mode:g.mode});
const command=(s:string)=>{if(s==='restart'){Object.assign(g,fresh());g.mode='play';}else if(s==='pause'){if(g.mode==='play')g.mode='pause';else if(g.mode==='pause')g.mode='play';}else if(s==='start'){if(g.mode==='ready')g.mode='play';else if(g.mode==='pause')g.mode='play';else if(g.mode==='won'||g.mode==='lost'){Object.assign(g,fresh());g.mode='play';}}sync();};action.current=command;
const down=(e:globalThis.KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','Space','ArrowUp','KeyA','KeyD','KeyP','Enter','KeyR'].includes(e.code)){e.preventDefault();keys[e.code]=true;if(!e.repeat){if(e.code==='KeyP')command('pause');if(e.code==='Enter')command('start');if(e.code==='KeyR')command('restart');}}};
const up=(e:globalThis.KeyboardEvent)=>{keys[e.code]=false;};const blur=()=>{Object.keys(keys).forEach((k:string)=>keys[k]=false);if(g.mode==='play'){g.mode='pause';sync();}};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
const burst=(x:number,y:number,c:string)=>{for(let i=0;i<13;i++)g.sparks.push({x,y,vx:(Math.random()-.5)*190,vy:(Math.random()-.5)*190,t:.35+Math.random()*.35,c});};
const pixel=(pattern:string[],x:number,y:number,size:number,c:string)=>{ctx.fillStyle=c;pattern.forEach((row:string,r:number)=>{for(let q=0;q<row.length;q++)if(row[q]==='1')ctx.fillRect(Math.round(x+q*size),Math.round(y+r*size),size,size);});};
const update=(dt:number)=>{g.tick+=dt;if(g.mode!=='play'&&g.mode!=='clear')return;g.sparks=g.sparks.filter((p:Spark)=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt;return p.t>0;});g.bonusT-=dt;if(g.mode==='clear'){g.timer-=dt;if(g.timer<=0){g.wave++;formation(g);g.mode='play';sync();}return;}g.cool-=dt;g.inv-=dt;g.x=Math.max(24,Math.min(W-24,g.x+((keys.ArrowRight||keys.KeyD||keys.right?1:0)-(keys.ArrowLeft||keys.KeyA||keys.left?1:0))*330*dt));if((keys.Space||keys.ArrowUp||keys.shoot)&&g.cool<=0){g.shots.push({x:g.x,y:551,v:-580,enemy:false,dead:false});g.cool=.22;}
let live=g.aliens.filter((a:Alien)=>a.alive);g.step-=dt;const delay=Math.max(.065,.65-(g.wave-1)*.065)*( .18+.82*live.length/g.total);if(g.step<=0){g.step=delay;const edge=live.some((a:Alien)=>a.x+g.dir*13<20||a.x+g.dir*13+24>780);if(edge){g.dir*=-1;live.forEach((a:Alien)=>a.y+=15);}else live.forEach((a:Alien)=>a.x+=g.dir*13);if(live.some((a:Alien)=>a.y+20>=542)){g.mode='lost';sync();}live.forEach((a:Alien)=>g.blocks.forEach((b:Block)=>{if(b.hp>0&&b.x+6>a.x&&b.x<a.x+24&&b.y+6>a.y&&b.y<a.y+20)b.hp=0;}));}
g.fire-=dt;if(g.fire<=0&&live.length){const fronts=live.filter((a:Alien)=>!live.some((b:Alien)=>Math.abs(a.x-b.x)<5&&b.y>a.y));const a=fronts[Math.floor(Math.random()*fronts.length)];g.shots.push({x:a.x+12,y:a.y+20,v:185+g.wave*22,enemy:true,dead:false});g.fire=Math.max(.22,.85-g.wave*.085)+Math.random()*.35;}
g.ufoWait-=dt;if(g.ufoWait<=0){g.ufo+=95*dt;if(g.ufo>850){g.ufo=-90;g.ufoWait=10+Math.random()*8;}}
for(const s of g.shots){const old=s.y;s.y+=s.v*dt;const lo=Math.min(old,s.y),hi=Math.max(old,s.y)+10;const b=g.blocks.find((b:Block)=>b.hp>0&&Math.abs(s.x-(b.x+3))<6&&hi>=b.y&&lo<=b.y+6);if(b){s.dead=true;g.blocks.forEach((q:Block)=>{if(Math.abs(q.x-b.x)<=7&&Math.abs(q.y-b.y)<=7)q.hp=Math.max(0,q.hp-(q===b?2:1));});burst(s.x,s.y,'#82b9b0');continue;}if(!s.enemy){const a=live.find((a:Alien)=>a.alive&&s.x>=a.x-2&&s.x<=a.x+26&&hi>=a.y&&lo<=a.y+20);if(a){a.alive=false;s.dead=true;g.score+=10+(4-Math.min(a.row,4))*10;burst(a.x+12,a.y+10,['#76ebdc','#f2ca73','#aaa0f5'][a.row%3]);}else if(g.ufoWait<=0&&s.x>g.ufo&&s.x<g.ufo+44&&lo<77&&hi>59){s.dead=true;const bonus=100+Math.floor(Math.random()*3)*50;g.score+=bonus;g.bonus='巡游舰 +'+bonus;g.bonusT=2;burst(g.ufo+22,68,'#f5a2c7');g.ufo=-90;g.ufoWait=12;}}else if(g.inv<=0&&Math.abs(s.x-g.x)<19&&hi>550&&lo<575){s.dead=true;g.lives--;g.inv=2.3;burst(g.x,561,'#fc8f80');g.shots.forEach((q:Shot)=>{if(q.enemy)q.dead=true;});if(g.lives<=0)g.mode='lost';sync();}}
g.shots=g.shots.filter((s:Shot)=>!s.dead&&s.y>-20&&s.y<630);if(!g.aliens.some((a:Alien)=>a.alive)&&g.mode==='play'){g.score+=g.wave*150;g.shots=[];if(g.wave>=5)g.mode='won';else{g.mode='clear';g.timer=2.2;}sync();}};
const draw=()=>{ctx.fillStyle='#080e1c';ctx.fillRect(0,0,W,H);for(let i=0;i<85;i++){const x=(i*137.7)%W,y=(i*91.3+g.tick*(5+i%4))%H;ctx.fillStyle=i%3===0?'#34445f':'#1c2b43';ctx.fillRect(x,y,i%9===0?2:1,2);}ctx.strokeStyle='#20344c';ctx.beginPath();ctx.moveTo(16,589);ctx.lineTo(784,589);ctx.stroke();ctx.fillStyle='#92a9c5';ctx.font='12px '+theme.font.mono;ctx.textAlign='left';ctx.fillText('SECTOR 0'+g.wave+' / 05',22,28);ctx.textAlign='right';ctx.fillText('PIXEL DEFENSE',778,28);g.aliens.forEach((a:Alien)=>{if(a.alive){const pat=sprites[a.row%3];pixel(pat,a.x,a.y,3,['#76ebdc','#f2ca73','#aaa0f5'][a.row%3]);if(Math.floor(g.tick*3)%2===0){ctx.fillStyle='#080e1c';ctx.fillRect(a.x,a.y+15,3,3);ctx.fillRect(a.x+21,a.y+15,3,3);}}});g.blocks.forEach((b:Block)=>{if(b.hp){ctx.fillStyle=['','#294e57','#418782','#75bca6'][b.hp];ctx.fillRect(b.x,b.y,5,5);}});if(g.ufoWait<=0)pixel(['000111111000','011111111110','111011110111','001111111100','000100001000'],g.ufo,59,4,'#f5a2c7');g.shots.forEach((s:Shot)=>{ctx.fillStyle=s.enemy?'#ff977a':'#c6fff3';ctx.fillRect(s.x-2,s.y,4,s.enemy?10:14);});if(g.inv<=0||Math.floor(g.tick*12)%2===0)pixel(['00000100000','00001110000','00011111000','01111111110','11111111111','11100100111'],g.x-22,550,4,'#96f1e0');if(g.mode==='play'){ctx.fillStyle='#efc471';ctx.fillRect(g.x-8,576,4,3+Math.sin(g.tick*35)*2);ctx.fillRect(g.x+4,576,4,3+Math.cos(g.tick*35)*2);}g.sparks.forEach((p:Spark)=>{ctx.globalAlpha=Math.min(1,p.t*2);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,3,3);});ctx.globalAlpha=1;if(g.bonusT>0){ctx.fillStyle='#f5a2c7';ctx.textAlign='center';ctx.font='16px '+theme.font.family;ctx.fillText(g.bonus,400,51);}if(g.mode!=='play'){ctx.fillStyle='#080e1cdd';ctx.fillRect(0,0,W,H);const copy:Record<string,string[]>={ready:['星际入侵','守住像素防线','消灭五波入侵舰队，别让它们着陆。','点击开始，或按 Enter'],pause:['已暂停','喘口气，再出发','P / 继续按钮恢复战斗',''],clear:['航区已清空','下一波正在接近','防御屏障重新部署 · 保留生命与积分',''],lost:['防线失守','每一次突围，都算数','最终积分 '+g.score,'按 R 或点击重新开始'],won:['星域守护者','五波防御完成','最终积分 '+g.score,'按 R 再来一局']};const t=copy[g.mode];ctx.textAlign='center';ctx.fillStyle='#e9f4ff';ctx.font='bold 42px '+theme.font.family;ctx.fillText(t[0],400,249);ctx.fillStyle='#85e2d0';ctx.font='20px '+theme.font.family;ctx.fillText(t[1],400,293);ctx.fillStyle='#a5b5cb';ctx.font='16px '+theme.font.family;ctx.fillText(t[2],400,337);ctx.fillText(t[3],400,370);}ctx.fillStyle='#7c91ad';ctx.textAlign='center';ctx.font='12px '+theme.font.mono;ctx.fillText('MOVE  A / D     FIRE  SPACE     PAUSE  P',400,609);};
const frame=(now:number)=>{const dt=last?Math.min((now-last)/1000,.035):0;last=now;update(dt);draw();ui+=dt;if(ui>.12){sync();ui=0;}raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);return()=>{cancelAnimationFrame(raf);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};},[theme]);
const control=(key:string,label:string)=><button style={{background:theme.bg.subtle,color:theme.text.primary,border:'1px solid '+theme.border.default,borderRadius:theme.radius.md,padding:'16px 26px',touchAction:'none',userSelect:'none',fontFamily:theme.font.family,fontSize:18}} onPointerDown={(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);held.current[key]=true;}} onPointerUp={()=>{held.current[key]=false;}} onPointerCancel={()=>{held.current[key]=false;}} onLostPointerCapture={()=>{held.current[key]=false;}}>{label}</button>;
return <Page title="星际入侵" summary="像素舰队逼近。移动、开火、守住最后一道防线。" width="wide" lang="zh-Hans">
<ImmersiveFrame
 layout="overlay"
 stageRef={stageRef}
 intro={<Text>手机可点「全屏游玩」：战场铺满屏幕，半透明十字键左右移动，右侧圆形键按住连射。电脑仍可用键盘。</Text>}
 hudStats={<><span>积分 {String(hud.score).padStart(6,'0')}</span><span>生命 {'●'.repeat(hud.lives)}{'○'.repeat(3-hud.lives)}</span><span>波次 {hud.wave} / 5</span></>}
 hudActions={<><Button label={hud.mode==='pause'?'继续':hud.mode==='ready'?'开始':hud.mode==='lost'||hud.mode==='won'?'再战':'暂停'} variant="primary" onClick={()=>action.current(hud.mode==='play'||hud.mode==='pause'?'pause':'start')} disabled={hud.mode==='clear'}/><Button label="重开" onClick={()=>action.current('restart')}/></>}
 side={<>
  <div className="imm-default-only" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:20,color:theme.text.primary,fontFamily:theme.font.mono,marginBottom:16}}><span>积分 {String(hud.score).padStart(6,'0')}</span><span>生命 {'●'.repeat(hud.lives)}{'○'.repeat(3-hud.lives)}</span><span>波次 {hud.wave} / 5</span></div>
  <div style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',marginTop:16}}><Button label={hud.mode==='pause'?'继续':hud.mode==='ready'?'开始战斗':hud.mode==='lost'||hud.mode==='won'?'再战一局':'暂停'} variant="primary" onClick={()=>action.current(hud.mode==='play'||hud.mode==='pause'?'pause':'start')} disabled={hud.mode==='clear'}/><Button label="重新开始" onClick={()=>action.current('restart')}/></div>
  <div className="imm-inline-controls" style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:12}}>{control('left','← 左移')}{control('right','右移 →')}{control('shoot','持续开火')}</div>
 </>}
 pad={<HandheldPad
  dirs={{
    left:{mode:'hold',onDown:()=>hold('left',true),onUp:()=>hold('left',false),ariaLabel:'左移'},
    right:{mode:'hold',onDown:()=>hold('right',true),onUp:()=>hold('right',false),ariaLabel:'右移'},
  }}
  actions={[{label:'开火',ariaLabel:'持续开火',onDown:()=>hold('shoot',true),onUp:()=>hold('shoot',false)}]}
 />}
 padOverlayOnly
 help={<Text>全屏十字键按住左右移动，右侧圆形键按住连射（可同时按）。方向键 / A D 移动，空格 / ↑ 持续射击，P 暂停，R 重开，Esc 退出全屏。敌人越少，行军越快；一旦触及防线便会失败。屏障会被双方火力侵蚀，每波重建。击落粉色巡游舰获得额外积分，完成五波即获胜。原创像素造型 · 纯本地运行。</Text>}
>
<canvas ref={canvas} width={W} height={H} aria-label="星际入侵游戏区域；左右方向键移动，空格射击" style={immersive?{display:'block',width:fit.width,height:fit.height,maxWidth:'none',borderRadius:theme.radius.lg,touchAction:'none'}:{display:'block',width:'100%',height:'auto',borderRadius:theme.radius.lg,touchAction:'none'}}/>
</ImmersiveFrame>
</Page>;
}
