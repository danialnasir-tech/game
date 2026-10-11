// Fixed coach phrases, and the full list of voice lines the app can play.
var COACH_LINES = {
  welcome: 'Welcome to Chess Ascent. I am your coach. Pick where you are starting, and we will climb together.',
  correct: 'Correct!',
  notquite: 'Not quite. Try again.',
  notsafe: 'Careful. That move is not safe. Try again.',
  keepgoing: 'Good. Keep going.',
  allstars: 'All stars collected. Nice route!',
  lessondone: 'Lesson complete. Great work.',
  solved: 'Solved!',
  puzzlemiss: 'That is not the move. Look again.',
  best: 'Top move!',
  good: 'Good move.',
  inacc: 'Inaccuracy.',
  mistake: 'That is a mistake.',
  blunder: 'Blunder!',
  threatmate: 'Watch out. Your opponent threatens checkmate.',
  threatpiece: 'Careful. One of your pieces is under attack.',
  win: 'Checkmate. You win! Well played.',
  loss: 'Checkmate. I win this one. Let us review your mistakes.',
  draw: 'The game is a draw.',
  drillwrong: 'That is not the book move.',
  drillperfect: 'Perfect drill. You know this line.',
  drilldone: 'Drill complete. Run it again for a perfect score.',
  yourmove: 'Your move.'
};

function VOICE_LINES(data, opts) {
  opts = opts || {};
  var out = [];
  Object.keys(COACH_LINES).forEach(function (k) { out.push({ id: 'C-' + k, text: COACH_LINES[k], group: 'coach' }); });
  Object.keys(data.LESSONS).forEach(function (id) {
    data.LESSONS[id].steps.forEach(function (s, i) {
      out.push({ id: 'L-' + id + '-' + i, text: s.text, group: 'lessons' });
      if (s.done) out.push({ id: 'L-' + id + '-' + i + '-d', text: s.done, group: 'lessons' });
    });
  });
  data.PUZZLES.forEach(function (p) { out.push({ id: 'P-' + p.id, text: p.explain, group: 'puzzles' }); });
  data.OPENINGS.forEach(function (o) {
    out.push({ id: 'O-' + o.id + '-idea', text: o.name + '. ' + o.idea, group: 'openings' });
    o.notes.forEach(function (n, i) { out.push({ id: 'O-' + o.id + '-' + i, text: n, group: 'openings' }); });
  });
  return out;
}
if (typeof module !== 'undefined') module.exports = { COACH_LINES: COACH_LINES, VOICE_LINES: VOICE_LINES };

