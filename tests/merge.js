const Game=require('../chesscore.js')();const E=require('../engine.js')(Game);const fs=require('fs');
const all=[...JSON.parse(fs.readFileSync('scratch/mined-a.json')),...JSON.parse(fs.readFileSync('scratch/mined-b.json'))];
const keep=[],seen=new Set();let i=0;
for(const p of all){
  const key=p.fen.split(' ').slice(0,2).join(' '); if(seen.has(key)) continue; seen.add(key);
  const g=new Game(p.fen); let ok=true;
  for(const u of p.sol) if(!g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]})) ok=false;
  if(!ok){console.log('illegal',p.id);continue;}
  if(p.mate && !g.inCheckmate()){console.log('not mate',p.id);continue;}
  // re-verify first move unique with a longer search
  const r=E.rootSearch(p.fen,30,3000,400); const b=r.moves[0],s=r.moves[1];
  const u=b.from+b.to+(b.promotion||'');
  if(u!==p.sol[0]){console.log('best differs',p.id,u,p.sol[0]);continue;}
  if(!(b.score>90000) && s.score>b.score-200){console.log('not unique',p.id,b.score,s.score);continue;}
  i++; p.id='x'+String(i).padStart(2,'0'); keep.push(p);
}
keep.sort((a,b)=>a.r-b.r);
const th={};keep.forEach(p=>th[p.theme]=(th[p.theme]||0)+1);
console.log('kept',keep.length,th, 'ratings', keep.map(p=>p.r).join(','));
fs.writeFileSync('puzzles2.js','// Extra tactics mined from engine self-play and verified by deep search (unique winning move).\nvar PUZZLES_MINED = '+JSON.stringify(keep,null,0).replace(/\},\{/g,'},\n  {')+';\nif (typeof PUZZLES !== \'undefined\') PUZZLES.push.apply(PUZZLES, PUZZLES_MINED);\nif (typeof module !== \'undefined\') module.exports = PUZZLES_MINED;\n');
