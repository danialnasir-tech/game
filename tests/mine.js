// Mine tactics puzzles from engine self-play. Each candidate is verified by deep search:
// the solver's moves must be the only good move (big margin over the second best).
const Game = require('../chesscore.js')();
const E = require('../engine.js')(Game);
const D = require('../data.js');
const fs = require('fs');
const seed = +process.argv[2] || 1, target = +process.argv[3] || 40, out = process.argv[4] || 'scratch/mined-' + seed + '.json';
let rs = seed * 7919; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
const MATE = E.MATE, VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const starts = D.OPENINGS.map(o => o.moves);
const found = [], seen = new Set();
function uci(m) { return m.from + m.to + (m.promotion || ''); }
function san(fen, u) { const g = new Game(fen); const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); return m ? m.san : u; }
function material(g) { let s = 0; const b = g.board; for (let i = 0; i < 120; i++) { if (i & 0x88) { i += 7; continue; } const p = b[i]; if (p) { const t = '.pnbrqk'[p & 7]; s += (p & 8 ? -1 : 1) * VAL[t]; } } return s; }
function pieceCount(g) { let n = 0; const b = g.board; for (let i = 0; i < 120; i++) { if (i & 0x88) { i += 7; continue; } if (b[i] && (b[i] & 7) !== 1 && (b[i] & 7) !== 6) n++; } return n; }
// solver line: our unique move, their best reply, repeat while still unique and not yet "cashed in"
function verify(fen) {
  const r = E.rootSearch(fen, 30, 1500, 400);
  if (r.moves.length < 2) return null;
  const best = r.moves[0], second = r.moves[1];
  const isMate = best.score > MATE - 100;
  if (best.score < 250) return null;
  if (!isMate && second.score > best.score - 250) return null;
  if (!isMate && second.score > 180) return null;           // second move must not also win clearly
  if (isMate && second.score > MATE - 100) return null;     // unique mating move
  return { best, second, depth: r.depth, isMate, mateIn: isMate ? Math.ceil((MATE - best.score) / 2) : 0 };
}
function buildLine(fen) {
  const v = verify(fen); if (!v) return null;
  const sol = [uci(v.best)], g = new Game(fen), side = g.turn();
  const mat0 = material(g) * (side === 'w' ? 1 : -1);
  g.move({ from: v.best.from, to: v.best.to, promotion: v.best.promotion || undefined });
  let plies = 1;
  while (!g.gameOver() && plies < (v.isMate ? v.mateIn * 2 - 1 : 5)) {
    const rr = E.rootSearch(g.fen(), 30, 700, 0); if (!rr.moves.length) break;
    const rep = rr.moves[0]; sol.push(uci(rep)); g.move({ from: rep.from, to: rep.to, promotion: rep.promotion || undefined }); plies++;
    if (g.gameOver()) break;
    const matNow = material(g) * (side === 'w' ? 1 : -1);
    if (!v.isMate && matNow - mat0 >= 2 && plies >= 2) { sol.pop(); plies--; g.undo(); break; } // already ahead after their reply: stop on our move
    const v2 = verify(g.fen());
    if (!v2) { sol.pop(); g.undo(); break; }
    sol.push(uci(v2.best)); g.move({ from: v2.best.from, to: v2.best.to, promotion: v2.best.promotion || undefined }); plies++;
    if (!v.isMate) { const m2 = material(g) * (side === 'w' ? 1 : -1); if (m2 - mat0 >= 2 && !g.inCheck()) break; }
  }
  if (v.isMate && !g.inCheckmate()) return null;
  if (sol.length % 2 === 0) sol.pop();
  // final material check for non-mates
  const h = new Game(fen); sol.forEach(u => h.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }));
  const gain = material(h) * (side === 'w' ? 1 : -1) - mat0;
  if (!v.isMate && gain < 2 && !/[qr]/.test(sol.map(u => u[4] || '').join(''))) {
    // gain might come one ply later (quiet first move): accept only if eval is clearly winning
    if (v.best.score < 300) return null;
  }
  return { v, sol, gain, side };
}
function classify(fen, line) {
  const g = new Game(fen), u = line.sol[0];
  const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  if (line.v.isMate) return { theme: 'mate', title: line.v.mateIn === 1 ? 'Mate in one' : 'Mate in ' + line.v.mateIn };
  if (line.sol.some(x => x[4])) return { theme: 'promotion', title: 'Promote and win' };
  // fork: moved piece attacks two valuable targets (king counts) after the move
  const to = m.to, b = g.board, sq = (s) => (8 - +s[1]) * 16 + (s.charCodeAt(0) - 97);
  const myCol = m.color === 'w' ? 0 : 8; let targets = 0;
  const probe = new Game(g.fen()); // generate the moved piece's attacks by flipping side
  const parts = g.fen().split(' '); parts[1] = m.color; parts[3] = '-';
  try { const f = new Game(parts.join(' ')); f._pseudo(false).forEach(mm => { if (mm.f === sq(to) && mm.captured && (VAL[mm.captured] >= 3 || mm.captured === 'k')) targets++; }); } catch (e) { }
  if (g.inCheck() && targets >= 1) targets++;
  if (targets >= 2 && m.piece !== 'k') return { theme: 'fork', title: { n: 'Knight fork', p: 'Pawn fork', b: 'Bishop fork', r: 'Rook fork', q: 'Queen fork' }[m.piece] || 'Fork' };
  if (pieceCount(new Game(fen)) <= 4) return { theme: 'endgame', title: 'Endgame accuracy' };
  if (m.captured && line.sol.length === 1) return { theme: 'hanging', title: 'Take the free ' + { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' }[m.captured] };
  if (m.captured) return { theme: 'combo', title: 'Winning combination' };
  return { theme: 'combo', title: 'Quiet killer move' };
}
function explain(fen, line, cls) {
  const g = new Game(fen), sans = [];
  line.sol.forEach(u => { const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); sans.push(m.san); });
  const first = sans[0], rest = sans.slice(1).join(' ');
  if (cls.theme === 'mate') return first + (rest ? ' and after ' + rest.replace(/ /g, ', ') : '') + ' the king has no escape.';
  const gain = line.gain >= 9 ? 'a queen' : line.gain >= 5 ? 'a rook' : line.gain >= 3 ? 'a piece' : line.gain >= 1 ? 'material' : 'a decisive edge';
  const why = cls.theme === 'fork' ? first + ' attacks two targets at once and only one can be saved.' :
    cls.theme === 'hanging' ? first + ' simply grabs an undefended piece. Always check what your opponent left unprotected.' :
    cls.theme === 'promotion' ? first + ' clears the way for a new queen.' :
    cls.theme === 'endgame' ? first + ' is the only move that keeps the win.' :
    first + ' starts a forcing sequence' + (rest ? ': ' + rest : '') + '.';
  return why + ' You come out ' + gain + ' ahead.';
}
function rating(fen, line) {
  // shallowest depth at which a quick search already finds the move
  let d;
  for (d = 1; d <= 8; d++) { const r = E.rootSearch(fen, d, 3000, 0); if (r.moves.length && uci(r.moves[0]) === line.sol[0]) { const r2 = E.rootSearch(fen, d + 1, 3000, 0); if (uci(r2.moves[0]) === line.sol[0]) break; } }
  let base = 350 + d * 160 + (line.sol.length - 1) * 70;
  if (line.v.isMate && line.v.mateIn === 1) base = Math.min(base, 600);
  return Math.round(Math.min(2200, base) / 25) * 25;
}
let games = 0; const t0 = Date.now();
while (found.length < target && games < 400) {
  games++;
  const line = starts[Math.floor(rnd() * starts.length)];
  const g = new Game(); line.slice(0, 2 + Math.floor(rnd() * Math.min(8, line.length - 1))).forEach(s => g.move(s));
  // two imperfect players: occasional mistakes create tactics
  const lv = [{ depth: 2, time: 80, margin: 120 }, { depth: 3, time: 120, margin: 60 }, { depth: 4, time: 150, margin: 25 }];
  for (let ply = 0; ply < 120 && !g.gameOver(); ply++) {
    const fen = g.fen(), key = fen.split(' ').slice(0, 2).join(' ');
    if (ply >= 4 && !seen.has(key) && !g.inCheck()) {
      seen.add(key);
      const quick = E.rootSearch(fen, 4, 150, 0);
      if (quick.moves.length > 1 && quick.moves[0].score >= 250) {
        const pre = E.evalPos(fen, 3);
        const L = buildLine(fen);
        if (L) {
          const cls = classify(fen, L);
          const p = { id: 'm' + seed + '-' + found.length, title: cls.title, theme: cls.theme, r: rating(fen, L), fen, sol: L.sol, explain: explain(fen, L, cls) };
          if (L.v.isMate) p.mate = L.v.mateIn;
          found.push(p); fs.writeFileSync(out, JSON.stringify(found, null, 1));
          console.log(found.length, p.theme, p.r, p.title, p.sol.join(' '), '|', p.explain, ((Date.now() - t0) / 1000 | 0) + 's');
          break; // one puzzle per game for variety
        }
      }
    }
    const l = lv[Math.floor(rnd() * lv.length)];
    const r = E.pickMove(fen, l);
    if (!r) break;
    g.move({ from: r.move.from, to: r.move.to, promotion: r.move.promotion || undefined });
  }
}
console.log('done', found.length, 'games', games);