// ===== Variation pools: the app plays each line once before any repeats =====
var VARIANTS = {
  puzzle_start: ["Here's your next puzzle.", "New puzzle. Take your time.", "Alright, try this one.", "Let's see you crack this.", "Fresh puzzle. Look for forcing moves.", "Another one. You've got this.", "Here's a tricky one.", "Puzzle time. Scan the whole board.", "Okay, find the best move here.", "Next challenge.", "Let's warm up your tactics.", "This one's a good pattern to know."],
  puzzle_mate1: ["Mate in one. Find it.", "One move to checkmate.", "There's a mate in one here.", "Checkmate in a single move. Where?", "Finish the game in one move.", "One move. Checkmate. Go."],
  puzzle_mate2: ["Mate in two. Calculate carefully.", "Two moves to checkmate.", "Find the forced mate in two.", "Mate in two. Start with a forcing move.", "Two-move checkmate. Think it through.", "Can you find mate in two?"],
  lesson_next: ["Next step.", "On to the next one.", "Let's keep going.", "Here's the next idea.", "Moving on.", "Okay, next.", "Now try this.", "Building on that.", "Let's go a little further.", "Good. Next part."],
  welcome_back: ["Welcome back! Ready to train?", "Hey, good to see you again.", "You're back! Let's keep that streak alive.", "Welcome back. Today's missions are waiting.", "Nice to see you. Let's get better today.", "Hello again! Shall we start with a lesson?", "Back for more? I love it.", "Welcome back, champion.", "Good to have you here. Let's climb.", "Ready for today's training?"],
  mission_done: ["Mission complete!", "That's one mission done.", "Daily mission ticked off.", "Another mission finished.", "Nice, mission done.", "One more off today's list.", "Mission accomplished.", "Great, that mission's complete."],
  all_missions: ["All four missions done! Amazing day.", "Today's training is complete. Proud of you.", "Every mission finished. That's how you improve.", "Full day completed! See you tomorrow.", "All done for today. Great discipline.", "Perfect training day!"],
  best: [
    "That's the one. Exactly what I'd play.", "Beautiful. You found the top move.", "Oh, I like that a lot.", "Perfect choice. Clean and strong.",
    "Yes! That's precisely right.", "Spot on. Engines would agree with you.", "Now that is a grown-up move.", "Love it. Sharp and accurate.",
    "Brilliant. Nothing better on the board.", "That's textbook. Well done.", "You're seeing the board clearly right now.", "Strongest move available. Nice.",
    "Ooh, crisp. Keep playing like that.", "Excellent. You didn't waste a tempo.", "Precisely. That's master-level thinking.", "Bang on. I wouldn't change a thing.",
    "Lovely. You read that position perfectly.", "Top shelf. That's the best move.", "Great eye. That was the critical move.", "Flawless. Keep that focus."
  ],
  good: [
    "Solid move.", "That works nicely.", "Good, sensible play.", "Reasonable. Keep building.", "Nothing wrong with that.", "Fine choice. Steady progress.",
    "Healthy move. Your position stays safe.", "Decent. There was something a touch stronger, but this is fine.", "Good. You're keeping things under control.",
    "Sure, that does the job.", "Sound and practical.", "That's playable. Stay alert.", "Okay, good. Now watch their reply.", "Calm and correct. I approve.",
    "Respectable. You're on track.", "Neat little move.", "Smart enough. Keep it tidy.", "Nice and patient."
  ],
  inacc: [
    "Hmm, a little loose.", "Not ideal. There was something more precise.", "Slight slip there.", "That gives away a bit of your edge.",
    "A touch inaccurate. Look at the arrow.", "Close, but not quite the best.", "That's a small step backwards.", "Hmm. You had better.",
    "Playable, but you lose some momentum.", "A bit passive there.", "Not a disaster, just imprecise.", "That lets them breathe a little.",
    "Careful, small mistakes add up.", "You drifted slightly there.", "Mmm, not the sharpest option.", "That costs you a little."
  ],
  mistake: [
    "Ouch. That's a real mistake.", "Oh no, that hurts your position.", "Hmm, that one's going to cost you.", "Careful! That was a mistake.",
    "Ah, I wish you hadn't played that.", "That's a slip. Let's learn from it.", "Not good. Your opponent can punish that.", "Oof. That gives them the advantage.",
    "That move has a problem.", "Wait, wait. That was a mistake.", "Hmm, you rushed that one.", "That's going to sting a little.",
    "Uh oh. Stop and look at their reply.", "That hands them chances.", "You can do better than that.", "Mistake. Slow down before you click.",
    "Ah, that loosens everything.", "That's a costly one."
  ],
  blunder: [
    "Oh no! That's a blunder.", "Ooh, that's a big one.", "No, no, no! Take a breath.", "Yikes. That changes the whole game.",
    "Oh dear. That's a serious blunder.", "Ah! You just gave something away.", "Disaster. But we learn the most from these.", "Ouch, ouch, ouch.",
    "That's a heartbreaker.", "Whoa, hold on. That was a blunder.", "Oh, that's painful to watch.", "I felt that one. Big blunder.",
    "No! Look at what they can take now.", "That's the kind of move that loses games.", "Ah, I was afraid you'd play that.", "Big slip! Let's not do that again.",
    "Oh, that one's going straight into the review.", "Ugh. That's a blunder, my friend.", "Every player makes these. But let's stop making that one.", "Ohh. That was the one move to avoid."
  ],
  hang_p: ["You just left a pawn hanging.", "That pawn is free for them now.", "Watch out, you're dropping a pawn.", "A pawn is falling after that.", "That pawn has no protection anymore."],
  hang_n: ["Your knight is hanging!", "That knight is undefended now.", "You're giving away your knight.", "Nobody protects that knight.", "Your knight can simply be taken."],
  hang_b: ["Your bishop is hanging!", "That bishop has no defender.", "You're giving away a bishop.", "That bishop is just loose now.", "They can grab your bishop for free."],
  hang_r: ["Your rook is hanging!", "That rook is up for grabs.", "You're dropping a whole rook.", "That rook just lost its protection.", "They can take your rook now."],
  hang_q: ["Your queen is hanging!", "Your queen! She's unprotected!", "You're about to lose your queen.", "Nobody is guarding the queen.", "That queen can be captured. Ouch."],
  missed_n: ["You could have won a knight there.", "There was a free knight on the board.", "A knight was yours for the taking."],
  missed_b: ["You missed a free bishop.", "There was a bishop to win.", "A bishop was sitting there undefended."],
  missed_r: ["You could have grabbed a rook!", "There was a whole rook to win.", "Free rook missed. Look at the arrow."],
  missed_q: ["You could have won the queen!", "The queen was there for the taking.", "Oh, you missed their queen!"],
  missed_mate: ["You had checkmate! Look at the arrow.", "There was a forced mate there.", "Mate was on the board! Always look at checks first.", "You missed a winning combination.", "So close. You had a checkmate.", "Checks first! There was mate."],
  allows_mate: ["That allows a mating attack.", "Careful, now they can checkmate you.", "Your king is in serious danger after that.", "That opens the door to mate.", "Your king just lost its shelter.", "That walks into a mating net."],
  stronger: ["There was a stronger move. Check the green arrow.", "Look at the arrow. That was better.", "The arrow shows what I'd have played.", "Compare it with the arrow move.", "Here's the better idea, on the board.", "The green arrow was the key move.", "See the arrow? That's the improvement.", "Better was the arrow move. Study why."],
  castle: ["Castling. Your king says thank you.", "King tucked away. Smart.", "Safety first. Lovely castle.", "Good habit. Castle early, castle often.", "Your rook joins the game too. Nice.", "King's safe. Now the fun starts.", "That's how strong players do it.", "Castled. One less thing to worry about.", "Great timing on the castle.", "Safe king, happy coach."],
  develop: ["Developing a piece. Exactly right.", "Get those pieces out. Good.", "Nice development.", "Another piece joins the fight.", "That's how you start a game.", "Pieces out before attacking. Perfect.", "Good, your army is waking up.", "Developing toward the centre. Great.", "Every piece counts. Nice.", "Smooth development."],
  capture: ["Nice capture.", "Good trade.", "Material in the bank.", "Grab it. Well spotted.", "Thank you very much, we'll take that.", "Good catch.", "You saw that. Excellent.", "Clean capture."],
  check_given: ["Check! Keep the pressure on.", "Check. Make them squirm.", "Nice check.", "Check! Their king is uncomfortable.", "Pushing them back. Good check.", "Check. Now follow it up.", "Check! Forcing moves win games.", "Good, a forcing move."],
  check_received: ["Check! Deal with it calmly.", "You're in check. Breathe.", "Check on your king. Find the safest reply.", "They're coming after your king.", "Check! Block, move, or capture.", "Careful, your king is under fire."],
  coach_captures: ["I'll take that, thank you.", "Mine now.", "Sorry, I couldn't resist.", "That piece was loose, so I took it.", "Gotcha.", "I'll happily accept that.", "Thanks for the gift.", "Snap. Watch your loose pieces."],
  threat_mate: ["Danger! They're threatening checkmate.", "Stop! There's a mate threat.", "Look at your king. Mate is coming.", "Red alert, mate threat on the board.", "Defend now, they threaten mate.", "Your king needs help immediately.", "Watch out, checkmate is in the air.", "Before anything else, stop the mate."],
  threat_piece: ["Careful, something of yours is under attack.", "Check the red arrow. That piece is in danger.", "One of your pieces is about to fall.", "Heads up, you have a piece hanging.", "That red arrow is a threat. Deal with it.", "Don't ignore the attack on your piece.", "Something's loose. Save it.", "Your opponent is eyeing one of your pieces.", "Protect that piece, or move it.", "Threat! Look before you move."],
  correct: ["Correct!", "Yes, that's it!", "Exactly right.", "You've got it.", "Perfect.", "Nailed it.", "That's the one.", "Spot on!", "Right answer.", "Bingo.", "Well found!", "Lovely, that's correct.", "You saw it!", "That's right, nicely done.", "Excellent, correct.", "Great job.", "Yes! Clean solution.", "There you go.", "Absolutely right.", "Smart. That's it."],
  notquite: ["Not quite. Try again.", "Hmm, not that one.", "Close, but no.", "Have another look.", "That's not it. Think again.", "Nope. Look a little deeper.", "Not this time. Try once more.", "Hmm. What else is possible?", "Not the move I'm looking for.", "Almost. Keep searching.", "That doesn't work. Try again.", "Look again. Something's better.", "Mmm, no. Check the hint if you're stuck.", "Not quite right.", "Try a different idea.", "Wrong piece, maybe?", "Pause, and look at every check.", "That one fails. Try another.", "Keep looking. You'll find it.", "No, but you're thinking."],
  notsafe: ["That's not safe. Look at their reply.", "Careful, that loses something.", "Hmm, that walks into trouble.", "That leaves a weakness. Try again.", "Not safe yet. Think about their threats.", "That doesn't stop their idea."],
  keepgoing: ["Good, keep going.", "Nice. Next move.", "That's right. Continue.", "Yes. What's next?", "Great start. Finish it.", "Correct so far.", "Keep it up.", "Good. They replied. Your move.", "On track. Keep going.", "Nice. One more step."],
  solved: ["Solved!", "Puzzle cracked!", "You got it!", "Excellent solve.", "That's the solution.", "Boom. Solved.", "Brilliant, puzzle done.", "Great calculation.", "You found it.", "Another one down.", "Well solved!", "That's how it's done.", "Sharp eyes. Solved.", "Clean finish.", "Love it. Next one?", "Nicely calculated.", "Puzzle complete.", "That's a tactician's move.", "Correct! Your rating thanks you.", "Smooth."],
  puzzlemiss: ["That's not the move. Look again.", "Hmm, not quite.", "Nope. Try a forcing move.", "Not it. Checks, captures, threats.", "Close, but not the solution.", "Think about what's undefended.", "Not that. Look at the king.", "Mmm, try again.", "That doesn't work here.", "Keep looking. There's a trick.", "Not the answer. Breathe and scan.", "Try another candidate move.", "Wrong move, but don't give up.", "Almost. Look one move deeper.", "That gives them a way out.", "Look for the most forcing move."],
  hint: ["Here's a little nudge.", "Look at the highlighted piece.", "Try moving this one.", "Start with this piece.", "Hint: this piece is the hero.", "Focus here.", "This piece has the answer.", "Okay, a small clue for you.", "Look closely at this one.", "Here's where to begin."],
  allstars: ["All stars collected!", "Every star! Nice route.", "Star collector!", "Done. Great path.", "All of them. Well planned.", "Perfect collecting.", "Stars cleared!", "That's all of them."],
  lessondone: ["Lesson complete. Great work.", "And that's the lesson! Well done.", "Finished! You're getting stronger.", "Lesson done. Proud of you.", "Another skill unlocked.", "Excellent, lesson complete.", "That's one more lesson in the bank.", "Great session. On to the next.", "You've earned that one.", "Done and dusted.", "Fantastic work today.", "Lesson complete. Time for some puzzles?"],
  drillright: ["That's the book move.", "Right on the line.", "Correct, straight from theory.", "Yes, that's the main line.", "You know your stuff.", "Book move. Nice.", "Exactly what the masters play.", "Spot on, theory.", "That's the line.", "Memory looking good.", "Correct move order.", "Yes, keep following the line."],
  drillwrong: ["That's not the book move.", "Off the line there.", "Hmm, theory goes differently.", "Not the main line.", "That's not this opening.", "Close, but the book says otherwise.", "Remember the idea of this opening.", "Not quite the theory move.", "Wrong move order.", "That leaves the line. Try again.", "Think about the plan here.", "Hmm, not what the masters play."],
  drillperfect: ["Perfect drill! You know this line.", "Flawless. That opening is yours.", "No mistakes. Brilliant memory.", "Perfect run!", "Wow, clean all the way through.", "That's mastery right there.", "Perfect. You could play this in your sleep.", "Zero errors. Love it."],
  drilldone: ["Drill complete. Run it again for a perfect score.", "Done! A few slips, so let's repeat it.", "Finished. Once more for perfection?", "Good effort. Repetition builds memory.", "Drill done. You're getting closer.", "That's the line. Try it again cleanly.", "Nearly there. One more run.", "Complete. Next time, perfect."],
  gamestart: ["Let's play! Good luck.", "Alright, show me what you've got.", "New game. Take your time.", "Let's see your best chess.", "Here we go. Develop, castle, control the centre.", "Fresh board, fresh chances.", "Ready? Let's have a good game.", "I'm watching every move. Have fun.", "Let's do this.", "Game on!", "Remember: checks, captures, threats.", "Play slowly and think."],
  win: ["Checkmate! You win! Well played.", "You beat me! Fantastic.", "Victory! That was a great game.", "You got me. Brilliant finish.", "Checkmate! I'm impressed.", "That's a win! Your hard work is paying off.", "Wonderful game. You earned that.", "You won! Let's try a stronger level?", "Beautiful mate. Congratulations!", "Ha! You got me fair and square."],
  loss: ["Checkmate. I win this one. Let's review.", "That's mate. Don't worry, look at your mistakes.", "I got you this time. Rematch?", "Game over. Every loss is a lesson.", "Checkmate. Let's find where it went wrong.", "Tough game. You'll get me next time.", "That's mate. Review the red moves.", "I win this round. Keep your head up.", "Checkmate. Learn the pattern, and it won't happen again.", "Close one! Want a rematch?"],
  draw: ["It's a draw. Hard fought.", "Draw! Nobody could break through.", "Split the point. Not bad at all.", "A draw. Solid defending.", "That's a draw. Fair result.", "Draw. Next time, push for more.", "Even game. Well fought.", "A draw it is."],
  resign: ["You resigned. Let's go again.", "Okay, a fresh start then.", "No problem. Every game teaches something.", "Resigned. Shake it off, next game.", "Alright. Let's learn from that one.", "Fair enough. Rematch?"],
  takeback: ["Take back granted. Find a better move.", "Okay, try again.", "Second chance. Use it well.", "Rewound. Think it through.", "Let's try that again.", "Back it goes. What's the better idea?", "Fine, one more chance.", "Okay, look again carefully."]
};
function VARIANT_LINES() {
  var out = [];
  Object.keys(VARIANTS).forEach(function (cat) { VARIANTS[cat].forEach(function (t, i) { out.push({ id: 'V-' + cat + '-' + i, text: t, group: 'variants' }); }); });
  return out;
}
if (typeof module !== 'undefined') { module.exports.VARIANTS = VARIANTS; module.exports.VARIANT_LINES = VARIANT_LINES; }

