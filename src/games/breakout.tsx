import {
  Page,
  Text,
  Button,
  useRef,
  useEffect,
  useState,
  useGrokTheme
} from '../compat/grok-canvas';
type Brick={x:number;y:number;w:number;h:number;hp:number;color:string};
type Spark={x:number;y:number;vx:number;vy:number;life:number;color:string};
type Drop={x:number;y:number};
type Mode='ready'|'play'|'pause'|'win'|'lose';
const W=900,H=600,R=8,PY=548;
const colors=['#fb7185','#fb923c','#facc15','#4ade80','#38bdf8','#a78bfa','#e879f9'];
function makeBricks(level:number):Brick[]{const out:Brick[]=[];const cols=level===1?10:12,rows=level+3;const w=(W-72-(cols-1)*7)/cols;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(level===1&&r===3&&(c===0||c===9))continue;out.push({x:36+c*(w+7),y:72+r*29,w,h:21,hp:level===3&&r<2?2:1,color:colors[r%colors.length]});}return out;}
function initial(){return {mode:'ready' as Mode,level:1,score:0,lives:3,x:450,y:PY-R-3,vx:155,vy:-345,p:450,pw:120,wide:0,bricks:makeBricks(1),sparks:[] as Spark[],drops:[] as Drop[],trail:[] as {x:number;y:number}[],time:0};}
export default function App(){const theme=useGrokTheme();const canvas=useRef<HTMLCanvasElement|null>(null);const game=useRef(initial());const keys=useRef({left:false,right:false});const actions=useRef({launch:()=>{},pause:()=>{},restart:()=>{}});const [hud,setHud]=useState({score:0,lives:3,level:1,mode:'ready' as Mode,remaining:38,wide:0});
useEffect(()=>{const el=canvas.current;if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;let raf=0,last=0,acc=0,ui=0;const s=game.current;
const resetBall=()=>{s.x=s.p;s.y=PY-R-3;s.vx=155;s.vy=-345;s.trail=[];};
const launch=()=>{if(s.mode==='ready'){s.mode='play';s.vx=(Math.random()>.5?1:-1)*(155+s.level*15);s.vy=-345-s.level*25;}else if(s.mode==='win'||s.mode==='lose'){restart();}else if(s.mode==='pause')s.mode='play';};
const pause=()=>{if(s.mode==='play')s.mode='pause';else if(s.mode==='pause')s.mode='play';};
const restart=()=>{Object.assign(s,initial());keys.current={left:false,right:false};};actions.current={launch,pause,restart};
const move=(e:globalThis.PointerEvent)=>{const box=el.getBoundingClientRect();s.p=Math.max(s.pw/2,Math.min(W-s.pw/2,(e.clientX-box.left)*W/box.width));};
const down=(e:globalThis.PointerEvent)=>{move(e);el.focus();if(s.mode==='ready'||s.mode==='win'||s.mode==='lose')launch();};
const kd=(e:globalThis.KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','Space','KeyP','Escape'].includes(e.code))e.preventDefault();if(e.code==='ArrowLeft')keys.current.left=true;if(e.code==='ArrowRight')keys.current.right=true;if(e.repeat)return;if(e.code==='Space')launch();if(e.code==='KeyP'||e.code==='Escape')pause();};
const ku=(e:globalThis.KeyboardEvent)=>{if(e.code==='ArrowLeft')keys.current.left=false;if(e.code==='ArrowRight')keys.current.right=false;};
const blur=()=>{keys.current.left=false;keys.current.right=false;if(s.mode==='play')s.mode='pause';};
el.addEventListener('pointermove',move);el.addEventListener('pointerdown',down);el.addEventListener('keydown',kd);el.addEventListener('keyup',ku);el.addEventListener('blur',blur);
const burst=(x:number,y:number,color:string)=>{for(let i=0;i<13;i++)s.sparks.push({x,y,vx:(Math.random()-.5)*230,vy:(Math.random()-.5)*230,life:.4+Math.random()*.35,color});};
const step=(dt:number)=>{s.time+=dt;if(s.mode!=='play'&&s.mode!=='ready')return;
s.p+=((keys.current.right?1:0)-(keys.current.left?1:0))*660*dt;s.p=Math.max(s.pw/2,Math.min(W-s.pw/2,s.p));
if(s.mode==='ready'){resetBall();return;}
if(s.wide>0){s.wide=Math.max(0,s.wide-dt);if(s.wide===0)s.pw=120;}
s.sparks=s.sparks.filter((p:Spark)=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.life-=dt;return p.life>0;});
s.drops=s.drops.filter((d:Drop)=>{d.y+=130*dt;if(d.y>PY-10&&d.y<PY+20&&Math.abs(d.x-s.p)<s.pw/2+12){s.pw=180;s.wide=12;s.score+=25;return false;}return d.y<H+20;});
const ox=s.x,oy=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;
if(s.x<R){s.x=R;s.vx=Math.abs(s.vx);}if(s.x>W-R){s.x=W-R;s.vx=-Math.abs(s.vx);}if(s.y<R){s.y=R;s.vy=Math.abs(s.vy);}
if(s.vy>0&&oy+R<=PY&&s.y+R>=PY&&s.x>=s.p-s.pw/2-R&&s.x<=s.p+s.pw/2+R){s.y=PY-R;const angle=Math.max(-1,Math.min(1,(s.x-s.p)/(s.pw/2)))*1.12;const speed=Math.min(650,Math.hypot(s.vx,s.vy)+5);s.vx=Math.sin(angle)*speed;s.vy=-Math.cos(angle)*speed;burst(s.x,PY,'#67e8f9');}
for(const b of s.bricks){if(b.hp<=0)continue;const nx=Math.max(b.x,Math.min(s.x,b.x+b.w)),ny=Math.max(b.y,Math.min(s.y,b.y+b.h));if((s.x-nx)**2+(s.y-ny)**2>R*R)continue;b.hp--;s.score+=b.hp===0?100*s.level:40;burst(s.x,s.y,b.color);if(oy+R<=b.y){s.y=b.y-R;s.vy=-Math.abs(s.vy);}else if(oy-R>=b.y+b.h){s.y=b.y+b.h+R;s.vy=Math.abs(s.vy);}else if(ox<b.x){s.x=b.x-R;s.vx=-Math.abs(s.vx);}else{s.x=b.x+b.w+R;s.vx=Math.abs(s.vx);}if(b.hp===0&&Math.random()<.12)s.drops.push({x:b.x+b.w/2,y:b.y+b.h});break;}
s.trail.push({x:s.x,y:s.y});if(s.trail.length>18)s.trail.shift();
if(s.y>H+R){s.lives--;s.wide=0;s.pw=120;s.drops=[];s.mode=s.lives<=0?'lose':'ready';resetBall();}
if(s.bricks.every((b:Brick)=>b.hp<=0)){s.score+=500*s.level;if(s.level===3)s.mode='win';else{s.level++;s.bricks=makeBricks(s.level);s.mode='ready';s.drops=[];resetBall();}}
};
const rounded=(x:number,y:number,w:number,h:number,r:number)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();};
const draw=()=>{ctx.clearRect(0,0,W,H);ctx.fillStyle='#070e1d';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#152039';ctx.lineWidth=1;for(let x=30;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=30;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
ctx.font='12px '+theme.font.mono;ctx.fillStyle='#8295af';ctx.textAlign='left';ctx.fillText('BREAKOUT / 0'+s.level,30,33);ctx.textAlign='right';ctx.fillText(s.level===3?'装甲阵列 · 双层砖':'清空砖阵，进入下一关',W-30,33);
for(const b of s.bricks){if(b.hp<=0)continue;ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=8;rounded(b.x,b.y,b.w,b.h,5);ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.26)';rounded(b.x+3,b.y+2,b.w-6,3,1);if(b.hp>1){ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.strokeRect(b.x+5,b.y+5,b.w-10,b.h-10);}}
for(let i=0;i<s.trail.length;i++){const t=s.trail[i];ctx.globalAlpha=i/s.trail.length*.3;ctx.fillStyle='#67e8f9';ctx.beginPath();ctx.arc(t.x,t.y,R*i/s.trail.length,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
for(const p of s.sparks){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
for(const d of s.drops){ctx.fillStyle='#4ade80';rounded(d.x-13,d.y-10,26,20,5);ctx.fillStyle='#052e16';ctx.font='bold 15px '+theme.font.mono;ctx.textAlign='center';ctx.fillText('↔',d.x,d.y+5);}
ctx.shadowColor=s.wide>0?'#4ade80':'#38bdf8';ctx.shadowBlur=18;ctx.fillStyle=s.wide>0?'#4ade80':'#67e8f9';rounded(s.p-s.pw/2,PY,s.pw,12,6);ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,R,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#22324d';ctx.beginPath();ctx.moveTo(25,H-20);ctx.lineTo(W-25,H-20);ctx.stroke();
if(s.mode!=='play'){ctx.fillStyle='rgba(7,14,29,.79)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#e6f3ff';ctx.font='bold 38px '+theme.font.family;const title=s.mode==='ready'?'第 '+s.level+' 关 · 准备发射':s.mode==='pause'?'已暂停':s.mode==='win'?'三关全破！':'挑战结束';ctx.fillText(title,W/2,270);ctx.font='17px '+theme.font.family;ctx.fillStyle='#99acc7';ctx.fillText(s.mode==='ready'?'点击场地 / 空格发球 · 接球落点决定反弹方向':s.mode==='pause'?'按 P 或点击继续按钮':('本局得分 '+s.score+' · 点击场地或重新开始'),W/2,311);ctx.font='13px '+theme.font.family;ctx.fillText(s.mode==='ready'?'绿色 ↔ 道具可拓宽挡板 12 秒':'',W/2,344);}
};
const loop=(t:number)=>{const dt=last?Math.min((t-last)/1000,.05):0;last=t;acc+=dt;while(acc>=1/180){step(1/180);acc-=1/180;}draw();ui+=dt;if(ui>.09){ui=0;setHud({score:s.score,lives:s.lives,level:s.level,mode:s.mode,remaining:s.bricks.filter((b:Brick)=>b.hp>0).length,wide:Math.ceil(s.wide)});}raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);
return()=>{cancelAnimationFrame(raf);el.removeEventListener('pointermove',move);el.removeEventListener('pointerdown',down);el.removeEventListener('keydown',kd);el.removeEventListener('keyup',ku);el.removeEventListener('blur',blur);};
},[theme.font.family,theme.font.mono]);
return <Page title="打砖块" summary="反弹、瞄准、击碎。三道砖阵，三次机会。" width="wide" lang="zh-Hans"><div style={{display:'flex',flexWrap:'wrap',gap:20,alignItems:'center',color:theme.text.primary,fontFamily:theme.font.mono,marginBottom:16}}><span>得分 {hud.score.toString().padStart(6,'0')}</span><span>生命 {hud.lives} / 3</span><span>关卡 {hud.level} / 3</span><span style={{color:theme.text.secondary}}>剩余 {hud.remaining} 砖{hud.wide>0?' · 加宽 '+hud.wide+'s':''}</span></div><canvas ref={canvas} width={W} height={H} tabIndex={0} aria-label="打砖块游戏场地，点击聚焦后使用左右方向键和空格" style={{display:'block',width:'100%',height:'auto',aspectRatio:'3 / 2',borderRadius:16,touchAction:'none',outlineColor:theme.border.focus,border:'1px solid '+theme.border.default}}/><div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:16,marginBottom:16}}><Button label={hud.mode==='pause'?'继续':hud.mode==='win'||hud.mode==='lose'?'再来一局':'发射'} variant="primary" onClick={()=>{canvas.current?.focus();actions.current.launch();}} disabled={hud.mode==='play'}/><Button label={hud.mode==='pause'?'继续游戏':'暂停 · P'} onClick={()=>{actions.current.pause();canvas.current?.focus();}} disabled={hud.mode==='ready'||hud.mode==='win'||hud.mode==='lose'}/><Button label="重新开始" onClick={()=>{actions.current.restart();canvas.current?.focus();}}/></div><Text>鼠标移动或手指在场地上滑动控制挡板；也可先点场地，再按 ← →。空格 / 点击发球，P 暂停。球碰到挡板边缘时反弹更斜；接住绿色 ↔ 道具扩大挡板。第三关的装甲砖需要击中两次。</Text></Page>;
}
