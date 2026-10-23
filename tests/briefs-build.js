// Builds briefs.js: "Leo's briefing" before every lesson from 400 up. Two short slides before the puzzles:
//  1. How players at this level lose to this idea, shown on a real position (the demo line plays on the board).
//  2. Leo's trick: what to look for, and what to do when you meet a player at this level.
// Demo lines come from the puzzle pool (theme + rating, never a puzzle the lesson or its drill uses) or are written
// here by hand; every line is played through the rules engine and must be legal, or the build stops.
const fs = require('fs'), vm = require('vm'), Game = require('../chesscore.js')();
const c = {}; vm.createContext(c);
['chesscore.js', 'data.js', 'lessons2.js', 'puzzles2.js', 'puzzles-starter.js', 'puzzles-themed.js'].forEach(f => vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), c));
vm.runInContext('this.ALL=PUZZLES.concat(typeof PUZZLES_MINED!=="undefined"?PUZZLES_MINED:[],typeof PUZZLES_STARTER!=="undefined"?PUZZLES_STARTER:[],typeof PUZZLES_THEMED!=="undefined"?PUZZLES_THEMED:[]);this.U=typeof LESSONS2_USED!=="undefined"?LESSONS2_USED:[];if(typeof LESSONS2!=="undefined")Object.assign(LESSONS,LESSONS2);this.L=LESSONS;this.ST=STAGES', c);
const lessonFens = new Set(); Object.keys(c.L).forEach(id => c.L[id].steps.forEach(s => s.fen && lessonFens.add(s.fen.split(' ').slice(0, 2).join(' '))));
const used = new Set(c.U);