// ===== Welcome tour (spoken once after onboarding, replayable from the Path) =====
var TOUR = [
  { sel: null, title: 'Welcome to Chess Ascent', text: "Hi, I'm your coach, and welcome to Chess Ascent! Let me show you around. It only takes a minute." },
  { sel: '#three', title: 'Your 3D board', text: "This is your board. Drag to spin it around, and scroll or pinch to zoom. To make a move, click a piece, then click the square you want." },
  { sel: '.board-tools', title: 'Board tools', text: "Up here you can flip the board, switch to a flat top view, replay whatever I just said, or put the camera back in place." },
  { sel: '.top-stats', title: 'Your daily stats', text: "Your daily missions, training rating and streak live up here. The microphone switches my voice on or off, and the speaker controls the sound effects." },
  { sel: '[data-go="path"]', title: 'The Path', text: "The Path is your course. Twenty-three lessons take you from your very first moves all the way to two-thousand-level ideas." },
  { sel: '[data-go="puzzles"]', title: 'Puzzles', text: "Puzzles sharpen your tactics. Solve one and your rating goes up. Miss it and it drops, so take your time and look for checks first." },
  { sel: '[data-go="openings"]', title: 'Openings', text: "In Openings you learn real repertoire lines, gambits and traps, with every move explained. Then you drill them until they're automatic." },
  { sel: '[data-go="play"]', title: 'Play the coach', text: "Coach is where we play a real game. I'll react to every move, warn you about threats, and tell you exactly what went wrong." },
  { sel: '[data-go="progress"]', title: 'Progress', text: "Progress shows your rating graph, your thirty-day calendar, and how your accuracy is improving." },
  { sel: '.mchips', title: 'Today\'s missions', text: "Every day you get four missions: one lesson, five puzzles, one opening drill, and one game with me. Do them daily and you'll feel the climb." },
  { sel: null, title: 'Ready?', text: "That's the tour! Let's start with today's lesson. I'll be right here with you." }
];
function TOUR_LINES() { return TOUR.map(function (t, i) { return { id: 'T-' + i, text: t.text, group: 'tour' }; }); }
if (typeof module !== 'undefined') { module.exports.TOUR = TOUR; module.exports.TOUR_LINES = TOUR_LINES; }

