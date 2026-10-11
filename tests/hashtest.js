const Game=require('../chesscore.js')();
let bad=0,n=0;
function walk(g,d){ if(!d) return; for(const m of g._gen()){ g._make(m); n++; const l=g.hl,h=g.hh; g.rehash(); if(g.hl!==l||g.hh!==h) bad++; g.hl=l; g.hh=h; walk(g,d-1); g._undo(); } }
for(const f of [Game.START,'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1','rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8']){const g=new Game(f);const h0=g.hl;walk(g,3);if(g.hl!==h0)bad++;}
console.log('positions',n,'hash mismatches',bad);
