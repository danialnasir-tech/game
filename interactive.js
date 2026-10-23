// Every explanation step ends with something to do: a question (ask) or a tap on the board (tap).
// ask: { q, options, a (index of the right one), why, wrong: [reason per option] }   tap: { q, targets, need, why, wrong }
// targets accept squares and shortcuts: @dark, @light, @file:e, @rank:4, @centre
var INTERACT = {
  'l-board': {
    0: { tap: { q: 'Tap any dark square.', targets: ['@dark'], why: 'Light and dark squares take turns, like a chequerboard. There are 32 of each.', wrong: 'That one is light. Try a darker square.' } },
    1: { tap: { q: 'Tap two different squares on the e-file.', targets: ['@file:e'], need: 2, why: 'Every square in that column belongs to the e-file: e1 at the bottom, up to e8.', wrong: 'Files go up and down. Stay in the blue column.' } },
    2: { tap: { q: 'Tap two different squares on rank 4.', targets: ['@rank:4'], need: 2, why: 'A rank runs from left to right. Every square in the pink row is on rank 4.', wrong: 'Ranks go across. Stay in the pink row.' } },
    3: { tap: { q: 'Now find the square where the c-file crosses rank 6. Tap it.', targets: ['c6'], why: 'c6: go along to the c-file, then up to rank 6. Letter first, then number.', wrong: 'Go along to the letter c first, then count up to 6.' } },
    4: { ask: { q: 'Which corner is h1?', options: ['Bottom left', 'Bottom right', 'Top right'], a: 1, why: 'h is the last file on the right, and rank 1 is at the bottom.', wrong: ['That is a1: file a, rank 1.', '', 'That is h8: the top of the h-file.'] } },
    5: { tap: { q: 'Tap one of the four centre squares.', targets: ['@centre'], why: 'd4, e4, d5 and e5. Pieces in the centre reach the most squares.', wrong: 'The centre is the four squares in the very middle of the board.' } }
  },
  'l-pieces': {
    0: { ask: { q: 'How many pieces does each side start with?', options: ['8', '16', '32'], a: 1, why: '16 each: 8 pawns plus 8 bigger pieces. 32 on the whole board.', wrong: ['8 is just the pawns. Count the back row too.', '', '32 is both sides together.'] } },
    7: { ask: { q: 'What does the move Nf3 mean?', options: ['A knight moves to f3', 'A pawn moves to f3', 'The king moves to f3'], a: 0, why: 'N is the knight, f3 is the square it lands on.', wrong: ['', 'Pawn moves have no letter, so Nf3 is not a pawn.', 'The king\'s letter is K.'] } },
    8: { ask: { q: 'What does the move d4 mean?', options: ['The king goes to d4', 'A pawn goes to d4', 'Nothing: a letter is missing'], a: 1, why: 'No piece letter means a pawn. d4 = a pawn moves to d4.', wrong: ['The king would be written Kd4.', '', 'Pawns simply have no letter. It is a real move.'] } }
  },
  'l-rook': { 1: { tap: { q: 'Tap the black pawn this rook can capture.', targets: ['d5'], why: 'The rook takes on d5 and stops there. It can never jump past a piece.', wrong: 'Follow the straight lines from the rook to the first black piece.' } } },
  'l-bishop-queen': { 1: { ask: { q: 'This bishop started on a dark square. Can it ever reach a light square?', options: ['Yes, after a few moves', 'No, never'], a: 1, why: 'Diagonal steps always land on the same colour. A dark-squared bishop stays on dark squares all game.', wrong: ['Watch the demo again: every square it visits is dark.', ''] } } },
  'l-king-pawn': {
    2: { tap: { q: 'Tap both squares this pawn can move to.', targets: ['e3', 'e4'], need: 2, why: 'e3 or e4: two squares on its very first move, one square after that.', wrong: 'Pawns move straight forward only.' } },
    3: { tap: { q: 'Tap a black pawn your pawn can capture.', targets: ['d4', 'f4'], why: 'Pawns capture one square diagonally forward: d4 or f4.', wrong: 'Pawns capture diagonally, one square forward.' } },
    5: { ask: { q: 'What do most players choose when a pawn promotes?', options: ['A knight', 'A queen', 'A rook'], a: 1, why: 'The queen is the strongest piece, so she is almost always the best choice.', wrong: ['A knight is a rare trick, used only for a special fork or check.', '', 'A rook is weaker than a queen. Only pick it to avoid stalemate.'] } }
  },
  'l-check': {
    0: { ask: { q: 'Black is in check. Which of these is NOT a way out?', options: ['Move the king', 'Block the check', 'Ignore it and push a pawn'], a: 2, why: 'You must deal with a check at once: move the king, block, or capture the attacker.', wrong: ['Moving the king out of the line is allowed.', 'Blocking with a piece is allowed.', ''] } },
    1: { ask: { q: 'Why can\'t the black king escape to f7?', options: ['The rook covers it', 'Its own pawn is there', 'Kings can\'t go forward'], a: 1, why: 'The king is trapped by its own pawns. That is why this pattern is called a back-rank mate.', wrong: ['The rook only covers the 8th rank.', '', 'Kings can move one square in any direction.'] } },
    3: { ask: { q: 'Stalemate means…', options: ['White wins', 'The game is a draw', 'Black wins'], a: 1, why: 'No legal move but no check: the game ends as a draw, even if one side is far ahead.', wrong: ['Not a win: stalemate is a draw.', '', 'Not a win: stalemate is a draw.'] } }
  },
  'l-special': {
    0: { ask: { q: 'When is castling NOT allowed?', options: ['King not moved yet', 'King is in check', 'Squares between empty'], a: 1, why: 'You cannot castle out of check, through check, or after the king or that rook has moved.', wrong: ['That is exactly when you CAN castle.', '', 'Empty squares are a must for castling.'] } },
    2: { ask: { q: 'Which square did Black\'s pawn skip over?', options: ['d6', 'e6', 'd4'], a: 0, why: 'It jumped from d7 to d5, skipping d6. That is where your pawn can capture it.', wrong: ['', 'e6 is in front of your own pawn.', 'd4 is beyond where it landed.'] } },
    3: { tap: { q: 'Tap the square your pawn lands on when it captures en passant.', targets: ['d6'], why: 'd6: your pawn takes as if the black pawn had moved only one square.', wrong: 'Your pawn moves diagonally forward, onto the square the black pawn skipped.' } }
  },
  'l-qmate': { 0: { ask: { q: 'What is the big danger in this endgame?', options: ['Losing the queen', 'Stalemate', 'Running out of time'], a: 1, why: 'With so much power it is easy to take away every square. Always leave the king one move until you can mate.', wrong: ['Losing the queen is rare. The real trap is stalemate.', '', 'You have plenty. The trap is stalemate.'] } } },
  'l-firstmoves': {
    0: { tap: { q: 'Tap a centre square you would like a pawn on.', targets: ['@centre'], why: 'A pawn on e4 or d4 grabs the centre and opens lines for your bishops and queen.', wrong: 'The centre is the four middle squares: d4, e4, d5, e5.' } },
    5: { ask: { q: 'Which is a good early move?', options: ['Bringing the queen out at once', 'Developing a knight toward the centre', 'Pushing an edge pawn'], a: 1, why: 'Knights and bishops first, aimed at the centre. That is development.', wrong: ['An early queen gets chased and you lose time.', '', 'Edge pawns do not help your pieces come out.'] } }
  },
  'l-values': { 0: { ask: { q: 'You give a knight and get a rook. Who wins the trade?', options: ['You do: 5 points for 3', 'Your opponent', 'It is even'], a: 0, why: 'A rook is worth 5 and a knight 3, so you are 2 points up. Players call it winning the exchange.', wrong: ['', 'Count it: you got 5 and gave 3.', 'A rook is worth more than a knight.'] } } },
  'l-captures': { 0: { tap: { q: 'Tap the black piece that defends the knight.', targets: ['e6'], why: 'The pawn on e6 guards d5. Whatever takes the knight gets taken back by it.', wrong: 'Find the black piece that could recapture on d5.' } } },
  'l-threats': {
    0: { ask: { q: 'What should you ask after every move your opponent makes?', options: ['What does it attack?', 'Was it pretty?', 'How long did they think?'], a: 0, why: 'Their last move almost always attacks something. Find it before you move.', wrong: ['', 'Pretty or not, it may attack something.', 'Time is not the point: the threat is.'] } },
    10: { ask: { q: 'Which comes first in the habit?', options: ['Making your own plan', 'Checking what their last move attacks'], a: 1, why: 'Their threats first, then your plan. That order stops most blunders.', wrong: ['A plan is useless if you lose a piece first.', ''] } }
  },
  'l-cct': { 0: { tap: { q: 'Black threatens checkmate. Tap the square where it would happen.', targets: ['e1'], why: 'Re1 is checkmate: your king is stuck behind its own pawns.', wrong: 'Look at the black rook. Where can it give check on your back rank?' } } },
  'l-principles': {
    0: { ask: { q: 'When should you usually castle?', options: ['Within the first 10 moves', 'After move 30', 'Never, the king should attack'], a: 0, why: 'Early castling keeps your king safe and brings a rook into the game.', wrong: ['', 'By then the centre is open and your king is in danger.', 'In the opening the king hides. He attacks in the endgame.'] } },
    3: { ask: { q: 'Why does an early queen lose time?', options: ['Enemy pieces develop by attacking her', 'Queens may only move twice', 'It is against the rules'], a: 0, why: 'Every attack on her develops one of their pieces, while you waste moves running away.', wrong: ['', 'Queens can move as often as you like.', 'It is legal, just usually bad.'] } }
  },
  'l-traps': { 0: { tap: { q: 'Tap the square both white pieces are aiming at.', targets: ['f7'], why: 'f7, guarded only by the king. Qxf7 would be checkmate.', wrong: 'Follow the queen and the bishop: where do their lines meet?' } } },
  'l-forks': { 0: { tap: { q: 'Tap the square where the knight attacks the king and the rook together.', targets: ['c7'], why: 'From c7 the knight checks e8 and hits a8. Black saves the king and loses the rook.', wrong: 'Knights jump in an L. Which landing square hits both e8 and a8?' } } },
  'l-pins': { 0: { tap: { q: 'Tap the pinned black piece.', targets: ['e5'], why: 'The knight on e5 cannot move: the rook would then attack the king behind it.', wrong: 'Look along the rook\'s line toward the black king.' } } },
  'l-skewers': { 0: { tap: { q: 'After the king steps aside, which black piece is lost? Tap it.', targets: ['d8'], why: 'The queen on d8 was hiding behind the king. Once he moves, the rook takes her.', wrong: 'Look behind the king, further along the rook\'s line.' } } },
  'l-backrank': { 0: { tap: { q: 'Tap the square where your rook gives checkmate.', targets: ['d8'], why: 'Rd8 is mate: the king is boxed in by its own pawns.', wrong: 'Your rook goes straight up the d-file to the back rank.' } } },
  'l-loose': { 0: { tap: { q: 'Tap the loose black piece the knight wins.', targets: ['a8'], why: 'The rook on a8 has no defender. After the fork it falls.', wrong: 'Which black piece does nothing protect?' } } },
  'l-twomove': { 0: { tap: { q: 'Tap the square where the knight checks the king and attacks the queen.', targets: ['d6'], why: 'Nd6+ forces the king to move, then the knight takes the queen on b5.', wrong: 'Find a knight jump that checks the king on e8.' } } },
  'l-kingsafety': { 0: { tap: { q: 'Tap a pawn in Black\'s king shield.', targets: ['f7', 'g7', 'h7'], why: 'f7, g7 and h7 cover the castled king. Keep yours unmoved until there is a reason.', wrong: 'The shield is the row of pawns right in front of the castled king.' } } },
  'l-discovered': { 0: { tap: { q: 'Tap the white piece that blocks the bishop\'s diagonal.', targets: ['d4'], why: 'The knight on d4. When it jumps away with a threat, the bishop hits h8 too.', wrong: 'Follow the bishop\'s diagonal from b2 toward h8.' } } },
  'l-defender': { 0: { tap: { q: 'Tap the piece that defends the black rook.', targets: ['f6'], why: 'The knight on f6 guards d5. Take it, and the rook hangs.', wrong: 'Which black piece could recapture on d5?' } } },
  'l-patterns': { 0: { tap: { q: 'Tap the square where the knight gives smothered mate.', targets: ['f7'], why: 'Nf7 is mate: the king is boxed in and a knight check cannot be blocked.', wrong: 'Find a knight jump that checks the king on h8.' } } },
  'l-smothered': { 0: { ask: { q: 'Why can a knight check never be blocked?', options: ['It jumps: nothing in between', 'Knights are invisible', 'The king is too far'], a: 0, why: 'A knight leaps straight to its square, so nothing can step in the way.', wrong: ['', 'Ha! No, it simply jumps.', 'Distance has nothing to do with it.'] } } },
  'l-candidates': { 0: { ask: { q: 'What do strong players do before they choose a move?', options: ['Play the first good move', 'Compare 2 or 3 candidates', 'Move fast'], a: 1, why: 'Comparing candidates finds the better move, and catches the trap in the first one.', wrong: ['That is how most club games are lost.', '', 'Speed comes from patterns, not from skipping the check.'] } } },
  'l-defence': { 0: { ask: { q: 'Above 1200, games are usually lost to…', options: ['One-move blunders', 'Ideas 2 or 3 moves deep', 'Running out of moves'], a: 1, why: 'Simple blunders are rarer. The ideas that win are a few moves deep, so look from their side.', wrong: ['That decides games at lower levels.', '', 'That is stalemate, and it is rare.'] } } },
  'l-rookmate': { 0: { ask: { q: 'What does the rook do first?', options: ['Checks the king again and again', 'Builds a fence that cuts the king off', 'Hunts for pawns'], a: 1, why: 'Random checks just chase the king around. A fence shrinks its box step by step.', wrong: ['Endless checks rarely help. Build the fence.', '', 'There are no pawns to win: mate is the goal.'] } } },
  'l-kp': { 0: { ask: { q: 'If the defending king can step inside the square of the pawn, it…', options: ['Catches the pawn', 'Must resign', 'Becomes a queen'], a: 0, why: 'Inside the square, the king reaches the pawn before it can promote.', wrong: ['', 'No, the king catches the pawn.', 'Kings never promote.'] } } },
  'l-endgame-play': { 0: { ask: { q: 'In the endgame, the king should be…', options: ['Hidden in a corner', 'Active, in the centre', 'On the back rank'], a: 1, why: 'With few pieces left, the king is a strong fighter. Bring him forward.', wrong: ['That is for the middlegame. In the endgame he fights.', '', 'A passive king loses endgames.'] } } },
  'l-rook-end': {
    0: { ask: { q: 'In the Lucena, your rook goes to which rank to build the bridge?', options: ['The 1st', 'The 4th', 'The 8th'], a: 1, why: 'On the 4th rank the rook can step in front of your king and block the checks.', wrong: ['Too far away to block the checks.', '', 'The 8th rank is where your pawn wants to go.'] } },
    2: { ask: { q: 'In the Philidor defence, where does the rook wait?', options: ['On its third rank', 'Behind its king', 'Next to the pawn'], a: 0, why: 'On the third rank it stops the enemy king coming forward. When the pawn advances, it swings back to check from behind.', wrong: ['', 'Behind the king it is passive and the attacker walks in.', 'Too close: it gets attacked.'] } }
  },
  'l-structure': {
    0: { tap: { q: 'Tap the isolated pawn.', targets: ['d4'], why: 'The d4 pawn has no pawns on the c- or e-files to protect it.', wrong: 'Find the pawn with no friendly pawns on the files next to it.' } },
    1: { ask: { q: 'A passed pawn should usually be…', options: ['Pushed', 'Left at home', 'Traded off at once'], a: 0, why: 'Passed pawns must be pushed: every step forward makes it more dangerous.', wrong: ['', 'A sleeping passed pawn wastes its power.', 'It is your trump card: keep it.'] } },
    2: { tap: { q: 'Tap Black\'s bad bishop.', targets: ['c8'], why: 'The c8 bishop is blocked by its own pawns on light squares.', wrong: 'Find the bishop trapped behind its own pawns.' } }
  },
  'l-calc': { 0: { ask: { q: 'Which moves do you calculate first?', options: ['Quiet moves', 'Checks, captures, threats', 'Pawn moves'], a: 1, why: 'Forcing moves limit the replies, so you can see the end of the line.', wrong: ['Quiet moves leave the opponent too many answers to calculate.', '', 'Pawn moves are usually quiet.'] } } },
  'l-deep': { 0: { ask: { q: 'At the end of every line, ask…', options: ['What can my opponent do here?', 'How many pieces do I have?', 'Is it my turn?'], a: 0, why: 'Checking their best reply is what separates deep calculation from wishful thinking.', wrong: ['', 'Material is not the whole story.', 'Always know whose turn it is, but the real question is their reply.'] } } },
  'l-pro-threats': { 0: { ask: { q: 'Where do you look for the opponent\'s best idea?', options: ['From their side of the board', 'Only at my own pieces'], a: 0, why: 'Sit in their chair for a few seconds every move. That is how you see combinations coming.', wrong: ['', 'Your pieces do not show you their plan.'] } } },
  'l-outposts': {
    0: { tap: { q: 'Tap the outpost square.', targets: ['d5'], why: 'd5 is guarded by your e4 pawn and no black pawn can ever attack it.', wrong: 'Find a square your pawn protects that no black pawn can attack.' } },
    2: { ask: { q: 'Prophylaxis means…', options: ['Stopping their plan early', 'Attacking at once', 'Trading queens'], a: 0, why: 'Ask what they want, then take it away with one quiet move.', wrong: ['', 'Attacks come after you have stopped their ideas.', 'Trading is a different idea.'] } }
  },
  'l-convert': { 0: { ask: { q: 'You are a rook up. What should you trade?', options: ['Pieces', 'Pawns', 'Nothing at all'], a: 0, why: 'Trading pieces makes your extra rook count for more. Keep your pawns: you need them to win.', wrong: ['', 'Without pawns, winning gets much harder.', 'Trades help the side that is ahead.'] } } }
};
(function () {
  if (typeof LESSONS === 'undefined') return;
  Object.keys(INTERACT).forEach(function (id) { var L = LESSONS[id]; if (!L) return; Object.keys(INTERACT[id]).forEach(function (i) { var st = L.steps[+i]; if (st && st.t === 'read') Object.assign(st, INTERACT[id][i]); }); });
})();
if (typeof module !== 'undefined') module.exports = INTERACT;
