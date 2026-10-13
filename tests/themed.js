// Generates puzzles-themed.js: small, clean puzzles for each tactic lesson (forks, pins, skewers, discovered attacks,
// back-rank mates, promotion). Every puzzle is checked with a material search: exactly one move wins, by a clear margin.
const Game = require('../chesscore.js')(); const fs = require('fs');
let rs = 7331; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const SQ = []; 'abcdefgh'.split('').forEach(f => { for (let r = 1; r <= 8; r++) SQ.push(f + r); });
const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }, NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
function fenFrom(pcs, side) {
  const rows = []; for (let r = 8; r >= 1; r--) { let row = '', e = 0; for (const f of 'abcdefgh') { const p = pcs[f + r]; if (p) { if (e) { row += e; e = 0; } row += p; } else e++; } if (e) row += e; rows.push(row); }
  return rows.join('/') + ' ' + side + ' - - 0 1';
}
function dist(a, b) { return Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(a[1] - b[1])); }
function material(g) { let s = 0; for (const sq of SQ) { const p = g.get(sq); if (p) s += (p.color === 'w' ? 1 : -1) * V[p.type]; } return s; }
// negamax on material, white's point of view returned; leaf = captures-only quiescence
function q(g, a, b, d) {
  const sgn = g.turn() === 'w' ? 1 : -1, ms = g.moves();
  if (!ms.length) return g.inCheck() ? -1000 : 0;
  let stand = sgn * material(g); if (d <= 0) return stand;
  if (stand >= b) return stand; if (stand > a) a = stand;
  for (const m of ms) { if (!m.captured && !m.promotion) continue; g.move(m); const v = -q(g, -b, -a, d - 1); g.undo(); if (v >= b) return v; if (v > a) a = v; }
  return a;
}
function search(g, depth, a, b) {
  const ms = g.moves(); if (!ms.length) return g.inCheck() ? -1000 - depth : 0;
  if (depth === 0) return q(g, a, b, 4);
  let best = -1e9;
  for (const m of ms) { g.move(m); const v = -search(g, depth - 1, -b, -a); g.undo(); if (v > best) best = v; if (v > a) a = v; if (a >= b) break; }
  return best;
}
function rootScores(g, depth) { return g.moves().map(m => { g.move(m); const v = -search(g, depth - 1, -1e9, 1e9); g.undo(); return { m, v }; }).sort((x, y) => y.v - x.v); }
const RAYS = { b: [[1, 1], [1, -1], [-1, 1], [-1, -1]], r: [[1, 0], [-1, 0], [0, 1], [0, -1]] }; RAYS.q = RAYS.b.concat(RAYS.r);
function ray(g, from, d) { const out = []; let f = from.charCodeAt(0) - 97 + d[0], r = +from[1] + d[1]; while (f >= 0 && f < 8 && r >= 1 && r <= 8) { const s = 'abcdefgh'[f] + r; out.push(s); f += d[0]; r += d[1]; } return out; }
function attacksOf(g, sq) { // black pieces the white piece on sq attacks (ignoring pins)
  const p = g.get(sq), out = []; if (!p) return out;
  const parts = g.fen().split(' '); parts[1] = 'w'; parts[3] = '-'; const t = new Game(parts.join(' '));
  // king capture is illegal in move gen, so detect king attack separately
  const bk = SQ.find(s => { const x = g.get(s); return x && x.type === 'k' && x.color === 'b'; });
  t.moves({ square: sq }).forEach(m => { if (m.captured) out.push(m.to); });
  if (bk && t.attacked && attackedBy(g, bk, sq)) out.push(bk);
  return out;
}
function attackedBy(g, target, from) {
  const p = g.get(from); if (!p) return false; const tf = target.charCodeAt(0) - 97, tr = +target[1], ff = from.charCodeAt(0) - 97, fr = +from[1], df = tf - ff, dr = tr - fr;
  if (p.type === 'n') return (Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1);
  if (p.type === 'p') return Math.abs(df) === 1 && dr === (p.color === 'w' ? 1 : -1);
  if (p.type === 'k') return Math.max(Math.abs(df), Math.abs(dr)) === 1;
  const dirs = RAYS[p.type]; for (const d of dirs) { for (const s of ray(g, from, d)) { if (s === target) return true; if (g.get(s)) break; } } return false;
}
function classify(g0, m) {
  if (m.captured) return null;
  const g = new Game(g0.fen()); g.move(m);
  const bk = SQ.find(s => { const x = g.get(s); return x && x.type === 'k' && x.color === 'b'; });
  const check = g.inCheck();
  const direct = attacksOf(g, m.to).filter(s => s === bk || V[g.get(s).type] >= 3);
  const p = g.get(m.to);
  if (RAYS[p.type]) for (const d of RAYS[p.type]) {
    const line = ray(g, m.to, d), hits = line.filter(s => g.get(s)); if (hits.length < 2) continue;
    const a = g.get(hits[0]), b = g.get(hits[1]); if (a.color !== 'b' || b.color !== 'b') continue;
    // nothing between: hits are the first two pieces on the line
    if (a.type === 'k' && V[b.type] >= 3) return { theme: 'skewer', front: hits[0], back: hits[1], check };
    if (a.type !== 'k' && (b.type === 'k' || V[b.type] > V[a.type])) return { theme: 'pin', front: hits[0], back: hits[1], check };
  }
  if (direct.length >= 2) return { theme: 'fork', targets: direct, check };
  // discovered: another white line piece now attacks something through the square we left
  for (const s of SQ) { const x = g.get(s); if (!x || x.color !== 'w' || !RAYS[x.type] || s === m.to) continue;
    const hit = attacksOf(g, s).filter(t => (t === bk || V[g.get(t).type] >= 5) && ray(g, s, dirOf(s, t)).indexOf(m.from) >= 0 && ray(g, s, dirOf(s, t)).indexOf(m.from) < ray(g, s, dirOf(s, t)).indexOf(t));
    if (hit.length) return { theme: 'discovered', by: s, target: hit[0], check }; }
  return null;
}
function dirOf(a, b) { const df = Math.sign(b.charCodeAt(0) - a.charCodeAt(0)), dr = Math.sign(b[1] - a[1]); return [df, dr]; }
const out = [], seen = new Set();
function verified(fen, wantTheme, minGain) {
  const g = new Game(); if (!g.load(fen)) return null; if (g.inCheck() || g.inCheck(8) || g.gameOver()) return null;
  const base = material(g), sc = rootScores(g, 3); if (sc.length < 2) return null;
  const best = sc[0], second = sc[1];
  if (best.v - base < minGain || best.v - second.v < 2) return null;
  const c = classify(g, best.m); if (!c || c.theme !== wantTheme) return null;
  // the line: our move, best reply, our win
  const g2 = new Game(fen); g2.move(best.m); const rep = rootScores(g2, 2)[0]; if (!rep) return null; g2.move(rep.m);
  const fin = rootScores(g2, 1)[0]; if (!fin || !fin.m.captured) return null;
  return { m: best.m, gain: best.v - base, c, line: [best.m, rep.m, fin.m] };
}
function gen(theme, n, build, minGain, r, explain) {
  let tries = 0, made = 0;
  while (made < n && tries++ < 60000) {
    const pcs = build(); if (!pcs) continue; const fen = fenFrom(pcs, 'w'), key = fen.split(' ')[0]; if (seen.has(key)) continue;
    const v = verified(fen, theme, minGain); if (!v) continue; seen.add(key); made++;
    const u = x => x.from + x.to + (x.promotion || '');
    out.push({ title: theme === 'fork' ? NAME[v.m.piece].replace(/^./, c => c.toUpperCase()) + ' fork' : theme === 'pin' ? 'Pin to win' : theme === 'skewer' ? 'Skewer' : 'Discovered attack',
      theme, r, fen, sol: v.line.map(u), explain: explain(v) });
  }
  console.log(theme, made, 'of', n, 'tries', tries);
}
function place(pcs, letter, filter) { for (let i = 0; i < 40; i++) { const s = pick(SQ); if (!pcs[s] && (!filter || filter(s))) { pcs[s] = letter; return s; } } return null; }
const notBack = s => !/[18]/.test(s[1]);
function kings() { const pcs = {}, wk = pick(SQ), bk = pick(SQ); if (dist(wk, bk) < 3) return null; pcs[wk] = 'K'; pcs[bk] = 'k'; return pcs; }
// ---- forks: one white attacker + one or two helpers, black has a valuable piece or two
gen('fork', 14, () => { const p = kings(); if (!p) return null; place(p, 'N'); place(p, pick(['r', 'q'])); if (rnd() < .6) place(p, pick(['r', 'b', 'n'])); if (rnd() < .5) place(p, 'p', notBack); if (rnd() < .4) place(p, 'P', notBack); return p; }, 3, 420,
  v => 'N' + v.m.to + (v.c.check ? '+' : '') + ' attacks two pieces at once' + (v.c.check ? ', and one of them is the king' : '') + '. Only one can be saved, so you win the other.');
