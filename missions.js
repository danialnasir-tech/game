// ===== Coach missions: three short, hands-on scenarios after each Foundations lesson =====
// goal: 'check' (give check), 'capture' (win `count` pieces, optionally only `types`), 'captureAll' (every enemy piece but the king),
//       'mate', 'promote', 'castle', 'ep' (capture en passant). `limit` = your moves allowed, `par` = moves for 3 stars.
// coach: 'wander' = the coach only walks his king around and never captures (a friendly sparring partner),
//        'defend' = the coach defends for real (used for checkmate missions). `pre` = the coach's first move, played before yours.
var MISSIONS = {
  'l-board': [
    { id: 'read-e4', title: 'Read and Play', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', goal: 'sequence', seq: ['e4'], limit: 1, par: 1, coach: 'wander',
      text: 'I will name a move, you play it. The move is written e4.', tip: 'No letter means a pawn. Which pawn can reach e4?' },
    { id: 'read-italian', title: 'Three in a Row', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', goal: 'sequence', seq: ['e4', 'Nf3', 'Bc4'], limit: 3, par: 3, coach: 'wander',
      text: 'Play these three moves in order: e4, then Nf3, then Bc4. N is the knight, B is the bishop.', tip: 'Read the letter for the piece, then find the square it lands on.' },
    { id: 'read-london', title: 'Build a Setup', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', goal: 'sequence', seq: ['d4', 'Bf4', 'e3', 'Nf3'], limit: 4, par: 4, coach: 'wander',
      text: 'Now a real opening, the London System: d4, Bf4, e3, Nf3. Four moves, all from their written names.', tip: 'Bf4 is the bishop that starts on c1. It needs the d-pawn out of the way first.' }
  ],
  'l-firstmoves': [
    { id: 'fm-develop', title: 'Centre and Knights', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', goal: 'develop', minors: 2, limit: 3, par: 3, coach: 'wander', sol: ['e2e4', 'g1f3', 'b1c3'],
      text: 'In three moves: one pawn in the centre and both knights out.', tip: 'e4 or d4 first, then Nf3 and Nc3.' },
    { id: 'fm-castle', title: 'Ready, Set, Castle', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', goal: 'castle', limit: 4, par: 4, coach: 'wander', sol: ['e2e4', 'g1f3', 'f1c4', 'e1g1'],
      text: 'Castle within four moves. Clear the squares between your king and the rook first.', tip: 'e4, Nf3, then a bishop out, then O-O.' },
    { id: 'fm-long', title: 'The Long Way', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', goal: 'castle', side: 'w', castleSide: 'q', limit: 6, par: 5, coach: 'wander', sol: ['d2d4', 'b1c3', 'c1f4', 'd1d2', 'e1c1'],
      text: 'Castle queenside, O-O-O, within six moves. Three pieces stand in the way this time.', tip: 'd4, Nc3, a bishop out, the queen out, then O-O-O.' }
  ],
  'l-rook': [
    { id: 'rook-check', title: 'First Check', fen: '4k3/8/8/8/8/8/8/R5K1 w - - 0 1', goal: 'check', limit: 1, par: 1, coach: 'wander',
      text: 'Attacking the king is called check. Put your rook on a line with my king to give check. Straight lines only.', tip: 'Line the rook up on the same file or rank as my king.' },
    { id: 'rook-snack', title: 'Pawn Snack', fen: '7k/8/1p6/8/5p2/8/8/R5K1 w - - 0 1', goal: 'capture', count: 2, limit: 6, par: 4, coach: 'wander',
      text: 'Two of my pawns are loose. Win both of them. I will only move my king.', tip: 'Get on the same line as a pawn first, then take it.' },
    { id: 'rook-sweep', title: 'Rook Sweep', fen: '7k/1p6/8/4p3/8/2p3p1/8/R5K1 w - - 0 1', goal: 'captureAll', limit: 10, par: 8, coach: 'wander',
      text: 'Clear the board: take all four pawns. Plan a route that wastes no moves.', tip: 'After each capture, look for a square that lines up with the next pawn.' }
  ],
  'l-bishop-queen': [
    { id: 'bishop-check', title: 'Diagonal Check', fen: '4k3/8/8/8/8/8/8/5BK1 w - - 0 1', goal: 'check', limit: 1, par: 1, coach: 'wander',
      text: 'Give check again: attack my king, this time with your bishop. Bishops only travel on diagonals.', tip: 'Which diagonal leads to e8? Try b5.' },
    { id: 'queen-double', title: 'Queen Grab', fen: '7k/8/2n5/8/8/5r2/8/3Q2K1 w - - 0 1', goal: 'capture', count: 2, limit: 3, par: 2, coach: 'wander',
      text: 'My knight and my rook are unguarded. Win both with your queen.', tip: 'Your queen reaches f3 on a diagonal. From f3, look at c6.' },
    { id: 'queen-clean', title: 'Clean Sweep', fen: '6k1/p7/4r3/8/2b5/1n6/8/3Q2K1 w - - 0 1', goal: 'captureAll', limit: 8, par: 5, coach: 'wander',
      text: 'Four of my pieces, one queen of yours. Take them all. The queen moves like a rook and a bishop at once.', tip: 'Start with a capture that lands on a square lined up with another piece.' }
  ],
  'l-knight': [
    { id: 'knight-check', title: 'Knight Check', fen: '4k3/8/8/8/4N3/8/8/6K1 w - - 0 1', goal: 'check', limit: 1, par: 1, coach: 'wander',
      text: 'Give check with a knight jump: land on a square that attacks my king. Remember the L shape.', tip: 'From e4 the knight reaches d6 and f6. Both touch e8.' },
    { id: 'knight-hop', title: 'Hop and Grab', fen: '7k/8/8/3p4/8/2p5/8/1N4K1 w - - 0 1', goal: 'capture', count: 2, limit: 3, par: 2, coach: 'wander',
      text: 'Two pawns, two jumps. Win them both.', tip: 'b1 jumps to c3. From c3, where can it land next?' },
    { id: 'knight-hunt', title: 'Knight Hunt', fen: '2r4k/8/8/5b2/7p/8/8/1N4K1 w - - 0 1', goal: 'captureAll', limit: 10, par: 8, coach: 'wander',
      text: 'My rook, bishop and pawn are stuck in place. Hunt all three down with your knight.', tip: 'Count the jumps to each piece and take the closest first.' }
  ],
  'l-king-pawn': [
    { id: 'pawn-take', title: 'Pawn Bite', fen: '4k3/8/8/8/3n1b2/4P3/8/4K3 w - - 0 1', goal: 'capture', count: 1, limit: 1, par: 1, coach: 'wander',
      text: 'Your pawn attacks two of my pieces. Take one. Pawns capture diagonally forward.', tip: 'The pawn on e3 captures on d4 or f4.' },
    { id: 'pawn-run', title: 'Run to Queen', fen: '8/8/1k6/8/8/8/6P1/6K1 w - - 0 1', goal: 'promote', limit: 7, par: 5, coach: 'wander',
      text: 'Push your pawn all the way and make a new queen. My king is too far away to stop it.', tip: 'On its first move the pawn may jump two squares.' },
    { id: 'pawn-duo', title: 'Pawn Duo', fen: '8/8/8/8/8/k7/5PP1/5K2 w - - 0 1', goal: 'promote', limit: 8, par: 5, coach: 'defend', sol: ['g2g4', 'g4g5', 'g5g6', 'g6g7', 'g7g8q'],
      text: 'Now I defend for real and run at your pawns. Pick the pawn my king cannot catch and promote it.', tip: 'The g-pawn is further from my king. Push it, and jump two squares on the first move.' }
  ],
  'l-check': [
    { id: 'check-any', title: 'Find a Check', fen: '3k4/8/8/8/8/2N5/1B6/R3K3 w - - 0 1', goal: 'check', limit: 1, par: 1, coach: 'wander',
      text: 'Give check. Any piece will do, as long as it is a legal move.', tip: 'Your rook can reach the d-file.' },
    { id: 'check-backrank', title: 'Back-Rank Mate', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', goal: 'mate', limit: 1, par: 1, coach: 'defend',
      text: 'My own pawns box my king in. Checkmate me in one move.', tip: 'Look at the 8th rank.' },
    { id: 'check-rookmate', title: 'Rook and King', fen: 'k7/8/2K5/8/8/8/8/7R w - - 0 1', goal: 'mate', limit: 3, par: 2, coach: 'defend',
      text: 'My king is in the corner. Checkmate within 3 moves, and do not stalemate me.', tip: 'Your king takes away b7 and b8 from c6 or b6. The rook gives the check.' }
  ],
  'l-special': [
    { id: 'castle-short', title: 'King to Safety', fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', goal: 'castle', limit: 1, par: 1, coach: 'wander',
      text: 'Castle. Move the king two squares toward a rook.', tip: 'Tap the king, then g1 or c1.' },
    { id: 'castle-long', title: 'Only One Way', fen: '4k1r1/8/8/8/8/8/8/R3K2R w KQ - 0 1', goal: 'castle', limit: 1, par: 1, coach: 'wander',
      text: 'Castle again, but one side is not allowed this time. Which one is it?', tip: 'My rook on g8 watches g1. The king cannot castle into check.' },
    { id: 'ep', title: 'En Passant', fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', pre: 'd7d5', goal: 'ep', limit: 1, par: 1, coach: 'wander',
      text: 'I push my pawn two squares past yours. Capture it en passant, right now, before the chance is gone.', tip: 'Your e5 pawn takes on d6, and my d5 pawn disappears.' }
  ],
  'l-qmate': [
    { id: 'q-mate1', title: 'Queen Finish', fen: '3k4/8/3K4/8/8/8/8/7Q w - - 0 1', goal: 'mate', limit: 1, par: 1, coach: 'defend',
      text: 'Your king guards the squares in front of mine. Checkmate in one with the queen.', tip: 'The back rank is open.' },
    { id: 'q-mate2', title: 'Mate in Two', fen: '7k/8/5K2/8/8/8/8/Q7 w - - 0 1', goal: 'mate', limit: 2, par: 2, coach: 'defend',
      text: 'Checkmate within 2 moves. One quiet queen move first, but leave me a legal move or it is stalemate.', tip: 'Put the queen on the 7th rank, a knight\'s jump from my king.' },
    { id: 'q-box', title: 'Shrink the Box', fen: '6k1/8/8/8/8/8/8/4K2Q w - - 0 1', goal: 'mate', limit: 12, par: 9, coach: 'defend',
      text: 'The full technique. My king is on the edge. Box it in, bring your king, and mate within 12 moves.', tip: 'Queen to the 7th rank keeps me on the back rank. Then walk your king up.' }
  ]
};
// The friendly coach: walks his king, never captures, and keeps away from the pieces you are hunting,
// so a beginner can focus on the piece they just learned. Falls back to any legal move.
function missionWander(g, rnd) {
  rnd = rnd || Math.random;
  var all = g.moves(), quiet = all.filter(function (m) { return !m.captured && !/\+/.test(m.san); }), kings = quiet.filter(function (m) { return m.piece === 'k'; });
  var pool = kings.length ? kings : quiet.length ? quiet : all;
  if (!pool.length) return null;
  var own = [], me = g.turn();
  for (var f = 0; f < 8; f++) for (var r = 1; r <= 8; r++) { var sq = 'abcdefgh'[f] + r, p = g.get(sq); if (p && p.color === me && p.type !== 'k') own.push(sq); }
  function dist(a, b) { return Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(+a[1] - +b[1])); }
  // a king step next to one of his own pieces would guard it, so prefer squares two or more away
  var far = pool.filter(function (m) { return m.piece !== 'k' || own.every(function (o) { return dist(m.to, o) >= 2; }); });
  if (far.length) pool = far;
  return pool[Math.floor(rnd() * pool.length)];
}
function missionMaterial(g, color) {
  var n = 0; for (var f = 0; f < 8; f++) for (var r = 1; r <= 8; r++) { var p = g.get('abcdefgh'[f] + r); if (p && p.color === color && p.type !== 'k') n++; }
  return n;
}
// Called after each of your moves. st = { caps: 0 }. Returns 'win' when the goal is met.
function missionCheck(m, g, mv, st) {
  if (mv.captured && (!m.types || m.types.indexOf(mv.captured) >= 0)) st.caps = (st.caps || 0) + 1;
  if (m.goal === 'sequence') {
    var want = m.seq[st.k || 0], got = String(mv.san).replace(/[+#]/g, '');
    if (got !== want) { st.wrong = got; return 'wrong'; }
    st.k = (st.k || 0) + 1; return st.k >= m.seq.length ? 'win' : null;
  }
  var foe = mv.color === 'w' ? 'b' : 'w';
  if (m.goal === 'check' && g.inCheck()) return 'win';
  if (m.goal === 'capture' && st.caps >= (m.count || 1)) return 'win';
  if (m.goal === 'captureAll' && missionMaterial(g, foe) === 0) return 'win';
  if (m.goal === 'mate' && g.inCheckmate()) return 'win';
  if (m.goal === 'promote' && mv.promotion) return 'win';
  if (m.goal === 'castle' && (mv.flags === 'k' || mv.flags === 'q') && (!m.castleSide || mv.flags === m.castleSide)) return 'win';
  if (m.goal === 'develop') { var me = mv.color, back = me === 'w' ? '1' : '8', out = 0; ['b', 'c', 'f', 'g'].forEach(function (f) { var q = g.get(f + back); if (!(q && q.color === me && (q.type === 'n' || q.type === 'b'))) out++; }); var knights = ['b', 'g'].filter(function (f) { var q = g.get(f + back); return !(q && q.color === me && q.type === 'n'); }).length, centre = ['d4', 'e4', 'd5', 'e5'].some(function (q) { var x = g.get(q); return x && x.color === me && x.type === 'p'; }); if (knights >= (m.minors || 2) && centre) return 'win'; }
  if (m.goal === 'ep' && mv.flags === 'e') return 'win';
  if (g.inStalemate()) return 'stalemate';
  return null;
}
if (typeof module !== 'undefined') module.exports = { MISSIONS: MISSIONS, missionWander: missionWander, missionCheck: missionCheck, missionMaterial: missionMaterial };
