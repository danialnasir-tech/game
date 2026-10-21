// Rewrites "simply grabs an undefended piece" explanations that are not true: when the taken piece is defended,
// the explanation shows the real line instead. Also makes "Take the free X" titles honest. Run once, then rebuild lessons2.
const fs = require('fs'), Game = require('../chesscore.js')(), E = require('../engine.js')(Game);
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }, VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
function fix(file) {
  let src = fs.readFileSync(file, 'utf8'), n = 0, ok = 0;
  src = src.replace(/\{"id":"[^"]+","title":"[^"]*","theme":"[^"]*","r":\d+,"fen":"[^"]+","sol":\[[^\]]*\],"explain":"[^"]*simply grabs an undefended piece[^"]*"\}/g, function (s) {
    const p = JSON.parse(s), g = new Game(p.fen), mv = g.move(p.sol[0]); if (!mv) return s;
    const defended = g.moves().some(m => m.to === mv.to);
    const tail = (/You come out [^.]*\./.exec(p.explain) || [''])[0];
    const g0 = new Game(p.fen), guarded = g0.attacked(Game.sqIdx(mv.to), g0.side ^ 8);
    if (!defended && guarded) { ok++; p.title = 'Win material'; p.explain = mv.san + ' wins the ' + NAME[mv.captured] + '. It looks guarded, but nothing can safely take back on ' + mv.to + '. ' + tail; return JSON.stringify(p); }
    if (!defended) { ok++; p.title = p.title.replace(/^Take the free (\w+)$/, 'Find the free $1'); return JSON.stringify(p); }
    n++;
    const cap = NAME[mv.captured], mover = NAME[mv.piece], A = function (w) { return (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w; };
    if (VAL[mv.captured] > VAL[mv.piece]) p.explain = mv.san + ' wins material. The ' + cap + ' is defended, but even if they take back you have traded ' + A(mover) + ' for ' + A(cap) + '. That is ' + (VAL[mv.captured] - VAL[mv.piece]) + ' points in your favour.';
    else { const ln = E.line(p.fen, 4, 6, 900).map(x => x.san); p.explain = mv.san + ' works even though the ' + cap + ' is defended. The best play goes ' + ln.join(' ') + ', and you come out ahead.'; }
    p.title = 'Win material';
    return JSON.stringify(p);
  });
  fs.writeFileSync(file, src); console.log(file, 'fixed', n, 'true already', ok);
}
['puzzles2.js', 'puzzles-starter.js', 'puzzles-themed.js'].forEach(f => fix(__dirname + '/../' + f));