gen('fork', 6, () => { const p = kings(); if (!p) return null; place(p, 'Q'); place(p, pick(['r', 'b', 'n'])); place(p, pick(['r', 'n', 'b'])); if (rnd() < .5) place(p, 'p', notBack); return p; }, 3, 520,
  v => 'Q' + v.m.to + (v.c.check ? '+' : '') + ' attacks two targets at once. Black can only save one.');
gen('fork', 5, () => { const p = kings(); if (!p) return null; place(p, 'P', s => /[3-6]/.test(s[1])); place(p, pick(['n', 'b', 'r'])); place(p, pick(['n', 'b', 'r', 'q'])); if (rnd() < .5) place(p, pick(['R', 'B'])); return p; }, 3, 480,
  v => 'The pawn steps forward and attacks two pieces at once. Pawn forks win pieces for almost nothing.');
// ---- pins, skewers, discovered attacks: build the line on purpose, then let the search decide
const DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
function lineFrom(sq, d, n) { const r = ray(null, sq, d); return r.slice(0, n); }
function lineBuild(frontType, backType) { // black front piece, then black back piece further along the same line
  const pcs = {}, d = pick(DIRS), diag = d[0] && d[1], f = pick(SQ), path = lineFrom(f, d, 7); if (path.length < 3) return null;
  const gap = 1 + Math.floor(rnd() * Math.min(3, path.length - 1)); const back = path[gap - 1 + 1] || path[path.length - 1];
  pcs[f] = frontType; pcs[back] = backType;
  const wk = pick(SQ); if (pcs[wk] || ['k', 'K'].some(k => false)) return null; pcs[wk] = 'K';
  if (frontType !== 'k' && backType !== 'k') { const bk = place(pcs, 'k'); if (!bk) return null; }
  // the attacker sits somewhere it can reach the line behind the front piece, opposite the back piece
  place(pcs, pick(diag ? ['B', 'Q', 'B'] : ['R', 'Q', 'R']));
  if (rnd() < .5) place(pcs, pick(['P', 'N']), notBack); if (rnd() < .5) place(pcs, 'p', notBack);
  for (const s of SQ) if (pcs[s] === 'K') { for (const t of SQ) if (pcs[t] === 'k' && dist(s, t) < 2) return null; }
  return pcs;
}
const NM = s => NAME[s.toLowerCase()];
gen('pin', 14, () => lineBuild(pick(['n', 'b', 'r', 'n']), pick(['k', 'q', 'k', 'r'])), 3, 520,
  v => 'Your move pins a black piece on ' + v.c.front + ': it cannot move away without exposing the more valuable piece behind it on ' + v.c.back + '. So you win material.');
