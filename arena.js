// ===== Practice Arena: bosses, "win this position" challenges, quick vision games =====
// One boss closes each stage. Beating it clears the stage. `book` = opening lines the boss likes to play
// (ids from OPENINGS, or 'def-<id>' for a defence line); the boss picks one that matches your first moves.
var BOSSES = [
  { id: 'rex', stage: 0, name: 'Rookie Rex', title: 'The Rookie', icon: 'p', color: '#4cc9f0', level: 'novice', book: ['def-italian', 'anti-scholar'],
    intro: 'Rex knows how the pieces move and not much more. He leaves pieces hanging. Take them and checkmate him.' },
  { id: 'tess', stage: 1, name: 'Trapper Tess', title: 'The Trapper', icon: 'n', color: '#ff4f8b', level: 'club', book: ['stafford', 'blackburne-shilling', 'englund', 'def-fried-liver'],
    intro: 'Tess only plays traps: the Stafford, the Shilling Gambit and the Englund. Spot the trick, refute it, and win the game.' },
  { id: 'tao', stage: 2, name: 'Tactics Tao', title: 'The Tactician', icon: 'b', color: '#ffd23f', level: 'strong', book: ['sicilian-dragon', 'def-kings-gambit', 'def-evans', 'def-danish'],
    intro: 'Tao loves sharp positions and forcing moves. Check every capture and every check before you move.' },
  { id: 'greta', stage: 3, name: 'Grinder Greta', title: 'The Grinder', icon: 'r', color: '#3ddc97', level: 'expert', fen: '8/8/3k4/4p3/P1K1P3/8/8/8 w - - 0 1', book: [],
    intro: 'Greta skips the opening. You start in an endgame with an outside passed pawn. Convert it against perfect defence.' },
  { id: 'gus', stage: 4, name: 'Grandmaster Gus', title: 'The Final Boss', icon: 'k', color: '#c9a36b', level: 'master', book: ['def-ruy', 'def-qgd', 'def-london', 'def-italian', 'french', 'caro'],
    intro: 'Gus plays at full strength with real grandmaster openings. Beat him and the course is complete.' }
];
// goal: 'mate' within `limit` of your moves, 'promote' a pawn within `limit`, or 'survive' `limit` moves without losing material.
var CHALLENGES = [
  { id: 'queen', title: 'Queen Finish', after: 'l-qmate', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', goal: 'mate', limit: 12, par: 9, level: 'master',
    text: 'King and queen against a lone king that defends perfectly. Checkmate within 12 moves, and never stalemate.' },
  { id: 'rook', title: 'Rook Roller', after: 'l-rookmate', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', goal: 'mate', limit: 20, par: 16, level: 'master',
    text: 'Push the king to the edge with your rook and mate it within 20 moves.' },
  { id: 'pawn', title: 'Pawn to Queen', after: 'l-king-pawn', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', goal: 'promote', limit: 7, par: 5, level: 'master',
    text: 'King in front of the pawn wins. Use the opposition and promote within 7 moves.' },
  { id: 'break', title: 'Breakthrough', after: 'l-kp', fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1', goal: 'promote', limit: 7, par: 5, level: 'master',
    text: 'Three pawns against three, and the kings are far away. Break through and make a queen within 7 moves.' },
  { id: 'lucena', title: 'Build the Bridge', after: 'l-rook-end', fen: '3K4/3P2k1/8/8/8/8/4r3/5R2 w - - 0 1', goal: 'promote', limit: 15, par: 10, level: 'master',
    text: 'The Lucena position. Shield your king from the checks with your rook and promote within 15 moves.' },
  { id: 'fort', title: 'Hold the Fort', after: 'l-rook-end', side: 'b', fen: '4k3/R7/1r6/3KP3/8/8/8/8 w - - 0 1', goal: 'survive', limit: 15, par: 15, level: 'master',
    text: 'You are Black in the Philidor position. Keep your rook on the third rank, check from behind when the pawn advances, and survive 15 moves.' }
];
// Quick games: 60 seconds each (Square Sprint 30), best score kept per game.
var VISION_GAMES = [
  { id: 'squares', name: 'Square Sprint', icon: 'p', secs: 30, blurb: 'Tap the named square. Fast board vision is the base of everything.' },
  { id: 'hanging', name: 'Hanging Hunt', icon: 'n', secs: 60, blurb: 'Tap every enemy piece you can win for free.' },
  { id: 'checks', name: 'Check Finder', icon: 'q', secs: 60, blurb: 'Play every move that gives check. Find them all.' },
  { id: 'knight', name: 'Knight Race', icon: 'n', secs: 60, blurb: 'Jump the knight to the star in as few moves as possible.' }
];
if (typeof module !== 'undefined') module.exports = { BOSSES: BOSSES, CHALLENGES: CHALLENGES, VISION_GAMES: VISION_GAMES };
