// Builds lessons2.js: lessons for every rating band, mixing hand-written concept steps with steps generated from
// the verified puzzle bank. Every generated step is checked with the engine:
//  - 'choice' (A/B): the right answer is the puzzle's winning move; the wrong one is the most tempting capture or
//    check that the engine says loses at least 1.5 pawns compared with it. Its explanation comes from the engine's reply.
//  - 'threat': the puzzle seen from the defender's side; the squares to tap are the pieces the attacker wins (or the king).
//  - 'move': the puzzle itself, with a lesson-specific prompt.
// Run: node tests/lessons2-build.js   (then node build.js)
const fs = require('fs');
const Game = require('../chesscore.js')(); const E = require('../engine.js')(Game);
const D = require('../data.js');
const ALL = D.PUZZLES.concat(require('../puzzles2.js'), require('../puzzles-starter.js'), require('../puzzles-themed.js'));
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const used = new Set();
function fenOf(p) { if (p.fen) return p.fen; const g = new Game(); p.pre.forEach(m => g.move(m)); return g.fen(); }
function U(g, u) { return g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); }
function pick(filter, n, sortKey) {
  const out = ALL.filter(p => !used.has(p.id) && filter(p)).sort(sortKey || ((a, b) => a.r - b.r || (a.id < b.id ? -1 : 1)));
  // spread across the range instead of taking only the easiest
  const step = Math.max(1, Math.floor(out.length / n)), res = [];
  for (let i = 0; i < out.length && res.length < n; i += step) res.push(out[i]);
  return res;
}
let hash = 7; const rnd = () => (hash = (hash * 16807) % 2147483647) / 2147483647;
function choiceFrom(p, text) {
  const fen = fenOf(p), g = new Game(fen), A = p.sol[0];
  const a = E.analyzeMove(fen, A, 6, 1500); if (!a) return null;
  const cands = g.moves().filter(m => (m.from + m.to + (m.promotion || '')) !== A && (m.captured || /\+/.test(m.san)));
  let best = null;
  for (const m of cands) {
    const u = m.from + m.to + (m.promotion || ''), b = E.analyzeMove(fen, u, 6, 1200); if (!b) continue;
    const gap = a.playedScore - b.playedScore; if (gap < 150 || !b.replySan) continue;
    const tempt = (m.captured ? { p: 1, n: 3, b: 3, r: 5, q: 9 }[m.captured] : 0) + (/\+/.test(m.san) ? 2 : 0);
    if (!best || tempt > best.tempt) best = { u, m, b, tempt };
  }
  if (!best) return null;
  const aSan = new Game(fen).move({ from: A.slice(0, 2), to: A.slice(2, 4), promotion: A[4] }).san;
  const r = best.b.reply, why = r && r.score > 90000 ? best.b.replySan + ' would be checkmate.' : r && r.captured ? 'The answer ' + best.b.replySan + ' wins your ' + NAME[r.captured] + '.' : 'After ' + best.b.replySan + ' the advantage is gone.';
  const swap = rnd() < 0.5, optA = { u: A, why: aSan + '. ' + p.explain }, optB = { u: best.u, why: best.m.san + ' looks tempting, but it does not work. ' + why };
  used.add(p.id);
  return { t: 'choice', fen, text, options: swap ? [optB, optA] : [optA, optB], best: swap ? 1 : 0, src: p.id };
}
let threatN = 0;
function threatFrom(p, text) {
  const fen = fenOf(p), g = new Game(fen), me = g.turn() === 'w' ? 'b' : 'w', targets = new Set(); let mate = false, first = null, wonPiece = null;
  for (let i = 0; i < p.sol.length; i++) {
    const r = U(g, p.sol[i]); if (!r) return null; if (i === 0) first = r;
    if (r.color !== me && r.captured) { targets.add(r.to); if (!wonPiece || 'pnbrq'.indexOf(r.captured) > 'pnbrq'.indexOf(wonPiece.c)) wonPiece = { c: r.captured, sq: r.to }; }
    if (g.inCheckmate()) { mate = true; const ks = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].flatMap(f => [1, 2, 3, 4, 5, 6, 7, 8].map(n => f + n)).find(s => { const q = g.get(s); return q && q.type === 'k' && q.color === me; }); targets.add(ks); }
  }
  if (!targets.size) return null;
  // the starting squares of the pieces that get captured: that is what the defender should tap
  const start = new Game(fen), tap = new Set();
  targets.forEach(sq => { const q = start.get(sq); if (q && q.color === me) tap.add(sq); });
  if (mate) { const ks = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].flatMap(f => [1, 2, 3, 4, 5, 6, 7, 8].map(n => f + n)).find(s => { const q = start.get(s); return q && q.type === 'k' && q.color === me; }); tap.add(ks); }
  if (!tap.size) return null;
  used.add(p.id);
  const TAILS = ['Before every move, ask what their last move attacks.', 'Spotting this one move earlier is how you stop losing pieces.', 'That is why strong players look at the opponent\'s checks first.', 'One look from their side of the board saves games like this.', 'Their pieces were already aimed there. The clue was on the board.', 'Remember the pattern: next time you will see it coming.', 'Seeing their idea first gives you time to stop it.', 'Threats like this decide most club games.'];
  const done = 'They play ' + first.san + (mate ? ' and it ends in checkmate. ' : wonPiece ? ', and your ' + NAME[wonPiece.c] + ' on ' + wonPiece.sq + ' is lost. ' : '. ') + TAILS[(threatN++) % TAILS.length];
  return { t: 'threat', fen, text, targets: [...tap], show: p.sol[0], done, src: p.id };
}
function moveFrom(p, text, hint) {
  used.add(p.id);
  return { t: 'move', fen: fenOf(p), text, sol: p.sol, anyMate: p.theme === 'mate' || undefined, hint, done: p.explain, src: p.id };
}
function gen(list, maker, text, ...rest) { const out = []; for (const p of list) { const t = Array.isArray(text) ? text[out.length % text.length] : text; const s = maker(p, t, ...rest); if (s) out.push(s); } return out; }
const take = (arr, n) => arr.slice(0, n);

