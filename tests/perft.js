const Game = require('../chesscore.js')();
function perft(g, d){ if(!d) return 1; const ms=g._gen(); if(d===1) return ms.length; let n=0; for(const m of ms){ g._make(m); n+=perft(g,d-1); g._undo(); } return n; }
const tests=[
 [Game.START,[20,400,8902,197281]],
 ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',[48,2039,97862]],
 ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',[14,191,2812,43238]],
 ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',[6,264,9467]],
 ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',[44,1486,62379]],
];
const t0=Date.now();
for(const [fen,exp] of tests){ const g=new Game(fen); exp.forEach((e,i)=>{const r=perft(g,i+1); console.log(r===e?'ok ':'FAIL', i+1, r, e);}); if(g.fen()!==new Game(fen).fen()) console.log('fen drift'); }
console.log('ms',Date.now()-t0);
const g=new Game(); ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O'].forEach(s=>{ if(!g.move(s)) console.log('bad',s)}); console.log(g.fen(), g.history().join(' '));
