// Coach engine: alpha-beta + quiescence with piece-square tables. Factory so it can run in a Worker.
function ENGINE_FACTORY(Game) {
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  var TV = [0, 100, 320, 330, 500, 900, 0];
  var PST = [
    null,
    [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
    [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
  ];
  var KEND = [-50,-40,-30,-20,-20,-30,-40,-50,-30,-20,-10,0,0,-10,-20,-30,-30,-10,20,30,30,20,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,20,30,30,20,-10,-30,-30,-30,0,0,0,0,-30,-30,-50,-30,-30,-30,-30,-30,-30,-50];
  var MATE = 100000, INF = 1e9;

  // static eval from side-to-move perspective
  function evaluate(g) {
    var b = g.board, s = 0, mat = 0, i, p, t, idx, bw = 0, bb = 0;
    for (i = 0; i < 120; i++) {
      if (i & 0x88) { i += 7; continue; }
      p = b[i]; if (!p) continue;
      t = p & 7;
      if (t !== 1 && t !== 6) mat += TV[t];
    }
    var endgame = mat <= 2600;
    for (i = 0; i < 120; i++) {
      if (i & 0x88) { i += 7; continue; }
      p = b[i]; if (!p) continue;
      t = p & 7;
      var row = i >> 4, col = i & 7;
      idx = p & 8 ? (7 - row) * 8 + col : row * 8 + col;
      var v = TV[t] + (t === 6 && endgame ? KEND[idx] : PST[t][idx]);
      if (t === 3) { if (p & 8) bb++; else bw++; }
      s += p & 8 ? -v : v;
    }
    s += mobility(b);
    if (bw >= 2) s += 30;
    if (bb >= 2) s -= 30;
    s += structure(b, endgame);
    return g.side ? -s : s;
  }


  // Piece mobility (white minus black): active pieces are worth more
  var MOB_W = [0, 0, 4, 4, 2, 1, 0], MOB_C = [0, 0, 4, 6, 6, 12, 0];
  var N_D = [-33, -31, -18, -14, 14, 18, 31, 33], B_D = [-17, -15, 15, 17], R_D = [-16, -1, 1, 16], Q_D = [-17, -16, -15, -1, 1, 15, 16, 17];
  function mobility(b) {
    var s = 0;
    for (var i = 0; i < 120; i++) {
      if (i & 0x88) { i += 7; continue; }
      var p = b[i]; if (!p) continue;
      var t = p & 7; if (t < 2 || t > 5) continue;
      var col = p & 8, n = 0, d, to, q, k;
      if (t === 2) { for (k = 0; k < 8; k++) { to = i + N_D[k]; if (!(to & 0x88)) { q = b[to]; if (!q || (q & 8) !== col) n++; } } }
      else {
        d = t === 3 ? B_D : t === 4 ? R_D : Q_D;
        for (k = 0; k < d.length; k++) { to = i + d[k]; while (!(to & 0x88)) { q = b[to]; if (!q) n++; else { if ((q & 8) !== col) n++; break; } to += d[k]; } }
      }
      var v = (n - MOB_C[t]) * MOB_W[t];
      s += col ? -v : v;
    }
    return s;
  }

  // Pawn structure, passed pawns, rook files and king shelter (white minus black)
  var PASSED = [0, 10, 15, 25, 45, 75, 120, 0];
  function structure(b, endgame) {
    var wp = [[], [], [], [], [], [], [], []], bp = [[], [], [], [], [], [], [], []], i, f, r, s = 0, wk = -1, bk = -1, rooks = [];
    for (i = 0; i < 120; i++) {
      if (i & 0x88) { i += 7; continue; }
      var p = b[i]; if (!p) continue;
      f = i & 7; r = 7 - (i >> 4); // r: 0 = rank 1
      if (p === 1) wp[f].push(r); else if (p === 9) bp[f].push(r);
      else if (p === 6) wk = i; else if (p === 14) bk = i;
      else if ((p & 7) === 4) rooks.push([p & 8, f]);
    }
    for (f = 0; f < 8; f++) {
      if (wp[f].length > 1) s -= 14 * (wp[f].length - 1);
      if (bp[f].length > 1) s += 14 * (bp[f].length - 1);
      var wIso = wp[f].length && !(f > 0 && wp[f - 1].length) && !(f < 7 && wp[f + 1].length);
      var bIso = bp[f].length && !(f > 0 && bp[f - 1].length) && !(f < 7 && bp[f + 1].length);
      if (wIso) s -= 12 * wp[f].length;
      if (bIso) s += 12 * bp[f].length;
      wp[f].forEach(function (rk) {
        var blocked = false;
        for (var ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1); ff++) bp[ff].forEach(function (br) { if (br > rk) blocked = true; });
        if (!blocked) s += PASSED[rk] * (endgame ? 1.6 : 1);
      });
      bp[f].forEach(function (rk) {
        var blocked = false;
        for (var ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1); ff++) wp[ff].forEach(function (wr) { if (wr < rk) blocked = true; });
        if (!blocked) s -= PASSED[7 - rk] * (endgame ? 1.6 : 1);
      });
    }
    rooks.forEach(function (rk) {
      var own = rk[0] ? bp[rk[1]] : wp[rk[1]], opp = rk[0] ? wp[rk[1]] : bp[rk[1]];
      var bonus = !own.length ? (!opp.length ? 22 : 11) : 0;
      s += rk[0] ? -bonus : bonus;
    });
    if (!endgame) {
      if (wk >= 0) { var wf = wk & 7, wr = 7 - (wk >> 4), sh = 0; if (wr <= 1) for (f = Math.max(0, wf - 1); f <= Math.min(7, wf + 1); f++) if (wp[f].some(function (x) { return x === wr + 1 || x === wr + 2; })) sh++; s += sh * 9; }
      if (bk >= 0) { var bf = bk & 7, br2 = 7 - (bk >> 4), sh2 = 0; if (br2 >= 6) for (f = Math.max(0, bf - 1); f <= Math.min(7, bf + 1); f++) if (bp[f].some(function (x) { return x === br2 - 1 || x === br2 - 2; })) sh2++; s -= sh2 * 9; }
    }
    return s;
  }

  var nodes = 0, deadline = Infinity, aborted = false;

  // ---- Transposition table (typed arrays, 2^19 entries ≈ 7 MB) ----
  var TT_BITS = 19, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  var ttKey, ttScore, ttMove, ttDepth, ttFlag; // flag 0 empty, 1 exact, 2 lower, 3 upper (allocated on first search)
  function ensureTT() {
    if (ttKey) return;
    ttKey = new Int32Array(TT_SIZE); ttScore = new Int32Array(TT_SIZE); ttMove = new Int32Array(TT_SIZE);
    ttDepth = new Int8Array(TT_SIZE); ttFlag = new Uint8Array(TT_SIZE);
  }
  var PROMO_IDX = { q: 1, r: 2, b: 3, n: 4 };
  function enc(m) { return m.f | (m.t << 7) | ((m.promotion ? PROMO_IDX[m.promotion] : 0) << 14); }
  function ttStore(g, depth, score, flag, m, ply) {
    var i = g.hl & TT_MASK;
    if (ttFlag[i] && ttKey[i] === (g.hh | 0) && ttDepth[i] > depth && flag !== 1) return;
    if (score > MATE - 1000) score += ply; else if (score < -MATE + 1000) score -= ply;
    ttKey[i] = g.hh | 0; ttScore[i] = score; ttDepth[i] = depth; ttFlag[i] = flag; ttMove[i] = m ? enc(m) + 1 : 0;
  }
  function ttProbeIdx(g) { var i = g.hl & TT_MASK; return ttFlag[i] && ttKey[i] === (g.hh | 0) ? i : -1; }
  function ttScoreAt(i, ply) { var s = ttScore[i]; if (s > MATE - 1000) s -= ply; else if (s < -MATE + 1000) s += ply; return s; }

  // ---- Move ordering: hash move, captures (MVV-LVA), promotions, killers, history ----
  var killers = new Int32Array(128 * 2), hist = new Int32Array(128 * 128);
  function clearHeuristics() { killers.fill(0); for (var i = 0; i < hist.length; i++) hist[i] >>= 2; }
  function order(ms, ttm, ply) {
    var k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], e = enc(m) + 1, sc;
      if (e === ttm) sc = 1e8;
      else if (m.captured) sc = 1e7 + VAL[m.captured] * 10 - VAL[m.piece];
      else if (m.promotion) sc = 9e6 + VAL[m.promotion];
      else if (e === k1) sc = 8e6;
      else if (e === k2) sc = 7.9e6;
      else sc = hist[m.f * 128 + m.t];
      m._o = sc;
    }
    ms.sort(function (a, b) { return b._o - a._o; });
    return ms;
  }
  function tick() {
    nodes++;
    if ((nodes & 1023) === 0 && Date.now() > deadline) aborted = true;
  }
  function hasPieces(g) {
    var b = g.board, us = g.side;
    for (var i = 0; i < 120; i++) {
      if (i & 0x88) { i += 7; continue; }
      var p = b[i]; if (p && (p & 8) === us) { var t = p & 7; if (t > 1 && t < 6) return true; }
    }
    return false;
  }
  function isRepeat(g) {
    var h = g.hist, n = h.length - 1, key = g.hl, lim = Math.max(0, n - g.half);
    for (var i = n - 4; i >= lim; i -= 2) if (h[i] === key) return true;
    return false;
  }

  function qs(g, alpha, beta, depth) {
    tick(); if (aborted) return 0;
    var stand = evaluate(g);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (depth <= 0) return alpha;
    var us = g.side, ms = order(g._pseudo(true), 0, 127);
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (!m.promotion && stand + VAL[m.captured || 'p'] + 200 < alpha) continue; // delta pruning
      g._make(m);
      if (g.inCheck(us)) { g._undo(); continue; }
      var s = -qs(g, -beta, -alpha, depth - 1);
      g._undo();
      if (aborted) return 0;
      if (s >= beta) return s;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }

  function search(g, depth, alpha, beta, ply, allowNull) {
    tick(); if (aborted) return 0;
    if (ply > 0 && (g.half >= 100 || isRepeat(g) || g.insufficient())) return 0;
    var inChk = g.inCheck();
    if (inChk && ply < 30) depth++;
    if (depth <= 0) return qs(g, alpha, beta, 8);
    // mate distance pruning
    var mAlpha = Math.max(alpha, -MATE + ply), mBeta = Math.min(beta, MATE - ply - 1);
    if (mAlpha >= mBeta) return mAlpha;
    var pv = beta - alpha > 1;
    var ti = ttProbeIdx(g), ttm = 0;
    if (ti >= 0) {
      ttm = ttMove[ti];
      if (!pv && ttDepth[ti] >= depth) {
        var ts = ttScoreAt(ti, ply), tf = ttFlag[ti];
        if (tf === 1 || (tf === 2 && ts >= beta) || (tf === 3 && ts <= alpha)) return ts;
      }
    }
    var stat = inChk ? -INF : evaluate(g);
    if (!pv && !inChk) {
      // reverse futility: comfortably above beta at shallow depth
      if (depth <= 3 && Math.abs(beta) < MATE - 1000 && stat - 110 * depth >= beta) return stat;
      // null move
      if (allowNull && depth >= 3 && stat >= beta && Math.abs(beta) < MATE - 1000 && hasPieces(g)) {
        var R = depth >= 7 ? 3 : 2;
        g._makeNull();
        var ns = -search(g, depth - 1 - R, -beta, -beta + 1, ply + 1, false);
        g._undoNull();
        if (aborted) return 0;
        if (ns >= beta) return ns > MATE - 1000 ? beta : ns;
      }
    }
    // internal iterative deepening when no hash move on PV nodes
    if (!ttm && pv && depth >= 5) {
      search(g, depth - 2, alpha, beta, ply, false);
      if (aborted) return 0;
      ti = ttProbeIdx(g); if (ti >= 0) ttm = ttMove[ti];
    }
    var us = g.side, ms = order(g._pseudo(false), ttm, ply);
    var best = -INF, bestM = null, legal = 0, a0 = alpha;
    var futile = !pv && !inChk && depth <= 2 && stat + (depth === 1 ? 180 : 320) <= alpha;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      g._make(m);
      if (g.inCheck(us)) { g._undo(); continue; }
      legal++;
      var quiet = !m.captured && !m.promotion, givesChk = g.inCheck(), s;
      if (futile && quiet && !givesChk && legal > 1) { g._undo(); continue; }
      if (legal === 1) s = -search(g, depth - 1, -beta, -alpha, ply + 1, true);
      else {
        var red = 0;
        if (depth >= 3 && legal > 3 && quiet && !inChk && !givesChk && m._o < 7.9e6) {
          red = 1 + (legal > 8 ? 1 : 0) + (depth >= 8 && legal > 16 ? 1 : 0);
          if (pv) red--;
          if (red > depth - 2) red = depth - 2;
        }
        s = -search(g, depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
        if (s > alpha && red > 0) s = -search(g, depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (s > alpha && s < beta) s = -search(g, depth - 1, -beta, -alpha, ply + 1, true);
      }
      g._undo();
      if (aborted) return 0;
      if (s > best) { best = s; bestM = m; }
      if (s > alpha) alpha = s;
      if (alpha >= beta) {
        if (quiet) {
          var e = enc(m) + 1;
          if (killers[ply * 2] !== e) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = e; }
          hist[m.f * 128 + m.t] += depth * depth;
          if (hist[m.f * 128 + m.t] > 6e6) for (var h = 0; h < hist.length; h++) hist[h] >>= 1;
        }
        break;
      }
    }
    if (!legal) return inChk ? -MATE + ply : 0;
    ttStore(g, depth, best, best >= beta ? 2 : best > a0 ? 1 : 3, bestM, ply);
    return best;
  }

  // Score every root move. margin 0: just find the best move (PVS);
  // margin > 0: exact scores for moves within margin of the best (others are upper bounds).
  function rootSearch(fen, maxDepth, timeMs, margin, prevFens) {
    var g = new Game(fen);
    if (prevFens && prevFens.length) {
      var hs = [];
      for (var k = 0; k < prevFens.length; k++) { try { hs.push(new Game(prevFens[k]).hl); } catch (e) {} }
      g.hist = hs.concat(g.hist);
    }
    nodes = 0; aborted = false; deadline = Date.now() + (timeMs || 1500);
    ensureTT(); clearHeuristics();
    var root = g._gen();
    if (!root.length) return { moves: [], depth: 0 };
    var done = null, prevBest = 0;
    for (var d = 1; d <= maxDepth; d++) {
      order(root, prevBest, 0);
      var res = [], best = -INF;
      for (var i = 0; i < root.length; i++) {
        var s;
        g._make(root[i]);
        if (best === -INF) s = -search(g, d - 1, -INF, INF, 1, true);
        else if (!margin) {
          s = -search(g, d - 1, -best - 1, -best, 1, true);
          if (s > best && !aborted) s = -search(g, d - 1, -INF, -best, 1, true);
        } else {
          var lb = best - margin - 1;
          s = -search(g, d - 1, -INF, -lb, 1, true);
        }
        g._undo();
        if (aborted) break;
        res.push({ m: root[i], s: s });
        if (s > best) best = s;
      }
      if (aborted) {
        // keep a partial iteration only if it found a better move than the last full one
        if (!done && res.length) done = { list: res.sort(function (a, b) { return b.s - a.s; }), depth: d };
        else if (done && res.length) {
          res.sort(function (a, b) { return b.s - a.s; });
          if (res[0].m !== done.list[0].m && res[0].s > done.list[0].s) {
            var top = res[0];
            done.list = [top].concat(done.list.filter(function (r) { return r.m !== top.m; }));
          }
        }
        break;
      }
      res.sort(function (a, b) { return b.s - a.s; });
      done = { list: res, depth: d };
      prevBest = enc(res[0].m) + 1;
      if (res[0].s > MATE - 100 && d >= 2) break; // forced mate found
      if (Date.now() > deadline - (timeMs || 1500) * 0.45 && d >= 4) break; // next iteration would not finish
    }
    var list = done.list;
    return {
      depth: done.depth,
      nodes: nodes,
      moves: list.map(function (r) { return { from: Game.sqName(r.m.f), to: Game.sqName(r.m.t), promotion: r.m.promotion || null, captured: r.m.captured || null, piece: r.m.piece, score: r.s }; })
    };
  }

  function uciOf(m) { return m.from + m.to + (m.promotion || ''); }

  function pickMove(fen, level, prevFens) {
    // level: {depth, time, margin}
    var r = rootSearch(fen, level.depth, level.time, level.margin ? Math.max(level.margin, 1) : 0, prevFens);
    if (!r.moves.length) return null;
    var best = r.moves[0].score;
    var pool = level.margin ? r.moves.filter(function (m) { return m.score >= best - level.margin; }) : [r.moves[0]];
    // never randomly miss a mate or walk into one
    if (best > MATE - 100) pool = [r.moves[0]];
    var pick = pool[Math.floor(Math.random() * pool.length)];
    return { move: pick, score: pick.score, depth: r.depth, best: r.moves[0] };
  }

  // Analyse a move the user is about to make / just made, from the position before it.
  function analyzeMove(fen, uci, depth, timeMs) {
    var r = rootSearch(fen, Math.max(depth || 2, 2), timeMs || 1400, 100000);
    var played = null;
    for (var i = 0; i < r.moves.length; i++) if (uciOf(r.moves[i]) === uci || (uci.length === 4 && uciOf(r.moves[i]) === uci + 'q')) { played = r.moves[i]; break; }
    if (!played) return null;
    var g = new Game(fen);
    g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    var reply = null;
    if (!g.gameOver()) {
      var rr = rootSearch(g.fen(), 4, 400, 0);
      if (rr.moves.length) reply = rr.moves[0];
    }
    var bestSan = null;
    var g2 = new Game(fen);
    var bm = g2.move({ from: r.moves[0].from, to: r.moves[0].to, promotion: r.moves[0].promotion || undefined });
    if (bm) bestSan = bm.san;
    var replySan = null;
    if (reply) { var mv = g.move({ from: reply.from, to: reply.to, promotion: reply.promotion || undefined }); if (mv) replySan = mv.san; }
    return { best: r.moves[0], bestSan: bestSan, bestScore: r.moves[0].score, secondScore: r.moves.length > 1 ? r.moves[1].score : null, played: played, playedScore: played.score, loss: r.moves[0].score - played.score, reply: reply, replySan: replySan, alternatives: r.moves.slice(0, 3), depth: r.depth };
  }

  // What does the opponent threaten if it were their move?
  function threat(fen) {
    var g = new Game(fen);
    if (g.inCheck()) return null;
    var parts = fen.split(' '); parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
    var h = new Game(parts.join(' '));
    if (h.inCheck(h.side ^ 8)) return null;
    var ms = h._gen();
    for (var i = 0; i < ms.length; i++) {
      h._make(ms[i]);
      var mate = h.inCheck() && h._gen().length === 0;
      h._undo();
      if (mate) return { from: Game.sqName(ms[i].f), to: Game.sqName(ms[i].t), kind: 'mate' };
    }
    nodes = 0; aborted = false; deadline = Date.now() + 500;
    var stand = evaluate(h), best = null, bestGain = 0;
    var caps = h._gen(true);
    for (var j = 0; j < caps.length; j++) {
      h._make(caps[j]);
      var s = -qs(h, -INF, INF, 5);
      h._undo();
      if (s - stand > bestGain) { bestGain = s - stand; best = caps[j]; }
    }
    if (best && bestGain >= 80) return { from: Game.sqName(best.f), to: Game.sqName(best.t), kind: 'capture', piece: best.captured, gain: bestGain };
    return null;
  }

  function evalPos(fen, depth) {
    var g = new Game(fen);
    if (g.inCheckmate()) return { white: g.side ? MATE : -MATE };
    if (g.isDraw()) return { white: 0 };
    var r = rootSearch(fen, depth || 2, 700, 0);
    var s = r.moves.length ? r.moves[0].score : 0;
    return { white: g.side ? -s : s, best: r.moves[0] };
  }

  return { evaluate: evaluate, rootSearch: rootSearch, pickMove: pickMove, analyzeMove: analyzeMove, threat: threat, evalPos: evalPos, MATE: MATE };
}
if (typeof module !== 'undefined') module.exports = ENGINE_FACTORY;
