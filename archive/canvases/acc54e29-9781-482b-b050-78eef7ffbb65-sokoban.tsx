import { Page, Section, Text, Button, Select, useReducer, useEffect, useGrokTheme, type CSSProperties } from 'grok/canvas';

const LEVELS = [
 {name:'初次搬运',map:['######','#    #','# @$ .#','#    #','######']},
 {name:'绕过墙角',map:['#######','#  .  #','#  $  #','# #   #','# @   #','#######']},
 {name:'先左后右',map:['########','#   .  #','# # $  #','# . $@ #','#      #','########']},
 {name:'双箱练习',map:['#######','# . . #','# $ $ #','#  @  #','#######']},
 {name:'三路运输',map:['########','# . . .#','# $ $ $#','#   @  #','#      #','########']},
 {name:'中央立柱',map:['#########','# . . . #','#   #   #','# $ $ $ #','#   @   #','#       #','#########']},
 {name:'错位仓库',map:['########','#  . . #','#  #   #','# $$ $ #','# .  @ #','#      #','########']},
 {name:'终极调度',map:['#########','# . . . #','#   #   #','# $ $ $ #','# . $ @ #','#       #','#########']}
];
type Board = {p:number; boxes:number[]; moves:number; pushes:number};
type State = {level:number; board:Board; history:Board[]; best:(number|null)[]};
type Action = {type:'move';dx:number;dy:number}|{type:'undo'}|{type:'load';level:number};
function parse(level:number){
 const map=LEVELS[level].map,w=map[0].length; const walls:number[]=[],goals:number[]=[],boxes:number[]=[];let p=0;
 map.forEach((row:string,y:number)=>row.split('').forEach((c:string,x:number)=>{const k=y*w+x;if(c==='#')walls.push(k);if(c==='.')goals.push(k);if(c==='$')boxes.push(k);if(c==='@')p=k;}));
 return {w,h:map.length,walls,goals,board:{p,boxes,moves:0,pushes:0}};
}
function won(level:number,b:Board){return parse(level).goals.every((g:number)=>b.boxes.includes(g));}
function reducer(s:State,a:Action):State {
 if(a.type==='load')return {...s,level:a.level,board:parse(a.level).board,history:[]};
 if(a.type==='undo'){if(!s.history.length)return s;return {...s,board:s.history[s.history.length-1],history:s.history.slice(0,-1)};}
 if(won(s.level,s.board))return s;
 const map=parse(s.level),b=s.board,step=a.dx+a.dy*map.w,next=b.p+step;
 if(map.walls.includes(next)||next<0||next>=map.w*map.h)return s;
 let boxes=b.boxes.slice(),pushes=b.pushes;
 if(boxes.includes(next)){const dest=next+step;if(map.walls.includes(dest)||boxes.includes(dest)||dest<0||dest>=map.w*map.h)return s;boxes=boxes.map((v:number)=>v===next?dest:v);pushes++;}
 const board={p:next,boxes,moves:b.moves+1,pushes};const best=s.best.slice();
 if(won(s.level,board))best[s.level]=Math.min(best[s.level]??Infinity,board.moves);
 return {...s,board,history:[...s.history,b],best};
}
export default function App(){
 const theme=useGrokTheme();
 const [s,dispatch]=useReducer(reducer,{level:0,board:parse(0).board,history:[],best:Array(8).fill(null)} as State);
 const map=parse(s.level),clear=won(s.level,s.board),placed=map.goals.filter((g:number)=>s.board.boxes.includes(g)).length;
 useEffect(()=>{
  const handler=(e:globalThis.KeyboardEvent)=>{
   const tag=(e.target as HTMLElement|null)?.tagName;
   if(tag==='SELECT'||tag==='INPUT'||tag==='TEXTAREA'||e.ctrlKey||e.metaKey||e.altKey)return;
   const dirs:Record<string,[number,number]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
   const key=e.key.length===1?e.key.toLowerCase():e.key;
   if(dirs[key]){e.preventDefault();dispatch({type:'move',dx:dirs[key][0],dy:dirs[key][1]});}
   else if(key==='z'||key==='u'){e.preventDefault();dispatch({type:'undo'});}
  };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[]);
 const neutral:CSSProperties={color:theme.text.secondary,fontFamily:theme.font.family};
 const move=(dx:number,dy:number)=>dispatch({type:'move',dx,dy});
 return <Page title="推箱子" summary="小仓库，大智慧。八关递进挑战，把每只箱子送到圆形目标。" width="wide" lang="zh-Hans">
  <Section>
   <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:16}}>
    <Select label="选择关卡" value={String(s.level)} options={LEVELS.map((l:{name:string;map:string[]},i:number)=>({value:String(i),label:`${s.best[i]!==null?'✓ ':''}${String(i+1).padStart(2,'0')} · ${l.name}`}))} onChange={(v:string)=>dispatch({type:'load',level:Number(v)})}/>
    <div style={{display:'flex',flexWrap:'wrap',gap:24,...neutral}}>
     <div>移动 <strong style={{color:theme.text.primary,fontSize:26}}>{s.board.moves}</strong></div>
     <div>推箱 <strong style={{color:theme.text.primary,fontSize:26}}>{s.board.pushes}</strong></div>
     <div>本次最佳 <strong style={{color:theme.text.primary,fontSize:26}}>{s.best[s.level]??'—'}</strong></div>
    </div>
   </div>
  </Section>
  <Section heading={`${String(s.level+1).padStart(2,'0')} / 08 · ${LEVELS[s.level].name}`}>
   <div style={{display:'flex',flexWrap:'wrap',gap:28,alignItems:'start'}}>
    <div style={{flex:'2 1 300px',minWidth:0}}>
     <div role="img" aria-label={`推箱子棋盘，已完成 ${placed}/${map.goals.length} 个目标`} style={{display:'grid',gridTemplateColumns:`repeat(${map.w},minmax(0,1fr))`,gap:3,padding:8,background:theme.bg.subtle,border:`1px solid ${theme.border.default}`,borderRadius:12}}>
      {Array.from({length:map.w*map.h},(_:unknown,k:number)=>{
       const wall=map.walls.includes(k),goal=map.goals.includes(k),box=s.board.boxes.includes(k),player=s.board.p===k;
       return <div key={k} style={{aspectRatio:'1',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',background:wall?theme.fill.secondary:theme.bg.base,border:wall?`1px solid ${theme.border.strong}`:`1px solid ${theme.border.subtle}`,borderRadius:4}}>
        {wall&&<div style={{position:'absolute',inset:'20% 8%',borderTop:`1px solid ${theme.border.strong}`,borderBottom:`1px solid ${theme.border.strong}`}}/>}
        {goal&&!box&&<div style={{width:'36%',height:'36%',borderRadius:'50%',border:`3px solid ${theme.dataviz.categorical[2]}`,boxSizing:'border-box'}}/>}
        {box&&<div style={{width:'76%',height:'76%',borderRadius:5,position:'relative',background:goal?theme.dataviz.categorical[2]:theme.dataviz.categorical[1],display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="80%" height="80%" viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="3" width="34" height="34" rx="2" fill="none" stroke={theme.bg.base} strokeWidth="2"/>{goal?<path d="M10 21 L17 28 L30 12" fill="none" stroke={theme.bg.base} strokeWidth="4"/>:<path d="M4 4 L36 36 M36 4 L4 36" stroke={theme.bg.base} strokeWidth="2"/>}</svg>
        </div>}
        {player&&<div style={{width:'70%',height:'70%',borderRadius:'50%',background:theme.dataviz.categorical[0],display:'flex',alignItems:'center',justifyContent:'center',gap:'14%'}}><span style={{width:'12%',height:'15%',background:theme.bg.base,borderRadius:'50%'}}/><span style={{width:'12%',height:'15%',background:theme.bg.base,borderRadius:'50%'}}/></div>}
       </div>;
      })}
     </div>
     <div style={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',gap:8,marginTop:12,...neutral}}><span>目标完成 {placed} / {map.goals.length}</span><span>已通关 {s.best.filter((b:number|null)=>b!==null).length} / 8</span></div>
    </div>
    <div style={{flex:'1 1 220px',minWidth:0,display:'grid',gap:20}}>
     <div aria-live="polite" style={{color:theme.text.primary,minHeight:70}}>
      <div style={{fontSize:24,fontWeight:600}}>{clear?(s.level===7?'全部挑战完成！':'漂亮，仓库整理完毕！'):'每一步，都要留条退路。'}</div>
      <div style={{...neutral,marginTop:8}}>{clear?`本关 ${s.board.moves} 步 / ${s.board.pushes} 次推箱。${s.level===7?'可以重新挑战，刷新最佳步数。':'准备好进入下一间仓库了吗？'}`:'箱子只能推，不能拉。陷入死角时，撤销一步就好。'}</div>
     </div>
     {clear&&<Button label={s.level===7?'回到第 1 关':'下一关 →'} variant="primary" onClick={()=>dispatch({type:'load',level:(s.level+1)%8})}/>}
     <div style={{display:'flex',flexWrap:'wrap',gap:8}}><Button label="撤销 · Z" disabled={!s.history.length} onClick={()=>dispatch({type:'undo'})}/><Button label="重新开始" onClick={()=>dispatch({type:'load',level:s.level})}/></div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,touchAction:'manipulation'}}>
      <div/><Button label="↑" onClick={()=>move(0,-1)} disabled={clear}/><div/>
      <Button label="←" onClick={()=>move(-1,0)} disabled={clear}/><Button label="↓" onClick={()=>move(0,1)} disabled={clear}/><Button label="→" onClick={()=>move(1,0)} disabled={clear}/>
     </div>
     <div style={{...neutral,fontSize:14,lineHeight:1.8}}>蓝色圆点：你<br/>交叉木箱：待搬运箱子<br/>空心圆：目标位置<br/>对勾箱子：已到位</div>
    </div>
   </div>
  </Section>
  <Section heading="怎么玩">
   <Text>方向键或 WASD 移动，也可以点方向按钮。一次只能推一个箱子；所有箱子到达目标即可通关。按 Z / U 撤销，移动被墙挡住不计步。关卡随时可选，最佳步数仅保留在当前页面会话，刷新后重置。</Text>
  </Section>
 </Page>;
}
