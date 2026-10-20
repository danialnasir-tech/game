// node sfrun.js ENGINE T SF_ELO pairs [ST]
const {execFile}=require('child_process');const Game=require(''+__dirname+'/../../chesscore.js')();const D=require(''+__dirname+'/../../data.js');
const [ENG,T,ELO,P,ST]=[process.argv[2],process.argv[3],process.argv[4],+process.argv[5]||20,process.argv[6]||process.argv[3]];
const starts=[];D.OPENINGS.concat(require(''+__dirname+'/../../defences.js').EXTRA_OPENINGS).forEach(o=>[4,6,8].forEach(n=>{const g=new Game();try{o.moves.slice(0,n).forEach(m=>g.move(m));starts.push(g.fen())}catch(e){}}));
const uniq=[...new Set(starts)].filter((x,i)=>i%2===0).slice(0,P),jobs=[];uniq.forEach(f=>{jobs.push([f,true]);jobs.push([f,false])});
const K=4,chunks=[...Array(K)].map(()=>[]);jobs.forEach((j,i)=>chunks[i%K].push(j));let all=[],done=0;const t0=Date.now();
chunks.forEach(c=>execFile('node',[__dirname+'/calibrate-worker.js'],{env:{...process.env,ENG,T,ST,ELO,FENS:JSON.stringify(c)},maxBuffer:1e7,timeout:7200000},(e,so)=>{if(e)console.error(e.message);try{all=all.concat(JSON.parse(so.trim().split('\n').pop()))}catch(x){}
 if(++done===K){const s=all.reduce((a,b)=>a+b,0),n=all.length,p=s/n,w=all.filter(x=>x===1).length,l=all.filter(x=>x===0).length,d=p<=0||p>=1?(p>=1?400:-400):-400*Math.log10(1/p-1);
 console.log(`${ENG.split('/').pop()} @${T}ms vs Stockfish ${ELO} @${ST}ms: +${w} =${n-w-l} -${l} ${s}/${n} -> about ${Math.round(+ELO+d)} (diff ${d.toFixed(0)})  ${((Date.now()-t0)/1000)|0}s`);}}));
