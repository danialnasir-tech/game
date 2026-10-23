#!/usr/bin/env node
// Chess Ascent voice generator. Needs Node.js 18 or newer, nothing else.
// Run:  node generate-voices.js        (or double-click Run-Windows.bat)
// Clips that already exist are skipped, so running it again never pays twice.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { execSync } = require('child_process');

const VOICE_ID = 'B52raBK48m23qWYbwchQ';
const VOICE_NAME = 'your chosen voice (B52raBK48m23qWYbwchQ)';
// Always the same voice and model, so every clip sounds the same. No other voice or model is ever used.
const MODEL_ID = 'eleven_v4';
const FORMAT = 'mp3_44100_64';
const LINES = [{"id":"P-s038","text":"Your pawn can take the rook on c4, and nothing can take it back. A free rook!","group":"puzzles"},
  {"id":"P-s039","text":"Your pawn can take the knight on d7, and nothing can take it back. A free knight!","group":"puzzles"},
  {"id":"P-s040","text":"Your pawn can take the queen on g3, and nothing can take it back. A free queen!","group":"puzzles"},
  {"id":"P-s041","text":"Your pawn can take the knight on b6, and nothing can take it back. A free knight!","group":"puzzles"},
  {"id":"P-s042","text":"Your pawn can take the rook on d7, and nothing can take it back. A free rook!","group":"puzzles"},
  {"id":"P-s043","text":"Your pawn can take the bishop on b5, and nothing can take it back. A free bishop!","group":"puzzles"},
  {"id":"P-s044","text":"Your pawn can take the rook on h7, and nothing can take it back. A free rook!","group":"puzzles"},
  {"id":"P-s046","text":"Your pawn can take the bishop on g4, and nothing can take it back. A free bishop!","group":"puzzles"},
  {"id":"P-s047","text":"Your king can take the bishop on b5, and nothing can take it back. A free bishop!","group":"puzzles"},
  {"id":"P-s048","text":"Your king can take the bishop on g5, and nothing can take it back. A free bishop!","group":"puzzles"},
  {"id":"P-s049","text":"Your king can take the knight on c7, and nothing can take it back. A free knight!","group":"puzzles"},
  {"id":"P-s050","text":"Your king can take the knight on f7, and nothing can take it back. A free knight!","group":"puzzles"},
  {"id":"P-s051","text":"Your king can take the bishop on d6, and nothing can take it back. A free bishop!","group":"puzzles"},
  {"id":"P-s052","text":"Your king can take the knight on e7, and nothing can take it back. A free knight!","group":"puzzles"},
  {"id":"P-s053","text":"Rh2# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s054","text":"Rh3# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s055","text":"Rc8# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s056","text":"Ra1# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s057","text":"Rf1# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s058","text":"Rg8# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s060","text":"Ra6# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s061","text":"Rd1# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s062","text":"Ra3# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s063","text":"Qb8# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s064","text":"Qe8# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s065","text":"Qh3# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s066","text":"Qg7# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s067","text":"Qb7# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s068","text":"Qh6# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s069","text":"Qh8# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s070","text":"Qa6# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s071","text":"Qf1# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-s072","text":"Qc1# is checkmate: the king is attacked and every escape square is covered.","group":"puzzles"},
  {"id":"P-g001","text":"Ng3+ attacks two pieces at once, and one of them is the king. Only one can be saved, so you win the other.","group":"puzzles"},
  {"id":"P-g003","text":"Ne6+ attacks two pieces at once, and one of them is the king. Only one can be saved, so you win the other.","group":"puzzles"},
  {"id":"P-g007","text":"Ne2+ attacks two pieces at once, and one of them is the king. Only one can be saved, so you win the other.","group":"puzzles"},
  {"id":"P-g008","text":"Ne8+ attacks two pieces at once, and one of them is the king. Only one can be saved, so you win the other.","group":"puzzles"},
  {"id":"P-g011","text":"Nd4+ attacks two pieces at once, and one of them is the king. Only one can be saved, so you win the other.","group":"puzzles"},
  {"id":"P-g013","text":"Nd6+ attacks two pieces at once, and one of them is the king. Only one can be saved, so you win the other.","group":"puzzles"},
  {"id":"P-g016","text":"Qg6+ attacks two targets at once. Black can only save one.","group":"puzzles"},
  {"id":"P-g017","text":"Qe6+ attacks two targets at once. Black can only save one.","group":"puzzles"},
  {"id":"P-g018","text":"Qf3+ attacks two targets at once. Black can only save one.","group":"puzzles"},
  {"id":"P-g019","text":"Qe2+ attacks two targets at once. Black can only save one.","group":"puzzles"},
  {"id":"P-g020","text":"Qg3+ attacks two targets at once. Black can only save one.","group":"puzzles"},
  {"id":"P-g029","text":"Your move pins a black piece on d1: it cannot move away without exposing the more valuable piece behind it on a1. So you win material.","group":"puzzles"},
  {"id":"P-g033","text":"Your move pins a black piece on h5: it cannot move away without exposing the more valuable piece behind it on h8. So you win material.","group":"puzzles"},
  {"id":"P-g035","text":"Your move pins a black piece on d1: it cannot move away without exposing the more valuable piece behind it on g1. So you win material.","group":"puzzles"},
  {"id":"P-g036","text":"Your move pins a black piece on e4: it cannot move away without exposing the more valuable piece behind it on e1. So you win material.","group":"puzzles"},
  {"id":"P-g039","text":"Your move pins a black piece on c1: it cannot move away without exposing the more valuable piece behind it on f1. So you win material.","group":"puzzles"},
  {"id":"P-g044","text":"Check! The king must step off the line, and then you capture the piece behind it on h7.","group":"puzzles"},
  {"id":"P-g045","text":"Check! The king must step off the line, and then you capture the piece behind it on e1.","group":"puzzles"},
  {"id":"P-g046","text":"Check! The king must step off the line, and then you capture the piece behind it on h5.","group":"puzzles"},
  {"id":"P-g047","text":"Check! The king must step off the line, and then you capture the piece behind it on h1.","group":"puzzles"},
  {"id":"P-g048","text":"Check! The king must step off the line, and then you capture the piece behind it on g1.","group":"puzzles"},
  {"id":"P-g049","text":"Check! The king must step off the line, and then you capture the piece behind it on g7.","group":"puzzles"},
  {"id":"P-g051","text":"Check! The king must step off the line, and then you capture the piece behind it on e2.","group":"puzzles"},
  {"id":"P-g052","text":"Check! The king must step off the line, and then you capture the piece behind it on c8.","group":"puzzles"},
  {"id":"P-g054","text":"Your piece steps off the line and uncovers an attack by the piece behind it, with check. Two threats in one move: Black cannot answer both.","group":"puzzles"},
  {"id":"P-g064","text":"Your piece steps off the line and uncovers an attack by the piece behind it. Two threats in one move: Black cannot answer both.","group":"puzzles"},
  {"id":"P-g071","text":"Qb8## The king is stuck behind its own pawns, so a check on the back rank is checkmate.","group":"puzzles"},
  {"id":"P-g072","text":"Qc8## The king is stuck behind its own pawns, so a check on the back rank is checkmate.","group":"puzzles"},
  {"id":"P-g073","text":"Rh8## The king is stuck behind its own pawns, so a check on the back rank is checkmate.","group":"puzzles"},
  {"id":"P-g075","text":"Rd8## The king is stuck behind its own pawns, so a check on the back rank is checkmate.","group":"puzzles"},
  {"id":"P-g076","text":"Ra8## The king is stuck behind its own pawns, so a check on the back rank is checkmate.","group":"puzzles"},
  {"id":"P-g084","text":"The pawn reaches the last rank and becomes a queen, capturing on the way, and nothing can take her.","group":"puzzles"},
  {"id":"T-1","text":"This is your board. To make a move, tap a piece, then tap the square you want. The switch at the top changes between a flat board and a 3D one.","group":"tour"},
  {"id":"T-10","text":"That's all you need. Every new area explains itself the first time you open it. Let's start with your first lesson. I'll be right here with you.","group":"tour"},
  {"id":"V-guided_intro-0","text":"Your first full game! You are White. On every move I show you two good ideas with arrows. Pick one, or play your own move, and I explain every move I make too.","group":"more"},
  {"id":"V-clock_10-0","text":"Clock game. You each have 10 minutes. Your clock runs only on your turn. If it reaches zero you lose, even with more pieces. Play the easy moves fast and save time for the tricky ones.","group":"more"},
  {"id":"V-clock_5-0","text":"Clock game. You each have 5 minutes, and you get 3 extra seconds after every move. Your clock runs only on your turn. If it reaches zero you lose, even with more pieces. Play the easy moves fast and save time for the tricky ones.","group":"more"},
  {"id":"V-clock_3-0","text":"Clock game. You each have 3 minutes, and you get 2 extra seconds after every move. Your clock runs only on your turn. If it reaches zero you lose, even with more pieces. Play the easy moves fast and save time for the tricky ones.","group":"more"},
  {"id":"V-clock_low-0","text":"Under 30 seconds! Play safe, simple moves quickly. Losing on time is still losing.","group":"more"},
  {"id":"V-clock_flag_me-0","text":"Your time ran out. On the clock, zero loses the game.","group":"more"},
  {"id":"V-clock_flag_leo-0","text":"I ran out of time. You win on the clock!","group":"more"},
  {"id":"V-cm_start-0","text":"Mission time. Here's your goal.","group":"more"},
  {"id":"V-cm_start-1","text":"Let's put that lesson to work.","group":"more"},
  {"id":"V-cm_start-2","text":"Quick mission for you. Ready?","group":"more"},
  {"id":"V-cm_start-3","text":"Your turn to use it. Here's the setup.","group":"more"},
  {"id":"V-cm_start-4","text":"Small mission, big skill. Let's go.","group":"more"},
  {"id":"V-cm_done-0","text":"Mission complete. Nicely done.","group":"more"},
  {"id":"V-cm_done-1","text":"Goal reached. You've got it.","group":"more"},
  {"id":"V-cm_done-2","text":"That's the idea exactly. Mission done.","group":"more"},
  {"id":"V-cm_done-3","text":"You made that look easy.","group":"more"},
  {"id":"V-cm_done-4","text":"Done! That piece is starting to obey you.","group":"more"},
  {"id":"V-cm_star3-0","text":"Three stars. Not a single wasted move.","group":"more"},
  {"id":"V-cm_star3-1","text":"Perfect route. Full marks.","group":"more"},
  {"id":"V-cm_star3-2","text":"Flawless. That's the fastest way.","group":"more"},
  {"id":"V-cm_star3-3","text":"Three stars! You planned that perfectly.","group":"more"},
  {"id":"V-cm_fail-0","text":"Not quite. Let's set it up again.","group":"more"},
  {"id":"V-cm_fail-1","text":"Close one. Try a different route.","group":"more"},
  {"id":"V-cm_fail-2","text":"No problem. Reset and have another go.","group":"more"},
  {"id":"V-cm_fail-3","text":"That didn't work this time. You'll get it.","group":"more"},
  {"id":"V-cm_fail-4","text":"Almost. Think one move further ahead.","group":"more"},
  {"id":"V-coach_onpurpose-0","text":"At this level I leave pieces loose on purpose. Can you spot them?","group":"more"},
  {"id":"V-coach_onpurpose-1","text":"I'm playing like a beginner on purpose. Punish my mistakes.","group":"more"},
  {"id":"V-coach_onpurpose-2","text":"I just left something unguarded. That's your training. Find it.","group":"more"},
  {"id":"V-coach_onpurpose-3","text":"I make slips at this level so you can practise winning material.","group":"more"},
  {"id":"V-coach_lost_easy-0","text":"You beat me! At this level I play like a beginner on purpose, so you can practise winning. Try the next level when you're ready.","group":"more"},
  {"id":"V-coach_lost_easy-1","text":"Well played. I was playing gently, but you took your chances. That's exactly the skill.","group":"more"},
  {"id":"V-coach_lost_easy-2","text":"You won! I let a few things slip on purpose, and you punished them. Ready for a tougher me?","group":"more"},
  {"id":"V-quiz_right-0","text":"Yes, that's one!","group":"more"},
  {"id":"V-quiz_right-1","text":"It can go there.","group":"more"},
  {"id":"V-quiz_right-2","text":"Right square.","group":"more"},
  {"id":"V-quiz_right-3","text":"Good eye.","group":"more"},
  {"id":"V-quiz_right-4","text":"That's it.","group":"more"},
  {"id":"V-quiz_right-5","text":"Yep, reachable.","group":"more"},
  {"id":"V-quiz_wrong-0","text":"That piece can't reach there.","group":"more"},
  {"id":"V-quiz_wrong-1","text":"Not that square. Think about how it moves.","group":"more"},
  {"id":"V-quiz_wrong-2","text":"Nope, try another square.","group":"more"},
  {"id":"V-quiz_done-0","text":"You found them all!","group":"more"},
  {"id":"V-quiz_done-1","text":"Every square. You really know this piece now.","group":"more"},
  {"id":"V-quiz_done-2","text":"All found. Brilliant.","group":"more"},
  {"id":"V-quiz_done-3","text":"Complete! Let's keep going.","group":"more"},
  {"id":"V-an_start-0","text":"Let's see how that game went.","group":"more"},
  {"id":"V-an_start-1","text":"Okay, I'm going through your moves now.","group":"more"},
  {"id":"V-an_start-2","text":"Let me check every move you played.","group":"more"},
  {"id":"V-an_start-3","text":"Game received. Analysing it move by move.","group":"more"},
  {"id":"V-an_done-0","text":"Done. Here's what I found.","group":"more"},
  {"id":"V-an_done-1","text":"Analysis finished. Let's look at the problems.","group":"more"},
  {"id":"V-an_done-2","text":"All checked. Here's your report.","group":"more"},
  {"id":"V-an_done-3","text":"That's every move. Let's go through it.","group":"more"},
  {"id":"V-an_clean-0","text":"No real problems in this game. Well played.","group":"more"},
  {"id":"V-an_clean-1","text":"Honestly, a clean game. Nice work.","group":"more"},
  {"id":"V-an_patterns-0","text":"Here are the habits that cost you the most points.","group":"more"},
  {"id":"V-an_patterns-1","text":"I found your patterns. Fix the top one first.","group":"more"},
  {"id":"V-an_patterns-2","text":"This is what keeps coming back in your games.","group":"more"},
  {"id":"V-pr_trap-0","text":"You fell into a known opening trap. Learn the defence once and it won't happen again.","group":"more"},
  {"id":"V-pr_trap-1","text":"That was a trap, and you took the bait. Let's learn how to meet it.","group":"more"},
  {"id":"V-pr_allowedmate-0","text":"The biggest problem: you missed a mating threat. Always check your opponent's checks first.","group":"more"},
  {"id":"V-pr_allowedmate-1","text":"You walked into a mate threat. Before each move, look at every check your opponent has.","group":"more"},
  {"id":"V-pr_hung-0","text":"The main problem: pieces left undefended. After every move, check that your pieces are still safe.","group":"more"},
  {"id":"V-pr_hung-1","text":"You left material hanging. Ask yourself: is the piece I just moved protected?","group":"more"},
  {"id":"V-pr_missedmate-0","text":"You had a checkmate and missed it. When their king is short of squares, look at every check.","group":"more"},
  {"id":"V-pr_missedmate-1","text":"There was a mate on the board. Checks first, always.","group":"more"},
  {"id":"V-pr_missedfork-0","text":"You missed a fork. Look for moves that attack two pieces at once.","group":"more"},
  {"id":"V-pr_missedfork-1","text":"A fork was there for you. Knights and queens love double attacks.","group":"more"},
  {"id":"V-pr_missedwin-0","text":"You missed free material. Scan for undefended enemy pieces every move.","group":"more"},
  {"id":"V-pr_missedwin-1","text":"Your opponent left something hanging, and you didn't take it.","group":"more"},
  {"id":"V-pr_slipped-0","text":"You were winning, then let it slip. When ahead, trade pieces and keep it simple.","group":"more"},
  {"id":"V-pr_slipped-1","text":"That game was won at one point. Converting is a skill we can train.","group":"more"},
  {"id":"V-pr_kingcentre-0","text":"Your king stayed in the centre too long. Castle early.","group":"more"},
  {"id":"V-pr_kingcentre-1","text":"Your king never got to safety. Castle in the first ten moves.","group":"more"},
  {"id":"V-pr_earlyqueen-0","text":"Your queen came out too early and got chased around.","group":"more"},
  {"id":"V-pr_earlyqueen-1","text":"Too many early queen moves. Develop the knights and bishops first.","group":"more"},
  {"id":"V-pr_slowdev-0","text":"Too many pieces stayed at home. Develop everything before you attack.","group":"more"},
  {"id":"V-pr_slowdev-1","text":"Your knights and bishops were slow to come out.","group":"more"},
  {"id":"V-pr_missedbetter-0","text":"You missed some stronger moves. Compare two or three candidates before you play.","group":"more"},
  {"id":"V-pr_missedbetter-1","text":"Several moves had a better option. Slow down at the critical moments.","group":"more"},
  {"id":"V-drill_start-0","text":"Practice time. Five puzzles, and every one uses what you just learned.","group":"more"},
  {"id":"V-drill_start-1","text":"Let's lock that lesson in. Five quick puzzles.","group":"more"},
  {"id":"V-drill_start-2","text":"Now you try it on your own. Five puzzles, same idea.","group":"more"},
  {"id":"V-drill_start-3","text":"Time to practise. You know everything you need for these.","group":"more"},
  {"id":"V-drill_start-4","text":"Five puzzles. Each one is the lesson, in a real position.","group":"more"},
  {"id":"V-drill_right-0","text":"Yes! That's exactly it.","group":"more"},
  {"id":"V-drill_right-1","text":"Spot on. You saw it straight away.","group":"more"},
  {"id":"V-drill_right-2","text":"Perfect. That's the idea from the lesson.","group":"more"},
  {"id":"V-drill_right-3","text":"Got it first time. Brilliant.","group":"more"},
  {"id":"V-drill_right-4","text":"That's the one. You're getting fast.","group":"more"},
  {"id":"V-drill_right-5","text":"Exactly right. Well spotted.","group":"more"},
  {"id":"V-drill_right-6","text":"Lovely. Clean and simple.","group":"more"},
  {"id":"V-drill_right_late-0","text":"There it is. You got there.","group":"more"},
  {"id":"V-drill_right_late-1","text":"Found it. Next time you'll see it even faster.","group":"more"},
  {"id":"V-drill_right_late-2","text":"That's it. Mistakes on the way are how you learn.","group":"more"},
  {"id":"V-drill_right_late-3","text":"Good. You kept looking until you found it.","group":"more"},
  {"id":"V-drill_wrong-0","text":"Not that one. Read what I wrote and try again.","group":"more"},
  {"id":"V-drill_wrong-1","text":"Close, but no. Have another look.","group":"more"},
  {"id":"V-drill_wrong-2","text":"Hmm, not quite. Think about the lesson.","group":"more"},
  {"id":"V-drill_wrong-3","text":"That doesn't win anything. Look again.","group":"more"},
  {"id":"V-drill_wrong-4","text":"Try a different move. You can do this.","group":"more"},
  {"id":"V-drill_done_great-0","text":"Practice done, and you nailed it. This idea is yours now.","group":"more"},
  {"id":"V-drill_done_great-1","text":"Fantastic. You've really got this one.","group":"more"},
  {"id":"V-drill_done_great-2","text":"That's how a strong player does it. Well done.","group":"more"},
  {"id":"V-drill_done_ok-0","text":"Practice done. Every puzzle makes the pattern stick.","group":"more"},
  {"id":"V-drill_done_ok-1","text":"Good effort. Come back to these and they'll get easier.","group":"more"},
  {"id":"V-drill_done_ok-2","text":"Done. Repeat this set any time, it's the fastest way to improve.","group":"more"},
  {"id":"V-demo_watch-0","text":"Watch this.","group":"more"},
  {"id":"V-demo_watch-1","text":"Keep your eyes on the board.","group":"more"},
  {"id":"V-demo_watch-2","text":"Look what happens here.","group":"more"},
  {"id":"V-demo_watch-3","text":"Watch carefully.","group":"more"},
  {"id":"V-demo_watch-4","text":"Here, let me show you.","group":"more"},
  {"id":"V-piece_found_k-0","text":"Yes, that's your king. Keep him safe.","group":"more"},
  {"id":"V-piece_found_k-1","text":"The king. The most important piece of all.","group":"more"},
  {"id":"V-piece_found_q-0","text":"That's the queen. Your strongest piece.","group":"more"},
  {"id":"V-piece_found_q-1","text":"Yes, the queen. Power on legs.","group":"more"},
  {"id":"V-piece_found_r-0","text":"Right, the rook. The castle tower.","group":"more"},
  {"id":"V-piece_found_r-1","text":"That's a rook. Corners are home.","group":"more"},
  {"id":"V-piece_found_b-0","text":"Yes, a bishop. See the pointed hat?","group":"more"},
  {"id":"V-piece_found_b-1","text":"That's the bishop.","group":"more"},
  {"id":"V-piece_found_n-0","text":"The knight! The horse.","group":"more"},
  {"id":"V-piece_found_n-1","text":"Yes, a knight. The jumper.","group":"more"},
  {"id":"V-piece_found_p-0","text":"A pawn. Small, but brave.","group":"more"},
  {"id":"V-piece_found_p-1","text":"That's a pawn. You've got eight of them.","group":"more"},
  {"id":"V-piece_wrong-0","text":"Not that one. Look at the picture again.","group":"more"},
  {"id":"V-piece_wrong-1","text":"Close! Check the shape in the picture.","group":"more"},
  {"id":"V-piece_wrong-2","text":"That's a different piece. Try again.","group":"more"},
  {"id":"V-intro_l-board-0","text":"Let's start at the very beginning: the board itself. By the end of this, you'll know the name of every square.","group":"more"},
  {"id":"V-intro_l-pieces-0","text":"Now let's meet the pieces. Six kinds, and I'll introduce each one.","group":"more"},
  {"id":"V-intro_l-rook-0","text":"Our first piece to move: the rook. Straight lines, and lots of power.","group":"more"},
  {"id":"V-intro_l-bishop-queen-0","text":"Diagonals today. First the bishop, then the mighty queen.","group":"more"},
  {"id":"V-intro_l-knight-0","text":"The knight. The trickiest mover, and my personal favourite.","group":"more"},
  {"id":"V-intro_l-king-pawn-0","text":"King and pawns. The slowest pieces, but they decide a lot of games.","group":"more"},
  {"id":"V-intro_l-check-0","text":"Check, checkmate and stalemate. This is how games are won, and sometimes thrown away.","group":"more"},
  {"id":"V-intro_l-special-0","text":"Two special moves people always forget: castling and en passant.","group":"more"},
  {"id":"V-intro_l-qmate-0","text":"You've got a queen and the other side has nothing. Let's make sure you always win this.","group":"more"},
  {"id":"V-intro_l-firstmoves-0","text":"What should you actually do at the start of a game? Three simple jobs. Let's learn them.","group":"more"},
  {"id":"V-intro_l-values-0","text":"Not all pieces are equal. Let's learn what each one is worth, and stop giving them away.","group":"more"},
  {"id":"V-intro_l-cct-0","text":"This lesson is the big one. A three-question habit that stops most blunders.","group":"more"},
  {"id":"V-intro_l-principles-0","text":"Opening principles. Get these right and you'll start every game with a good position.","group":"more"},
  {"id":"V-intro_l-traps-0","text":"There's an early queen attack that catches so many beginners. Let's make sure it never catches you.","group":"more"},
  {"id":"V-intro_l-forks-0","text":"Forks! One move, two attacks. This is where you start winning pieces.","group":"more"},
  {"id":"V-intro_l-pins-0","text":"Pins. Freeze an enemy piece so it can't move without losing something bigger.","group":"more"},
  {"id":"V-intro_l-skewers-0","text":"Skewers. The pin's sneaky cousin.","group":"more"},
  {"id":"V-intro_l-backrank-0","text":"The back rank. A king stuck behind his pawns is in real danger.","group":"more"},
  {"id":"V-intro_l-discovered-0","text":"Discovered attacks. Move one piece, and another one strikes.","group":"more"},
  {"id":"V-intro_l-defender-0","text":"Every position has a key defender. Remove it, and everything falls apart.","group":"more"},
  {"id":"V-intro_l-patterns-0","text":"Mating patterns. Learn the pictures and you'll find mates in seconds.","group":"more"},
  {"id":"V-intro_l-smothered-0","text":"Smothered mate. One of the most beautiful ideas in chess.","group":"more"},
  {"id":"V-intro_l-rookmate-0","text":"King and rook against a lone king. A win you should never miss.","group":"more"},
  {"id":"V-intro_l-kp-0","text":"King and pawn endings. Precise, simple, and full of tricks.","group":"more"},
  {"id":"V-intro_l-rook-end-0","text":"Rook endgames. The most common endgame of all.","group":"more"},
  {"id":"V-intro_l-structure-0","text":"Pawn structure. The pawns tell you what plan to play.","group":"more"},
  {"id":"V-intro_l-calc-0","text":"Calculation. How strong players look ahead without getting lost.","group":"more"},
  {"id":"V-intro_l-outposts-0","text":"Outposts and prophylaxis. Thinking like a master.","group":"more"},
  {"id":"V-intro_l-convert-0","text":"You're winning. Now let's make sure you actually win.","group":"more"},
  {"id":"V-daily_start-0","text":"Today's puzzle. Everyone in the world gets this same one.","group":"more"},
  {"id":"V-daily_start-1","text":"Here's the daily puzzle. Take your time, there's no clock.","group":"more"},
  {"id":"V-daily_start-2","text":"Daily puzzle time. Solve it, then dare your friends.","group":"more"},
  {"id":"V-daily_start-3","text":"Today's challenge. Fewer tries means a better score to share.","group":"more"},
  {"id":"V-daily_solved-0","text":"Solved! Now share it and see if your friends can match you.","group":"more"},
  {"id":"V-daily_solved-1","text":"There it is. Send it to a friend and compare.","group":"more"},
  {"id":"V-daily_solved-2","text":"Done for today. Come back tomorrow for a new one.","group":"more"},
  {"id":"V-daily_solved-3","text":"Nice. Your streak keeps growing.","group":"more"},
  {"id":"V-daily_perfect-0","text":"First try! That's a perfect score. Show it off.","group":"more"},
  {"id":"V-daily_perfect-1","text":"Perfect, first try. Your friends will have to work to match that.","group":"more"},
  {"id":"V-daily_perfect-2","text":"Spot on, first attempt. Brilliant.","group":"more"},
  {"id":"V-challenge_intro-0","text":"A friend has challenged you. Let's see if you can beat them.","group":"more"},
  {"id":"V-challenge_intro-1","text":"You've been challenged! Solve it in fewer tries to win.","group":"more"},
  {"id":"V-challenge_intro-2","text":"Somebody thinks this is too hard for you. Prove them wrong.","group":"more"},
  {"id":"V-challenge_win-0","text":"You win! Fewer tries than your friend. Send it back to them.","group":"more"},
  {"id":"V-challenge_win-1","text":"Victory! Now challenge them back.","group":"more"},
  {"id":"V-challenge_win-2","text":"You beat them. Time to rub it in, nicely.","group":"more"},
  {"id":"V-challenge_tie-0","text":"A tie! Equally sharp. Send them a new one.","group":"more"},
  {"id":"V-challenge_tie-1","text":"Same score. Neither of you blinked.","group":"more"},
  {"id":"V-challenge_lose-0","text":"They got this one. Challenge them back and win the next.","group":"more"},
  {"id":"V-challenge_lose-1","text":"Close! Send them a puzzle of your own.","group":"more"},
  {"id":"V-friend_start-0","text":"Two players, one board. I'll keep an eye on both of you.","group":"more"},
  {"id":"V-friend_start-1","text":"Friendly game! I'll point out the good moves and the slips.","group":"more"},
  {"id":"V-friend_start-2","text":"Let's play. Pass the phone after every move.","group":"more"},
  {"id":"V-friend_good-0","text":"Great move!","group":"more"},
  {"id":"V-friend_good-1","text":"Oh, nice one.","group":"more"},
  {"id":"V-friend_good-2","text":"That's a strong move.","group":"more"},
  {"id":"V-friend_good-3","text":"Well played.","group":"more"},
  {"id":"V-friend_good-4","text":"Lovely. That's what I like to see.","group":"more"},
  {"id":"V-friend_careful-0","text":"Careful! That was a big mistake.","group":"more"},
  {"id":"V-friend_careful-1","text":"Ooh, that gives something away.","group":"more"},
  {"id":"V-friend_careful-2","text":"Watch out, that piece is in danger now.","group":"more"},
  {"id":"V-friend_careful-3","text":"Hmm, that one hurts.","group":"more"},
  {"id":"V-friend_mate-0","text":"Checkmate! What a game.","group":"more"},
  {"id":"V-friend_mate-1","text":"That's checkmate. Shake hands, and play again!","group":"more"},
  {"id":"V-friend_mate-2","text":"Game over. Well played, both of you.","group":"more"},
  {"id":"V-friend_draw-0","text":"It's a draw. A fair result.","group":"more"},
  {"id":"V-mc_connected-0","text":"Connected! I'm downloading every game you've played.","group":"more"},
  {"id":"V-mc_connected-1","text":"Got your account. Let me fetch all your games.","group":"more"},
  {"id":"V-mc_connected-2","text":"Account found. Give me a moment to bring in your games.","group":"more"},
  {"id":"V-mc_scan_start-0","text":"I'm checking your games now, every single move. Keep using the app if you like.","group":"more"},
  {"id":"V-mc_scan_start-1","text":"Scanning your games for mistakes. This takes a few minutes.","group":"more"},
  {"id":"V-mc_scan_start-2","text":"Let me replay your games with the engine and find what is costing you points.","group":"more"},
  {"id":"V-mc_scan_done-0","text":"Done. I've turned your worst moments into puzzles. Let's fix them.","group":"more"},
  {"id":"V-mc_scan_done-1","text":"Scan complete. Your chess DNA is ready.","group":"more"},
  {"id":"V-mc_scan_done-2","text":"Finished. Now we know exactly what to train.","group":"more"},
  {"id":"V-mine_start-0","text":"These positions are from your own games. Let's get them right this time.","group":"more"},
  {"id":"V-mine_start-1","text":"Your own mistakes, second chance. Find the better move.","group":"more"},
  {"id":"V-mine_start-2","text":"Same position as your game. This time, find the move that works.","group":"more"},
  {"id":"V-mine_right-0","text":"That's it! That one won't catch you again.","group":"more"},
  {"id":"V-mine_right-1","text":"Yes. Next time this comes up in a game, you'll know.","group":"more"},
  {"id":"V-mine_right-2","text":"Fixed. That is how you stop repeating mistakes.","group":"more"},
  {"id":"V-mine_right-3","text":"Exactly. Better than the game!","group":"more"},
  {"id":"V-prog_start-0","text":"Day one of the 30-Day Ascent. Twenty minutes, every day. Let's climb.","group":"more"},
  {"id":"V-prog_start-1","text":"The climb starts now. Small steps every day add up fast.","group":"more"},
  {"id":"V-prog_done-0","text":"Thirty days! You reached the summit. I'm proud of you.","group":"more"},
  {"id":"V-prog_done-1","text":"That's the whole climb. Look how far you've come.","group":"more"},
  {"id":"K-l-board","text":"Key takeaways. Files are the columns, lettered a to h. Ranks are the rows, numbered 1 to 8. A square is named by its file, then its rank, like d4.","group":"more"},
  {"id":"K-l-pieces","text":"Key takeaways. Each side has 16 pieces: 1 king, 1 queen, 2 rooks, 2 bishops, 2 knights and 8 pawns. Each piece has a letter: K king, Q queen, R rook, B bishop, N knight. Pawns have no letter. A move is written as the letter plus the square it lands on, like Nf3. Pawn moves are just the square, like e4.","group":"more"},
  {"id":"K-l-firstmoves","text":"Key takeaways. Job 1: put a pawn in the centre. Job 2: bring your knights and bishops out. Job 3: castle to keep your king safe.","group":"more"},
  {"id":"K-l-capture","text":"Key takeaways. To capture, move onto the enemy piece's square. It leaves the board for good. Pieces capture the way they move, except the pawn, which takes diagonally. Take pieces that nobody protects. The king is never taken: attacking it is check.","group":"more"},
  {"id":"K-l-threats","text":"Key takeaways. After every move your opponent makes, ask: what does it attack? Check the three dangers: an undefended piece, a fork, and your king. Deal with the threat first, then make your plan.","group":"more"},
  {"id":"K-l-captures","text":"Key takeaways. Before you capture, ask: can they take back, and with what? Capture with your cheapest piece first. A capture that wins a bigger piece than it loses is good. The rest are traps.","group":"more"},
  {"id":"K-l-loose","text":"Key takeaways. A piece nobody defends is a target for forks and double attacks. Before you move, count: which of my pieces are undefended? Attack two loose pieces at once and one of them falls.","group":"more"},
  {"id":"K-l-twomove","text":"Key takeaways. Combinations start with forcing moves: checks, captures and threats. Ask: if I check here, what can they do? Then what do I win? The forcing move limits their answers, so you can see the end.","group":"more"},
  {"id":"K-l-kingsafety","text":"Key takeaways. A king that has not castled, or whose pawns have moved, is a target. Count attackers against defenders near the king. Checks first: they force the king into the open.","group":"more"},
  {"id":"K-l-candidates","text":"Key takeaways. Before you decide, list two or three candidate moves. Calculate forcing moves first; check each line to the end. At the end of every line, ask what your opponent can do.","group":"more"},
  {"id":"K-l-defence","text":"Key takeaways. Strong players spend as much time on the opponent's ideas as on their own. Prophylaxis: stop their best move before it happens. Look for their checks, captures and threats every move.","group":"more"},
  {"id":"K-l-endgame-play","text":"Key takeaways. In the endgame the king is a fighting piece: bring it forward. Passed pawns must be pushed, and stopped when they are the enemy's. Count moves exactly: one tempo decides most endgames.","group":"more"},
  {"id":"K-l-deep","text":"Key takeaways. Visualise the position after each move before you move on. Look for the quiet move hidden inside a forcing line. If a line wins, double-check the opponent's best defence once more.","group":"more"},
  {"id":"K-l-pro-threats","text":"Key takeaways. Every move, look at the position from your opponent's chair for a few seconds. Ask what their most forcing move is, even if it looks crazy. If you find their combination first, one quiet move often stops it.","group":"more"},
  {"id":"W-welcome","text":"Welcome to Ascent Town! I am Coach Leo. Every building here trains one part of your game. Learn at my Academy, then prove it against the rivals at the Arena. Beat them all, and the town is yours.","group":"career"},
  {"id":"W-tour_town","text":"Welcome to Ascent Town! Every building here trains one part of your chess. Let me show you around.","group":"career"},
  {"id":"W-tour_academy","text":"My Academy. Lessons from your very first move to master tricks, with challenges after each one. Your journey starts here.","group":"career"},
  {"id":"W-tour_tower","text":"The Puzzle Tower. Puzzles at your level, and a brand new daily puzzle every day.","group":"career"},
  {"id":"W-tour_library","text":"The Opening Library. Learn real openings move by move, then drill them until you know them by heart.","group":"career"},
  {"id":"W-tour_arena","text":"The Arena. A rival waits here at the end of every chapter. Beat them to clear the chapter.","group":"career"},
  {"id":"W-tour_park","text":"The Park. Play full games against me, with a clock if you like, or with a friend on the same phone.","group":"career"},
  {"id":"W-tour_home","text":"Your Home. Your progress, your rating chart and your 30-day plan live here.","group":"career"},
  {"id":"W-tour_gia","text":"Gia runs quick board games on the plaza. They train your eyes for the board.","group":"career"},
  {"id":"W-tour_tia","text":"Tia runs the Style Shop. She changes your look whenever you want.","group":"career"},
  {"id":"W-tour_people","text":"Everyone in town is happy to talk. Walk up to anyone and tap them, or press E on a computer, and chat.","group":"career"},
  {"id":"W-tour_pawns","text":"Five golden pawns are hidden around town every day. Find them for bonus points.","group":"career"},
  {"id":"W-tour_end","text":"That is the town! Now come and see me. Your first step is waiting.","group":"career"},
  {"id":"W-welcome_back","text":"Good to see you back in town. Your next step is marked with the gold star. Follow it.","group":"career"},
  {"id":"W-lesson_go","text":"Your next lesson is ready at the Academy. Step inside when you are.","group":"career"},
  {"id":"W-boss_ready","text":"You have learned enough for this chapter. Your rival is waiting at the Arena. Go and beat them.","group":"career"},
  {"id":"W-all_done","text":"You have beaten every rival in town. Keep your edge sharp: a daily puzzle at the Tower, and real games at the Park.","group":"career"},
  {"id":"W-hint_tap","text":"Tap anywhere to walk there. Tap a building or a person to go and talk to them. Drag to look around.","group":"career"},
  {"id":"W-hint_keys","text":"Walk with W A S D or the arrow keys, or click anywhere. Drag to look around. Press E to enter or talk.","group":"career"},
  {"id":"W-pawns_intro","text":"Five golden pawns are hidden around town every day. Find them all for bonus points.","group":"career"},
  {"id":"W-pawns_all","text":"All five golden pawns found today! Here is your bonus.","group":"career"},
  {"id":"W-ch0","text":"Chapter one: Foundations. Every champion starts here. Learn how the pieces move, then beat Rookie Rex.","group":"career"},
  {"id":"W-ch1","text":"Chapter two: Stop Losing Pieces. Count, defend, and take what is free. Trapper Tess is waiting with her tricks.","group":"career"},
  {"id":"W-ch2","text":"Chapter three: Tactical Weapons. Forks, pins and skewers. Tactics Tao will test every move you make.","group":"career"},
  {"id":"W-ch3","text":"Chapter four: Endgames and Structure. Grinder Greta wins long games. Learn to finish what you start.","group":"career"},
  {"id":"W-ch4","text":"Chapter five: Mastery. Only Grandmaster Gus stands between you and the top of Ascent Town.","group":"career"},
  {"id":"W-boss_rex","text":"Hey! I am Rookie Rex. I just learned how the knight moves. Want a game?","group":"career"},
  {"id":"W-boss_tess","text":"Trapper Tess. Careful where you step. Every opening I play has a trap in it.","group":"career"},
  {"id":"W-boss_tao","text":"Tactics Tao. I calculate everything. Show me you can too.","group":"career"},
  {"id":"W-boss_greta","text":"Grinder Greta. We skip the opening and go straight to the endgame. Most people crack.","group":"career"},
  {"id":"W-boss_gus","text":"Grandmaster Gus. So, you climbed the whole town. Let us see if you belong at the top.","group":"career"},
  {"id":"W-boss_locked","text":"Not yet. Finish more lessons at the Academy first, then come back and face me.","group":"career"},
  {"id":"W-boss_beaten","text":"You beat me fair and square. Want a rematch?","group":"career"},
  {"id":"W-tower","text":"Puzzle Tower. A new daily puzzle every day, the same for everyone in the world.","group":"career"},
  {"id":"W-library","text":"The Opening Library. Every great game starts with a good plan in the first ten moves.","group":"career"},
  {"id":"W-arena","text":"The Arena. Rivals, challenge positions and speed games.","group":"career"},
  {"id":"W-park","text":"The Park. Play a full game against me, or against a friend on this phone.","group":"career"},
  {"id":"W-home","text":"Your home. Your progress, your 30-day plan and your chess.com games live here.","group":"career"},
  {"id":"W-leo_call","text":"Hey! Over here! Come and talk to me.","group":"career"},
  {"id":"W-tut_trail","text":"See the golden trail on the ground? It always leads to your next goal. Follow it, or press Go.","group":"career"},
  {"id":"W-tut_door","text":"Walk up to the glowing door to go inside.","group":"career"},
  {"id":"W-look_intro","text":"Great first lesson! Now make your character. Every champion needs a look.","group":"career"},
  {"id":"W-gia","text":"Hi, I am Gia, the Games Master! Two games on the giant board: run to the square I call, or hop the knight onto the stars. Fancy a go?","group":"career"},
  {"id":"W-tia","text":"Welcome to the Style Shop! Change your look whenever you like. Beat the rivals at the Arena to unlock their special hats.","group":"career"},
  {"id":"W-rush_start","text":"Square Rush! Run to the square I call out. Letter first, then number. Go!","group":"career"},
  {"id":"W-hop_start","text":"Knight Hop! Jump the knight onto every star. Tap a glowing square to jump.","group":"career"},
  {"id":"W-mg_done","text":"Time is up! Nice work. Come back any time and beat your best score.","group":"career"},
  {"id":"W-victory","text":"What a game! The whole Arena is on its feet. You did it!","group":"career"},
  {"id":"W-lost","text":"Not this time. Train at the Academy and come back stronger. Your rival will be waiting.","group":"career"},
  {"id":"W-wl_hi","text":"Hi! I am Coach Leo. I will teach you chess one move at a time, and I react to every move you make. Watch this.","group":"career"},
  {"id":"W-wl_name","text":"What should I call you?","group":"career"},
  {"id":"W-wl_level","text":"Where are you starting? Pick the closest match. You can change it any time.","group":"career"},
  {"id":"W-wl_try_100","text":"Let us try one right now. Move the knight to the star.","group":"career"},
  {"id":"W-wl_try_400","text":"Let us try one right now. Black left the queen undefended. Take it!","group":"career"},
  {"id":"W-wl_try_800","text":"Let us try one right now. Find the knight move that attacks two pieces at once.","group":"career"},
  {"id":"W-wl_try_1200","text":"Let us try one right now. Black is about to jump with the knight. Tap the square where it would attack your king and your rook together.","group":"career"},
  {"id":"W-wl_good_100","text":"That is it! Every lesson is hands-on like this, and I explain every move you make.","group":"career"},
  {"id":"W-wl_good_400","text":"Nine points, for free! I will train you to spot this in every game you play.","group":"career"},
  {"id":"W-wl_good_800","text":"A fork! One move, two targets. Moves like this win games, and you will learn them all.","group":"career"},
  {"id":"W-wl_good_1200","text":"You saw their idea first. Strong players do this every single move, and that is what we will train.","group":"career"},
  {"id":"W-wl_wrong","text":"Not quite. Look at the glowing squares.","group":"career"},
  {"id":"W-wl_plan","text":"Here is your plan for today. About ten minutes. Ready to start?","group":"career"},
  {"id":"W-fi_puzzles","text":"Puzzles are real positions at your level. Find the best move, and I show you why it works. Every solve moves your rating.","group":"career"},
  {"id":"W-fi_openings","text":"Learn the first moves the pros play. I show you the plan, then quiz you from memory.","group":"career"},
  {"id":"W-fi_play","text":"Play a full game against me. I tell you about your good moves, your mistakes, and what to play instead.","group":"career"},
  {"id":"W-fi_arena","text":"Quick wins between lessons: rivals, sixty-second games and win-this-position challenges.","group":"career"},
  {"id":"W-fi_progress","text":"Your rating, your streak and your badges. This is where you see yourself getting better.","group":"career"},
  {"id":"Q-r-4","text":"Your turn. Tap four squares the rook can reach.","group":"more"},
  {"id":"Q-b-3","text":"Your turn. Tap three squares the bishop can reach.","group":"more"},
  {"id":"Q-q-5","text":"Your turn. Tap five squares the queen can reach.","group":"more"},
  {"id":"Q-n-3","text":"Your turn. Tap three squares the knight can reach.","group":"more"},
  {"id":"Q-n-2a","text":"Your turn. Tap both squares the knight can reach.","group":"more"},
  {"id":"Q-k-3","text":"Your turn. Tap three squares the king can reach.","group":"more"},
  {"id":"H-puzzles","text":"Puzzles: find the best move in a real position. Every solve moves your rating.","group":"more"},
  {"id":"H-arena","text":"Arena: quick 60-second games and boss fights. Tap any tile to play.","group":"more"},
  {"id":"H-openings","text":"Openings: learn the first moves the pros play, then drill them from memory.","group":"more"},
  {"id":"H-play","text":"Coach games: pick a level and play. I comment on your moves as you go.","group":"more"},
  {"id":"H-progress","text":"Progress: your rating chart, badges and streak live here.","group":"more"},
  {"id":"H-analyze","text":"Type your chess.com username, or paste a game, and I will find your mistakes.","group":"more"},
  {"id":"H-mission","text":"A coach mission: reach the goal in the shown number of moves.","group":"more"},
  {"id":"N-read-italian","text":"I call the move, you play it. e4! Nf3! Bc4! N is the knight, B is the bishop.","group":"more"},
  {"id":"N-read-take","text":"An x means takes. Play e4. When I answer d5, take it: exd5. I take back with my queen, so chase her away: Nc3!","group":"more"},
  {"id":"N-read-race","text":"Four moves, no mistakes: d4, Nc3, Bf4, Qd2. Q is the queen.","group":"more"},
  {"id":"N-cap-snack","text":"Eat three of my pawns with your queen in six moves.","group":"more"},
  {"id":"N-cap-hop","text":"Take both of my pawns with your knight in four moves.","group":"more"},
  {"id":"N-cap-sweep","text":"Use your rook and your bishop to take every one of my pawns in seven moves.","group":"more"},
  {"id":"N-fm-develop","text":"In three moves: one pawn in the centre and both knights out.","group":"more"},
  {"id":"N-fm-castle","text":"Castle within four moves. Clear the squares between your king and the rook first.","group":"more"},
  {"id":"N-fm-long","text":"Castle queenside, O-O-O, within six moves. Three pieces stand in the way this time.","group":"more"},
  {"id":"N-rook-check","text":"Attacking the king is called check. Put your rook on a line with my king to give check. Straight lines only.","group":"more"},
  {"id":"N-rook-snack","text":"Two of my pawns have nobody protecting them. Win both. I will only move my king.","group":"more"},
  {"id":"N-rook-sweep","text":"Clear the board: take all four pawns. Plan a route that wastes no moves.","group":"more"},
  {"id":"N-bishop-check","text":"Give check again: attack my king, this time with your bishop. Bishops only travel on diagonals.","group":"more"},
  {"id":"N-queen-double","text":"Nothing protects my knight and my rook. Win both with your queen.","group":"more"},
  {"id":"N-queen-clean","text":"Four of my pieces, one queen of yours. Take them all. The queen moves like a rook and a bishop at once.","group":"more"},
  {"id":"N-knight-check","text":"Give check with a knight jump: land on a square that attacks my king. Remember the L shape.","group":"more"},
  {"id":"N-knight-hop","text":"Two pawns, two jumps. Win them both.","group":"more"},
  {"id":"N-knight-hunt","text":"My rook, bishop and pawn are stuck in place. Hunt all three down with your knight.","group":"more"},
  {"id":"N-pawn-take","text":"Your pawn attacks two of my pieces. Take one. Pawns capture diagonally forward.","group":"more"},
  {"id":"N-pawn-run","text":"Push your pawn all the way and make a new queen. My king is too far away to stop it.","group":"more"},
  {"id":"N-pawn-duo","text":"Now I defend for real and run at your pawns. Pick the pawn my king cannot catch and promote it.","group":"more"},
  {"id":"N-check-any","text":"Give check. Any piece will do, as long as it is a legal move.","group":"more"},
  {"id":"N-check-backrank","text":"My own pawns box my king in. Checkmate me in one move.","group":"more"},
  {"id":"N-check-rookmate","text":"My king is in the corner. Checkmate within 3 moves, and do not stalemate me.","group":"more"},
  {"id":"N-castle-short","text":"Castle. Move the king two squares toward a rook.","group":"more"},
  {"id":"N-castle-long","text":"Castle again, but one side is not allowed this time. Which one is it?","group":"more"},
  {"id":"N-ep","text":"I push my pawn two squares past yours. Capture it en passant, right now, before the chance is gone.","group":"more"},
  {"id":"N-q-mate1","text":"Your king guards the squares in front of mine. Checkmate in one with the queen.","group":"more"},
  {"id":"N-q-mate2","text":"Checkmate within 2 moves. One quiet queen move first, but leave me a legal move or it is stalemate.","group":"more"},
  {"id":"N-q-box","text":"The full technique. My king is on the edge. Box it in, bring your king, and mate within 12 moves.","group":"more"},
  {"id":"G-queen","text":"King and queen against a lone king that runs for the centre. Checkmate within 12 moves, and never stalemate.","group":"more"},
  {"id":"G-rook","text":"Push the king to the edge with your rook and mate it within 20 moves.","group":"more"},
  {"id":"G-pawn","text":"King in front of the pawn wins. Use the opposition and promote within 7 moves.","group":"more"},
  {"id":"G-break","text":"Three pawns against three, and the kings are far away. Break through and make a queen within 7 moves.","group":"more"},
  {"id":"G-lucena","text":"The Lucena position. Shield your king from the checks with your rook and promote within 15 moves.","group":"more"},
  {"id":"G-fort","text":"You are Black in the Philidor position. Keep your rook on the third rank, check from behind when the pawn advances, and survive 15 moves.","group":"more"},
  {"id":"G-pr-values-0","text":"Somewhere on this board a piece is worth taking. Take it, and keep the extra material while I fight back.","group":"more"},
  {"id":"G-pr-captures-0","text":"Several captures look possible. Find the one that really wins, then hold on to it.","group":"more"},
  {"id":"G-pr-threats-0","text":"My queen and bishop are aiming at f7, a mate threat. Defend it, then play 10 moves without losing any material.","group":"more"},
  {"id":"G-pr-cct-0","text":"A normal game. Before every move ask: checks, captures, threats? Play 12 moves without giving anything away.","group":"more"},
  {"id":"G-pr-principles-0","text":"From the very start: develop, castle, and play 12 moves without losing a single piece or pawn.","group":"more"},
  {"id":"G-pr-traps-0","text":"My knight jumps at f7: this is the Fried Liver trap. Defend well and play 10 moves without losing more than a pawn.","group":"more"},
  {"id":"G-pr-forks-0","text":"One move attacks two things at once. Find the fork, collect the piece, and keep it.","group":"more"},
  {"id":"G-pr-pins-0","text":"A piece is stuck in front of something bigger. Pin it, attack it again, and win material.","group":"more"},
  {"id":"G-pr-skewers-0","text":"Attack the big piece so that when it moves, the one behind it falls. Win material and keep it.","group":"more"},
  {"id":"G-pr-backrank-0","text":"The king is stuck behind its own pawns. Find the mate. I defend as well as I can.","group":"more"},
  {"id":"G-pr-loose-0","text":"An unprotected piece is a target. Hit it with a double attack and win material, against a stronger me.","group":"more"},
  {"id":"G-pr-twomove-0","text":"The win takes two moves: a forcing move first, then the capture. Find both and keep the material.","group":"more"},
  {"id":"G-pr-kingsafety-0","text":"The enemy king has too few defenders. Break in and give mate.","group":"more"},
  {"id":"G-pr-discovered-0","text":"Move one piece out of the way and the piece behind it attacks. Win material that way and keep it.","group":"more"},
  {"id":"G-pr-defender-0","text":"One enemy piece is doing all the defending. Remove it, then take what it was guarding.","group":"more"},
  {"id":"G-pr-patterns-0","text":"You know this mating pattern. Find it over the board while I defend.","group":"more"},
  {"id":"G-pr-smothered-0","text":"The king is boxed in by its own pieces. A knight can finish it. Find the mate.","group":"more"},
  {"id":"G-pr-candidates-0","text":"Before you move, list every check, capture and threat. One of them mates by force. I defend as well as I can.","group":"more"},
  {"id":"G-pr-defence-0","text":"You won a pawn, but now I attack your bishop and build pressure for it. Defend calmly and do not get mated for 12 moves.","group":"more"},
  {"id":"G-pr-kp-0","text":"Your king is in front of the pawn on the 6th rank: this is a win. Use the opposition and make a queen against my best defence.","group":"more"},
  {"id":"G-pr-kp-1","text":"Kings face each other, and it is your move. A pawn step wins the opposition. Then walk your king forward and promote.","group":"more"},
  {"id":"G-pr-endgame-play-0","text":"Draw the square of your pawn. If my king is outside it, just run. Promote before I catch it.","group":"more"},
  {"id":"G-pr-endgame-play-1","text":"Three pawns against three. One pawn sacrifice, then another, and one of yours runs through. Find the breakthrough.","group":"more"},
  {"id":"G-pr-rook-end-0","text":"You are Black. Keep your rook on the 6th rank until my pawn steps up, then check me from behind. Hold for 12 moves without losing material.","group":"more"},
  {"id":"G-pr-structure-0","text":"Equal pawns, but structure matters. Keep your pawns safe and do not let my king in. Play 12 moves without losing a pawn.","group":"more"},
  {"id":"G-pr-calc-0","text":"This mate takes several moves. Calculate my best reply to each of your moves before you start.","group":"more"},
  {"id":"G-pr-deep-0","text":"A long forcing line against full-strength me. Checks first, and see it to the end.","group":"more"},
  {"id":"G-pr-pro-threats-0","text":"Check! Every move from now on, ask what I threaten before you play. Go 12 moves without losing any material against a strong me.","group":"more"},
  {"id":"G-pr-outposts-0","text":"The d5 square is a hole: no black pawn can ever attack it. Put a piece there and keep everything safe for 12 moves.","group":"more"},
  {"id":"G-pr-convert-0","text":"You are a queen up. No tricks, no stalemate: use your queen and king together and give mate.","group":"more"},
  {"id":"G-pr-convert-1","text":"An extra rook wins, but only if you finish. Trap my king and mate it.","group":"more"},
  {"id":"B-l-values-0","text":"At 400 to 800, most games are decided by one thing: a piece left for free. Watch this one get taken. Bxb2 simply grabs an undefended piece. Always check what your opponent left unprotected. You come out a queen ahead.","group":"more"},
  {"id":"B-l-values-1","text":"Before you move, count. Pawn 1, knight and bishop 3, rook 5, queen 9. Take what is free, and never give a big piece for a small one. Against players at your level, just collect what they leave hanging.","group":"more"},
  {"id":"B-l-captures-0","text":"Players at your level grab the first capture they see. Sometimes it is a trap: the piece was defended. Here is a capture that really wins. Rxf8 works even though the rook is defended. The best play goes Rxf8 Rxf8 Qxd5 Be3, and you come out ahead.","group":"more"},
  {"id":"B-l-captures-1","text":"Before you take, ask two questions. Is it defended? And what can they take back? Count attackers and defenders. If you have more, take. If not, wait.","group":"more"},
  {"id":"B-l-threats-0","text":"The number one reason games are lost at 400 to 800: not looking at what the opponent just did. Their last move attacked something, and nobody noticed. Rxf2 wins material. The queen is defended, but even if they take back you have traded a rook for a queen. That is 4 points in your favour.","group":"more"},
  {"id":"B-l-threats-1","text":"After every move your opponent makes, stop and ask: what does this move attack? What do they want next? Only then think about your own plan.","group":"more"},
  {"id":"B-l-cct-0","text":"Strong players are not magic. They just look at the most forcing moves first. Watch how one forcing move wins material. Qxe3+ attacks two targets at once and only one can be saved. You come out a rook ahead.","group":"more"},
  {"id":"B-l-cct-1","text":"Checks, Captures, Threats. Every move, look at all your checks first, then all your captures, then your threats. Do the same for your opponent. It takes ten seconds and saves games.","group":"more"},
  {"id":"B-l-principles-0","text":"How beginners waste the opening: the queen comes out early, gets chased, and Black develops with every move. Watch White's queen run while Black brings out pieces.","group":"more"},
  {"id":"B-l-principles-1","text":"In the first ten moves, put a pawn in the centre, bring out knights and bishops, and castle. Move each piece once. The queen comes out later, when it is safe.","group":"more"},
  {"id":"B-l-traps-0","text":"The trap that beats thousands of beginners every day: queen and bishop both aim at f7. Black attacks the queen with the knight and misses the threat. Checkmate in four moves.","group":"more"},
  {"id":"B-l-traps-1","text":"When a queen and a bishop aim at the same square next to your king, defend that square first. Against players at your level, you will meet this trap. Now you know it.","group":"more"},
  {"id":"B-l-forks-0","text":"A fork attacks two pieces at once. Your opponent can only save one. Watch how a single move wins material. Rd7+ attacks two targets at once and only one can be saved. You come out a piece ahead.","group":"more"},
  {"id":"B-l-forks-1","text":"Knights are the kings of forks. Look for two enemy pieces a knight jump away from the same square, especially the king and the queen. And check where their knights can jump next to you.","group":"more"},
  {"id":"B-l-pins-0","text":"A pinned piece cannot move without exposing something bigger behind it. Here the knight cannot move, because the rook would check the king. The pawn attacks it, and the knight is lost.","group":"more"},
  {"id":"B-l-pins-1","text":"When your piece stands in a line between an enemy bishop, rook or queen and your king or queen, it is pinned. Break the pin early. And pin their pieces, then attack the pinned piece again.","group":"more"},
  {"id":"B-l-skewers-0","text":"A skewer is a pin the other way round: you attack the big piece, it moves, and you take the piece behind it. Check! The king must step off the line, and then you capture the piece behind it on h1.","group":"more"},
  {"id":"B-l-skewers-1","text":"When the enemy king and another piece stand on the same line, a check along that line wins the piece behind. Keep your own king and queen off the same line.","group":"more"},
  {"id":"B-l-backrank-0","text":"Many games at your level end like this: the king sits behind its own pawns with no escape square, and a rook or queen on the back rank is checkmate.","group":"more"},
  {"id":"B-l-backrank-1","text":"Give your king a window. Push one pawn in front of a castled king, like h3, when you have time. And always check whether their back rank is open.","group":"more"},
  {"id":"B-l-rookmate-0","text":"Being a rook up and not knowing how to finish is the most common way to throw away a win at your level. The pattern is simple: kings face each other, the rook checks from the edge.","group":"more"},
  {"id":"B-l-rookmate-1","text":"Push the enemy king to the edge with your rook, bring your own king in front of it, then check from the side. Do not give stalemate: always leave the king a move until the mate.","group":"more"},
  {"id":"B-l-loose-0","text":"How players at 800 to 1200 lose pieces: White puts the bishop on b2 with nothing guarding it. The queen checks the king and hits the loose bishop in the same move.","group":"more"},
  {"id":"B-l-loose-1","text":"Loose pieces drop off. Before every move, look at each of your pieces and ask who defends it. Nobody? Then it is loose. Against players at your level, hunt for their loose pieces with checks and forks.","group":"more"},
  {"id":"B-l-twomove-0","text":"At your level, players see one-move captures but miss two-move ideas. Watch: the knight jumps to d6 with check, the king must move, and the queen falls next.","group":"more"},
  {"id":"B-l-twomove-1","text":"Every check is a question your opponent must answer. For each check, ask: what can they reply, and what do I take next? Players around 1000 to 1200 only look one move ahead. Look two.","group":"more"},
  {"id":"B-l-kingsafety-0","text":"How kings die at your level: the square next to the king, here f7, is guarded only by the king. Black attacks the queen and forgets the threat. Queen takes f7 is checkmate.","group":"more"},
  {"id":"B-l-kingsafety-1","text":"Castle early, and keep the three pawns in front of your king at home. Count their attackers near your king against your defenders. If they have more, defend first, then attack.","group":"more"},
  {"id":"B-l-discovered-0","text":"A discovered attack: the bishop moves out of the rook's way and takes a rook, and now the rook behind it gives check. Black must answer the check, and the material is gone.","group":"more"},
  {"id":"B-l-discovered-1","text":"Look for your pieces lined up behind another piece, pointing at the enemy king or queen. That is a loaded gun. At your level, players lose to this because they only look at the piece that moves.","group":"more"},
  {"id":"B-l-defender-0","text":"Sometimes a piece is safe only because one defender guards it. Take or chase away that defender, and the piece falls. Watch. Bg5 starts a forcing sequence: Kf8 Bxf6. You come out a queen ahead.","group":"more"},
  {"id":"B-l-defender-1","text":"When you cannot win a piece because it is defended, look at the defender. Can you capture it, attack it, or lure it away with a check? Ask: what is this piece guarding?","group":"more"},
  {"id":"B-l-patterns-0","text":"Strong players do not calculate every mate. They recognise the picture. Here is a mating pattern you will see again and again. Qe8 and after axb3, Qxd8# the king has no escape.","group":"more"},
  {"id":"B-l-patterns-1","text":"Learn the pictures: the back-rank mate, the smothered mate, the queen and pawn mate. When the enemy king has few escape squares, look for the pattern that fits.","group":"more"},
  {"id":"B-l-smothered-0","text":"A smothered mate: the king is boxed in by its own pieces, and a knight check cannot be blocked. Watch the knight finish it.","group":"more"},
  {"id":"B-l-smothered-1","text":"When the enemy king sits in the corner surrounded by its own pieces, look for a knight check. It is the one check that jumps over everything.","group":"more"},
  {"id":"B-l-candidates-0","text":"Players around 1200 often play the first good-looking move and miss a better one. The winning move here is not the first one you see. Watch. Rd2 and after b6, Qxb6+, Kc8, Rd8# the king has no escape.","group":"more"},
  {"id":"B-l-candidates-1","text":"Before you move, name two or three candidates: checks, captures, threats. Compare them. Pick the strongest. When you meet a 1200 player, they will play fast; you play the better move.","group":"more"},
  {"id":"B-l-defence-0","text":"Above 1200, players rarely hang a piece in one move. They lose to an idea the opponent saw first. Watch the idea land, from the side that did not see it coming. Bxc4 attacks two targets at once and only one can be saved. You come out a piece ahead.","group":"more"},
  {"id":"B-l-defence-1","text":"After every opponent move, imagine it is their turn again. What would you play if you were them? Checks, captures, threats, from their side. Stop that idea before your own plan.","group":"more"},
  {"id":"B-l-kp-0","text":"Many players at 1200 trade into a king and pawn ending, then cannot win it. Here White has an extra pawn, but the kings face each other. One wrong king move and it is a draw.","group":"more"},
  {"id":"B-l-kp-1","text":"The opposition. When the kings face each other with one square between, the side NOT to move wins the standoff. Here a quiet pawn step, e3, passes the move to Black. Then walk your king forward.","group":"more"},
  {"id":"B-l-endgame-play-0","text":"Between 1000 and 1600, many won games are thrown away in the endgame by moving the king too slowly or the pawn too early.","group":"more"},
  {"id":"B-l-endgame-play-1","text":"Draw the square. From your passed pawn to the promotion rank is one side of a square. If the enemy king cannot step inside it, just run with the pawn. If it can, bring your king first.","group":"more"},
  {"id":"B-l-rook-end-0","text":"Rook endings are the most common endings in chess, and players at your level lose half of them from winning positions. The famous one is the Lucena position.","group":"more"},
  {"id":"B-l-rook-end-1","text":"Build a bridge. Put your rook on the 4th rank, walk your king out, and block the checks with the rook. To defend, keep your rook on your 6th rank until the pawn steps up. That is the Philidor.","group":"more"},
  {"id":"B-l-structure-0","text":"Players around 1200 move pieces without a plan. The pawns tell you the plan. Here White has an isolated pawn on d4: a strength for attacking, a weakness in the endgame.","group":"more"},
  {"id":"B-l-structure-1","text":"Look at the pawns first. A weak pawn is a target: attack it. An open file is a road: put a rook on it. A hole in their pawn chain is a home: put a knight there.","group":"more"},
  {"id":"B-l-calc-0","text":"Strong players lose by stopping one move too early. They calculate a line, like it, and miss the defence at the end. This mate needs the whole line. Be5 and after Kxc5, Ka4, Kc4, Rc1# the king has no escape.","group":"more"},
  {"id":"B-l-calc-1","text":"Calculate forcing moves first, one line at a time. At the end of every line, ask: what is their best reply here? Only then decide.","group":"more"},
  {"id":"B-l-deep-0","text":"At this level, the winning move is often quiet, or a sacrifice, and it only works three moves later. Watch the whole combination. Raa2 and after Rb3+, Kg2, Rf3, Rh1+, Rf1, Rxf1# the king has no escape.","group":"more"},
  {"id":"B-l-deep-1","text":"Hold the position in your head after each move of the line. If you lose the picture, set it up again from the start. Trust a line only after you have checked their best answer at every step.","group":"more"},
  {"id":"B-l-pro-threats-0","text":"Strong players lose most games the same way: the opponent had a forcing idea, and nobody looked for it from their side of the board. Rg3+ attacks two targets at once and only one can be saved. You come out a decisive edge ahead.","group":"more"},
  {"id":"B-l-pro-threats-1","text":"Every move, flip the board in your head. If it were their move, what is their best check, capture or threat? Make your move stop it, or make yours stronger.","group":"more"},
  {"id":"B-l-outposts-0","text":"Good positions are lost to slow, aimless moves. Here Black has no c-pawn and no e-pawn, so d5 can never be attacked by a pawn. Players at your level ignore squares like this.","group":"more"},
  {"id":"B-l-outposts-1","text":"Find a square your pawn protects and no enemy pawn can attack. Put a knight there and it is a monster. And before your own plan, ask what your opponent wants to do, and stop it.","group":"more"},
  {"id":"B-l-convert-0","text":"The most painful loss: being a piece up and still not winning. Players rush, leave their king open, and the opponent finds counterplay.","group":"more"},
  {"id":"B-l-convert-1","text":"When you are ahead, trade pieces, not pawns. Every trade makes your extra material count more. Keep your king safe, take away their counterplay, and never rush. A slow win is still a win.","group":"more"}];
