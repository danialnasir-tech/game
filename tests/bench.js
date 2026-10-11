const Game = require('../chesscore.js')();
const NewE = require('../engine.js')(Game);
const OldE = require(process.env.OLD||'../engine_old.js')(Game);
const D = require('../data.js');
const T = +process.argv[2] || 300, N = +process.argv[3] || 20;
// tactics
let solved = 0, tot = 0, t0 = Date.now(), depths = [];
for (const p of D.PUZZLES) {
  let fen = p.fen; if (p.pre) { const g = new Game(); p.pre.forEach(s => g.move(s)); fen = g.fen(); }
  const r = NewE.rootSearch(fen, 30, 1000, 0); tot++; depths.push(r.depth);
  const u = r.moves[0].from + r.moves[0].to + (r.moves[0].promotion || '');
  const ok = (p.accept || [p.sol[0]]).includes(u) || (p.mate && r.moves[0].score > 90000);
  if (ok) solved++; else console.log('miss', p.id, u, 'want', p.sol[0], r.moves[0].score);
}
console.log('tactics', solved + '/' + tot, 'avg depth', (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1), (Date.now() - t0) + 'ms');
// match
const starts = D.OPENINGS.map(o => { const g = new Game(); o.moves.slice(0, 6).forEach(s => g.move(s)); return g.fen(); });
let score = 0, games = 0, res = { w: 0, d: 0, l: 0 };
for (let i = 0; i < N; i++) {
  const fen = starts[Math.floor(i / 2) % starts.length], newWhite = i % 2 === 0;
  const g = new Game(fen), fens = [];
  let ply = 0, result = null;
  while (!result) {
    if (g.inCheckmate()) { result = g.turn() === 'w' ? 'b' : 'w'; break; }
    if (g.isDraw() || ply > 200) { result = 'd'; break; }
    const white = g.turn() === 'w', useNew = white === newWhite;
    const r = useNew ? NewE.pickMove(g.fen(), { depth: 40, time: T, margin: 0 }, fens.slice()) : OldE.pickMove(g.fen(), { depth: 40, time: T, margin: 0 });
    fens.push(g.fen());
    g.move({ from: r.move.from, to: r.move.to, promotion: r.move.promotion || undefined }); ply++;
  }
  const newWon = result === 'd' ? 0.5 : ((result === 'w') === newWhite ? 1 : 0);
  score += newWon; games++; if (newWon === 1) res.w++; else if (newWon === 0) res.l++; else res.d++;
  console.log('game', i, newWhite ? 'new=W' : 'new=B', result, ply);
}
console.log('match new vs old', res, 'score', score + '/' + games);
