// ===== Curriculum, openings and puzzles =====
var STAGES = [
  { id: 's1', name: 'Foundations', band: '100 – 400', min: 100, blurb: 'The board and how moves are written, how every piece moves, check, checkmate, and the special rules people forget.', lessons: ['l-board', 'l-pieces', 'l-rook', 'l-bishop-queen', 'l-knight', 'l-king-pawn', 'l-check', 'l-special', 'l-qmate', 'l-firstmoves'] },
  { id: 's2', name: 'Stop Losing Pieces', band: '400 – 800', min: 400, blurb: 'Piece values, opening principles and the first tactics that win games at this level.', lessons: ['l-values', 'l-cct', 'l-principles', 'l-forks', 'l-pins', 'l-skewers', 'l-backrank'] },
  { id: 's3', name: 'Tactical Weapons', band: '800 – 1200', min: 800, blurb: 'Discovered attacks, double check, removing defenders and the mating patterns that end games.', lessons: ['l-discovered', 'l-defender', 'l-patterns'] },
  { id: 's4', name: 'Endgames & Structure', band: '1200 – 1600', min: 1200, blurb: 'Opposition, the Lucena and Philidor, pawn breaks and pawn structure.', lessons: ['l-kp', 'l-rook-end', 'l-structure'] },
  { id: 's5', name: 'Mastery', band: '1600 – 2000', min: 1600, blurb: 'Calculation, outposts, prophylaxis and converting a winning position.', lessons: ['l-calc', 'l-outposts', 'l-convert'] }
];

