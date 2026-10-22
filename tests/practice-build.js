// Builds practice.js: "play it out" games after every 400-1200 lesson. A real position, a real opponent (the coach
// engine at a stated level), and a goal you must actually reach: win material and keep it, mate, or survive without
// losing material. Every game is verified by playing it out several times: our side plays the engine's best move,
// the coach answers at its level (with its randomness). Only positions won in every run are kept.
const fs = require('fs'), vm = require('vm'), Game = require('../chesscore.js')(), E = require('../engine.js')(Game);
const c = {}; vm.createContext(c);
['chesscore.js', 'data.js', 'lessons2.js', 'puzzles2.js', 'puzzles-starter.js', 'puzzles-themed.js'].forEach(f => vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), c));
vm.runInContext('this.ALL=PUZZLES.concat(typeof PUZZLES_MINED!=="undefined"?PUZZLES_MINED:[],typeof PUZZLES_STARTER!=="undefined"?PUZZLES_STARTER:[],typeof PUZZLES_THEMED!=="undefined"?PUZZLES_THEMED:[]);this.U=LESSONS2_USED;this.LV=COACH_LEVELS', c);
const LV = id => c.LV.filter(l => l.id === id)[0];
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function mat(g, col) { let v = 0; g.boardArray().forEach(r => r.forEach(p => { if (p) v += (p.color === col ? 1 : -1) * VAL[p.type]; })); return v; }
function fenOf(p) { return p.fen; }
// play it out: returns { ok, moves, gain }
function run(fen, goal, need, limit, level, seed) {
  const g = new Game(fen), me = g.turn(), m0 = mat(g, me); let n = 0, rs = seed;
  const rnd = Math.random; Math.random = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
  try {
    while (n < limit) {
      const r = E.rootSearch(g.fen(), 5, 700, 0); if (!r.moves.length) return { ok: false };
      g.move({ from: r.moves[0].from, to: r.moves[0].to, promotion: r.moves[0].promotion || undefined }); n++;
      if (g.inCheckmate()) return { ok: goal !== 'survive', moves: n, gain: 99 };
      if (g.gameOver()) return { ok: false };
      const cm = E.pickMove(g.fen(), LV(level)); if (!cm) return { ok: false };
      g.move({ from: cm.move.from, to: cm.move.to, promotion: cm.move.promotion || undefined });
      if (g.inCheckmate()) return { ok: false };
      const gain = mat(g, me) - m0;
      if (goal === 'gain' && gain >= need) return { ok: true, moves: n, gain };
      if (g.gameOver()) return { ok: false };
    }
    const gain = mat(g, me) - m0;
    if (goal === 'survive') return { ok: gain >= 0, moves: n, gain };
    return { ok: false, gain };
  } finally { Math.random = rnd; }
}
function verify(fen, goal, need, limit, level, runs) {
  const out = []; for (let k = 0; k < runs; k++) { const r = run(fen, goal, need, limit, level, 1000 + k * 7919); if (!r.ok) return null; out.push(r); }
  return out;
}
const SPEC = [
  // stage 1: 400-800, the coach plays like a 1000 club player
  { after: 'l-values', themes: ['hanging'], r: [400, 800], goal: 'gain', level: 'club', n: 2, title: ['Count and Collect', 'Free Material'], text: 'Somewhere on this board a piece is worth taking. Take it, and keep the extra material while I fight back.' },
  { after: 'l-captures', themes: ['hanging'], r: [500, 900], goal: 'gain', level: 'club', n: 2, title: ['Pick the Right Capture', 'Take the Biggest'], text: 'Several captures look possible. Find the one that really wins, then hold on to it.' },
  { after: 'l-threats', survive: [{ title: 'Survive the Queen', moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], text: 'My queen and bishop are aiming at f7, a mate threat. Defend it, then play 10 moves without losing any material.', limit: 10 }], level: 'club' },
  { after: 'l-cct', survive: [{ title: 'Ten Clean Moves', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], text: 'A normal game. Before every move ask: checks, captures, threats? Play 12 moves without giving anything away.', limit: 12 }], level: 'club' },
  { after: 'l-principles', survive: [{ title: 'Develop and Survive', moves: [], text: 'From the very start: develop, castle, and play 12 moves without losing a single piece or pawn.', limit: 12 }], level: 'club' },
  { after: 'l-traps', survive: [{ title: 'Spot the Trap', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'], text: 'My knight jumps at f7: this is the Fried Liver trap. Defend well and play 10 moves without losing more than a pawn.', limit: 10, loose: true }], level: 'club' },
  { after: 'l-forks', themes: ['fork'], r: [400, 900], goal: 'gain', level: 'club', n: 2, title: ['Fork It', 'Double Trouble'], text: 'One move attacks two things at once. Find the fork, collect the piece, and keep it.' },
  { after: 'l-pins', themes: ['pin'], r: [400, 1100], goal: 'gain', level: 'club', n: 2, title: ['Pin and Win', 'Frozen Piece'], text: 'A piece is stuck in front of something bigger. Pin it, attack it again, and win material.' },
  { after: 'l-skewers', themes: ['skewer'], r: [400, 1100], goal: 'gain', level: 'club', n: 2, title: ['Skewer Strike', 'Through the King'], text: 'Attack the big piece so that when it moves, the one behind it falls. Win material and keep it.' },
  { after: 'l-backrank', themes: ['mate'], r: [400, 900], goal: 'mate', level: 'master', n: 2, title: ['Back-Rank Raid', 'No Way Out'], text: 'The king is stuck behind its own pawns. Find the mate. I defend as well as I can.', want: /R|Q/ },
  // stage 2: 800-1200, the coach plays like a 1400 player
  { after: 'l-loose', themes: ['fork', 'hanging'], r: [700, 1200], goal: 'gain', level: 'strong', n: 2, title: ['Loose Pieces Drop', 'Hunt the Loose One'], text: 'An unprotected piece is a target. Hit it with a double attack and win material, against a stronger me.' },
  { after: 'l-twomove', themes: ['combo', 'fork'], r: [700, 1300], goal: 'gain', level: 'strong', n: 2, title: ['Two-Move Combo', 'Set It Up'], text: 'The win takes two moves: a forcing move first, then the capture. Find both and keep the material.' },
  { after: 'l-kingsafety', themes: ['mate'], r: [800, 1200], goal: 'mate', level: 'master', n: 2, title: ['Open the King', 'Attack!'], text: 'The enemy king has too few defenders. Break in and give mate.' },
  { after: 'l-discovered', themes: ['discovered', 'combo'], r: [500, 1300], goal: 'gain', level: 'strong', n: 2, title: ['Unmask the Attack', 'Hidden Battery'], text: 'Move one piece out of the way and the piece behind it attacks. Win material that way and keep it.' },
  { after: 'l-defender', themes: ['defender', 'combo', 'hanging'], r: [800, 1300], goal: 'gain', level: 'strong', n: 2, title: ['Remove the Guard', 'Defender Down'], text: 'One enemy piece is doing all the defending. Remove it, then take what it was guarding.' },
  { after: 'l-patterns', themes: ['mate'], r: [800, 1300], goal: 'mate', level: 'master', n: 2, title: ['Mating Net', 'Pattern Finish'], text: 'You know this mating pattern. Find it over the board while I defend.' },
  { after: 'l-smothered', themes: ['mate'], r: [900, 1500], goal: 'mate', level: 'master', n: 1, title: ['Smother It'], text: 'The king is boxed in by its own pieces. A knight can finish it. Find the mate.', want: /N/ }
];
const out = [], usedPz = new Set();
for (const s of SPEC) {
  let made = 0;
  if (s.survive) {
    for (const v of s.survive) {
      const g = new Game(); v.moves.forEach(m => { if (!g.move(m)) throw new Error('bad line ' + v.title + ' ' + m); });
      const fen = g.fen(), ok = verify(fen, 'survive', 0, v.limit, s.level, 4);
      const okLoose = !ok && v.loose ? (() => { const r = []; for (let k = 0; k < 4; k++) { const x = run(fen, 'survive', 0, v.limit, s.level, 1000 + k * 7919); if (!(x.moves && x.gain >= -1)) return null; r.push(x); } return r; })() : null;
      if (!ok && !okLoose) { console.log('FAIL survive', s.after, v.title); continue; }
      out.push({ id: 'pr-' + s.after.slice(2) + '-' + made, title: v.title, after: s.after, practice: true, side: g.turn(), fen, goal: 'survive', strict: !v.loose, limit: v.limit, par: v.limit, level: s.level, text: v.text });
      made++; console.log('ok', s.after, v.title, 'survive', v.limit, ok ? 'strict' : 'loose');
    }
    continue;
  }
  const cand = c.ALL.filter(p => s.themes.indexOf(p.theme) >= 0 && p.r >= s.r[0] && p.r <= s.r[1] && !usedPz.has(p.fen))
    .sort((a, b) => (c.U.indexOf(a.id) >= 0) - (c.U.indexOf(b.id) >= 0) || a.r - b.r);
  for (const p of cand) {
    if (made >= s.n) break; if (usedPz.has(p.fen)) continue;
    const g0 = new Game(p.fen), first = g0.move({ from: p.sol[0].slice(0, 2), to: p.sol[0].slice(2, 4), promotion: p.sol[0][4] });
    if (!first) continue;
    if (s.want && !s.want.test(first.san)) continue;
    let rec = null, need = 0, limit = 0;
    if (s.goal === 'mate') { limit = Math.max(2, Math.ceil(p.sol.length / 2)) + 2; rec = verify(p.fen, 'mate', 0, limit, s.level, 3); }
    else { for (const nd of [5, 3, 2]) { limit = 6; rec = verify(p.fen, 'gain', nd, limit, s.level, 4); if (rec) { need = nd; break; } } }
    if (!rec) continue;
    const par = Math.max.apply(null, rec.map(r => r.moves));
    usedPz.add(p.fen);
    out.push({ id: 'pr-' + s.after.slice(2) + '-' + made, title: s.title[made] || s.title[0], after: s.after, practice: true, side: g0.turn() === 'w' ? 'b' : 'w', fen: p.fen, goal: s.goal, need: need || undefined, limit: s.goal === 'mate' ? limit : Math.max(par + 3, 5), par: par, level: s.level, text: s.text, from: p.id });
    made++; console.log('ok', s.after, p.id, p.r, s.goal, need || '', 'par', par);
  }
  if (made < s.n) console.log('SHORT', s.after, made, '/', s.n);
}
// side: the colour the player has. For puzzles the player is the side to move in the puzzle FEN.
out.forEach(o => { o.side = new Game(o.fen).turn(); });
fs.writeFileSync(__dirname + '/../practice.js', '// Play-it-out practice games after every 400-1200 lesson. Generated and verified by tests/practice-build.js.\nvar PRACTICE = ' + JSON.stringify(out, null, 1).replace(/\n\s+/g, ' ') + ';\nif (typeof module !== \'undefined\') module.exports = { PRACTICE: PRACTICE };\n');
console.log('practice games', out.length);
