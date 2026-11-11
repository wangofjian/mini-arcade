import {
  Page,
  Section,
  Text,
  Button,
  Segmented,
  useState,
  useRef,
  useGrokTheme,
  type PointerEvent,
  type KeyboardEvent
} from '../compat/grok-canvas';
type Block={id:string;name:string;x:number;y:number;w:number;h:number};
const b=(id:string,name:string,x:number,y:number,w:number,h:number):Block=>({id,name,x,y,w,h});
const sides=[b('z','张飞',0,0,1,2),b('h','黄忠',3,0,1,2),b('m','马超',0,2,1,2),b('y','赵云',3,2,1,2)];
const layouts:Block[][]=[
[b('c','曹操',1,0,2,2),...sides,b('g','关羽',1,2,2,1),b('a','兵一',1,3,1,1),b('d','兵二',2,3,1,1),b('e','兵三',0,4,1,1),b('f','兵四',3,4,1,1)],
[b('c','曹操',1,1,2,2),...sides,b('g','关羽',1,0,2,1),b('a','兵一',1,3,1,1),b('d','兵二',2,3,1,1),b('e','兵三',0,4,1,1),b('f','兵四',3,4,1,1)],
[b('c','曹操',1,2,2,2),...sides,b('g','关羽',1,0,2,1),b('a','兵一',1,1,1,1),b('d','兵二',2,1,1,1),b('e','兵三',0,4,1,1),b('f','兵四',3,4,1,1)]
];
function legal(bs:Block[],id:string,dx:number,dy:number){const p=bs.find((v:Block)=>v.id===id);if(!p)return false;const x=p.x+dx,y=p.y+dy;if(x<0||y<0||x+p.w>4||y+p.h>5)return false;return !bs.some((q:Block)=>q.id!==id&&x<q.x+q.w&&x+p.w>q.x&&y<q.y+q.h&&y+p.h>q.y);}
export default function App(){const t=useGrokTheme();const [level,setLevel]=useState('0');const [blocks,setBlocks]=useState<Block[]>(layouts[0]);const [history,setHistory]=useState<Block[][]>([]);const [selected,setSelected]=useState('c');const [won,setWon]=useState(false);const drag=useRef<{x:number;y:number;id:string}|null>(null);const board=useRef<HTMLDivElement>(null);
const reset=(v:string)=>{setLevel(v);setBlocks(layouts[Number(v)]);setHistory([]);setSelected('c');setWon(false);};
const move=(id:string,dx:number,dy:number)=>{if(won)return;const p=blocks.find((v:Block)=>v.id===id);if(p&&id==='c'&&p.x===1&&p.y===3&&dy===1){setHistory([...history,blocks]);setWon(true);return;}if(!legal(blocks,id,dx,dy))return;setHistory([...history,blocks]);setBlocks(blocks.map((v:Block)=>v.id===id?{...v,x:v.x+dx,y:v.y+dy}:v));};
const undo=()=>{if(!history.length)return;setBlocks(history[history.length-1]);setHistory(history.slice(0,-1));setWon(false);};
const key=(e:KeyboardEvent<HTMLDivElement>)=>{const d:Record<string,number[]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};if(d[e.key]){e.preventDefault();move(selected,d[e.key][0],d[e.key][1]);}};
const release=(e:PointerEvent<HTMLButtonElement>)=>{const start=drag.current;drag.current=null;if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.max(Math.abs(dx),Math.abs(dy))<16)return;if(Math.abs(dx)>Math.abs(dy))move(start.id,Math.sign(dx),0);else move(start.id,0,Math.sign(dy));};
return <Page title="华容道" summary="挪开将士，让曹操从底部中央逃出。每次移动一格计一步。" width="wide" lang="zh-Hans"><Section><Segmented value={level} onChange={reset} options={[{value:'0',label:'横刀立马 · 经典'},{value:'1',label:'移兵开路 · 入门'},{value:'2',label:'一步之遥 · 练习'}]}/><div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',margin:'18px 0',color:t.text.primary,fontFamily:t.font.family}}><span>步数 {history.length}</span><Button label="撤销" onClick={undo} disabled={!history.length}/><Button label="重置本关" onClick={()=>reset(level)}/><span>{won?'突围成功！可撤销重玩，或挑战经典。':'已选：'+(blocks.find((p:Block)=>p.id===selected)?.name||'曹操')}</span></div>
<div onKeyDown={key} tabIndex={0} aria-label="华容道棋盘，选择棋子后使用方向键" style={{outlineColor:t.border.focus,color:t.text.primary,fontFamily:t.font.family}}><div ref={board} style={{position:'relative',width:'100%',maxWidth:420,aspectRatio:'4 / 5',background:t.bg.subtle,border:'2px solid '+t.border.strong,borderRadius:8,touchAction:'none',userSelect:'none'}}>
{Array.from({length:20},(_:unknown,i:number)=><div key={i} style={{position:'absolute',left:(i%4)*25+'%',top:Math.floor(i/4)*20+'%',width:'25%',height:'20%',boxSizing:'border-box',border:'1px solid '+t.border.subtle}}/>)}
{blocks.map((p:Block)=><button key={p.id} aria-label={p.name+(selected===p.id?'，已选':'' )} onClick={()=>setSelected(p.id)} onPointerDown={(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();setSelected(p.id);drag.current={id:p.id,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.nativeEvent.pointerId);}} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} style={{position:'absolute',left:`calc(${p.x*25}% + 4px)`,top:`calc(${p.y*20}% + 4px)`,width:`calc(${p.w*25}% - 8px)`,height:`calc(${p.h*20}% - 8px)`,border:(selected===p.id?'3px':'1px')+' solid '+(selected===p.id?t.border.focus:t.border.strong),borderRadius:8,background:p.id==='c'?t.dataviz.categorical[0]+t.dataviz.bandAlpha:p.w===2?t.dataviz.categorical[1]+t.dataviz.bandAlpha:t.bg.elevated,color:t.text.primary,fontFamily:t.font.family,fontSize:p.id==='c'?28:18,fontWeight:600,cursor:won?'default':'grab',touchAction:'none',opacity:won&&p.id==='c'?0.35:1,transition:'left 120ms, top 120ms'}}>{p.name}</button>)}
</div><div style={{width:'50%',maxWidth:210,marginLeft:'min(25%, 105px)',textAlign:'center',borderTop:'4px solid '+t.dataviz.categorical[0],paddingTop:8,color:t.text.secondary}}>出口 ↓</div></div>
<div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:18}}>{([{label:'← 左',dx:-1,dy:0},{label:'↑ 上',dx:0,dy:-1},{label:'↓ 下',dx:0,dy:1},{label:'右 →',dx:1,dy:0}]).map((d:{label:string;dx:number;dy:number})=><Button key={d.label} label={d.label} onClick={()=>move(selected,d.dx,d.dy)} disabled={won||!(legal(blocks,selected,d.dx,d.dy)||(selected==='c'&&blocks[0].x===1&&blocks[0].y===3&&d.dy===1))}/>)}</div></Section><Section heading="玩法"><Text>拖动棋子，每次滑动移动一格；也可点选棋子，再按方向按钮或键盘方向键。棋子不能旋转、重叠或穿越其他棋子。曹操到达底部中央后，再向下移动一次即可逃出。</Text><Text>经典关卡为横刀立马；另两关是用于熟悉操作的简化残局。切换关卡会清空步数和撤销记录。</Text></Section></Page>;
}