var LESSONS = {
  'l-board': {
    title: 'The Board', minutes: 4, takeaways: ['Files are the columns, lettered a to h.', 'Ranks are the rows, numbered 1 to 8.', 'A square is named by its file, then its rank, like d4.'], goal: 'Learn the name of every square on the board.',
    steps: [
      { t: 'read', fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: 'Welcome to the chessboard. It has 64 squares, light and dark, in 8 columns and 8 rows. Every square has its own name, and in 3 minutes you will know them all.', tags: { d4: 'Dark', e4: 'Light' }, zones: [[['d4', 'e4'], 'C']] },
      { t: 'read', fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: 'The columns are called files. Each file has a letter, from a on the left to h on the right. The blue column is the e-file.', files: ['e'], tags: { a1: 'a', b1: 'b', c1: 'c', d1: 'd', e1: 'e', f1: 'f', g1: 'g', h1: 'h' } },
      { t: 'read', fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: 'The rows are called ranks. Each rank has a number, from 1 at the bottom to 8 at the top. The pink row is rank 4.', ranks: [4], tags: { a1: '1', a2: '2', a3: '3', a4: '4', a5: '5', a6: '6', a7: '7', a8: '8' } },
      { t: 'read', fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: 'Where a file and a rank cross, you get a square. The d-file crosses rank 4 here, so this square is called d4. Always the letter first, then the number.', files: ['d'], ranks: [4], tags: { d4: 'd4' } },
      { t: 'read', fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: 'Every square works the same way. Here are a few more: a1 in the bottom-left corner, h8 in the top-right, e2 and g5. Find each one by going along to the letter, then up to the number.', tags: { a1: 'a1', h8: 'h8', e2: 'e2', g5: 'g5' }, zones: [[['a1', 'h8', 'e2', 'g5'], 'C']] },
      { t: 'read', fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: 'The four squares in the middle are the most important ones in chess: d4, e4, d5 and e5. They are called the centre. You will hear about them a lot.', tags: { d4: 'd4', e4: 'e4', d5: 'd5', e5: 'e5' }, zones: [[['d4', 'e4', 'd5', 'e5'], 'C']] },
      { t: 'squares', fen: '8/8/8/8/8/8/8/8 w - - 0 1', targets: ['d4', 'e2', 'a8', 'h1', 'c6', 'f5'], text: 'Your turn! Tap the square I name. Letter first, then count up.', done: 'Six for six. You can read the board now.' },
      { t: 'squares', fen: '8/8/8/8/8/8/8/8 w - - 0 1', targets: ['b3', 'g7', 'e5', 'a1', 'h4', 'd8'], text: 'One more round, a little faster this time.', done: 'You know the board. Next, you meet the pieces that live on it.' }
    ]
  },
  'l-pieces': {
    title: 'Meet the Pieces', minutes: 6, takeaways: ['Each side has 16 pieces: 1 king, 1 queen, 2 rooks, 2 bishops, 2 knights and 8 pawns.', 'Each piece has a letter: K king, Q queen, R rook, B bishop, N knight. Pawns have no letter.', 'A move is written as the letter plus the square it lands on, like Nf3. Pawn moves are just the square, like e4.'], goal: 'Know every piece by sight, where it starts, and how its moves are written.',
    steps: [
      { t: 'read', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'This is how every game starts. White sits at the bottom on ranks 1 and 2, Black at the top on ranks 7 and 8. Each side has 16 pieces of six kinds. Let me introduce them one by one.', zones: [[['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'], 'A'], [['a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'], 'B']] },
      { t: 'read', meet: 'k', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', spot: 'k', tags: { e1: 'King' }, text: 'This is the king, the tallest piece, with a cross on top. White\'s king starts on e1, Black\'s on e8. Protect him: if your king is trapped, you lose.' },
      { t: 'read', meet: 'q', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', spot: 'q', tags: { d1: 'Queen' }, text: 'Next to him is the queen, with a crown of points: the strongest piece of all. Each queen starts on her own colour, white on light d1, black on dark d8.' },
      { t: 'read', meet: 'r', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', spot: 'r', tags: { a1: 'Rook', h1: 'Rook' }, text: 'In the corners are the rooks. They look like castle towers. Each side has two.' },
      { t: 'read', meet: 'n', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', spot: 'n', tags: { b1: 'Knight', g1: 'Knight' }, text: 'Next to the rooks are the knights, the horses. Each side has two. Their letter is N, because K is already taken by the king.' },
      { t: 'read', meet: 'b', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', spot: 'b', tags: { c1: 'Bishop', f1: 'Bishop' }, text: 'Next to the knights are the bishops, with a pointed hat and a little slit. Each side has two, one on a light square and one on a dark square.' },
      { t: 'read', meet: 'p', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', spot: 'p', zones: [[['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'], 'C']], text: 'In front stand the pawns, eight for each side. They are the smallest pieces, but a pawn that reaches the far side becomes a queen.' },
      { t: 'pieces', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', targets: ['k', 'q', 'r', 'b', 'n', 'p'], text: 'Let\'s see if you remember them. Tap one of your white pieces each time I name it.', done: 'You know all six pieces. Each one moves differently, and the next lessons teach them one at a time.' },
      { t: 'read', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Chess players write moves down with letters: K for king, Q for queen, R for rook, B for bishop and N for knight. The move Nf3 means: a knight goes to f3.', arrows: [['g1', 'f3', 'g']], spot: 'N', tags: { f3: 'Nf3' } },
      { t: 'read', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Pawns get no letter at all. So when you see just a square, like e4, it means a pawn moves there.', arrows: [['e2', 'e4', 'g']], tags: { e4: 'e4' }, spot: 'P' },
      { t: 'move', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Now you play. Make the move written e4. Tap the pawn, then the square.', sol: ['e2e4'], hint: 'No letter, so it is a pawn. The pawn on e2 can step two squares to e4 on its first move.', done: 'e4. The most popular first move in chess.', tags: { e4: 'e4' } },
      { t: 'move', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', text: 'Black answered e5. Now make the move written Nf3.', sol: ['g1f3'], hint: 'N is the knight. Your knight on g1 can jump to f3.', done: 'Nf3. You just read and played real chess notation.', tags: { f3: 'f3' } }
    ]
  },
  'l-rook': {
    title: 'The Rook', minutes: 4, takeaways: ['Rooks move in straight lines, up, down and sideways.', 'Plan a route before you move, and count your moves.'], goal: 'Move the rook in straight lines and collect every star.',
    steps: [
      { t: 'read', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', dots: 'd4', meet: 'r', text: 'The rook moves any number of squares in a straight line: up, down, left or right. The dots show every square it can reach from d4. Rooks are worth about 5 pawns.', },
      { t: 'read', fen: '8/8/8/3p4/1P1R4/8/3P4/8 w - - 0 1', dots: 'd4', text: 'The rook cannot jump. Your own pawns on b4 and d2 block its path. An enemy piece, like the black pawn on d5, can be captured, shown by the ring, but the rook stops there.', tags: { d5: 'Capture' } },
      { t: 'move', fen: '4k3/8/8/8/1n6/8/8/1R2K3 w - - 0 1', text: 'A rook captures by moving onto an enemy piece\'s square. Take the black knight!', sol: ['b1b4'], hint: 'The knight is straight up the b-file from your rook.', done: 'Captured. The knight is gone and your rook stands on its square.' },
      { t: 'collect', piece: 'r', start: 'a1', stars: ['a6', 'f6', 'f2', 'h2'], par: 4, text: 'Collect all four stars with the rook. Try to do it in 4 moves.' },
      { t: 'collect', piece: 'r', start: 'h8', stars: ['c8', 'c3', 'g3', 'g1', 'b1'], par: 5, text: 'Five stars this time. Plan the route before you move.' }
    ]
  },
  'l-bishop-queen': {
    title: 'Bishop and Queen', minutes: 5, takeaways: ['Bishops stay on one colour for the whole game.', 'The queen combines rook and bishop, so guard her carefully.'], goal: 'Learn diagonals, then combine them with straight lines.',
    steps: [
      { t: 'read', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', dots: 'd4', meet: 'b', text: 'The bishop moves diagonally, any number of squares, like the dots show. It cannot jump over pieces. Bishops are worth about 3 pawns.', },
      { t: 'read', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', demo: ['c1g5', 'g5d8', 'd8a5'], text: 'Watch the bishop travel. It starts on c1, a dark square, and every diagonal step lands on another dark square. A bishop stays on its starting colour for the whole game.', zones: [[['c1'], 'C']] },
      { t: 'collect', piece: 'b', start: 'c1', stars: ['e3', 'g5', 'd8', 'a5'], par: 4, text: 'Collect the stars with the bishop.' },
      { t: 'read', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', dots: 'd4', meet: 'q', text: 'The queen moves like a rook and a bishop combined. She is the strongest piece, worth about 9 pawns, so never give her away for free.', },
      { t: 'collect', piece: 'q', start: 'd1', stars: ['d7', 'a4', 'h4', 'h8'], par: 4, text: 'Collect the stars with the queen in 4 moves.' }
    ]
  },
  'l-knight': {
    title: 'The Knight', minutes: 5, takeaways: ['Knights jump in an L and always change square colour.', 'Keep knights in the centre, where they control eight squares.'], goal: 'Master the L-shaped jump, the only move that hops over pieces.',
    steps: [
      { t: 'read', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', dots: 'd4', meet: 'n', arrows: [['d4', 'd6', 'y'], ['d6', 'e6', 'y']], text: 'The knight moves in an L: two squares one way, then one to the side, like the yellow arrows. The dots show all eight landing squares. It is the only piece that can jump over others.' },
      { t: 'collect', piece: 'n', start: 'b1', stars: ['c3', 'e4', 'f6', 'g8'], par: 4, text: 'Hop the knight across the board to collect the stars.' },
      { t: 'collect', piece: 'n', start: 'a1', stars: ['b3', 'd4', 'c6', 'e7'], par: 4, text: 'Knights need planning. Find a 4-jump route.' },
      { t: 'read', fen: '8/8/8/8/8/8/8/N7 w - - 0 1', dots: 'a1', text: 'A knight in the corner reaches only 2 squares. In the centre it reaches 8. Remember the saying: a knight on the rim is dim.', }
    ]
  },
  'l-king-pawn': {
    title: 'King and Pawns', minutes: 6, takeaways: ['Pawns move forward but capture diagonally.', 'A pawn that reaches the last rank becomes a queen.'], goal: 'Move the king safely, push pawns, capture with pawns and promote.',
    steps: [
      { t: 'read', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', meet: 'k', dots: 'd4', text: 'The king moves just one square in any direction: up, down, sideways or diagonally, as the dots show. Slow, but he must never step onto a square the enemy attacks.' },
      { t: 'collect', piece: 'k', start: 'e1', stars: ['e3', 'g5'], par: 4, text: 'The king moves one square in any direction. Walk him to both stars.' },
      { t: 'read', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', meet: 'p', dots: 'e2', text: 'Pawns move straight forward: one square, or two on their very first move, as the dots show. Pawns never move backwards.', },
      { t: 'read', fen: '4k3/8/8/8/3p1p2/4P3/8/4K3 w - - 0 1', dots: 'e3', text: 'Here is the surprise: pawns capture differently. They take one square diagonally forward, shown by the rings on d4 and f4. Straight ahead, a pawn can only move into an empty square.', tags: { d4: 'Take', f4: 'Take' } },
      { t: 'move', fen: '4k3/8/8/3r4/4P3/8/8/4K3 w - - 0 1', text: 'Your pawn can capture the black rook. Pawns capture one square diagonally forward. Take it!', sol: ['e4d5'], hint: 'The pawn on e4 attacks d5 and f5.', done: 'A pawn worth 1 just won a rook worth 5. A capture is written with an x: exd5 means the e-pawn takes on d5.' },
      { t: 'read', fen: '8/4P1k1/8/8/8/8/8/K7 w - - 0 1', arrows: [['e7', 'e8', 'g']], tags: { e8: 'Queen!' }, text: 'When a pawn reaches the far end of the board, it is promoted: you swap it for a queen, rook, bishop or knight. Almost everyone picks a queen. This is why every pawn matters.' },
      { t: 'move', fen: '8/4P1k1/8/8/8/8/8/K7 w - - 0 1', text: 'A pawn that reaches the last rank promotes. Almost always choose a queen. Promote your pawn!', sol: ['e7e8q'], hint: 'Push the e-pawn to e8.', done: 'New queen. Promotion is why passed pawns are so dangerous.' }
    ]
  },
  'l-check': {
    title: 'Check, Mate and Stalemate', minutes: 6, takeaways: ['Checkmate means check with no escape.', 'When you are winning, make sure your opponent still has a legal move, or it is stalemate.'], goal: 'Tell check, checkmate and stalemate apart.',
    steps: [
      { t: 'read', fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1', tags: { e8: 'Check!' }, text: 'Check means the king is attacked, and it is written with a plus sign, like Re1+. You must get out of check: move the king, block, or capture the attacker. Here Black can step aside.', arrows: [['e1', 'e8', 'r']] },
      { t: 'read', fen: 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', arrows: [['a8', 'g8', 'r']], zones: [[['f8', 'h8'], 'B'], [['f7', 'g7', 'h7'], 'C']], tags: { g8: 'Mate' }, text: 'This is checkmate. The rook attacks the king along the back rank. The king cannot step to f8 or h8, because the rook covers them, and its own pawns block f7, g7 and h7. No escape, no block, no capture: game over.' },
      { t: 'move', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', text: 'Checkmate means the king is in check and has no escape. Black\'s own pawns trap the king. Deliver checkmate.', sol: ['a1a8'], anyMate: true, hint: 'Look at the back rank, the 8th rank.', done: 'Checkmate, written with a hash sign: Ra8#. This is the back-rank mate, one of the most common mates at every level.' },
      { t: 'read', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', tags: { h8: 'No move' }, text: 'Stalemate: Black is NOT in check but has no legal move. The game is a draw. Winning players lose half a point this way every day.', marks: ['g8', 'h7', 'g7'] },
      { t: 'move', fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', text: 'Same position, but now it is your move. Give checkmate, not stalemate.', sol: ['f7g7'], anyMate: true, hint: 'Your king protects g7.', done: 'Mate. Before every quiet move in a winning ending, ask: does my opponent still have a legal move?' }
    ]
  },
  'l-special': {
    title: 'Castling and En Passant', minutes: 5, takeaways: ['Castle to protect your king and connect your rooks.', 'En passant is only allowed on the very next move.'], goal: 'Use the two special moves correctly.',
    steps: [
      { t: 'read', fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1', tags: { g1: 'King', f1: 'Rook' }, text: 'Castling moves the king two squares toward a rook, and the rook jumps over. You can castle only if neither piece has moved, the squares between are empty, and the king is not in check or passing through check.', arrows: [['e1', 'g1', 'g'], ['h1', 'f1', 'b']] },
      { t: 'move', fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1', text: 'Castle kingside to tuck your king away. It is written O-O. Tap the king, then g1.', sol: ['e1g1'], hint: 'Move the king from e1 to g1.', done: 'Castled. Your king is safer and your rook joins the game.' },
      { t: 'read', fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', demo: ['d7d5'], demoDelay: 3000, zones: [[['d6'], 'C']], text: 'Watch Black\'s pawn. It uses its two-square first move to jump from d7 to d5, right past your pawn on e5, skipping the square d6 where you could have taken it.' },
      { t: 'read', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', tags: { d6: 'Land here' }, text: 'Black just played d7-d5, passing your e5 pawn. On the very next move only, you may capture it as if it moved one square. This is en passant.', arrows: [['e5', 'd6', 'g']] },
      { t: 'move', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', text: 'Capture en passant.', sol: ['e5d6'], hint: 'Your pawn lands on d6 and the d5 pawn disappears.', done: 'En passant done. The right expires after one move.' }
    ]
  },
  'l-qmate': {
    title: 'Mate with King and Queen', minutes: 6, takeaways: ["Use your queen to shrink the king's box, then bring your own king close.", 'Always check for stalemate before a quiet queen move.'], goal: 'Finish a won game without stalemating.',
    steps: [
      { t: 'read', fen: '8/8/3k4/8/8/8/8/4K2Q w - - 0 1', dots: 'h1', text: 'The method has three steps. Box the king in with your queen, walk your own king up, then mate on the edge. Never leave the king with no move at all: that is stalemate, a draw.' },
      { t: 'move', fen: '4k3/8/8/8/8/8/8/4K2Q w - - 0 1', text: 'Step one: the box. Put your queen on the 7th rank. Then the black king cannot leave the back rank.', sol: ['h1h7'], accept: ['h1b7'], hint: 'From h1 the queen reaches the 7th rank on h7 or b7.', done: 'Boxed in. The king can only walk along the back rank now.' },
      { t: 'move', fen: '3k4/7Q/8/8/8/8/8/4K3 w - - 0 1', text: 'Step two: the queen holds the box by herself. Walk your king up toward the black king.', sol: ['e1e2'], accept: ['e1d2', 'e1f2'], hint: 'Move your king one square up the board.', done: 'Keep walking like this until your king stands in front of the black king.' },
      { t: 'move', fen: '3k4/7Q/3K4/8/8/8/8/8 w - - 0 1', text: 'Step three: your king is in front of theirs. Mate on the back rank.', sol: ['h7d7'], anyMate: true, hint: 'A queen check on the 7th or 8th rank, guarded by your king.', done: 'Checkmate. Box, walk, mate: that is the whole method.' },
      { t: 'move', fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', text: 'The king is on the edge and your king guards a7 and b7. Mate in one. Careful: Qc7 is stalemate!', sol: ['c1c8'], anyMate: true, hint: 'Check along the 8th rank.', done: 'Mate. Your king did half the work.' },
      { t: 'move', fen: '4k3/8/4K3/8/8/8/8/7Q w - - 0 1', text: 'Kings face each other. Find mate in one.', sol: ['h1h8'], anyMate: true, hint: 'The queen can reach the back rank in one move.', done: 'Mate. Kings in opposition plus a queen on the edge is the standard finish.' }
    ]
  },
  'l-firstmoves': {
    title: 'Your First Ten Moves', minutes: 4, takeaways: ['Job 1: put a pawn in the centre.', 'Job 2: bring your knights and bishops out.', 'Job 3: castle to keep your king safe.'], goal: 'Know exactly what to do at the start of every game.',
    steps: [
      { t: 'read', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Every game starts with three jobs. One: put a pawn in the centre. Two: bring out your knights and bishops. Three: castle.', marks: ['d4', 'e4', 'd5', 'e5'] },
      { t: 'move', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Job one. Push a centre pawn two squares. Pieces behind it can now come out.', sol: ['e2e4'], accept: ['d2d4'], hint: 'The e-pawn or the d-pawn, two squares forward.', done: 'Centre pawn. Your bishop and queen can now get out.' },
      { t: 'move', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', text: 'Job two. Bring a knight out toward the centre, where it reaches the most squares.', sol: ['g1f3'], accept: ['b1c3'], hint: 'Knights jump to f3 or c3.', done: 'Developed. Nf3 also attacks the e5 pawn.' },
      { t: 'move', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', text: 'Now a bishop. Put it on a square where it aims at the centre or at Black\'s king.', sol: ['f1c4'], accept: ['f1b5'], hint: 'The bishop on f1 can go to c4 or b5.', done: 'Bishop out. Now the king has an empty path to castle.' },
      { t: 'move', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', text: 'Job three. Castle: tap your king, then g1. The king hides in the corner and the rook joins the game.', sol: ['e1g1'], hint: 'The squares between the king and rook are empty now. King to g1.', done: 'Castled in four moves. That is a great start to any game.' },
      { t: 'read', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4', tags: { d1: 'Wait', a2: 'Edge', h2: 'Edge' }, text: 'Avoid three things early: moving one piece twice, bringing the queen out too soon, and pushing edge pawns. Do the three jobs and you will be ready to fight.' }
    ]
  },
  'l-values': {
    title: 'Piece Values and Free Material', minutes: 6, takeaways: ['Pawn one, knight and bishop three, rook five, queen nine.', 'Before capturing, count attackers and defenders.'], goal: 'Count before you capture. Take free pieces, avoid bad trades.',
    steps: [
      { t: 'read', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', tags: { e1: 'King', d1: '9', a1: '5', h1: '5', b1: '3', g1: '3', c1: '3', f1: '3', a2: '1', b2: '1', c2: '1', d2: '1', e2: '1', f2: '1', g2: '1', h2: '1' }, text: 'Every piece has a value in points, shown on your pieces: pawn 1, knight 3, bishop 3, rook 5, queen 9. The king is priceless. At under 1000, most games are decided by pieces left undefended.' },
      { t: 'move', fen: 'r3k3/8/8/8/3n4/8/8/3QK3 w - - 0 1', zones: [[['d4'], 'C']], text: 'The black knight is undefended. Win it.', sol: ['d1d4'], hint: 'Your queen sees the whole d-file.', done: 'Free piece. Always check: is anything of theirs undefended?' },
      { t: 'move', fen: '4k3/8/4p3/3n4/r7/8/8/3QK3 w - - 0 1', text: 'Two captures are possible. One wins material, one loses your queen. Choose well.', sol: ['d1a4'], hint: 'Who defends d5? Who defends a4?', done: 'Right. Qxd5 would be met by exd5. Count attackers and defenders before capturing.' }
    ]
  },
  'l-principles': {
    title: 'Opening Principles', minutes: 7, takeaways: ['Control the centre, develop your pieces, castle early.', "Don't move the same piece twice or bring the queen out too soon."], goal: 'Control the centre, develop pieces, castle early.',
    steps: [
      { t: 'read', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Three rules win you the opening: 1) put a pawn in the centre, 2) bring knights and bishops out before moving a piece twice, 3) castle within the first 10 moves.', marks: ['d4', 'e4', 'd5', 'e5'] },
      { t: 'move', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: 'Play a pawn move that grabs the centre.', sol: ['e2e4'], accept: ['e2e4', 'd2d4'], hint: 'Push the e-pawn or the d-pawn two squares.', done: 'Good. Central pawns open lines for your bishops and queen.' },
      { t: 'move', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', text: 'Develop a knight toward the centre.', sol: ['g1f3'], accept: ['g1f3', 'b1c3'], hint: 'Knights belong on f3 and c3.', done: 'Nf3 also attacks the e5 pawn, so it develops with a threat.' },
      { t: 'read', fen: 'rnb1kbnr/pppp1ppp/8/4p2q/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 3', text: 'Bringing the queen out early lets your opponent develop by attacking her. Watch how White gains time.', line: ['Nf3', 'Qh6', 'd4', 'Qg6', 'Nxe5'] }
    ]
  },
  'l-forks': {
    title: 'Forks', minutes: 7, takeaways: ['A fork attacks two targets at once.', 'Knights are the best forkers. Look for checks that also attack something.'], goal: 'Attack two things at once.',
    steps: [
      { t: 'read', fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', arrows: [['d5', 'c7', 'y'], ['c7', 'e8', 'r'], ['c7', 'a8', 'r']], tags: { c7: 'Fork' }, text: 'A fork is one piece attacking two targets. Here the knight jumps to c7 and attacks the king and the rook together. The opponent can only save one. Knights are the best forkers because their attack cannot be blocked.' },
      { t: 'move', fen: '4k3/8/8/1q6/2N5/8/8/4K3 w - - 0 1', text: 'Fork the king and the queen.', sol: ['c4d6', 'e8e7', 'd6b5'], hint: 'Which square attacks both e8 and b5?', done: 'Royal fork! Check first, then the queen falls.' },
      { t: 'move', fen: '4k3/8/2n1b3/8/2PP4/8/8/4K3 w - - 0 1', text: 'Pawns fork too. Knights and bishops are called minor pieces. Attack both of them with one pawn move.', sol: ['d4d5'], hint: 'A pawn on d5 attacks c6 and e6. The c4 pawn backs it up.', done: 'Pawn fork. One of the pieces will fall.' },
      { t: 'move', fen: 'r5k1/6pp/8/8/8/8/8/3QK3 w - - 0 1', text: 'Use the queen to fork king and rook.', sol: ['d1d5', 'g8h8', 'd5a8'], accept: ['d1d5'], hint: 'Find a check that also lines up with a8.', done: 'The queen hits g8 and a8 along two diagonals.' }
    ]
  },
  'l-pins': {
    title: 'Pins', minutes: 6, takeaways: ['A pinned piece cannot move without exposing something more valuable.', 'Attack pinned pieces with something cheaper.'], goal: 'Freeze a piece in front of something more valuable.',
    steps: [
      { t: 'read', fen: '4k3/8/3p4/4n3/8/8/3P4/4RK2 w - - 0 1', tags: { e5: 'Pinned', e8: 'King' }, text: 'A pin attacks a piece that cannot move without exposing something behind it. When the king is behind, the pin is absolute: the piece is not allowed to move at all.', arrows: [['e1', 'e8', 'r']] },
      { t: 'move', fen: '4k3/8/3p4/4n3/8/8/3P4/4RK2 w - - 0 1', text: 'The knight is pinned. Attack it with something cheap.', sol: ['d2d4'], hint: 'Attack the pinned piece with a pawn.', done: 'Pile up on pinned pieces. It cannot run away.' },
      { t: 'move', fen: '4k3/3q4/8/8/P7/8/8/4KB2 w - - 0 1', text: 'Pin the queen to the king with a protected bishop.', sol: ['f1b5'], hint: 'The a4 pawn protects b5.', done: 'The queen is pinned. Taking the bishop costs her life.' }
    ]
  },
  'l-skewers': {
    title: 'Skewers', minutes: 5, takeaways: ['A skewer attacks a big piece that must move and expose the one behind it.', 'Look for kings and queens lined up on the same line.'], goal: 'Attack a valuable piece so it moves and exposes the one behind.',
    steps: [
      { t: 'read', fen: '3q4/8/8/3k4/8/8/8/3R2K1 b - - 0 1', arrows: [['d1', 'd8', 'r']], tags: { d5: 'King', d8: 'Queen' }, text: 'A skewer is a reverse pin: the more valuable piece is in front. Here the rook checks the king. The king must step off the d-file, and then the rook takes the queen behind it.' },
      { t: 'move', fen: '6q1/8/8/3k4/8/1P6/8/5B1K w - - 0 1', text: 'Skewer the king and queen.', sol: ['f1c4', 'd5c6', 'c4g8'], accept: ['f1c4'], hint: 'Check along the c4-g8 diagonal. The b3 pawn guards c4.', done: 'The king steps aside, the queen falls.' },
      { t: 'move', fen: '8/8/8/q3k3/8/8/8/1K5R w - - 0 1', text: 'Now skewer along the rank.', sol: ['h1h5', 'e5d4', 'h5a5'], accept: ['h1h5'], hint: 'Check on the 5th rank.', done: 'Rooks skewer along ranks and files.' }
    ]
  },
  'l-backrank': {
    title: 'Back-Rank Mates', minutes: 6, takeaways: ['A king trapped behind its own pawns can be mated on the back rank.', 'Make an escape square with a pawn move like h3.'], goal: 'Punish a king trapped behind its own pawns.',
    steps: [
      { t: 'read', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', text: 'A king behind three unmoved pawns has no escape square. A rook or queen on the back rank gives mate. Defend by making luft: a pawn move like h3 or h6.', marks: ['f7', 'g7', 'h7'] },
      { t: 'move', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', text: 'Mate in one.', sol: ['d1d8'], anyMate: true, hint: 'Down the d-file.', done: 'Back-rank mate.' },
      { t: 'move', fen: 'r3r1k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', text: 'Mate in two. Sacrifice to remove the defender of the back rank.', sol: ['e2e8', 'a8e8', 'e1e8'], hint: 'Your queen and rook are stacked on the e-file.', done: 'Queen sacrifice, back-rank mate. Forcing moves first!' }
    ]
  },
  'l-discovered': {
    title: 'Discovered Attacks and Double Check', minutes: 7, takeaways: ['Moving one piece can unleash another behind it.', 'Double check can only be answered by moving the king.'], goal: 'Move one piece to unleash another.',
    steps: [
      { t: 'read', fen: '7q/2k5/8/8/3N4/8/1B6/6K1 w - - 0 1', text: 'The knight blocks your bishop\'s diagonal to h8. If the knight moves with a threat, the bishop attacks too: two threats in one move.', arrows: [['b2', 'h8', 'b']] },
      { t: 'move', fen: '7q/2k5/8/8/3N4/8/1B6/6K1 w - - 0 1', text: 'Win the queen with a discovered attack.', sol: ['d4b5', 'c7b6', 'b2h8'], accept: ['d4b5', 'd4e6'], hint: 'Move the knight with check.', done: 'Discovered attack. The check forces Black to ignore the queen.' },
      { t: 'move', fen: '3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1', text: 'Double check: both pieces give check, so only a king move helps. Here the king has none. Mate in one.', sol: ['e4d6'], anyMate: true, hint: 'The knight must check the king while unmasking the rook.', done: 'Double-check mate. Nothing can block two checks.' }
    ]
  },
  'l-defender': {
    title: 'Removing the Defender', minutes: 6, takeaways: ['If a piece is defended only once, remove or distract the defender.', 'Sacrifices that deflect defenders often win the game.'], goal: 'Capture or deflect the piece that holds the position together.',
    steps: [
      { t: 'read', fen: '6k1/5p1p/5n2/3r2B1/8/2N4P/5PP1/6K1 w - - 0 1', text: 'The rook on d5 is attacked by your knight but defended by the f6 knight. Remove the defender and the rook hangs.', arrows: [['c3', 'd5', 'r'], ['f6', 'd5', 'b']] },
      { t: 'move', fen: '6k1/5p1p/5n2/3r2B1/8/2N4P/5PP1/6K1 w - - 0 1', text: 'Remove the defender.', sol: ['g5f6'], hint: 'Your bishop can capture the defender.', done: 'The rook has lost its only defender. Next, Nxd5 or a fleeing rook leaves you a full piece up.' },
      { t: 'move', fen: 'r3r1k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', text: 'Deflection: lure a defender away. Mate in two.', sol: ['e2e8', 'a8e8', 'e1e8'], hint: 'Force the a8 rook to leave a8.', done: 'Deflected, then mated.' }
    ]
  },
  'l-patterns': {
    title: 'Mating Patterns', minutes: 8, takeaways: ['Learn the classic mates: smothered, Arabian and back rank.', 'Recognising patterns lets you find mates in seconds.'], goal: 'Recognise smothered, Arabian and support mates on sight.',
    steps: [
      { t: 'read', fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', zones: [[['g8', 'g7', 'h7'], 'C']], tags: { h8: 'Trapped' }, text: 'Strong players do not calculate every mate. They recognise pictures. Here the king is boxed in by its own rook and pawns. Remember this picture: a knight check is all it takes.' },
      { t: 'move', fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', text: 'Smothered mate: the king is trapped by its own pieces. Mate in one.', sol: ['h6f7'], anyMate: true, hint: 'A knight check cannot be blocked.', done: 'Smothered mate.' },
      { t: 'move', fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1', text: 'Arabian mate: rook and knight together. Mate in one.', sol: ['b7h7'], anyMate: true, hint: 'The knight on f6 protects h7.', done: 'Arabian mate, one of the oldest recorded patterns.' },
      { t: 'move', fen: '5rk1/5ppp/8/7Q/8/3B4/5PPP/6K1 w - - 0 1', text: 'Queen and bishop battery on h7. Mate in one.', sol: ['h5h7'], anyMate: true, hint: 'The bishop on d3 supports h7.', done: 'Supported queen mate on h7.' },
      { t: 'move', fen: 'r6k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1', text: 'Philidor\'s Legacy. Mate in two with a queen sacrifice.', sol: ['d5g8', 'a8g8', 'h6f7'], hint: 'Check on g8. Only the rook can take.', done: 'Queen sac, smothered mate. Remember this one forever.' }
    ]
  },
  'l-cct': {
    title: 'The Blunder Check', minutes: 8, takeaways: ['Every move: checks, captures, threats, for both sides.', 'Always ask what your opponent wants before you move.'], goal: 'Before every move, scan Checks, Captures and Threats for both sides.',
    steps: [
      { t: 'read', fen: '4r1k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', arrows: [['e8', 'e1', 'r']], tags: { e1: 'Threat' }, text: 'Most games below 1200 are lost to one careless move. Stop that with the blunder check: before every move, ask three questions in order. Checks: what checks exist? Captures: what can be taken? Threats: what does my opponent want to do next? Here the threat is Re1, checkmate. This one habit is worth hundreds of rating points.' },
      { t: 'move', fen: 'r1bqkbnr/pppp1ppp/2n5/8/3QP3/8/PPP2PPP/RNB1KBNR w KQkq - 1 4', text: 'Threats first. Black\'s knight on c6 is attacking your queen. Move her to a square where nothing can take her.', sol: ['d4e3'], judge: 'safe', hint: 'Look at every square she can go to, and ask: can a black piece capture me there?', done: 'Safe. When something is attacked, deal with it before anything else.' },
      { t: 'move', fen: '4r1k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', text: 'Black threatens Re1 mate. Find a move that stops it.', sol: ['h2h3'], judge: 'safe', hint: 'Make an escape square, or cover e1.', done: 'You stopped the threat. Always ask what your opponent wants.' },
      { t: 'move', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', text: 'Scan for checks and captures. One capture ends the game.', sol: ['h5f7'], anyMate: true, hint: 'Look at f7. Who defends it?', done: 'Scholar\'s mate. Checks and captures first: the blunder check finds it instantly.' },
      { t: 'move', fen: 'r1b1kbnr/pppp1ppp/2n5/4p3/2B1P2q/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', text: 'Your move. In a real game nobody warns you, so do the blunder check yourself: checks, captures, threats.', sol: ['f3h4'], hint: 'Captures: is any black piece attacked and unprotected?', done: 'The queen was free. Asking the three questions every move finds gifts like this.' }
    ]
  },
  'l-kp': {
    title: 'King and Pawn Endings', minutes: 8, takeaways: ['Take the opposition to push the enemy king back.', 'Use the square rule to see if a king can catch a pawn.'], goal: 'Opposition, key squares and the pawn breakthrough.',
    steps: [
      { t: 'read', fen: '8/8/8/8/k7/8/5P2/5K2 w - - 0 1', text: 'Rule of the square: draw a square from the pawn to its promotion rank. If the defending king can step inside it, it catches the pawn.', marks: ['f2', 'f8', 'b8', 'b2', 'c4', 'd5', 'e6'] },
      { t: 'move', fen: '8/8/4k3/8/3K4/4P3/8/8 w - - 0 1', text: 'Take the opposition: place your king directly opposite Black\'s with one square between.', sol: ['d4e4'], hint: 'Kings on the same file, one square apart.', done: 'Opposition. Black must give way, and your king advances.' },
      { t: 'move', fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1', text: 'Three against three, kings far away. Create a passed pawn by force.', sol: ['b5b6', 'a7b6', 'c5c6', 'b7c6', 'a5a6'], hint: 'Push the middle pawn first.', done: 'Breakthrough! The a-pawn queens.' }
    ]
  },
  'l-rook-end': {
    title: 'Rook Endgames', minutes: 9, takeaways: ['In the Lucena, build a bridge with your rook to shield checks.', 'In the Philidor, keep your rook on the third rank until the pawn advances.'], goal: 'The two positions every strong player knows: Lucena and Philidor.',
    steps: [
      { t: 'read', fen: '3K4/3P2k1/8/8/8/8/4r3/5R2 w - - 0 1', text: 'Lucena position: your pawn is on the 7th and your king is in front. The win is "building a bridge": put your rook on the 4th rank, walk the king out, and block the checks with the rook.', line: ['Rf4', 'Re1', 'Kc7', 'Rc1+', 'Kd6', 'Rd1+', 'Ke6', 'Re1+', 'Kd5', 'Rd1+', 'Rd4'] },
      { t: 'move', fen: '3K4/3P2k1/8/8/8/8/4r3/5R2 w - - 0 1', text: 'Start building the bridge.', sol: ['f1f4'], hint: 'Rook to the 4th rank.', done: 'The bridge is ready. Checks will be blocked on d4.' },
      { t: 'read', fen: '4k3/R7/1r6/3KP3/8/8/8/8 w - - 0 1', text: 'Philidor defence: keep your rook on your third rank so the enemy king cannot advance. The moment the pawn steps forward, swing the rook back and check from behind.', line: ['e6', 'Rb1', 'Kd6', 'Rd1+', 'Ke5', 'Re1+'] }
    ]
  },
  'l-structure': {
    title: 'Pawn Structure', minutes: 7, takeaways: ['Passed pawns must be pushed.', 'Put your pawns on the opposite colour of your bishop.'], goal: 'Read the pawns to find a plan.',
    steps: [
      { t: 'read', fen: 'r1bq1rk1/pp2bppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 1', text: 'Isolated queen pawn (d4): no neighbour pawns to protect it. White gets space and attacking chances; Black targets d4 and dreams of an endgame.', marks: ['d4', 'd5'] },
      { t: 'read', fen: '8/5k2/8/2P5/8/8/5K2/8 w - - 0 1', text: 'Passed pawn: no enemy pawn can stop it. Passed pawns must be pushed. In endgames, a passed pawn is often worth more than a piece.', arrows: [['c5', 'c8', 'g']] },
      { t: 'read', fen: 'r1bqk2r/pp1nbppp/2p1p3/3pP3/3P4/2NB1N2/PPP2PPP/R1BQK2R w KQkq - 0 1', text: 'Good vs bad bishop: Black\'s c8-bishop is blocked by its own pawns on e6 and d5. Put pawns on the opposite colour of your bishop.', marks: ['c8', 'e6', 'd5'] },
      { t: 'move', fen: 'r1bqk2r/pp1nbppp/2p1p3/3pP3/3P4/2NB1N2/PPP2PPP/R1BQK2R w KQkq - 0 1', text: 'Finish development and secure your king first. Strategy starts from a safe king.', sol: ['e1g1'], judge: 'safe', hint: 'Castle.', done: 'Safe king, then plans like f4-f5 against the e6 pawn.' }
    ]
  },
  'l-calc': {
    title: 'Calculation', minutes: 9, takeaways: ['List candidate moves, starting with the most forcing ones.', 'At the end of each line, ask what your opponent can do.'], goal: 'Candidate moves, forcing lines first, check the final position.',
    steps: [
      { t: 'read', fen: 'r6k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1', arrows: [['d5', 'g8', 'y'], ['h6', 'f7', 'y'], ['d5', 'd8', 'y']], text: 'Method: list candidate moves, like the yellow arrows (checks, captures, threats). Calculate the most forcing first. At the end of each line, ask: what can my opponent do here? Then stop and evaluate.' },
      { t: 'move', fen: '8/2q1P1k1/8/8/8/8/8/K7 w - - 0 1', text: 'Strong players consider every promotion. Win the queen.', sol: ['e7e8n', 'g7f7', 'e8c7'], accept: ['e7e8n'], hint: 'Not every promotion should be a queen.', done: 'Underpromotion with a fork. Candidate moves include ugly ones.' },
      { t: 'move', fen: '6k1/5p1p/5n2/3r2B1/8/2N4P/5PP1/6K1 w - - 0 1', text: 'Compare Nxd5 and Bxf6. Calculate both.', sol: ['g5f6'], hint: 'Nxd5 Nxd5 wins the exchange. Can you win more?', done: 'Bxf6 wins a whole piece: the d5 rook loses its defender.' }
    ]
  },
  'l-outposts': {
    title: 'Outposts and Prophylaxis', minutes: 7, takeaways: ['An outpost is a square no enemy pawn can ever attack.', "Prophylaxis means stopping your opponent's plan before it starts."], goal: 'Find squares enemy pawns can never attack, and stop plans before they start.',
    steps: [
      { t: 'read', fen: 'r4rk1/1p3ppp/p2p4/8/4P3/2N5/PPP2PPP/R4RK1 w - - 0 1', text: 'An outpost is a square protected by your pawn that no enemy pawn can attack. Black has no c- or e-pawn, so d5 is a permanent home for your knight.', marks: ['d5'] },
      { t: 'move', fen: 'r4rk1/1p3ppp/p2p4/8/4P3/2N5/PPP2PPP/R4RK1 w - - 0 1', text: 'Occupy the outpost.', sol: ['c3d5'], hint: 'The e4 pawn supports d5.', done: 'A knight on d5 dominates. Black can only trade it off with a piece.' },
      { t: 'read', fen: 'r4rk1/1p3ppp/p2p4/3N4/4P3/8/PPP2PPP/R4RK1 b - - 0 1', arrows: [['a2', 'a4', 'g'], ['h2', 'h3', 'g']], text: 'Prophylaxis: before your own plan, ask what your opponent wants. Moves like a4 (stopping ...b5) or h3 (stopping ...Bg4) look quiet but take away the opponent\'s best ideas.' }
    ]
  },
  'l-convert': {
    title: 'Converting an Advantage', minutes: 6, takeaways: ['When ahead, trade pieces and remove counterplay.', "Always check forcing moves first, even when you're winning."], goal: 'Win won positions: trade pieces, not pawns, and stay safe.',
    steps: [
      { t: 'read', fen: '3r2k1/5ppp/8/8/8/8/5PPP/1R1R2K1 w - - 0 1', tags: { b1: 'Extra rook' }, text: 'When you are up material: trade pieces (the extra material matters more), keep your pawns, remove all counterplay, and never rush. A slow safe win is still a win.' },
      { t: 'move', fen: '3r2k1/5ppp/8/8/8/8/5PPP/1R1R2K1 w - - 0 1', text: 'You are a rook up. Offer the trade and simplify.', sol: ['d1d8'], anyMate: true, hint: 'Look for something even better than a trade.', done: 'Even better, it was mate. Always check forcing moves first, even when simplifying.' }
    ]
  }
};

var OPENINGS = [
  { id: 'italian', name: 'Italian Game', eco: 'C53', side: 'w', family: 'Open games', level: 'Beginner', idea: 'Fast development, the bishop aims at f7, then a central break with c3 and d4.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5'],
    notes: ['Claim the centre and free the bishop and queen.', 'Black mirrors and stakes a claim.', 'Develop with a threat on e5.', 'Black defends e5 by developing.', 'The Italian bishop eyes f7, the weakest square near Black\'s king.', 'Giuoco Piano: Black copies the idea against f2.', 'Prepares d4 to build a big centre.', 'Black counterattacks e4.', 'The central break. Opens lines while ahead in development.', 'Black must take or lose the bishop\'s outpost.', 'Ideal pawn centre on d4 and e4.', 'A check to break up the centre.', 'Block with development.', 'Trade to relieve the pressure.', 'Recapture toward the centre.', 'Black strikes back at the centre; play is balanced and rich.'] },
  { id: 'ruy', name: 'Ruy Lopez', eco: 'C92', side: 'w', family: 'Open games', level: 'Intermediate', idea: 'Pressure the knight that defends e5, castle quickly, and build slowly with c3 and d4.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3'],
    notes: ['Centre pawn.', 'Symmetrical reply.', 'Attack e5.', 'Defend e5.', 'The Spanish bishop attacks the defender of e5.', 'Morphy Defence: ask the bishop a question.', 'Keep the pin-like pressure.', 'Develop and hit e4.', 'Castle; e4 is indirectly protected.', 'Calm development.', 'Protect e4 and prepare c3/d4.', 'Gain space and kick the bishop.', 'The bishop now aims at f7 from b3.', 'Solidify e5.', 'Prepare d4 and a retreat square for the bishop.', 'Black castles.', 'Stop ...Bg4 before playing d4. Classic prophylaxis.'] },
  { id: 'scotch', name: 'Scotch Game', eco: 'C45', side: 'w', family: 'Open games', level: 'Beginner', idea: 'Open the centre immediately with d4 and play actively with pieces.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7', 'Bc4'],
    notes: ['Centre.', 'Mirror.', 'Attack e5.', 'Defend.', 'Strike the centre at once.', 'Black takes.', 'Recapture with a centralised knight.', 'Hit the knight on d4.', 'Defend with development.', 'Pile on d4.', 'Solid support for d4.', 'Develop, keeping f6 for the queen.', 'Active bishop; White has a comfortable game.'] },
  { id: 'kings-gambit', name: 'King\'s Gambit', eco: 'C39', side: 'w', family: 'Gambits', level: 'Intermediate', gambit: true, idea: 'Sacrifice the f-pawn to open the f-file and build a big centre. Sharp and romantic.',
    moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5', 'Nf6', 'Bc4', 'd5', 'exd5', 'Bd6'],
    notes: ['Centre.', 'Mirror.', 'The gambit: offer a pawn to deflect e5.', 'Accepted.', 'Develop and stop ...Qh4+.', 'Black holds on to the extra pawn.', 'Undermine the pawn chain.', 'Gain time against the knight.', 'Kieseritzky: the knight jumps to a strong central square.', 'Counterattack e4.', 'Aim at f7.', 'Return the pawn to open lines.', 'Take.', 'Develop with pressure on e5 and the long diagonal. Double-edged.'] },
  { id: 'evans', name: 'Evans Gambit', eco: 'C51', side: 'w', family: 'Gambits', level: 'Intermediate', gambit: true, idea: 'Give the b-pawn to gain time for c3 and d4 and attack quickly.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O'],
    notes: ['Centre.', 'Mirror.', 'Attack e5.', 'Defend.', 'Italian bishop.', 'Giuoco Piano.', 'The Evans: offer a pawn to deflect the bishop.', 'Accepted.', 'Gain time and prepare d4.', 'Keep the bishop on the diagonal.', 'Break with tempo; White is far ahead in development.', 'Black grabs more.', 'Castle and open lines. Kasparov and Morphy loved this.'] },
  { id: 'danish', name: 'Danish Gambit', eco: 'C21', side: 'w', family: 'Gambits', level: 'Beginner', gambit: true, idea: 'Offer two pawns for two raking bishops. A great lesson in development and initiative.',
    moves: ['e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2', 'd5', 'Bxd5', 'Nf6', 'Bxf7+', 'Kxf7', 'Qxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Nxd2'],
    notes: ['Centre.', 'Mirror.', 'Centre Game style strike.', 'Black takes.', 'The Danish: another pawn offered.', 'Black takes.', 'Develop and aim at f7.', 'A second pawn taken, with the bishop under fire.', 'Two bishops sweep the board.', 'Black returns a pawn to stop the attack.', 'Take with pressure on f7.', 'Develop.', 'Win the queen with a discovered attack on d8.', 'Forced.', 'White grabs the queen.', 'Check to win the queen back.', 'Block.', 'Trade.', 'Material is level and the position is open.'] },
  { id: 'vienna', name: 'Vienna Gambit', eco: 'C29', side: 'w', family: 'Gambits', level: 'Intermediate', gambit: true, idea: 'Delay Nf3 so the f-pawn can advance. Aggressive and less theory-heavy.',
    moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3', 'Be7', 'd3', 'Nxc3', 'bxc3'],
    notes: ['Centre.', 'Mirror.', 'Vienna knight, keeps f-pawn free.', 'Develop.', 'The gambit.', 'Best reply: counter in the centre.', 'Gain space.', 'Centralise.', 'Develop.', 'Calm.', 'Kick the knight.', 'Trade.', 'Recapture toward the centre; White has space and an open f-file.'] },
  { id: 'qgd', name: 'Queen\'s Gambit Declined', eco: 'D63', side: 'w', family: 'Queen\'s pawn', level: 'Intermediate', idea: 'Pressure d5 with c4, develop harmoniously and aim for a minority attack later.',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3'],
    notes: ['Centre with the d-pawn.', 'Mirror.', 'The gambit: not a true sacrifice, White gets it back.', 'Declined: support d5.', 'Pressure d5.', 'Defend.', 'Pin the defender of d5.', 'Break the pin.', 'Solid.', 'Castle.', 'Develop.', 'Flexible development.', 'Rook to the c-file before it opens.', 'Solidify d5.', 'Natural development.'] },
  { id: 'qga', name: 'Queen\'s Gambit Accepted', eco: 'D27', side: 'w', family: 'Queen\'s pawn', level: 'Beginner', idea: 'Black takes c4; White regains it with development and keeps central control.',
    moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6'],
    notes: ['Centre.', 'Mirror.', 'The gambit.', 'Accepted.', 'Develop; stop ...e5.', 'Develop.', 'Open the bishop toward c4.', 'Solid.', 'Pawn regained.', 'Challenge d4.', 'Castle.', 'Prepare ...b5.'] },
  { id: 'london', name: 'London System', eco: 'D02', side: 'w', family: 'Systems', level: 'Beginner', idea: 'Same setup against almost anything: d4, Bf4, e3, Nf3, c3, Bd3. Low theory, solid.',
    moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'Bd3'],
    notes: ['Centre.', 'Mirror.', 'The London bishop comes out before e3.', 'Develop.', 'Support d4, open the other bishop.', 'Solid.', 'Develop.', 'Challenge d4.', 'Pyramid: c3-d4-e3.', 'Pressure d4.', 'Supports e4 later.', 'Offer a trade.', 'Keep the bishop; if ...Bxg3, hxg3 opens the h-file.', 'Castle.', 'Aim at h7.'] },
  { id: 'english', name: 'English Opening', eco: 'A22', side: 'w', family: 'Flank', level: 'Advanced', idea: 'Control d5 from the side, fianchetto, and play a reversed Sicilian.',
    moves: ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'd5', 'cxd5', 'Nxd5', 'Bg2', 'Nb6', 'Nf3', 'Nc6'],
    notes: ['Control d5 from the flank.', 'Take the centre.', 'More d5 control.', 'Develop.', 'Prepare the fianchetto.', 'Strike the centre.', 'Trade a flank pawn for a centre pawn.', 'Recapture.', 'Bishop on the long diagonal.', 'Retreat from the bishop\'s x-ray.', 'Develop.', 'A reversed Sicilian with an extra tempo for White.'] },
  { id: 'legal-trap', name: 'Légal Trap', eco: 'C41', side: 'w', family: 'Traps', level: 'Beginner', idea: 'Sacrifice the queen when Black greedily breaks a pin. Learn it to spot pin-breaking tactics.',
    moves: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#'],
    notes: ['Centre.', 'Mirror.', 'Attack e5.', 'Philidor-style defence.', 'Aim at f7.', 'Pin the knight to the queen.', 'Develop.', 'A slow move. Black is not watching.', 'The pinned knight moves anyway!', 'Black grabs the queen.', 'Check.', 'Forced.', 'Checkmate with three minor pieces.'] },
  { id: 'fried-liver', name: 'Fried Liver Attack', eco: 'C57', side: 'w', family: 'Traps', level: 'Intermediate', idea: 'Sacrifice a knight on f7 to drag the king into the open.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3'],
    notes: ['Centre.', 'Mirror.', 'Attack e5.', 'Defend.', 'Italian.', 'Two Knights Defence.', 'Attack f7 twice.', 'Block the bishop.', 'Take.', 'Recapturing with the knight allows the sacrifice. Best is ...Na5.', 'The sacrifice.', 'Accept.', 'Check and attack the d5 knight.', 'The king must defend d5.', 'Pile up on the pinned knight. White has a dangerous attack, but Black can fight back with Nb4.'] },
  { id: 'sicilian-najdorf', name: 'Sicilian Najdorf', eco: 'B90', side: 'b', family: 'Sicilian', level: 'Advanced', idea: 'Fight for d4 from the side, keep flexible pawns, and counterattack on the queenside.',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6'],
    notes: ['White takes the centre.', 'The Sicilian: imbalance from move one.', 'Develop.', 'Control e5, prepare ...Nf6.', 'Open the centre.', 'Trade a flank pawn for a centre pawn.', 'Recapture.', 'Hit e4.', 'Defend e4.', 'The Najdorf: control b5, prepare ...e5 or ...b5.', 'English Attack setup.', 'Kick the knight and take d4.', 'Retreat.', 'Develop and control d5.'] },
  { id: 'sicilian-dragon', name: 'Sicilian Dragon', eco: 'B76', side: 'b', family: 'Sicilian', level: 'Advanced', idea: 'The g7 bishop breathes fire down the long diagonal. Opposite-side castling, race to mate.',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6'],
    notes: ['Centre.', 'Sicilian.', 'Develop.', 'Prepare ...Nf6.', 'Open the centre.', 'Take.', 'Recapture.', 'Hit e4.', 'Defend.', 'The Dragon fianchetto.', 'Yugoslav Attack plan.', 'The Dragon bishop.', 'Stop ...Ng4 and support g4.', 'Castle.', 'Prepare O-O-O and Bh6.', 'Develop; the race begins.'] },
  { id: 'french', name: 'French Defence', eco: 'C13', side: 'b', family: 'Semi-open', level: 'Intermediate', idea: 'Solid pawn chain e6-d5, counterattack the white centre with ...c5 and ...f6.',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7', 'Bxe7', 'Qxe7', 'f4', 'O-O'],
    notes: ['Centre.', 'The French: prepare ...d5.', 'Big centre.', 'Challenge e4.', 'Defend.', 'Attack e4 again.', 'Pin.', 'Unpin.', 'Gain space.', 'Retreat; later ...c5.', 'Trade.', 'Recapture.', 'Support e5.', 'Castle. Next ...c5 attacks the base of the chain.'] },
  { id: 'caro', name: 'Caro-Kann Defence', eco: 'B19', side: 'b', family: 'Semi-open', level: 'Beginner', idea: 'Support ...d5 with ...c6, develop the light bishop outside the pawn chain. Very solid.',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7'],
    notes: ['Centre.', 'Prepare ...d5.', 'Take the centre.', 'Challenge.', 'Defend.', 'Trade.', 'Recapture.', 'The good bishop develops outside the chain.', 'Hit the bishop.', 'Retreat.', 'Threaten h5 to trap the bishop.', 'Make a retreat square.', 'Develop.', 'Develop, prepare ...Ngf6.', 'Gain space.', 'Bishop stays on the b1-h7 diagonal.'] },
  { id: 'scandi', name: 'Scandinavian Defence', eco: 'B01', side: 'b', family: 'Semi-open', level: 'Beginner', idea: 'Hit e4 immediately; the queen recaptures and settles on a5.',
    moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bf5', 'Bc4', 'e6'],
    notes: ['Centre.', 'Challenge at once.', 'Take.', 'Recapture with the queen.', 'Gain time on the queen.', 'Queen to a safe, active square.', 'Centre.', 'Develop.', 'Develop.', 'Bishop outside the chain.', 'Develop.', 'Solid setup, like a Caro-Kann with an active queen.'] },
  { id: 'kid', name: 'King\'s Indian Defence', eco: 'E97', side: 'b', family: 'Indian', level: 'Advanced', idea: 'Let White build a centre, then hit it with ...e5 and attack on the kingside.',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7'],
    notes: ['Centre.', 'Flexible.', 'Space.', 'Fianchetto.', 'Develop.', 'The KID bishop.', 'Big centre.', 'Prepare ...e5.', 'Develop.', 'Castle.', 'Develop.', 'Strike the centre.', 'Castle.', 'Pressure d4.', 'Close the centre.', 'Knight reroutes for ...f5 and a kingside attack.'] },
  { id: 'nimzo', name: 'Nimzo-Indian Defence', eco: 'E54', side: 'b', family: 'Indian', level: 'Advanced', idea: 'Pin the c3 knight, fight for e4, and be willing to give the bishop pair for structure.',
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5', 'Nf3', 'c5', 'O-O'],
    notes: ['Centre.', 'Flexible.', 'Space.', 'Open the bishop.', 'Prepare e4.', 'Pin: stop e4.', 'Rubinstein system.', 'Castle.', 'Develop.', 'Central claim.', 'Develop.', 'Hit d4.', 'Castle. A classical battle.'] },
  { id: 'slav', name: 'Slav Defence', eco: 'D17', side: 'b', family: 'Queen\'s pawn', level: 'Intermediate', idea: 'Support d5 with ...c6, keeping the light bishop free.',
    moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4'],
    notes: ['Centre.', 'Mirror.', 'Gambit.', 'Slav: support d5.', 'Develop.', 'Develop.', 'Develop.', 'Take the pawn.', 'Stop ...b5.', 'Bishop out before ...e6.', 'Prepare Bxc4.', 'Solid.', 'Regain.', 'Pin and develop.'] },
  { id: 'englund', name: 'Englund Gambit Trap', eco: 'A40', side: 'b', family: 'Traps', level: 'Beginner', gambit: true, idea: 'A dubious gambit with a famous trap. Know it so it never catches you.',
    moves: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Bc3', 'Bb4', 'Qd2', 'Bxc3', 'Qxc3', 'Qc1#'],
    notes: ['Centre.', 'The Englund Gambit.', 'Take.', 'Attack e5.', 'Defend.', 'Hit e5 again.', 'Defend.', 'Check and hit b2.', 'Natural block, but it loses.', 'Grab the pawn, attack a1.', 'Hit the queen.', 'Pin.', 'Defend.', 'Trade.', 'Recapture.', 'Checkmate. White should have played 4.Qd2 or 9.Nd2 earlier.'] },
  { id: 'anti-scholar', name: 'Beating Scholar\'s Mate', eco: 'C20', side: 'b', family: 'Traps', level: 'Beginner', idea: 'Defend f7 calmly, then gain time by kicking the white queen.',
    moves: ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'g6', 'Qf3', 'Nf6', 'Ne2', 'Bg7'],
    notes: ['Centre.', 'Mirror.', 'Early queen attacks e5 and f7.', 'Defend e5 by developing.', 'Threat: Qxf7 mate.', 'Block the queen and threaten ...Nf6 with tempo.', 'Renews the threat on f7.', 'Block the queen\'s path to f7 while developing.', 'Develop.', 'Black is fully developed and ready to castle.'] }
];

var PUZZLES = [
  { id: 'p01', title: 'Fool\'s Mate', theme: 'mate', r: 200, pre: ['f3', 'e5', 'g4'], sol: ['d8h4'], mate: 1, explain: 'White opened the king\'s diagonal. Qh4 mates.' },
  { id: 'p02', title: 'Scholar\'s Mate', theme: 'mate', r: 300, pre: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6'], sol: ['h5f7'], mate: 1, explain: 'f7 is defended only by the king. Qxf7 is mate.' },
  { id: 'p03', title: 'Free Rook', theme: 'hanging', r: 250, fen: '4k3/8/8/3r4/4P3/8/8/4K3 w - - 0 1', sol: ['e4d5'], explain: 'The rook was undefended and the pawn attacks it.' },
  { id: 'p04', title: 'Queen on the Edge', theme: 'mate', r: 300, fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', sol: ['h1h8'], mate: 1, explain: 'The king guards a7 and b7; the queen checks along the rank.' },
  { id: 'p05', title: 'Back Rank', theme: 'mate', r: 400, fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', sol: ['d1d8'], mate: 1, explain: 'Black\'s own pawns trap the king.' },
  { id: 'p06', title: 'Rook and King', theme: 'mate', r: 400, fen: '4k3/8/4K3/8/8/8/8/7R w - - 0 1', sol: ['h1h8'], mate: 1, explain: 'Opposition plus a rook on the edge.' },
  { id: 'p07', title: 'Knight Fork', theme: 'fork', r: 500, fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', sol: ['b5c7', 'e8d7', 'c7a8'], explain: 'Nc7+ hits the king and the rook.' },
  { id: 'p08', title: 'Royal Fork', theme: 'fork', r: 600, fen: '4k3/8/8/1q6/2N5/8/8/4K3 w - - 0 1', sol: ['c4d6', 'e8e7', 'd6b5'], explain: 'Nd6+ forks king and queen.' },
  { id: 'p09', title: 'Supported Queen', theme: 'mate', r: 500, fen: '5rk1/5ppp/8/7Q/8/3B4/5PPP/6K1 w - - 0 1', sol: ['h5h7'], mate: 1, explain: 'The bishop protects h7.' },
  { id: 'p10', title: 'Black Strikes', theme: 'fork', r: 600, fen: '4k3/8/8/4n3/8/8/1Q6/4K3 b - - 0 1', sol: ['e5d3', 'e1e2', 'd3b2'], explain: 'Nd3+ forks the king and the queen.' },
  { id: 'p11', title: 'Smothered', theme: 'mate', r: 600, fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', sol: ['h6f7'], mate: 1, explain: 'The king is boxed in by its own pieces.' },
  { id: 'p12', title: 'Safe Capture', theme: 'hanging', r: 600, fen: '4k3/8/4p3/3n4/r7/8/8/3QK3 w - - 0 1', sol: ['d1a4'], explain: 'd5 is defended by e6; a4 is not.' },
  { id: 'p13', title: 'Bishop Skewer', theme: 'skewer', r: 700, fen: '6q1/8/8/3k4/8/1P6/8/5B1K w - - 0 1', sol: ['f1c4', 'd5c6', 'c4g8'], explain: 'Bc4+ and the queen behind the king falls.' },
  { id: 'p14', title: 'Arabian', theme: 'mate', r: 700, fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1', sol: ['b7h7'], mate: 1, explain: 'Rook supported by the knight.' },
  { id: 'p15', title: 'Rook Skewer', theme: 'skewer', r: 750, fen: '8/8/8/q3k3/8/8/8/1K5R w - - 0 1', sol: ['h1h5', 'e5d4', 'h5a5'], explain: 'Rh5+ skewers along the 5th rank.' },
  { id: 'p16', title: 'Check and Collect', theme: 'fork', r: 750, fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', sol: ['d5e7', 'g8h8', 'e7c8'], explain: 'Ne7+ attacks g8 and c8 at the same time.' },
  { id: 'p17', title: 'Pin and Win', theme: 'pin', r: 800, fen: '4k3/8/3p4/4n3/8/8/3P4/4RK2 w - - 0 1', sol: ['d2d4'], explain: 'The knight is pinned to the king. Attack it with a pawn.' },
  { id: 'p18', title: 'Queen Fork', theme: 'fork', r: 800, fen: 'r5k1/6pp/8/8/8/8/8/3QK3 w - - 0 1', sol: ['d1d5', 'g8h8', 'd5a8'], explain: 'Qd5+ forks the king and rook.' },
  { id: 'p19', title: 'Pawn Fork', theme: 'fork', r: 850, fen: '4k3/8/2n1b3/8/2PP4/8/8/4K3 w - - 0 1', sol: ['d4d5'], explain: 'd5 forks c6 and e6, backed by c4.' },
  { id: 'p20', title: 'Queen Pin', theme: 'pin', r: 900, fen: '4k3/3q4/8/8/P7/8/8/4KB2 w - - 0 1', sol: ['f1b5'], explain: 'Bb5 pins the queen; a4 protects the bishop.' },
  { id: 'p21', title: 'Discovery', theme: 'discovered', r: 950, fen: '7q/2k5/8/8/3N4/8/1B6/6K1 w - - 0 1', sol: ['d4b5', 'c7b6', 'b2h8'], accept: ['d4b5', 'd4e6'], explain: 'A knight check unmasks the bishop on h8.' },
  { id: 'p22', title: 'Légal\'s Mate', theme: 'mate', r: 950, pre: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1', 'Bxf7+', 'Ke7'], sol: ['c3d5'], mate: 1, explain: 'Three minor pieces deliver mate.' },
  { id: 'p23', title: 'Double Check', theme: 'mate', r: 1000, fen: '3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1', sol: ['e4d6'], mate: 1, explain: 'Knight and rook check together.' },
  { id: 'p24', title: 'Remove the Guard', theme: 'defender', r: 1100, fen: '6k1/5p1p/5n2/3r2B1/8/2N4P/5PP1/6K1 w - - 0 1', sol: ['g5f6'], explain: 'The f6 knight defends d5. Remove it.' },
  { id: 'p25', title: 'Englund Finish', theme: 'mate', r: 1100, pre: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Bc3', 'Bb4', 'Qd2', 'Bxc3', 'Qxc3'], sol: ['b2c1'], mate: 1, explain: 'Qc1 is mate; the king has no squares.' },
  { id: 'p26', title: 'Back-Rank Sacrifice', theme: 'mate', r: 1200, fen: 'r3r1k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', sol: ['e2e8', 'a8e8', 'e1e8'], mate: 2, explain: 'Qxe8+ deflects the a8 rook, Rxe8 mates.' },
  { id: 'p27', title: 'Underpromotion', theme: 'promotion', r: 1250, fen: '8/2q1P1k1/8/8/8/8/8/K7 w - - 0 1', sol: ['e7e8n', 'g7f7', 'e8c7'], accept: ['e7e8n'], explain: 'e8=N+ forks king and queen.' },
  { id: 'p28', title: 'Breakthrough', theme: 'endgame', r: 1300, fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1', sol: ['b5b6', 'a7b6', 'c5c6', 'b7c6', 'a5a6'], explain: 'b6! then c6 creates an unstoppable passed pawn.' },
  { id: 'p29', title: 'Opposition', theme: 'endgame', r: 1300, fen: '8/8/4k3/8/3K4/4P3/8/8 w - - 0 1', sol: ['d4e4'], explain: 'Ke4 takes the opposition.' },
  { id: 'p30', title: 'Philidor\'s Legacy', theme: 'mate', r: 1400, fen: 'r6k/6pp/7N/3Q4/8/8/8/6K1 w - - 0 1', sol: ['d5g8', 'a8g8', 'h6f7'], mate: 2, explain: 'Qg8+ Rxg8 Nf7 smothered mate.' }
];

var COACH_LEVELS = [
  { id: 'novice', name: 'Novice', elo: 600, depth: 2, time: 400, margin: 130, blurb: 'Plays like a beginner on purpose: misses threats and sometimes leaves a piece loose for you to win.' },
  { id: 'club', name: 'Club', elo: 1000, depth: 3, time: 600, margin: 45, blurb: 'Slips now and then on purpose, but punishes hanging pieces.' },
  { id: 'strong', name: 'Strong', elo: 1400, depth: 5, time: 900, margin: 18, blurb: 'Sees short combinations.' },
  { id: 'expert', name: 'Expert', elo: 1800, depth: 8, time: 1400, margin: 0, blurb: 'Calculates deeply and rarely slips.' },
  { id: 'master', name: 'Master', elo: 2200, depth: 40, time: 2500, margin: 0, blurb: 'Full strength. Your final boss.' }
];


// ---- Extra lessons ----
LESSONS['l-traps'] = {
  title: 'Early Queen Traps', minutes: 5, goal: 'Spot the early queen attack on f7 and shut it down.',
  takeaways: ['f7 and f2 are the weakest squares at the start, only the king defends them.', 'When the queen and bishop both aim at f7, defend it first, then chase the queen with your pieces.'],
  steps: [
    { t: 'read', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', arrows: [['h5', 'f7', 'r'], ['c4', 'f7', 'r']], tags: { f7: 'Weak' }, text: "This is the Scholar's Mate setup. White's queen and bishop both hit f7, and only the king guards it. Queen takes f7 would be checkmate." },
    { t: 'move', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', text: 'Black to move. Stop the mate on f7 and keep the e5 pawn safe.', sol: ['d8e7'], accept: ['g7g6'], hint: 'Your queen can step forward and guard both f7 and e5.', done: 'Solid. f7 and e5 are covered, and soon your knight comes to f6 with tempo.' },
    { t: 'move', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', text: 'Now see what happens if Black ignores it. Black just played knight f6, attacking the queen. White to move: punish it.', sol: ['h5f7'], anyMate: true, hint: 'Is f7 defended by anything except the king?', done: "Checkmate. That is why you never let this happen to you." },
    { t: 'move', fen: 'rnbqkbnr/ppppp2p/5p2/6p1/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', text: "Black opened the king's diagonal with f6 and g5. White to move: find the fastest mate in chess.", sol: ['d1h5'], anyMate: true, hint: 'The e8 to h5 diagonal is wide open.', done: "Fool's Mate. Never weaken the pawns in front of your king early." }
  ]
};
LESSONS['l-smothered'] = {
  title: 'Smothered Mate', minutes: 5, goal: 'Mate a king that is boxed in by its own pieces.',
  takeaways: ['A king surrounded by its own pieces can be mated by a single knight.', "Philidor's idea: sacrifice the queen on g8 to force the rook to block the last square."],
  steps: [
    { t: 'read', fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', zones: [[['g8', 'g7', 'h7'], 'C']], tags: { h8: 'Boxed in' }, text: "Look at Black's king. The rook and pawns fill every square around it. A knight check cannot be blocked, so the king has nowhere to go." },
    { t: 'move', fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', text: 'Deliver the smothered mate.', sol: ['h6f7'], anyMate: true, hint: 'Which knight jump checks the king on h8?', done: 'Smothered! The king is buried by its own army.' },
    { t: 'move', fen: '4r2k/6pp/7N/8/2Q5/8/6PP/6K1 w - - 0 1', text: "Philidor's Legacy. Here g8 is still open. Sacrifice your queen to make the rook fill it, then mate.", sol: ['c4g8', 'e8g8', 'h6f7'], anyMate: true, hint: 'Check from g8. The king cannot take because the knight guards g8.', done: 'Queen sacrifice, smothered mate. One of the most beautiful patterns in chess.' }
  ]
};
LESSONS['l-rookmate'] = {
  title: 'Mate with King and Rook', minutes: 5, goal: 'Win the most common endgame: king and rook against a lone king.',
  takeaways: ['Use the rook to cut the king off, one line at a time.', 'Bring your king opposite the enemy king, then check along the edge.'],
  steps: [
    { t: 'read', fen: '8/8/3k4/8/8/8/8/R3K3 w - - 0 1', dots: 'a1', text: 'The rook builds a fence. Each rook move cuts the enemy king off from part of the board. Your king walks up to help, and the box gets smaller until the king is on the edge.' },
    { t: 'move', fen: '4k3/R7/4K3/8/8/8/8/8 w - - 0 1', text: 'The kings stand face to face and your rook holds the seventh rank. Finish it.', sol: ['a7a8'], anyMate: true, hint: 'Check along the back rank. Your king covers d7, e7 and f7.', done: 'Checkmate on the edge. Kings opposite, rook checks.' },
    { t: 'move', fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', text: 'Same idea in the corner.', sol: ['h1h8'], anyMate: true, hint: 'Your king already covers a7 and b7.', done: 'The corner version. You will win this endgame every time now.' }
  ]
};
(function () {
  function addAfter(stageIdx, afterId, id) { var L = STAGES[stageIdx].lessons, i = L.indexOf(afterId); L.splice(i < 0 ? L.length : i + 1, 0, id); }
  addAfter(1, 'l-principles', 'l-traps');
  addAfter(2, 'l-patterns', 'l-smothered');
  addAfter(3, null, 'l-rookmate');
  var e = STAGES[3].lessons; e.splice(e.indexOf('l-rookmate'), 1); e.unshift('l-rookmate');
})();
if (typeof module !== 'undefined') module.exports = { STAGES: STAGES, LESSONS: LESSONS, OPENINGS: OPENINGS, PUZZLES: PUZZLES, COACH_LEVELS: COACH_LEVELS };