gen('skewer', 14, () => lineBuild('k', pick(['q', 'r', 'r', 'q', 'b'])), 3, 540,
  v => 'Check! The king must step off the line, and then you capture the piece behind it on ' + v.c.back + '.');
gen('discovered', 12, () => {
  const pcs = {}, d = pick(DIRS), diag = d[0] && d[1], w = pick(SQ), path = lineFrom(w, d, 7); if (path.length < 3) return null;
  pcs[w] = pick(diag ? ['B', 'Q'] : ['R', 'Q']); const bi = Math.floor(rnd() * Math.min(2, path.length - 2)); pcs[path[bi]] = pick(['N', 'B', 'N', 'P']);
  const ti = bi + 1 + Math.floor(rnd() * (path.length - bi - 1)); pcs[path[ti]] = pick(['q', 'r', 'k']);
  if (pcs[path[bi]] === 'P' && /[18]/.test(path[bi][1])) return null;
  if (!SQ.some(s => pcs[s] === 'k')) { if (!place(pcs, 'k')) return null; }
  if (!place(pcs, 'K')) return null; place(pcs, pick(['q', 'r', 'n', 'b'])); if (rnd() < .5) place(pcs, 'p', notBack);
  for (const s of SQ) if (pcs[s] === 'K') { for (const t of SQ) if (pcs[t] === 'k' && dist(s, t) < 2) return null; }
  return pcs; }, 3, 680,
  v => 'Your piece steps off the line and uncovers an attack by the piece behind it' + (v.c.check ? ', with check' : '') + '. Two threats in one move: Black cannot answer both.');
