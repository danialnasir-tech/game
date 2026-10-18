// Flags every move the app asks a player to make where the piece lands on a square an enemy piece attacks,
// and every move the engine thinks loses material. Run: node tests/audit-moves.js
const Game = require('../chesscore.js')(); const Engine = require('../engine.js')(Game);
const D = require('../data.js'); const M = require('../missions.js').MISSIONS;
const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function uci(g, u) { return g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); }
function attackersOf(g, sq) { const out = []; g.moves().forEach(m => { if (m.to === sq) out.push(m); }); return out; }
const report = [];
function check(label, fen, u, opts) {
  const g = new Game(fen), side = g.turn(), r = uci(g, u); if (!r) { report.push(label + ' ILLEGAL ' + u); return; }
  if (g.inCheckmate()) return;
  const att = attackersOf(g, r.to); // opponent to move now
  if (att.length) {
    const a = Engine.analyzeMove(fen, u, 4, 400);
    const loss = a ? a.loss : 0;
    report.push((loss >= 150 ? 'LOSES ' : 'attacked ') + label + ' ' + r.san + ' on ' + r.to + ' can be taken by ' + att.map(m => m.san).join(',') + (a ? ' · engine loss ' + a.loss : '') + (opts || ''));
  }
}
for (const id of Object.keys(D.LESSONS)) D.LESSONS[id].steps.forEach((s, i) => { if (s.t === 'move' && s.sol) { const g = new Game(s.fen); for (let k = 0; k < s.sol.length; k += 2) { const f = g.fen(); check(id + '#' + i + (k ? ' ply' + k : ''), f, s.sol[k]); uci(g, s.sol[k]); if (s.sol[k + 1]) uci(g, s.sol[k + 1]); } } });
for (const id of Object.keys(M)) M[id].forEach(m => { if (m.sol) { const g = new Game(m.fen); m.sol.forEach((u, k) => { check('mission ' + m.id + ' move ' + (k + 1), g.fen(), u, ' (coach replies vary)'); uci(g, u); const r = g.moves()[0]; }); } if (m.seq) { const g = new Game(m.fen); m.seq.forEach((san, k) => { const mv = g.moves().find(x => x.san.replace(/[+#]/, '') === san); if (mv) { check('mission ' + m.id + ' ' + san, g.fen(), mv.from + mv.to); g.move(mv); const gk = g.moves().find(x => x.piece === 'k') || g.moves()[0]; if (gk) g.move(gk); } }); } });
report.forEach(l => console.log(l)); console.log('total', report.length);
