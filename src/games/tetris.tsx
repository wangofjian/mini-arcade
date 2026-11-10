import {
  Page,
  Text,
  Button,
  useGrokTheme,
  useState,
  useEffect,
  useRef,
  type KeyboardEvent
} from '../compat/grok-canvas';

type Kind = 'I'|'O'|'T'|'S'|'Z'|'J'|'L';
type Piece = {kind:Kind; m:number[][]; x:number; y:number};
type Game = {board:number[][]; p:Piece; queue:Kind[]; bag:Kind[]; hold:Kind|null; held:boolean; score:number; lines:number; level:number; status:'ready'|'running'|'paused'|'over'; fall:number; ground:number; resets:number; message:string};
const kinds:Kind[]=['I','O','T','S','Z','J','L'];
const shapes:Record<Kind,number[][]>={I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1],[0,0,0]],S:[[0,1,1],[1,1,0],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]]};
const colors=['','#46dcf5','#ffdc60','#ba89ff','#65e6a1','#ff728e','#729bff','#ffae65'];
function piece(k:Kind):Piece{return {kind:k,m:shapes[k].map((r:number[])=>r.slice()),x:k==='O'?4:3,y:-1};}
function take(g:Game):Kind{if(!g.bag.length){g.bag=kinds.slice();for(let i=6;i>0;i--){const j=Math.floor(Math.random()*(i+1));[g.bag[i],g.bag[j]]=[g.bag[j],g.bag[i]];}}return g.bag.pop()!;}
function fresh():Game{const g:Game={board:Array.from({length:20},()=>Array(10).fill(0)),p:piece('T'),queue:[],bag:[],hold:null,held:false,score:0,lines:0,level:1,status:'ready',fall:0,ground:0,resets:0,message:'七袋随机 · 幽灵落点 · 暂存方块'};g.p=piece(take(g));g.queue=Array.from({length:3},()=>take(g));return g;}
function fits(g:Game,p:Piece):boolean{for(let y=0;y<p.m.length;y++)for(let x=0;x<p.m[y].length;x++)if(p.m[y][x]){const xx=p.x+x,yy=p.y+y;if(xx<0||xx>=10||yy>=20||(yy>=0&&g.board[yy][xx]))return false;}return true;}
function spawn(g:Game,k?:Kind){g.p=piece(k??g.queue.shift()!);if(!k)g.queue.push(take(g));g.fall=0;g.ground=0;g.resets=0;if(!fits(g,g.p)){g.status='over';g.message='再来一局，挑战自己的分数。';}}
function lock(g:Game){let above=false;g.p.m.forEach((r:number[],y:number)=>r.forEach((v:number,x:number)=>{if(v){const yy=g.p.y+y;if(yy<0)above=true;else g.board[yy][g.p.x+x]=kinds.indexOf(g.p.kind)+1;}}));if(above){g.status='over';return;}const keep=g.board.filter((r:number[])=>!r.every(Boolean));const n=20-keep.length;if(n){g.score+=([0,100,300,500,800][n]??800)*g.level;g.lines+=n;g.level=1+Math.floor(g.lines/10);g.message=n===4?'TETRIS！四行齐消':`消除 ${n} 行！`;}g.board=[...Array.from({length:n},()=>Array(10).fill(0)),...keep];g.held=false;spawn(g);}
function move(g:Game,dx:number,dy:number):boolean{const p={...g.p,x:g.p.x+dx,y:g.p.y+dy};if(!fits(g,p))return false;g.p=p;if(dx&&g.resets<15){g.ground=0;g.resets++;}return true;}
function rotate(g:Game,cw:boolean){if(g.p.kind==='O')return;const m=g.p.m,n=m.length;const rotated=Array.from({length:n},(_:unknown,y:number)=>Array.from({length:n},(_:unknown,x:number)=>cw?m[n-1-x][y]:m[x][n-1-y]));const kicks=[[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1],[0,-2]];for(const [dx,dy] of kicks){const p={...g.p,m:rotated,x:g.p.x+dx,y:g.p.y+dy};if(fits(g,p)){g.p=p;if(g.resets<15){g.ground=0;g.resets++;}return;}}}

