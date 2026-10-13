// Every coach mission must be legal and winnable within its move limit against its coach.
const Game = require('../chesscore.js')();
const Engine = require('../engine.js')(Game);
const M = require('../missions.js');
const D = require('../data.js');
let errors = 0; const err = (...a) => { errors++; console.log('ERR', ...a); };
function seeded(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// shortest number of our moves to reach the goal, assuming the coach replies with `reply` (BFS over our moves, depth-limited)
function solve(m, g, depth, st, reply) {
  for (const mv of g.moves()) {
    const st2 = { caps: st.caps, k: st.k }, r = g.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
    let res = M.missionCheck(m, g, r, st2), ok = res === 'win';
    if (!ok && res !== 'stalemate' && res !== 'wrong' && depth > 1 && !g.gameOver()) {
      const c = reply(g); if (c) { g.move({ from: c.from, to: c.to, promotion: c.promotion }); ok = solve(m, g, depth - 1, st2, reply); g.undo(); }
    }
    g.undo(); if (ok) return true;
  }
  return false;
}
function greedyRun(m, seed) {
  // our side plays the move that minimises the remaining distance (iterative deepening each turn); coach wanders randomly
  const rnd = seeded(seed), g = new Game(m.fen), st = { caps: 0 };
  if (m.pre) g.move(m.pre);
  for (let n = 1; n <= m.limit; n++) {
    let best = null;
    for (let d = 1; d <= Math.min(5, m.limit - n + 1) && !best; d++) {
      for (const mv of g.moves()) {
        const st2 = { caps: st.caps, k: st.k }, r = g.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
        let res = M.missionCheck(m, g, r, st2), ok = res === 'win';
        if (!ok && res !== 'stalemate' && res !== 'wrong' && d > 1) { const c = M.missionWander(g, seeded(seed + n)); if (c) { g.move(c); ok = solve(m, g, d - 1, st2, x => M.missionWander(x, seeded(seed + n))); g.undo(); } }
        g.undo(); if (ok) { best = mv; break; }
      }
    }
    if (!best) { const caps = g.moves().filter(x => x.captured); best = caps[0] || g.moves()[0]; }
    const r = g.move({ from: best.from, to: best.to, promotion: best.promotion });
    const res = M.missionCheck(m, g, r, st);
    if (res === 'win') return n;
    if (res === 'stalemate' || g.gameOver()) return null;
    const c = M.missionWander(g, rnd); if (!c) return null; g.move(c);
  }
  return null;
}
function mateIn(g, n) { for (const m of g._gen()) { g._make(m); let ok; if (g.inCheck() && g._gen().length === 0) ok = true; else if (n > 1) { const rs = g._gen(); ok = rs.length > 0 && rs.every(r => { g._make(r); const v = mateIn(g, n - 1); g._undo(); return v; }); } g._undo(); if (ok) return true; } return false; }
const stageOne = D.STAGES[0].lessons.filter(id => id !== 'l-board'); // The Board practises with its square quizzes
for (const id of stageOne) if (!M.MISSIONS[id]) err('no missions for', id);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const id in M.MISSIONS) { if (ONLY && ONLY.indexOf(id) < 0) continue;
  if (!D.LESSONS[id]) err('missions for unknown lesson', id);
  const list = M.MISSIONS[id]; if (list.length !== 3) err(id, 'needs 3 missions');
  for (const m of list) {
    const g = new Game(); if (!g.load(m.fen)) { err(m.id, 'bad fen'); continue; }
    if (m.pre && !g.move(m.pre)) { err(m.id, 'bad pre move'); continue; }
    if (g.turn() !== (m.side || 'w')) err(m.id, 'wrong side to move');
    if (m.par > m.limit) err(m.id, 'par > limit');
    if (m.coach === 'defend' && m.goal === 'mate' && m.limit <= 3) {
      let n = 0; for (let k = 1; k <= m.limit && !n; k++) if (mateIn(new Game(g.fen()), k)) n = k;
      if (!n) err(m.id, 'no forced mate within', m.limit); else console.log(m.id, 'forced mate in', n, '(limit', m.limit + ', par', m.par + ')');
      if (n && m.par < n) err(m.id, 'par below forced mate length');
    } else if (m.coach === 'defend') {
      // engine vs engine at full strength on both sides
      const h = new Game(g.fen()), st = { caps: 0 }; let won = 0;
      for (let n = 1; n <= m.limit && !won; n++) {
        const r = Engine.rootSearch(h.fen(), 8, 600); const mv = m.sol && m.sol[n - 1] ? { from: m.sol[n - 1].slice(0, 2), to: m.sol[n - 1].slice(2, 4), promotion: m.sol[n - 1][4] } : r.moves[0]; const x = h.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined }); if (!x) { err(m.id, 'sol move illegal', n); break; }
        if (M.missionCheck(m, h, x, st) === 'win') won = n; else { const d = Engine.rootSearch(h.fen(), 8, 600).moves[0]; if (!d) break; h.move({ from: d.from, to: d.to, promotion: d.promotion || undefined }); }
      }
      if (!won) err(m.id, 'engine could not reach the goal within', m.limit); else console.log(m.id, 'engine reaches goal in', won, '(limit', m.limit + ', par', m.par + ')');
    } else if (m.sol) {
      // opening missions: play the given plan against the friendly coach with several random seeds
      let fails = 0;
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const h = new Game(g.fen()), st = { caps: 0 }, rnd = seeded(seed * 7919); let won = 0;
        for (let n = 1; n <= m.limit && !won; n++) { const u = m.sol[n - 1]; const x = h.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); if (!x) break; if (M.missionCheck(m, h, x, st) === 'win') won = n; else { const c = M.missionWander(h, rnd); if (!c) break; h.move(c); } }
        if (!won) fails++;
      }
      if (fails > 1) err(m.id, fails + '/8 seeds: plan did not finish'); else if (fails) console.log(m.id, 'plan blocked by 1 of 8 random coach replies (player can adapt)'); else console.log(m.id, 'plan works against 8 coach seeds');
    } else {
      const runs = [1, 2, 3, 4, 5, 6, 7, 8].map(s => greedyRun(m, s * 7919));
      const fails = runs.filter(x => x == null).length, worst = Math.max(...runs.filter(x => x != null));
      if (fails) err(m.id, fails + '/8 runs did not finish within', m.limit, runs);
      else console.log(m.id, 'finished in', runs.join(','), '(limit', m.limit + ', par', m.par + ')');
      if (!fails && Math.min(...runs) > m.par) err(m.id, 'par too tight', runs);
    }
  }
}
console.log('missions errors', errors); process.exit(errors ? 1 : 0);
