// node run.js A.js B.js T pairs : parallel match on 4 cores, prints score of A and Elo estimate
const {execFile}=require('child_process');const Game=require(''+__dirname+'/../../chesscore.js')();const D=require(''+__dirname+'/../../data.js');
const [A,B,T,P]=[process.argv[2],process.argv[3],process.argv[4]||'100',+process.argv[5]||40];
// varied starts: opening lines cut at 4,6,8 plies
const starts=[];D.OPENINGS.concat(require(''+__dirname+'/../../defences.js').EXTRA_OPENINGS).forEach(o=>[4,6,8].forEach(n=>{const g=new Game();try{o.moves.slice(0,n).forEach(m=>g.move(m));starts.push(g.fen())}catch(e){}}));
const uniq=[...new Set(starts)].slice(0,P);
const jobs=[];uniq.forEach(f=>{jobs.push([f,true]);jobs.push([f,false])});
const K=4,chunks=[...Array(K)].map(()=>[]);jobs.forEach((j,i)=>chunks[i%K].push(j));
let all=[],done=0;const t0=Date.now();
chunks.forEach(c=>execFile('node',[__dirname+'/match-worker.js'],{env:{...process.env,A,B,T,FENS:JSON.stringify(c)},maxBuffer:1e7},(e,so)=>{if(e)console.error(e);all=all.concat(JSON.parse(so.trim().split('\n').pop()));if(++done===K){const s=all.reduce((a,b)=>a+b,0),n=all.length,p=s/n,w=all.filter(x=>x===1).length,l=all.filter(x=>x===0).length;const elo=p<=0||p>=1?(p>=1?999:-999):-400*Math.log10(1/p-1);const se=Math.sqrt(p*(1-p)/n),elo95=400/Math.log(10)*1.96*se/(p*(1-p));console.log(`A ${A.split('/').pop()} vs B ${B.split('/').pop()} @${T}ms: +${w} =${n-w-l} -${l}  ${s}/${n}  Elo ${elo.toFixed(0)} ±${elo95.toFixed(0)}  ${((Date.now()-t0)/1000)|0}s`);}}));
