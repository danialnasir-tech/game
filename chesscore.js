// Compact 0x88 chess rules engine. Wrapped in a factory so it can be stringified into a Web Worker.
function CHESS_LIB() {
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var PC = '.pnbrqk';
  var N_OFF = [-33, -31, -18, -14, 14, 18, 31, 33];
  var B_OFF = [-17, -15, 15, 17];
  var R_OFF = [-16, -1, 1, 16];
  var K_OFF = [-17, -16, -15, -1, 1, 15, 16, 17];
  var P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6, BLACK = 8;

  // Zobrist hashing (two 32-bit halves) for the engine's transposition table and repetition checks
  var seed = 0x9E3779B9;
  function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
  var ZL = [], ZH = [], i0;
  for (i0 = 0; i0 < 16 * 128; i0++) { ZL.push(rnd()); ZH.push(rnd()); }
  var ZSL = rnd(), ZSH = rnd(), ZCL = [], ZCH = [], ZEL = [], ZEH = [];
  for (i0 = 0; i0 < 16; i0++) { ZCL.push(rnd()); ZCH.push(rnd()); }
  for (i0 = 0; i0 < 8; i0++) { ZEL.push(rnd()); ZEH.push(rnd()); }
  function sqName(s) { return 'abcdefgh'[s & 7] + (8 - (s >> 4)); }
  function sqIdx(n) {
    if (!n || n.length !== 2) return -1;
    var f = n.charCodeAt(0) - 97, r = 8 - (n.charCodeAt(1) - 48);
    if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
    return r * 16 + f;
  }

  function Game(fen) {
    this.board = new Array(128);
    if (!this.load(fen || START)) this.load(START);
  }

  Game.START = START;
  Game.sqName = sqName;
  Game.sqIdx = sqIdx;

  Game.prototype.load = function (fen) {
    var parts = String(fen).trim().split(/\s+/);
    if (parts.length < 2) parts.push('w');
    var rows = parts[0].split('/');
    if (rows.length !== 8) return false;
    var b = new Array(128).fill(0);
    var kings = [-1, -1];
    for (var r = 0; r < 8; r++) {
      var f = 0;
      for (var i = 0; i < rows[r].length; i++) {
        var ch = rows[r][i];
        if (/[1-8]/.test(ch)) { f += +ch; continue; }
        var lower = ch.toLowerCase();
        var t = PC.indexOf(lower);
        if (t < 1 || f > 7) return false;
        var color = ch === lower ? BLACK : 0;
        b[r * 16 + f] = color | t;
        if (t === K) kings[color ? 1 : 0] = r * 16 + f;
        f++;
      }
      if (f !== 8) return false;
    }
    this.board = b;
    this.kings = kings;
    this.side = parts[1] === 'b' ? BLACK : 0;
    var c = parts[2] || '-';
    this.castling = (c.indexOf('K') >= 0 ? 1 : 0) | (c.indexOf('Q') >= 0 ? 2 : 0) | (c.indexOf('k') >= 0 ? 4 : 0) | (c.indexOf('q') >= 0 ? 8 : 0);
    // sanitize castling rights against actual piece placement
    if (b[116] !== K || b[119] !== R) this.castling &= ~1;
    if (b[116] !== K || b[112] !== R) this.castling &= ~2;
    if (b[4] !== (BLACK | K) || b[7] !== (BLACK | R)) this.castling &= ~4;
    if (b[4] !== (BLACK | K) || b[0] !== (BLACK | R)) this.castling &= ~8;
    this.ep = parts[3] && parts[3] !== '-' ? sqIdx(parts[3]) : -1;
    this.half = parseInt(parts[4], 10) || 0;
    this.full = parseInt(parts[5], 10) || 1;
    this.stack = [];
    this.sanHist = [];
    this.keys = [this.key()];
    this.rehash();
    this.hist = [this.hl];
    return true;
  };
  Game.prototype.rehash = function () {
    var l = 0, h = 0;
    for (var s = 0; s < 120; s++) { if (s & 0x88) { s += 7; continue; } var p = this.board[s]; if (p) { l ^= ZL[p * 128 + s]; h ^= ZH[p * 128 + s]; } }
    if (this.side) { l ^= ZSL; h ^= ZSH; }
    l ^= ZCL[this.castling]; h ^= ZCH[this.castling];
    if (this.ep >= 0) { l ^= ZEL[this.ep & 7]; h ^= ZEH[this.ep & 7]; }
    this.hl = l; this.hh = h;
  };
  Game.prototype._z = function (p, s) { this.hl ^= ZL[p * 128 + s]; this.hh ^= ZH[p * 128 + s]; };
  Game.prototype._makeNull = function () {
    this.stack.push({ nul: true, ep: this.ep, hl: this.hl, hh: this.hh, half: this.half });
    if (this.ep >= 0) { this.hl ^= ZEL[this.ep & 7]; this.hh ^= ZEH[this.ep & 7]; }
    this.ep = -1; this.side ^= BLACK; this.hl ^= ZSL; this.hh ^= ZSH; this.half++;
    this.hist.push(this.hl);
  };
  Game.prototype._undoNull = function () {
    var u = this.stack.pop(); this.side ^= BLACK; this.ep = u.ep; this.hl = u.hl; this.hh = u.hh; this.half = u.half; this.hist.pop();
  };

  Game.prototype.key = function () {
    var f = this.fen().split(' ');
    return f[0] + ' ' + f[1] + ' ' + f[2] + ' ' + f[3];
  };

  Game.prototype.fen = function () {
    var s = '';
    for (var r = 0; r < 8; r++) {
      var e = 0;
      for (var f = 0; f < 8; f++) {
        var p = this.board[r * 16 + f];
        if (!p) { e++; continue; }
        if (e) { s += e; e = 0; }
        var ch = PC[p & 7];
        s += p & BLACK ? ch : ch.toUpperCase();
      }
      if (e) s += e;
      if (r < 7) s += '/';
    }
    var c = (this.castling & 1 ? 'K' : '') + (this.castling & 2 ? 'Q' : '') + (this.castling & 4 ? 'k' : '') + (this.castling & 8 ? 'q' : '');
    return s + ' ' + (this.side ? 'b' : 'w') + ' ' + (c || '-') + ' ' + (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.half + ' ' + this.full;
  };

  Game.prototype.turn = function () { return this.side ? 'b' : 'w'; };

  Game.prototype.get = function (n) {
    var s = typeof n === 'number' ? n : sqIdx(n);
    if (s < 0) return null;
    var p = this.board[s];
    return p ? { type: PC[p & 7], color: p & BLACK ? 'b' : 'w' } : null;
  };

  Game.prototype.boardArray = function () {
    var out = [];
    for (var r = 0; r < 8; r++) {
      var row = [];
      for (var f = 0; f < 8; f++) {
        var p = this.board[r * 16 + f];
        row.push(p ? { type: PC[p & 7], color: p & BLACK ? 'b' : 'w', square: sqName(r * 16 + f) } : null);
      }
      out.push(row);
    }
    return out;
  };

  // Is square s attacked by color `by` (0 or 8)?
  Game.prototype.attacked = function (s, by) {
    var b = this.board, i, t, o;
    if (by === 0) {
      t = s + 15; if (!(t & 0x88) && b[t] === P) return true;
      t = s + 17; if (!(t & 0x88) && b[t] === P) return true;
    } else {
      t = s - 15; if (!(t & 0x88) && b[t] === (BLACK | P)) return true;
      t = s - 17; if (!(t & 0x88) && b[t] === (BLACK | P)) return true;
    }
    for (i = 0; i < 8; i++) {
      t = s + N_OFF[i]; if (!(t & 0x88) && b[t] === (by | N)) return true;
      t = s + K_OFF[i]; if (!(t & 0x88) && b[t] === (by | K)) return true;
    }
    for (i = 0; i < 4; i++) {
      o = B_OFF[i]; t = s + o;
      while (!(t & 0x88)) {
        var p = b[t];
        if (p) { if (p === (by | B) || p === (by | Q)) return true; break; }
        t += o;
      }
      o = R_OFF[i]; t = s + o;
      while (!(t & 0x88)) {
        var q = b[t];
        if (q) { if (q === (by | R) || q === (by | Q)) return true; break; }
        t += o;
      }
    }
    return false;
  };

  Game.prototype.attackers = function (s, by) {
    // list of squares of pieces of color `by` attacking s
    var b = this.board, out = [], i, t, o;
    if (by === 0) {
      [15, 17].forEach(function (d) { var u = s + d; if (!(u & 0x88) && b[u] === P) out.push(u); });
    } else {
      [-15, -17].forEach(function (d) { var u = s + d; if (!(u & 0x88) && b[u] === (BLACK | P)) out.push(u); });
    }
    for (i = 0; i < 8; i++) {
      t = s + N_OFF[i]; if (!(t & 0x88) && b[t] === (by | N)) out.push(t);
      t = s + K_OFF[i]; if (!(t & 0x88) && b[t] === (by | K)) out.push(t);
    }
    for (i = 0; i < 4; i++) {
      o = B_OFF[i]; t = s + o;
      while (!(t & 0x88)) { var p = b[t]; if (p) { if (p === (by | B) || p === (by | Q)) out.push(t); break; } t += o; }
      o = R_OFF[i]; t = s + o;
      while (!(t & 0x88)) { var q = b[t]; if (q) { if (q === (by | R) || q === (by | Q)) out.push(t); break; } t += o; }
    }
    return out;
  };

  Game.prototype.inCheck = function (color) {
    var c = color === undefined ? this.side : color;
    var k = this.kings[c ? 1 : 0];
    if (k < 0) return false;
    return this.attacked(k, c ^ BLACK);
  };

  function mk(from, to, piece, captured, promo, flags) {
    return { f: from, t: to, piece: piece, captured: captured, promotion: promo, flags: flags };
  }

  Game.prototype._pseudo = function (capturesOnly) {
    var b = this.board, us = this.side, them = us ^ BLACK, moves = [];
    for (var s = 0; s < 120; s++) {
      if (s & 0x88) { s += 7; continue; }
      var p = b[s];
      if (!p || (p & BLACK) !== us) continue;
      var t = p & 7, i, to, q;
      if (t === P) {
        var dir = us ? 16 : -16;
        var promoRow = us ? 7 : 0;
        var startRow = us ? 1 : 6;
        to = s + dir;
        if (!capturesOnly && !(to & 0x88) && !b[to]) {
          if ((to >> 4) === promoRow) { 'qrbn'.split('').forEach(function (pr) { moves.push(mk(s, to, 'p', null, pr, 'n')); }); }
          else {
            moves.push(mk(s, to, 'p', null, null, 'n'));
            var to2 = to + dir;
            if ((s >> 4) === startRow && !b[to2]) moves.push(mk(s, to2, 'p', null, null, 'b'));
          }
        } else if (capturesOnly && !(to & 0x88) && !b[to] && (to >> 4) === promoRow) {
          moves.push(mk(s, to, 'p', null, 'q', 'n'));
        }
        for (i = -1; i <= 1; i += 2) {
          to = s + dir + i;
          if (to & 0x88) continue;
          q = b[to];
          if (q && (q & BLACK) === them) {
            if ((to >> 4) === promoRow) { (capturesOnly ? ['q'] : 'qrbn'.split('')).forEach(function (pr) { moves.push(mk(s, to, 'p', PC[q & 7], pr, 'c')); }); }
            else moves.push(mk(s, to, 'p', PC[q & 7], null, 'c'));
          } else if (to === this.ep) {
            moves.push(mk(s, to, 'p', 'p', null, 'e'));
          }
        }
        continue;
      }
      var name = PC[t];
      if (t === N || t === K) {
        var offs = t === N ? N_OFF : K_OFF;
        for (i = 0; i < 8; i++) {
          to = s + offs[i];
          if (to & 0x88) continue;
          q = b[to];
          if (!q) { if (!capturesOnly) moves.push(mk(s, to, name, null, null, 'n')); }
          else if ((q & BLACK) === them) moves.push(mk(s, to, name, PC[q & 7], null, 'c'));
        }
      } else {
        var dirs = t === B ? B_OFF : t === R ? R_OFF : K_OFF;
        for (i = 0; i < dirs.length; i++) {
          to = s + dirs[i];
          while (!(to & 0x88)) {
            q = b[to];
            if (!q) { if (!capturesOnly) moves.push(mk(s, to, name, null, null, 'n')); }
            else { if ((q & BLACK) === them) moves.push(mk(s, to, name, PC[q & 7], null, 'c')); break; }
            to += dirs[i];
          }
        }
      }
    }
    // castling
    if (!capturesOnly) {
      if (us === 0) {
        if ((this.castling & 1) && !b[117] && !b[118] && !this.attacked(116, them) && !this.attacked(117, them) && !this.attacked(118, them)) moves.push(mk(116, 118, 'k', null, null, 'k'));
        if ((this.castling & 2) && !b[115] && !b[114] && !b[113] && !this.attacked(116, them) && !this.attacked(115, them) && !this.attacked(114, them)) moves.push(mk(116, 114, 'k', null, null, 'q'));
      } else {
        if ((this.castling & 4) && !b[5] && !b[6] && !this.attacked(4, them) && !this.attacked(5, them) && !this.attacked(6, them)) moves.push(mk(4, 6, 'k', null, null, 'k'));
        if ((this.castling & 8) && !b[3] && !b[2] && !b[1] && !this.attacked(4, them) && !this.attacked(3, them) && !this.attacked(2, them)) moves.push(mk(4, 2, 'k', null, null, 'q'));
      }
    }
    return moves;
  };

  var PROMO = { q: Q, r: R, b: B, n: N };

  Game.prototype._make = function (m) {
    var b = this.board, us = this.side, them = us ^ BLACK;
    var undo = { m: m, castling: this.castling, ep: this.ep, half: this.half, full: this.full, cap: b[m.t], epCapSq: -1, hl: this.hl, hh: this.hh };
    var p = b[m.f];
    this._z(p, m.f);
    if (undo.cap) this._z(undo.cap, m.t);
    b[m.t] = p; b[m.f] = 0;
    if (m.flags === 'e') {
      var cs = m.t + (us ? -16 : 16);
      undo.cap = b[cs]; undo.epCapSq = cs; b[cs] = 0; this._z(undo.cap, cs);
    }
    if (m.promotion) b[m.t] = us | PROMO[m.promotion];
    this._z(b[m.t], m.t);
    if ((p & 7) === K) {
      this.kings[us ? 1 : 0] = m.t;
      if (m.flags === 'k') { b[m.t - 1] = b[m.t + 1]; b[m.t + 1] = 0; this._z(b[m.t - 1], m.t + 1); this._z(b[m.t - 1], m.t - 1); }
      else if (m.flags === 'q') { b[m.t + 1] = b[m.t - 2]; b[m.t - 2] = 0; this._z(b[m.t + 1], m.t - 2); this._z(b[m.t + 1], m.t + 1); }
      this.castling &= us ? ~12 : ~3;
    }
    if (m.f === 119 || m.t === 119) this.castling &= ~1;
    if (m.f === 112 || m.t === 112) this.castling &= ~2;
    if (m.f === 7 || m.t === 7) this.castling &= ~4;
    if (m.f === 0 || m.t === 0) this.castling &= ~8;
    if (this.castling !== undo.castling) { this.hl ^= ZCL[undo.castling] ^ ZCL[this.castling]; this.hh ^= ZCH[undo.castling] ^ ZCH[this.castling]; }
    if (undo.ep >= 0) { this.hl ^= ZEL[undo.ep & 7]; this.hh ^= ZEH[undo.ep & 7]; }
    this.ep = m.flags === 'b' ? (m.f + m.t) >> 1 : -1;
    if (this.ep >= 0) { this.hl ^= ZEL[this.ep & 7]; this.hh ^= ZEH[this.ep & 7]; }
    this.hl ^= ZSL; this.hh ^= ZSH;
    this.half = ((p & 7) === P || undo.cap) ? 0 : this.half + 1;
    if (us) this.full++;
    this.side = them;
    this.stack.push(undo);
    this.hist.push(this.hl);
  };

  Game.prototype._undo = function () {
    var u = this.stack.pop();
    if (!u) return null;
    this.hist.pop();
    var m = u.m, b = this.board;
    this.side ^= BLACK;
    var us = this.side;
    var p = b[m.t];
    if (m.promotion) p = us | P;
    b[m.f] = p;
    if (u.epCapSq >= 0) { b[m.t] = 0; b[u.epCapSq] = u.cap; }
    else b[m.t] = u.cap;
    if ((p & 7) === K) {
      this.kings[us ? 1 : 0] = m.f;
      if (m.flags === 'k') { b[m.t + 1] = b[m.t - 1]; b[m.t - 1] = 0; }
      else if (m.flags === 'q') { b[m.t - 2] = b[m.t + 1]; b[m.t + 1] = 0; }
    }
    this.castling = u.castling; this.ep = u.ep; this.half = u.half; this.full = u.full;
    this.hl = u.hl; this.hh = u.hh;
    return m;
  };

  Game.prototype._gen = function (capturesOnly) {
    var ps = this._pseudo(capturesOnly), out = [], us = this.side;
    for (var i = 0; i < ps.length; i++) {
      this._make(ps[i]);
      if (!this.inCheck(us)) out.push(ps[i]);
      this._undo();
    }
    return out;
  };

  Game.prototype._san = function (m, legal) {
    var s;
    if (m.flags === 'k') s = 'O-O';
    else if (m.flags === 'q') s = 'O-O-O';
    else {
      var to = sqName(m.t), from = sqName(m.f);
      if (m.piece === 'p') {
        s = (m.captured ? from[0] + 'x' : '') + to + (m.promotion ? '=' + m.promotion.toUpperCase() : '');
      } else {
        var amb = legal.filter(function (o) { return o.piece === m.piece && o.t === m.t && o.f !== m.f; });
        var dis = '';
        if (amb.length) {
          var sameFile = amb.some(function (o) { return (o.f & 7) === (m.f & 7); });
          var sameRank = amb.some(function (o) { return (o.f >> 4) === (m.f >> 4); });
          if (!sameFile) dis = from[0];
          else if (!sameRank) dis = from[1];
          else dis = from;
        }
        s = m.piece.toUpperCase() + dis + (m.captured ? 'x' : '') + to;
      }
    }
    this._make(m);
    if (this.inCheck()) s += this._gen().length ? '+' : '#';
    this._undo();
    return s;
  };

  function decorate(m, san, color) {
    return { from: sqName(m.f), to: sqName(m.t), piece: m.piece, captured: m.captured || undefined, promotion: m.promotion || undefined, flags: m.flags, san: san, color: color, f: m.f, t: m.t };
  }

  Game.prototype.moves = function (opts) {
    var legal = this._gen(), self = this, color = this.turn();
    var sq = opts && opts.square ? sqIdx(opts.square) : -1;
    var list = sq >= 0 ? legal.filter(function (m) { return m.f === sq; }) : legal;
    return list.map(function (m) { return decorate(m, self._san(m, legal), color); });
  };

  function clean(s) { return String(s).replace(/[+#!?]/g, '').replace(/0/g, 'O'); }

  Game.prototype.move = function (mv) {
    var legal = this._gen(), found = null, self = this;
    if (typeof mv === 'string') {
      var u = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(mv);
      if (u) mv = { from: u[1], to: u[2], promotion: u[3] };
    }
    if (typeof mv === 'string') {
      var target = clean(mv);
      for (var i = 0; i < legal.length; i++) {
        if (clean(this._san(legal[i], legal)) === target) { found = legal[i]; break; }
      }
      if (!found) { // tolerate missing '=' in promotions, e.g. e8Q
        for (var j = 0; j < legal.length; j++) {
          if (clean(this._san(legal[j], legal)).replace('=', '') === target.replace('=', '')) { found = legal[j]; break; }
        }
      }
    } else if (mv) {
      var f = sqIdx(mv.from), t = sqIdx(mv.to);
      var cands = legal.filter(function (m) { return m.f === f && m.t === t; });
      if (cands.length > 1) found = cands.filter(function (m) { return m.promotion === (mv.promotion || 'q'); })[0];
      else found = cands[0] || null;
    }
    if (!found) return null;
    var color = this.turn();
    var san = this._san(found, legal);
    this._make(found);
    this.sanHist.push(san);
    this.keys.push(this.key());
    return decorate(found, san, color);
  };

  Game.prototype.undo = function () {
    if (!this.stack.length) return null;
    var color = this.side ? 'w' : 'b';
    var m = this._undo();
    var san = this.sanHist.pop();
    this.keys.pop();
    return decorate(m, san, color);
  };

  Game.prototype.history = function () { return this.sanHist.slice(); };
  Game.prototype.inCheckmate = function () { return this.inCheck() && this._gen().length === 0; };
  Game.prototype.inStalemate = function () { return !this.inCheck() && this._gen().length === 0; };
  Game.prototype.insufficient = function () {
    var minors = 0, others = 0;
    for (var s = 0; s < 120; s++) {
      if (s & 0x88) { s += 7; continue; }
      var t = this.board[s] & 7;
      if (!t || t === K) continue;
      if (t === N || t === B) minors++; else others++;
    }
    return others === 0 && minors <= 1;
  };
  Game.prototype.threefold = function () {
    var k = this.keys[this.keys.length - 1], n = 0;
    for (var i = 0; i < this.keys.length; i++) if (this.keys[i] === k) n++;
    return n >= 3;
  };
  Game.prototype.isDraw = function () { return this.half >= 100 || this.inStalemate() || this.insufficient() || this.threefold(); };
  Game.prototype.gameOver = function () { return this._gen().length === 0 || this.isDraw(); };

  return Game;
}
if (typeof module !== 'undefined') module.exports = CHESS_LIB;
