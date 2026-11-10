import { Page, Text, Button, useEffect, useRef, useState, useGrokTheme, PointerEvent } from 'grok/canvas';
type Drop={x:number;y:number;v:number;kind:number;spin:number};
type Spark={x:number;y:number;vx:number;vy:number;t:number;color:string};
export default function App(){
 const theme=useGrokTheme(); const cv=useRef<HTMLCanvasElement|null>(null); const keys=useRef({left:false,right:false});
 const game=useRef({x:400,score:0,lives:5,time:0,spawn:0,drops:[] as Drop[],sparks:[] as Spark[],status:'ready',best:0,combo:0,flash:0});
 const [hud,setHud]=useState({score:0,lives:5,best:0,level:1,combo:0,status:'ready'});
 const sync=()=>{const g=game.current;setHud({score:g.score,lives:g.lives,best:g.best,level:1+Math.floor(g.time/18),combo:g.combo,status:g.status});};
 const start=()=>{const g=game.current;Object.assign(g,{x:400,score:0,lives:5,time:0,spawn:0.3,drops:[],sparks:[],status:'playing',combo:0,flash:0}); keys.current={left:false,right:false};sync();};
 const pause=()=>{const g=game.current;if(g.status==='playing')g.status='paused';else if(g.status==='paused')g.status='playing';sync();};
 useEffect(()=>{
  const canvas=cv.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
  const g=game.current;let frame=0,last=0,hudTime=0;
  const down=(e:globalThis.KeyboardEvent)=>{if(['ArrowLeft','ArrowRight',' ','a','d','A','D','p','P'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')keys.current.left=true;if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')keys.current.right=true;if(!e.repeat&&(e.key===' '||e.key.toLowerCase()==='p')){if(g.status==='ready'||g.status==='over')start();else pause();}};
  const up=(e:globalThis.KeyboardEvent)=>{if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')keys.current.left=false;if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')keys.current.right=false;};
  const blur=()=>{keys.current={left:false,right:false};if(g.status==='playing'){g.status='paused';sync();}};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  const burst=(x:number,y:number,color:string)=>{for(let i=0;i<14;i++)g.sparks.push({x,y,vx:(Math.random()-.5)*220,vy:-Math.random()*180,t:.6,color});};
  const draw=(now:number)=>{const dt=Math.min((now-last)/1000||0,.035);last=now;
   if(g.status==='playing'){
    g.time+=dt;g.flash=Math.max(0,g.flash-dt);const level=1+Math.floor(g.time/18);
    g.x=Math.max(48,Math.min(752,g.x+((keys.current.right?1:0)-(keys.current.left?1:0))*560*dt));
    g.spawn-=dt;if(g.spawn<=0){const r=Math.random();g.drops.push({x:28+Math.random()*744,y:-30,v:125+Math.min(level,16)*18+Math.random()*65,kind:r<.14?4:r<.24?5:Math.floor(Math.random()*4),spin:Math.random()*6});g.spawn=Math.max(.22,.72-level*.035);}
    for(let i=g.drops.length-1;i>=0;i--){const d=g.drops[i];const old=d.y;d.y+=d.v*dt;d.spin+=dt;
     const hit=old<=466&&d.y>=440&&Math.abs(d.x-g.x)<57;
     if(hit){if(d.kind>=4){g.lives--;g.combo=0;g.flash=.22;burst(d.x,455,'#ef6674');}else{g.combo++;g.score+=10+(Math.min(5,Math.floor(g.combo/5)))*2;g.best=Math.max(g.best,g.score);burst(d.x,455,['#ff6978','#ffc65c','#a4df6d','#b397fa'][d.kind]);}g.drops.splice(i,1);}else if(d.y>555){if(d.kind<4){g.lives--;g.combo=0;}g.drops.splice(i,1);}
     if(g.lives<=0){g.lives=0;g.status='over';sync();break;}
    }
    g.sparks=g.sparks.filter((p:Spark)=>p.t>0);g.sparks.forEach((p:Spark)=>{p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=350*dt;});
   }
   ctx.clearRect(0,0,800,540);ctx.fillStyle='#10283a';ctx.fillRect(0,0,800,540);
   for(let i=0;i<26;i++){ctx.fillStyle=i%2?'#1e4050':'#254b55';ctx.beginPath();ctx.arc((i*137)%820,((i*61)%360),2,0,Math.PI*2);ctx.fill();}
   ctx.fillStyle='#234b42';ctx.beginPath();ctx.moveTo(0,440);ctx.quadraticCurveTo(200,370,400,445);ctx.quadraticCurveTo(650,380,800,440);ctx.lineTo(800,540);ctx.lineTo(0,540);ctx.fill();ctx.fillStyle='#193a35';ctx.fillRect(0,500,800,40);
   for(const d of g.drops){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(Math.sin(d.spin)*.16);
    if(d.kind===4){ctx.fillStyle='#141b24';ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d3ac79';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(6,-17);ctx.quadraticCurveTo(16,-35,21,-22);ctx.stroke();ctx.fillStyle='#ffb15f';ctx.beginPath();ctx.arc(22,-23,4,0,7);ctx.fill();ctx.fillStyle='#e8edf0';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('×',0,6);
    }else{ctx.fillStyle=d.kind===5?'#7f8460':['#ff6978','#ffc65c','#a4df6d','#b397fa'][d.kind];ctx.beginPath();ctx.ellipse(0,0,18,20,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.ellipse(-6,-6,4,7,.4,0,7);ctx.fill();ctx.fillStyle='#66b87b';ctx.beginPath();ctx.ellipse(6,-22,9,4,-.5,0,7);ctx.fill();if(d.kind===5){ctx.fillStyle='#313a29';ctx.beginPath();ctx.arc(-5,3,5,0,7);ctx.arc(8,-3,4,0,7);ctx.fill();}}
    ctx.restore();}
   ctx.save();ctx.translate(g.x,460);ctx.strokeStyle='#dba365';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-4,32,Math.PI,0);ctx.stroke();ctx.fillStyle='#c68a4f';ctx.beginPath();ctx.moveTo(-47,-8);ctx.lineTo(47,-8);ctx.lineTo(34,37);ctx.lineTo(-34,37);ctx.closePath();ctx.fill();ctx.strokeStyle='#885730';ctx.lineWidth=2;for(let i=-30;i<=30;i+=15){ctx.beginPath();ctx.moveTo(i,-5);ctx.lineTo(i*.75,34);ctx.stroke();}for(let y=6;y<34;y+=12){ctx.beginPath();ctx.moveTo(-41,y);ctx.lineTo(41,y);ctx.stroke();}ctx.fillStyle='#e8b778';ctx.fillRect(-49,-11,98,9);ctx.restore();
   for(const p of g.sparks){ctx.globalAlpha=Math.max(0,p.t/.6);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,5,5);}ctx.globalAlpha=1;
   if(g.flash>0){ctx.fillStyle='#ef667444';ctx.fillRect(0,0,800,540);}
   if(g.status!=='playing'){ctx.fillStyle='#071722cc';ctx.fillRect(0,0,800,540);ctx.textAlign='center';ctx.fillStyle='#f1f5ed';ctx.font='bold 36px sans-serif';ctx.fillText(g.status==='ready'?'果园接力':g.status==='paused'?'已暂停':'本轮结束',400,225);ctx.font='19px sans-serif';ctx.fillStyle='#bdd1cb';ctx.fillText(g.status==='ready'?'接住新鲜水果，避开炸弹和坏果':g.status==='paused'?'点击继续，或按空格返回果园':'得分 '+g.score+' · 最高 '+g.best,400,268);ctx.font='16px sans-serif';ctx.fillText(g.status==='ready'?'点击开始按钮 / 按空格':g.status==='over'?'点击重新开始，再挑战一次':'休息一下，水果也在等你',400,305);}
   if(now-hudTime>120){sync();hudTime=now;}frame=requestAnimationFrame(draw);
  };frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
 },[]);
 const move=(e:PointerEvent<HTMLCanvasElement>)=>{if(e.buttons===0&&e.nativeEvent.pointerType==='mouse')return;const rect=e.currentTarget.getBoundingClientRect();game.current.x=Math.max(48,Math.min(752,(e.clientX-rect.left)/rect.width*800));};
 const controlStyle={background:theme.bg.elevated,color:theme.text.primary,border:'1px solid '+theme.border.default,borderRadius:8,padding:'14px 30px',touchAction:'none',fontFamily:theme.font.family,fontSize:20};
 return <Page title="接水果" summary="果园接力：接住好果，躲开危险。坚持越久，落下的速度越快。" width="wide" lang="zh-Hans">
 <div style={{display:'flex',flexWrap:'wrap',gap:20,color:theme.text.primary,fontFamily:theme.font.family,paddingBottom:14}} aria-live="polite"><span>得分 {hud.score}</span><span>生命 {hud.lives} / 5</span><span>等级 {hud.level}</span><span>连接 {hud.combo}</span><span>本页最高 {hud.best}</span></div>
 <canvas ref={cv} width={800} height={540} aria-label="接水果游戏区，使用左右方向键或手指拖动篮子" onPointerDown={(e:PointerEvent<HTMLCanvasElement>)=>{e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);move(e);}} onPointerMove={move} style={{display:'block',width:'100%',height:'auto',borderRadius:12,touchAction:'none'}} />
 <div style={{display:'flex',flexWrap:'wrap',gap:12,paddingTop:16,paddingBottom:14}}><Button label={hud.status==='ready'?'开始游戏':'重新开始'} onClick={start} variant="primary"/><Button label={hud.status==='paused'?'继续':'暂停'} onClick={pause} disabled={hud.status==='ready'||hud.status==='over'}/><button style={controlStyle} aria-label="向左" onPointerDown={(e:PointerEvent<HTMLButtonElement>)=>{e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);keys.current.left=true;}} onPointerUp={()=>{keys.current.left=false;}} onPointerCancel={()=>{keys.current.left=false;}} onLostPointerCapture={()=>{keys.current.left=false;}}>←</button><button style={controlStyle} aria-label="向右" onPointerDown={(e:PointerEvent<HTMLButtonElement>)=>{e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);keys.current.right=true;}} onPointerUp={()=>{keys.current.right=false;}} onPointerCancel={()=>{keys.current.right=false;}} onLostPointerCapture={()=>{keys.current.right=false;}}>→</button></div>
 <Text>方向键 / A、D 移动，空格 / P 暂停。触屏可拖动篮子或按住方向按钮。鲜果加分，连续接果有奖励；漏接鲜果、接到炸弹或带黑斑的坏果均扣一条生命。最高分保留在当前打开的页面中。</Text>
 </Page>;
}
