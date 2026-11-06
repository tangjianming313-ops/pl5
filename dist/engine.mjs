export const POSITIONS = ['万位', '千位', '百位', '十位'];
export const DEFAULT_RULES = {
  excluded: [[4], [4], [8], [1]],
  historyEnabled: true, historyWindow: 1500, frequency: 'any',
  sumEnabled: true, sumMin: 9, sumMax: 30,
  structures: ['distinct', 'pair'], routeEnabled: true,
  recent2Enabled: true, recent2Window: 2, recent2Threshold: 2,
  recent3Enabled: true, recent3Window: 10, recent3Threshold: 3,
  hefen1: true, hefen4: true,
  parityExcluded: [], sizeExcluded: [],
};
export const EMPTY_RULES = {
  ...DEFAULT_RULES, excluded: [[], [], [], []],
  historyEnabled: false, sumEnabled: false, frequency: 'any',
  structures: ['distinct', 'pair', 'doublePair', 'triple', 'quad'],
  routeEnabled: false, recent2Enabled: false, recent3Enabled: false,
  hefen1: false, hefen4: false, parityExcluded: [], sizeExcluded: [],
};
export const clone = value => JSON.parse(JSON.stringify(value));
export const ALL = Array.from({ length: 10000 }, (_, i) => String(i).padStart(4, '0'));
const DIGITS = ALL.map(s => [...s].map(Number));
export function structure(s) {
  const counts = Object.values([...String(s)].reduce((a, v) => { a[v] = (a[v] || 0) + 1; return a; }, {})).sort((a,b) => b-a);
  if (counts[0] === 4) return 'quad';
  if (counts[0] === 3) return 'triple';
  if (counts[0] === 2 && counts[1] === 2) return 'doublePair';
  return counts[0] === 2 ? 'pair' : 'distinct';
}
const STRUCTURES = ALL.map(structure);
export const sum = s => [...String(s)].reduce((a,b) => a+Number(b), 0);
export function assertHistory(draws) {
  if (!Array.isArray(draws) || draws.length > 100000 || draws.some(s => typeof s !== 'string' || !/^\d{4}$/.test(s))) throw new Error('历史数据应为最多 100,000 期的四位数字字符串，包含前导零。');
}
export function validateRules(r) {
  if (!r || !Array.isArray(r.excluded) || r.excluded.length !== 4 || r.excluded.some(a => !Array.isArray(a) || a.some(d => !Number.isInteger(d) || d<0 || d>9))) throw new Error('请检查四个位置的排除数字。');
  for (const key of ['historyEnabled','sumEnabled','routeEnabled','recent2Enabled','recent3Enabled','hefen1','hefen4']) if (typeof r[key] !== 'boolean') throw new Error('规则开关格式无效。');
  if (!['any','never','once','ever','atMostOnce'].includes(r.frequency)) throw new Error('请选择有效的历史次数条件。');
  if (![r.historyWindow,r.recent2Window,r.recent3Window].every(n => Number.isInteger(n) && n>=1 && n<=100000)) throw new Error('历史及定位窗口须为 1–100,000 的整数。');
  if (![r.recent2Threshold,r.recent3Threshold].every(n => [1,2,3,4].includes(n))) throw new Error('同位匹配阈值须为 1–4。');
  if (![r.sumMin,r.sumMax].every(n => Number.isInteger(n) && n>=0 && n<=36) || r.sumMin>r.sumMax) throw new Error('和值范围须在 0–36 之间，且下限不能大于上限。');
  if (!Array.isArray(r.structures) || r.structures.some(v => !['distinct','pair','doublePair','triple','quad'].includes(v))) throw new Error('重复结构设置无效。');
  if (!Array.isArray(r.parityExcluded) || r.parityExcluded.some(s => !/^[单双]{4}$/.test(s))) throw new Error('单双形态无效。');
  if (!Array.isArray(r.sizeExcluded) || r.sizeExcluded.some(s => !/^[大小]{4}$/.test(s))) throw new Error('大小形态无效。');
  return r;
}
export function prepare(rules, history) {
  validateRules(rules); assertHistory(history);
  const r = rules;
  const counts = new Map();
  for (const n of history) counts.set(n, (counts.get(n)||0)+1);
  const recent = new Set(history.slice(-r.historyWindow));
  const last = history.length ? [...history.at(-1)].map(Number) : null;
  const tests = [];
  if (r.historyEnabled) tests.push({name:`最近 ${r.historyWindow} 期完整号码`, test:(s)=>!recent.has(s)});
  if (r.frequency!=='any') tests.push({name:'全历史出现次数', test:(s)=>{
    const n=counts.get(s)||0;
    return r.frequency==='never' ? n===0 : r.frequency==='once' ? n===1 : r.frequency==='ever' ? n>=1 : n<=1;
  }});
  if (r.excluded.some(a=>a.length)) tests.push({name:'固定位置排码',test:(_,d)=>d.every((v,p)=>!r.excluded[p].includes(v))});
  if (r.sumEnabled) tests.push({name:`和值 ${r.sumMin}–${r.sumMax}`,test:(_,d)=>{const n=d.reduce((a,b)=>a+b,0);return n>=r.sumMin&&n<=r.sumMax;}});
  if (r.structures.length<5) tests.push({name:'重复结构',test:(_,d,i)=>r.structures.includes(STRUCTURES[i])});
  if (r.routeEnabled) tests.push({name:'012 至少两路',test:(_,d)=>new Set(d.map(n=>n%3)).size>=2});
  for (const key of ['recent2','recent3']) if (r[`${key}Enabled`]) {
    const draws=history.slice(-r[`${key}Window`]).map(s=>[...s].map(Number));
    const threshold=r[`${key}Threshold`];
    tests.push({name:`近 ${r[`${key}Window`]} 期 ≥${threshold} 位同位`,test:(_,d)=>draws.every(old=>d.reduce((n,v,p)=>n+Number(v===old[p]),0)<threshold)});
  }
  if (r.hefen1 && last) tests.push({name:`合分① · 排尾和 ${(last[0]+last[2])%10}`,test:(_,d)=>(d[1]+d[2]+d[3])%10!==(last[0]+last[2])%10});
  if (r.hefen4 && last) tests.push({name:`合分④ · 排尾和 ${(last[2]+last[3])%10}`,test:(_,d)=>(d[1]+d[2])%10!==(last[2]+last[3])%10});
  if (r.parityExcluded.length) tests.push({name:'单双形态',test:(_,d)=>!r.parityExcluded.includes(d.map(v=>v%2?'单':'双').join(''))});
  if (r.sizeExcluded.length) tests.push({name:'大小形态',test:(_,d)=>!r.sizeExcluded.includes(d.map(v=>v>=5?'大':'小').join(''))});
  const warnings=[];
  if(r.historyEnabled&&history.length<r.historyWindow) warnings.push(`历史不足 ${r.historyWindow} 期，使用现有 ${history.length} 期。`);
  for (const key of ['recent2','recent3']) if(r[`${key}Enabled`]&&history.length<r[`${key}Window`]) warnings.push(`近 ${r[`${key}Window`]} 期定位仅使用现有 ${history.length} 期。`);
  if(!last&&(r.hefen1||r.hefen4)) warnings.push('没有上期开奖，合分规则暂不参与。');
  return {tests,warnings,recentUnique:recent.size,last};
}
export function generate(rules,history) {
  const ctx=prepare(rules,history);
  const excluded=ctx.tests.map(()=>0), candidates=[];
  for(let i=0;i<10000;i++){
    let pass=true;
    for(let t=0;t<ctx.tests.length;t++) if(!ctx.tests[t].test(ALL[i],DIGITS[i],i)){excluded[t]++;pass=false;break;}
    if(pass)candidates.push(ALL[i]);
  }
  let remaining=10000;
  const steps=ctx.tests.map((t,i)=>({name:t.name,excluded:excluded[i],remaining:remaining-=excluded[i]}));
  return {candidates,steps,warnings:ctx.warnings,recentUnique:ctx.recentUnique};
}
export function subset(candidates,kind) {
  if(kind==='all')return candidates;
  if(kind==='shrink')return candidates.filter(s=>structure(s)==='pair'&&sum(s)>=9&&sum(s)<=25&&'23579'.includes(s[0]));
  return candidates.filter(s=>structure(s)===kind);
}
export function parseHistory(text, newestFirst=false) {
  if(typeof text!=='string'||text.length>5000000)throw new Error('文件过大，请导入 5 MB 以内的文本。');
  const draws=[], errors=[];
  text.replace(/^\uFEFF/,'').split(/\r?\n/).forEach((raw,i)=>{
    let line=raw.trim();
    if(!line||line.startsWith('#'))return;
    if(/^(序号|期号|期次|issue|index)[\s,，;\t]/i.test(line))return;
    const parts=line.split(/[\s,，;；|]+/).filter(Boolean);
    let n=null;
    if(parts.length===1 && /^\d{4,5}$/.test(parts[0]))n=parts[0];
    else if(parts.length===2&&/^\d{1,12}$/.test(parts[0])&&/^\d{4,5}$/.test(parts[1]))n=parts[1];
    else if([4,5].includes(parts.length)&&parts.every(v=>/^\d$/.test(v)))n=parts.join('');
    else if([5,6].includes(parts.length)&&/^\d{2,12}$/.test(parts[0])&&parts.slice(1).every(v=>/^\d$/.test(v)))n=parts.slice(1).join('');
    if(n)draws.push(n.slice(0,4));else errors.push({line:i+1,text:line.slice(0,60)});
  });
  if(draws.length>100000)throw new Error('单次最多导入 100,000 期。');
  return {draws:newestFirst?draws.reverse():draws,errors};
}
export function ruleSummary(r) {
  validateRules(r);
  const lines=['只处理排列五前四位（万、千、百、十），保留前导零，每次从 0000–9999 全量重算。'];
  if(r.historyEnabled)lines.push(`排除目标开奖前最近 ${r.historyWindow} 期已开出的完整四位号码；先取窗口，再去重。`);
  const freq={never:'全历史从未开出',once:'全历史恰好开过一次',ever:'全历史至少开过一次',atMostOnce:'全历史开过零次或一次'};
  if(r.frequency!=='any')lines.push(`仅保留：${freq[r.frequency]}的号码。`);
  r.excluded.forEach((a,i)=>{if(a.length)lines.push(`${POSITIONS[i]}排除 ${[...a].sort((a,b)=>a-b).join('、')}。`);});
  if(r.sumEnabled)lines.push(`和值 ${r.sumMin}–${r.sumMax}，包含边界。`);
  const names={distinct:'无对子',pair:'普通单对子',doublePair:'双对子',triple:'三重',quad:'四重'};
  lines.push(`保留结构：${r.structures.map(s=>names[s]).join('、')||'无'}。`);
  if(r.routeEnabled)lines.push('012 路至少出现两路，按每个数字除以 3 的余数分类。');
  for(const key of ['recent2','recent3'])if(r[`${key}Enabled`])lines.push(`与此前最近 ${r[`${key}Window`]} 期任意单期同位置相同数字 ≥${r[`${key}Threshold`]} 位则排除，逐期比较、不跨期累加。`);
  if(r.hefen1)lines.push('合分①：候选（千+百+十）%10 等于上期（万+百）%10 时排除。');
  if(r.hefen4)lines.push('合分④：候选（千+百）%10 等于上期（百+十）%10 时排除。');
  if(r.parityExcluded.length)lines.push(`排除单双形态：${r.parityExcluded.join('、')}。`);
  if(r.sizeExcluded.length)lines.push(`排除大小形态：${r.sizeExcluded.join('、')}（0–4 小，5–9 大）。`);
  return lines.join('\n');
}
export async function backtest(rules,history,window,onProgress=()=>{},signal) {
  validateRules(rules); assertHistory(history);
  if(!Number.isInteger(window)||window<1||window>500)throw new Error('回测范围为 1–500 期。');
  const required=Math.max(rules.historyEnabled?rules.historyWindow:0,rules.recent2Enabled?rules.recent2Window:0,rules.recent3Enabled?rules.recent3Window:0,(rules.hefen1||rules.hefen4)?1:0);
  const start=Math.max(required,history.length-window);
  if(start>=history.length)throw new Error(`至少需要 ${required+1} 期历史才能按完整窗口回测。`);
  const rows=[];let streak=0,maxMiss=0;
  for(let i=start;i<history.length;i++){
    if(signal?.aborted)throw new Error('已取消回测。');
    const result=generate(rules,history.slice(0,i));
    const hit=result.candidates.includes(history[i]);
    streak=hit?0:streak+1;maxMiss=Math.max(maxMiss,streak);
    rows.push({index:i+1,draw:history[i],count:result.candidates.length,hit});
    if((i-start)%5===0){onProgress({done:rows.length,total:history.length-start});await new Promise(resolve=>setTimeout(resolve,0));}
  }
  onProgress({done:rows.length,total:rows.length});
  return {rows,hits:rows.filter(r=>r.hit).length,maxMiss,averageCount:rows.reduce((a,r)=>a+r.count,0)/rows.length,requestedWindow:window};
}
