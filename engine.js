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

  // Tapered evaluation: separate middlegame and endgame values (PeSTO tables), blended by how much material is left.
  var MGV = [0, 82, 337, 365, 477, 1025, 0], EGV = [0, 94, 281, 297, 512, 936, 0], PH = [0, 0, 1, 1, 2, 4, 0];
  var MG_T = [null,
    [0,0,0,0,0,0,0,0,98,134,61,95,68,126,34,-11,-6,7,26,31,65,56,25,-20,-14,13,6,21,23,12,17,-23,-27,-2,-5,12,17,6,10,-25,-26,-4,-4,-10,3,3,33,-12,-35,-1,-20,-23,-15,24,38,-22,0,0,0,0,0,0,0,0],
    [-167,-89,-34,-49,61,-97,-15,-107,-73,-41,72,36,23,62,7,-17,-47,60,37,65,84,129,73,44,-9,17,19,53,37,69,18,22,-13,4,16,13,28,19,21,-8,-23,-9,12,10,19,17,25,-16,-29,-53,-12,-3,-1,18,-14,-19,-105,-21,-58,-33,-17,-28,-19,-23],
    [-29,4,-82,-37,-25,-42,7,-8,-26,16,-18,-13,30,59,18,-47,-16,37,43,40,35,50,37,-2,-4,5,19,50,37,37,7,-2,-6,13,13,26,34,12,10,4,0,15,15,15,14,27,18,10,4,15,16,0,7,21,33,1,-33,-3,-14,-21,-13,-12,-39,-21],
    [32,42,32,51,63,9,31,43,27,32,58,62,80,67,26,44,-5,19,26,36,17,45,61,16,-24,-11,7,26,24,35,-8,-20,-36,-26,-12,-1,9,-7,6,-23,-45,-25,-16,-17,3,0,-5,-33,-44,-16,-20,-9,-1,11,-6,-71,-19,-13,1,17,16,7,-37,-26],
    [-28,0,29,12,59,44,43,45,-24,-39,-5,1,-16,57,28,54,-13,-17,7,8,29,56,47,57,-27,-27,-16,-16,-1,17,-2,1,-9,-26,-9,-10,-2,-4,3,-3,-14,2,-11,-2,-5,2,14,5,-35,-8,11,2,8,15,-3,1,-1,-18,-9,10,-15,-25,-31,-50],
    [-65,23,16,-15,-56,-34,2,13,29,-1,-20,-7,-8,-4,-38,-29,-9,24,2,-16,-20,6,22,-22,-17,-20,-12,-27,-30,-25,-14,-36,-49,-1,-27,-39,-46,-44,-33,-51,-14,-14,-22,-46,-44,-30,-15,-27,1,7,-8,-64,-43,-16,9,8,-15,36,12,-54,8,-28,24,14]];
  var EG_T = [null,
    [0,0,0,0,0,0,0,0,178,173,158,134,147,132,165,187,94,100,85,67,56,53,82,84,32,24,13,5,-2,4,17,17,13,9,-3,-7,-7,-8,3,-1,4,7,-6,1,0,-5,-1,-8,13,8,8,10,13,0,2,-7,0,0,0,0,0,0,0,0],
    [-58,-38,-13,-28,-31,-27,-63,-99,-25,-8,-25,-2,-9,-25,-24,-52,-24,-20,10,9,-1,-9,-19,-41,-17,3,22,22,22,11,8,-18,-18,-6,16,25,16,17,4,-18,-23,-3,-1,15,10,-3,-20,-22,-42,-20,-10,-5,-2,-20,-23,-44,-29,-51,-23,-15,-22,-18,-50,-64],
    [-14,-21,-11,-8,-7,-9,-17,-24,-8,-4,7,-12,-3,-13,-4,-14,2,-8,0,-1,-2,6,0,4,-3,9,12,9,14,10,3,2,-6,3,13,19,7,10,-3,-9,-12,-3,8,10,13,3,-7,-15,-14,-18,-7,-1,4,-9,-15,-27,-23,-9,-23,-5,-9,-16,-5,-17],
    [13,10,18,15,12,12,8,5,11,13,13,11,-3,3,8,3,7,7,7,5,4,-3,-5,-3,4,3,13,1,2,1,-1,2,3,5,8,4,-5,-6,-8,-11,-4,0,-5,-1,-7,-12,-8,-16,-6,-6,0,2,-9,-9,-11,-3,-9,2,3,-1,-5,-13,4,-20],
    [-9,22,22,27,27,19,10,20,-17,20,32,41,58,25,30,0,-20,6,9,49,47,35,19,9,3,22,24,45,57,40,57,36,-18,28,19,47,31,34,39,23,-16,-27,15,6,9,17,10,5,-22,-23,-30,-16,-16,-23,-36,-32,-33,-28,-22,-43,-5,-32,-20,-41],
    [-74,-35,-18,-18,-11,15,4,-17,-12,17,14,17,17,38,23,11,10,17,23,15,20,45,44,13,-8,22,24,27,26,33,26,3,-18,-4,21,24,27,23,9,-11,-19,-3,11,21,23,16,7,-9,-27,-11,4,13,14,4,-5,-17,-53,-34,-21,-11,-28,-14,-24,-43]];
  // precomputed per 0x88 square: [type][colour][square] -> mg / eg value including material
  var PMG = [], PEG = [];
  (function () { for (var t = 1; t <= 6; t++) { PMG[t] = [new Int16Array(128), new Int16Array(128)]; PEG[t] = [new Int16Array(128), new Int16Array(128)];
    for (var i = 0; i < 128; i++) { if (i & 0x88) continue; var row = i >> 4, col = i & 7, w = row * 8 + col, b = (7 - row) * 8 + col;
      PMG[t][0][i] = MGV[t] + MG_T[t][w]; PEG[t][0][i] = EGV[t] + EG_T[t][w]; PMG[t][1][i] = MGV[t] + MG_T[t][b]; PEG[t][1][i] = EGV[t] + EG_T[t][b]; } } })();

  // static eval from side-to-move perspective
  function evaluate(g) {
    var b = g.board, mg = 0, eg = 0, ph = 0, mat = 0, i, p, t, c, bw = 0, bb = 0;
    for (i = 0; i < 120; i++) {
      if (i & 0x88) { i += 7; continue; }
      p = b[i]; if (!p) continue;
      t = p & 7; c = p & 8 ? 1 : 0; ph += PH[t];
      if (t !== 1 && t !== 6) mat += TV[t];
      if (c) { mg -= PMG[t][1][i]; eg -= PEG[t][1][i]; if (t === 3) bb++; }
      else { mg += PMG[t][0][i]; eg += PEG[t][0][i]; if (t === 3) bw++; }
    }
    if (ph > 24) ph = 24;
    var s = (mg * ph + eg * (24 - ph)) / 24 | 0, endgame = mat <= 2600;
    s += mobility(b);
    if (bw >= 2) s += 30;
    if (bb >= 2) s -= 30;
    s += structure(b, endgame);
    s += mopUp(b);
    // a side with no pawns and only a minor piece extra cannot win
    return g.side ? -s : s;
  }
  // Opening sense: knights and bishops still at home cost a little, and so does a queen out before them.
  function development(b) {
    var uw = (b[113] === 2) + (b[118] === 2) + (b[114] === 3) + (b[117] === 3);
    var ub = (b[1] === 10) + (b[6] === 10) + (b[2] === 11) + (b[5] === 11);
    var s = -10 * uw + 10 * ub;
    if (b[115] !== 5 && uw >= 2) s -= 18;
    if (b[3] !== 13 && ub >= 2) s += 18;
    return s;
  }
  // Lone king: the winning side wants it on the edge and the kings close; the defender wants the opposite.
  function mopUp(b) {
    var wm = 0, bm = 0, wp = 0, bpn = 0, wk = -1, bk = -1;
    for (var i = 0; i < 120; i++) {
      if (i & 0x88) { i += 7; continue; }
      var p = b[i]; if (!p) continue;
      var t = p & 7;
      if (t === 6) { if (p & 8) bk = i; else wk = i; continue; }
      if (p & 8) { bm += TV[t]; if (t === 1) bpn++; } else { wm += TV[t]; if (t === 1) wp++; }
    }
    if (wk < 0 || bk < 0) return 0;
    var cd = function (k) { var f = k & 7, r = k >> 4; return Math.max(3 - f, f - 4) + Math.max(3 - r, r - 4); };
    var kd = Math.max(Math.abs((wk & 7) - (bk & 7)), Math.abs((wk >> 4) - (bk >> 4)));
    if (bm === 0 && wm - wp * 100 >= 500) return 12 * cd(bk) + 5 * (7 - kd);
    if (wm === 0 && bm - bpn * 100 >= 500) return -(12 * cd(wk) + 5 * (7 - kd));
    return 0;
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
  var LMR = new Int8Array(64 * 64); for (var ld = 1; ld < 64; ld++) for (var lm = 1; lm < 64; lm++) LMR[ld * 64 + lm] = Math.floor(0.6 + Math.log(ld) * Math.log(lm) / 2.3);
  function clearHeuristics() { killers.fill(0); for (var i = 0; i < hist.length; i++) hist[i] >>= 2; }
  var g0 = null; // the position being ordered, for the "is that capture defended?" check
  function order(ms, ttm, ply, g) {
    g0 = g || null;
    var k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], e = enc(m) + 1, sc;
      if (e === ttm) sc = 1e8;
      else if (m.captured) sc = (VAL[m.captured] < VAL[m.piece] && g0 && g0.attacked(m.t, g0.side ^ 8) ? 7e6 : 1e7) + VAL[m.captured] * 10 - VAL[m.piece];
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
    var us = g.side, ms = order(g._pseudo(true), 0, 127, g);
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (!m.promotion && stand + VAL[m.captured || 'p'] + 200 < alpha) continue; // delta pruning
      if (m._o < 1e7 && !m.promotion && depth < 7) continue; // losing capture: not worth looking at in quiescence
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
    var us = g.side, ms = order(g._pseudo(false), ttm, ply, g);
    var best = -INF, bestM = null, legal = 0, a0 = alpha;
    var futile = !pv && !inChk && depth <= 2 && stat + (depth === 1 ? 180 : 320) <= alpha;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      g._make(m);
      if (g.inCheck(us)) { g._undo(); continue; }
      legal++;
      var quiet = !m.captured && !m.promotion, givesChk = g.inCheck(), s;
      if (futile && quiet && !givesChk && legal > 1) { g._undo(); continue; }
      if (!pv && !inChk && quiet && !givesChk && depth <= 3 && legal > 3 + depth * depth * 2 && best > -MATE + 1000) { g._undo(); continue; }
      if (legal === 1) s = -search(g, depth - 1, -beta, -alpha, ply + 1, true);
      else {
        var red = 0;
        if (depth >= 3 && legal > 3 && quiet && !inChk && !givesChk && m._o < 7.9e6) {
          red = LMR[Math.min(depth, 63) * 64 + Math.min(legal, 63)];
          if (pv) red--;
          if (hist[m.f * 128 + m.t] > 4000) red--;
          if (red < 0) red = 0;
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
        if (best === -INF) {
          if (d >= 5 && !margin && done) {
            var w = 35, c0 = done.list[0].s;
            for (;;) { var lo = c0 - w, hi = c0 + w; s = -search(g, d - 1, -hi, -lo, 1, true); if (aborted || (s > lo && s < hi)) break; w *= 3; if (w > 900) { s = -search(g, d - 1, -INF, INF, 1, true); break; } }
          } else s = -search(g, d - 1, -INF, INF, 1, true);
        }
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

  function allowsMate1(g, m) {
    if (!g.move({ from: m.from, to: m.to, promotion: m.promotion || undefined })) return false;
    var mate = g.moves().some(function (x) { g.move(x); var y = g.inCheckmate(); g.undo(); return y; });
    g.undo(); return mate;
  }
  function pickMove(fen, level, prevFens) {
    // level: {depth, time, margin}
    var r = rootSearch(fen, level.depth, level.time, level.margin ? Math.max(level.margin, 1) : 0, prevFens);
    if (!r.moves.length) return null;
    var best = r.moves[0].score;
    var pool = level.margin ? r.moves.filter(function (m) { return m.score >= best - level.margin; }) : [r.moves[0]];
    // never randomly miss a mate or walk into one
    if (best > MATE - 100) pool = [r.moves[0]];
    // shallow levels play the opening like people do: no early queen trips while other moves are fine
    if (level.depth <= 3 && +fen.split(' ')[5] <= 6) { var calm = pool.filter(function (m) { return m.piece !== 'q' || m.captured; }); if (calm.length) pool = calm; }
    // shallow levels: never walk into a mate in one (a real 1000 player sees that)
    if (level.depth <= 2 && best < MATE - 100) {
      var gg = new Game(fen), safe = pool.filter(function (m) { return !allowsMate1(gg, m); });
      if (!safe.length) safe = r.moves.filter(function (m) { return !allowsMate1(gg, m); }).slice(0, 1);
      if (safe.length) pool = safe;
    }
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

  // Best play for n plies from a position: what actually happens next (used by "Show me" replays).
  function line(fen, n, depth, timeMs) {
    var g = new Game(fen), out = [];
    for (var i = 0; i < n; i++) {
      if (g.gameOver()) break;
      var r = rootSearch(g.fen(), depth || 5, timeMs || 500, 0);
      if (!r.moves.length) break;
      var m = r.moves[0], mv = g.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
      if (!mv) break;
      out.push({ from: mv.from, to: mv.to, promotion: mv.promotion || null, san: mv.san, captured: mv.captured || null, piece: mv.piece, score: m.score });
    }
    return out;
  }
  // Moves that look natural but are clearly worse, for opening battles: a realistic mistake.
  function mistake(fen, loose) {
    var r = rootSearch(fen, 4, 1500, 450);
    if (!r.moves.length) return null;
    var best = r.moves[0].score, gap = loose ? 80 : 100, worst = loose ? -40 : -80;
    if (best < (loose ? -150 : -60)) return null;
    // a realistic slip, not a piece left hanging: costs about one to two and a half pawns
    var g = new Game(fen), pool = r.moves.filter(function (m) {
      if (!(best - m.score >= gap && m.score <= worst && m.score >= (loose ? -400 : -280) && m.piece !== 'k')) return false;
      var mv = g.move({ from: m.from, to: m.to, promotion: m.promotion || undefined }); if (!mv) return false;
      var hang = g.moves().some(function (x) { return x.to === m.to && x.captured && x.captured !== 'p'; }) && !g.attacked(Game.sqIdx(m.to), g.side ^ 8);
      g.undo(); return !hang;
    });
    if (!pool.length) return null;
    var m = pool[Math.floor(Math.random() * Math.min(pool.length, 4))];
    return { from: m.from, to: m.to, promotion: m.promotion || null, score: m.score, best: best };
  }
  return { evaluate: evaluate, rootSearch: rootSearch, pickMove: pickMove, analyzeMove: analyzeMove, threat: threat, evalPos: evalPos, line: line, mistake: mistake, MATE: MATE };
}
if (typeof module !== 'undefined') module.exports = ENGINE_FACTORY;