const DIR = __dirname;
const OUT = path.join(DIR, 'chess-voice-v4');
const KEY_FILE = path.join(DIR, '.elevenlabs-key-v4');
const MANIFEST = path.join(OUT, 'manifest.json');

function ask(q) {
  if (process.env.CHESS_ANSWER !== undefined) { console.log(q + process.env.CHESS_ANSWER); return Promise.resolve(process.env.CHESS_ANSWER); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim()); }));
}
const hash = t => crypto.createHash('sha1').update(VOICE_ID + t).digest('hex').slice(0, 12);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  if (fs.existsSync(KEY_FILE)) return fs.readFileSync(KEY_FILE, 'utf8').trim();
  console.log('Paste your ElevenLabs API key (elevenlabs.io > Profile > API Keys).');
  const k = await ask('API key: ');
  if (!k) { console.log('No key entered.'); process.exit(1); }
  fs.writeFileSync(KEY_FILE, k);
  console.log('Saved the key next to this script so you will not be asked again.\n');
  return k;
}

async function credits(key) {
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } });
    if (r.status === 401) { try { fs.unlinkSync(KEY_FILE); } catch (e) { } console.log('That API key was rejected. Run again and paste a valid key.'); process.exit(1); }
    if (!r.ok) return null;
    const j = await r.json();
    return j.character_limit - j.character_count;
  } catch (e) { return null; }
}

