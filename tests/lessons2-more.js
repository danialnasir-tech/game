// Second half for the short lessons: more teaching with questions and board taps, then verified practice.
// Appended after the existing steps so every recorded clip keeps its step number.
module.exports = function (H) {
  const { gen, pick, moveFrom, choiceFrom, threatFrom, fenOf, Game, U } = H;
  const after = (sans) => { const g = new Game(); sans.forEach(m => g.move(m)); return g.fen(); };
  const smothered = p => {
    if (p.sol.length % 2 === 0) return false;
    const g = new Game(fenOf(p)); let r; for (const u of p.sol) { r = U(g, u); if (!r) return false; }
    if (!g.inCheckmate() || r.piece !== 'n') return false;
    const me = g.turn(), F = 'abcdefgh'; let ks = null;
    for (const f of F) for (let n = 1; n <= 8; n++) { const q = g.get(f + n); if (q && q.type === 'k' && q.color === me) ks = f + n; }
    const fi = F.indexOf(ks[0]), ri = +ks[1];
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue; const f = fi + df, n = ri + dr; if (f < 0 || f > 7 || n < 1 || n > 8) continue;
      const q = g.get(F[f] + n); if (!q || q.color !== me) return false;
    }
    return true;
  };
  const italian = after(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6']);
  const X = {};

  // ---------------- Foundations ----------------
  X['l-rook'] = [
    { t: 'read', fen: '3b4/5p2/8/1n1R2p1/8/8/8/8 w - - 0 1', files: ['d'], ranks: [5], text: 'Let\'s test your rook eyes. The rook looks along its file and its rank, and it stops at the first piece in the way. Some black pieces are in its sights, and one is hiding off its lines.', tap: { q: 'Tap the three black pieces this rook can capture.', targets: ['b5', 'g5', 'd8'], need: 3, why: 'b5, g5 and d8 all sit on the rook\'s lines with nothing in between. The pawn on f7 is not on a straight line from d5.', wrong: 'Only pieces on the highlighted file and rank can be captured.' } },
    { t: 'move', fen: 'k7/2p5/3n4/8/8/8/8/b2R3K w - - 0 1', text: 'Two black pieces are on the rook\'s lines. The knight is protected by a pawn. The bishop is free. Take the free one.', sol: ['d1a1'], hint: 'The c7 pawn guards the knight. Look along the first rank.', done: 'Rook takes a1, and it even gives check. Taking the knight would lose your rook to the c7 pawn: 3 points for 5.' },
    { t: 'collect', piece: 'r', start: 'a1', stars: ['c3', 'f3', 'f7', 'b7'], par: 5, text: 'Four stars, and the rook only moves in straight lines. Find a route in five moves.' }
  ];
  X['l-bishop-queen'] = [
    { t: 'read', fen: '8/5r2/n1p5/8/2B5/8/8/8 w - - 0 1', dots: 'c4', text: 'Now the bishop is hunting. Diagonals only, and it stops at the first piece it meets. Look along every diagonal from c4.', tap: { q: 'Tap the two black pieces the bishop can capture.', targets: ['f7', 'a6'], need: 2, why: 'The rook on f7 and the knight on a6 are on the bishop\'s diagonals. The pawn on c6 is straight ahead, and bishops never move straight.', wrong: 'Bishops only move diagonally. Follow the dots.' } },
    { t: 'move', fen: 'k7/4p3/3n4/7r/8/8/8/1K1Q4 w - - 0 1', text: 'Your queen can reach two black pieces. One is guarded by a pawn. Never give your queen away: take the free piece.', sol: ['d1h5'], hint: 'The knight on d6 is guarded by the e7 pawn. Look along the diagonal to h5.', done: 'Queen takes the rook on h5. Five points for free. Queen takes d6 would lose your queen to the pawn.' },
    { t: 'collect', piece: 'q', start: 'd1', stars: ['h5', 'e8', 'a4'], par: 3, text: 'The queen moves like a rook and a bishop. Collect the stars in three moves, one diagonal at a time.' }
  ];
  X['l-knight'] = [
    { t: 'read', fen: '8/8/8/8/4N3/8/8/8 w - - 0 1', text: 'Your turn to find the jumps. Two squares in one direction, then one to the side. No dots this time.', tap: { q: 'Tap three squares this knight can jump to.', targets: ['d6', 'f6', 'c5', 'g5', 'c3', 'g3', 'd2', 'f2'], need: 3, why: 'From e4 the knight reaches eight squares: d6, f6, c5, g5, c3, g3, d2 and f2.', wrong: 'Count two squares straight, then one to the side.' } },
    { t: 'read', fen: '8/8/8/8/8/5N2/8/8 w - - 0 1', spot: ['f3'], text: 'Here is a knight secret. This knight stands on f3, a light square. Every L-jump lands on the other colour.', ask: { q: 'After one jump, the knight stands on…', options: ['A light square', 'A dark square', 'Either colour'], a: 1, why: 'Every jump changes colour: light, dark, light, dark. Strong players use this to count knight routes.', wrong: ['Try it on the board in your head: f3 to g5. What colour is g5?', '', 'It is always the opposite colour. Never the same.'] } },
    { t: 'read', fen: '4k3/8/8/2PPP3/2PNP3/2PPP3/8/4K3 w - - 0 1', text: 'Boxed in by its own pawns? The knight does not care. It is the only piece that jumps straight over others.', tap: { q: 'Tap any square this knight can jump to.', targets: ['b5', 'b3', 'c6', 'e6', 'f5', 'f3', 'c2', 'e2'], why: 'The pawns around it do not matter. The knight lands two squares away and one to the side.', wrong: 'Jump over the pawns: two squares straight, then one to the side.' } },
    { t: 'move', fen: '4k3/8/r3r3/8/8/3N4/8/7K w - - 0 1', text: 'Knights love to attack two things at once. Find the jump that hits both black rooks.', sol: ['d3c5'], hint: 'Look for a square two rows up from where the knight can reach a6 and e6.', done: 'Knight c5 attacks both rooks. Black can only save one. This double attack is called a fork, and knights are the best at it.' },
    { t: 'collect', piece: 'n', start: 'g1', stars: ['f3', 'e5', 'd7', 'b8'], par: 4, text: 'A knight gallop. Follow the stars in four jumps.' }
  ];
  X['l-king-pawn'] = [
    { t: 'read', fen: '8/8/8/3k4/8/3K4/8/8 w - - 0 1', text: 'One golden rule: two kings can never stand next to each other. Any square that touches the black king is forbidden for your king.', tap: { q: 'Tap a square your king can NOT move to.', targets: ['c4', 'd4', 'e4'], why: 'c4, d4 and e4 all touch the black king. A king may never move next to the other king.', wrong: 'That square is safe. Look for one that touches the black king.' } },
    { t: 'move', fen: '4k3/8/8/2n1q3/3P4/8/8/K7 w - - 0 1', text: 'Your pawn can capture two pieces. Which one is worth more? Take it.', sol: ['d4e5'], hint: 'A queen is worth 9 points, a knight 3.', done: 'Pawn takes the queen. Your smallest piece just won Black\'s strongest one.' }
  ];
  X['l-check'] = [
    { t: 'read', fen: '4k2r/8/2n5/b7/8/8/8/4K3 w - - 0 1', text: 'You are in check, but from which piece? Follow the lines and the jumps toward your king.', tap: { q: 'Tap the black piece that is giving check.', targets: ['a5'], why: 'The bishop on a5 attacks e1 along the diagonal through b4, c3 and d2.', wrong: 'That piece does not reach your king. Look along the diagonals.' } },
    { t: 'move', fen: '4k3/8/8/b7/8/8/8/R3K3 w - - 0 1', text: 'The bishop checks again. There are three ways out: move, block or capture. The best one here wins a piece. Get out of check!', sol: ['a1a5'], hint: 'Your rook can reach the checking piece.', done: 'Rook takes the bishop. You escape the check and win 3 points in one move. Capturing the attacker is often the best answer.' },
    { t: 'read', fen: '7k/8/6QK/8/8/8/8/8 b - - 0 1', text: 'Quiz time. Black is to move. Look at the black king and every square next to it.', ask: { q: 'Black to move. What is this?', options: ['Check', 'Checkmate', 'Stalemate'], a: 2, why: 'The king is not attacked, but every square next to it is covered. No legal move and no check: stalemate. The game is a draw.', wrong: ['The queen does not attack h8. Look again.', 'Mate needs a check. Is the king attacked?', ''] } },
    { t: 'read', fen: 'R6k/6pp/8/8/8/8/8/6K1 b - - 0 1', text: 'One more. Black to move again. Can the king run, block or capture?', ask: { q: 'And this one: check, mate or stalemate?', options: ['Check', 'Checkmate', 'Stalemate'], a: 1, why: 'The rook checks along the back rank. g8 is covered too, and the pawns block the rest. Checkmate.', wrong: ['Can the king escape? Try g8.', '', 'The king IS attacked by the rook, so it cannot be stalemate.'] } },
    { t: 'move', fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', text: 'Your king guards a7 and b7. Now use the queen: give checkmate.', sol: ['h1h8'], anyMate: true, hint: 'Check the king along the back rank.', done: 'Checkmate! The queen covers the whole eighth rank and your king covers the rest.' }
  ];
  X['l-special'] = [
    { t: 'read', fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', arrows: [['e1', 'c1', 'y'], ['a1', 'd1', 'y']], text: 'You can also castle on the queen side. It is written O-O-O. The king still moves two squares, and the rook jumps over to stand next to him.', ask: { q: 'After O-O-O, where does White\'s king stand?', options: ['b1', 'c1', 'd1'], a: 1, why: 'The king goes two squares from e1 to c1, and the rook from a1 lands on d1.', wrong: ['That is one square too far. The king always moves exactly two.', '', 'd1 is where the rook lands.'] } },
    { t: 'move', fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1', teach: 1, text: 'Castle queenside this time. Tap the king, then c1.', sol: ['e1c1'], hint: 'The king moves two squares toward the a1 rook.', done: 'O-O-O. The king is on c1 and the rook joins the fight on d1.' },
    { t: 'read', fen: 'r3k2r/8/8/8/1b6/8/8/R3K2R w KQkq - 0 1', arrows: [['b4', 'e1', 'r']], text: 'The bishop on b4 gives check. Neither your king nor your rooks have moved.', ask: { q: 'Can White castle right now?', options: ['Yes, kingside', 'Yes, queenside', 'No, not while in check'], a: 2, why: 'You can never castle out of check. First deal with the check, castle later.', wrong: ['Your king is in check. That rule decides it.', 'Your king is in check. That rule decides it.', ''] } },
    { t: 'move', fen: '4k3/8/8/8/3Pp3/8/8/4K3 b - d3 0 1', text: 'Now you play Black. White\'s pawn just jumped from d2 to d4, right beside your pawn. Capture it en passant.', sol: ['e4d3'], hint: 'Your pawn lands on the square the white pawn skipped.', done: 'En passant! Your pawn lands on d3 and the white pawn disappears. Remember: only on the very next move.' }
  ];
  X['l-qmate'] = [
    { t: 'read', fen: 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', text: 'Here is the trap that costs beginners a win. Black is to move. Look at the black king.', ask: { q: 'Black to move. What is the result?', options: ['Checkmate, White wins', 'Stalemate, a draw', 'Black is in check'], a: 1, why: 'The king is not in check, but a7, b7 and b8 are all covered. No legal move: stalemate. White threw away the win.', wrong: ['The queen does not attack a8, so it is not mate.', '', 'Follow the queen\'s lines. None of them reaches a8.'] } },
    { t: 'move', fen: '2k5/8/2K5/8/8/8/8/7Q w - - 0 1', text: 'The kings stand face to face. Your queen is far away, but she can still mate in one.', sol: ['h1h8'], anyMate: true, hint: 'Check along the back rank from the side.', done: 'Checkmate. The queen covers the eighth rank and your king covers b7, c7 and d7.' }
  ];
  X['l-firstmoves'] = [
    { t: 'read', fen: italian, text: 'You have castled. Now count your pieces. Every piece still sitting on the back row is a piece that is not fighting.', tap: { q: 'Tap the two white pieces that have not moved yet.', targets: ['b1', 'c1'], need: 2, why: 'The knight on b1 and the bishop on c1 are still at home. Bring them out before you start an attack.', wrong: 'That piece has already moved, or it is a pawn or a rook. Look for a sleeping knight or bishop.' } },
    { t: 'move', fen: italian, teach: 1, text: 'Black\'s knight on f6 is eyeing your e4 pawn. Bring out a sleeping piece that also guards it.', sol: ['b1c3'], accept: ['d2d3'], hint: 'Your knight on b1 can reach a square that defends e4.', done: 'Every white piece is now out or ready. Centre, development, castle: the three jobs are done.' }
  ];

  // ---------------- 400 - 1200 ----------------
  X['l-values'] = [
    { t: 'read', fen: 'r3k3/pp6/2n5/8/5q2/8/8/4K3 w - - 0 1', text: 'Before you capture anything, count. Look at Black\'s pieces: a rook, a knight, a queen and two pawns.', tap: { q: 'Tap the black piece worth the most points.', targets: ['f4'], why: 'The queen is worth 9. The rook is 5, the knight 3 and each pawn 1.', wrong: 'Not that one. Which piece is worth 9 points?' } }
  ].concat(gen(pick(p => p.theme === 'hanging' && p.r >= 300 && p.r <= 800, 10), choiceFrom, ['Count first. Which capture really wins material, A or B?', 'One capture is free, the other is a trap. A or B?']).slice(0, 2))
    .concat(gen(pick(p => p.theme === 'hanging' && p.r >= 350 && p.r <= 850, 10), moveFrom, ['Something is left undefended. Count, then take it.', 'Find the free piece.'], 'Look for a black piece that nothing defends.').slice(0, 2));
  X['l-cct'] = gen(pick(p => p.theme === 'hanging' && p.r >= 500 && p.r <= 1000, 10), threatFrom, ['Blunder check from their side. Your opponent is to move. What can they take?', 'Their move. Which of your pieces is in danger?']).slice(0, 2)
    .concat(gen(pick(p => (p.theme === 'hanging' || p.theme === 'fork') && p.r >= 600 && p.r <= 1100, 10), moveFrom, ['Checks, captures, threats. Find the move.', 'Scan the whole board, then play.'], 'Start with checks, then captures.').slice(0, 2));
  X['l-traps'] = [
    { t: 'read', fen: after(['f3', 'e5', 'g4']), arrows: [['d8', 'h4', 'y']], text: 'The fastest game in chess. White pushed the f- and g-pawns, and the diagonal to the white king is wide open.', ask: { q: 'Black to move. Which queen move ends the game?', options: ['Qh4', 'Qg5', 'Qf6'], a: 0, why: 'Qh4 is checkmate. Nothing can block and the king has no square. This is Fool\'s Mate: two moves.', wrong: ['', 'Qg5 attacks the pawn, but it is not check.', 'Qf6 is not check. Find the diagonal to e1.'] } }
  ].concat(gen(pick(p => p.theme === 'mate' && p.r >= 250 && p.r <= 700 && /f7|f2/.test(p.sol.join(' ')), 10), moveFrom, ['The weak square f7 again. Finish the game.', 'Early attack on the king. Find the mate.'], 'Look at f7 and f2, the squares only the king defends.').slice(0, 2));

  // ---------------- 800 - 1600 ----------------
  X['l-smothered'] = [
    { t: 'read', fen: '6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1', spot: ['h8'], text: 'Mate is on the board. The knight on f7 checks, and every square next to the black king is filled by its own pieces.', tap: { q: 'Tap the black piece that blocks the king\'s last escape square.', targets: ['g8'], why: 'The rook on g8 fills the only square the knight does not cover. The king is smothered by its own army.', wrong: 'Look at the squares right next to the king. Which one would be free without that piece?' } }
  ,
    { t: 'read', fen: '6nk/6pp/8/4N3/8/8/8/6K1 w - - 0 1', text: 'Only one piece can deliver a smothered mate, because only one piece gives a check that cannot be blocked.', ask: { q: 'Which piece is it?', options: ['The queen', 'The knight', 'The rook'], a: 1, why: 'A knight check can only be answered by moving the king or capturing the knight. If the king is boxed in, it is mate.', wrong: ['A queen check can be blocked by a piece stepping in between.', '', 'A rook check can be blocked too.'] } },
    { t: 'move', fen: '6nk/6pp/8/4N3/8/8/8/6K1 w - - 0 1', text: 'Now play it. The king is boxed in by its own knight and pawns.', sol: ['e5f7'], anyMate: true, hint: 'Find the knight check on the h8 king.', done: 'Knight f7, smothered mate. The black knight on g8 blocks the king\'s last square.' },
    { t: 'move', fen: 'kr6/pp6/8/1N6/8/8/8/6K1 w - - 0 1', text: 'Same idea in the other corner. Smother the king.', sol: ['b5c7'], anyMate: true, hint: 'Which knight jump checks the king on a8?', done: 'Knight c7 is mate. The rook and pawns fill every square around the king.' }
  ].concat(gen(pick(smothered, 6), moveFrom, ['Smother the king.', 'The king is boxed in by its own pieces. Find the knight finish.', 'Knight mate. Make every move count.'], 'Look for a knight check the king cannot escape.').slice(0, 3));
  X['l-rookmate'] = [
    { t: 'read', fen: '8/8/8/3k4/R7/8/8/4K3 b - - 0 1', ranks: [4], text: 'Watch the fence. The rook holds the whole fourth rank. The black king can never cross it.', tap: { q: 'Tap three squares the black king can still move to.', targets: ['c5', 'e5', 'c6', 'd6', 'e6'], need: 3, why: 'The king can move to c5, e5, c6, d6 and e6, but never down to rank 4. The fence holds.', wrong: 'That square is on the rook\'s line, or too far away.' } },
    { t: 'move', fen: '8/8/8/3k4/8/8/8/R3K3 w - - 0 1', teach: 1, text: 'Build the fence yourself. Cut the king off on the fourth rank.', sol: ['a1a4'], hint: 'Move the rook up its file to rank 4.', done: 'The black king is locked into the top half of the board. Now walk your king up.' },
    { t: 'move', fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', text: 'Kings face to face, and your rook is free. Finish it.', sol: ['a1a8'], hint: 'Check along the back rank.', done: 'Checkmate. Your king covers f7, g7 and h7, and the rook covers the eighth rank.' }
  ];
  X['l-kp'] = [
    { t: 'read', fen: '8/8/4k3/8/4K3/4P3/8/8 b - - 0 1', text: 'The kings face each other with one square between them, and it is Black\'s turn.', ask: { q: 'Who has the opposition?', options: ['White', 'Black'], a: 0, why: 'The side that does NOT have to move has the opposition. Black must step aside and let the white king through.', wrong: ['Having to move here is a weakness, not a strength.', ''] } },
    { t: 'move', fen: '8/8/8/8/8/8/k3P3/7K w - - 0 1', text: 'Use the rule of the square. Only one pawn move keeps the black king outside it. Find it.', sol: ['e2e4'], hint: 'Draw the square for each pawn move. Can the king step inside?', done: 'After e4 the square runs from e4 to a8, and the king on a2 cannot reach it. The pawn queens.' }
  ].concat(gen(pick(p => p.theme === 'endgame' && p.r <= 1300, 10), moveFrom, ['Endgame technique. Find the winning move.', 'Count every move of the race, then play.'], 'In endgames the king is a fighter. Count the race to the last rank.').slice(0, 2));
  X['l-rook-end'] = [
    { t: 'read', fen: '4k3/R7/1r2P3/3K4/8/8/8/8 b - - 0 1', arrows: [['b6', 'b1', 'y']], text: 'The white pawn just stepped to e6. Now the white king has no shelter from behind, so the Philidor defender changes plan.', ask: { q: 'Black to move. What should the rook do now?', options: ['Drop back to b1 and check from behind', 'Stay on the sixth rank', 'Attack the a7 rook'], a: 0, why: 'Once the pawn reaches the sixth, the king cannot hide in front of it. Checks from behind draw.', wrong: ['', 'Too late: the pawn has passed the sixth rank.', 'The rook trade does not help. Black needs checks.'] } },
    { t: 'move', fen: '4k3/R7/1r2P3/3K4/8/8/8/8 b - - 0 1', teach: 1, text: 'Play the drawing move.', sol: ['b6b1'], accept: ['b6b2'], hint: 'Get the rook far away, behind the white king.', done: 'Now the rook checks from behind and the white king has no place to hide. This is a draw.' }
  ];
  X['l-calc'] = gen(pick(p => p.theme === 'combo' && p.r >= 900 && p.r <= 1500, 10), choiceFrom, ['Calculate both candidates. Which one really works, A or B?', 'Two forcing moves. Follow each to the end. A or B?']).slice(0, 2)
    .concat(gen(pick(p => p.sol.length >= 3 && p.r >= 900 && p.r <= 1800, 10), moveFrom, ['A forcing line. Calculate it to the end, then play it.', 'Checks, captures, threats. Find the line that works.'], 'Start with the most forcing move and look at every reply.').slice(0, 2));
  X['l-convert'] = [
    { t: 'read', fen: '3r2k1/5ppp/4p3/3q4/8/7N/3Q1PPP/3R2K1 w - - 0 1', text: 'You are a piece up. The queens face each other on the d-file, and each one is protected.', ask: { q: 'Is a queen trade good for you here?', options: ['Yes: fewer pieces, the extra knight counts more', 'No: you need your queen to attack'], a: 0, why: 'Every trade makes your extra piece a bigger share of the army. With queens off, Black has no counterplay.', wrong: ['When you are ahead, trades are your friend. They remove the opponent\'s chances.', ''] } },
    { t: 'read', fen: '6k1/5ppp/8/8/8/8/2r2PPP/3R1RK1 w - - 0 1', arrows: [['c2', 'f2', 'r']], text: 'Even a won game has dangers. Your rook is a whole rook better, but Black\'s rook has reached your second rank.', ask: { q: 'What do you do first?', options: ['Rush the pawns forward', 'Stop the counterplay first', 'Offer a draw'], a: 1, why: 'Win slowly. Remove the opponent\'s threats first, then push. A safe win is still a win.', wrong: ['Rushing gives Black\'s rook free pawns.', '', 'Never offer a draw in a won position.'] } }
  ].concat(gen(pick(p => (p.theme === 'promotion' || p.theme === 'endgame') && p.r >= 300 && p.r <= 1200, 10), moveFrom, ['You are winning. Find the cleanest way to finish.', 'Convert the advantage.', 'Make your extra material count.'], 'Trade down or promote. Keep it simple.').slice(0, 3));
  X['l-outposts'] = [
    { t: 'read', fen: 'r1bq1rk1/pp3ppp/2np1n2/2p1p3/2P1P3/2NP1N2/PP3PPP/R1BQ1RK1 w - - 0 1', text: 'An outpost is a hole in the enemy camp: a square your pawn protects that no enemy pawn can ever attack. Find one for White here.', tap: { q: 'Tap the outpost square for White\'s knight.', targets: ['d5'], why: 'd5 is guarded by your c4 and e4 pawns, and no black pawn can ever attack it. A knight there is a monster.', wrong: 'An outpost is protected by your pawn and can never be hit by an enemy pawn.' } },
    { t: 'read', fen: 'r1bq1rk1/pp3ppp/2np1n2/2pNp3/2P1P3/3P1N2/PP3PPP/R1BQ1RK1 b - - 0 1', spot: ['d5'], text: 'The knight has arrived on d5.', ask: { q: 'Why is this knight so strong?', options: ['No black pawn can attack it', 'It is near the white king', 'It can be traded easily'], a: 0, why: 'Only a piece can challenge it, and trading a piece for it often leaves Black worse.', wrong: ['', 'It is in the middle of the board, far from its own king.', 'Black would have to give up a piece to remove it.'] } }
  ];
  X['l-structure'] = [
    { t: 'read', fen: '4k3/8/8/8/2P5/2P5/P4PPP/4K3 w - - 0 1', files: ['c'], text: 'Doubled pawns: two pawns of the same colour on one file. They block each other and cannot protect each other.', tap: { q: 'Tap one of the doubled pawns.', targets: ['c3', 'c4'], why: 'c3 and c4 are both on the c-file. The front one can only be defended by pieces.', wrong: 'Look for two white pawns on the same file.' } },
    { t: 'read', fen: '4k3/pp3p2/8/3P4/8/8/PP3PP1/4K3 w - - 0 1', text: 'Find the passed pawn: no enemy pawn in front of it, on its own file or the files next to it.', tap: { q: 'Tap White\'s passed pawn.', targets: ['d5'], why: 'No black pawn stands on the c-, d- or e-file in front of d5. Nothing but pieces can stop it.', wrong: 'That pawn still has a black pawn in front of it on its own file or a neighbouring file.' } }
  ].concat(gen(pick(p => p.theme === 'promotion' && p.r <= 1300, 10), moveFrom, ['Passed pawns must be pushed. Find the way through.', 'Turn the passed pawn into a queen.'], 'Push the pawn, or clear its path.').slice(0, 1));
  X['l-principles'] = [
    { t: 'read', fen: after(['e4', 'e5', 'Nf3']), text: 'Good developing moves do two things at once. White\'s knight came out toward the centre and it already has a target.', tap: { q: 'Tap the black piece the knight on f3 attacks.', targets: ['e5'], why: 'The knight hits the e5 pawn. Black must defend it, so White gains time.', wrong: 'Count an L-jump from f3. Which black piece is on one of those squares?' } },
    { t: 'move', fen: after(['e4', 'e5', 'Nf3', 'Qf6']), teach: 1, text: 'Black brought the queen out early. Develop a piece and keep your pawns healthy.', sol: ['b1c3'], accept: ['f1c4', 'd2d3', 'f1e2'], hint: 'A knight or a bishop toward the centre.', done: 'Every developing move you make while Black\'s queen wanders is time you win.' }
  ];

  // ---------------- tactics ----------------
  X['l-pins'] = [
    { t: 'read', fen: '4k3/8/3p4/4n3/8/8/3P4/4RK2 w - - 0 1', files: ['e'], text: 'Quick check before the last puzzles. The knight on e5 stands between your rook and the black king.', ask: { q: 'A piece pinned to its own king may…', options: ['Never move off the line', 'Move only forward', 'Move if it is protected'], a: 0, why: 'Moving it would put its own king in check, and that is never allowed. Attack a pinned piece: it cannot run.', wrong: ['', 'Direction does not matter. Any move off the line exposes the king.', 'Protection does not help. The king would still be in check.'] } }
  ];
  X['l-skewers'] = [
    { t: 'read', fen: '3q4/8/8/3k4/8/8/8/3R2K1 b - - 0 1', files: ['d'], text: 'Pin or skewer? Look at which piece stands in front on the line.', ask: { q: 'In a skewer, which piece stands in front?', options: ['The more valuable one', 'The less valuable one'], a: 0, why: 'The valuable piece is attacked first and must move away. Then you take the piece behind it.', wrong: ['', 'That is a pin: the cheaper piece in front cannot move.'] } }
  ];
  X['l-discovered'] = [
    { t: 'read', fen: '3qkb2/3p1p2/3N4/8/8/8/8/4R1K1 b - - 0 1', arrows: [['e1', 'e8', 'r'], ['d6', 'e8', 'r']], text: 'Remember the double check from before: the knight and the rook both attack the king at once.', ask: { q: 'Why is a double check so strong?', options: ['Only a king move can answer it', 'It always wins the queen', 'It is always checkmate'], a: 0, why: 'You cannot block two checks or capture two pieces in one move. The king must move, and here it has no square.', wrong: ['', 'It often wins material, but the real power is that only the king can move.', 'Not always. But if the king has no square, it is mate.'] } }
  ];
  X['l-defender'] = gen(pick(p => p.theme === 'combo' && p.r <= 1300, 10), moveFrom, ['Find the defender and remove it.', 'Which black piece holds everything together? Take it away.'], 'Ask: which piece is guarding the target?').slice(0, 2);
  return X;
};