// ===== Spoken moves: "Knight to" + "f3" + "with check" =====
var MOVE_WORDS = (function () {
  var w = {};
  var names = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
  Object.keys(names).forEach(function (k) { w['to_' + k] = names[k] + ' to'; w['x_' + k] = names[k] + ' takes on'; });
  w.castle_k = 'Castle kingside.'; w.castle_q = 'Castle queenside.';
  w.check = 'with check.'; w.mate = 'and that is checkmate!'; w.promo = 'promoting to a queen.';
  'abcdefgh'.split('').forEach(function (f) { for (var r = 1; r <= 8; r++) w['sq_' + f + r] = f.toUpperCase() + r + '.'; });
  return w;
})();
var MOVE_POOLS = {
  better_was: ["The better move was", "Instead, the right move was", "You should have played", "Stronger was", "The best move here was", "Next time, look for", "The move I wanted was", "Here, the key move was", "A much better choice was", "The engine's choice was"],
  why_mate: ["Because it leads to checkmate.", "It forces mate.", "That one ends the game.", "It's a mating attack."],
  why_wins: ["It wins material.", "It grabs material for free.", "It picks up a piece.", "It wins something valuable."],
  why_check: ["It's a forcing check.", "A check that keeps the initiative.", "It drives their king back.", "The check gains you time."],
  why_safe: ["It keeps your pieces safe.", "It doesn't leave anything hanging.", "It avoids losing material.", "Everything stays protected."],
  why_castle: ["It gets your king to safety.", "Castling protects your king.", "King safety comes first."],
  why_develop: ["It develops a new piece.", "It brings another piece into the game.", "It improves your worst piece."],
  why_center: ["It fights for the centre.", "It grabs space in the middle.", "It controls key central squares."],
  why_general: ["It keeps your position stronger.", "It's the most precise move.", "It keeps the pressure on.", "It gives you the better game."],
  solution_intro: ["Here's the solution.", "Watch the solution.", "Here's how it works.", "Let me show you.", "Follow along."],
  retry_intro: ["Let's rewind. Try the green arrow move.", "Rewound. Now play the better move.", "Back you go. Find the stronger move.", "Okay, second chance. Look at the arrow."]
};
function MOVE_LINES() {
  var out = [];
  Object.keys(MOVE_WORDS).forEach(function (k) { out.push({ id: 'M-' + k, text: MOVE_WORDS[k], group: 'moves' }); });
  Object.keys(MOVE_POOLS).forEach(function (cat) { MOVE_POOLS[cat].forEach(function (t, i) { out.push({ id: 'V-' + cat + '-' + i, text: t, group: 'moves' }); }); });
  return out;
}
if (typeof module !== 'undefined') { module.exports.MOVE_WORDS = MOVE_WORDS; module.exports.MOVE_POOLS = MOVE_POOLS; module.exports.MOVE_LINES = MOVE_LINES; }