async function tts(key, text) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: MODEL_ID })
    });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const body = await r.text();
    if (r.status === 429 && !/quota/i.test(body)) { await sleep(1500 * attempt); continue; }
    if (r.status >= 500) { await sleep(1500 * attempt); continue; }
    const e = new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
    e.kind = /quota_exceeded|insufficient|not enough credits/i.test(body) ? 'credits'
      : /missing_permissions/i.test(body) ? 'permission'
      : (r.status === 402 || /library|payment_required|subscription|upgrade/i.test(body)) ? 'voice'
      : r.status === 401 ? 'key' : 'other';
    throw e;
  }
  throw new Error('Too many retries');
}

function zip() {
  const zipPath = path.join(DIR, 'chess-voice-v4.zip');
  try { fs.unlinkSync(zipPath); } catch (e) { }
  try {
    if (process.platform === 'win32') execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${OUT}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'ignore' });
    else execSync(`cd "${OUT}" && zip -qr "${zipPath}" .`, { stdio: 'ignore' });
    return zipPath;
  } catch (e) { return null; }
}

(async () => {
  if (typeof fetch !== 'function') { console.log('Please install Node.js 18 or newer from https://nodejs.org'); process.exit(1); }
  console.log('\n  Chess Ascent  ·  coach voice generator\n');
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const key = await getKey();
  const left = await credits(key);

  const todo = LINES.filter(l => !(manifest[l.id] === hash(l.text) && fs.existsSync(path.join(OUT, l.id + '.mp3'))));
  const chars = todo.reduce((s, l) => s + l.text.length, 0);
  const rate = 1; // eleven_v4: one credit per character
  if (todo.length) console.log(`  Voice: ${VOICE_NAME}\n  Model: Eleven v4`);
  const cost = arr => Math.ceil(arr.reduce((s, l) => s + l.text.length, 0) * rate);
  let plan = todo;
  // Core lines first; opening notes only if the credits cover them.
  if (left != null && cost(todo) > left) {
    plan = todo.filter(l => l.group !== 'openings');
    if (cost(plan) > left) {
      const sorted = []; let sum = 0;
      for (const l of plan) { const c = Math.ceil(l.text.length * rate); if (sum + c > left - 50) break; sorted.push(l); sum += c; }
      plan = sorted;
    }
  }
  const done = LINES.length - todo.length;
  console.log(`  Clips already made: ${done}/${LINES.length}`);
  if (left != null) console.log(`  Credits available:  ${left}`);
  if (!plan.length) {
    console.log(todo.length ? '\n  Not enough credits for the next clip.' : '\n  Everything is already generated.');
  } else {
    if (plan.length < todo.length) console.log(`  Not enough credits for everything: making the ${plan.length} most important clips now (opening notes last). Run again after topping up to finish.`);
    const ans = await ask(`\n  Generate ${plan.length} clips for about ${cost(plan)} credits? [Y/n] `);
    if (/^n/i.test(ans)) process.exit(0);
    // Probe the first clip alone so a voice/permission problem is caught before anything else runs.
    let i = 0, ok = 0, stop = false;
    async function one(l) {
      try { return await tts(key, l.text); }
      catch (e) {
        throw e;
      }
    }
    try {
      const buf = await one(plan[0]);
      fs.writeFileSync(path.join(OUT, plan[0].id + '.mp3'), buf);
      manifest[plan[0].id] = hash(plan[0].text); ok++; i = 1;
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
    } catch (e) {
      console.log('\n  ElevenLabs refused the request:\n  ' + e.message);
      if (e.kind === 'voice') console.log('\n  ElevenLabs will not let this account use this voice through the API. Nothing was charged.\n  On the free plan, voices from the Voice Library cannot be used through the API: a Starter plan fixes this,\n  or use a voice you designed or cloned yourself in this account.');
      if (e.kind === 'permission') console.log('\n  Your API key needs the "Text to Speech" permission. Edit the key on elevenlabs.io (or make a new one with it), delete the .elevenlabs-key file here, and run again.');
      if (e.kind === 'credits') console.log('\n  Your account is out of credits for this month.');
      if (e.kind === 'key') { try { fs.unlinkSync(KEY_FILE); } catch (x) { } console.log('\n  The key was rejected. Run again and paste a valid key.'); }
      if (process.platform === 'win32') await ask('\n  Press Enter to close.');
      process.exit(1);
    }
    const worker = async () => {
      while (!stop && i < plan.length) {
        const l = plan[i++];
        try {
          const buf = await tts(key, l.text);
          fs.writeFileSync(path.join(OUT, l.id + '.mp3'), buf);
          manifest[l.id] = hash(l.text); ok++;
          fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
          process.stdout.write(`\r  ${ok}/${plan.length} done  `);
        } catch (e) {
          if (e.kind === 'credits') { if (!stop) console.log('\n  Out of credits. Progress is saved; run again later to continue.'); stop = true; }
          else console.log(`\n  Skipped ${l.id}: ${e.message}`);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    console.log('');
  }
  const z = zip();
  try { fs.writeFileSync(path.join(OUT, 'voice.txt'), VOICE_NAME + ' ' + VOICE_ID); } catch (e) { }
  console.log(z ? `\n  Ready: ${z}\n  Attach chess-voice-v4.zip in the Claude chat and the coach will start talking.\n`
    : `\n  Clips are in ${OUT}. Zip that folder and attach it in the Claude chat.\n`);
  if (process.platform === 'win32') await ask('  Press Enter to close.');
})();
