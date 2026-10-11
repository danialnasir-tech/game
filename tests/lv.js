const Game=require('../chesscore.js')();const E=require('../engine.js')(Game);
const tests=process.argv.slice(2);
for(const fen of tests){const g=new Game(fen);const r=E.rootSearch(fen,30,2500,300);console.log(fen,'d'+r.depth, r.moves.slice(0,4).map(m=>{const h=new Game(fen);return h.move({from:m.from,to:m.to,promotion:m.promotion||undefined}).san+':'+m.score}).join(' '));}
