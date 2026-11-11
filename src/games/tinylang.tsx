import {
  Page,
  Section,
  Text,
  Grid,
  Button,
  Select,
  Segmented,
  Table,
  Diagram,
  Steps,
  Callout,
  useState,
  useGrokTheme,
  type ChangeEvent,
  type KeyboardEvent
} from '../compat/grok-canvas';

type Tok = { k: string; v: string; line: number; col: number };
type N = { kind: string; t: Tok; [key: string]: any };
type Val = any;
function fail(t: Tok, msg: string): never { throw new Error(`第 ${t.line} 行，第 ${t.col} 列：${msg}`); }
function lex(src: string): Tok[] {
  if (src.length > 30000) throw new Error('源码超过 30,000 字符上限');
  const out: Tok[] = []; let i = 0, line = 1, col = 1;
  const take = (): string => { const c = src[i++]; if (c === '\n') { line++; col = 1; } else col++; return c; };
  while (i < src.length) {
    const c = src[i]; if (/\s/.test(c)) { take(); continue; }
    if (src.slice(i, i + 2) === '//') { while (i < src.length && src[i] !== '\n') take(); continue; }
    const t: Tok = { k: '', v: '', line, col };
    if (/[0-9]/.test(c)) { t.k = 'num'; while (i < src.length && /[0-9]/.test(src[i])) t.v += take(); if (src[i] === '.' && /[0-9]/.test(src[i + 1] || '')) { t.v += take(); while (i < src.length && /[0-9]/.test(src[i])) t.v += take(); } }
    else if (/[a-zA-Z_]/.test(c)) { t.k = 'id'; while (i < src.length && /[a-zA-Z_0-9]/.test(src[i])) t.v += take(); if (['let','if','else','while','fn','return','true','false','null'].includes(t.v)) t.k = t.v; }
    else if (c === '"' || c === "'") {
      t.k = 'str'; const quote = take(); let closed = false;
      while (i < src.length) { let ch = take(); if (ch === quote) { closed = true; break; } if (ch === '\n') fail(t, '字符串不能直接换行，请用 \\n'); if (ch === '\\') { if (i >= src.length) fail(t, '字符串转义未完成'); const e = take(); const escapes: Record<string,string> = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'" }; if (!(e in escapes)) fail(t, `不支持的转义 \\${e}`); ch = escapes[e]; } t.v += ch; }
      if (!closed) fail(t, '字符串缺少结束引号');
    } else { const two = src.slice(i, i + 2); if (['==','!=','<=','>=','&&','||'].includes(two)) { t.k = t.v = take() + take(); } else if ('+-*/%<>=!(){}[],;'.includes(c)) t.k = t.v = take(); else fail(t, `无法识别字符 ${JSON.stringify(c)}`); }
    out.push(t);
  }
  out.push({ k: 'eof', v: '', line, col }); return out;
}
class Parser {
  a: Tok[]; i = 0; depth = 0;
  constructor(a: Tok[]) { this.a = a; }
  peek(): Tok { return this.a[this.i]; }
  is(k: string): boolean { return this.peek().k === k; }
  eat(k: string): boolean { if (this.is(k)) { this.i++; return true; } return false; }
  need(k: string): Tok { const t = this.peek(); if (!this.eat(k)) fail(t, `需要 ${k}，实际是 ${t.v || t.k}`); return t; }
  node(kind: string, t: Tok, fields: Record<string,any> = {}): N { return { kind, t, ...fields }; }
  guard<T>(f: () => T): T { if (++this.depth > 160) fail(this.peek(), '语法嵌套超过 160 层'); try { return f(); } finally { this.depth--; } }
  program(): N[] { const a: N[] = []; while (!this.is('eof')) a.push(this.stmt()); return a; }
  end(): void { if (!this.eat(';') && !this.is('}') && !this.is('eof')) fail(this.peek(), '语句末尾需要分号 ;'); }
  block(): N { const t = this.need('{'); const body: N[] = []; while (!this.is('}') && !this.is('eof')) body.push(this.stmt()); this.need('}'); return this.node('block',t,{body}); }
  stmt(): N { return this.guard((): N => {
    const t = this.peek();
    if (this.eat(';')) return this.node('empty',t);
    if (this.is('{')) return this.block();
    if (this.eat('let')) { const name = this.need('id').v; this.need('='); const value = this.expr(); this.end(); return this.node('let',t,{name,value}); }
    if (this.eat('if')) { this.need('('); const cond = this.expr(); this.need(')'); const yes = this.block(); const no = this.eat('else') ? (this.is('if') ? this.stmt() : this.block()) : null; return this.node('if',t,{cond,yes,no}); }
    if (this.eat('while')) { this.need('('); const cond = this.expr(); this.need(')'); return this.node('while',t,{cond,body:this.block()}); }
    if (this.eat('return')) { const value = this.is(';') || this.is('}') || this.is('eof') ? null : this.expr(); this.end(); return this.node('return',t,{value}); }
    const value = this.expr(); this.end(); return this.node('expr',t,{value});
  }); }
  expr(): N { return this.guard((): N => { const left = this.binary(0); if (this.eat('=')) { if (!['id','index'].includes(left.kind)) fail(left.t, '赋值目标必须是变量或数组元素'); return this.node('assign',left.t,{left,right:this.expr()}); } return left; }); }
  binary(level: number): N { const groups = [['||'],['&&'],['==','!='],['<','>','<=','>='],['+','-'],['*','/','%']]; if (level === groups.length) return this.unary(); let left = this.binary(level + 1); while (groups[level].includes(this.peek().k)) { const t = this.a[this.i++]; left = this.node('binary',t,{op:t.k,left,right:this.binary(level+1)}); } return left; }
  unary(): N { return this.guard((): N => { if (['!','-','+'].includes(this.peek().k)) { const t = this.a[this.i++]; return this.node('unary',t,{op:t.k,value:this.unary()}); } return this.postfix(); }); }
  postfix(): N { let left = this.primary(); while (true) { if (this.eat('(')) { const args: N[] = []; if (!this.is(')')) { do { args.push(this.expr()); } while (this.eat(',')); } this.need(')'); left = this.node('call',left.t,{callee:left,args}); } else if (this.eat('[')) { const index = this.expr(); this.need(']'); left = this.node('index',left.t,{value:left,index}); } else break; } return left; }
  primary(): N {
    const t = this.a[this.i++];
    if (t.k === 'num') return this.node('literal',t,{value:Number(t.v)});
    if (t.k === 'str') return this.node('literal',t,{value:t.v});
    if (['true','false','null'].includes(t.k)) return this.node('literal',t,{value:t.k === 'null' ? null : t.k === 'true'});
    if (t.k === 'id') return this.node('id',t,{name:t.v});
    if (t.k === '(') { const n = this.expr(); this.need(')'); return n; }
    if (t.k === '[') { const items: N[] = []; if (!this.is(']')) { do { items.push(this.expr()); } while (this.eat(',')); } this.need(']'); return this.node('array',t,{items}); }
    if (t.k === 'fn') { this.need('('); const params: string[] = []; if (!this.is(')')) { do { const p = this.need('id'); if (params.includes(p.v)) fail(p,'参数名重复'); params.push(p.v); } while (this.eat(',')); } this.need(')'); return this.node('fn',t,{params,body:this.block()}); }
    fail(t, `需要表达式，实际是 ${t.v || t.k}`);
  }
}
class Env {
  values = new Map<string,Val>(); parent: Env | null;
  constructor(parent: Env | null = null) { this.parent = parent; }
  define(name: string, value: Val, t: Tok): void { if (this.values.has(name)) fail(t, `当前作用域已声明 ${name}`); this.values.set(name,value); }
  owner(name: string, t: Tok): Env { if (this.values.has(name)) return this; if (this.parent) return this.parent.owner(name,t); return fail(t,`未定义变量 ${name}`); }
  get(name: string, t: Tok): Val { return this.owner(name,t).values.get(name); }
  set(name: string, value: Val, t: Tok): Val { this.owner(name,t).values.set(name,value); return value; }
}
class ReturnSignal { value: Val; t: Tok; constructor(value: Val,t: Tok) { this.value = value; this.t = t; } }
function kind(v: Val): string { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'object' ? 'function' : typeof v; }
function show(v: Val, seen: Set<Val> = new Set(), depth = 0): string { if (Array.isArray(v)) { if (seen.has(v)) return '[循环引用]'; if (depth > 12) return '[…]'; const next = new Set(seen); next.add(v); return '[' + v.slice(0,100).map((x: Val): string => typeof x === 'string' ? JSON.stringify(x) : show(x,next,depth+1)).join(', ') + (v.length > 100 ? ', …' : '') + ']'; } if (kind(v) === 'function') return '<function>'; return String(v); }
class VM {
  steps = 0; depth = 0; calls = 0; output: string[] = []; env = new Env();
  constructor() {
    const native = (name: string, min: number, max: number, run: (a: Val[],t: Tok) => Val): void => { this.env.values.set(name,{native:true,min,max,run}); };
    native('print',0,30,(a: Val[],t: Tok): Val => { if (this.output.length >= 200) fail(t,'输出超过 200 行'); const s = a.map((v: Val): string => show(v)).join(' '); if (s.length > 10000) fail(t,'单行输出超过 10,000 字符'); this.output.push(s); return null; });
    native('len',1,1,(a: Val[],t: Tok): Val => { if (!Array.isArray(a[0]) && typeof a[0] !== 'string') fail(t,'len 只接受数组或字符串'); return a[0].length; });
    native('push',2,2,(a: Val[],t: Tok): Val => { if (!Array.isArray(a[0])) fail(t,'push 的第一个参数必须是数组'); if (a[0].length >= 10000) fail(t,'数组长度超过 10,000'); a[0].push(a[1]); return a[0].length; });
    native('type',1,1,(a: Val[]): Val => kind(a[0]));
  }
  num(v: Val,t: Tok): number { if (typeof v !== 'number' || !Number.isFinite(v)) fail(t,`需要有限数值，实际是 ${kind(v)}`); return v; }
  bool(v: Val,t: Tok): boolean { if (typeof v !== 'boolean') fail(t,`条件必须是 bool，实际是 ${kind(v)}`); return v; }
  index(a: Val,i: Val,t: Tok): number { if (!Array.isArray(a) && typeof a !== 'string') fail(t,'只能索引数组或字符串'); if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= a.length) fail(t,`索引 ${show(i)} 越界；长度为 ${a.length}`); return i; }
  list(body: N[],env: Env): Val { let result: Val = null; for (const n of body) result = this.eval(n,env); return result; }
  eval(n: N,e: Env): Val {
    if (++this.steps > 50000) fail(n.t,'执行超过 50,000 步；可能有无限循环');
    if (++this.depth > 180) { this.depth--; fail(n.t,'求值嵌套过深'); }
    try { switch (n.kind) {
      case 'empty': return null;
      case 'literal': return n.value;
      case 'id': return e.get(n.name,n.t);
      case 'array': return n.items.map((x: N): Val => this.eval(x,e));
      case 'expr': return this.eval(n.value,e);
      case 'let': { const v = this.eval(n.value,e); e.define(n.name,v,n.t); return null; }
      case 'block': return this.list(n.body,new Env(e));
      case 'if': return this.bool(this.eval(n.cond,e),n.t) ? this.eval(n.yes,e) : n.no ? this.eval(n.no,e) : null;
      case 'while': { while (this.bool(this.eval(n.cond,e),n.t)) this.eval(n.body,e); return null; }
      case 'return': throw new ReturnSignal(n.value ? this.eval(n.value,e) : null,n.t);
      case 'fn': return { params:n.params,body:n.body,closure:e };
      case 'index': { const a = this.eval(n.value,e); const i = this.index(a,this.eval(n.index,e),n.t); return a[i]; }
      case 'assign': { if (n.left.kind === 'id') return e.set(n.left.name,this.eval(n.right,e),n.t); const a = this.eval(n.left.value,e); const i = this.index(a,this.eval(n.left.index,e),n.t); if (!Array.isArray(a)) fail(n.t,'字符串不可修改'); const v = this.eval(n.right,e); a[i] = v; return v; }
      case 'unary': { const v = this.eval(n.value,e); return n.op === '!' ? !this.bool(v,n.t) : n.op === '-' ? -this.num(v,n.t) : this.num(v,n.t); }
      case 'binary': {
        const a = this.eval(n.left,e);
        if (n.op === '&&') return this.bool(a,n.t) && this.bool(this.eval(n.right,e),n.t);
        if (n.op === '||') return this.bool(a,n.t) || this.bool(this.eval(n.right,e),n.t);
        const b = this.eval(n.right,e);
        if (n.op === '==') return a === b;
        if (n.op === '!=') return a !== b;
        if (n.op === '+' && typeof a === 'string' && typeof b === 'string') { if (a.length + b.length > 100000) fail(n.t,'字符串超过 100,000 字符'); return a + b; }
        const x = this.num(a,n.t), y = this.num(b,n.t); let r: Val;
        switch (n.op) { case '+': r=x+y; break; case '-': r=x-y; break; case '*': r=x*y; break; case '/': if (y===0) fail(n.t,'不能除以零'); r=x/y; break; case '%': if(y===0) fail(n.t,'不能对零取余'); r=x%y; break; case '<': return x<y; case '>': return x>y; case '<=': return x<=y; case '>=': return x>=y; default: fail(n.t,'未知运算符'); }
        if (!Number.isFinite(r)) fail(n.t,'数值溢出'); return r;
      }
      case 'call': {
        const f = this.eval(n.callee,e); if (kind(f) !== 'function') fail(n.t,`${kind(f)} 不能作为函数调用`);
        const args: Val[] = n.args.map((x: N): Val => this.eval(x,e));
        if (f.native) { if (args.length < f.min || args.length > f.max) fail(n.t,`参数数量不匹配：需要 ${f.min}–${f.max}，收到 ${args.length}`); return f.run(args,n.t); }
        if (args.length !== f.params.length) fail(n.t,`需要 ${f.params.length} 个参数，收到 ${args.length}`);
        if (++this.calls > 60) { this.calls--; fail(n.t,'函数调用超过 60 层'); }
        const scope = new Env(f.closure); f.params.forEach((p: string,i: number): void => scope.define(p,args[i],n.t));
        try { this.eval(f.body,scope); return null; } catch (err: unknown) { if (err instanceof ReturnSignal) return err.value; throw err; } finally { this.calls--; }
      }
      default: return fail(n.t,'未知语法节点');
    } } finally { this.depth--; }
  }
}
type Result = { output: string; error: string; tokens: string; ast: string; steps: number; count: number; value: string };
function run(src: string): Result {
  let tokens: Tok[] = [], ast: N[] = []; const vm = new VM(); let error = '', value = 'null';
  try { tokens=lex(src); ast=new Parser(tokens).program(); value=show(vm.list(ast,vm.env)); }
  catch (err: unknown) { error = err instanceof ReturnSignal ? `第 ${err.t.line} 行：return 只能出现在函数中` : err instanceof Error ? err.message : String(err); }
  return { output:vm.output.join('\n'),error,tokens:tokens.slice(0,600).map((t: Tok): string => `${t.line}:${t.col}  ${t.k.padEnd(7)} ${JSON.stringify(t.v)}`).join('\n') + (tokens.length > 600 ? '\n…仅显示前 600 个 token' : ''), ast:JSON.stringify(ast,(k: string,v: Val): Val => k === 't' ? undefined : v,2).slice(0,24000),steps:vm.steps,count:tokens.length,value };
}
const examples: { id: string; label: string; code: string; expected?: string; error?: string }[] = [
 { id:'fib',label:'01 · Fibonacci',code:'// 递归函数与数组\nlet fib = fn(n) {\n  if (n < 2) { return n; }\n  return fib(n - 1) + fib(n - 2);\n};\nlet a = [];\nlet i = 0;\nwhile (i < 10) {\n  push(a, fib(i));\n  i = i + 1;\n}\nprint(a);',expected:'[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]'},
 { id:'fact',label:'02 · 阶乘',code:'let fact = fn(n) {\n  if (n <= 1) { return 1; }\n  return n * fact(n - 1);\n};\nprint(fact(8));',expected:'40320'},
 { id:'closure',label:'03 · 闭包计数器',code:'let counter = fn(start) {\n  let n = start;\n  return fn() { n = n + 1; return n; };\n};\nlet a = counter(10);\nlet b = counter(100);\nprint(a(), a(), b(), a());',expected:'11 12 101 13'},
 { id:'fizz',label:'04 · FizzBuzz',code:'let i = 1;\nwhile (i <= 20) {\n  if (i % 15 == 0) { print("FizzBuzz"); }\n  else if (i % 3 == 0) { print("Fizz"); }\n  else if (i % 5 == 0) { print("Buzz"); }\n  else { print(i); }\n  i = i + 1;\n}',expected:'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz'},
 { id:'scope',label:'05 · 嵌套作用域',code:'let x = 10;\n{\n  let x = 20;\n  { let x = 30; print(x); }\n  print(x);\n}\nprint(x);',expected:'30\n20\n10'},
 { id:'array',label:'06 · 数组与原地修改',code:'let a = [4, 1, 3, 2];\na[0] = 9;\npush(a, 5);\nlet i = 0; let total = 0;\nwhile (i < len(a)) { total = total + a[i]; i = i + 1; }\nprint(a);\nprint("sum", total, "length", len(a));',expected:'[9, 1, 3, 2, 5]\nsum 20 length 5'},
 { id:'hof',label:'07 · 高阶函数 map',code:'let map = fn(a, f) {\n  let out = []; let i = 0;\n  while (i < len(a)) {\n    push(out, f(a[i])); i = i + 1;\n  }\n  return out;\n};\nlet square = fn(x) { return x * x; };\nprint(map([1, 2, 3, 4, 5], square));',expected:'[1, 4, 9, 16, 25]'},
 { id:'logic',label:'08 · 布尔与短路',code:'print(true && !false);\nprint(false && missingVariable);\nprint(true || (1 / 0 == 0));\nprint(2 + 3 * 4 == 14);\nprint(3 != 4, 5 >= 5);',expected:'true\nfalse\ntrue\ntrue\ntrue true'},
 { id:'strings',label:'09 · 字符串与类型',code:'let name = "TinyLang";\nprint("Hello, " + name + "!");\nprint(len(name), name[0]);\nprint(type(42), type("hi"), type(true));\nprint(type([]), type(fn() {}), type(null));\nprint("line 1\\nline 2");',expected:'Hello, TinyLang!\n8 T\nnumber string boolean\narray function null\nline 1\nline 2'},
 { id:'sort',label:'10 · 冒泡排序',code:'let a = [5, 2, 8, 1, 3];\nlet i = 0;\nwhile (i < len(a)) {\n  let j = 0;\n  while (j + 1 < len(a) - i) {\n    if (a[j] > a[j + 1]) {\n      let temp = a[j];\n      a[j] = a[j + 1]; a[j + 1] = temp;\n    }\n    j = j + 1;\n  }\n  i = i + 1;\n}\nprint(a);',expected:'[1, 2, 3, 5, 8]'},
 { id:'error',label:'11 · 错误定位：除零',code:'let x = 10;\nprint("before error");\nprint(x / 0);',error:'不能除以零'},
 { id:'syntax',label:'12 · 错误定位：语法',code:'let x = ;\nprint(x);',error:'需要表达式'},
 { id:'loop',label:'13 · 无限循环保护',code:'// 不会永远运行：50,000 步后中断\nwhile (true) {}',error:'50,000'},
 { id:'bounds',label:'14 · 数组越界',code:'let a = [10, 20];\nprint(a[2]);',error:'越界'}
];
const extraTests: { code: string; expected?: string; error?: string }[] = [
 {code:'let x = 1; let x = 2;',error:'已声明'},
 {code:'print(unknown);',error:'未定义'},
 {code:'if (1) { print(1); }',error:'条件必须'},
 {code:'print(1 + "x");',error:'需要有限数值'},
 {code:'return 7;',error:'只能出现在函数'},
 {code:'let f = fn(x) { return x; }; f();',error:'需要 1 个参数'},
 {code:'let a = []; push(a, a); print(a);',expected:'[[循环引用]]'},
 {code:'let x = 0; let f = fn() { x = x + 1; return true; }; print(false && f(), true || f(), x);',expected:'false true 0'},
 {code:'let make = fn(x) { return fn(y) { return x + y; }; }; print(make(7)(8));',expected:'15'},
 {code:'print(-2 * 3, !(3 < 2), 20 / 4 / 2);',expected:'-6 true 2.5'},
 {code:'let s = "ok"; s[0] = "X";',error:'字符串不可修改'},
 {code:'let f = fn(x, x) {};',error:'参数名重复'}
];
export default function App() {
  const theme = useGrokTheme();
  const [selected,setSelected] = useState('fib');
  const [code,setCode] = useState(examples[0].code);
  const [result,setResult] = useState<Result>(() => run(examples[0].code));
  const [view,setView] = useState('output');
  const [tests,setTests] = useState<string>('');
  const [executed,setExecuted] = useState(examples[0].code);
  const execute = (): void => { setResult(run(code)); setExecuted(code); };
  const pick = (id: string): void => { const ex = examples.find((x: {id:string}): boolean => x.id === id); if (ex) { setSelected(id); setCode(ex.code); setResult(run(ex.code)); setExecuted(ex.code); } };
  const test = (): void => {
    const cases = [...examples,...extraTests];
    const lines = cases.map((c: {code:string;expected?:string;error?:string},i: number): string => { const r=run(c.code); const ok=c.error ? r.error.includes(c.error) : !r.error && r.output === c.expected; return `${ok ? 'PASS' : 'FAIL'} ${String(i+1).padStart(2,'0')} ${c.error ? '预期错误：'+c.error : '输出匹配'}${ok ? '' : '\n  实际：'+(r.error || r.output)}`; });
    setTests(`${lines.filter((s: string): boolean => s.startsWith('PASS')).length} / ${cases.length} 项通过\n\n${lines.join('\n')}`);
  };
  const panel = { color:theme.text.primary,background:theme.bg.base,border:`1px solid ${theme.border.default}`,borderRadius:theme.radius.md,fontFamily:theme.font.mono,fontSize:13,lineHeight:1.65,padding:14,boxSizing:'border-box' as const,width:'100%' };
  const rendered = view === 'tokens' ? result.tokens : view === 'ast' ? result.ast : (result.output || '（没有 print 输出）') + (result.error ? '\n\nERROR · '+result.error : '\n\n完成 · 最后求值：'+result.value);
  return <Page title="TinyLang 玩具解释器" summary="写一小段语言，看它走过词法、语法与求值。14 个可运行示例，支持闭包、高阶函数和数组；全部计算都在页面内完成。" width="wide" lang="zh-Hans">
    <Section heading="Playground">
      <Select label="载入示例并运行" value={selected} options={examples.map((x: {id:string;label:string}): {value:string;label:string} => ({value:x.id,label:x.label}))} onChange={pick} />
      <div style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center'}}><Button label="Run · 运行" variant="primary" onClick={execute}/><Button label="恢复当前示例" onClick={(): void => pick(selected)}/><Button label="运行 26 项自测" onClick={test}/><span style={{color:theme.text.secondary,fontFamily:theme.font.family}}>Ctrl / ⌘ + Enter · 每次运行重建环境{code !== executed ? ' · 代码已修改，尚未运行' : ''}</span></div>
      <Grid columns={2}>
        <Section heading="源码"><textarea aria-label="TinyLang 源码编辑器" value={code} spellCheck={false} onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setCode(e.currentTarget.value)} onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>): void => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); execute(); } if (e.key === 'Tab') { e.preventDefault(); const el=e.currentTarget; const start=el.selectionStart,end=el.selectionEnd; setCode(code.slice(0,start)+'  '+code.slice(end)); } }} style={{...panel,minHeight:450,resize:'vertical',tabSize:2,fontSize:16}} /></Section>
        <Section heading="执行观察"><Segmented value={view} options={[{value:'output',label:'输出'},{value:'tokens',label:'Tokens'},{value:'ast',label:'AST'}]} onChange={(v: string): void => setView(v)}/><pre aria-live="polite" style={{...panel,maxHeight:450,overflow:'auto',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{rendered}</pre><Text>{`${result.count} tokens（含 EOF） · ${result.steps} 求值步 · ${result.error ? '执行已中止，之前输出保留' : '执行完成'}`}</Text></Section>
      </Grid>
      {tests ? <Section heading="自测结果"><pre style={{...panel,maxHeight:320,overflow:'auto',whiteSpace:'pre-wrap'}}>{tests}</pre></Section> : null}
    </Section>
    <Section heading="语言速查">
      <Table columns={['能力','写法 / 约定']} rows={[
        ['基础值','`42`、`3.14`、`"hello"`、`true`、`false`、`null`；数值采用 JS 有限浮点数。'],
        ['声明与赋值','`let x = 1; x = x + 1;`；同一作用域禁止重复声明，内层可以遮蔽。'],
        ['分支与循环','`if (x > 0) { ... } else { ... }`；`while (condition) { ... }`；条件严格要求 bool。'],
        ['函数与闭包','`let f = fn(x) { return x + 1; };`；词法作用域；显式 return，否则返回 null。'],
        ['数组与索引','`let a = [1, 2]; a[0] = 3;`；从 0 开始；赋值仅允许已有位置；数组按引用传递。'],
        ['内置函数','`print(a, b)` 输出；`len(a)` 长度；`push(a, value)` 原地追加并返回新长度；`type(x)` 类型。'],
        ['运算优先级','从低到高：`=` → `||` → `&&` → `== !=` → `< > <= >=` → `+ -` → `* / %` → `! - +` → 调用与索引。'],
        ['类型规则','不隐式转换；字符串只能与字符串相加；相等用严格比较，数组和函数按引用比较；逻辑运算短路。'],
        ['字符串与注释','单双引号均可；支持 `\\n`、`\\t`、`\\r` 与引号转义；`//` 单行注释；字符串长度和索引按 UTF-16 单元。'],
        ['语法边界','语句以分号分隔，块尾和文件末尾可省略；标识符为 ASCII；无对象、for、break、类或异步。']
      ]}/>
    </Section>
    <Section heading="从源码到结果">
      <Diagram direction="horizontal" nodes={[{id:'source',label:'Source',detail:'你输入的 TinyLang',kind:'terminal'},{id:'tokens',label:'Tokens',detail:'带行列位置的词法单元'},{id:'ast',label:'AST',detail:'递归下降 + 优先级解析'},{id:'eval',label:'Eval',detail:'环境链 + 树遍历求值'},{id:'output',label:'Output',detail:'print / 返回值 / 错误',kind:'terminal'}]} edges={[{from:'source',to:'tokens',label:'Lexer'},{from:'tokens',to:'ast',label:'Parser'},{from:'ast',to:'eval',label:'VM'},{from:'eval',to:'output',label:'Result'}]}/>
    </Section>
    <Section heading="它如何工作">
      <Steps steps={[{title:'Lexer：字符变成 token',detail:'扫描数字、字符串、标识符、关键字和运算符；跳过空白与注释，同时追踪行列位置。'},{title:'Parser：用语法组织含义',detail:'语句采用递归下降，表达式逐层处理优先级；赋值右结合；调用和索引可以连续出现。切换 AST 查看完整结构（显示最多 24,000 字符）。'},{title:'Evaluator：沿环境链解释执行',detail:'每个块创建子环境；变量向外层查找；函数捕获定义时的环境，因此递归和可变闭包无需特殊语法。return 用内部控制信号跨过嵌套块。'},{title:'验证与保护',detail:'页面内置 26 项自测，覆盖 14 个示例及类型错误、短路、闭包、重复声明和循环引用。点击自测查看本次实际结果。'}]}/>
      <Callout tone="info" lead="这是教学解释器，不是宿主 JavaScript 执行器">没有 eval、Function 或网络请求，也不接触文件。单次运行限制 50,000 求值步、60 层函数调用和 200 次 print；语法与求值另有嵌套上限。长程序同步运行，保护上限会报错停止。编辑与输出只是本次页面状态，不会保存成项目。</Callout>
    </Section>
  </Page>;
}
