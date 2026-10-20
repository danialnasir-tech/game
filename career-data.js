// Career mode: what Coach Leo and the townsfolk say in Ascent Town. Shared with the voice kit (ids W-...).
var CAREER_TEXT = {
  welcome: 'Welcome to Ascent Town! I am Coach Leo. Every building here trains one part of your game. Learn at my Academy, then prove it against the rivals at the Arena. Beat them all, and the town is yours.',
  welcome_back: 'Good to see you back in town. Your next step is marked with the gold star. Follow it.',
  lesson_go: 'Your next lesson is ready at the Academy. Step inside when you are.',
  boss_ready: 'You have learned enough for this chapter. Your rival is waiting at the Arena. Go and beat them.',
  all_done: 'You have beaten every rival in town. Keep your edge sharp: a daily puzzle at the Tower, and real games at the Park.',
  hint_tap: 'Tap anywhere to walk there. Tap a building or a person to go and talk to them. Drag to look around.',
  hint_keys: 'Walk with W A S D or the arrow keys, or click anywhere. Drag to look around. Press E to enter or talk.',
  pawns_intro: 'Five golden pawns are hidden around town every day. Find them all for bonus points.',
  pawns_all: 'All five golden pawns found today! Here is your bonus.',
  ch0: 'Chapter one: Foundations. Every champion starts here. Learn how the pieces move, then beat Rookie Rex.',
  ch1: 'Chapter two: Stop Losing Pieces. Count, defend, and take what is free. Trapper Tess is waiting with her tricks.',
  ch2: 'Chapter three: Tactical Weapons. Forks, pins and skewers. Tactics Tao will test every move you make.',
  ch3: 'Chapter four: Endgames and Structure. Grinder Greta wins long games. Learn to finish what you start.',
  ch4: 'Chapter five: Mastery. Only Grandmaster Gus stands between you and the top of Ascent Town.',
  boss_rex: 'Hey! I am Rookie Rex. I just learned how the knight moves. Want a game?',
  boss_tess: 'Trapper Tess. Careful where you step. Every opening I play has a trap in it.',
  boss_tao: 'Tactics Tao. I calculate everything. Show me you can too.',
  boss_greta: 'Grinder Greta. We skip the opening and go straight to the endgame. Most people crack.',
  boss_gus: 'Grandmaster Gus. So, you climbed the whole town. Let us see if you belong at the top.',
  boss_locked: 'Not yet. Finish more lessons at the Academy first, then come back and face me.',
  boss_beaten: 'You beat me fair and square. Want a rematch?',
  tower: 'Puzzle Tower. A new daily puzzle every day, the same for everyone in the world.',
  library: 'The Opening Library. Every great game starts with a good plan in the first ten moves.',
  arena: 'The Arena. Rivals, challenge positions and speed games.',
  park: 'The Park. Play a full game against me, or against a friend on this phone.',
  home: 'Your home. Your progress, your 30-day plan and your chess.com games live here.'
};
var CAREER_LINES = Object.keys(CAREER_TEXT).map(function (k) { return { id: 'W-' + k, text: CAREER_TEXT[k], group: 'career' }; });
if (typeof module !== 'undefined') module.exports = { CAREER_TEXT: CAREER_TEXT, CAREER_LINES: CAREER_LINES };
