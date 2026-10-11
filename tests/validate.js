const Game = require('../chesscore.js')();
const Engine = require('../engine.js')(Game);
const D = require('../data.js');
let errors=0; const err=(...a)=>{errors++;console.log('ERR',...a)};
function playLine(fen, sans, label){ const g=new Game(fen); for(const s of sans){ if(!g.move(s)) { err(label,'illegal',s,'in',g.fen()); return null;} } return g; }
function uciMove(g,u){ return g.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}); }
function mateIn(g,n){ const ms=g._gen(); for(const m of ms){ g._make(m); let ok; if(g.inCheck() && g._gen().length===0) ok=true; else if(n>1){ const rs=g._gen(); ok = rs.length>0 && rs.every(r=>{g._make(r); const v=mateIn(g,n-1); g._undo(); return v;}); } g._undo(); if(ok) return true;} return false; }
function firstMovesMating(g,n){ const out=[]; for(const m of g._gen()){ g._make(m); let ok; if(g.inCheck()&&g._gen().length===0) ok=true; else if(n>1){const rs=g._gen(); ok=rs.length>0&&rs.every(r=>{g._make(r);const v=mateIn(g,n-1);g._undo();return v;});} g._undo(); if(ok) out.push(Game.sqName(m.f)+Game.sqName(m.t)+(m.promotion||'')); } return out; }
// Lessons
for(const st of D.STAGES) for(const id of st.lessons){ const L=D.LESSONS[id]; if(!L){err('missing lesson',id);continue;}
  L.steps.forEach((s,i)=>{ const lab=id+'#'+i;
    if(s.t==='collect') return;
    const g=new Game(); if(!g.load(s.fen)) {err(lab,'bad fen');return;}
    if(s.line) playLine(s.fen,s.line,lab+' line');
    if(s.t==='move'){ const h=new Game(s.fen); for(let k=0;k<s.sol.length;k++){ if(!uciMove(h,s.sol[k])) {err(lab,'illegal sol',s.sol[k]); return;} }
      if(s.anyMate && !h.inCheckmate()) err(lab,'not mate');
      (s.accept||[]).forEach(a=>{const q=new Game(s.fen); if(!uciMove(q,a)) err(lab,'bad accept',a)});
      if(s.anyMate){ const q=new Game(s.fen); console.log(lab,'mates:',firstMovesMating(q,s.sol.length>1?2:1).join(','));}
    }
  });
}
// Openings
for(const o of D.OPENINGS){ if(o.moves.length!==o.notes.length) err(o.id,'notes',o.notes.length,'moves',o.moves.length); const g=playLine(Game.START,o.moves,o.id); if(g && o.moves[o.moves.length-1].includes('#') && !g.inCheckmate()) err(o.id,'final not mate'); }
// Extra openings and defence lines
const X = require('../defences.js');
for(const o of X.EXTRA_OPENINGS){ if(o.moves.length!==o.notes.length) err(o.id,'notes'); playLine(Game.START,o.moves,o.id); }
for(const id of Object.keys(X.DEFENCES)){ const d=X.DEFENCES[id]; if(!D.OPENINGS.concat(X.EXTRA_OPENINGS).some(o=>o.id===id)) err('defence for unknown opening',id); if(d.moves.length!==d.notes.length) err('def-'+id,'notes',d.notes.length,'moves',d.moves.length); playLine(Game.START,d.moves,'def-'+id); }
// Puzzles
for(const p of D.PUZZLES){ let fen=p.fen; if(p.pre){ const g=playLine(Game.START,p.pre,p.id); if(!g) continue; fen=g.fen(); }
  const h=new Game(fen); for(const u of p.sol) if(!uciMove(h,u)) {err(p.id,'illegal',u);break;}
  if(p.mate){ const ms=firstMovesMating(new Game(fen),p.mate); if(!ms.includes(p.sol[0])) err(p.id,'sol not mate',ms); else console.log(p.id,'mating first moves',ms.join(','));}
  else if(p.theme!=='endgame'){ const r=Engine.rootSearch(fen,4,4000,50); const top=r.moves.slice(0,4).map(m=>m.from+m.to+(m.promotion||'')+':'+m.score); const ok=(p.accept||[p.sol[0]]).includes(top[0].split(':')[0]); console.log(ok?'ok ':'?? ',p.id,p.theme,'d'+r.depth,top.join(' ')); }
}
console.log('errors',errors);