export default function App(){
 const theme=useGrokTheme();
 const boardRef=useRef<HTMLCanvasElement|null>(null),previewRef=useRef<HTMLCanvasElement|null>(null),rootRef=useRef<HTMLDivElement|null>(null);
 const game=useRef<Game>(fresh());const down=useRef(false);const [,refresh]=useState(0);const update=()=>refresh((v:number)=>v+1);
 const act=(a:string)=>{const g=game.current;if(a==='restart'){game.current=fresh();game.current.status='running';down.current=false;}else if(a==='pause'){if(g.status==='ready'||g.status==='paused')g.status='running';else if(g.status==='running')g.status='paused';down.current=false;}else if(g.status==='running'){if(a==='left')move(g,-1,0);if(a==='right')move(g,1,0);if(a==='down'&&move(g,0,1))g.score++;if(a==='cw')rotate(g,true);if(a==='ccw')rotate(g,false);if(a==='drop'){let d=0;while(move(g,0,1))d++;g.score+=d*2;lock(g);}if(a==='hold'&&!g.held){const old=g.hold;g.hold=g.p.kind;spawn(g,old??undefined);g.held=true;}}update();rootRef.current?.focus({preventScroll:true});};
 useEffect(()=>{
 let raf=0,last=0;
 const block=(c:CanvasRenderingContext2D,x:number,y:number,size:number,color:string,ghost=false)=>{if(ghost){c.strokeStyle=color;c.lineWidth=2;c.strokeRect(x+3,y+3,size-6,size-6);return;}c.fillStyle=color;c.fillRect(x+1,y+1,size-2,size-2);c.fillStyle='rgba(255,255,255,0.25)';c.fillRect(x+3,y+3,size-6,3);c.fillStyle='rgba(0,0,0,0.17)';c.fillRect(x+3,y+size-6,size-6,3);};
 const draw=()=>{const g=game.current,c=boardRef.current?.getContext('2d');if(c){c.fillStyle='#101723';c.fillRect(0,0,300,600);c.strokeStyle='#202b3b';c.lineWidth=1;for(let x=0;x<=10;x++){c.beginPath();c.moveTo(x*30,0);c.lineTo(x*30,600);c.stroke();}for(let y=0;y<=20;y++){c.beginPath();c.moveTo(0,y*30);c.lineTo(300,y*30);c.stroke();}g.board.forEach((r:number[],y:number)=>r.forEach((v:number,x:number)=>{if(v)block(c,x*30,y*30,30,colors[v]);}));if(g.status!=='over'){let ghost={...g.p};while(fits(g,{...ghost,y:ghost.y+1}))ghost={...ghost,y:ghost.y+1};for(const [p,isGhost] of [[ghost,true],[g.p,false]] as [Piece,boolean][]){p.m.forEach((r:number[],y:number)=>r.forEach((v:number,x:number)=>{if(v&&p.y+y>=0)block(c,(p.x+x)*30,(p.y+y)*30,30,colors[kinds.indexOf(p.kind)+1],isGhost);}));}}}
 const p=previewRef.current?.getContext('2d');if(p){p.fillStyle='#101723';p.fillRect(0,0,180,330);p.fillStyle='#bdcbe0';p.font='13px sans-serif';p.fillText('NEXT / 接下来',14,24);const mini=(k:Kind,y:number)=>{const m=shapes[k];m.forEach((r:number[],yy:number)=>r.forEach((v:number,x:number)=>{if(v)block(p,40+x*21,y+yy*21,21,colors[kinds.indexOf(k)+1]);}));};g.queue.forEach((k:Kind,i:number)=>mini(k,34+i*65));p.fillStyle='#bdcbe0';p.fillText('HOLD / 暂存 · C',14,253);if(g.hold)mini(g.hold,265);else{p.fillStyle='#718099';p.fillText('按 C 暂存当前方块',14,291);}}
 };
 const tick=(now:number)=>{const g=game.current;const dt=last?Math.min(now-last,80):0;last=now;if(g.status==='running'){g.fall+=dt;const interval=down.current?35:Math.max(65,850*Math.pow(0.8,g.level-1));if(g.fall>=interval){g.fall%=interval;if(move(g,0,1)&&down.current){g.score++;update();}}if(!fits(g,{...g.p,y:g.p.y+1})){g.ground+=dt;if(g.ground>=420){lock(g);update();}}else g.ground=0;}draw();raf=requestAnimationFrame(tick);};
 const blur=()=>{down.current=false;if(game.current.status==='running'){game.current.status='paused';update();}};
 window.addEventListener('blur',blur);const visibility=()=>{if(document.hidden)blur();};document.addEventListener('visibilitychange',visibility);raf=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(raf);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 const key=(e:KeyboardEvent<HTMLDivElement>)=>{const k=e.key.toLowerCase();const map:Record<string,string>={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'cw',w:'cw',x:'cw',z:'ccw',q:'ccw',' ':'drop',p:'pause',r:'restart',c:'hold',shift:'hold',enter:'pause'};if(k==='arrowdown'||k==='s'){e.preventDefault();down.current=true;return;}if(map[k]){e.preventDefault();if(e.repeat&&['drop','pause','restart','hold','cw','ccw'].includes(map[k]))return;act(map[k]);}};
 const g=game.current;const btn={border:`1px solid ${theme.border.default}`,background:theme.bg.subtle,color:theme.text.primary,padding:'12px 16px',borderRadius:8,fontFamily:theme.font.family,fontSize:15,cursor:'pointer',touchAction:'manipulation' as const};
 return <Page title="俄罗斯方块" summary="一局经典方块，随时开玩。七袋随机、落点预览、方块暂存与逐级加速。" width="wide" lang="zh-Hans">
 <Text>先点「开始游戏」或棋盘获取键盘焦点。填满一行即可消除；每消除 10 行升一级。进度仅保留在本次页面中。</Text>
 <div ref={rootRef} tabIndex={0} onKeyDown={key} onKeyUp={(e:KeyboardEvent<HTMLDivElement>)=>{if(['arrowdown','s'].includes(e.key.toLowerCase())){e.preventDefault();down.current=false;}}} onBlur={()=>{down.current=false;}} style={{outline:'none',color:theme.text.primary,fontFamily:theme.font.family}}>
 <div style={{display:'flex',flexWrap:'wrap',gap:24,alignItems:'flex-start',marginTop:20}}>
 <div style={{flex:'0 1 300px',width:'100%',position:'relative',lineHeight:0,border:`1px solid ${theme.border.strong}`,borderRadius:8,overflow:'hidden'}}>
 <canvas ref={boardRef} width={300} height={600} aria-label="俄罗斯方块 10 列 20 行棋盘" onClick={()=>rootRef.current?.focus({preventScroll:true})} style={{width:'100%',display:'block',touchAction:'none'}} />
 {g.status!=='running'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:theme.bg.base+'e8',lineHeight:1.6}}><div style={{textAlign:'center',padding:20,color:theme.text.primary,background:theme.bg.base}}><div style={{fontSize:26,fontWeight:600,marginBottom:12}}>{g.status==='over'?'游戏结束':g.status==='paused'?'已暂停':'准备好了吗？'}</div><div style={{fontSize:14,marginBottom:20,color:theme.text.secondary}}>{g.status==='over'?`最终得分 ${g.score.toLocaleString()} · 消除 ${g.lines} 行`:g.status==='paused'?'喘口气，再挑战下一行。':'把方块拼成完整的一行。'}</div><Button label={g.status==='over'?'再来一局':g.status==='paused'?'继续游戏':'开始游戏'} variant="primary" onClick={()=>act(g.status==='over'?'restart':'pause')}/></div></div>}
 </div>
 <div style={{flex:'1 1 170px',minWidth:0}}>
 <div style={{display:'flex',gap:24,flexWrap:'wrap',marginBottom:20}}>{[['得分',g.score.toLocaleString()],['消行',String(g.lines)],['等级',String(g.level)]].map(([label,value]:string[])=><div key={label}><div style={{fontSize:13,color:theme.text.secondary}}>{label}</div><div style={{fontSize:30,fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{value}</div></div>)}</div>
 <canvas ref={previewRef} width={180} height={330} aria-label={`接下来：${g.queue.join('、')}；暂存：${g.hold??'无'}`} style={{width:'100%',maxWidth:180,borderRadius:8,display:'block'}}/>
 <div aria-live="polite" style={{fontSize:14,color:theme.text.secondary,margin:'16px 0'}}>{g.message}</div>
 <div style={{display:'flex',flexWrap:'wrap',gap:8}}><Button label={g.status==='running'?'暂停 P':'继续 / 开始 P'} onClick={()=>act('pause')} disabled={g.status==='over'}/><Button label="重新开始 R" onClick={()=>act('restart')}/></div>
 </div></div>
 <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:20}}>{[['left','← 左移'],['right','右移 →'],['ccw','↶ 逆旋'],['cw','顺旋 ↷'],['down','↓ 软降'],['drop','硬降 ⤓'],['hold','暂存 C']].map(([action,label]:string[])=><button key={action} type="button" style={btn} onClick={()=>act(action)} disabled={g.status!=='running'}>{label}</button>)}</div>
 <div style={{marginTop:18,fontSize:13,lineHeight:1.9,color:theme.text.secondary}}>← → / A D：移动　↓ / S：按住软降　↑ / W / X：顺时针　Z / Q：逆时针<br/>空格：直接落底　C / Shift：暂存　P：暂停　R：重开<br/>消除 1 / 2 / 3 / 4 行：100 / 300 / 500 / 800 × 当前等级；软降每格 1 分，硬降每格 2 分。离开窗口会自动暂停。</div>
 </div></Page>;
}
