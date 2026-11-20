import {describe,it,expect} from 'vitest';
import {createGo,place,pass,resign,group,hintGo,aiGo,score} from './go';
describe('九路围棋',()=>{
 it('合法落子轮转、拒绝占用越界和终局落子',()=>{const s=createGo(),n=place(s,40)!;expect(n.turn).toBe(2);expect(s.board[40]).toBe(0);expect(place(n,40)).toBeNull();for(const i of [-1,81,1.5])expect(place(s,i)).toBeNull();expect(place(resign(s),1)).toBeNull();});
 it('提子与气、禁自杀',()=>{const s=createGo();s.board[10]=2;for(const i of [1,9,19])s.board[i]=1;const n=place(s,11)!;expect(n.board[10]).toBe(0);expect(n.captures[1]).toBe(1);expect(group(n.board,11).liberties.length).toBeGreaterThan(0);const q=createGo();q.turn=2;for(const i of [1,9,11,19])q.board[i]=1;expect(place(q,10)).toBeNull();});
 it('提整块多子，不拒绝通过提子取得气',()=>{const s=createGo();s.board[10]=2;s.board[11]=2;for(const i of [1,2,9,12,19])s.board[i]=1;const n=place(s,20)!;expect(n.captures[1]).toBe(2);expect(n.board[10]).toBe(0);expect(n.board[11]).toBe(0);});
 it('简单劫禁止立即回提；两次pass结束',()=>{const s=createGo();for(const i of [1,9,19])s.board[i]=1;for(const i of [10,2,20,12])s.board[i]=2;const n=place(s,11)!;expect(n.captures[1]).toBe(1);expect(place(n,10)).toBeNull();expect(pass(pass(n)).ended).toBe(true);});
 it('简化面积+贴目，空盘中立；认输正确胜方',()=>{const s=createGo();expect(score(s)).toEqual({black:0,white:6.5,winner:2});s.board[0]=1;s.board[80]=2;expect(score(s)).toEqual({black:1,white:7.5,winner:2});expect(score(resign(s)).winner).toBe(2);});
 it('提示来自合法落子且不改盘，提子理由',()=>{const s=createGo();s.board[10]=2;for(const i of [1,9,19])s.board[i]=1;const copy=JSON.stringify(s),h=hintGo(s);expect(h.i).toBe(11);expect(h.reason).toMatch(/提子/);expect(place(s,h.i!)).not.toBeNull();expect(JSON.stringify(s)).toBe(copy);});
 it('AI每步合法不修改输入，完整对局最终双停',()=>{let s=createGo();for(let i=0;i<180&&!s.ended;i++){const snapshot=JSON.stringify(s),n=aiGo(s);expect(JSON.stringify(s)).toBe(snapshot);expect(n.ply).toBe(s.ply+1);if(n.board.some((x,j)=>x!==s.board[j])){expect(n.passes).toBe(0);}s=n;}expect(s.ended).toBe(true);expect(s.passes).toBe(2);expect(Number.isFinite(score(s).white)).toBe(true);});
});