const L = {};
// ======================= 400 - 800 =======================
L['l-threats'] = {
  title: 'What Does My Opponent Want?', minutes: 7, band: '400 – 1200',
  goal: 'Build the habit that stops most lost games: after every enemy move, find what it attacks.',
  takeaways: ['After every move your opponent makes, ask: what does it attack?', 'Check the three dangers: an undefended piece, a fork, and your king.', 'Deal with the threat first, then make your plan.'],
  steps: [
    { t: 'read', fen: '6k1/5ppp/8/3q4/8/8/5PPP/R5K1 b - - 0 1', arrows: [['d5', 'a5', 'r'], ['d5', 'd1', 'r']], text: 'Most games below 1200 are not lost to clever attacks. They are lost because one player never asked a simple question: what does my opponent want? Their last move almost always attacks something.' },
    { t: 'threat', fen: '3q2k1/5ppp/8/R7/8/7P/5PP1/6K1 b - - 0 1', targets: ['a5'], show: 'd8a5', hintAt: 'd8', text: 'Black\'s queen just arrived on d8, and it is Black\'s move next. What is in danger? Tap it.', done: 'Your rook on a5. The queen attacks it along the diagonal, and nothing defends it.' },
    { t: 'threat', fen: '4r1k1/Q4ppp/8/8/8/8/5PPP/6K1 b - - 0 1', targets: ['g1', 'e1'], show: 'e8e1', hintAt: 'e8', text: 'Now a bigger danger. It is Black\'s move. What is Black threatening?', done: 'Re1 is checkmate. Your king is stuck behind its own pawns, with nothing guarding e1.' },
    { t: 'move', fen: '4r1k1/Q4ppp/8/8/8/8/5PPP/6K1 w - - 0 1', judge: 'safe', sol: ['h2h3'], text: 'Same position, your move this time. Stop the checkmate. Any move that saves your king is fine.', hint: 'Give your king an escape square with a pawn move, or guard e1.', done: 'Safe. A pawn move like h3 gives your king a way out. Strong players call it luft: air for the king.' },
    { t: 'threat', fen: '6k1/5pp1/7p/4n3/8/8/3Q1P1P/6K1 b - - 0 1', targets: ['d2', 'g1'], show: 'e5f3', hintAt: 'e5', text: 'Black\'s knight sits on e5. It is Black\'s move. What does the knight threaten?', done: 'Nf3+ is a fork: check to your king and an attack on your queen at the same time. You can only save one.' },
    { t: 'move', fen: '6k1/5pp1/7p/4n3/8/8/3Q1P1P/6K1 w - - 0 1', judge: 'safe', sol: ['d2e2'], text: 'Your move now. Stop the fork before it happens.', hint: 'Guard the square f3, or move your queen to safety.', done: 'Threat gone. One second of looking saved your queen.' }
  ].concat(gen(pick(p => /hanging|fork/.test(p.theme) && p.r >= 300 && p.r <= 650 && !/^s/.test(p.id), 6), threatFrom, ['Your opponent is to move. What are they threatening? Tap the piece in danger.', 'Their move next. Which of your pieces is in trouble?', 'Look from the other side. What will they take?', 'Something of yours is hanging. Tap it before they do.']).slice(0, 4)).concat([
    { t: 'read', fen: '6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', text: 'The habit, every single move: one, look at what their last move attacks. Two, check your undefended pieces. Three, check your king. Then make your own move. It takes five seconds and saves whole games.', tags: { g1: 'King safe?' } }
  ])
};
L['l-captures'] = {
  title: 'Which Capture?', minutes: 6, band: '400 – 900',
  goal: 'Win material, not lose it: count what you give and what you get before you capture.',
  takeaways: ['Before you capture, ask: can they take back, and with what?', 'Capture with your cheapest piece first.', 'A capture that wins a bigger piece than it loses is good. The rest are traps.'],
  steps: [
    { t: 'read', fen: '6k1/5ppp/4p3/3n4/2P5/8/5PPP/3Q2K1 w - - 0 1', arrows: [['c4', 'd5', 'g'], ['d1', 'd5', 'r'], ['e6', 'd5', 'b']], tags: { d5: '3' }, text: 'Two of your pieces can take the knight on d5, and it is defended by the e6 pawn. That defender changes everything: whoever takes first gets taken back.' },
    { t: 'choice', fen: '6k1/5ppp/4p3/3n4/2P5/8/5PPP/3Q2K1 w - - 0 1', best: 0, text: 'Which capture is better?', options: [{ u: 'c4d5', why: 'Pawn takes knight. If they take back, you gave 1 point and won 3.' }, { u: 'd1d5', why: 'Queen takes knight, then the e6 pawn takes your queen. You gave 9 points to win 3.' }] }
  ].concat(gen(pick(p => p.theme === 'hanging' && p.r >= 350 && p.r <= 800 && !/^s/.test(p.id), 14), choiceFrom, ['Two captures, or a capture and a check. Which one wins material?', 'Count what you give and what you get. Which move is better?', 'Both look tempting. Which one really wins?', 'Which capture is safe, and which is a trap?', 'Think about the recapture. A or B?']).slice(0, 5))
};
// ======================= 800 - 1200 =======================
L['l-loose'] = {
  title: 'Loose Pieces Drop Off', minutes: 7, band: '800 – 1200',
  goal: 'Spot undefended pieces, yours and theirs, before the tactics do.',
  takeaways: ['A piece nobody defends is a target for forks and double attacks.', 'Before you move, count: which of my pieces are undefended?', 'Attack two loose pieces at once and one of them falls.'],
  steps: [
    { t: 'read', fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', arrows: [['d5', 'c7', 'y'], ['c7', 'a8', 'r'], ['c7', 'e8', 'r']], text: 'There is a famous saying among strong players: loose pieces drop off. A piece that nothing defends can be won by any double attack: a fork, a check with a capture behind it, or a skewer.', zones: [[['a8'], 'B']] }
  ].concat(gen(pick(p => /fork|hanging/.test(p.theme) && p.r >= 500 && p.r <= 950, 12), moveFrom, ['Something is loose. Find the move that wins it.', 'An enemy piece has no defender. Go and win it.', 'Find the double attack on the loose pieces.', 'Which move hits two things at once?'], 'Look for a move that attacks two things at once, or a check that hits a loose piece.').slice(0, 4))
    .concat(gen(pick(p => /fork|skewer|pin/.test(p.theme) && p.r >= 500 && p.r <= 1000, 12), threatFrom, ['Your opponent is to move. Which of your loose pieces is about to drop?', 'Their turn. What are they about to win from you?', 'Find your piece that is in danger before they move.']).slice(0, 3))
};
L['l-twomove'] = {
  title: 'Two-Move Combinations', minutes: 8, band: '800 – 1300',
  goal: 'See one move further: a forcing move first, then the win.',
  takeaways: ['Combinations start with forcing moves: checks, captures and threats.', 'Ask: if I check here, what can they do? Then what do I win?', 'The forcing move limits their answers, so you can see the end.'],
  steps: [
    { t: 'read', fen: '4k3/8/8/1q6/2N5/8/8/4K3 w - - 0 1', arrows: [['c4', 'd6', 'y']], tags: { d6: '+' }, text: 'At 800 to 1200, players find one-move captures but miss two-move ideas. The secret is forcing moves. A check leaves your opponent only a few answers, so you can calculate what happens next and collect the prize.' }
  ].concat(gen(pick(p => p.sol.length >= 3 && /fork|skewer|discovered|combo|pin/.test(p.theme) && p.r >= 500 && p.r <= 1100, 14), moveFrom, ['Find the forcing move that starts the combination.', 'Two moves deep: start with a forcing move.', 'A check or capture first, then the prize. Find it.', 'Calculate two moves. What is the forcing start?', 'Force their reply, then win something. Your move.'], 'Start with a check or a capture, then look for the second blow.').slice(0, 5))
    .concat(gen(pick(p => p.sol.length >= 3 && /fork|skewer|discovered|combo/.test(p.theme) && p.r >= 600 && p.r <= 1200, 14), choiceFrom, ['Two forcing moves. Which one actually wins?', 'Calculate both forcing lines. A or B?', 'Both moves force a reply. Which reply helps you?']).slice(0, 3))
};
L['l-kingsafety'] = {
  title: 'Attack the King', minutes: 7, band: '800 – 1400',
  goal: 'Punish a weak king, and keep your own one safe.',
  takeaways: ['A king that has not castled, or whose pawns have moved, is a target.', 'Count attackers against defenders near the king.', 'Checks first: they force the king into the open.'],
  steps: [
    { t: 'read', fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 1', zones: [[['f7', 'g7', 'h7', 'f2', 'g2', 'h2'], 'C']], text: 'The pawns in front of a castled king are its shield. Every time one moves forward, holes appear that enemy pieces can use. At club level, most quick wins come from a king with a broken shield or one stuck in the centre.' }
  ].concat(gen(pick(p => p.theme === 'mate' && p.r >= 600 && p.r <= 1250 && p.sol.length <= 3, 14), moveFrom, ['The enemy king is exposed. Find the strongest attack.', 'Their king shield has holes. Strike now.', 'Count the defenders around the king, then attack.', 'Checks first. Find the move that breaks through.', 'The king is short of squares. Find the finish.'], 'Start with a check. Which squares around the king are covered?').slice(0, 5))
    .concat(gen(pick(p => p.theme === 'mate' && p.r >= 700 && p.r <= 1300 && p.sol.length <= 3, 14), threatFrom, ['It is your opponent\'s move. Your king is in danger. Where is the threat?', 'Their move. How are they planning to attack your king?']).slice(0, 2))
};
// ======================= 1200 - 1600 =======================
L['l-candidates'] = {
  title: 'Candidate Moves', minutes: 9, band: '1200 – 1600',
  goal: 'Compare moves like a strong player: list the candidates, then calculate the forcing ones first.',
  takeaways: ['Before you decide, list two or three candidate moves.', 'Calculate forcing moves first; check each line to the end.', 'At the end of every line, ask what your opponent can do.'],
  steps: [
    { t: 'read', fen: 'r6k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1', arrows: [['d5', 'g8', 'y'], ['h6', 'f7', 'b'], ['d5', 'd8', 'b']], text: 'Players around 1200 to 1600 often play the first good-looking move. Masters train a different habit: name two or three candidates, compare them, then choose. In these exercises you see two candidates. Only one of them works.' }
  ].concat(gen(pick(p => p.r >= 900 && p.r <= 1600 && /mate|combo|fork|discovered|skewer|pin|endgame/.test(p.theme), 20), choiceFrom, ['Two candidate moves. Calculate both. Which one works?', 'A strong player would compare these two. Which is right?', 'List the replies to each move, then choose.', 'Both are forcing. Only one survives the best defence.', 'Which candidate holds up when you check their reply?', 'Calculate to the end of each line. A or B?', 'Do not trust the first impression. Compare both.']).slice(0, 7))
};
L['l-defence'] = {
  title: 'Defend Like a Pro', minutes: 8, band: '1200 – 1700',
  goal: 'See the opponent\'s idea before it lands, from their side of the board.',
  takeaways: ['Strong players spend as much time on the opponent\'s ideas as on their own.', 'Prophylaxis: stop their best move before it happens.', 'Look for their checks, captures and threats every move.'],
  steps: [
    { t: 'read', fen: 'r4rk1/1p3ppp/p2p4/3N4/4P3/8/PPP2PPP/R4RK1 b - - 0 1', text: 'Above 1200, players rarely hang a piece in one move. Games are lost to two- and three-move ideas the opponent saw first. In this lesson you sit on the defending side: find what your opponent is planning before they play it.' }
  ].concat(gen(pick(p => p.r >= 900 && p.r <= 1700 && /mate|fork|skewer|discovered|combo|pin/.test(p.theme), 20), threatFrom, ['Your opponent is to move, and they have a strong idea. What are they threatening?', 'Sit on their side of the board. What would you play?', 'They have a two-move idea. Where will it land?', 'Find their threat before it happens.', 'What is the target of their next move?', 'Prophylaxis starts here: what do they want?', 'Their best move hurts. Which piece or square does it hit?']).slice(0, 7))
};
L['l-endgame-play'] = {
  title: 'Win the Endgame', minutes: 8, band: '1000 – 1600',
  goal: 'Turn endgames into wins: active king, passed pawns, precise moves.',
  takeaways: ['In the endgame the king is a fighting piece: bring it forward.', 'Passed pawns must be pushed, and stopped when they are the enemy\'s.', 'Count moves exactly: one tempo decides most endgames.'],
  steps: [
    { t: 'read', fen: '8/5k2/8/2P5/8/8/5K2/8 w - - 0 1', arrows: [['c5', 'c8', 'g']], tags: { c8: 'Queen?' }, text: 'Between 1000 and 1600, many won games are drawn or lost in the endgame. The rules change there: the king becomes an attacker, and every single move counts. Count, then move.' }
  ].concat(gen(pick(p => /endgame|promotion/.test(p.theme) && p.r >= 400 && p.r <= 1500, 12), moveFrom, ['Endgame. Find the precise move.', 'Every tempo counts here. Find the winning move.', 'Count the moves, then play.', 'Active king, passed pawns. What is the best move?', 'Only one move keeps the win. Find it.', 'Precision time: which move wins?'], 'Count the moves: who gets there first?').slice(0, 6))
};
// ======================= 1600 - 2000 =======================
L['l-deep'] = {
  title: 'Deep Calculation', minutes: 10, band: '1600 – 2000',
  goal: 'Calculate forcing lines three moves deep and trust what you see.',
  takeaways: ['Visualise the position after each move before you move on.', 'Look for the quiet move hidden inside a forcing line.', 'If a line wins, double-check the opponent\'s best defence once more.'],
  steps: [
    { t: 'read', fen: 'r6k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1', line: ['Qg8+', 'Rxg8', 'Nf7#'], text: 'Strong players are not faster thinkers. They are tidier ones: they hold the position in their head after each move of a line, and they always check the opponent\'s best reply. These positions need several precise moves.' }
  ].concat(gen(pick(p => p.r >= 1300 && p.sol.length >= 3, 14), moveFrom, ['Calculate the whole line before you move.', 'Several precise moves are needed. Find the first.', 'See the end of the line, then play.', 'A deep combination is hidden here. Start it.', 'Forcing moves only. Calculate to the end.', 'Find the move that wins by force.'], 'Forcing moves first. What is the opponent\'s only reply?').slice(0, 6))
    .concat(gen(pick(p => p.r >= 1300 && p.sol.length >= 3, 14), choiceFrom, ['Two serious candidates. Only one survives deep calculation.', 'Deep line A or deep line B? Calculate both.']).slice(0, 2))
};
// ---- extra steps appended to existing tactic lessons (indices of existing steps stay the same)
const EXT = {};
EXT['l-forks'] = gen(pick(p => p.theme === 'fork' && p.r >= 400 && p.r <= 900, 10), moveFrom, ['Find the fork.', 'One move, two targets. Where?', 'Which square attacks two things at once?'], 'Look for a square that hits the king and another piece, or two loose pieces.').slice(0, 3)
  .concat(gen(pick(p => p.theme === 'fork' && p.r >= 450 && p.r <= 1000, 10), threatFrom, ['Their move. Where is the fork coming?', 'Your opponent has a fork ready. Which of your pieces will fall?']).slice(0, 2));
EXT['l-pins'] = gen(pick(p => p.theme === 'pin', 10), moveFrom, ['Find the pin that wins material.', 'Line them up: pin the front piece to the one behind.', 'Which move pins a piece it cannot afford to move?'], 'Find two enemy pieces on the same line, with the more valuable one behind.').slice(0, 3)
  .concat(gen(pick(p => p.theme === 'pin', 10), choiceFrom, 'Pin or no pin? Which move wins?').slice(0, 1));
EXT['l-skewers'] = gen(pick(p => p.theme === 'skewer', 10), moveFrom, ['Skewer the king and win what is behind it.', 'Check along the line and collect the piece behind.', 'Find the skewer.'], 'Find a check along a line with something valuable behind the king.').slice(0, 3);
EXT['l-discovered'] = gen(pick(p => p.theme === 'discovered', 10), moveFrom, ['Move one piece to unleash another.', 'Find the discovered attack.', 'Uncover your line piece with a threat of its own.'], 'Which of your pieces is blocking your own rook, bishop or queen?').slice(0, 3)
  .concat(gen(pick(p => p.theme === 'discovered', 10), threatFrom, 'Their move. Which discovered attack is coming?').slice(0, 1));
EXT['l-backrank'] = gen(pick(p => p.backrank, 10), moveFrom, ['The king is stuck behind its pawns. Mate it.', 'Back rank! Find the mate.', 'No escape square. Deliver mate on the edge.'], 'Get a rook or queen to the back rank with check.').slice(0, 3)
  .concat(gen(pick(p => p.backrank, 10), threatFrom, 'Your king has no escape square. Their move. Where does the mate come from?').slice(0, 1));
EXT['l-patterns'] = gen(pick(p => p.theme === 'mate' && p.sol.length === 1 && p.r >= 500 && p.r <= 1100, 12), moveFrom, ['Recognise the pattern and finish.', 'Mate in one. Which pattern is it?', 'You have seen this picture before. Mate.'], 'Count the squares around the king: which piece covers each one?').slice(0, 3);
EXT['l-defender'] = gen(pick(p => /combo|defender/.test(p.theme) && p.r <= 1200, 10), choiceFrom, 'Remove the defender, or the other move? A or B?').slice(0, 2);
// stage placement
const PLACE = { 1: [['l-captures', 'l-values'], ['l-threats', 'l-captures']], 2: [['l-loose', null], ['l-twomove', 'l-loose'], ['l-kingsafety', 'l-twomove']], 3: [['l-candidates', null], ['l-defence', 'l-candidates'], ['l-endgame-play', 'l-kp']], 4: [['l-deep', 'l-calc']] };
// sanity: verify the hand-written choice/threat steps with the engine too
let problems = 0;
Object.keys(EXT).forEach(id => EXT[id].forEach(st => { st.ext = 1; }));
[].concat(Object.keys(L).map(id => [id, L[id].steps]), Object.keys(EXT).map(id => [id, EXT[id]])).forEach(([id, steps]) => steps.forEach((s, i) => {
  const g = new Game(); if (!g.load(s.fen)) { console.log('BAD FEN', id, i); problems++; return; }
  if (s.t === 'choice') { const sc = s.options.map(o => E.analyzeMove(s.fen, o.u, 6, 1500)); const b = sc[s.best].playedScore, o = sc[1 - s.best].playedScore; if (b - o < 150) { console.log('WEAK CHOICE', id, i, b, o); problems++; } }
  if (s.t === 'threat' && !s.src) { const t = new Game(s.fen), r = U(t, s.show); if (!r) { console.log('BAD THREAT MOVE', id, i); problems++; } else { const a = E.analyzeMove(s.fen, s.show, 6, 1200); if (a.loss > 80) { console.log('THREAT NOT BEST', id, i, a.loss, a.bestSan); problems++; } } }
  if (s.t === 'move' && s.judge === 'safe') { const a = E.analyzeMove(s.fen, s.sol[0], 6, 1200); if (a.loss > 120) { console.log('SAFE MOVE NOT SAFE', id, i, a.loss); problems++; } }
}));
const counts = Object.keys(L).map(id => id + ':' + L[id].steps.length + ' (' + L[id].steps.map(s => s.t[0]).join('') + ')').concat(Object.keys(EXT).map(id => id + ' +' + EXT[id].length + ' (' + EXT[id].map(s => s.t[0]).join('') + ')'));
console.log(counts.join('\n')); console.log('problems', problems);
fs.writeFileSync('lessons2.js', '// Lessons for every rating band. Generated by tests/lessons2-build.js from hand-written concepts and the verified puzzle bank.\n' +
  'var LESSONS2 = ' + JSON.stringify(L, null, 1) + ';\nvar LESSONS2_PLACE = ' + JSON.stringify(PLACE) + ';\n' +
  'var LESSONS2_EXT = ' + JSON.stringify(EXT, null, 1) + ';\n' +
  'var LESSONS2_USED = ' + JSON.stringify([...used]) + ';\n' +
  "if (typeof LESSONS !== 'undefined') Object.keys(LESSONS2_EXT).forEach(function (k) { if (LESSONS[k] && !LESSONS[k].ext2) { LESSONS[k].steps = LESSONS[k].steps.concat(LESSONS2_EXT[k]); LESSONS[k].ext2 = true; } });\n" +
  "if (typeof LESSONS !== 'undefined') { Object.keys(LESSONS2).forEach(function (k) { LESSONS[k] = LESSONS2[k]; }); Object.keys(LESSONS2_PLACE).forEach(function (i) { var L = STAGES[i].lessons; LESSONS2_PLACE[i].forEach(function (pr) { var at = L.indexOf(pr[0]); if (at >= 0) L.splice(at, 1); var a = pr[1] ? L.indexOf(pr[1]) : -1; if (pr[1] && a < 0) L.push(pr[0]); else L.splice(a + 1, 0, pr[0]); }); }); }\n" +
  "if (typeof module !== 'undefined') module.exports = { LESSONS2: LESSONS2, LESSONS2_EXT: LESSONS2_EXT, LESSONS2_PLACE: LESSONS2_PLACE, LESSONS2_USED: LESSONS2_USED };\n");