// ===== Batch 4: richer grading, in-game coaching, tip of the day =====
var MORE_POOLS = {
  brilliant: ["Brilliant! What a sacrifice!", "Wow. That's a brilliant move.", "Oh, that's gorgeous. Brilliant!", "You found a brilliant idea there!", "Stunning. That's a real master's move.", "Brilliant! I did not expect you to see that.", "Exclamation mark, double! Brilliant.", "Now that's the kind of move people remember."],
  great: ["Great move! The only one that works.", "That was the only good move, and you found it.", "Great find under pressure.", "Excellent defence. Only move!", "You found the one move that holds. Great.", "Great! Everything else was worse.", "Sharp. That was a must-find move.", "Clutch move. Well done."],
  excellent: ["Excellent move.", "Really strong choice.", "Excellent. Nearly perfect.", "Very well played.", "That's excellent chess.", "Top quality move.", "Excellent, keep it up.", "Super solid. Excellent.", "Great instinct there.", "That's how you play it."],
  book: ["Book move. That's opening theory.", "Straight out of the opening book.", "Theory! You know your openings.", "That's the main line.", "Classic opening move.", "Masters play that here.", "Right by the book.", "Opening theory. Lovely.", "Textbook opening play.", "That's a well-known line."],
  okay: ["That's okay. It works, but there was a little better.", "Fine, but you can squeeze out more.", "Not bad. Just not the most precise.", "It's playable. The arrow shows a slight improvement.", "Okay move. There was a sharper option.", "You're fine. A tiny bit better was possible.", "It's alright. Keep an eye out for stronger ideas.", "Reasonable, but not the top choice.", "That's acceptable. Could be better though.", "No harm done, but there was a better square."],
  comeback: ["What a comeback! You turned that around!", "Look at you, back in the game!", "From losing to winning. Incredible fight.", "Never give up, right? Great comeback."],
  tip_castle: ["Your king is still in the centre. Think about castling soon.", "Castle soon. A king in the middle is a target.", "Quick reminder: get your king safe. Castling is your friend."],
  tip_develop: ["You still have pieces at home. Bring them into the game.", "Develop your knights and bishops before you attack.", "Some of your pieces haven't moved yet. Wake them up."],
  tip_endgame: ["We're in the endgame now. Activate your king, it's a fighting piece.", "Endgame time. Push your passed pawns and centralise your king.", "Fewer pieces now. Your king should march towards the centre."],
  tip_ahead: ["You're ahead in material. Trade pieces, not pawns.", "You're winning material. Simplify and stay safe.", "Nice lead! Now trade down and avoid tricks."],
  tip_behind: ["You're down material. Stay calm and look for active play.", "Behind? Create threats and keep pieces on the board.", "Don't give up. Look for tactics and counterplay."],
  tip_opening: ["Control the centre with your pawns and pieces.", "Try not to move the same piece twice in the opening.", "Knights before bishops is a good rule of thumb.", "Connect your rooks by finishing development.", "Don't bring your queen out too early."],
  tip_middle: ["Find your worst piece and improve it.", "Before every move: checks, captures, threats.", "Look for pieces your opponent left undefended.", "Put your rooks on open files.", "Ask yourself what your opponent wants to do next.", "A knight on an outpost is a monster. Look for one.", "When in doubt, improve your position slowly."],
  tip_endgame_gen: ["Passed pawns must be pushed.", "In endgames, every tempo counts.", "Rooks belong behind passed pawns.", "Use your king actively. It's strong in the endgame."],
  tip_day: [
    "Tip of the day: before you move, look at every check, capture and threat. For both sides.",
    "Tip of the day: a knight on the rim is dim. Keep your knights near the centre.",
    "Tip of the day: castle early. A safe king lets you play freely.",
    "Tip of the day: when you're ahead, trade pieces, not pawns.",
    "Tip of the day: rooks love open files and the seventh rank.",
    "Tip of the day: don't grab pawns if it means falling behind in development.",
    "Tip of the day: in the endgame, your king becomes an attacking piece.",
    "Tip of the day: two bishops working together are a powerful weapon.",
    "Tip of the day: if you see a good move, sit on your hands and look for a better one.",
    "Tip of the day: most games under fifteen hundred are decided by hanging pieces. Protect yours.",
    "Did you know? The longest possible chess game is over five thousand moves.",
    "Did you know? The word checkmate comes from the Persian phrase meaning the king is helpless.",
    "Did you know? The queen used to be the weakest piece, moving only one square diagonally.",
    "Did you know? There are more possible chess games than atoms in the observable universe.",
    "Did you know? Castling was introduced to make games faster and more exciting."
  ]
};
function MORE_LINES(data) {
  var out = [];
  Object.keys(MORE_POOLS).forEach(function (cat) { MORE_POOLS[cat].forEach(function (t, i) { out.push({ id: 'V-' + cat + '-' + i, text: t, group: 'more' }); }); });
  Object.keys(data.LESSONS).forEach(function (id) {
    var L = data.LESSONS[id];
    if (L.takeaways) out.push({ id: 'K-' + id, text: 'Key takeaways. ' + L.takeaways.join(' '), group: 'more' });
  });
  return out;
}
if (typeof module !== 'undefined') { module.exports.MORE_POOLS = MORE_POOLS; module.exports.MORE_LINES = MORE_LINES; }