// ---- back-rank mates (mate in one)
const bmade = []; let bt = 0;
while (bmade.length < 12 && bt++ < 200000) {
  const pcs = {}, side = pick(['k', 'q']), bk = side === 'k' ? pick(['g8', 'h8', 'f8']) : pick(['b8', 'c8', 'a8']);
  pcs[bk] = 'k'; const f = bk.charCodeAt(0) - 97;[f - 1, f, f + 1].forEach(x => { if (x >= 0 && x < 8) pcs['abcdefgh'[x] + '7'] = 'p'; });
  const wk = pick(SQ.filter(s => +s[1] <= 3)); if (pcs[wk]) continue; pcs[wk] = 'K';
  place(pcs, pick(['R', 'Q', 'R']), s => +s[1] <= 6); if (rnd() < .6) place(pcs, pick(['r', 'b', 'n']), s => +s[1] >= 4 && s[1] !== '8'); if (rnd() < .5) place(pcs, 'P', s => +s[1] >= 2 && +s[1] <= 4);
  const fen = fenFrom(pcs, 'w'), g = new Game(); if (!g.load(fen) || g.inCheck() || g.inCheck(8)) continue;
  const mates = g.moves().filter(m => { g.move(m); const ok = g.inCheckmate(); g.undo(); return ok; });
  if (mates.length !== 1 || mates[0].to[1] !== '8') continue;
  const key = fen.split(' ')[0]; if (seen.has(key)) continue; seen.add(key);
  bmade.push(1); out.push({ title: 'Back-rank mate', theme: 'mate', r: 360, fen, sol: [mates[0].from + mates[0].to], mate: 1, backrank: true,
    explain: mates[0].san + '# The king is stuck behind its own pawns, so a check on the back rank is checkmate.' });
}
console.log('backrank', bmade.length);
// ---- promotion: push the pawn home and make a queen safely
const pm = []; let pt = 0;
while (pm.length < 10 && pt++ < 200000) {
  const pcs = kings(); if (!pcs) continue; const ps = place(pcs, 'P', s => s[1] === '7'); if (!ps) continue; if (rnd() < .7) place(pcs, pick(['r', 'b', 'n', 'p']), s => s[1] !== '1');
  const fen = fenFrom(pcs, 'w'), g = new Game(); if (!g.load(fen) || g.inCheck() || g.inCheck(8) || g.gameOver()) continue;
  const sc = rootScores(g, 2); if (sc.length < 2) continue; const best = sc[0];
  if (best.m.piece !== 'p' || best.m.promotion !== 'q' || best.v - material(g) < 7) continue;
  const alt = sc.filter(x => !(x.m.from === best.m.from && x.m.to === best.m.to) && x.v >= best.v - 2); if (alt.length) continue;
  const key = fen.split(' ')[0]; if (seen.has(key)) continue; seen.add(key);
  pm.push(1); out.push({ title: 'Make a queen', theme: 'promotion', r: 260, fen, sol: [best.m.from + best.m.to + 'q'], pieces: ['p'],
    explain: 'The pawn reaches the last rank and becomes a queen' + (best.m.captured ? ', capturing on the way' : '') + ', and nothing can take her.' });
}
console.log('promotion', pm.length);
out.forEach((p, i) => { p.id = 'g' + String(i + 1).padStart(3, '0'); });
fs.writeFileSync('puzzles-themed.js', '// Clean, verified puzzles for each tactic lesson. Generated by tests/themed.js.\nvar PUZZLES_THEMED = ' + JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n  {') + ';\nif (typeof PUZZLES !== \'undefined\') PUZZLES.push.apply(PUZZLES, PUZZLES_THEMED);\nif (typeof module !== \'undefined\') module.exports = PUZZLES_THEMED;\n');
console.log('total', out.length);
