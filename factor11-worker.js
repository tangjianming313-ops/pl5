/* 11因子评分的独立JavaScript实现，参考公开数学定义；无外部依赖。 */
"use strict";
function normalize(row){const lo=Math.min(...row),hi=Math.max(...row);return hi-lo<1e-9?row.map(()=>0.5):row.map(x=>(x-lo)/(hi-lo))}

function factorsFor(draws){
  const n=draws.length;if(n<1)throw Error("历史不足");
  const factors=[];
  for(const size of [n,20,5]){
    const start=Math.max(0,n-size),len=n-start,byPos=[];
    for(let p=0;p<4;p++){
      const counts=Array(10).fill(0);
      for(let i=start;i<n;i++)counts[draws[i][p]]++;
      byPos.push(normalize(counts.map(x=>x/Math.max(len,1))));
    }
    factors.push(byPos);
  }
  {
    const byPos=[];
    for(let p=0;p<4;p++){
      const row=[];
      for(let d=0;d<10;d++){
        let gap=n;
        for(let i=n-1;i>=0;i--)if(draws[i][p]===d){gap=n-1-i;break}
        row.push(gap);
      }
      byPos.push(normalize(row));
    }
    factors.push(byPos);
  }
  for(const step of [1,2]){
    const byPos=[];
    for(let p=0;p<4;p++){
      const t=Array.from({length:10},()=>Array(10).fill(1));
      for(let i=0;i<n-step;i++)t[draws[i][p]][draws[i+step][p]]++;
      const src=n>=step?draws[n-step][p]:0;
      const total=t[src].reduce((a,b)=>a+b,0);
      byPos.push(normalize(t[src].map(x=>x/total)));
    }
    factors.push(byPos);
  }
  {
    const byPos=[],last=draws[n-1];
    for(let p=0;p<4;p++){
      const row=Array(10).fill(0);
      for(let q=0;q<4;q++){
        if(q===p)continue;
        let count=0;const joint=Array(10).fill(0);
        for(let i=0;i<n;i++){
          if(draws[i][q]===last[q]){count++;joint[draws[i][p]]++}
        }
        if(count>0)for(let d=0;d<10;d++)row[d]+=joint[d]/count;
      }
      byPos.push(normalize(row.map(x=>x/3)));
    }
    factors.push(byPos);
  }
  {
    const parity=[],size=[],start=Math.max(0,n-20),len=n-start;
    for(let p=0;p<4;p++){
      let evens=0,bigs=0;
      for(let i=start;i<n;i++){const d=draws[i][p];if(d%2===0)evens++;if(d>=5)bigs++}
      const evenRatio=evens/Math.max(len,1),bigRatio=bigs/Math.max(len,1);
      parity.push(normalize(Array.from({length:10},(_,d)=>d%2===0?1-evenRatio:evenRatio)));
      size.push(normalize(Array.from({length:10},(_,d)=>d>=5?1-bigRatio:bigRatio)));
    }
    factors.push(parity,size);
  }
  {
    let totalChange=0;
    for(let i=1;i<n;i++)totalChange+=draws[i].reduce((a,b)=>a+b,0)-draws[i-1].reduce((a,b)=>a+b,0);
    const prevSum=draws[n-1].reduce((a,b)=>a+b,0);
    const target=(prevSum+totalChange/Math.max(n-1,1))/4;
    const row=normalize(Array.from({length:10},(_,d)=>1-Math.abs(d-target)/9));
    factors.push(Array.from({length:4},()=>row.slice()));
  }
  {
    const byPos=[];
    for(let p=0;p<4;p++){
      const counts=Array(10).fill(0);
      for(let i=5;i<n;i+=5)counts[draws[i][p]]++;
      byPos.push(normalize(counts.map(v=>v/Math.max(n/5,1))));
    }
    factors.push(byPos);
  }
  if(factors.length!==11)throw Error("11因子计算数量错误");
  return factors;
}

function learnWeights(draws){
  const n=draws.length;
  const train=Math.max(50,Math.min(500,Math.floor(n/3)));
  if(n<train+10)throw Error("至少需要60期以上历史");
  const requested=Math.max(50,Math.min(500,n-train-10));
  const test=Math.min(requested,n-train);
  const sum=Array(11).fill(0);
  for(let t=train;t<train+test;t++){
    const fac=factorsFor(draws.slice(t-train,t));
    const truth=draws[t];
    for(let f=0;f<11;f++){
      let value=0;
      for(let p=0;p<4;p++){
        const order=Array.from({length:10},(_,d)=>d).sort((a,b)=>fac[f][p][b]-fac[f][p][a]||a-b);
        const rank=order.indexOf(truth[p]);
        value+=rank===0?1:rank===1?0.5:rank===2?0.25:0;
      }
      sum[f]+=value/4;
    }
  }
  const ic=sum.map(v=>v/test);
  const eff=ic.map(x=>Math.max(x,0.04));
  const total=eff.reduce((a,b)=>a+b,0);
  return {weights:eff.map(x=>x/total),ic,train,test};
}

function makePrediction(draws,model,counts){
  const fac=factorsFor(draws),positions=[];
  for(let p=0;p<4;p++){
    const scores=Array.from({length:10},(_,d)=>fac.reduce((sum,part,f)=>sum+model.weights[f]*part[p][d],0));
    const ranking=Array.from({length:10},(_,d)=>d).sort((a,b)=>scores[b]-scores[a]||a-b);
    const kept=ranking.slice(0,counts[p]).sort((a,b)=>a-b);
    const excluded=ranking.slice(counts[p]).sort((a,b)=>a-b);
    positions.push({scores,ranking,kept,excluded});
  }
  return {positions,weights:model.weights,ic:model.ic,train:model.train,test:model.test,historyLength:draws.length};
}

// Batch mode uses the same original IC learning window. With N>=1010,
 // original learn_optimal_weights always evaluates only the oldest 1000 draws;
 // all later historic prefixes therefore have the same learned weights.
self.onmessage=function(event){
  try{
    const msg=event.data||{},lines=msg.history;
    if(!Array.isArray(lines)||lines.length<1010||!lines.every(v=>typeof v==="string"&&/^\d{4}$/.test(v)))throw Error("历史数据不足或格式错误");
    const counts=msg.counts||[9,9,9,9];
    if(!Array.isArray(counts)||counts.length!==4||counts.some(v=>!Number.isInteger(v)||v<1||v>10))throw Error("保留码数错误");
    const draws=lines.map(v=>[+v[0],+v[1],+v[2],+v[3]]);
    const model=learnWeights(draws);
    if(msg.mode==="batch"){
      const amount=Math.min(Math.max(0,Number(msg.amount)||0),200,draws.length-1010);
      const results=[];
      for(let k=draws.length-amount;k<draws.length;k++){
        const result=makePrediction(draws.slice(0,k),model,[9,9,9,9]);
        results.push({length:k,exclude:result.positions.map(p=>p.excluded.join(""))});
        if((k-(draws.length-amount)+1)%25===0)
          self.postMessage({progress:true,done:k-(draws.length-amount)+1,total:amount});
      }
      const latest=makePrediction(draws,model,[9,9,9,9]);
      results.push({length:draws.length,exclude:latest.positions.map(p=>p.excluded.join(""))});
      self.postMessage({ok:true,mode:"batch",results,training:model.train,evaluation:model.test});
      return;
    }
    const result=makePrediction(draws,model,counts);
    self.postMessage({ok:true,mode:"predict",result});
  }catch(error){self.postMessage({ok:false,error:String(error&&error.message||error)})}
};