// ===== Batch 5: review, practice, rewards, rush =====
Object.assign(MORE_POOLS, {
  review_intro: ["Let's review the game together.", "Okay, game review time. Let's see what happened.", "Let's look back at that game. This is where you improve fastest.", "Time for the review. I'll show you the key moments.", "Let's break that game down."],
  review_moment: ["Here's where it turned.", "This is the key moment.", "Look at this position closely.", "Here, the game changed.", "This one decided a lot.", "Stop here. This is important."],
  practice_start: ["Let's practise the positions where you went wrong.", "Same positions, second chance. Find the better move.", "Practice time. Turn those mistakes into lessons.", "Let's fix those moments. Your move."],
  practice_good: ["Yes! That's the fix.", "Much better. Lesson learned.", "There it is. You won't miss that again.", "Exactly. That's how to handle it.", "Got it. Great improvement.", "Perfect. That's the move."],
  practice_retry: ["Not that one. Look again.", "Still not it. Think about their threats.", "Hmm, try another idea.", "Close. Look for something more forcing.", "Not yet. Checks, captures, threats."],
  badge: ["New badge unlocked!", "You earned a badge. Nice!", "Badge unlocked. Keep collecting!", "Achievement unlocked!", "Look at that, a new badge.", "Another badge for your collection."],
  level_up: ["Level up! You're getting stronger.", "You just levelled up!", "New level reached. Fantastic progress.", "Level up! The climb continues.", "Up you go! New level."],
  stage_done: ["Stage complete! That's a huge milestone.", "You finished the whole stage. I'm proud of you.", "Stage cleared! On to the next level of the climb.", "That's a full stage done. Amazing work."],
  unlock: ["You've unlocked openings and coach games. Let's play!", "New areas unlocked. Openings and games against me are open now."],
  rush_start: ["Puzzle Rush! Three minutes. Go, go, go!", "Rush mode. Solve as many as you can!", "The clock is ticking. Let's rush!", "Speed round! Trust your instincts."],
  rush_end: ["Time! Let's see your score.", "That's the rush! Great effort.", "Rush over. Can you beat that next time?", "Phew! Nice speed solving."]
});
