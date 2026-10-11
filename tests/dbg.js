const Game = require('../chesscore.js')(); const E = require('../engine.js')(Game);
let g=new Game('6k1/5ppp/5n2/3r2B1/8/2N5/5PPP/6K1 w - - 0 1'); g.move('Bxf6');
let r=E.rootSearch(g.fen(),4,5000,30); console.log(r.depth, r.moves.slice(0,5).map(m=>m.from+m.to+':'+m.score).join(' '));