// theme: pick a puzzle demo. line: [fen, uci...] hand-written demo. fen: a still picture (with arrows) instead.
const B = {
  // ----- 400-800: Stop Losing Pieces -----
  'l-values': { theme: 'hanging', r: [300, 700],
    lose: 'At 400 to 800, most games are decided by one thing: a piece left for free. Watch this one get taken.',
    trick: 'Leo\'s trick: before you move, count. Pawn 1, knight and bishop 3, rook 5, queen 9. Take what is free, and never give a big piece for a small one. Against players at your level, just collect what they leave hanging.' },
  'l-captures': { theme: 'hanging', r: [400, 800],
    lose: 'Players at your level grab the first capture they see. Sometimes it is a trap: the piece was defended. Here is a capture that really wins.',
    trick: 'Leo\'s trick: before you take, ask two questions. Is it defended? And what can they take back? Count attackers and defenders. If you have more, take. If not, wait.' },
  'l-threats': { theme: 'hanging', r: [400, 800],
    lose: 'The number one reason games are lost at 400 to 800: not looking at what the opponent just did. Their last move attacked something, and nobody noticed.',
    trick: 'Leo\'s trick: after every move your opponent makes, stop and ask: what does this move attack? What do they want next? Only then think about your own plan.' },
  'l-cct': { theme: 'fork', r: [400, 800],
    lose: 'Strong players are not magic. They just look at the most forcing moves first. Watch how one forcing move wins material.',
    trick: 'Leo\'s trick: Checks, Captures, Threats. Every move, look at all your checks first, then all your captures, then your threats. Do the same for your opponent. It takes ten seconds and saves games.' },
  'l-principles': { line: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4', 'e7e5', 'd1h5', 'b8c6', 'f1c4', 'g7g6', 'h5f3', 'g8f6'],
    lose: 'How beginners waste the opening: the queen comes out early, gets chased, and Black develops with every move. Watch White\'s queen run while Black brings out pieces.',
    trick: 'Leo\'s trick: in the first ten moves, put a pawn in the centre, bring out knights and bishops, and castle. Move each piece once. The queen comes out later, when it is safe.' },
  'l-traps': { line: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'],
    lose: 'The trap that beats thousands of beginners every day: queen and bishop both aim at f7. Black attacks the queen with the knight and misses the threat. Checkmate in four moves.',
    trick: 'Leo\'s trick: when a queen and a bishop aim at the same square next to your king, defend that square first. Against players at your level, you will meet this trap. Now you know it.' },
  'l-forks': { theme: 'fork', r: [400, 800],
    lose: 'A fork attacks two pieces at once. Your opponent can only save one. Watch how a single move wins material.',
    trick: 'Leo\'s trick: knights are the kings of forks. Look for two enemy pieces a knight jump away from the same square, especially the king and the queen. And check where their knights can jump next to you.' },
  'l-pins': { line: ['4k3/8/8/4n3/8/8/5P2/4R1K1 w - - 0 1', 'f2f4', 'e8d7', 'f4e5'],
    lose: 'A pinned piece cannot move without exposing something bigger behind it. Here the knight cannot move, because the rook would check the king. The pawn attacks it, and the knight is lost.',
    trick: 'Leo\'s trick: when your piece stands in a line between an enemy bishop, rook or queen and your king or queen, it is pinned. Break the pin early. And pin their pieces, then attack the pinned piece again.' },
  'l-skewers': { theme: 'skewer', r: [400, 900],
    lose: 'A skewer is a pin the other way round: you attack the big piece, it moves, and you take the piece behind it.',
    trick: 'Leo\'s trick: when the enemy king and another piece stand on the same line, a check along that line wins the piece behind. Keep your own king and queen off the same line.' },
  'l-backrank': { line: ['6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'd1d8'],
    lose: 'Many games at your level end like this: the king sits behind its own pawns with no escape square, and a rook or queen on the back rank is checkmate.',
    trick: 'Leo\'s trick: give your king a window. Push one pawn in front of a castled king, like h3, when you have time. And always check whether their back rank is open.' },
  'l-rookmate': { line: ['6k1/8/6K1/8/8/8/8/R7 w - - 0 1', 'a1a8'],
    lose: 'Being a rook up and not knowing how to finish is the most common way to throw away a win at your level. The pattern is simple: kings face each other, the rook checks from the edge.',
    trick: 'Leo\'s trick: push the enemy king to the edge with your rook, bring your own king in front of it, then check from the side. Do not give stalemate: always leave the king a move until the mate.' },
  // ----- 800-1200: Tactical Weapons -----
  'l-loose': { line: ['4k2q/8/8/8/8/8/5PPP/2B1K3 w - - 0 1', 'c1b2', 'h8e5', 'e1d1', 'e5b2'],
    lose: 'How players at 800 to 1200 lose pieces: White puts the bishop on b2 with nothing guarding it. The queen checks the king and hits the loose bishop in the same move.',
    trick: 'Leo\'s trick: loose pieces drop off. Before every move, look at each of your pieces and ask who defends it. Nobody? Then it is loose. Against players at your level, hunt for their loose pieces with checks and forks.' },
  'l-twomove': { line: ['4k3/8/8/1q6/2N5/8/8/4K3 w - - 0 1', 'c4d6', 'e8d7', 'd6b5'],
    lose: 'At your level, players see one-move captures but miss two-move ideas. Watch: the knight jumps to d6 with check, the king must move, and the queen falls next.',
    trick: 'Leo\'s trick: every check is a question your opponent must answer. For each check, ask: what can they reply, and what do I take next? Players around 1000 to 1200 only look one move ahead. Look two.' },
  'l-kingsafety': { orient: 'w', line: ['r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', 'g8f6', 'h5f7'],
    lose: 'How kings die at your level: the square next to the king, here f7, is guarded only by the king. Black attacks the queen and forgets the threat. Queen takes f7 is checkmate.',
    trick: 'Leo\'s trick: castle early, and keep the three pawns in front of your king at home. Count their attackers near your king against your defenders. If they have more, defend first, then attack.' },
  'l-discovered': { line: ['r3k3/8/8/8/4B3/8/8/4R1K1 w - - 0 1', 'e4a8', 'e8d7'],
    lose: 'A discovered attack: the bishop moves out of the rook\'s way and takes a rook, and now the rook behind it gives check. Black must answer the check, and the material is gone.',
    trick: 'Leo\'s trick: look for your pieces lined up behind another piece, pointing at the enemy king or queen. That is a loaded gun. At your level, players lose to this because they only look at the piece that moves.' },
  'l-defender': { theme: 'defender', r: [700, 1400], alt: 'combo',
    lose: 'Sometimes a piece is safe only because one defender guards it. Take or chase away that defender, and the piece falls. Watch.',
    trick: 'Leo\'s trick: when you cannot win a piece because it is defended, look at the defender. Can you capture it, attack it, or lure it away with a check? Ask: what is this piece guarding?' },
  'l-patterns': { theme: 'mate', r: [800, 1200],
    lose: 'Strong players do not calculate every mate. They recognise the picture. Here is a mating pattern you will see again and again.',
    trick: 'Leo\'s trick: learn the pictures: the back-rank mate, the smothered mate, the queen and pawn mate. When the enemy king has few escape squares, look for the pattern that fits.' },
  'l-smothered': { line: ['6rk/6pp/8/4N3/8/8/8/6K1 w - - 0 1', 'e5f7'],
    lose: 'A smothered mate: the king is boxed in by its own pieces, and a knight check cannot be blocked. Watch the knight finish it.',
    trick: 'Leo\'s trick: when the enemy king sits in the corner surrounded by its own pieces, look for a knight check. It is the one check that jumps over everything.' },
  // ----- 1200-1600: Endgames & Structure -----
  'l-candidates': { theme: 'mate', r: [1100, 1400],
    lose: 'Players around 1200 often play the first good-looking move and miss a better one. The winning move here is not the first one you see. Watch.',
    trick: 'Leo\'s trick: before you move, name two or three candidates: checks, captures, threats. Compare them. Pick the strongest. When you meet a 1200 player, they will play fast; you play the better move.' },
  'l-defence': { theme: 'fork', r: [800, 1300],
    lose: 'Above 1200, players rarely hang a piece in one move. They lose to an idea the opponent saw first. Watch the idea land, from the side that did not see it coming.',
    trick: 'Leo\'s trick: after every opponent move, imagine it is their turn again. What would you play if you were them? Checks, captures, threats, from their side. Stop that idea before your own plan.' },
  'l-kp': { fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1', arrows: [['e2', 'e3', 'g'], ['e4', 'e6', 'y']],
    lose: 'Many players at 1200 trade into a king and pawn ending, then cannot win it. Here White has an extra pawn, but the kings face each other. One wrong king move and it is a draw.',
    trick: 'Leo\'s trick: the opposition. When the kings face each other with one square between, the side NOT to move wins the standoff. Here a quiet pawn step, e3, passes the move to Black. Then walk your king forward.' },
  'l-endgame-play': { fen: '8/5k2/8/2P5/8/8/5K2/8 w - - 0 1', arrows: [['c5', 'c8', 'g'], ['f7', 'e7', 'r']],
    lose: 'Between 1000 and 1600, many won games are thrown away in the endgame by moving the king too slowly or the pawn too early.',
    trick: 'Leo\'s trick: draw the square. From your passed pawn to the promotion rank is one side of a square. If the enemy king cannot step inside it, just run with the pawn. If it can, bring your king first.' },
  'l-rook-end': { fen: '3K4/3P2k1/8/8/8/8/4r3/5R2 w - - 0 1', arrows: [['f1', 'f4', 'g'], ['d8', 'e7', 'y']],
    lose: 'Rook endings are the most common endings in chess, and players at your level lose half of them from winning positions. The famous one is the Lucena position.',
    trick: 'Leo\'s trick: build a bridge. Put your rook on the 4th rank, walk your king out, and block the checks with the rook. To defend, keep your rook on your 6th rank until the pawn steps up. That is the Philidor.' },
  'l-structure': { fen: 'r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 1', arrows: [['d4', 'd5', 'y']], marks: ['d4'],
    lose: 'Players around 1200 move pieces without a plan. The pawns tell you the plan. Here White has an isolated pawn on d4: a strength for attacking, a weakness in the endgame.',
    trick: 'Leo\'s trick: look at the pawns first. A weak pawn is a target: attack it. An open file is a road: put a rook on it. A hole in their pawn chain is a home: put a knight there.' },
  // ----- 1600-2000: Mastery -----
  'l-calc': { theme: 'mate', r: [1300, 1700],
    lose: 'Strong players lose by stopping one move too early. They calculate a line, like it, and miss the defence at the end. This mate needs the whole line.',
    trick: 'Leo\'s trick: calculate forcing moves first, one line at a time. At the end of every line, ask: what is their best reply here? Only then decide.' },
  'l-deep': { theme: 'mate', r: [1400, 2400], maxLen: 7,
    lose: 'At this level, the winning move is often quiet, or a sacrifice, and it only works three moves later. Watch the whole combination.',
    trick: 'Leo\'s trick: hold the position in your head after each move of the line. If you lose the picture, set it up again from the start. Trust a line only after you have checked their best answer at every step.' },
  'l-pro-threats': { theme: 'fork', r: [900, 1500],
    lose: 'Strong players lose most games the same way: the opponent had a forcing idea, and nobody looked for it from their side of the board.',
    trick: 'Leo\'s trick: every move, flip the board in your head. If it were their move, what is their best check, capture or threat? Make your move stop it, or make yours stronger.' },
  'l-outposts': { fen: 'r4rk1/1p3ppp/p2p4/8/4P3/2N5/PPP2PPP/R4RK1 w - - 0 1', arrows: [['c3', 'd5', 'g']], marks: ['d5'],
    lose: 'Good positions are lost to slow, aimless moves. Here Black has no c-pawn and no e-pawn, so d5 can never be attacked by a pawn. Players at your level ignore squares like this.',
    trick: 'Leo\'s trick: find a square your pawn protects and no enemy pawn can attack. Put a knight there and it is a monster. And before your own plan, ask what your opponent wants to do, and stop it.' },
  'l-convert': { fen: '3r2k1/5ppp/8/8/8/8/5PPP/1R1R2K1 w - - 0 1', arrows: [['d1', 'd8', 'g']],
    lose: 'The most painful loss: being a piece up and still not winning. Players rush, leave their king open, and the opponent finds counterplay.',
    trick: 'Leo\'s trick: when you are ahead, trade pieces, not pawns. Every trade makes your extra material count more. Keep your king safe, take away their counterplay, and never rush. A slow win is still a win.' }
};

const out = {}, usedPz = new Set(), problems = [];
function legal(fen, line) { const g = new Game(fen); for (const u of line) { const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); if (!m) return null; } return g; }
for (const id of Object.keys(B)) {
  const b = B[id], L = c.L[id]; if (!L) { problems.push('no lesson ' + id); continue; }
  let fen, demo = null, arrows = b.arrows || null, marks = b.marks || null, from = null, explain = '';
  if (b.line) { fen = b.line[0]; demo = b.line.slice(1); }
  else if (b.fen) fen = b.fen;
  else {
    const themes = [b.theme].concat(b.alt ? [b.alt] : []);
    const cand = c.ALL.filter(p => themes.indexOf(p.theme) >= 0 && p.r >= b.r[0] && p.r <= b.r[1] && !used.has(p.id) && !usedPz.has(p.id) && !lessonFens.has(p.fen.split(' ').slice(0, 2).join(' ')) && p.sol.length >= 1 && p.sol.length <= (b.maxLen || 5))
      .filter(p => { if (!b.want) return true; const m = new Game(p.fen).move({ from: p.sol[0].slice(0, 2), to: p.sol[0].slice(2, 4), promotion: p.sol[0][4] }); return m && b.want.test(m.san); })
      .sort((x, y) => (x.sol.length === 1) - (y.sol.length === 1) || Math.abs(x.r - (b.r[0] + b.r[1]) / 2) - Math.abs(y.r - (b.r[0] + b.r[1]) / 2));
    const p = cand[0]; if (!p) { problems.push('no demo puzzle for ' + id); continue; }
    usedPz.add(p.id); fen = p.fen; demo = p.sol.slice(); from = p.id; explain = p.explain ? ' ' + p.explain : '';
  }
  if (demo && !legal(fen, demo)) { problems.push('illegal demo ' + id); continue; }
  if (!legal(fen, [])) { problems.push('bad fen ' + id); continue; }
  const first = demo && demo[0];
  out[id] = [
    { title: 'How games are lost at this level', fen, demo, arrows, marks, orient: b.orient || undefined, text: b.lose + (explain && !b.line ? explain : ''), from },
    { title: 'Leo\'s trick', fen, orient: b.orient || undefined, arrows: arrows || (first ? [[first.slice(0, 2), first.slice(2, 4), 'g']] : null), marks, text: b.trick.replace(/^Leo's trick: (.)/, (m, ch) => ch.toUpperCase()) }
  ];
  if (demo) { const g = new Game(fen), sans = demo.map(u => g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); console.log('ok', id, from || 'hand', sans.join(' ')); } else console.log('ok', id, 'picture');
}
if (problems.length) { console.log('PROBLEMS', problems); process.exit(1); }
fs.writeFileSync(__dirname + '/../briefs.js', '// Leo\'s briefing before every lesson from 400 up. Generated and checked by tests/briefs-build.js.\nvar BRIEFS = ' + JSON.stringify(out, null, 1).replace(/\n\s+/g, ' ') + ';\nif (typeof module !== \'undefined\') module.exports = { BRIEFS: BRIEFS };\n');
console.log('briefs', Object.keys(out).length, 'lessons,', Object.keys(out).length * 2, 'slides');
