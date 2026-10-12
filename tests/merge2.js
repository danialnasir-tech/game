// Add newly mined puzzles to puzzles2.js without touching the ones already there (players' progress is keyed by id).
// Usage: node tests/merge2.js scratch/mined-11.json scratch/mined-12.json ...
const Game=require('../chesscore.js')();const E=require('../engine.js')(Game);const fs=require('fs');
const D=require('../data.js');const old=require('../puzzles2.js');
const fenOf=p=>{if(p.fen)return p.fen;const g=new Game();(p.pre||[]).forEach(m=>g.move(m));return g.fen();};
const seen=new Set([...D.PUZZLES,...old].map(p=>fenOf(p).split(' ').slice(0,2).join(' ')));
let n=old.filter(p=>/^y/.test(p.id)).length;const add=[];
for(const f of process.argv.slice(2)) for(const p of JSON.parse(fs.readFileSync(f))){
  const key=p.fen.split(' ').slice(0,2).join(' '); if(seen.has(key)) continue; seen.add(key);
  const g=new Game(p.fen); let ok=true;
  for(const u of p.sol) if(!g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]})) ok=false;
  if(!ok){console.log('illegal',p.id);continue;}
  if(p.mate && !g.inCheckmate()){console.log('not mate',p.id);continue;}
  const r=E.rootSearch(p.fen,30,3000,400); const b=r.moves[0],s=r.moves[1];
  if(b.from+b.to+(b.promotion||'')!==p.sol[0]){console.log('best differs',p.id);continue;}
  if(!(b.score>90000) && s.score>b.score-200){console.log('not unique',p.id);continue;}
  p.id='y'+String(++n).padStart(3,'0'); add.push(p);
}
const all=old.concat(add.sort((a,b)=>a.r-b.r));
const th={};add.forEach(p=>th[p.theme]=(th[p.theme]||0)+1);
console.log('added',add.length,th,'total mined',all.length);
fs.writeFileSync('puzzles2.js','// Extra tactics mined from engine self-play and verified by deep search (unique winning move).\nvar PUZZLES_MINED = '+JSON.stringify(all,null,0).replace(/\},\{/g,'},\n  {')+';\nif (typeof PUZZLES !== \'undefined\') PUZZLES.push.apply(PUZZLES, PUZZLES_MINED);\nif (typeof module !== \'undefined\') module.exports = PUZZLES_MINED;\n');
