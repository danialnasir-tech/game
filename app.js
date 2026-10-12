(function () {
  'use strict';
  var Game = CHESS_LIB();
  var LOCAL_ENGINE = ENGINE_FACTORY(Game);
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ================= Storage =================
  var STORE_KEY = 'chess-ascent-v1';
  function freshState() {
    return { onboarded: false, band: 100, startDate: null, xp: 0, streak: 0, lastActive: null, lessons: {}, openings: {}, puzzle: { rating: 400, solved: {}, hist: [] }, games: [], daily: {}, sound: true, voice: true, coach: { explain: true, threats: true, level: 'club', color: 'w', style: null, evalbar: null }, settings: { coachName: 'Coach Leo', volume: 1, rate: 1, subtitles: true, cameraFixed: false }, badges: {}, peek: {}, arena: {}, bosses: {}, challenges: {}, cleared: {} };
  }
  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = Object.assign(freshState(), JSON.parse(raw));
        s.puzzle = Object.assign(freshState().puzzle, s.puzzle || {});
        s.coach = Object.assign(freshState().coach, s.coach || {});
        s.settings = Object.assign(freshState().settings, s.settings || {});
        s.badges = s.badges || {}; s.peek = s.peek || {};
        return s;
      }
    } catch (e) { }
    return freshState();
  }
  var S = loadState();
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { } }

  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function today() { var k = dayKey(); if (!S.daily[k]) S.daily[k] = { lesson: false, puzzles: 0, opening: false, game: false }; return S.daily[k]; }
  function dayNumber() {
    if (!S.startDate) return 1;
    var a = new Date(S.startDate + 'T00:00:00'), b = new Date(dayKey() + 'T00:00:00');
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }
  function touchActivity() {
    var k = dayKey();
    if (S.lastActive === k) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    S.streak = S.lastActive === dayKey(y) ? S.streak + 1 : 1;
    S.lastActive = k;
    setTimeout(function () { [3, 7, 14, 30].forEach(function (n) { if (S.streak >= n) Badges.award('streak_' + n); }); }, 1500);
  }
  function addXP(n) {
    var before = Levels.of(S.xp).i;
    S.xp += n; touchActivity(); save(); renderTop();
    var after = Levels.of(S.xp);
    if (after.i > before) Celebrate.show({ kind: 'level', title: 'Level up: ' + after.name, text: 'You reached the ' + after.name + ' level. ' + (after.next ? (after.next.xp - S.xp) + ' XP to ' + after.next.name + '.' : 'The top of the ladder!'), icon: after.icon, voice: V('level_up') });
  }
  function beginnerMode() { return S.band < 400 && !stageCleared(0); }
  function missionList(d) {
    d = d || today();
    if (beginnerMode()) return [
      { k: 'lesson', label: 'Lessons', sub: Math.min(d.lessons || 0, 2) + ' of 2', done: (d.lessons || 0) >= 2, act: 'startNext' },
      { k: 'puzzles', label: 'Easy puzzles', sub: Math.min(d.puzzles, 3) + ' of 3', done: d.puzzles >= 3, act: 'goPuzzles' }
    ].concat(lessonsDone() >= 1 ? [{ k: 'game', label: 'Coach game', sub: 'Any length', done: !!d.game, act: 'goPlay' }] : []);
    return [
      { k: 'lesson', label: 'Lesson', sub: d.lesson ? 'Done today' : '', done: !!d.lesson, act: 'startNext' },
      { k: 'puzzles', label: 'Puzzles', sub: Math.min(d.puzzles, 5) + ' of 5', done: d.puzzles >= 5, act: 'goPuzzles' },
      { k: 'opening', label: 'Opening', sub: d.opening ? 'Done today' : (function () { var o = nextStop(); return o ? (o.def ? 'Defend: ' : '') + (o.base ? o.base.name : o.name) : 'One drill'; })(), done: !!d.opening, act: 'nextOpening' },
      { k: 'game', label: 'Coach game', sub: 'Full game', done: !!d.game, act: 'goPlay' }
    ];
  }
  function missionsDone(d) { return missionList(d).filter(function (m) { return m.done; }).length; }
  function missionsTotal() { return missionList().length; }

  // ================= Engine (worker with main-thread fallback) =================
  var Eng = (function () {
    var worker = null, seq = 0, pending = {};
    function runLocal(job) {
      setTimeout(function () {
        var r = null;
        try { r = LOCAL_ENGINE[job.cmd].apply(null, job.args); } catch (e) { r = null; }
        job.res(r);
      }, 16);
    }
    try {
      var src = 'var Game=(' + CHESS_LIB.toString() + ')();var E=(' + ENGINE_FACTORY.toString() + ')(Game);' +
        'onmessage=function(e){var d=e.data,r=null;try{r=E[d.cmd].apply(null,d.args)}catch(x){r=null}postMessage({id:d.id,r:r})}';
      var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = function (e) { var j = pending[e.data.id]; if (j) { delete pending[e.data.id]; j.res(e.data.r); } };
      worker.onerror = function () {
        worker = null;
        Object.keys(pending).forEach(function (k) { var j = pending[k]; delete pending[k]; runLocal(j); });
      };
    } catch (e) { worker = null; }
    function call(cmd) {
      var args = Array.prototype.slice.call(arguments, 1);
      return new Promise(function (res) {
        var job = { cmd: cmd, args: args, res: res };
        if (worker) { var id = ++seq; pending[id] = job; worker.postMessage({ id: id, cmd: cmd, args: args }); }
        else runLocal(job);
      });
    }
    return { call: call };
  })();

  // ================= Sound =================
  var Sound = (function () {
    var ctx = null;
    function ensure() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
    function noise(dur, freq, gain) {
      var c = ensure(); if (!c) return;
      var n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      var s = c.createBufferSource(); s.buffer = buf;
      var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
      var g = c.createGain(); g.gain.value = gain;
      s.connect(f); f.connect(g); g.connect(c.destination); s.start();
    }
    function tone(freq, dur, when, type, gain) {
      var c = ensure(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (when || 0);
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    var BUZZ = { move: 6, capture: 14, check: [10, 40, 10], good: [12, 30, 12], win: [20, 40, 20, 40, 30], bad: [35, 40, 35], star: 8 };
    function play(kind) {
      if (!S.sound) return;
      try { if (navigator.vibrate && BUZZ[kind]) navigator.vibrate(BUZZ[kind]); } catch (e) { }
      if (kind === 'move') noise(0.08, 1800, 0.7);
      else if (kind === 'capture') { noise(0.12, 900, 0.9); noise(0.06, 2400, 0.4); }
      else if (kind === 'check') { noise(0.08, 1800, 0.6); tone(880, 0.18, 0.02, 'triangle', 0.06); }
      else if (kind === 'good') { tone(660, 0.18, 0, 'triangle'); tone(990, 0.3, 0.12, 'triangle'); }
      else if (kind === 'win') { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.35, i * 0.1, 'triangle', 0.1); }); }
      else if (kind === 'bad') { tone(180, 0.22, 0, 'sawtooth', 0.05); }
      else if (kind === 'star') { tone(1200, 0.12, 0, 'sine', 0.08); tone(1600, 0.16, 0.06, 'sine', 0.06); }
    }
    return { play: play, unlock: ensure };
  })();

  // ================= Coach subtitle bubble =================
  var Bubble = (function () {
    var t = null, shownAt = 0;
    function el() { return document.getElementById('coach-bubble'); }
    return {
      show: function (text, ms) {
        var b = el(); if (!b || !text) return;
        if (S.settings && S.settings.subtitles === false && S.voice) return;
        b.querySelector('.cb-name').textContent = (S.settings && S.settings.coachName) || 'Coach';
        b.querySelector('.cb-text').textContent = text;
        b.hidden = false; b.classList.remove('out'); shownAt = Date.now();
        clearTimeout(t); if (ms) t = setTimeout(function () { Bubble.hide(); }, ms);
      },
      hideSoon: function () { clearTimeout(t); t = setTimeout(function () { Bubble.hide(); }, 1600); },
      hide: function () { var b = el(); if (!b) return; b.classList.add('out'); setTimeout(function () { if (b.classList.contains('out')) b.hidden = true; }, 300); },
      busy: function () { var b = el(); return b && !b.hidden && Date.now() - shownAt < 1200; }
    };
  })();

  // ================= Voice coach =================
  var VOICE_FILES = /*__VOICEFILES__*/{};
  var VOICE_PACKS = /*__VOICEPACKS__*/2;
  var Voice = (function () {
    var audio = null, synthVoice = null, last = null, tok = 0;
    function pickSynth() {
      if (!window.speechSynthesis) return null;
      var vs = speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
      var pref = [/natural/i, /google us english/i, /aria|jenny|samantha|zira|libby|sonia/i, /google/i];
      for (var i = 0; i < pref.length; i++) { var f = vs.filter(function (v) { return pref[i].test(v.name); })[0]; if (f) return f; }
      return vs[0] || null;
    }
    try { if (window.speechSynthesis) { synthVoice = pickSynth(); speechSynthesis.onvoiceschanged = function () { synthVoice = pickSynth(); }; } } catch (e) { }
    function stop() { tok++; busy = false; document.body.classList.remove('speaking'); if (audio) { audio.pause(); audio = null; } try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { } }
    function synth(text) {
      if (!window.speechSynthesis || !text) return Promise.resolve();
      return new Promise(function (res) {
        try {
          var u = new SpeechSynthesisUtterance(text);
          if (synthVoice) u.voice = synthVoice;
          u.rate = 1.02 * (S.settings.rate || 1); u.volume = S.settings.volume == null ? 1 : S.settings.volume; u.onend = res; u.onerror = res;
          speechSynthesis.speak(u);
          setTimeout(res, 400 + text.length * 120);
        } catch (e) { res(); }
      });
    }
    // Voice packs load on demand: only the pack holding the line being spoken is downloaded.
    var packCache = {};
    function loadPack(i) {
      if (!packCache[i]) packCache[i] = fetch('voice-pack-' + (i + 1) + '.mp3').then(function (r) { if (!r.ok) throw new Error('pack'); return r.arrayBuffer(); }).catch(function () { delete packCache[i]; return null; });
      return packCache[i];
    }
    function within(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r('late'); }, ms); })]); }
    function clip(id, text) {
      var ent = VOICE_FILES[id];
      return within(loadPack(ent[0]), 2500).then(function (buf) {
        if (buf === 'late' || !buf) return; // still downloading: the subtitle bubble carries this line
        return new Promise(function (res) {
          try {
            var url = URL.createObjectURL(new Blob([buf.slice(ent[1], ent[1] + ent[2])], { type: 'audio/mpeg' }));
            audio = new Audio(url);
            audio.volume = S.settings.volume == null ? 1 : S.settings.volume;
            audio.playbackRate = S.settings.rate || 1;
            var done = function () { URL.revokeObjectURL(url); res(); };
            audio.onended = done; audio.onerror = done;
            var p = audio.play(); if (p && p.catch) p.catch(done);
          } catch (e) { res(); }
        });
      });
    }
    function prefetch(ids) {
      if (!S.voice || (navigator.connection && navigator.connection.saveData)) return;
      var seen = {};
      ids.forEach(function (id) { var e = VOICE_FILES[id]; if (e && !seen[e[0]]) { seen[e[0]] = 1; loadPack(e[0]); } });
    }
    var busy = false;
    function say(parts, soft) {
      parts = (parts || []).filter(Boolean);
      if (!parts.length) return;
      if (soft && (busy || Bubble.busy())) return;
      var hasClips = Object.keys(VOICE_FILES).length > 0;
      var spoken = parts.filter(function (p) { return typeof p === 'string' || !p.id || VOICE_FILES[p.id] || !hasClips; });
      var words = spoken.map(function (p) { return typeof p === 'string' ? p : p.text; }).join(' ').replace(/\s+([.,!?])/g, '$1')
        .replace(/\.\s+(with check|and that is checkmate|promoting)/g, ' $1').replace(/\b([A-H])([1-8])\b/g, function (m, f, r) { return f.toLowerCase() + r; });
      Bubble.show(words, S.voice ? null : 3200 + words.length * 45);
      if (!S.voice) return;
      stop(); last = parts; busy = true; document.body.classList.add('speaking'); var my = tok, seq = Promise.resolve();
      parts.forEach(function (p) {
        seq = seq.then(function () {
          if (my !== tok || !p) return;
          if (typeof p === 'string') return synth(p);
          if (p.id && VOICE_FILES[p.id]) return clip(p.id, p.text);
          if (p.id && Object.keys(VOICE_FILES).length) return; // no robotic voice once real clips exist
          return synth(p.text);
        });
      });
      seq.then(function () { if (my === tok) { busy = false; document.body.classList.remove('speaking'); Bubble.hideSoon(); } });
    }
    return { say: say, stop: stop, prefetch: prefetch, replay: function () { if (last) say(last); }, hasClips: function () { return Object.keys(VOICE_FILES).length > 0; } };
  })();
  Object.keys(MORE_POOLS).forEach(function (k) { VARIANTS[k] = MORE_POOLS[k]; });
  function C(k) { return { id: 'C-' + k, text: COACH_LINES[k] }; }
  // Pick a line from a variation pool: every line plays once before any repeats (remembered across visits).
  function V(cat, legacy) {
    var pool = VARIANTS[cat];
    if (!pool) return legacy ? C(legacy) : null;
    var avail = [];
    pool.forEach(function (t, i) { if (VOICE_FILES['V-' + cat + '-' + i]) avail.push(i); });
    if (!avail.length) {
      if (legacy && (VOICE_FILES['C-' + legacy] || !Voice.hasClips())) return C(legacy);
      if (!Voice.hasClips()) avail = pool.map(function (t, i) { return i; });
      else return null;
    }
    S.bags = S.bags || {}; S.lastV = S.lastV || {};
    var bag = (S.bags[cat] || []).filter(function (i) { return avail.indexOf(i) >= 0; });
    if (!bag.length) {
      bag = avail.slice();
      for (var k = bag.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var t = bag[k]; bag[k] = bag[j]; bag[j] = t; }
      if (bag.length > 1 && bag[0] === S.lastV[cat]) bag.push(bag.shift());
    }
    var pick = bag.shift();
    S.bags[cat] = bag; S.lastV[cat] = pick; save();
    var id = 'V-' + cat + '-' + pick;
    return VOICE_FILES[id] || !Voice.hasClips() ? { id: id, text: pool[pick] } : (legacy ? C(legacy) : null);
  }
  function chance(p) { return Math.random() < p; }
  function M(k) { return { id: 'M-' + k, text: MOVE_WORDS[k] }; }
  // Speak a move as clips: "Knight to" + "F3." (+ "with check.")
  function moveParts(san, from, to, piece, captured) {
    if (!san) return [];
    if (/^O-O-O/.test(san)) return [M('castle_q')];
    if (/^O-O/.test(san)) return [M('castle_k')];
    var parts = [M((captured ? 'x_' : 'to_') + piece), M('sq_' + to)];
    if (/=Q/.test(san)) parts.push(M('promo'));
    if (/#$/.test(san)) parts.push(M('mate')); else if (/\+$/.test(san)) parts.push(M('check'));
    return parts;
  }
  function pickPool(cat) {
    var pool = MOVE_POOLS[cat]; if (!pool) return null;
    var tmp = VARIANTS[cat]; VARIANTS[cat] = pool; var r = V(cat); if (!tmp) delete VARIANTS[cat]; else VARIANTS[cat] = tmp;
    return r;
  }
  // Why is the best move good? Returns [voice pool, sentence]
  function whyBest(a, bestSan, ply, fenBefore) {
    var b = a.best;
    if (a.bestScore > 90000) return ['why_mate', 'It leads to a forced checkmate.'];
    if (b.captured && { n: 1, b: 1, r: 1, q: 1 }[b.captured]) return ['why_wins', 'It wins the ' + PIECE_NAME[b.captured] + ' on ' + b.to + '.'];
    if (b.captured && a.loss > 60) return ['why_wins', 'It wins the ' + PIECE_NAME[b.captured] + ' on ' + b.to + '.'];
    if (a.reply && a.reply.captured && a.loss > 120) return ['why_safe', 'It does not give away your ' + PIECE_NAME[a.reply.captured] + '.'];
    if (/^O-O/.test(bestSan || '')) return ['why_castle', 'Castling gets your king to safety.'];
    if (/\+$/.test(bestSan || '')) return ['why_check', 'It is a forcing check.'];
    if (ply <= 16 && (b.piece === 'n' || b.piece === 'b') && /[18]$/.test(b.from)) return ['why_develop', 'It develops a new piece.'];
    if (ply <= 16 && b.piece === 'p' && /^[cdef][3-5]$/.test(b.to)) return ['why_center', 'It fights for the centre.'];
    if (b.captured) return ['why_wins', 'It wins material.'];
    return ['why_general', 'It keeps your position stronger.'];
  }
  function plain(html) { var d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/Take back$/, '').trim(); }

  // ================= 3D board =================
  var B3 = typeof THREE === 'undefined' ? {} : (function () {
    var api = {};
    var container, scene, camera, renderer, controls, plane;
    var ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    var pieceGroup = new THREE.Group(), overlay = new THREE.Group(), arrowGroup = new THREE.Group(), fxGroup = new THREE.Group(), starGroup = new THREE.Group();
    var meshes = {}, stars = {}, cats = {}, labels = [], tweens = [];
    var orient = 'w', viewMode = '3d', camTok = 0, lastTop = null, drag = null, dragFns = null, cameraFixed = false;
    var onClick = function () { }, hoverFn = function () { return false; };
    var GEO = {}, MAT = {};
    var COLORS = { g: 0x73c48f, r: 0xe2695c, b: 0x6fa8dc, y: 0xe0b45c };

    function col(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
    function pos(sq, y) { return new THREE.Vector3(sq.charCodeAt(0) - 97 - 3.5, y || 0, 3.5 - (+sq[1] - 1)); }
    function easeInOut(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
    function easeOutBack(k) { var c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
    function tween(dur, update, ease, delay) {
      if (REDUCED) { dur = Math.min(dur, 60); delay = 0; }
      return new Promise(function (res) { tweens.push({ t0: performance.now() + (delay || 0), dur: dur, update: update, ease: ease || easeInOut, res: res }); });
    }
    api.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    // ---------- piece geometry ----------
    function V(a) { return a.map(function (p) { return new THREE.Vector2(p[0], p[1]); }); }
    function arc(cx, cy, r, a0, a1, n) { var out = []; for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return out; }
    var BASE = [[0, 0], [0.36, 0], [0.375, 0.025], [0.365, 0.07], [0.31, 0.1], [0.3, 0.14], [0.26, 0.17]];
    function lathe(pts) { var g = new THREE.LatheGeometry(V(pts), 40); g.computeVertexNormals(); return g; }
    function buildGeometries() {
      GEO.p = lathe(BASE.concat([[0.2, 0.2], [0.14, 0.3], [0.11, 0.42], [0.19, 0.45], [0.19, 0.48], [0.1, 0.5]]).concat(arc(0, 0.62, 0.15, -1.1, Math.PI / 2, 12)));
      GEO.r = lathe(BASE.concat([[0.25, 0.2], [0.2, 0.3], [0.19, 0.55], [0.27, 0.6], [0.28, 0.8], [0.2, 0.8], [0.2, 0.74], [0, 0.74]]));
      GEO.b = lathe(BASE.concat([[0.22, 0.2], [0.15, 0.32], [0.12, 0.55], [0.21, 0.58], [0.21, 0.61], [0.12, 0.64], [0.16, 0.7], [0.175, 0.78], [0.14, 0.88], [0.07, 0.95], [0.035, 0.975]]).concat(arc(0, 1.01, 0.05, -0.8, Math.PI / 2, 8)));
      var QB = [[0, 0], [0.4, 0], [0.415, 0.03], [0.4, 0.08], [0.34, 0.12], [0.32, 0.16], [0.28, 0.2], [0.2, 0.32], [0.14, 0.6], [0.13, 0.78], [0.23, 0.82], [0.23, 0.855], [0.14, 0.88]];
      GEO.q = lathe(QB.concat([[0.17, 0.95], [0.26, 1.08], [0.2, 1.1], [0.08, 1.12]]).concat(arc(0, 1.17, 0.07, -0.9, Math.PI / 2, 8)));
      GEO.k = lathe(QB.map(function (p) { return [p[0], p[1] * 1.04]; }).concat([[0.18, 0.98], [0.23, 1.1], [0.2, 1.13], [0.1, 1.15], [0, 1.16]]));
      GEO.nBase = lathe(BASE.concat([[0.24, 0.2], [0.2, 0.28], [0.19, 0.36], [0, 0.37]]));
      var s = new THREE.Shape();
      var hp = [[-0.2, 0.3], [0.16, 0.3], [0.12, 0.48], [0.07, 0.58], [0.27, 0.62], [0.32, 0.7], [0.25, 0.79], [0.09, 0.9], [0.04, 1.0], [-0.02, 1.07], [-0.09, 0.96], [-0.17, 0.9], [-0.25, 0.72], [-0.27, 0.5]];
      s.moveTo(hp[0][0], hp[0][1]);
      for (var i = 1; i < hp.length; i++) s.lineTo(hp[i][0], hp[i][1]);
      s.lineTo(hp[0][0], hp[0][1]);
      GEO.nHead = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 3, curveSegments: 4 });
      GEO.nHead.translate(0, 0, -0.1);
      GEO.crenel = new THREE.BoxGeometry(0.09, 0.08, 0.09);
      GEO.crossV = new THREE.BoxGeometry(0.06, 0.24, 0.06);
      GEO.crossH = new THREE.BoxGeometry(0.18, 0.06, 0.06);
      GEO.bead = new THREE.SphereGeometry(0.04, 12, 8);
      GEO.square = new THREE.PlaneGeometry(1, 1);
      GEO.dot = new THREE.CircleGeometry(0.15, 28);
      GEO.ring = new THREE.RingGeometry(0.37, 0.47, 36);
      var st = new THREE.Shape();
      for (var si = 0; si < 10; si++) { var ang = Math.PI / 2 + si * Math.PI / 5, rr = si % 2 ? 0.15 : 0.36; if (si) st.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); else st.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
      GEO.star = new THREE.ExtrudeGeometry(st, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2 });
      GEO.star.translate(0, 0, -0.04);
      GEO.glow = new THREE.CircleGeometry(0.46, 32);
      GEO.spark = new THREE.BoxGeometry(0.07, 0.07, 0.07);
      GEO.decal = new THREE.CircleGeometry(0.3, 32);
    }
    function buildMaterials() {
      MAT.w = new THREE.MeshPhysicalMaterial({ color: col(0xf0e4c8), roughness: 0.55, metalness: 0.0, clearcoat: 0.15, clearcoatRoughness: 0.6 });
      MAT.b = new THREE.MeshPhysicalMaterial({ color: col(0x23222b), roughness: 0.45, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.5 });
      MAT.light = new THREE.MeshStandardMaterial({ color: col(0xf2e8d8), roughness: 0.95, metalness: 0 });
      MAT.dark = new THREE.MeshStandardMaterial({ color: col(0x2c7c8f), roughness: 0.95, metalness: 0 });
      MAT.frame = new THREE.MeshStandardMaterial({ color: col(0x161d38), roughness: 0.85, metalness: 0 });
      MAT.brass = new THREE.MeshStandardMaterial({ color: col(0xff4f8b), emissive: col(0xff4f8b), emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.2 });
      MAT.star = new THREE.MeshStandardMaterial({ color: col(0xffd23f), emissive: col(0xffb000), emissiveIntensity: 0.75, roughness: 0.3, metalness: 0.3 });
      MAT.glow = new THREE.MeshBasicMaterial({ color: col(0xffd23f), transparent: true, opacity: 0.38, depthWrite: false });
      // how strongly each surface picks up the studio reflections from buildEnvironment()
      MAT.w.envMapIntensity = 0.5; MAT.b.envMapIntensity = 0.95; MAT.light.envMapIntensity = 0.22; MAT.dark.envMapIntensity = 0.3; MAT.frame.envMapIntensity = 0.45; MAT.star.envMapIntensity = 0.8;
    }
    // A small "photo studio" (dark gradient dome, one warm softbox, pink and sky rim panels) baked into
    // a reflection map, so pieces get glossy highlights that match the scene's lights.
    function buildEnvironment() {
      try {
        var pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
        var dome = new THREE.SphereGeometry(20, 32, 16), p = dome.attributes.position, cols = [];
        var top = new THREE.Color(0x222c58), bot = new THREE.Color(0x04060d), c = new THREE.Color();
        for (var i = 0; i < p.count; i++) { c.copy(bot).lerp(top, (p.getY(i) / 20 + 1) / 2); cols.push(c.r, c.g, c.b); }
        dome.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        env.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
        [[0xfff1dc, -4, 15, 4, 12, 8], [0xff4f8b, -13, 5, -9, 7, 3], [0x4cc9f0, 13, 4, -7, 7, 3]].forEach(function (b) {
          var m = new THREE.Mesh(new THREE.PlaneGeometry(b[4], b[5]), new THREE.MeshBasicMaterial({ color: b[0], side: THREE.DoubleSide }));
          m.position.set(b[1], b[2], b[3]); m.lookAt(0, 0, 0); env.add(m);
        });
        scene.environment = pm.fromScene(env, 0.035).texture;
        pm.dispose();
      } catch (e) { }
    }
    var glyphCache = {};
    function glyphMat(type, color) {
      var k = type + color; if (glyphCache[k]) return glyphCache[k];
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var x = c.getContext('2d');
      x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2);
      x.fillStyle = color === 'w' ? '#f7efdc' : '#1b1a22'; x.fill();
      x.lineWidth = 6; x.strokeStyle = color === 'w' ? '#ffd23f' : '#ff4f8b'; x.stroke();
      x.save(); x.translate(64 - 45 * 1.05, 62 - 45 * 1.05); x.scale(2.1, 2.1);
      x.fillStyle = color === 'w' ? '#1b1a22' : '#f7efdc'; x.strokeStyle = color === 'w' ? '#f7efdc' : '#1b1a22'; x.lineWidth = 1.2; x.lineJoin = 'round';
      [PIECE_PATHS[type], PIECE_BASE].forEach(function (d) { var p = new Path2D(d); x.fill(p, 'evenodd'); x.stroke(p); });
      x.restore();
      var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      glyphCache[k] = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
      return glyphCache[k];
    }
    function part(geo, mat, y) { var m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; if (y) m.position.y = y; return m; }
    function makePiece(type, color) {
      var g = new THREE.Group(), mat = MAT[color], i;
      if (type === 'n') {
        g.add(part(GEO.nBase, mat));
        var head = part(GEO.nHead, mat);
        head.rotation.y = color === 'w' ? Math.PI / 2 : -Math.PI / 2;
        g.add(head);
      } else {
        g.add(part(GEO[type], mat));
        if (type === 'r') for (i = 0; i < 4; i++) { var c = part(GEO.crenel, mat, 0.84); var a = i * Math.PI / 2 + Math.PI / 4; c.position.x = Math.cos(a) * 0.235; c.position.z = Math.sin(a) * 0.235; g.add(c); }
        if (type === 'q') for (i = 0; i < 8; i++) { var bd = part(GEO.bead, mat, 1.11); var b = i * Math.PI / 4; bd.position.x = Math.cos(b) * 0.24; bd.position.z = Math.sin(b) * 0.24; g.add(bd); }
        if (type === 'k') { g.add(part(GEO.crossV, mat, 1.27)); g.add(part(GEO.crossH, mat, 1.3)); }
      }
      var TOP = { p: 0.78, n: 1.1, b: 1.07, r: 0.79, q: 1.25, k: 1.33 };
      var decal = new THREE.Mesh(GEO.decal, glyphMat(type, color));
      decal.rotation.x = -Math.PI / 2; decal.position.y = TOP[type] + 0.02; decal.renderOrder = 2;
      decal.userData.decal = true; decal.visible = false;
      g.add(decal); g.userData.decalMesh = decal;
      g.userData.type = type; g.userData.color = color;
      return g;
    }

    // ---------- scene ----------
    function labelTexture(ch) {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var x = c.getContext('2d'); x.fillStyle = '#ffd23f'; x.font = '600 40px "JetBrains Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 34);
      var t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
    }
    api.init = function (el, clickCb, hoverCb) {
      container = el; onClick = clickCb; hoverFn = hoverCb;
      buildGeometries(); buildMaterials();
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1020);
      scene.fog = new THREE.Fog(0x0b1020, 22, 46);
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 9.2, 9);
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);
      buildEnvironment();
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.enablePan = false; controls.minDistance = 7; controls.maxDistance = 30;
      controls.maxPolarAngle = 1.32; controls.minPolarAngle = 0.02;
      controls.autoRotateSpeed = 0.5;
      controls.enableRotate = !cameraFixed;
      var springT = null;
      controls.addEventListener('start', function () { clearTimeout(springT); camTok++; });
      controls.addEventListener('end', function () { clearTimeout(springT); springT = setTimeout(function () { moveCamera(true); }, 450); });

      scene.add(new THREE.HemisphereLight(0xfff6ea, 0x1a2340, 0.85));
      var key = new THREE.DirectionalLight(0xfff0dc, 0.75);
      key.position.set(-4, 14, 3); key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      var sc = key.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 30;
      key.shadow.bias = -0.0006; key.shadow.radius = 4;
      scene.add(key);
      var fill = new THREE.DirectionalLight(0x4cc9f0, 0.55); fill.position.set(-7, 5, -5); scene.add(fill);
      var rim = new THREE.PointLight(0xff4f8b, 1.1, 30); rim.position.set(0, 5, -9); scene.add(rim);

      // board squares
      var board = new THREE.Group();
      for (var f = 0; f < 8; f++) for (var r = 0; r < 8; r++) {
        var light = (f + r) % 2 === 1;
        var m = light ? MAT.light.clone() : MAT.dark.clone();
        var jitter = (Math.sin(f * 12.9898 + r * 78.233) * 43758.5453) % 1;
        m.color.offsetHSL(0, 0, jitter * 0.025);
        var sq = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 1), m);
        sq.position.set(f - 3.5, -0.04, 3.5 - r); sq.receiveShadow = true;
        board.add(sq);
      }
      var frame = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.42, 9.3), MAT.frame);
      frame.position.y = -0.25; frame.receiveShadow = true; frame.castShadow = true; board.add(frame);
      var trimGeo = [new THREE.BoxGeometry(8.16, 0.03, 0.06), new THREE.BoxGeometry(0.06, 0.03, 8.16)];
      [[0, 4.05, 0], [0, -4.05, 0], [4.05, 0, 1], [-4.05, 0, 1]].forEach(function (t) {
        var tr = new THREE.Mesh(trimGeo[t[2]], MAT.brass); tr.position.set(t[2] ? t[0] : 0, -0.025, t[2] ? 0 : t[1]); board.add(tr);
      });
      var base = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.8, 0.3, 64), new THREE.MeshStandardMaterial({ color: 0x121933, roughness: 0.8, envMapIntensity: 0.35 }));
      base.position.y = -0.62; base.receiveShadow = true; board.add(base);
      var floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 1, envMapIntensity: 0.15 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.78; floor.receiveShadow = true; board.add(floor);
      scene.add(board);

      // coordinates
      for (var i = 0; i < 8; i++) {
        ['file', 'rank'].forEach(function (kind) {
          var ch = kind === 'file' ? 'abcdefgh'[i] : String(i + 1);
          var mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: labelTexture(ch), transparent: true, depthWrite: false }));
          mesh.rotation.x = -Math.PI / 2; mesh.userData = { kind: kind, i: i };
          labels.push(mesh); scene.add(mesh);
        });
      }
      placeLabels();

      plane = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      plane.rotation.x = -Math.PI / 2; scene.add(plane);

      // ambient dust
      var dustGeo = new THREE.BufferGeometry(), N = 220, arr = new Float32Array(N * 3);
      for (var d = 0; d < N; d++) { arr[d * 3] = (Math.random() - 0.5) * 26; arr[d * 3 + 1] = Math.random() * 9; arr[d * 3 + 2] = (Math.random() - 0.5) * 26; }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x4cc9f0, size: 0.04, transparent: true, opacity: 0.45, depthWrite: false }));
      dust.name = 'dust'; scene.add(dust);

      scene.add(pieceGroup); scene.add(overlay); scene.add(arrowGroup); scene.add(fxGroup); scene.add(starGroup);

      var el2 = renderer.domElement, down = null;
      el2.addEventListener('pointerdown', function (e) {
        down = { x: e.clientX, y: e.clientY }; Sound.unlock();
        var sq = pick(e);
        if (sq && dragFns && dragFns.can(sq) && meshes[sq]) {
          controls.enabled = false;
          drag = { from: sq, mesh: meshes[sq], active: false, id: e.pointerId };
          try { el2.setPointerCapture(e.pointerId); } catch (x) { }
        }
      });
      el2.addEventListener('pointermove', function (e) {
        if (!drag) return;
        if (!drag.active && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { drag.active = true; dragFns.start(drag.from); }
        if (!drag.active) return;
        var p = planePoint(e); if (!p) return;
        drag.mesh.position.set(p.x, 0.55, p.z);
        var over = squareAt(p); api.markers('hover', over ? [over] : []);
      });
      function snapBack(d) {
        var p0 = d.mesh.position.clone(), p1 = pos(d.from);
        tween(180, function (k) { d.mesh.position.set(p0.x + (p1.x - p0.x) * k, p0.y * (1 - k), p0.z + (p1.z - p0.z) * k); });
      }
      function endDrag(e, cancelled) {
        var d = drag; drag = null; controls.enabled = true; api.markers('hover', []);
        try { el2.releasePointerCapture(d.id); } catch (x) { }
        if (!d.active) return false;
        down = null;
        var ok = false;
        if (!cancelled) {
          try {
            var p = planePoint(e), to = p ? squareAt(p) : null;
            ok = !!(to && to !== d.from && dragFns.drop(d.from, to));
          } catch (err) { console.error(err); ok = false; }
        }
        if (!ok) snapBack(d);
        // Watchdog: a piece must never be left floating between squares.
        setTimeout(function () { if (!drag && dragFns && dragFns.fen) { var f = dragFns.fen(); if (f) api.settle(f); } }, ok ? 2500 : 400);
        return true;
      }
      el2.addEventListener('pointercancel', function (e) { if (drag) endDrag(e, true); down = null; });
      el2.addEventListener('lostpointercapture', function (e) { if (drag && drag.active) endDrag(e, false); });
      window.addEventListener('pointerup', function (e) { if (drag && e.target !== el2) endDrag(e, false); });
      window.addEventListener('blur', function () { if (drag) endDrag(null, true); });
      el2.addEventListener('pointerup', function (e) {
        if (drag) { if (endDrag(e, false)) return; }
        if (!down) return;
        var moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
        if (moved > 7) return;
        var sq = pick(e); if (sq) onClick(sq);
      });
      var hoverPending = null;
      el2.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        hoverPending = e;
      });
      setInterval(function () {
        if (!hoverPending) return;
        var sq = pick(hoverPending); hoverPending = null;
        el2.style.cursor = sq && hoverFn(sq) ? 'pointer' : 'grab';
      }, 80);

      new ResizeObserver(resize).observe(container);
      resize();
      api.setOrientation('w', false);
      if (!REDUCED) { // opening shot: swing in from high above the board's corner
        var end = camTarget(); camera.position.set(end.x + 9, end.y * 1.5, end.z * 0.2 - 7); controls.update();
        introUntil = performance.now() + 2600; moveCamera(true, 2000, 450);
      }
      requestAnimationFrame(loop);
    };
    var introUntil = 0;

    var hPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3);
    function planePoint(e) {
      var rect = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      var out = new THREE.Vector3();
      return ray.ray.intersectPlane(hPlane, out) ? out : null;
    }
    function squareAt(p) { var f = Math.floor(p.x + 4), r = Math.floor(4 - p.z); return f >= 0 && f < 8 && r >= 0 && r < 8 ? 'abcdefgh'[f] + (r + 1) : null; }
    api.setDrag = function (fns) { dragFns = fns; };
    api.setCameraFixed = function (v) { cameraFixed = !!v; if (controls) controls.enableRotate = !cameraFixed; };
    api.settle = function (fen) {
      if (tweens.length) return;
      var bad = Object.keys(meshes).some(function (sq) { var m = meshes[sq], p = pos(sq); return Math.abs(m.position.x - p.x) > 0.01 || Math.abs(m.position.z - p.z) > 0.01 || m.position.y > 0.01; });
      if (bad) api.sync(fen);
    };
    function pick(e) {
      var rect = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      var hits = ray.intersectObjects(pieceGroup.children.concat(starGroup.children), true);
      for (var i = 0; i < hits.length; i++) {
        var o = hits[i].object;
        while (o && !(o.userData && o.userData.sq)) o = o.parent;
        if (o) return o.userData.sq;
      }
      var ph = ray.intersectObject(plane);
      if (ph.length) {
        var p = ph[0].point, f = Math.floor(p.x + 4), r = Math.floor(4 - p.z);
        if (f >= 0 && f < 8 && r >= 0 && r < 8) return 'abcdefgh'[f] + (r + 1);
      }
      return null;
    }

    function fitDist() {
      var w = container.clientWidth || 1, h = container.clientHeight || 1, aspect = w / h;
      var base = viewMode === 'top' ? 13.5 : 12.6;
      // narrow / square boards (phones): pull back so all eight files, both rooks and the labels stay in view
      return base * Math.max(1, Math.pow(1.15 / aspect, 0.85)) * (aspect < 1.3 ? 1.14 : 1);
    }
    var lastFit = 0, refitT = null;
    function resize() {
      var w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
      // the board area changed shape (phone layout switch): frame the whole board again once it settles
      var f = fitDist();
      if (lastFit && Math.abs(f - lastFit) / f > 0.03 && !drag) { clearTimeout(refitT); refitT = setTimeout(function () { if (performance.now() > introUntil) moveCamera(true, 500); }, 160); }
      lastFit = f;
    }
    function camTarget() {
      var d = fitDist(), s = orient === 'w' ? 1 : -1;
      if (viewMode === 'top') return new THREE.Vector3(0, d, 0.001 * s);
      return new THREE.Vector3(0, d * 0.72, d * 0.69 * s);
    }
    function moveCamera(animate, dur, delay) {
      var to = camTarget();
      if (!animate) { camera.position.copy(to); controls.update(); return Promise.resolve(); }
      var from = camera.position.clone();
      // swing around the board instead of passing through it
      var a0 = Math.atan2(from.x, from.z), a1 = Math.atan2(to.x, to.z);
      var r0 = Math.hypot(from.x, from.z), r1 = Math.hypot(to.x, to.z);
      if (Math.abs(a1 - a0) > Math.PI) a1 += a1 < a0 ? Math.PI * 2 : -Math.PI * 2;
      var tok = ++camTok;
      return tween(dur || 900, function (k) {
        if (tok !== camTok) return;
        var a = a0 + (a1 - a0) * k, r = r0 + (r1 - r0) * k;
        camera.position.set(Math.sin(a) * r, from.y + (to.y - from.y) * k, Math.cos(a) * r);
      }, null, delay);
    }
    function placeLabels() {
      labels.forEach(function (l) {
        var i = l.userData.i, s = orient === 'w' ? 1 : -1;
        if (l.userData.kind === 'file') l.position.set(i - 3.5, -0.032, 4.33 * s);
        else l.position.set(-4.33 * s, -0.032, 3.5 - i);
        l.rotation.z = orient === 'w' ? 0 : Math.PI;
      });
    }
    api.setOrientation = function (c, animate) {
      if (c === orient && performance.now() < introUntil) return Promise.resolve(); // let the opening shot finish
      orient = c; placeLabels();
      return moveCamera(animate !== false);
    };
    api.orientation = function () { return orient; };
    api.toggleView = function () { viewMode = viewMode === '3d' ? 'top' : '3d'; controls.autoRotate = false; moveCamera(true); return viewMode; };
    api.idle = function () { controls.autoRotate = false; };
    api.recenter = function () { moveCamera(true); };

    function loop(now) {
      requestAnimationFrame(loop);
      if (document.hidden) return;
      for (var i = tweens.length - 1; i >= 0; i--) {
        var t = tweens[i], k = Math.min(1, (now - t.t0) / t.dur);
        if (k < 0) continue;
        t.update(t.ease(k));
        if (k >= 1) { tweens.splice(i, 1); t.res(); }
      }
      var time = now / 1000;
      starGroup.children.forEach(function (s, j) { s.rotation.y = time * 1.6 + j; s.position.y = 0.45 + Math.sin(time * 2 + j) * 0.07; });
      var dust = scene.getObjectByName('dust'); if (dust) dust.rotation.y = time * 0.01;
      var cp = camera.position, dist = Math.hypot(cp.x, cp.y, cp.z) || 1, fromTop = cp.y / dist > 0.9;
      if (fromTop !== lastTop) { lastTop = fromTop; pieceGroup.children.forEach(function (pc) { if (pc.userData.decalMesh) pc.userData.decalMesh.visible = fromTop; }); }
      controls.update();
      renderer.render(scene, camera);
    }

    // ---------- pieces ----------
    function addPiece(sq, type, color) {
      var m = makePiece(type, color);
      m.position.copy(pos(sq));
      m.userData.sq = sq;
      if (m.userData.decalMesh) m.userData.decalMesh.visible = !!lastTop;
      pieceGroup.add(m); meshes[sq] = m;
      return m;
    }
    function removeMesh(m) { pieceGroup.remove(m); }
    function parseFen(fen) {
      var out = {}, rows = fen.split(' ')[0].split('/');
      rows.forEach(function (row, ri) { var f = 0; for (var i = 0; i < row.length; i++) { var ch = row[i]; if (/\d/.test(ch)) { f += +ch; continue; } out['abcdefgh'[f] + (8 - ri)] = { type: ch.toLowerCase(), color: ch === ch.toLowerCase() ? 'b' : 'w' }; f++; } });
      return out;
    }
    api.setPosition = function (fen, opts) {
      opts = opts || {};
      Object.keys(meshes).forEach(function (k) { removeMesh(meshes[k]); });
      meshes = {};
      var map = parseFen(fen), n = 0, proms = [];
      Object.keys(map).forEach(function (sq) {
        var m = addPiece(sq, map[sq].type, map[sq].color);
        if (opts.drop && !REDUCED) {
          var delay = n++ * 14, h = 2.4 + Math.random() * 1.2;
          m.position.y = h; m.visible = false;
          proms.push(api.wait(delay).then(function () { m.visible = true; return tween(520, function (k) { m.position.y = h * (1 - k); }, easeOutBounce); }));
        }
      });
      return Promise.all(proms);
    };
    function easeOutBounce(x) { var n1 = 7.5625, d1 = 2.75; if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75; if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375; return n1 * (x -= 2.625 / d1) * x + 0.984375; }
    api.sync = function (fen) {
      var map = parseFen(fen);
      Object.keys(meshes).forEach(function (sq) {
        var want = map[sq], m = meshes[sq];
        if (!want || want.type !== m.userData.type || want.color !== m.userData.color) { removeMesh(m); delete meshes[sq]; }
        else { m.position.copy(pos(sq)); m.scale.set(1, 1, 1); m.visible = true; }
      });
      Object.keys(map).forEach(function (sq) { if (!meshes[sq]) addPiece(sq, map[sq].type, map[sq].color); });
    };
    function slide(m, from, to, lift) {
      var p0 = pos(from), p1 = pos(to), dist = p0.distanceTo(p1);
      var h = lift * Math.min(1, 0.45 + dist * 0.12);
      m.userData.moving = true;
      return tween(260 + dist * 45, function (k) {
        m.position.set(p0.x + (p1.x - p0.x) * k, Math.sin(Math.PI * k) * h, p0.z + (p1.z - p0.z) * k);
      }).then(function () { m.userData.moving = false; });
    }
    // The selected piece rises slightly off the board, and settles back when deselected.
    var lifted = null;
    function free(m) { return m && m.parent && !m.userData.moving && !(drag && drag.mesh === m); }
    api.lift = function (sq) {
      var m = sq ? meshes[sq] : null;
      if (lifted && lifted !== m) { var a = lifted, y0 = a.position.y; if (y0 > 0.001) tween(150, function (k) { if (free(a) && lifted !== a) a.position.y = y0 * (1 - k); }); }
      lifted = m;
      if (m) { var y1 = m.position.y; tween(220, function (k) { if (free(m) && lifted === m) m.position.y = y1 + (0.2 - y1) * k; }, easeOutBack); }
    };
    function capture(m) {
      if (!m) return Promise.resolve();
      var y0 = m.position.y;
      return tween(320, function (k) { m.scale.setScalar(1 - k * 0.9); m.position.y = y0 - k * 0.3; m.rotation.y = k * 2; }).then(function () { removeMesh(m); });
    }
    api.animateMove = function (mv, fenAfter) {
      var m = meshes[mv.from];
      if (!m) { if (fenAfter) api.sync(fenAfter); return Promise.resolve(); }
      var proms = [];
      var capSq = mv.flags === 'e' ? mv.to[0] + mv.from[1] : mv.to;
      var victim = mv.captured ? meshes[capSq] : null;
      delete meshes[mv.from];
      if (victim) delete meshes[capSq];
      var lift = m.userData.type === 'n' ? 1.0 : 0.45;
      var mover = mv.dropped ? (function () { var p0 = m.position.clone(), p1 = pos(mv.to); return tween(140, function (k) { m.position.set(p0.x + (p1.x - p0.x) * k, p0.y * (1 - k), p0.z + (p1.z - p0.z) * k); }); })() : slide(m, mv.from, mv.to, lift);
      proms.push(mover.then(function () {
        if (victim) { burst(capSq, [0xe2695c, 0xf0e4c8, 0xe0b45c], 18); capture(victim); }
        if (mv.promotion) {
          removeMesh(m);
          var nm = addPiece(mv.to, mv.promotion, mv.color);
          burst(mv.to, [0xf1c873, 0xffffff], 30);
          return tween(380, function (k) { nm.scale.setScalar(0.3 + 0.7 * easeOutBack(k)); });
        }
      }));
      m.userData.sq = mv.to; meshes[mv.to] = m;
      if (mv.flags === 'k' || mv.flags === 'q') {
        var rank = mv.from[1];
        var rf = mv.flags === 'k' ? 'h' + rank : 'a' + rank, rt = mv.flags === 'k' ? 'f' + rank : 'd' + rank;
        var rm = meshes[rf];
        if (rm) { delete meshes[rf]; rm.userData.sq = rt; meshes[rt] = rm; proms.push(api.wait(120).then(function () { return slide(rm, rf, rt, 0.7); })); }
      }
      return Promise.all(proms).then(function () { if (fenAfter) api.sync(fenAfter); });
    };

    // ---------- markers ----------
    var CAT = {
      hover: { color: 0xffffff, op: 0.1, y: 0.002 }, last: { color: 0xe7c66b, op: 0.32, y: 0.003 }, mark: { color: 0x6fa8dc, op: 0.45, y: 0.004 },
      sel: { color: 0xd6a54e, op: 0.6, y: 0.005 }, check: { color: 0xe2695c, op: 0.65, y: 0.006 }, hint: { color: 0x73c48f, op: 0.55, y: 0.007 },
      bad: { color: 0xe2695c, op: 0.6, y: 0.008 }, good: { color: 0x73c48f, op: 0.6, y: 0.008 }, moves: { color: 0x10161e, op: 0.5, y: 0.01 }
    };
    api.markers = function (cat, items) {
      (cats[cat] || []).forEach(function (m) { overlay.remove(m); m.material.dispose(); });
      cats[cat] = [];
      var c = CAT[cat];
      (items || []).forEach(function (it) {
        var sq = typeof it === 'string' ? it : it.sq;
        var geo = cat === 'moves' ? (it.cap ? GEO.ring : GEO.dot) : GEO.square;
        var mat = new THREE.MeshBasicMaterial({ color: col(c.color), transparent: true, opacity: c.op, depthWrite: false });
        var m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2; m.position.copy(pos(sq, c.y));
        overlay.add(m); cats[cat].push(m);
      });
    };
    api.flash = function (cat, sqs, ms) { api.markers(cat, sqs); setTimeout(function () { api.markers(cat, []); }, ms || 650); };

    api.arrows = function (list) {
      while (arrowGroup.children.length) { var old = arrowGroup.children[0]; arrowGroup.remove(old); old.children.forEach(function (c) { c.geometry.dispose(); c.material.dispose(); }); }
      (list || []).forEach(function (a) {
        var p0 = pos(a[0]), p1 = pos(a[1]);
        var dx = p1.x - p0.x, dz = p1.z - p0.z, L = Math.hypot(dx, dz);
        if (L < 0.1) return;
        var start = 0.22, head = 0.42, w = 0.075, hw = 0.24, end = L - 0.12;
        var s = new THREE.Shape();
        s.moveTo(start, -w); s.lineTo(end - head, -w); s.lineTo(end - head, -hw); s.lineTo(end, 0); s.lineTo(end - head, hw); s.lineTo(end - head, w); s.lineTo(start, w); s.lineTo(start, -w);
        var mesh = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: col(COLORS[a[2] || 'g'] || COLORS.g), transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide }));
        mesh.rotation.x = -Math.PI / 2;
        var g = new THREE.Group(); g.add(mesh);
        g.position.set(p0.x, 0.03 + arrowGroup.children.length * 0.002, p0.z);
        g.rotation.y = Math.atan2(-dz, dx);
        arrowGroup.add(g);
      });
    };

    // ---------- stars and effects ----------
    var glows = {};
    api.stars = function (list) {
      Object.keys(stars).forEach(function (k) { starGroup.remove(stars[k]); });
      Object.keys(glows).forEach(function (k) { overlay.remove(glows[k]); });
      stars = {}; glows = {};
      (list || []).forEach(function (sq) {
        var m = new THREE.Mesh(GEO.star, MAT.star); m.castShadow = true;
        m.position.copy(pos(sq, 0.45)); m.userData = { sq: sq };
        starGroup.add(m); stars[sq] = m;
        var gl = new THREE.Mesh(GEO.glow, MAT.glow); gl.rotation.x = -Math.PI / 2; gl.position.copy(pos(sq, 0.012)); overlay.add(gl); glows[sq] = gl;
      });
    };
    api.takeStar = function (sq) {
      var m = stars[sq]; if (!m) return false;
      delete stars[sq]; if (glows[sq]) { overlay.remove(glows[sq]); delete glows[sq]; }
      burst(sq, [0xf1c873, 0xffe9b0, 0xffffff], 26);
      tween(260, function (k) { m.scale.setScalar(1 + k); m.position.y = 0.45 + k * 0.8; }).then(function () { starGroup.remove(m); });
      return true;
    };
    function burst(sq, colors, n) {
      if (REDUCED) return;
      var origin = pos(sq, 0.3), parts = [];
      for (var i = 0; i < n; i++) {
        var m = new THREE.Mesh(GEO.spark, new THREE.MeshBasicMaterial({ color: col(colors[i % colors.length]), transparent: true }));
        m.position.copy(origin);
        var v = new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3);
        parts.push({ m: m, v: v }); fxGroup.add(m);
      }
      tween(900, function (k) {
        var t = k * 0.9;
        parts.forEach(function (p) {
          p.m.position.set(origin.x + p.v.x * t, origin.y + p.v.y * t - 4.9 * t * t, origin.z + p.v.z * t);
          p.m.rotation.x = t * 8; p.m.rotation.y = t * 6;
          p.m.material.opacity = 1 - k;
        });
      }, function (k) { return k; }).then(function () { parts.forEach(function (p) { fxGroup.remove(p.m); p.m.material.dispose(); }); });
    }
    api.burst = function (sq) { burst(sq, [0x73c48f, 0xf1c873, 0xf0e4c8, 0x6fa8dc], 44); };
    api.clearAll = function () { Object.keys(cats).forEach(function (c) { api.markers(c, []); }); api.arrows([]); api.stars([]); };
    return api;
  })();

  // ================= DOM helpers =================
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var panel, ACT = {};
  var PANEL_ANIM = false;
  function setPanel(html) {
    panel.classList.remove('enter');
    panel.innerHTML = html; panel.scrollTop = 0;
    if (PANEL_ANIM) { PANEL_ANIM = false; void panel.offsetWidth; panel.classList.add('enter'); clearTimeout(setPanel._t); setPanel._t = setTimeout(function () { panel.classList.remove('enter'); }, 900); }
  }
  function toast(msg, kind) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (kind || '');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = 'toast'; }, 2200);
  }
  function setStatus(text, kind) {
    var el = $('#status'); if (!el) return;
    el.innerHTML = text; el.className = 'status ' + (kind || '');
  }
  var PIECE_NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

  // ================= Board interaction =================
  var IX = { game: null, enabled: false, selected: null, canMove: function () { return false; }, onMove: null, collect: null };
  function kingSq(g) { var k = g.kings[g.side ? 1 : 0]; return k >= 0 ? Game.sqName(k) : null; }
  function showCheck(g) { B3.markers('check', g && g.inCheck() ? [kingSq(g)] : []); }
  function deselect() { IX.selected = null; B3.markers('sel', []); B3.markers('moves', []); if (B3.lift) B3.lift(null); }
  function selectSq(sq) {
    IX.selected = sq; IX.lastSel = sq;
    if (B3.lift) B3.lift(sq);
    var ms = IX.game.moves({ square: sq });
    B3.markers('sel', [sq]);
    B3.markers('moves', ms.map(function (m) { return { sq: m.to, cap: !!m.captured }; }));
  }
  function askPromotion(color) {
    return new Promise(function (res) {
      var box = $('#promo');
      box.innerHTML = '<div class="promo-card"><p>Promote to</p><div class="promo-row">' + ['q', 'r', 'b', 'n'].map(function (t) {
        return '<button class="promo-btn" data-p="' + t + '" aria-label="' + PIECE_NAME[t] + '"><span class="glyph">' + pieceSVG(t, color, 40) + '</span><span>' + PIECE_NAME[t] + '</span></button>';
      }).join('') + '</div></div>';
      box.hidden = false;
      box.onclick = function (e) { var b = e.target.closest('[data-p]'); if (!b) return; box.hidden = true; box.onclick = null; res(b.dataset.p); };
    });
  }
  function onBoardClick(sq) {
    if (IX.tap) return IX.tap(sq);
    if (IX.collect) return Collect.click(sq);
    if (!IX.enabled || !IX.game) return;
    var g = IX.game, p = g.get(sq);
    if (IX.selected) {
      if (sq === IX.selected) { deselect(); return; }
      var legal = g.moves({ square: IX.selected }).filter(function (m) { return m.to === sq; });
      if (legal.length) {
        var from = IX.selected; deselect();
        if (legal.length > 1) { askPromotion(g.turn()).then(function (pr) { submitMove({ from: from, to: sq, promotion: pr }); }); }
        else submitMove({ from: from, to: sq, promotion: legal[0].promotion });
        return;
      }
      if (p && p.color === g.turn() && IX.canMove(p.color)) { selectSq(sq); return; }
      var mover = g.get(IX.selected); deselect();
      if (mover) { B3.flash('bad', [sq], 350); Sound.play('bad'); toast(illegalWhy(g, mover, IX.lastSel, sq)); }
      return;
    }
    if (p && p.color === g.turn() && IX.canMove(p.color)) selectSq(sq);
    else if (p && p.color !== g.turn() && IX.enabled) toast('That is your opponent\'s piece. Tap one of yours.');
  }
  var MOVE_RULE = { r: 'Rooks move in straight lines: up, down, left or right.', b: 'Bishops move only diagonally.', q: 'The queen moves in straight lines or diagonally, without jumping.', n: 'Knights jump in an L: two squares one way, then one to the side.', k: 'The king moves one square at a time.', p: 'Pawns move straight forward and capture one square diagonally.' };
  function illegalWhy(g, piece, from, to) {
    var pseudo = new Game(g.fen())._pseudo(false).some(function (m) { return Game.sqName(m.f) === from && Game.sqName(m.t) === to; });
    if (pseudo) return g.inCheck() ? 'You are in check: that move does not get your king out of it.' : 'That move would leave your king in check.';
    return MOVE_RULE[piece.type] || 'That move is not allowed.';
  }
  function onBoardHover(sq) {
    if (IX.tap) return true;
    if (IX.collect) return sq === IX.collect.at || !!IX.collect.targets[sq];
    if (!IX.enabled || !IX.game) return false;
    var p = IX.game.get(sq);
    if (p && p.color === IX.game.turn() && IX.canMove(p.color)) return true;
    if (IX.selected) return IX.game.moves({ square: IX.selected }).some(function (m) { return m.to === sq; });
    return false;
  }
  function submitMove(mv) {
    IX.enabled = false;
    var uci = mv.from + mv.to + (mv.promotion || '');
    var g = IX.game;
    Promise.resolve(IX.onMove && IX.onMove(mv, uci)).catch(function (e) { console.error(e); IX.enabled = true; })
      .then(function () { if (PENDING_DROP) { PENDING_DROP = null; if (g) B3.sync(g.fen()); } });
  }
  function dragCan(sq) {
    if (IX.tap) return false;
    if (IX.collect) return sq === IX.collect.at && !IX.collect.busy;
    if (!IX.enabled || !IX.game) return false;
    var p = IX.game.get(sq);
    return !!(p && p.color === IX.game.turn() && IX.canMove(p.color));
  }
  function dragStart(sq) {
    if (IX.collect) { IX.collect.selected = true; Collect.refresh(); return; }
    selectSq(sq);
  }
  function dragDrop(from, to) {
    if (IX.collect) { if (!IX.collect.targets[to]) { IX.collect.selected = false; Collect.refresh(); return false; } IX.collect.dropNext = true; Collect.click(to); return true; }
    var g = IX.game;
    var legal = g.moves({ square: from }).filter(function (m) { return m.to === to; });
    deselect();
    if (!legal.length) { Sound.play('bad'); return false; }
    PENDING_DROP = { from: from, to: to };
    if (legal.length > 1) askPromotion(g.turn()).then(function (pr) { submitMove({ from: from, to: to, promotion: pr }); });
    else submitMove({ from: from, to: to, promotion: legal[0].promotion });
    return true;
  }
  var PENDING_DROP = null;
  function applyMove(g, mv) {
    var res = g.move(mv);
    if (!res) return Promise.resolve(null);
    if (PENDING_DROP && PENDING_DROP.from === res.from && PENDING_DROP.to === res.to) { res.dropped = true; PENDING_DROP = null; }
    B3.markers('last', [res.from, res.to]);
    B3.arrows([]);
    Sound.play(res.captured ? 'capture' : (/[+#]/.test(res.san) ? 'check' : 'move'));
    return B3.animateMove(res, g.fen()).then(function () { showCheck(g); return res; });
  }
  function uciObj(u) { return { from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }; }
  function setupBoard(fen, opts) {
    opts = opts || {};
    deselect(); B3.clearAll(); IX.collect = null;
    var g = new Game(fen);
    IX.game = g;
    var p = B3.setPosition(fen, { drop: opts.drop });
    if (opts.orient) B3.setOrientation(opts.orient);
    showCheck(g);
    return g;
  }

  // ================= Collect mini-game =================
  var Collect = {
    start: function (step, onDone) {
      deselect(); B3.clearAll(); IX.game = null; IX.enabled = false;
      var fenRows = [];
      var c = { piece: step.piece, at: step.start, left: step.stars.slice(), moves: 0, par: step.par, onDone: onDone, targets: {}, selected: false, step: step };
      IX.collect = c;
      B3.setPosition(fenOf(step.piece, step.start), { drop: true });
      B3.stars(step.stars);
      B3.setOrientation('w');
      Collect.refresh();
    },
    refresh: function () {
      var c = IX.collect; c.targets = {};
      Collect.reach(c.piece, c.at).forEach(function (s) { c.targets[s] = true; });
      if (c.selected) { B3.markers('sel', [c.at]); B3.markers('moves', Object.keys(c.targets).map(function (s) { return { sq: s, cap: c.left.indexOf(s) >= 0 }; })); }
      else { B3.markers('sel', []); B3.markers('moves', []); }
      var el = $('#collect-count'); if (el) el.textContent = c.moves + (c.moves === 1 ? ' move · ' : ' moves · ') + (c.step.stars.length - c.left.length) + '/' + c.step.stars.length + ' stars';
    },
    reach: function (piece, at) {
      var f = at.charCodeAt(0) - 97, r = +at[1] - 1, out = [];
      function add(ff, rr) { if (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) out.push('abcdefgh'[ff] + (rr + 1)); }
      var dirs = { r: [[1, 0], [-1, 0], [0, 1], [0, -1]], b: [[1, 1], [1, -1], [-1, 1], [-1, -1]] };
      dirs.q = dirs.r.concat(dirs.b);
      if (piece === 'n') [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(function (d) { add(f + d[0], r + d[1]); });
      else if (piece === 'k') dirs.q.forEach(function (d) { add(f + d[0], r + d[1]); });
      else dirs[piece].forEach(function (d) { for (var i = 1; i < 8; i++) add(f + d[0] * i, r + d[1] * i); });
      return out;
    },
    click: function (sq) {
      var c = IX.collect; if (!c || c.busy) return;
      if (sq === c.at) { c.selected = !c.selected; Collect.refresh(); return; }
      if (!c.targets[sq]) { if (c.selected) { c.selected = false; Collect.refresh(); B3.flash('bad', [sq], 350); Sound.play('bad'); toast(MOVE_RULE[c.piece]); } return; }
      c.busy = true; c.selected = false; B3.markers('sel', []); B3.markers('moves', []);
      var from = c.at; c.at = sq; c.moves++;
      Sound.play('move');
      var dropped = !!c.dropNext; c.dropNext = false;
      B3.animateMove({ from: from, to: sq, flags: 'n', color: 'w', dropped: dropped }).then(function () {
        var i = c.left.indexOf(sq);
        if (i >= 0) { c.left.splice(i, 1); B3.takeStar(sq); Sound.play('star'); }
        c.busy = false; c.selected = true;
        Collect.refresh();
        if (!c.left.length) {
          c.selected = false; Collect.refresh();
          var starsEarned = c.moves <= c.par ? 3 : c.moves <= c.par + 2 ? 2 : 1;
          IX.collect = null;
          c.onDone(starsEarned, c.moves);
        }
      });
    }
  };
  function fenOf(piece, sq) {
    var rows = [];
    for (var r = 8; r >= 1; r--) {
      var row = '', e = 0;
      for (var f = 0; f < 8; f++) {
        var s = 'abcdefgh'[f] + r;
        if (s === sq) { if (e) { row += e; e = 0; } row += piece.toUpperCase(); } else e++;
      }
      if (e) row += e; rows.push(row);
    }
    return rows.join('/') + ' w - - 0 1';
  }

  // ================= Navigation =================
  var current = null;
  var LOCKABLE = { openings: 'Openings', play: 'Coach games' };
  // Features open up quickly: coach games after 1 lesson, openings after 3.
  var UNLOCK_AT = { play: 1, openings: 3 };
  function lessonsDone() { return Object.keys(S.lessons).filter(function (k) { return S.lessons[k] && S.lessons[k].done; }).length; }
  function isLocked(mode) { return !!LOCKABLE[mode] && beginnerMode() && !S.peek[mode] && lessonsDone() < UNLOCK_AT[mode]; }
  function lockedScreen(mode) {
    var st = STAGES[0], done = Math.min(lessonsDone(), UNLOCK_AT[mode]);
    setupBoard(Game.START, { orient: 'w' });
    setPanel('<div class="locked-screen"><div class="lock-orb" aria-hidden="true">' + pieceSVG(mode === 'play' ? 'k' : 'b', 'w', 54) + '</div>' +
      '<div class="eyebrow">Unlocks after ' + UNLOCK_AT[mode] + ' lesson' + (UNLOCK_AT[mode] > 1 ? 's' : '') + '</div><h1 class="h1">' + LOCKABLE[mode] + ' are almost ready</h1>' +
      '<p class="lede">' + (mode === 'play' ? 'After your first lesson you will play full games against me, with tips on every move.' : 'After ' + UNLOCK_AT.openings + ' lessons you will learn real openings and traps, one move at a time.') + '</p>' +
      '<div class="lock-progress"><i style="width:' + Math.round(done / UNLOCK_AT[mode] * 100) + '%"></i></div><p class="muted small">' + done + ' of ' + UNLOCK_AT[mode] + ' lessons done</p>' +
      '<div class="actions"><button class="btn primary big" data-act="startNext">Continue learning</button></div>' +
      '<button class="link small" data-act="peek" data-m="' + mode + '">I already know the basics, let me in</button></div>');
  }
  ACT.peek = function (d) { S.peek[d.m] = true; save(); go(d.m); };
  function go(mode, arg) {
    if (current === MODES.play && PL && PL.g && !PL.over && PL.g.history().length >= 2 && !go.force) {
      var m = $('#modal'); m.classList.remove('intro');
      m.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true"><div class="eyebrow">Game in progress</div><h1 class="h1">Leave this game?</h1><p class="lede">The game ends here and is not saved.</p><div class="actions"><button class="btn primary" data-leave="stay">Keep playing</button><button class="btn ghost" data-leave="go">Leave the game</button></div></div>';
      m.hidden = false;
      m.onclick = function (e) { var b = e.target.closest('[data-leave]'); if (!b && e.target !== m) return; m.hidden = true; m.onclick = null; if (b && b.dataset.leave === 'go') { go.force = true; go(mode, arg); go.force = false; } };
      return;
    }
    if (isLocked(mode)) {
      if (current && current.leave) current.leave();
      Voice.stop(); Replay.stop(); current = MODES.path; IX.enabled = false; IX.onMove = null; IX.collect = null; IX.tap = null;
      document.querySelectorAll('.rail button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === mode); });
      $('#evalbar').hidden = true; $('#mode-label').textContent = LOCKABLE[mode];
      lockedScreen(mode); return;
    }
    if (current && current.leave) current.leave();
    Voice.stop(); Bubble.hide();
    var tab = { lesson: 'path', stagetest: 'path', opening: 'openings', rush: 'puzzles', vision: 'arena', review: 'play', practice: 'play' }[mode] || mode;
    if (mode === 'play' && arg && arg.spec) tab = 'arena';
    document.querySelectorAll('.rail button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === tab); });
    $('#evalbar').hidden = true;
    B3.idle(false);
    IX.enabled = false; IX.onMove = null; IX.collect = null; IX.tap = null; Replay.stop();
    current = MODES[mode];
    document.body.dataset.mode = mode;
    PANEL_ANIM = true;
    current.enter(arg);
    $('#mode-label').textContent = current.label || '';
    setLayout();
  }
  // Phone layout: board-first screens get a full-width square board; browsing screens get a small board and more room.
  var BOARD_MODES = { lesson: 1, opening: 1, puzzles: 1, rush: 1, review: 1, practice: 1, stagetest: 1, vision: 1 };
  function setLayout() {
    var m = document.body.dataset.mode, board = !!BOARD_MODES[m] || (m === 'play' && PL && PL.g);
    document.body.dataset.layout = board ? 'board' : 'browse';
    closeTools();
  }
  var MQ = window.matchMedia ? window.matchMedia('(max-width: 880px) and (orientation: portrait)') : null;
  function applyMob() {
    var mob = !!(MQ && MQ.matches), b = $('#coach-bubble'), app = $('#app');
    document.body.classList.toggle('mob', mob);
    if (!b) return;
    if (b.parentNode !== app) app.insertBefore(b, $('#panel'));
  }
  function closeTools() { var t = $('.board-tools'); if (t) t.classList.remove('open'); var tb = $('#tools-btn'); if (tb) tb.setAttribute('aria-expanded', 'false'); }

  // ================= Path (home) =================
  // Placement: the stage that matches the level picked at the start. Stages below it count as cleared,
  // and so does any stage the player tested out of.
  function placementStage(band) { var k = 0; STAGES.forEach(function (st, i) { if ((band == null ? S.band : band) >= st.min) k = i; }); return k; }
  function lessonDone(id) { return !!(S.lessons[id] && S.lessons[id].done); }
  function placedOut(i) { return i < placementStage() || !!(S.cleared && S.cleared[STAGES[i].id]); }
  function stageComplete(i) { return STAGES[i].lessons.every(lessonDone); }
  function stageCleared(i) { return placedOut(i) || stageComplete(i); }
  function stageUnlocked(i) {
    var st = STAGES[i];
    if (S.band >= st.min) return true;
    if (i === 0) return true;
    return stageCleared(i - 1);
  }
  function nextLesson() {
    for (var i = 0; i < STAGES.length; i++) {
      if (!stageUnlocked(i) || stageCleared(i)) continue;
      for (var j = 0; j < STAGES[i].lessons.length; j++) { var id = STAGES[i].lessons[j]; if (!lessonDone(id)) return id; }
    }
    return null; // every stage is cleared
  }
  // Coach strength and opening difficulty that suit a rating
  function levelForRating(r) { return r < 800 ? 'novice' : r < 1200 ? 'club' : r < 1600 ? 'strong' : r < 2000 ? 'expert' : 'master'; }
  function openingTier(r) { return r < 800 ? 0 : r < 1400 ? 1 : 2; }
  var TIER = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  function stageOf(lessonId) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].lessons.indexOf(lessonId) >= 0) return i; return 0; }

  var MODES = {};
  var PATHUI = { open: null };
  // Everything the app can do, visible from day one; locked items say exactly when they open.
  function exploreStrip() {
    var items = [
      { m: 'arena', ico: 'q', t: 'Practice Arena', s: 'Quick games, bosses', act: 'arena' },
      { m: 'puzzles', ico: 'n', t: 'Puzzles', s: PUZZLES.length + ' tactics' },
      { m: 'rush', ico: 'q', t: 'Puzzle Rush', s: '3 lives, beat the clock', act: 'rushStart' },
      { m: 'play', ico: 'k', t: 'Play the coach', s: '5 levels, live tips' },
      { m: 'openings', ico: 'b', t: 'Openings', s: OPENINGS.length + ' lines & traps' },
      { m: 'progress', ico: 'r', t: 'Badges', s: 'Track your climb' }
    ];
    return '<div class="sect-head"><h2>Explore</h2><span class="muted small">jump in anytime</span></div><div class="explore">' + items.map(function (it) {
      var lock = isLocked(it.m), need = lock ? UNLOCK_AT[it.m] - lessonsDone() : 0;
      return '<button class="ex-tile' + (lock ? ' locked' : '') + '" ' + (it.act ? 'data-act="' + it.act + '"' : 'data-act="goMode" data-m="' + it.m + '"') + '><span class="ex-ico">' + pieceSVG(it.ico, 'w', 24) + '</span><b>' + it.t + '</b><span>' + (lock ? '🔒 after ' + need + ' more lesson' + (need > 1 ? 's' : '') : it.s) + '</span></button>';
    }).join('') + '</div>';
  }
  ACT.goMode = function (d) { go(d.m); };
  MODES.path = {
    label: 'Training path',
    enter: function (rerender) {
      if (!rerender) {
        setupBoard(Game.START, { drop: true, orient: 'w' });
        setTimeout(function () { if (current === MODES.path) B3.idle(true); }, 1400);
      }
      var d = today(), day = Math.min(dayNumber(), 30), nl = nextLesson(), allClear = !nl;
      if (allClear) nl = STAGES[STAGES.length - 1].lessons[0];
      var L = LESSONS[nl], cur = allClear ? STAGES.length - 1 : stageOf(nl), placed = placementStage();
      var openStage = PATHUI.open == null ? cur : PATHUI.open;
      var R = S.puzzle.rating, marks = [100, 400, 800, 1200, 1600, 2000];
      var seg = 0; while (seg < 4 && R >= marks[seg + 1]) seg++;
      var pct = Math.max(0, Math.min(100, (seg + Math.min(1, Math.max(0, (R - marks[seg]) / (marks[seg + 1] - marks[seg])))) * 20));
      var chip = function (done, label, sub, act, icon) {
        return '<button class="mchip ' + (done ? 'done' : '') + '" data-act="' + act + '"><span class="mc-ico" aria-hidden="true">' + (done ? '✓' : icon) + '</span><span class="mc-label">' + label + '</span><span class="mc-sub">' + sub + '</span></button>';
      };
      var html =
        '<section class="hero-card"><span class="hero-mark" aria-hidden="true">' + pieceSVG('n', 'w', 130) + '</span>' +
        '<div class="eyebrow">Day ' + day + ' of 30 · ' + esc(STAGES[cur].name) + ' · ' + STAGES[cur].band + '</div>' +
        (allClear ? '<h1 class="h1">Every stage cleared</h1><p class="lede">The whole course is behind you. Keep sharpening with puzzles at your rating, master openings, and beat the strongest coach.</p>' +
          '<button class="btn primary big" data-act="goPlay">▶&nbsp; Play the ' + esc(levelById(levelForRating(S.puzzle.rating)).name) + ' coach</button>'
        : '<h1 class="h1">Next up: ' + esc(L.title) + '</h1>' +
          '<p class="lede">' + esc(L.goal) + '</p>' +
          '<button class="btn primary big" data-act="startNext">▶&nbsp; Start lesson · ' + lessonMins(L) + ' min</button>') +
        '</section>' +
        (placed > 0 ? '<div class="placed-note"><span class="pn-ico" aria-hidden="true">✓</span><span><b>Placed at ' + S.band + '.</b> ' + esc(STAGES.slice(0, placed).map(function (st) { return st.name; }).join(', ')) + (placed > 1 ? ' are' : ' is') + ' marked cleared, so your course starts at ' + esc(STAGES[placed].name) + '. Open a cleared stage any time to review it.</span></div>' : '') +
        '<div class="ladder" aria-label="Your rating on the 100 to 2000 ladder">' +
        '<div class="ladder-track"><i style="width:' + pct + '%"></i><span class="ladder-me" style="left:' + pct + '%"><b>' + Math.round(R) + '</b></span></div>' +
        '<div class="ladder-marks">' + marks.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div></div>' +
        '<div class="sect-head"><h2>Today\'s missions</h2><span class="pill-count">' + missionsDone(d) + '/' + missionsTotal() + '</span></div>' +
        '<div class="mchips">' + missionList(d).map(function (m, i) { return chip(m.done, m.label, m.sub || esc(L.title), m.act, String(i + 1)); }).join('') + '</div>' +
        exploreStrip() +
        (function () { var pool = MORE_POOLS.tip_day, i = (dayNumber() - 1 + (S.startDate ? S.startDate.length : 0)) % pool.length; return '<button class="tipday" data-act="sayTip" data-i="' + i + '"><span class="tip-ico" aria-hidden="true">▶</span><span>' + esc(pool[i]) + '</span></button>'; })() +
        '<div class="sect-head"><h2>Your journey</h2><button class="link" data-act="tour">Replay tour</button></div>' +
        '<ol class="journey">' + STAGES.map(function (st, i) {
          var open = stageUnlocked(i), expanded = i === openStage && open;
          var doneN = st.lessons.filter(lessonDone).length, skipped = placedOut(i) && doneN < st.lessons.length;
          var state = doneN === st.lessons.length ? 'done' : skipped ? 'done placed' : i === cur && !allClear ? 'current' : open ? 'open' : 'locked';
          var how = skipped ? (i < placed ? 'Cleared · you placed above it' : 'Cleared · passed the stage test') : doneN + '/' + st.lessons.length + ' lessons';
          return '<li class="jstage ' + state + (expanded ? ' expanded' : '') + '">' +
            '<button class="jhead" data-act="toggleStage" data-i="' + i + '" ' + (open ? '' : 'disabled') + ' aria-expanded="' + expanded + '">' +
            '<span class="jdot" aria-hidden="true">' + (state === 'done' ? '✓' : state === 'locked' ? '🔒' : i + 1) + '</span>' +
            '<span class="jtext"><span class="jname">' + esc(st.name) + (skipped ? ' <em class="clear-pill">Cleared</em>' : '') + '</span><span class="jband">' + st.band + ' · ' + how + '</span></span>' +
            '<span class="jchev" aria-hidden="true">' + (open ? (expanded ? '−' : '+') : '') + '</span></button>' +
            (expanded ? '<p class="jblurb">' + esc(st.blurb) + '</p>' +
              (!stageCleared(i) && open && testPool(i).length >= 3 ? '<button class="test-out" data-act="stageTest" data-i="' + i + '"><span class="to-ico" aria-hidden="true">⚡</span><span><b>Know this already?</b><span>Solve 3 of 4 puzzles at ' + st.band + ' to clear the stage.</span></span><span class="to-go" aria-hidden="true">→</span></button>' : '') +
              '<div class="jlessons">' + st.lessons.map(function (id, k) {
              var L2 = LESSONS[id], rec = S.lessons[id], isNext = id === nl && !allClear, stops = stageStops(i);
              // after every second lesson (and at the end of the stage) an opening stop
              var stop = k % 2 === 1 && stops[(k - 1) / 2] ? stopHtml(stops[(k - 1) / 2]) : '';
              if (k === st.lessons.length - 1) stops.slice(Math.floor(st.lessons.length / 2)).forEach(function (sid) { stop += stopHtml(sid); }); // stops left over in short stages
              return '<button class="jlesson ' + (rec && rec.done ? 'done' : '') + (isNext ? ' next' : '') + '" data-act="lesson" data-id="' + id + '">' +
                '<span class="jl-num">' + (rec && rec.done ? '✓' : k + 1) + '</span><span class="jl-title">' + esc(L2.title) + '</span>' +
                '<span class="jl-meta">' + (rec && rec.done ? '★'.repeat(rec.stars || 3) : isNext ? 'Up next' : skipped ? 'Review' : lessonMins(L2) + ' min') + '</span></button>' + stop + (k === st.lessons.length - 1 ? bossNode(i) : '');
            }).join('') + '</div>' : '') + '</li>';
        }).join('') + '</ol>';
      setPanel(html);
    },
    leave: function () { B3.idle(false); }
  };
  ACT.startNext = function () { var nl = nextLesson(); if (nl) go('lesson', nl); else go('play'); };
  ACT.sayTip = function (d) { var i = +d.i; Voice.say([{ id: 'V-tip_day-' + i, text: MORE_POOLS.tip_day[i] }]); };
  ACT.toggleStage = function (d) { var i = +d.i, nl0 = nextLesson(), cur = PATHUI.open == null ? (nl0 ? stageOf(nl0) : STAGES.length - 1) : PATHUI.open; PATHUI.open = cur === i ? -1 : i; MODES.path.enter(true); };
  ACT.lesson = function (d) { go('lesson', d.id); };
  ACT.goPuzzles = function () { go('puzzles'); };
  ACT.goOpenings = function () { go('openings'); };
  ACT.goPlay = function () { go('play'); };
  ACT.goPath = function () { go('path'); };

  // ================= Stage test: skip a stage you already know =================
  function testPool(i) {
    var lo = STAGES[i].min, hi = STAGES[i + 1] ? STAGES[i + 1].min : 2300;
    return PUZZLES.filter(function (p) { return p.r >= lo && p.r < hi + 100; });
  }
  var ST = null;
  MODES.stagetest = {
    label: 'Stage test',
    enter: function (i) {
      var pool = testPool(+i).slice();
      for (var k = pool.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), t = pool[k]; pool[k] = pool[j]; pool[j] = t; }
      ST = { i: +i, list: pool.slice(0, 4).sort(function (a, b) { return a.r - b.r; }), k: 0, res: [], need: 3 };
      MODES.stagetest.load();
    },
    load: function () {
      var p = ST.list[ST.k], fen = puzzleFen(p), g = setupBoard(fen, { drop: true, orient: new Game(fen).turn() });
      ST.ply = 0; ST.busy = false;
      IX.enabled = true; IX.canMove = function (c) { return c === g.turn() && !ST.busy; }; IX.onMove = MODES.stagetest.onMove;
      Voice.say([V(p.mate === 1 ? 'puzzle_mate1' : p.mate === 2 ? 'puzzle_mate2' : 'puzzle_start')], true);
      MODES.stagetest.render();
    },
    render: function (msg, kind) {
      var st = STAGES[ST.i], p = ST.list[ST.k], turn = new Game(puzzleFen(p)).turn();
      var pips = ST.list.map(function (q, n) { var r = ST.res[n]; return '<span class="tpip ' + (r === true ? 'ok' : r === false ? 'miss' : n === ST.k ? 'cur' : '') + '">' + (r === true ? '✓' : r === false ? '✕' : n + 1) + '</span>'; }).join('');
      setPanel('<button class="back" data-act="goPath">← Path</button><div class="eyebrow">Stage test · ' + esc(st.name) + ' · ' + st.band + '</div>' +
        '<h1 class="h1">Prove you know ' + esc(st.name) + '</h1>' +
        '<p class="lede">Solve ' + ST.need + ' of ' + ST.list.length + ' puzzles and the whole stage is marked cleared. One try each.</p>' +
        '<div class="tpips" aria-label="Puzzle ' + (ST.k + 1) + ' of ' + ST.list.length + '">' + pips + '</div>' +
        '<div class="coach-card"><div class="coach-tag">Puzzle ' + (ST.k + 1) + ' of ' + ST.list.length + ' · ' + p.r + '</div><p class="coach-text"><strong>' + (turn === 'w' ? 'White' : 'Black') + ' to move.</strong> ' + (p.mate ? 'Find mate in ' + p.mate + '.' : 'Find the best move.') + '</p></div>' +
        '<div id="status" class="status ' + (kind || '') + '">' + (msg || '') + '</div>' +
        '<div class="actions"><button class="btn ghost" data-act="goPath">Stop the test</button></div>');
    },
    onMove: function (mv, uci) {
      var p = ST.list[ST.k], g = IX.game, t = new Game(g.fen()); t.move(mv);
      var ok = uci === p.sol[ST.ply] || (ST.ply === 0 && p.accept && p.accept.indexOf(uci) >= 0) || t.inCheckmate();
      if (!ok) {
        ST.busy = true; Sound.play('bad'); B3.flash('bad', [mv.to]); Voice.say([V('puzzlemiss', 'puzzlemiss')], true);
        var u = p.sol[ST.ply]; B3.arrows([[u.slice(0, 2), u.slice(2, 4), 'g']]);
        return MODES.stagetest.result(false, 'Missed. The green arrow shows the winning move.');
      }
      return applyMove(g, mv).then(function () {
        ST.ply++;
        if (t.inCheckmate() || ST.ply >= p.sol.length || uci !== p.sol[ST.ply - 1]) { B3.burst(mv.to); Sound.play('good'); return MODES.stagetest.result(true, '<strong>Solved.</strong> ' + esc(p.explain)); }
        MODES.stagetest.render('Correct, keep going.', 'good');
        return B3.wait(400).then(function () { return applyMove(g, uciObj(p.sol[ST.ply])); }).then(function () {
          ST.ply++;
          if (ST.ply >= p.sol.length) { Sound.play('good'); return MODES.stagetest.result(true, '<strong>Solved.</strong> ' + esc(p.explain)); }
          IX.enabled = true;
        });
      });
    },
    result: function (ok, msg) {
      IX.enabled = false; ST.res[ST.k] = ok;
      var okN = ST.res.filter(Boolean).length, missN = ST.res.length - okN, left = ST.list.length - ST.res.length;
      MODES.stagetest.render(msg, ok ? 'good' : 'bad');
      if (okN >= ST.need || missN > ST.list.length - ST.need || !left) return B3.wait(1600).then(function () { if (current === MODES.stagetest) MODES.stagetest.finish(okN >= ST.need); });
      return B3.wait(1600).then(function () { if (current === MODES.stagetest) { ST.k++; MODES.stagetest.load(); } });
    },
    finish: function (pass) {
      var st = STAGES[ST.i], okN = ST.res.filter(Boolean).length;
      document.body.dataset.layout = 'browse';
      if (pass) {
        S.cleared = S.cleared || {}; S.cleared[st.id] = true; save(); addXP(60);
        Sound.play('win'); confetti(); Badges.award('stage_' + (ST.i + 1));
        if (!Celebrate.pending()) Voice.say([V('stage_done')]);
        var nl = nextLesson();
        setPanel('<button class="back" data-act="goPath">← Path</button><div class="eyebrow">Stage test passed · +60 XP</div><h1 class="h1">' + esc(st.name) + ' cleared</h1>' +
          '<p class="lede">' + okN + ' solved' + (ST.res.length > okN ? ', ' + (ST.res.length - okN) + ' missed' : ' in a row') + '. You skip straight to ' + (nl ? esc(STAGES[stageOf(nl)].name) : 'the end of the course') + '.</p>' +
          '<div class="actions">' + (nl ? '<button class="btn primary big" data-act="lesson" data-id="' + nl + '">▶&nbsp; Start ' + esc(LESSONS[nl].title) + '</button>' : '<button class="btn primary big" data-act="goPlay">▶&nbsp; Play the coach</button>') + '</div>' +
          '<div class="actions plain"><button class="btn ghost" data-act="goPath">Back to path</button></div>');
      } else {
        Voice.say([V('drilldone', 'drilldone')]);
        setPanel('<button class="back" data-act="goPath">← Path</button><div class="eyebrow">Stage test</div><h1 class="h1">Not quite yet</h1>' +
          '<p class="lede">' + okN + ' of ' + ST.list.length + ' solved. You need ' + ST.need + '. The lessons in ' + esc(st.name) + ' cover exactly these patterns.</p>' +
          '<div class="actions"><button class="btn primary" data-act="startNext">Start the lessons</button><button class="btn" data-act="stageTest" data-i="' + ST.i + '">Try a new test</button></div>');
      }
    },
    leave: function () { ST = ST && Object.assign(ST, { gone: true }); }
  };
  ACT.stageTest = function (d) { go('stagetest', +d.i); };

  // ================= Lesson =================
  var LS = null;
  MODES.lesson = {
    label: 'Lesson',
    enter: function (id) {
      LS = { id: id, L: LESSONS[id], i: 0, mistakes: 0, stepDone: false };
      Voice.prefetch(['L-' + id + '-0', 'V-correct-0']);
      MODES.lesson.render();
      MODES.lesson.loadStep();
    },
    render: function () {
      var L = LS.L, st = STAGES[stageOf(LS.id)], step = L.steps[LS.i];
      var dots = L.steps.map(function (s, i) { return '<span class="dot ' + (i < LS.i ? 'done' : i === LS.i ? 'cur' : '') + '"></span>'; }).join('');
      var kind = step.t === 'read' ? 'Concept' : step.t === 'collect' ? 'Mini-game' : 'Your move';
      var actions = '';
      if (step.t === 'read') actions = (step.line ? '<button class="btn" data-act="playLine">Play the line</button>' : '') + '<button class="btn primary" data-act="nextStep">' + (LS.i === L.steps.length - 1 ? 'Finish lesson' : 'Next') + '</button>';
      else actions = '<button class="btn ghost" data-act="hint">Hint</button><button class="btn ghost" data-act="resetStep">Reset</button><button class="btn primary" data-act="nextStep" ' + (LS.stepDone ? '' : 'disabled') + '>' + (LS.i === L.steps.length - 1 ? 'Finish lesson' : 'Next') + '</button>';
      setPanel('<button class="back" data-act="goPath">← Path</button>' +
        '<div class="eyebrow">' + esc(st.name) + ' · ' + st.band + '</div>' +
        '<h1 class="h1">' + esc(L.title) + '</h1>' +
        '<p class="lede">' + esc(L.goal) + '</p>' +
        '<div class="dots" aria-label="Step ' + (LS.i + 1) + ' of ' + L.steps.length + '">' + dots + '</div>' +
        '<div class="coach-card"><div class="coach-tag">' + kind + ' · ' + (LS.i + 1) + '/' + L.steps.length + '</div><p class="coach-text">' + esc(step.text) + '</p>' +
        (step.t === 'collect' ? '<p class="collect-count" id="collect-count"></p>' : '') +
        (step.t === 'move' ? '<p class="turn-note">' + (new Game(step.fen).turn() === 'w' ? 'White' : 'Black') + ' to move</p>' : '') +
        '</div>' +
        '<div id="status" class="status"></div>' +
        '<div class="actions">' + actions + '</div>');
    },
    loadStep: function () {
      var step = LS.L.steps[LS.i];
      LS.stepDone = step.t === 'read'; LS.ply = 0; LS.hintUsed = false;
      Voice.say([LS.i > 0 && chance(0.4) ? V('lesson_next') : null, { id: 'L-' + LS.id + '-' + LS.i, text: step.text }]);
      if (step.t === 'collect') {
        Collect.start(step, function (stars, moves) {
          LS.stepDone = true; LS.stars = Math.min(LS.stars || 3, stars);
          B3.burst(step.stars[step.stars.length - 1] || 'e4'); Sound.play('good'); Voice.say([V('allstars', 'allstars')]);
          MODES.lesson.render();
          setStatus('<strong>All stars in ' + moves + ' moves.</strong> ' + (stars === 3 ? 'Perfect route!' : 'Par is ' + step.par + '. Reset to try a shorter route.'), 'good');
        });
        Collect.refresh();
        return;
      }
      var g = setupBoard(step.fen, { drop: LS.i === 0 || step.t === 'read', orient: new Game(step.fen).turn() });
      if (step.arrows) B3.arrows(step.arrows);
      if (step.marks) B3.markers('mark', step.marks);
      if (step.t === 'move') {
        IX.enabled = true;
        IX.canMove = function (c) { return c === g.turn(); };
        IX.onMove = MODES.lesson.onMove;
      }
    },
    onMove: function (mv, uci) {
      var step = LS.L.steps[LS.i], g = IX.game, fenBefore = g.fen();
      var expected = step.sol[LS.ply];
      var accepted = uci === expected || (LS.ply === 0 && step.accept && step.accept.indexOf(uci) >= 0);
      var test = new Game(fenBefore); test.move(mv);
      var mates = test.inCheckmate();
      if (step.judge === 'safe') {
        setStatus('Checking your move…');
        return Eng.call('analyzeMove', fenBefore, uci, 30, 700).then(function (a) {
          var ok = a && a.loss <= 120 && !(a.reply && a.reply.score > 90000);
          if (!ok) {
            LS.mistakes++; Sound.play('bad'); B3.flash('bad', [mv.to]); Voice.say([V('notsafe', 'notsafe')]);
            setStatus('<strong>Not safe.</strong> ' + (a && a.replySan ? 'Your opponent answers ' + esc(a.replySan) + '. ' : '') + 'Try again.', 'bad');
            IX.enabled = true; return;
          }
          return applyMove(g, mv).then(function () { MODES.lesson.stepWin(step, mv.to); });
        });
      }
      if (!accepted && !(step.anyMate && mates)) {
        LS.mistakes++; Sound.play('bad'); B3.flash('bad', [mv.to]); Voice.say([V('notquite', 'notquite')]);
        setStatus('<strong>Not quite.</strong> ' + (whyNote(fenBefore, mv) || esc(step.hint || 'Look for a stronger move.')) + ' <button class="link" data-act="whyMove">▶ Show what happens</button>', 'bad');
        WHY = { fen: fenBefore, mv: mv, me: g.turn() };
        IX.enabled = true; return;
      }
      return applyMove(g, mv).then(function () {
        if (mates || uci !== expected || LS.ply + 1 >= step.sol.length) return MODES.lesson.stepWin(step, mv.to);
        LS.ply++;
        setStatus('Good. Keep going…', 'good'); Voice.say([V('keepgoing', 'keepgoing')]);
        return B3.wait(450).then(function () { return applyMove(g, uciObj(step.sol[LS.ply])); }).then(function () {
          LS.ply++;
          if (LS.ply >= step.sol.length) return MODES.lesson.stepWin(step, step.sol[LS.ply - 1].slice(2, 4));
          IX.enabled = true;
        });
      });
    },
    stepWin: function (step, sq) {
      LS.stepDone = true; IX.enabled = false;
      B3.burst(sq); B3.markers('good', [sq]); Sound.play('good');
      var stepIdx = LS.L.steps.indexOf(step);
      Voice.say([V('correct', 'correct'), step.done ? { id: 'L-' + LS.id + '-' + stepIdx + '-d', text: step.done } : null]);
      addXP(10);
      MODES.lesson.render();
      setStatus('<strong>Correct.</strong> ' + esc(step.done || ''), 'good');
    },
    leave: function () { IX.collect = null; }
  };
  ACT.nextStep = function () {
    if (!LS) return;
    if (LS.i < LS.L.steps.length - 1) { LS.i++; LS.stepDone = LS.L.steps[LS.i].t === 'read'; MODES.lesson.render(); MODES.lesson.loadStep(); return; }
    var stars = LS.mistakes === 0 ? 3 : LS.mistakes <= 2 ? 2 : 1;
    if (LS.stars) stars = Math.min(stars, LS.stars);
    if (LS.finished) return;
    LS.finished = true;
    var prev = S.lessons[LS.id], wasLocked = { play: isLocked('play'), openings: isLocked('openings') };
    S.lessons[LS.id] = { done: true, stars: Math.max(stars, prev && prev.stars || 0) };
    today().lesson = true; today().lessons = (today().lessons || 0) + 1; addXP(50); save();
    Badges.award('first_lesson');
    var stI = stageOf(LS.id), stDone = stageComplete(stI);
    if (stDone) Badges.award('stage_' + (stI + 1));
    Sound.play('win'); B3.burst('e4'); B3.burst('d5'); confetti(); Voice.say([V('lessondone', 'lessondone'), LS.L.takeaways ? { id: 'K-' + LS.id, text: 'Key takeaways. ' + LS.L.takeaways.join(' ') } : null]);
    var nl = nextLesson();
    document.body.dataset.layout = 'browse';
    setPanel('<button class="back" data-act="goPath">← Path</button><div class="done-head"><div><div class="eyebrow">Lesson complete · +50 XP</div><h1 class="h1">' + esc(LS.L.title) + '</h1></div>' +
      '<p class="big-stars" aria-label="' + stars + ' of 3 stars">' + '★'.repeat(stars) + '<span class="dim">' + '★'.repeat(3 - stars) + '</span></p></div>' +
      '<p class="muted small">' + (LS.mistakes ? Math.ceil(LS.mistakes) + ' slip' + (LS.mistakes > 1 ? 's' : '') + ' along the way. Repeat it later to lock the pattern in.' : 'Flawless.') + '</p>' +
      whatNext(LS.id, nl, wasLocked) +
      (LS.L.takeaways ? '<div class="takeaways"><div class="eyebrow">Key takeaways</div><ul>' + LS.L.takeaways.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="actions plain"><button class="btn ghost" data-act="lesson" data-id="' + LS.id + '">Repeat lesson</button><button class="btn ghost" data-act="goPath">Back to path</button></div>');
  };

  // After a lesson: invite the player to use the idea straight away, in a different way.
  var LESSON_THEME = { 'l-traps': 'mate', 'l-smothered': 'mate', 'l-rookmate': 'endgame', 'l-qmate': 'mate', 'l-check': 'mate', 'l-values': 'hanging', 'l-principles': 'hanging', 'l-forks': 'fork', 'l-pins': 'pin', 'l-skewers': 'skewer', 'l-backrank': 'mate', 'l-discovered': 'discovered', 'l-defender': 'defender', 'l-patterns': 'mate', 'l-cct': 'all', 'l-kp': 'endgame', 'l-rook-end': 'endgame', 'l-king-pawn': 'promotion', 'l-convert': 'all', 'l-calc': 'all' };
  function whatNext(id, nl, wasLocked) {
    var L = LESSONS[id], theme = LESSON_THEME[id] || 'all';
    var st = L.steps.filter(function (s) { return s.t === 'move' && /K/.test(s.fen.split(' ')[0]) && /k/.test(s.fen.split(' ')[0]); }).pop();
    var nDone = lessonsDone(), lessonsToday = today().lessons || 0;
    var cards = [];
    var playNew = wasLocked.play && !isLocked('play'), opNew = wasLocked.openings && !isLocked('openings');
    if (!isLocked('play')) cards.push({ k: 'play', ico: 'k', t: st ? 'Play it out vs the coach' : 'Play a game vs the coach', s: st ? 'Same position, real opponent. Use what you just learned.' : 'A relaxed game at your level, with tips on every move.', act: st ? 'data-act="lessonPlay" data-fen="' + esc(st.fen) + '"' : 'data-act="wnPlay"', isNew: playNew });
    cards.push({ k: 'puzzle', ico: 'n', t: theme === 'all' ? 'Solve a few puzzles' : 'Puzzles: ' + theme, s: 'Spot the idea in real positions. Quick wins, rating points.', act: 'data-act="wnPuzzles" data-t="' + theme + '"' });
    var chal = CHALLENGES.filter(function (c) { return c.after === id && !S.challenges[c.id]; })[0];
    if (chal) cards.push({ k: 'challenge', ico: 'q', t: 'Challenge: ' + chal.title, s: chal.text.split('. ')[0].replace(/\.$/, '') + '. Play it against perfect defence.', act: 'data-act="challenge" data-id="' + chal.id + '"' });
    var stB = bossFor(stageOf(id));
    if (stB && stageComplete(stageOf(id)) && !S.bosses[stB.id]) cards.push({ k: 'boss', ico: stB.icon, t: 'Boss battle: ' + stB.name, s: 'Stage done. Now beat its boss in a real game.', act: 'data-act="boss" data-id="' + stB.id + '"' });
    var ns = nextStop();
    if (ns && (nDone >= 2 || !isLocked('openings'))) cards.push({ k: 'opening', ico: 'b', t: ns.def ? 'Defend against the ' + ns.base.name : 'Learn the ' + ns.name, s: ns.def ? ns.idea.split('. ')[0].replace(/\.$/, '') + '.' : 'Every move explained, then drill it from memory.', act: 'data-act="openOp" data-id="' + ns.id + '"', isNew: opNew });
    else if (!isLocked('openings') && nDone >= 3) cards.push({ k: 'opening', ico: 'b', t: 'Learn an opening', s: 'Your first moves, with the reason behind each one.', act: 'data-act="wnOpening"', isNew: opNew });
    if (nl && nl !== id) cards.push({ k: 'lesson', ico: 'r', t: 'Next lesson', s: LESSONS[nl].title, act: 'data-act="lesson" data-id="' + nl + '"' });
    // Variety: after two lessons in a row, nudge toward doing instead of reading
    var pref = lessonsToday >= 2 || nDone % 2 === 1 ? (cards[0].k === 'play' ? 'play' : 'puzzle') : 'lesson';
    if (playNew) pref = 'play'; else if (opNew) pref = 'opening';
    if (cards.some(function (c) { return c.k === 'boss'; })) pref = 'boss'; else if (cards.some(function (c) { return c.k === 'challenge'; }) && lessonsToday >= 1) pref = 'challenge';
    if (!cards.some(function (c) { return c.k === pref; })) pref = cards[0].k;
    cards.sort(function (a, b) { return (b.k === pref) - (a.k === pref); });
    return '<div class="sect-head"><h2>What next?</h2><span class="muted small">pick any, switch anytime</span></div><div class="wn-grid">' + cards.map(function (c) {
      return '<button class="wn-card' + (c.k === pref ? ' pref' : '') + '" ' + c.act + '><span class="wn-ico">' + pieceSVG(c.ico, 'w', 26) + '</span><span class="wn-txt"><b>' + esc(c.t) + (c.isNew ? ' <em class="new-tag">New</em>' : '') + (c.k === pref ? ' <em class="rec-tag">Suggested</em>' : '') + '</b><span>' + esc(c.s) + '</span></span></button>';
    }).join('') + '</div>';
  }
  ACT.wnPlay = function () { go('play'); };
  ACT.wnPuzzles = function (d) { go('puzzles', { theme: d.t || 'all' }); };
  ACT.wnOpening = function () { go('openings'); };
  ACT.lessonPlay = function (d) { var fen = d.fen; go('play', { fen: fen, color: new Game(fen).turn(), from: 'lesson position' }); };
  ACT.resetStep = function () { if (LS) { LS.stepDone = LS.L.steps[LS.i].t === 'read'; MODES.lesson.render(); MODES.lesson.loadStep(); } };
  function lessonMins(L) { return Math.max(2, Math.round(L.steps.length * 1.2)); }
  ACT.hint = function () {
    var step = LS.L.steps[LS.i];
    if (step.t === 'collect') { setStatus('Click the piece to see where it can go. Plan so each move lands on a star or sets up the next one.'); return; }
    var u = step.sol[LS.ply];
    if (LS.hintUsed) { B3.arrows([[u.slice(0, 2), u.slice(2, 4), 'g']]); setStatus('The arrow shows the move.'); }
    else { B3.markers('hint', [u.slice(0, 2)]); setStatus(esc(step.hint || 'Look at the highlighted piece.')); LS.hintUsed = true; }
    LS.mistakes += 0.5;
  };
  ACT.playLine = function () {
    var step = LS.L.steps[LS.i];
    var g = setupBoard(step.fen, {});
    var i = 0;
    setStatus('Watch the plan unfold…');
    (function nextMove() {
      if (i >= step.line.length || current !== MODES.lesson) return;
      var san = step.line[i];
      applyMove(g, san).then(function (r) {
        if (!r) return;
        var hist = g.history();
        setStatus('<span class="mono">' + esc(hist.join('  ')) + '</span>');
        i++; setTimeout(nextMove, 850);
      });
    })();
  };

  // ================= Openings =================
  var OP = { filter: 'all' };
  function mastery(id) { var r = S.openings[id] || {}; return Math.min(3, r.perfect || 0); }
  // An opening by id, or its defence line by 'def-<id>' (same shape, plus base/def/vp)
  function lineById(id) {
    if (/^def-/.test(id)) {
      var base = lineById(id.slice(4)), d = base && DEFENCES[base.id];
      if (!d) return null;
      return d._o || (d._o = { id: id, base: base, def: true, name: d.name, eco: base.eco, side: d.side, family: base.family, level: base.level, gambit: false, idea: d.idea, moves: d.moves, notes: d.notes, vp: 'D-' + base.id });
    }
    return OPENINGS.filter(function (o) { return o.id === id; })[0] || null;
  }
  function allLines() { return OPENINGS.concat(OPENINGS.filter(function (o) { return DEFENCES[o.id]; }).map(function (o) { return lineById('def-' + o.id); })); }
  function drilled(id) { var r = S.openings[id]; return !!(r && r.drills); }
  // The "Play it / Defend against it" switch on every opening that has a defence line
  function sideSwitch(o) {
    var base = o.base || o, d = DEFENCES[base.id]; if (!d) return '';
    var side = function (c) { return c === 'w' ? 'White' : 'Black'; }, trap = base.family === 'Traps' || base.gambit;
    return '<div class="side-switch" role="group" aria-label="Which side to learn">' +
      '<button class="' + (o.def ? '' : 'on') + '" data-act="openOp" data-id="' + base.id + '"><b>' + (d.tabs ? d.tabs[0] : 'Play it') + '</b><span>as ' + side(base.side) + (mastery(base.id) ? ' · ' + mastery(base.id) + '/3' : '') + '</span></button>' +
      '<button class="' + (o.def ? 'on' : '') + '" data-act="openOp" data-id="def-' + base.id + '"><b>' + (d.tabs ? d.tabs[1] : trap ? 'Defend against it' : 'Face it') + '</b><span>as ' + side(d.side) + (mastery('def-' + base.id) ? ' · ' + mastery('def-' + base.id) + '/3' : '') + '</span></button></div>';
  }
  // Opening stops woven into the training path (STAGE_OPENINGS in defences.js)
  function stageStops(i) { return (STAGE_OPENINGS[STAGES[i].id] || []).map(function (e) { return e[1] ? 'def-' + e[0] : e[0]; }).filter(lineById); }
  function nextStop() {
    var nl = nextLesson(), cur = nl ? stageOf(nl) : STAGES.length - 1, order = [cur];
    for (var i = cur - 1; i >= 0; i--) order.push(i);
    for (var j = cur + 1; j < STAGES.length; j++) if (stageUnlocked(j)) order.push(j);
    for (var k = 0; k < order.length; k++) { var ids = stageStops(order[k]).filter(function (id) { return !drilled(id); }); if (ids.length) return lineById(ids[0]); }
    return null;
  }
  function stopHtml(id) {
    var o = lineById(id), done = drilled(id), m = mastery(id);
    return '<button class="jlesson jop' + (done ? ' done' : '') + '" data-act="openOp" data-id="' + id + '">' +
      '<span class="jl-num op" aria-hidden="true">' + (done ? '✓' : pieceSVG('b', 'w', 16)) + '</span>' +
      '<span class="jl-title"><em class="op-kind' + (o.def ? ' def' : '') + '">' + (o.def ? 'Defence' : 'Opening') + '</em> ' + esc(o.def ? o.name : o.name) + '</span>' +
      '<span class="jl-meta">' + (done ? 'Mastery ' + m + '/3' : o.moves.length + ' moves') + '</span></button>';
  }
  function bossNode(i) {
    var b = bossFor(i); if (!b) return '';
    var beat = S.bosses[b.id], open = bossOpen(i), need = bossNeed(i);
    return '<button class="jlesson jboss' + (beat ? ' done' : '') + (open ? '' : ' locked') + '" data-act="boss" data-id="' + b.id + '" ' + (open || beat ? '' : 'disabled') + '>' + bossAvatar(b, 30) + '<span class="jl-title"><em class="op-kind boss">Boss</em> ' + esc(b.name) + '</span><span class="jl-meta">' + (beat ? '✓ Beaten' : open ? 'Beat to clear' : '🔒 after ' + need + ' more') + '</span></button>';
  }
  ACT.nextOpening = function () { var o = nextStop(); if (o) go('opening', { id: o.id, mode: 'learn' }); else go('openings'); };
  MODES.openings = {
    label: 'Opening explorer',
    enter: function () {
      setupBoard(Game.START, { drop: true, orient: 'w' });
      MODES.openings.render();
    },
    render: function () {
      var F = [['all', 'All'], ['w', 'As White'], ['b', 'As Black'], ['gambit', 'Gambits'], ['trap', 'Traps']];
      var q = (OP.q || '').toLowerCase().trim();
      var list = OPENINGS.filter(function (o) {
        if (q && (o.name + ' ' + o.eco + ' ' + o.family).toLowerCase().indexOf(q) < 0) return false;
        if (OP.filter === 'all') return true;
        if (OP.filter === 'gambit') return o.gambit;
        if (OP.filter === 'trap') return o.family === 'Traps';
        return o.side === OP.filter;
      });
      // Lines at the player's level first, then harder ones, then the basics
      var tier = openingTier(S.puzzle.rating), rank = function (o) { var t = TIER[o.level]; return t === tier ? 0 : t > tier ? 1 : 2; };
      list = list.slice().sort(function (a, b) { return rank(a) - rank(b); });
      setPanel('<div class="eyebrow">' + OPENINGS.length + ' lines · sorted for ~' + Math.round(S.puzzle.rating) + '</div><h1 class="h1">Openings and gambits</h1>' +
        '<p class="lede">Learn the idea behind every move, then drill it until you can play it from memory. Three perfect drills masters a line.</p>' +
        (q ? '' : '<div class="sect-head"><h2>Recommended for you</h2><span class="muted small">for ~' + Math.round(S.puzzle.rating) + '</span></div><div class="recs">' + recommendedOpenings().map(function (o) {
          return '<button class="rec-card" data-act="openOp" data-id="' + o.id + '"><span class="side ' + o.side + '">' + (o.side === 'w' ? 'White' : 'Black') + '</span><b>' + esc(o.name) + '</b><span class="muted small">' + esc(o.idea.split('. ')[0].replace(/\.$/, '')) + '.</span></button>';
        }).join('') + '</div>') +
        '<div class="search"><input id="op-search" type="search" placeholder="Search openings, e.g. Sicilian" value="' + esc(OP.q || '') + '" aria-label="Search openings"></div>' +
        '<div class="chips">' + F.map(function (f) { return '<button class="chip ' + (OP.filter === f[0] ? 'on' : '') + '" data-act="opFilter" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
        (list.length ? '' : '<p class="muted">No openings match that search.</p>') +
        '<div class="op-list">' + list.map(function (o) {
          var m = mastery(o.id);
          return '<button class="op-card' + (rank(o) === 2 ? ' basic' : '') + '" data-act="openOp" data-id="' + o.id + '">' +
            '<span class="op-top"><span class="eco">' + o.eco + '</span><span class="side ' + o.side + '">' + (o.side === 'w' ? 'White' : 'Black') + '</span>' + (o.gambit ? '<span class="pill">Gambit</span>' : '') + (rank(o) === 0 ? '<span class="fit">Your level</span>' : rank(o) === 2 ? '<span class="fit basic">Basics</span>' : '') + '<span class="lvl">' + o.level + '</span></span>' +
            '<span class="op-name">' + esc(o.name) + '</span>' +
            '<span class="op-moves mono">' + esc(o.moves.slice(0, 6).map(function (s, i) { return (i % 2 === 0 ? (i / 2 + 1) + '.' : '') + s; }).join(' ')) + '…</span>' +
            (DEFENCES[o.id] ? '<span class="op-def">+ ' + (o.family === 'Traps' || o.gambit ? 'how to defend against it' : 'how to face it as ' + (DEFENCES[o.id].side === 'w' ? 'White' : 'Black')) + (mastery('def-' + o.id) ? ' · ' + mastery('def-' + o.id) + '/3' : '') + '</span>' : '') +
            '<span class="meter" aria-label="Mastery ' + m + ' of 3"><i style="width:' + (m / 3 * 100) + '%"></i></span></button>';
        }).join('') + '</div>');
      var inp = $('#op-search');
      if (inp) {
        inp.oninput = function () { OP.q = inp.value; var pos = inp.selectionStart; MODES.openings.render(); var n = $('#op-search'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } };
      }
    }
  };
  function recommendedOpenings() {
    var R = S.puzzle.rating;
    var ids = R < 800 ? ['anti-scholar', 'italian', 'london', 'caro', 'scandi', 'qga'] : R < 1400 ? ['ruy', 'qgd', 'french', 'sicilian-dragon', 'scotch', 'evans'] : ['sicilian-najdorf', 'kid', 'nimzo', 'english', 'slav', 'kings-gambit'];
    var list = ids.map(function (id) { return OPENINGS.filter(function (o) { return o.id === id; })[0]; }).filter(function (o) { return o && mastery(o.id) < 3; });
    return list.slice(0, 3);
  }
  ACT.opFilter = function (d) { OP.filter = d.f; MODES.openings.render(); };
  ACT.openOp = function (d) { go('opening', { id: d.id, mode: 'learn' }); };

  var OD = null;
  function moveListHtml(moves, upto, clickAct, hideFuture) {
    var out = '';
    for (var i = 0; i < moves.length; i++) {
      if (i % 2 === 0) out += '<span class="mn">' + (i / 2 + 1) + '.</span>';
      out += '<button class="mv ' + (i === upto - 1 ? 'cur' : '') + (i >= upto ? ' future' : '') + '" ' + (clickAct ? 'data-act="' + clickAct + '" data-i="' + (i + 1) + '"' : 'disabled') + '>' + (hideFuture && i >= upto ? '?' : esc(moves[i])) + '</button>';
    }
    return '<div class="movelist mono">' + out + '</div>';
  }
  MODES.opening = {
    label: 'Opening trainer',
    enter: function (arg) {
      var o = lineById(arg.id);
      OD = { o: o, mode: arg.mode, ply: 0, errors: 0, misses: {} };
      var g = setupBoard(Game.START, { drop: true, orient: o.side });
      OD.g = g;
      if (arg.mode === 'drill') MODES.opening.startDrill();
      else MODES.opening.renderLearn();
    },
    renderLearn: function () {
      var o = OD.o, i = OD.ply;
      var nextNote = i < o.moves.length ? o.notes[i] : 'End of the main line. Now drill it from memory.';
      var lastNote = i > 0 ? o.notes[i - 1] : o.idea;
      var vp = o.vp || 'O-' + o.id;
      Voice.say([i > 0 ? { id: vp + '-' + (i - 1), text: o.notes[i - 1] } : { id: vp + '-idea', text: o.name + '. ' + o.idea }]);
      setPanel('<button class="back" data-act="goOpenings">← Openings</button>' +
        '<div class="eyebrow">' + o.eco + ' · ' + o.family + ' · You play ' + (o.side === 'w' ? 'White' : 'Black') + '</div>' +
        '<h1 class="h1">' + esc(o.name) + '</h1><p class="lede">' + esc(o.idea) + '</p>' +
        sideSwitch(o) + '<div class="seg"><button class="on">Learn</button><button data-act="drillOp">Drill</button></div>' +
        '<div class="coach-card"><div class="coach-tag">' + (i === 0 ? 'The idea' : 'Move ' + Math.ceil(i / 2) + (i % 2 ? '' : '…') + ' ' + esc(o.moves[i - 1])) + '</div><p class="coach-text">' + esc(lastNote) + '</p>' +
        (i < o.moves.length ? '<p class="next-note"><span class="muted">Next:</span> <span class="mono">' + esc(o.moves[i]) + '</span> · ' + esc(nextNote) + '</p>' : '<p class="next-note">' + esc(nextNote) + '</p>') + '</div>' +
        moveListHtml(o.moves, i, 'opJump') + '<p class="kbd-hint"><kbd>←</kbd> <kbd>→</kbd> step through the moves</p>' +
        '<div class="actions"><button class="btn ghost" data-act="opPrev" ' + (i === 0 ? 'disabled' : '') + '>← Back</button><button class="btn" data-act="opAuto">Autoplay</button>' +
        (i < o.moves.length ? '<button class="btn primary" data-act="opNext">Next move →</button>' : '<button class="btn primary" data-act="drillOp">Drill it</button>') + '</div>');
      // arrow for upcoming move
      if (i < o.moves.length) {
        var t = new Game(OD.g.fen()); var mv = t.move(o.moves[i]);
        if (mv) B3.arrows([[mv.from, mv.to, OD.g.turn() === o.side ? 'g' : 'b']]);
      } else B3.arrows([]);
    },
    gotoPly: function (n) {
      var g = OD.g, o = OD.o;
      if (OD.busy) return;
      if (n === OD.ply + 1) {
        OD.busy = true;
        applyMove(g, o.moves[OD.ply]).then(function () { OD.busy = false; OD.ply++; MODES.opening.renderLearn(); });
        return;
      }
      var t = new Game();
      for (var i = 0; i < n; i++) t.move(o.moves[i]);
      OD.g = t; IX.game = t; OD.ply = n;
      B3.sync(t.fen()); B3.markers('last', []); showCheck(t);
      MODES.opening.renderLearn();
    },
    startDrill: function () {
      var o = OD.o, g = setupBoard(Game.START, { orient: o.side });
      OD.g = g; OD.mode = 'drill'; OD.ply = 0; OD.errors = 0; OD.misses = {};
      MODES.opening.renderDrill('Play the ' + (o.side === 'w' ? 'White' : 'Black') + ' moves of the ' + o.name + ' from memory.');
      MODES.opening.drillContinue();
    },
    renderDrill: function (msg, kind) {
      var o = OD.o;
      setPanel('<button class="back" data-act="goOpenings">← Openings</button>' +
        '<div class="eyebrow">' + o.eco + ' · Drill</div><h1 class="h1">' + esc(o.name) + '</h1>' +
        sideSwitch(o) + '<div class="seg"><button data-act="learnOp">Learn</button><button class="on">Drill</button></div>' +
        '<div class="drill-stats"><span><b>' + Math.floor(OD.ply / 2) + '</b> / ' + Math.ceil(o.moves.length / 2) + ' moves</span><span><b>' + OD.errors + '</b> mistakes</span><span>Mastery <b>' + mastery(o.id) + '</b>/3</span></div>' +
        '<div id="status" class="status ' + (kind || '') + '">' + msg + '</div>' +
        moveListHtml(o.moves, OD.ply, null, true) +
        '<div class="actions"><button class="btn ghost" data-act="drillHint">Show me</button><button class="btn" data-act="drillOp">Restart</button></div>');
    },
    drillContinue: function () {
      var o = OD.o, g = OD.g;
      if (OD.ply >= o.moves.length) return MODES.opening.drillDone();
      var myTurn = g.turn() === o.side;
      if (!myTurn) {
        IX.enabled = false;
        B3.wait(420).then(function () {
          if (current !== MODES.opening || OD.mode !== 'drill') return;
          applyMove(g, o.moves[OD.ply]).then(function () { OD.ply++; MODES.opening.renderDrill('Opponent played <span class="mono">' + esc(o.moves[OD.ply - 1]) + '</span>. Your move.'); MODES.opening.drillContinue(); });
        });
        return;
      }
      IX.enabled = true; IX.canMove = function (c) { return c === o.side; };
      IX.onMove = function (mv) {
        var t = new Game(g.fen()), exp = t.move(o.moves[OD.ply]);
        if (exp && exp.from === mv.from && exp.to === mv.to) {
          return applyMove(g, mv).then(function () {
            OD.ply++;
            MODES.opening.renderDrill('<strong>' + esc(exp.san) + '</strong> ' + esc(o.notes[OD.ply - 1]), 'good');
            if (OD.ply < o.moves.length - 1 && chance(0.35)) Voice.say([V('drillright')], true);
            MODES.opening.drillContinue();
          });
        }
        OD.errors++; OD.misses[OD.ply] = (OD.misses[OD.ply] || 0) + 1; Voice.say([V('drillwrong', 'drillwrong')]);
        var trap = whyNote(g.fen(), mv); WHY = { fen: g.fen(), mv: mv, me: o.side };
        Sound.play('bad'); B3.flash('bad', [mv.to]);
        if (OD.misses[OD.ply] >= 2) B3.arrows([[exp.from, exp.to, 'g']]);
        MODES.opening.renderDrill('<strong>Not this line.</strong> ' + (trap ? trap + ' ' : '') + '<button class="link" data-act="whyMove">▶ Show what happens</button> ' + (OD.misses[OD.ply] >= 2 ? 'The book move is <span class="mono">' + esc(exp.san) + '</span>: ' + esc(o.notes[OD.ply]) : 'Think about the idea: ' + esc(o.idea)), 'bad');
        IX.enabled = true;
      };
    },
    drillDone: function () {
      var o = OD.o, rec = S.openings[o.id] || { drills: 0, perfect: 0 };
      rec.drills++; if (!OD.errors) rec.perfect = (rec.perfect || 0) + 1;
      if (!OD.errors) Badges.award('perfect_drill');
      if (rec.perfect >= 3) Badges.award('opening_master');
      S.openings[o.id] = rec; today().opening = true; addXP(OD.errors ? 15 : 30); save();
      Sound.play(OD.errors ? 'good' : 'win'); B3.burst('e4'); Voice.say([OD.errors ? V('drilldone', 'drilldone') : V('drillperfect', 'drillperfect')]);
      setPanel('<button class="back" data-act="goOpenings">← Openings</button><div class="eyebrow">Drill complete</div><h1 class="h1">' + esc(o.name) + '</h1>' +
        '<p class="lede">' + (OD.errors ? OD.errors + ' mistake' + (OD.errors > 1 ? 's' : '') + '. Drill again for a perfect run.' : 'Perfect run! Mastery ' + mastery(o.id) + '/3.') + '</p>' +
        '<div class="actions"><button class="btn" data-act="drillOp">Drill again</button><button class="btn primary" data-act="playFromHere">Play on vs coach</button></div>' +
        '<div class="card tip">Playing on from the final position teaches you the middlegame plans that follow this opening.</div>');
    },
    leave: function () { }
  };
  ACT.goOpenings = function () { go('openings'); };
  ACT.opNext = function () { MODES.opening.gotoPly(OD.ply + 1); };
  ACT.opPrev = function () { MODES.opening.gotoPly(OD.ply - 1); };
  ACT.opJump = function (d) { MODES.opening.gotoPly(+d.i); };
  ACT.opAuto = function () {
    (function step() {
      if (current !== MODES.opening || OD.mode !== 'learn' || OD.ply >= OD.o.moves.length) return;
      MODES.opening.gotoPly(OD.ply + 1); setTimeout(step, 1300);
    })();
  };
  ACT.drillOp = function () { OD.mode = 'drill'; MODES.opening.startDrill(); };
  ACT.learnOp = function () { go('opening', { id: OD.o.id, mode: 'learn' }); };
  ACT.drillHint = function () {
    var t = new Game(OD.g.fen()), exp = t.move(OD.o.moves[OD.ply]);
    if (exp && OD.g.turn() === OD.o.side) { B3.arrows([[exp.from, exp.to, 'g']]); OD.errors++; setStatus('The book move: <span class="mono">' + esc(exp.san) + '</span>. ' + esc(OD.o.notes[OD.ply])); }
  };
  ACT.playFromHere = function () { go('play', { fen: OD.g.fen(), color: OD.o.side, from: OD.o.name }); };

  // ================= Puzzles =================
  var PZ = { theme: 'all', cur: null, sessionStreak: 0 };
  function puzzleFen(p) { if (p.fen) return p.fen; var g = new Game(); p.pre.forEach(function (s) { g.move(s); }); return g.fen(); }
  function pickPuzzle() {
    var pool = PUZZLES.filter(function (p) { return PZ.theme === 'all' || p.theme === PZ.theme; });
    if (beginnerMode()) { // only ideas already taught: free pieces first, mates after the checkmate lesson
      var easy = pool.filter(function (p) { return p.r <= 500 && (p.theme !== 'mate' || lessonDone('l-check')) && p.theme !== 'endgame'; });
      if (easy.length) pool = easy;
    }
    var unsolved = pool.filter(function (p) { return !S.puzzle.solved[p.id]; });
    var src = unsolved.length ? unsolved : pool.slice().sort(function (a, b) { return (S.puzzle.solved[a.id] || 0) - (S.puzzle.solved[b.id] || 0); }).slice(0, 6);
    var R = S.puzzle.rating;
    src = src.slice().sort(function (a, b) { return Math.abs(a.r - R) - Math.abs(b.r - R); });
    var top = src.slice(0, Math.min(3, src.length));
    var choice = top[Math.floor(Math.random() * top.length)];
    if (PZ.cur && choice && choice.id === PZ.cur.p.id && src.length > 1) choice = src[1];
    return choice;
  }
  function ratingBand(r) { return r < 400 ? 'Beginner' : r < 800 ? 'Novice' : r < 1200 ? 'Club player' : r < 1600 ? 'Strong club' : r < 2000 ? 'Advanced' : 'Expert'; }
  MODES.puzzles = {
    label: 'Puzzle trainer',
    enter: function (arg) { if (arg && arg.theme) PZ.theme = arg.theme; MODES.puzzles.next(); },
    next: function () {
      var p = pickPuzzle();
      if (!p) { setPanel('<h1 class="h1">No puzzles</h1>'); return; }
      var fen = puzzleFen(p);
      PZ.cur = { p: p, fen: fen, ply: 0, failed: false, done: false, hinted: 0 };
      var g = setupBoard(fen, { drop: true, orient: new Game(fen).turn() });
      if (p.pre) { var t = new Game(); p.pre.forEach(function (s) { var m = t.move(s); if (m) B3.markers('last', [m.from, m.to]); }); }
      IX.enabled = true; IX.canMove = function (c) { return c === g.turn() && !PZ.cur.done; }; IX.onMove = MODES.puzzles.onMove;
      Voice.say([V(p.mate === 1 ? 'puzzle_mate1' : p.mate === 2 ? 'puzzle_mate2' : 'puzzle_start')], true);
      MODES.puzzles.render();
    },
    render: function (msg, kind) {
      var c = PZ.cur, p = c.p, turn = new Game(c.fen).turn();
      var themes = ['all'].concat(['mate', 'fork', 'hanging', 'combo', 'pin', 'skewer', 'discovered', 'defender', 'promotion', 'endgame'].filter(function (t) { return PUZZLES.some(function (q) { return q.theme === t; }); }));
      var hist = S.puzzle.hist.slice(-1)[0];
      setPanel('<div class="rating-row"><div><div class="eyebrow">Puzzle rating</div><div class="rating">' + Math.round(S.puzzle.rating) + '</div><div class="muted small">' + ratingBand(S.puzzle.rating) + (PZ.sessionStreak > 1 ? ' · ' + PZ.sessionStreak + ' in a row' : '') + '</div></div>' +
        '<canvas id="spark" width="220" height="64" aria-label="Rating history"></canvas></div>' +
        '<div class="pz-bar"><span class="streak-pill ' + (PZ.sessionStreak >= 3 ? 'hot' : '') + '"><b>' + PZ.sessionStreak + '</b> in a row</span><span class="pz-btns"><button class="btn" data-act="arena">🎯 Arena</button><button class="btn rush-btn" data-act="rushStart">⚡ Puzzle Rush' + (S.rushBest ? ' · best ' + S.rushBest : '') + '</button></span></div>' +
        '<div class="chips">' + themes.map(function (t) { return '<button class="chip ' + (PZ.theme === t ? 'on' : '') + '" data-act="pzTheme" data-t="' + t + '">' + (t === 'all' ? 'All themes' : t === 'combo' ? 'combination' : t) + '</button>'; }).join('') + '</div>' +
        '<div class="coach-card"><div class="coach-tag">Puzzle · ' + p.r + '</div>' +
        '<p class="coach-text"><strong>' + (turn === 'w' ? 'White' : 'Black') + ' to move.</strong> ' + (p.mate ? 'Find mate in ' + p.mate + '.' : 'Find the best move.') + '</p>' +
        (c.done ? '<p class="next-note"><strong>' + esc(p.title) + '</strong> · ' + esc(p.theme) + ' · ' + esc(p.explain) + '</p>' : '') + '</div>' +
        '<div id="status" class="status ' + (kind || '') + '">' + (msg || '') + '</div>' +
        '<div class="actions">' + (c.done ? '<button class="btn primary" data-act="pzNext">Next puzzle</button>' : '<button class="btn ghost" data-act="pzHint">Hint</button><button class="btn ghost" data-act="pzShow">Solution</button><button class="btn" data-act="pzNext">Skip</button>') + '</div>');
      drawSpark($('#spark'), S.puzzle.hist.map(function (h) { return h[1]; }));
    },
    grade: function (win) {
      var c = PZ.cur; if (c.graded) return; c.graded = true;
      var R = S.puzzle.rating, P = c.p.r, E = 1 / (1 + Math.pow(10, (P - R) / 400)), K = S.puzzle.hist.length < 20 ? 40 : 24;
      var delta = Math.round(K * ((win ? 1 : 0) - E));
      if (!win && beginnerMode()) delta = 0; // while learning the basics, a miss never costs rating
      S.puzzle.rating = Math.max(100, R + delta);
      S.puzzle.hist.push([dayKey(), S.puzzle.rating]);
      if (S.puzzle.hist.length > 300) S.puzzle.hist.shift();
      if (win) {
        S.puzzle.solved[c.p.id] = Date.now(); today().puzzles++; PZ.sessionStreak++; addXP(12);
        var nSolved = Object.keys(S.puzzle.solved).filter(function (k) { return S.puzzle.solved[k] > 1; }).length;
        if (nSolved >= 10) Badges.award('puzzles_10'); if (nSolved >= 25) Badges.award('puzzles_25');
      }
      else { PZ.sessionStreak = 0; S.puzzle.solved[c.p.id] = S.puzzle.solved[c.p.id] || 1; }
      save(); floatDelta(delta);
      return delta;
    },
    onMove: function (mv, uci) {
      var c = PZ.cur, g = IX.game, p = c.p;
      var expected = p.sol[c.ply];
      var t = new Game(g.fen()); t.move(mv);
      var ok = uci === expected || (c.ply === 0 && p.accept && p.accept.indexOf(uci) >= 0) || t.inCheckmate();
      if (!ok) {
        Sound.play('bad'); B3.flash('bad', [mv.to]);
        var d = !c.failed ? MODES.puzzles.grade(false) : 0; Voice.say([V('puzzlemiss', 'puzzlemiss')]);
        c.failed = true; c.lastWrong = { fen: g.fen(), uci: uci, san: (new Game(g.fen()).move(mv) || {}).san || uci };
        MODES.puzzles.render('<strong>Not the move.</strong> ' + (d ? 'Rating ' + d + '. ' : '') + 'Try again, or ask for a hint. <button class="link" data-act="pzWhy">▶ Show why it fails</button>', 'bad');
        IX.enabled = true; return;
      }
      return applyMove(g, mv).then(function () {
        c.ply++;
        if (t.inCheckmate() || c.ply >= p.sol.length || uci !== expected) return MODES.puzzles.win(mv.to);
        MODES.puzzles.render('Correct, keep going.', 'good'); Voice.say([V('keepgoing', 'keepgoing')]);
        return B3.wait(450).then(function () { return applyMove(g, uciObj(p.sol[c.ply])); }).then(function () {
          c.ply++;
          if (c.ply >= p.sol.length) return MODES.puzzles.win(p.sol[c.ply - 1].slice(2, 4));
          IX.enabled = true;
        });
      });
    },
    win: function (sq) {
      var c = PZ.cur; c.done = true; IX.enabled = false;
      var d = c.failed || c.hinted ? 0 : MODES.puzzles.grade(true);
      if (c.failed || c.hinted) { today().puzzles++; save(); }
      Voice.say([V('solved', 'solved'), { id: 'P-' + c.p.id, text: c.p.explain }]);
      B3.burst(sq); B3.markers('good', [sq]); Sound.play('good');
      MODES.puzzles.render('<strong>Solved!</strong> ' + (d ? 'Rating +' + d + '.' : c.hinted ? 'Solved with a hint, so no rating points this time.' : c.failed ? 'Solved after a miss, so no rating points this time.' : ''), 'good');
      renderTop();
    }
  };
  var RU = null;
  MODES.rush = {
    label: 'Puzzle Rush',
    enter: function () {
      var pool = PUZZLES.slice().sort(function (a, b) { return a.r - b.r + (Math.random() - 0.5) * 300; });
      RU = { pool: pool, i: -1, score: 0, lives: 3, end: Date.now() + 180000, over: false };
      clearInterval(MODES.rush.timer);
      MODES.rush.timer = setInterval(function () { if (current !== MODES.rush || !RU || RU.over) return; var el = $('#rush-time'); if (el) el.textContent = MODES.rush.left(); if (Date.now() >= RU.end) MODES.rush.finish(); }, 250);
      Voice.say([V('rush_start')]);
      MODES.rush.next();
    },
    left: function () { var s = Math.max(0, Math.ceil((RU.end - Date.now()) / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
    next: function () {
      if (RU.over) return;
      RU.i = (RU.i + 1) % RU.pool.length;
      var p = RU.pool[RU.i], fen = puzzleFen(p), g = setupBoard(fen, { orient: new Game(fen).turn() });
      RU.cur = { p: p, ply: 0 };
      IX.enabled = true; IX.canMove = function (c) { return c === g.turn(); }; IX.onMove = MODES.rush.onMove;
      MODES.rush.render();
    },
    render: function (msg, kind) {
      var p = RU.cur.p, turn = new Game(puzzleFen(p)).turn();
      setPanel('<button class="back" data-act="goPuzzles">← Puzzles</button><div class="rush-head"><div><div class="eyebrow">Puzzle Rush</div><div class="rating">' + RU.score + '</div></div><div class="rush-meta"><span class="rush-time mono" id="rush-time">' + MODES.rush.left() + '</span><span class="lives" aria-label="' + RU.lives + ' lives left">' + [0, 1, 2].map(function (k) { return '<i class="' + (k < RU.lives ? 'on' : '') + '"></i>'; }).join('') + '</span></div></div>' +
        '<div class="coach-card"><p class="coach-text"><strong>' + (turn === 'w' ? 'White' : 'Black') + ' to move.</strong> ' + (p.mate ? 'Mate in ' + p.mate + '.' : 'Best move?') + '</p></div>' +
        '<div id="status" class="status ' + (kind || '') + '">' + (msg || 'Solve as many as you can in 3 minutes. Three misses and you are out.') + '</div>');
    },
    onMove: function (mv, uci) {
      var c = RU.cur, p = c.p, g = IX.game;
      var t = new Game(g.fen()); t.move(mv);
      var ok = uci === p.sol[c.ply] || (c.ply === 0 && p.accept && p.accept.indexOf(uci) >= 0) || t.inCheckmate();
      if (!ok) {
        RU.lives--; Sound.play('bad'); B3.flash('bad', [mv.to]);
        if (RU.lives <= 0) return MODES.rush.finish();
        MODES.rush.render('Missed that one. Next!', 'bad');
        return B3.wait(500).then(MODES.rush.next);
      }
      return applyMove(g, mv).then(function () {
        c.ply++;
        if (t.inCheckmate() || c.ply >= p.sol.length || uci !== p.sol[c.ply - 1]) { RU.score++; Sound.play('good'); B3.burst(mv.to); if (RU.score >= 10) Badges.award('rush_10'); return B3.wait(350).then(MODES.rush.next); }
        return B3.wait(250).then(function () { return applyMove(g, uciObj(p.sol[c.ply])); }).then(function () {
          c.ply++;
          if (c.ply >= p.sol.length) { RU.score++; Sound.play('good'); return B3.wait(300).then(MODES.rush.next); }
          IX.enabled = true;
        });
      });
    },
    finish: function () {
      if (RU.over) return; RU.over = true; IX.enabled = false; clearInterval(MODES.rush.timer);
      var best = Math.max(S.rushBest || 0, RU.score), isBest = RU.score > (S.rushBest || 0) && RU.score > 0;
      S.rushBest = best; addXP(RU.score * 5); save();
      Voice.say([V('rush_end')]);
      setPanel('<button class="back" data-act="goPuzzles">← Puzzles</button><div class="eyebrow">Puzzle Rush</div><h1 class="h1">' + (isBest ? 'New best!' : 'Time!') + '</h1>' +
        '<div class="rush-final"><div class="rating">' + RU.score + '</div><span class="muted">puzzles solved · best ' + best + '</span></div>' +
        '<div class="actions"><button class="btn primary big" data-act="rushStart">Play again</button></div>');
      if (isBest) { B3.burst('e4'); confetti(); }
    },
    leave: function () { clearInterval(MODES.rush.timer); if (RU) RU.over = true; }
  };
  ACT.rushStart = function () { go('rush'); };
  ACT.pzTheme = function (d) { PZ.theme = d.t; MODES.puzzles.next(); };
  ACT.pzNext = function () { MODES.puzzles.next(); };
  ACT.pzHint = function () {
    var c = PZ.cur; if (c.done) return;
    var u = c.p.sol[c.ply];
    if (!c.hinted) { MODES.puzzles.grade(false); c.failed = true; }
    c.hinted++;
    Voice.say([V('hint')]);
    if (c.hinted === 1) { B3.markers('hint', [u.slice(0, 2)]); setStatus('Move the highlighted piece. A hint means no rating points for this puzzle.'); }
    else { B3.arrows([[u.slice(0, 2), u.slice(2, 4), 'g']]); setStatus('Play the arrow.'); }
  };
  ACT.pzShow = function () {
    var c = PZ.cur; if (c.done) return;
    if (!c.failed) { MODES.puzzles.grade(false); c.failed = true; }
    IX.enabled = false;
    var g = IX.game;
    Voice.say([pickPool('solution_intro')]);
    setTimeout(function step() {
      if (c.ply >= c.p.sol.length) { c.done = true; MODES.puzzles.render('Here is the solution. ' + esc(c.p.explain)); Voice.say([{ id: 'P-' + c.p.id, text: c.p.explain }]); return; }
      var u = c.p.sol[c.ply], t = new Game(g.fen()), mv = t.move(uciObj(u));
      B3.arrows([[u.slice(0, 2), u.slice(2, 4), c.ply % 2 ? 'b' : 'g']]);
      if (mv && c.ply % 2 === 0) Voice.say(moveParts(mv.san, mv.from, mv.to, mv.piece, mv.captured));
      setTimeout(function () { applyMove(g, uciObj(u)).then(function () { c.ply++; setTimeout(step, 1300); }); }, 900);
    }, 1200);
  };
  function drawSpark(cv, vals) {
    if (!cv || !cv.getContext) return;
    var x = cv.getContext('2d'), W = cv.width, H = cv.height;
    x.clearRect(0, 0, W, H);
    if (vals.length < 2) { x.fillStyle = '#6d7886'; x.font = '12px "Atkinson Hyperlegible", sans-serif'; x.fillText('Solve puzzles to see your trend', 4, H / 2 + 4); return; }
    vals = vals.slice(-40);
    var lo = Math.min.apply(null, vals) - 20, hi = Math.max.apply(null, vals) + 20;
    x.strokeStyle = 'rgba(152,162,174,.18)'; x.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(function (f) { x.beginPath(); x.moveTo(0, H * f); x.lineTo(W, H * f); x.stroke(); });
    var pts = vals.map(function (v, i) { return [i / (vals.length - 1) * (W - 8) + 4, H - 6 - (v - lo) / (hi - lo) * (H - 12)]; });
    var grad = x.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, 'rgba(255,79,139,.35)'); grad.addColorStop(1, 'rgba(255,79,139,0)');
    x.beginPath(); x.moveTo(pts[0][0], H); pts.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.lineTo(pts[pts.length - 1][0], H); x.fillStyle = grad; x.fill();
    x.beginPath(); pts.forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); }); x.strokeStyle = '#ff4f8b'; x.lineWidth = 2; x.stroke();
    var e = pts[pts.length - 1]; x.beginPath(); x.arc(e[0], e[1], 3.5, 0, Math.PI * 2); x.fillStyle = '#ffd23f'; x.fill();
  }

  // ================= Play vs coach =================
  var PL = null;
  var COACH_STYLES = [
    { id: 'teach', name: 'Teach me', blurb: 'Comments, tips and the right move every time.' },
    { id: 'key', name: 'Key moments', blurb: 'Only brilliant moves, mistakes and real threats.' },
    { id: 'quiet', name: 'Let me play', blurb: 'Silent game, full review at the end.' }
  ];
  function coachStyle() { return S.coach.style || (S.puzzle.rating < 1000 ? 'teach' : 'key'); }
  function showEvalBar() { return S.coach.evalbar == null ? S.puzzle.rating >= 1000 : S.coach.evalbar; }
  ACT.setStyle = function (d) { S.coach.style = d.s; save(); MODES.play.renderSetup(); };
  // FENs of earlier positions in this game, so the engine knows about repetitions
  var HINT_LEVEL = { depth: 40, time: 2200, margin: 0 };
  function prevFens(startFen, sans) {
    var h = new Game(startFen), out = [h.fen()];
    for (var i = 0; i < sans.length - 1; i++) { h.move(sans[i]); out.push(h.fen()); }
    return sans.length ? out.slice(-40) : [];
  }
  function levelById(id) { return COACH_LEVELS.filter(function (l) { return l.id === id; })[0] || COACH_LEVELS[1]; }
  var CLASS = {
    brilliant: { key: 'brilliant', label: 'Brilliant', cls: 'brill', positive: true },
    great: { key: 'great', label: 'Great move', cls: 'great', positive: true },
    best: { key: 'best', label: 'Best', cls: 'good', positive: true },
    excellent: { key: 'excellent', label: 'Excellent', cls: 'good', positive: true },
    good: { key: 'good', label: 'Good', cls: 'good', positive: true },
    book: { key: 'book', label: 'Book move', cls: 'book', positive: true },
    inacc: { key: 'inacc', label: 'Could be better', cls: 'warn' },
    mistake: { key: 'mistake', label: 'Mistake', cls: 'warn' },
    blunder: { key: 'blunder', label: 'Blunder', cls: 'bad' }
  };
  var VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  function winChance(cp) { if (cp > 90000) return 1; if (cp < -90000) return 0; return 1 / (1 + Math.pow(10, -cp / 400)); }
  var BOOK = null;
  function posKey(fen) { return fen.split(' ').slice(0, 4).join(' '); }
  function bookMoves(fen) {
    if (!BOOK) {
      BOOK = {};
      allLines().forEach(function (o) {
        var g = new Game();
        var nm = o.base ? o.base.name : o.name; // a defence line is still that opening
        o.moves.forEach(function (s) { var k = posKey(g.fen()), m = g.move(s); if (m) { var e = (BOOK[k] = BOOK[k] || {}), u = m.from + m.to; e[u] = e[u] && e[u] !== nm ? 'many' : nm; } });
      });
      // Sound, well-known first moves and replies
      var extra = { '': ['e4', 'd4', 'c4', 'Nf3', 'g3', 'b3', 'Nc3', 'f4', 'e3'], 'e4': ['e5', 'c5', 'e6', 'c6', 'd5', 'd6', 'g6', 'Nf6', 'Nc6'], 'd4': ['d5', 'Nf6', 'e6', 'c5', 'g6', 'f5', 'd6'], 'c4': ['e5', 'c5', 'Nf6', 'e6', 'g6'], 'Nf3': ['d5', 'Nf6', 'c5', 'g6'] };
      Object.keys(extra).forEach(function (pre) {
        var g = new Game(); if (pre) g.move(pre);
        var k = posKey(g.fen());
        extra[pre].forEach(function (s) { var t = new Game(g.fen()), m = t.move(s); if (m) (BOOK[k] = BOOK[k] || {})[m.from + m.to] = BOOK[k][m.from + m.to] || 'a well-known opening'; });
      });
    }
    return BOOK[posKey(fen)] || null;
  }
  // Grade a move by how much it changes the winning chances, not raw points.
  function grade(a, res, fenBefore, uci) {
    var bm = bookMoves(fenBefore);
    if (bm && bm[uci.slice(0, 4)] && a.loss < 120) return { c: CLASS.book, opening: bm[uci.slice(0, 4)] };
    var drop = winChance(a.bestScore) - winChance(a.playedScore);
    var ply = new Game(fenBefore).full * 2;
    if (ply <= 14 && !(a.reply && a.reply.captured) && Math.abs(a.bestScore) < 200) drop /= 1.6; // quiet opening moves: judge gently
    var isBest = a.loss <= 6 || (a.best.from + a.best.to) === uci.slice(0, 4);
    if (isBest) {
      var offered = a.reply && a.reply.to === res.to && a.reply.captured && VAL[res.piece] >= 3 && VAL[res.piece] > (res.captured ? VAL[res.captured] : 0);
      if (offered && a.playedScore > -80) return { c: CLASS.brilliant };
      if (a.secondScore != null && winChance(a.bestScore) - winChance(a.secondScore) >= 0.15 && a.bestScore > -250) return { c: CLASS.great };
      return { c: CLASS.best };
    }
    if (drop <= 0.02) return { c: CLASS.excellent };
    if (drop <= 0.05) return { c: CLASS.good };
    if (drop <= 0.11) return { c: CLASS.inacc };
    if (drop <= 0.22) return { c: CLASS.mistake };
    return { c: CLASS.blunder };
  }
  // Pick a real opening line for the coach to play: traps and gambits more often for newer players.
  function pickBookLine(coachColor, lvl) {
    var p = { novice: 0.75, club: 0.65, strong: 0.5, expert: 0.35, master: 0.2 }[lvl] || 0.5;
    if (!chance(p)) return null;
    var tier = openingTier(S.puzzle.rating), pool = [];
    allLines().forEach(function (L) {
      if (L.side !== coachColor || TIER[L.level] > tier + 1) return;
      var w = (!L.def && (L.family === 'Traps' || L.gambit)) ? (S.puzzle.rating < 1200 ? 3 : 1) : 2;
      if (drilled(L.def ? L.id : DEFENCES[L.id] ? 'def-' + L.id : L.id)) w = Math.max(1, w - 1); // fresher lines first
      for (var i = 0; i < w; i++) pool.push(L);
    });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  function bookMove(g) {
    var h = g.history(), clean = function (x) { return x.replace(/[+#!?]/g, ''); };
    if (PL && !PL.book && PL.bookPool && PL.bookPool.length) { // a boss picks a favourite line that fits your moves so far
      var fit = PL.bookPool.filter(function (L) { return L.moves.length > h.length && h.every(function (m, i) { return clean(m) === clean(L.moves[i]); }); });
      if (fit.length) PL.book = fit[Math.floor(Math.random() * fit.length)];
    }
    var L = PL && PL.book; if (!L) return null;
    if (h.length >= L.moves.length) return null;
    for (var i = 0; i < h.length; i++) if (clean(h[i]) !== clean(L.moves[i])) { PL.book = PL.bookSaid ? PL.book : null; return null; }
    var m = new Game(g.fen()).move(L.moves[h.length]);
    return m ? { from: m.from, to: m.to, promotion: m.promotion, piece: m.piece } : null;
  }
  function classify(loss) { return loss <= 15 ? CLASS.best : loss <= 50 ? CLASS.good : loss <= 120 ? CLASS.inacc : loss <= 280 ? CLASS.mistake : CLASS.blunder; }
  MODES.play = {
    label: 'Play the coach',
    enter: function (arg) {
      PL = { setup: true, arg: arg || null };
      if (arg && arg.spec) { setupBoard(specFen(arg.spec), { drop: true, orient: specColor(arg.spec) }); MODES.play.renderSpecIntro(); return; }
      if (arg && arg.color) { S.coach.color = arg.color; save(); }
      setupBoard(arg && arg.fen || Game.START, { drop: true, orient: arg && arg.color || S.coach.color });
      MODES.play.renderSetup();
    },
    renderSetup: function () {
      var c = S.coach, from = PL.arg && PL.arg.from;
      setPanel('<div class="eyebrow">Sparring</div><h1 class="h1">Play the coach</h1>' +
        '<p class="lede">' + (from ? (from === 'lesson position' ? 'Play on from the lesson position. ' : 'Continue from the end of the ' + esc(from) + '. ') : '') + 'Every move you make is checked. You get told when you hang a piece, miss a tactic, or play the best move.</p>' +
        '<div class="sect-head"><h2>Opponent</h2></div>' +
        '<div class="levels">' + COACH_LEVELS.map(function (l, n) { var mine = levelForRating(S.puzzle.rating), mi = COACH_LEVELS.indexOf(levelById(mine)); return '<button class="level ' + (c.level === l.id ? 'on' : '') + '" data-act="setLevel" data-id="' + l.id + '"><span class="lv-elo">~' + l.elo + (l.id === mine ? ' <em class="lv-tag">Your level</em>' : n === mi + 1 ? ' <em class="lv-tag up">Next challenge</em>' : n < mi ? ' <em class="lv-tag easy">Warm-up</em>' : '') + '</span><span class="lv-name">' + l.name + '</span><span class="lv-blurb">' + l.blurb + '</span></button>'; }).join('') + '</div>' +
        '<div class="sect-head"><h2>Your colour</h2></div>' +
        '<div class="seg">' + [['w', 'White'], ['b', 'Black'], ['r', 'Random']].map(function (x) { return '<button class="' + (c.color === x[0] ? 'on' : '') + '" data-act="setColor" data-c="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="sect-head"><h2>Coach style</h2></div>' +
        '<div class="styles">' + COACH_STYLES.map(function (s) { return '<button class="style-opt ' + (coachStyle() === s.id ? 'on' : '') + '" data-act="setStyle" data-s="' + s.id + '"><b>' + s.name + '</b><span>' + s.blurb + '</span></button>'; }).join('') + '</div>' +
        '<div class="toggles">' +
        '<label class="toggle"><input type="checkbox" id="opt-threats" ' + (c.threats ? 'checked' : '') + '> <span>Warn me about real threats</span></label>' +
        '<label class="toggle"><input type="checkbox" id="opt-eval" ' + (showEvalBar() ? 'checked' : '') + '> <span>Show the "who\'s winning" bar</span></label></div>' +
        '<div class="actions"><button class="btn primary wide" data-act="startGame">Start game</button></div>');
      $('#opt-threats').onchange = function (e) { S.coach.threats = e.target.checked; save(); };
      $('#opt-eval').onchange = function (e) { S.coach.evalbar = e.target.checked; save(); };
    },
    start: function () {
      var c = S.coach, sp = PL.arg && PL.arg.spec, color = sp ? specColor(sp) : c.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : c.color;
      var fen = sp ? specFen(sp) : PL.arg && PL.arg.fen || Game.START;
      var g = setupBoard(fen, { orient: color });
      var lvl = sp ? levelById(sp.kind === 'boss' ? sp.b.level : sp.kind === 'challenge' ? sp.c.level : levelForRating(S.puzzle.rating)) : levelById(c.level);
      PL = { g: g, color: color, level: lvl, log: [], feed: [], over: false, evalW: 0, startFen: fen, thinking: false, style: sp ? (sp.kind === 'boss' ? 'key' : 'quiet') : coachStyle(), from: PL.arg && PL.arg.from, arg: PL.arg, spec: sp || null, chN: 0 };
      PL.book = sp ? (sp.kind === 'battle' ? sp.line : null) : fen === Game.START ? pickBookLine(color === 'w' ? 'b' : 'w', PL.level.id) : null;
      if (sp && sp.kind === 'boss') PL.bookPool = specBook(sp.b.book);
      if (sp && sp.kind === 'challenge') PL.chMat0 = material(g, color);
      if (sp && sp.kind === 'battle') { // the ply (coach to move) where the coach will slip
        var coach = color === 'w' ? 'b' : 'w', at = 3 + Math.floor(Math.random() * Math.max(1, Math.min(sp.line.moves.length, 12) - 4));
        if ((at % 2 === 0) !== (coach === 'w')) at++;
        PL.devAt = at;
      }
      setEval(0); $('#evalbar').hidden = !showEvalBar();
      setLayout();
      if (!sp) Voice.say([V('gamestart')]);
      Voice.prefetch(['M-to_n', 'V-best-0', 'V-blunder-0', 'V-why_wins-0']);
      MODES.play.render();
      MODES.play.turn();
    },
    render: function () {
      var g = PL.g, hist = g.history();
      var rows = '';
      var startBlack = new Game(PL.startFen).turn() === 'b';
      var offset = startBlack ? 1 : 0;
      for (var i = 0; i < hist.length + offset; i += 2) {
        var n = Math.floor(i / 2) + 1;
        var a = i - offset, b = i + 1 - offset;
        rows += '<span class="mn">' + n + '.</span>' + cell(a) + cell(b);
      }
      function cell(k) {
        if (k < 0) return '<span class="mv-cell">…</span>';
        if (k >= hist.length) return '<span class="mv-cell"></span>';
        var lg = PL.log[k];
        return '<span class="mv-cell">' + esc(hist[k]) + (lg && lg.cls ? '<i class="cdot ' + lg.cls + '" title="' + esc(lg.label) + '"></i>' : '') + '</span>';
      }
      var turnTxt = PL.over ? PL.over : PL.thinking ? 'Coach is thinking…' : (g.turn() === PL.color ? 'Your move' : '');
      setPanel('<div class="play-head"><div><div class="eyebrow">' + (PL.spec ? esc(PL.spec.kind === 'boss' ? PL.spec.b.name : PL.spec.kind === 'challenge' ? PL.spec.c.title : 'Opening battle') + ' · ' + esc(specProgress()) : 'vs ' + PL.level.name + ' · ~' + PL.level.elo) + '</div><div class="turn-ind ' + (PL.thinking ? 'busy' : '') + '">' + esc(turnTxt) + '</div></div>' +
        '<div class="play-btns"><button class="icon-btn" data-act="pHint" title="Hint" aria-label="Hint">?</button><button class="icon-btn" data-act="pUndo" title="Take back" aria-label="Take back">↶</button><button class="icon-btn" data-act="pResign" title="Resign" aria-label="Resign">⚑</button></div></div>' +
        '<div class="feed">' + (PL.feed.length ? PL.feed.slice(-6).reverse().map(function (f, k) {
          var lastBad = -1; for (var q = PL.feed.length - 1; q >= Math.max(0, PL.feed.length - 3); q--) if (/^(bad|warn)$/.test(PL.feed[q].cls) && /Retry/.test(PL.feed[q].html)) { lastBad = q; break; }
          var n = PL.feed.length - 1 - k, open = k === 0 || PL.feedOpen === n || n === lastBad;
          if (open) return '<div class="feed-item ' + f.cls + '"><span class="fi-tag">' + esc(f.tag) + '</span><p>' + f.html + '</p></div>';
          var tmp = document.createElement('div'); tmp.innerHTML = f.html; var line = (tmp.textContent || '').split(/(?<=[.!?])\s/)[0];
          return '<button class="feed-mini ' + f.cls + '" data-act="feedOpen" data-i="' + n + '"><span class="fi-tag">' + esc(f.tag) + '</span><span class="fm-line">' + esc(line) + '</span></button>';
        }).join('') : '<div class="feed-item"><span class="fi-tag">' + esc(PL.spec ? (PL.spec.kind === 'boss' ? PL.spec.b.name : 'Goal') : S.settings.coachName) + '</span><p>' + (PL.spec ? esc(PL.spec.kind === 'boss' ? PL.spec.b.intro : PL.spec.kind === 'challenge' ? PL.spec.c.text : 'Play your opening. The coach will slip once: find the move that punishes it.') : PL.style === 'quiet' ? 'I will stay quiet and review the game with you at the end.' : PL.style === 'key' ? 'I will speak up for brilliant moves, mistakes and real threats.' : 'Develop your pieces, control the centre, castle early. I will comment on each move.') + '</p></div>') + '</div>' +
        '<div class="sect-head"><h2>Moves</h2></div><div class="score mono">' + (rows || '<span class="muted" style="grid-column:1/-1">No moves yet</span>') + '</div>' +
        (PL.over && PL.specActions ? '<div class="actions over-actions">' + PL.specActions + '</div>' : PL.over ? '<div class="actions over-actions"><button class="btn primary" data-act="reviewGame">★ Review this game</button>' + (PL.bookSaid ? (function () { var L = PL.book, id = L.def ? L.id : DEFENCES[L.id] ? 'def-' + L.id : L.id, t = lineById(id); return '<button class="btn" data-act="openOp" data-id="' + id + '">' + (t.def && !L.def ? 'Learn to defend the ' + esc(L.name) : L.def ? 'Study how to meet the ' + esc(L.base.name) : 'Study the ' + esc(t.name)) + '</button>'; })() : '') + '<button class="btn" data-act="rematch">Rematch</button>' + (nextLevel(PL.level) ? '<button class="btn" data-act="harder">Try ' + nextLevel(PL.level).name + ' (~' + nextLevel(PL.level).elo + ')</button>' : '') + '<button class="btn ghost" data-act="newGame">New setup</button></div>' : ''));
      var sc = $('.score'); if (sc) sc.scrollTop = sc.scrollHeight;
    },
    say: function (tag, html, cls) { PL.feed.push({ tag: tag, html: html, cls: cls || '' }); },
    // Tell the player which line the coach is playing, once it is recognisable (the coach's 2nd book move)
    bookNote: function (g) {
      var L = PL.book, n = g.history().length;
      if (!L || PL.bookSaid || n < 3) return;
      PL.bookSaid = true;
      var trap = !L.def && (L.family === 'Traps' || L.gambit);
      MODES.play.say('Opening', L.def ? 'You are playing the <strong>' + esc(L.base.name) + '</strong>. Watch how I meet it: this is ' + esc(L.name) + ', and it is in Openings with every move explained.'
        : trap ? 'Heads up: I am trying the <strong>' + esc(L.name) + '</strong>. Spot the trick before it lands.'
        : 'I am playing the <strong>' + esc(L.name) + '</strong>. You will find it in Openings with every move explained.', 'bookline');
      toast(L.def ? 'Coach is meeting your ' + L.base.name : trap ? L.name + ': a trap is coming' : 'Coach plays the ' + L.name);
    },
    turn: function () {
      var g = PL.g;
      if (MODES.play.checkOver()) return;
      if (g.turn() === PL.color) {
        IX.enabled = true; IX.canMove = function (c) { return c === PL.color && !PL.over; };
        IX.onMove = MODES.play.userMove;
        if (S.coach.threats && PL.style !== 'quiet') {
          Eng.call('threat', g.fen()).then(function (t) {
            if (!t || PL.g !== g || g.turn() !== PL.color) return;
            if (t.kind !== 'mate' && (t.gain < 150 || t.piece === 'p')) return;
            var tkey = t.kind + t.to + (t.piece || '');
            if (PL.lastThreat === tkey) return;
            PL.lastThreat = tkey;
            B3.arrows([PL.retryArrow, [t.from, t.to, 'r']].filter(Boolean));
            Voice.say([t.kind === 'mate' ? V('threat_mate', 'threatmate') : V('threat_piece', 'threatpiece')], t.kind !== 'mate');
            MODES.play.say('Threat', t.kind === 'mate' ? 'Your opponent threatens <strong>checkmate</strong> on ' + t.to + '. Deal with it first.' : 'Your ' + PIECE_NAME[t.piece] + ' on ' + t.to + ' is under attack and not safe.', 'warn');
            MODES.play.render();
          });
        }
      } else {
        if (PL.judging) return;
        if (PL.spec && PL.spec.kind === 'challenge' && PL.spec.c.goal !== 'survive' && PL.chN >= PL.spec.c.limit) { MODES.play.finish('loss', 'Out of moves.'); return; }
        IX.enabled = false; PL.thinking = true; MODES.play.render();
        var t0 = Date.now(), fen = g.fen(), bm = bookMove(g), slip = PL.spec && PL.spec.kind === 'battle' && !PL.devDone && g.history().length >= PL.devAt;
        var job = slip ? Eng.call('mistake', fen).then(function (m) { if (m) return { move: m, score: null, slip: true }; PL.devAt += 2; return bm ? { move: bm, score: null, book: true } : Eng.call('pickMove', fen, PL.level, prevFens(PL.startFen, g.history())); })
          : bm ? Promise.resolve({ move: bm, score: null, book: true }) : Eng.call('pickMove', fen, PL.level, prevFens(PL.startFen, g.history()));
        job.then(function (r) {
          if (!PL || PL.g !== g || PL.over) return;
          var wait = Math.max(0, 450 - (Date.now() - t0));
          setTimeout(function () {
            if (!PL || PL.g !== g || PL.over) return; // the player left this game while the coach was thinking
            PL.thinking = false;
            if (!r || !r.move) { MODES.play.checkOver(); return; }
            applyMove(g, { from: r.move.from, to: r.move.to, promotion: r.move.promotion || undefined }).then(function (res) {
              PL.log.push({});
              if (r.slip) { PL.devDone = true; PL.devPly = g.history().length - 1; toast('⚡ The coach slipped. Find the punishment!'); Voice.say([V('battle_slip')], true); }
              if (r.book && !PL.spec) MODES.play.bookNote(g);
              if (res && /\+$/.test(res.san)) Voice.say([V('check_received')], true);
              else if (res && res.captured && /[nbrq]/.test(res.captured) && chance(0.6)) Voice.say([V('coach_captures')], true);
              if (r.score != null) setEval(PL.color === 'w' ? -r.score : r.score, true);
              MODES.play.render();
              MODES.play.turn();
              setTimeout(function () { if (PL && PL.g === g && g.turn() === PL.color) MODES.play.coachTip(); }, 2600);
            });
          }, wait);
        });
      }
    },
    userMove: function (mv, uci) {
      if (PL.style === 'teach' && !PL.spec && S.puzzle.rating < 1000 && !PL.guardOk) {
        var gfen = PL.g.fen(), g0 = PL.g;
        return Eng.call('analyzeMove', gfen, uci, 30, 800).then(function (a) {
          if (!PL || PL.g !== g0) return;
          if (a && a.loss >= 250 && a.playedScore < 90000) {
            var why = a.reply && a.reply.score > 90000 ? esc(a.replySan) + ' would be checkmate.' : a.reply && a.reply.captured ? 'Then ' + esc(a.replySan) + ' wins your ' + PIECE_NAME[a.reply.captured] + '.' : 'It loses material.';
            PL.guard = { mv: mv, uci: uci };
            MODES.play.say('Wait!', '<strong>' + esc((new Game(gfen).move(mv) || {}).san || uci) + '?</strong> ' + why + '<span class="fi-actions"><button class="mini-btn" data-act="pGuardBack">Pick another move</button><button class="mini-btn ghost" data-act="pGuardGo">Play it anyway</button></span>', 'warn');
            MODES.play.render(); IX.enabled = true; return;
          }
          PL.guardOk = true; var r = MODES.play.userMove(mv, uci); PL.guardOk = false; return r;
        });
      }
      var g = PL.g, fenBefore = g.fen(), moveNo = g.history().length;
      PL.retryArrow = null;
      PL.log[moveNo] = {};
      var res;
      return applyMove(g, mv).then(function (r) {
        res = r;
        var sp = PL.spec;
        if (sp && sp.kind === 'challenge') {
          PL.chN++;
          if (sp.c.goal === 'promote' && r.promotion) { MODES.play.render(); return MODES.play.finish('win', 'Promoted in ' + PL.chN + ' moves!'); }
          if (sp.c.goal === 'survive' && PL.chN >= sp.c.limit && !g.inCheckmate()) { MODES.play.render(); return MODES.play.finish(material(g, PL.color) >= PL.chMat0 - 1 ? 'win' : 'loss', material(g, PL.color) >= PL.chMat0 - 1 ? 'You held the position for ' + sp.c.limit + ' moves.' : 'You survived, but lost material.'); }
        }
        if (sp && sp.kind === 'battle' && PL.devDone && moveNo === PL.devPly + 1) {
          PL.judging = true; MODES.play.render();
          Eng.call('analyzeMove', fenBefore, uci, 30, 1400).then(function (a) { if (PL && PL.g === g) MODES.play.battleEnd(a, fenBefore, uci, r); });
          return;
        }
        if (S.coach.explain) {
          Eng.call('analyzeMove', fenBefore, uci, 30, 1100).then(function (a) { if (PL && PL.g === g) MODES.play.comment(a, res, moveNo, fenBefore); });
        }
        MODES.play.render();
        MODES.play.turn();
      });
    },
    comment: function (a, res, idx, fenBefore) {
      if (!a) return;
      var uci = res.from + res.to + (res.promotion || '');
      var gr = grade(a, res, fenBefore, uci), c = gr.c;
      if (a.bestScore > 90000 && a.playedScore < 90000) c = CLASS.blunder;
      PL.log[idx] = { cls: c.cls, label: c.label, loss: c.positive ? Math.min(a.loss, 10) : a.loss, best: a.best, bestSan: a.bestSan, key: c.key, fen: fenBefore, uci: uci, san: res.san, reply: a.replySan };
      if (c.key === 'brilliant') Badges.award('brilliant');
      var style = PL.style, quiet = style === 'quiet', keyOnly = style === 'key';
      var ply = idx + 1, best = a.best;
      setEval(PL.color === 'w' ? a.playedScore : -a.playedScore, true);
      MODES.play.trackSwing(a.playedScore);
      var html = '<strong>' + esc(res.san) + '</strong> ', spoken;
      if (c.positive) {
        var praise = '';
        if (c.key === 'book') praise = gr.opening === 'many' || gr.opening === 'a well-known opening' ? 'A classic opening move. That is theory.' : 'Straight out of the ' + esc(gr.opening) + '. That is opening theory.';
        else if (c.key === 'brilliant') praise = 'A real sacrifice, and it works! The piece is offered but taking it does not help them.';
        else if (c.key === 'great') praise = 'The only move that keeps your position together. Well found.';
        else if (res.flags === 'k' || res.flags === 'q') praise = 'King tucked away. Good habit.';
        else if (ply <= 16 && (res.piece === 'n' || res.piece === 'b') && /[18]$/.test(res.from)) praise = 'Developing a piece. Exactly what the opening wants.';
        else if (res.captured) praise = 'Good capture.';
        else if (/[+#]/.test(res.san)) praise = 'Strong check.';
        else if (c.key !== 'best' && a.bestSan && a.bestSan !== res.san) praise = 'Also strong was ' + esc(a.bestSan) + '.';
        html += c.label + '. ' + praise;
        var flavour = (res.flags === 'k' || res.flags === 'q') ? 'castle'
          : (ply <= 16 && (res.piece === 'n' || res.piece === 'b') && /[18]$/.test(res.from)) ? 'develop'
          : res.captured ? 'capture' : /\+$/.test(res.san) ? 'check_given' : null;
        var talk = { brilliant: 1, great: 1, best: 0.6, excellent: 0.45, good: 0.35, book: PL.saidBook ? 0.2 : 1 }[c.key];
        if (c.key === 'book') PL.saidBook = true;
        if (c.key === 'brilliant' || c.key === 'great') spoken = [V(c.key, 'best')];
        else if (!keyOnly && (flavour === 'castle' || chance(talk))) spoken = [flavour && c.key !== 'book' && chance(0.7) ? V(flavour) : V(c.key, c.key === 'book' ? 'good' : c.key === 'excellent' ? 'best' : c.key)];
        if (quiet) { if (!PL.over) MODES.play.render(); return; }
        if (!keyOnly || c.key === 'brilliant' || c.key === 'great') MODES.play.say(c.label, html, c.cls);
        if (spoken) Voice.say(spoken, c.key !== 'brilliant' && c.key !== 'great');
      } else {
        var why = '';
        if (a.bestScore > 90000) why = 'You had a forced mate starting with <strong>' + esc(a.bestSan) + '</strong>.';
        else if (a.reply && a.reply.captured && { n: 1, b: 1, r: 1, q: 1 }[a.reply.captured] && a.loss > 120) why = 'This lets ' + esc(a.replySan) + ' win your ' + PIECE_NAME[a.reply.captured] + ' on ' + a.reply.to + '.';
        else if (a.reply && a.reply.score > 90000) why = 'This allows ' + esc(a.replySan) + ' with a mating attack.';
        else if (best.captured && a.loss > 120) why = 'You could have won the ' + PIECE_NAME[best.captured] + ' on ' + best.to + '.';
        else if (c.key === 'inacc') why = 'It works, but there was something a little better.';
        if (ply <= 10 && res.piece === 'q' && !res.captured) why += ' Moving the queen early lets your opponent develop with tempo.';
        var wb = whyBest(a, a.bestSan, ply, fenBefore);
        PL.log[idx].why = wb[0];
        html += c.label + '. ' + why + '<span class="better">Best was <strong>' + esc(a.bestSan) + '</strong>' + (S.puzzle.rating < 900 ? ' (' + PIECE_NAME[best.piece] + (best.captured ? ' takes on ' : ' to ') + best.to + ')' : '') + '. ' + esc(wb[1]) + '</span>' +
          '<span class="fi-actions"><button class="mini-btn" data-act="pShow" data-i="' + idx + '">▶ Show me what happens</button><button class="mini-btn ghost" data-act="pRetry" data-i="' + idx + '">↶ Retry</button><button class="mini-btn ghost" data-act="pSayBest" data-i="' + idx + '">🔊 Hear it</button></span>';
        if (quiet || (keyOnly && c.key === 'inacc')) { if (!PL.over) MODES.play.render(); return; }
        MODES.play.say(c.label, html, c.cls);
        var reason = null;
        if (a.bestScore > 90000) reason = 'missed_mate';
        else if (a.reply && a.reply.score > 90000) reason = 'allows_mate';
        else if (a.reply && a.reply.captured && a.loss > 120 && /[pnbrq]/.test(a.reply.captured)) reason = 'hang_' + a.reply.captured;
        else if (best.captured && a.loss > 120 && /[nbrq]/.test(best.captured)) reason = 'missed_' + best.captured;
        spoken = [c.key === 'inacc' ? (V('okay') || V('inacc', 'inacc')) : V(c.key, c.key), reason ? V(reason) : null];
        if (c.key !== 'inacc' || chance(0.6)) spoken = spoken.concat([pickPool('better_was')], moveParts(a.bestSan, best.from, best.to, best.piece, best.captured), [pickPool(wb[0])]);
        Voice.say(spoken);
      }
      if (!PL.over) MODES.play.render();
    },
    trackSwing: function (score) {
      if (!PL) return;
      PL.minEval = Math.min(PL.minEval == null ? score : PL.minEval, score);
      if (!PL.toldComeback && PL.minEval < -250 && score > 120) { PL.toldComeback = true; var l = V('comeback'); if (l) { MODES.play.say('Coach', esc(l.text), 'good'); Voice.say([l], true); } }
    },
    coachTip: function () {
      if (!PL || PL.over || PL.style !== 'teach') return;
      var lastMine = PL.log.filter(function (l) { return l && l.cls; }).pop();
      if (lastMine && /^(bad|warn)$/.test(lastMine.cls)) return; // no pep talk right after a mistake: the explanation matters more
      var g = PL.g, me = PL.color, moveNo = Math.floor(g.history().length / 2) + 1, tip = null, once = PL.tips || (PL.tips = {});
      var board = g.boardArray(), mat = { w: 0, b: 0 }, minors = 0, queens = 0, total = 0;
      board.forEach(function (row) { row.forEach(function (p) { if (!p) return; mat[p.color] += VAL[p.type]; if (p.type !== 'p' && p.type !== 'k') total += VAL[p.type]; if (p.type === 'q') queens++; if (p.color === me && (p.type === 'n' || p.type === 'b') && p.square[1] === (me === 'w' ? '1' : '8')) minors++; }); });
      var diff = mat[me] - mat[me === 'w' ? 'b' : 'w'];
      var kingHome = g.get(me === 'w' ? 'e1' : 'e8');
      var castled = !(kingHome && kingHome.type === 'k');
      if (!once.castle && !castled && moveNo >= 9 && /[KQkq]/.test(g.fen().split(' ')[2])) tip = 'tip_castle';
      else if (!once.develop && minors >= 2 && moveNo >= 8) tip = 'tip_develop';
      else if (!once.endgame && (total <= 26 || queens === 0) && moveNo >= 15) tip = 'tip_endgame';
      else if (!once.ahead && diff >= 3) tip = 'tip_ahead';
      else if (!once.behind && diff <= -3) tip = 'tip_behind';
      else if (moveNo - (PL.lastTipMove || 0) >= 7 && moveNo >= 6 && chance(0.5)) tip = moveNo < 12 ? 'tip_opening' : total <= 26 ? 'tip_endgame_gen' : 'tip_middle';
      if (!tip) return;
      var line = V(tip);
      if (!line) return;
      if (!/_(opening|middle|endgame_gen)$/.test(tip)) once[tip.slice(4)] = true;
      PL.lastTipMove = moveNo;
      MODES.play.say('Coach tip', esc(line.text), 'tip');
      Voice.say([line], true);
      MODES.play.render();
    },
    checkOver: function () {
      var g = PL.g, msg = null, result = null;
      if (g.inCheckmate()) { var winner = g.turn() === 'w' ? 'b' : 'w'; result = winner === PL.color ? 'win' : 'loss'; msg = result === 'win' ? 'Checkmate. You win!' : 'Checkmate. The coach wins.'; }
      else if (g.inStalemate()) { result = 'draw'; msg = 'Stalemate. Draw.'; }
      else if (g.insufficient()) { result = 'draw'; msg = 'Draw by insufficient material.'; }
      else if (g.threefold()) { result = 'draw'; msg = 'Draw by repetition.'; }
      else if (g.half >= 100) { result = 'draw'; msg = 'Draw by the 50-move rule.'; }
      if (!msg) return false;
      MODES.play.finish(result, msg);
      return true;
    },
    finish: function (result, msg) {
      if (PL.over) return;
      if (PL.spec && PL.spec.kind !== 'boss') return MODES.play.specFinish(result, msg);
      PL.over = msg; IX.enabled = false;
      var mine = PL.log.filter(function (l) { return l && l.cls; });
      var acc = mine.length ? Math.round(mine.reduce(function (s, l) { return s + 100 * Math.exp(-Math.max(0, l.loss) / 220); }, 0) / mine.length) : null;
      var count = function (k) { return mine.filter(function (l) { return l.label === k; }).length; };
      S.games.push({ d: dayKey(), level: PL.level.id, result: result, acc: acc, moves: PL.g.history().length });
      if (S.games.length > 200) S.games.shift();
      today().game = true; addXP(result === 'win' ? 60 : 30); save();
      if (result === 'win') Badges.award('beat_' + PL.level.id);
      if (PL.toldComeback && result === 'win') Badges.award('comeback');
      PL.result = result; PL.acc = acc;
      if (result === 'win') { Sound.play('win'); B3.burst(kingSq(PL.g) || 'e4'); confetti(); }
      var endLine = result === 'win' ? 'win' : result === 'draw' ? 'draw' : /Checkmate/.test(msg) ? 'loss' : null;
      if (endLine) Voice.say([V(endLine, endLine)]);
      else Voice.say([V('resign')]);
      if (PL.spec && PL.spec.kind === 'boss') MODES.play.bossEnd(result);
      MODES.play.say('Game over', esc(msg) + (acc != null ? ' Accuracy <strong>' + acc + '%</strong>.<span class="summary-row">' + [['Brilliant', 'brill'], ['Great move', 'great'], ['Best', 'good'], ['Excellent', 'good'], ['Good', 'good'], ['Book move', 'book'], ['Could be better', 'warn'], ['Mistake', 'warn'], ['Blunder', 'bad']].filter(function (x) { return count(x[0]); }).map(function (x) { return '<span class="sum-chip ' + x[1] + '">' + count(x[0]) + ' ' + x[0] + '</span>'; }).join('') + '</span>' : '') + (count('Blunder') ? ' Review the red moves: most games under 1500 are decided by them.' : ''), result === 'win' ? 'good' : result === 'loss' ? 'bad' : '');
      MODES.play.render();
    },
    leave: function () { PL = null; }
  };
  function setEval(cpWhite, show) {
    var bar = $('#evalbar i'), lab = $('#evalbar span');
    var v = Math.max(-1, Math.min(1, Math.tanh(cpWhite / 600)));
    var whiteShare = 50 + v * 46;
    var flipped = B3.orientation() === 'b';
    bar.style.height = whiteShare + '%';
    $('#evalbar').classList.toggle('flip', flipped);
    lab.textContent = Math.abs(cpWhite) > 90000 ? 'M' : (cpWhite > 0 ? '+' : '') + (cpWhite / 100).toFixed(1);
  }
  function nextLevel(l) { var i = COACH_LEVELS.indexOf(l); return i >= 0 && i < COACH_LEVELS.length - 1 ? COACH_LEVELS[i + 1] : null; }
  ACT.rematch = function () { var keep = PL; go('play', keep.from ? { fen: keep.startFen, color: keep.color, from: keep.from } : null); MODES.play.start(); };
  ACT.harder = function () { var n = nextLevel(PL.level); if (n) { S.coach.level = n.id; save(); } ACT.rematch(); };
  ACT.reviewGame = function () {
    if (!PL) return;
    go('review', { log: PL.log.slice(), startFen: PL.startFen, moves: PL.g.history(), color: PL.color, result: PL.result, acc: PL.acc, level: PL.level, over: PL.over });
  };
  ACT.feedOpen = function (d) { if (PL) { PL.feedOpen = +d.i; MODES.play.render(); } };
  ACT.setLevel = function (d) { S.coach.level = d.id; save(); MODES.play.renderSetup(); };
  ACT.setColor = function (d) { S.coach.color = d.c; save(); if (d.c !== 'r') B3.setOrientation(d.c); MODES.play.renderSetup(); };
  ACT.startGame = function () { MODES.play.start(); };
  ACT.newGame = function () { go('play'); };
  ACT.pResign = function () { if (PL && !PL.over && PL.g) MODES.play.finish('loss', 'You resigned.'); };
  ACT.pGuardBack = function () { if (!PL || !PL.guard) return; PL.guard = null; PL.feed.pop(); MODES.play.render(); IX.enabled = true; };
  ACT.pGuardGo = function () { if (!PL || !PL.guard) return; var gd = PL.guard; PL.guard = null; PL.feed.pop(); PL.guardOk = true; IX.enabled = false; MODES.play.userMove(gd.mv, gd.uci); PL.guardOk = false; };
  ACT.pUndo = function () {
    if (!PL || !PL.g || PL.thinking || PL.over) return;
    if (PL.spec) { toast('No takebacks in arena games.'); return; }
    var g = PL.g, n = 0;
    while (g.history().length && n < 2) { g.undo(); n++; if (g.turn() === PL.color) break; }
    PL.log.length = g.history().length; PL.minEval = null;
    deselect(); B3.sync(g.fen()); B3.markers('last', []); B3.arrows([]); showCheck(g);
    MODES.play.say('Takeback', 'Position restored. Find a better move.', '');
    Voice.say([V('takeback')]);
    MODES.play.render(); MODES.play.turn();
  };
  ACT.pRetry = function (d) {
    if (!PL || !PL.g || PL.thinking) return;
    if (PL.spec) { toast('No takebacks in arena games. Use Show me to learn from it.'); return; }
    var idx = +d.i, g = PL.g, lg = PL.log[idx];
    if (PL.over) { PL.over = false; }
    while (g.history().length > idx) g.undo();
    PL.log.length = idx; PL.minEval = null;
    deselect(); B3.sync(g.fen()); B3.markers('last', []); showCheck(g);
    PL.retryArrow = lg && lg.best ? [lg.best.from, lg.best.to, 'g'] : null;
    if (lg && lg.best) { B3.arrows([[lg.best.from, lg.best.to, 'g']]); B3.flash('hint', [lg.best.from, lg.best.to], 2200); }
    MODES.play.say('Retry', 'Rewound to before your move. ' + (lg && lg.bestSan ? 'Try <strong>' + esc(lg.bestSan) + '</strong>, shown by the green arrow.' : ''), 'good');
    Voice.say([pickPool('retry_intro')]);
    MODES.play.render(); MODES.play.turn();
  };
  ACT.pSayBest = function (d) {
    var lg = PL && PL.log[+d.i]; if (!lg || !lg.best) return;
    Voice.say([pickPool('better_was')].concat(moveParts(lg.bestSan, lg.best.from, lg.best.to, lg.best.piece, lg.best.captured), [lg.why ? pickPool(lg.why) : null]));
    B3.arrows([[lg.best.from, lg.best.to, 'g']]);
  };
  ACT.pHint = function () {
    if (!PL || !PL.g || PL.over || PL.g.turn() !== PL.color) return;
    if (PL.spec && PL.spec.kind !== 'challenge') { toast(PL.spec.kind === 'battle' ? 'No hints: finding the punishment is the battle.' : 'No hints against a boss.'); return; }
    var g = PL.g;
    if (PL.hinting) return;
    PL.hinting = true;
    toast('Finding the best move…');
    Eng.call('pickMove', g.fen(), HINT_LEVEL, prevFens(PL.startFen, g.history())).then(function (r) {
      PL.hinting = false;
      if (!r || !r.move || PL.g !== g) return;
      B3.arrows([[r.move.from, r.move.to, 'g']]);
      MODES.play.say('Hint', 'Consider moving the ' + PIECE_NAME[r.move.piece] + ' on ' + r.move.from + '. The arrow shows the move.', 'good');
      MODES.play.render();
    });
  };

  // ================= Game review =================
  var RV = null;
  MODES.review = {
    label: 'Game review',
    enter: function (arg) {
      RV = arg; RV.ply = arg.moves.length;
      var mine = arg.log.map(function (l, i) { return l && l.cls ? Object.assign({ i: i }, l) : null; }).filter(Boolean);
      var bad = mine.filter(function (l) { return !CLASS[l.key] || !CLASS[l.key].positive; }).sort(function (x, y) { return y.loss - x.loss; });
      var bril = mine.filter(function (l) { return l.key === 'brilliant' || l.key === 'great'; });
      RV.moments = bad.slice(0, 3).concat(bril.slice(0, 1)).sort(function (x, y) { return x.i - y.i; });
      RV.mine = mine;
      setupBoard(arg.startFen, { orient: arg.color });
      MODES.review.goto(arg.moves.length, true);
      Voice.say([V('review_intro')]);
    },
    position: function (n) { var g = new Game(RV.startFen); for (var i = 0; i < n; i++) g.move(RV.moves[i]); return g; },
    goto: function (n, silent) {
      RV.ply = Math.max(0, Math.min(RV.moves.length, n));
      var g = MODES.review.position(RV.ply);
      IX.game = g; B3.sync(g.fen()); showCheck(g);
      var lg = RV.log[RV.ply - 1], arrows = [];
      if (RV.ply > 0) { var t = MODES.review.position(RV.ply - 1), m = t.move(RV.moves[RV.ply - 1]); if (m) B3.markers('last', [m.from, m.to]); }
      else B3.markers('last', []);
      if (lg && lg.best && CLASS[lg.key] && !CLASS[lg.key].positive) arrows.push([lg.best.from, lg.best.to, 'g']);
      B3.arrows(arrows);
      MODES.review.render();
    },
    render: function () {
      var r = RV, g = MODES.review.position(r.ply);
      var count = function (k) { return r.mine.filter(function (l) { return l.key === k; }).length; };
      var chips = Object.keys(CLASS).filter(function (k) { return count(k); }).map(function (k) { return '<span class="sum-chip ' + CLASS[k].cls + '">' + count(k) + ' ' + CLASS[k].label + '</span>'; }).join('');
      var rows = '';
      for (var i = 0; i < r.moves.length; i += 2) {
        rows += '<span class="mn">' + (i / 2 + 1) + '.</span>' + cell(i) + cell(i + 1);
      }
      function cell(k) {
        if (k >= r.moves.length) return '<span></span>';
        var lg = r.log[k];
        return '<button class="rv-mv ' + (r.ply === k + 1 ? 'cur' : '') + '" data-act="rvGo" data-n="' + (k + 1) + '">' + esc(r.moves[k]) + (lg && lg.cls ? '<i class="cdot ' + lg.cls + '"></i>' : '') + '</button>';
      }
      var cur = r.log[r.ply - 1], curHtml = '';
      if (cur && cur.label) {
        curHtml = '<div class="feed-item ' + cur.cls + '"><span class="fi-tag">Move ' + Math.ceil(r.ply / 2) + ' · ' + esc(cur.label) + '</span><p><strong>' + esc(cur.san) + '</strong>' +
          (CLASS[cur.key] && !CLASS[cur.key].positive ? ' Best was <strong>' + esc(cur.bestSan) + '</strong> (green arrow).' + (cur.reply ? ' After your move, ' + esc(cur.reply) + ' was strong for your opponent.' : '') + ' <button class="link" data-act="rvShow" data-n="' + r.ply + '">▶ Show me</button> · <button class="link" data-act="rvSay" data-n="' + r.ply + '">🔊 Explain</button>' : ' Well played.') + '</p></div>';
      }
      setPanel('<button class="back" data-act="goPlay">← New game</button><div class="eyebrow">Game review · vs ' + esc(r.level.name) + '</div>' +
        '<h1 class="h1">' + esc(r.over || 'Game review') + '</h1>' +
        '<div class="rv-hero"><div><div class="muted small">Your accuracy</div><div class="rating">' + (r.acc != null ? r.acc + '%' : '–') + '</div></div><div class="summary-row">' + chips + '</div></div>' +
        (r.moments.length ? '<div class="sect-head"><h2>Moments that decided the game</h2></div><div class="moments">' + r.moments.map(function (m, k) {
          return '<button class="moment ' + m.cls + '" data-act="rvMoment" data-k="' + k + '"><span class="mo-n">' + (k + 1) + '</span><span><b>Move ' + Math.ceil((m.i + 1) / 2) + ': ' + esc(m.san) + '</b><span class="mo-sub">' + esc(m.label) + (m.bestSan && CLASS[m.key] && !CLASS[m.key].positive ? ' · best was ' + esc(m.bestSan) : '') + '</span></span><span class="mo-go">▶</span></button>';
        }).join('') + '</div>' + (r.moments.some(function (m) { return !CLASS[m.key].positive; }) ? '<button class="btn primary big" data-act="rvPractice">Practise these positions</button>' : '') : '<p class="lede">No big mistakes this game. Impressive!</p>') +
        curHtml +
        '<div class="rv-nav"><button class="icon-btn" data-act="rvGo" data-n="0" aria-label="Start">⏮</button><button class="icon-btn" data-act="rvGo" data-n="' + (r.ply - 1) + '" aria-label="Back">◀</button><span class="mono small">' + r.ply + ' / ' + r.moves.length + '</span><button class="icon-btn" data-act="rvGo" data-n="' + (r.ply + 1) + '" aria-label="Forward">▶</button><button class="icon-btn" data-act="rvGo" data-n="' + r.moves.length + '" aria-label="End">⏭</button></div><p class="kbd-hint" style="text-align:center"><kbd>←</kbd> <kbd>→</kbd> moves · <kbd>Home</kbd> <kbd>End</kbd></p>' +
        '<div class="score rv-score mono">' + rows + '</div>');
    },
    explain: function (n) {
      var lg = RV.log[n - 1]; if (!lg || !lg.best) return;
      Voice.say([V('review_moment'), V(lg.key, lg.key), pickPool('better_was')].concat(moveParts(lg.bestSan, lg.best.from, lg.best.to, lg.best.piece, lg.best.captured), [lg.why ? pickPool(lg.why) : null]));
    },
    leave: function () { }
  };
  ACT.rvGo = function (d) { MODES.review.goto(+d.n); };
  ACT.rvSay = function (d) { MODES.review.explain(+d.n); };
  ACT.rvMoment = function (d) {
    var m = RV.moments[+d.k];
    MODES.review.goto(m.i); // position before the move
    var lg = RV.log[m.i];
    var arrows = [[lg.uci.slice(0, 2), lg.uci.slice(2, 4), 'r']];
    if (lg.best && !CLASS[lg.key].positive) arrows.push([lg.best.from, lg.best.to, 'g']);
    B3.arrows(arrows);
    if (CLASS[lg.key].positive) Voice.say([V(lg.key, 'best')]); else MODES.review.explain(m.i + 1);
    toast('Red: what you played. Green: the better move.');
  };
  ACT.rvPractice = function () {
    var list = RV.moments.filter(function (m) { return !CLASS[m.key].positive; }).map(function (m) { return { fen: m.fen, best: m.best, bestSan: m.bestSan, color: RV.color }; });
    go('practice', { list: list, back: RV });
  };

  // ================= Practice positions (from reviews and lessons) =================
  var PR = null;
  MODES.practice = {
    label: 'Practice',
    enter: function (arg) { PR = { list: arg.list, i: 0, solved: 0, back: arg.back }; MODES.practice.load(); Voice.say([V('practice_start')]); },
    load: function () {
      var item = PR.list[PR.i], g = setupBoard(item.fen, { drop: true, orient: new Game(item.fen).turn() });
      PR.tries = 0;
      IX.enabled = true; IX.canMove = function (c) { return c === g.turn(); }; IX.onMove = MODES.practice.onMove;
      MODES.practice.render();
    },
    render: function (msg, kind) {
      var item = PR.list[PR.i];
      setPanel('<button class="back" data-act="practiceBack">← Back to review</button><div class="eyebrow">Practice ' + (PR.i + 1) + ' of ' + PR.list.length + '</div><h1 class="h1">Find a better move</h1>' +
        '<p class="lede">This is a position from your game where you went wrong. ' + (new Game(item.fen).turn() === 'w' ? 'White' : 'Black') + ' to move.</p>' +
        '<div id="status" class="status ' + (kind || '') + '">' + (msg || '') + '</div>' +
        '<div class="actions"><button class="btn ghost" data-act="practiceHint">Show the move</button>' + (PR.done ? '<button class="btn primary" data-act="practiceNext">' + (PR.i < PR.list.length - 1 ? 'Next position' : 'Finish') + '</button>' : '') + '</div>');
    },
    onMove: function (mv, uci) {
      var g = IX.game, fen = g.fen();
      setStatus('Checking…');
      return Eng.call('analyzeMove', fen, uci, 30, 1200).then(function (a) {
        if (a && a.loss <= 40) {
          return applyMove(g, mv).then(function () {
            PR.done = true; PR.solved++; B3.burst(mv.to); Sound.play('good');
            Voice.say([V('practice_good', 'correct')]);
            MODES.practice.render('<strong>That works!</strong> ' + (uci.slice(0, 4) === a.best.from + a.best.to ? 'Exactly the best move.' : 'The engine\'s top choice was ' + esc(a.bestSan) + ', but yours is just as good.'), 'good');
          });
        }
        PR.tries++; Sound.play('bad'); B3.flash('bad', [mv.to]);
        Voice.say([V('practice_retry', 'notquite')]);
        MODES.practice.render('<strong>Still not the one.</strong> ' + (PR.tries >= 2 ? 'Hint: move your ' + PIECE_NAME[a.best.piece] + ' from ' + a.best.from + '.' : 'Look for checks, captures and threats.'), 'bad');
        IX.enabled = true;
      });
    },
    leave: function () { }
  };
  ACT.practiceHint = function () { var it = PR.list[PR.i]; B3.arrows([[it.best.from, it.best.to, 'g']]); Voice.say([pickPool('better_was')].concat(moveParts(it.bestSan, it.best.from, it.best.to, it.best.piece, it.best.captured))); PR.done = true; MODES.practice.render('The move was <strong>' + esc(it.bestSan) + '</strong>.'); };
  ACT.practiceNext = function () { PR.done = false; if (PR.i < PR.list.length - 1) { PR.i++; MODES.practice.load(); } else if (PR.back && PR.back.moves) { go('review', PR.back); } else go('path'); };
  ACT.practiceBack = function () { if (PR.back && PR.back.moves) go('review', PR.back); else go('path'); };

  // ================= Show me: replay what happens on the board =================
  function material(g, color) { var v = 0; g.boardArray().forEach(function (row) { row.forEach(function (p) { if (p) v += (p.color === color ? 1 : -1) * VAL[p.type]; }); }); return v; }
  var Replay = (function () {
    var tok = 0;
    function bar(html) {
      var b = $('#replay-bar');
      if (!b) { b = document.createElement('div'); b.id = 'replay-bar'; b.className = 'replay-bar'; b.setAttribute('role', 'status'); $('.stage').appendChild(b); }
      b.hidden = !html; if (html) b.innerHTML = html;
    }
    // Play `moves` (from/to/promotion objects) from `fen`; `me` is the learner's colour. Calls opts.done(summary, game).
    function run(fen, moves, opts) {
      var my = ++tok, g = new Game(fen), me = opts.me, m0 = material(g, me), first = opts.firstIsMine;
      IX.enabled = false; deselect(); B3.arrows([]); B3.sync(fen); B3.markers('last', []); showCheck(g);
      Voice.say([V('replay_intro')], true);
      var i = 0;
      bar('<span class="rb-tag">Replay</span><span class="rb-text">' + esc(opts.title || 'Watch what happens') + '</span>');
      (function step() {
        if (my !== tok) return;
        if (i >= moves.length || g.gameOver()) {
          var d = material(g, me) - m0, mate = g.inCheckmate(), loser = mate ? (g.turn() === me ? 'you' : 'them') : null;
          var sum = (opts.missedMate && !(mate && loser === 'them') ? 'No checkmate this way. ' : '') + (mate ? (loser === 'you' ? 'and that is checkmate against you.' : 'and that is checkmate.') : d <= -1 ? 'You end up ' + (-d) + ' point' + (-d > 1 ? 's' : '') + ' of material down.' : d >= 1 ? 'You end up ' + d + ' point' + (d > 1 ? 's' : '') + ' of material ahead.' : 'Material stays level.');
          bar('<span class="rb-tag">Result</span><span class="rb-text">' + esc(sum) + '</span><span class="rb-actions">' + (opts.actions || '') + '<button class="mini-btn ghost" data-act="replayAgain">↻ Watch again</button></span>');
          Replay.last = { fen: fen, moves: moves, opts: opts };
          if (opts.done) opts.done(sum, g);
          return;
        }
        var mv = moves[i], mine = (g.turn() === me), t = new Game(g.fen()), dec = t.move(mv);
        if (!dec) { i = moves.length; return step(); }
        B3.arrows([[mv.from, mv.to, mine ? (first && i === 0 ? 'r' : 'g') : 'r']]);
        bar('<span class="rb-tag">' + (i + 1) + ' / ' + moves.length + '</span><span class="rb-text">' + (mine ? 'You play ' : 'They answer ') + '<b class="mono">' + esc(dec.san) + '</b>' + (dec.captured ? ', taking the ' + PIECE_NAME[dec.captured] : '') + (/#$/.test(dec.san) ? '. Checkmate!' : /\+$/.test(dec.san) ? ', with check' : '') + '</span>');
        setTimeout(function () {
          if (my !== tok) return;
          applyMove(g, mv).then(function () { i++; setTimeout(step, 850); });
        }, 700);
      })();
    }
    return { run: run, stop: function () { tok++; bar(null); }, bar: bar, last: null };
  })();
  // A wrong move in a lesson or drill: what does it allow?
  var WHY = null;
  function whyNote(fen, mv) {
    var g = new Game(fen), m = g.move(mv); if (!m) return '';
    var mate = g.moves().filter(function (x) { return /#$/.test(x.san); })[0];
    if (mate) return 'That allows <strong>' + esc(mate.san) + '</strong>, checkmate!';
    return '';
  }
  ACT.whyMove = function () {
    var W = WHY; if (!W) return;
    var after = new Game(W.fen); after.move(W.mv);
    Eng.call('line', after.fen(), 2, 5, 500).then(function (line) {
      Replay.run(W.fen, [uciMv(W.mv)].concat(line || []), { me: W.me, firstIsMine: true, title: 'What your move allows', actions: '<button class="mini-btn" data-act="replayBack">Try again</button>' });
    });
  };
  ACT.replayAgain = function () { var L = Replay.last; if (L) Replay.run(L.fen, L.moves, L.opts); };
  function uciMv(u) { return typeof u === 'string' ? uciObj(u) : { from: u.from, to: u.to, promotion: u.promotion || undefined }; }
  // Coach game: show how the mistake is punished, then offer to rewind
  ACT.pShow = function (d) {
    var idx = +d.i, lg = PL && PL.log[idx];
    if (!lg || !lg.fen) return;
    if (PL.thinking) { toast('One moment: the coach is still moving.'); return; }
    var after = new Game(lg.fen); after.move(uciMv(lg.uci));
    toast('Working out the punishment…');
    Eng.call('line', after.fen(), 3, 5, 500).then(function (line) {
      if (!PL || !PL.g) return;
      PL.replaying = true;
      Replay.run(lg.fen, [uciMv(lg.uci)].concat(line || []), { me: PL.color, firstIsMine: true, title: 'Your move ' + lg.san + ', and what follows',
        actions: '<button class="mini-btn" data-act="pRetry" data-i="' + idx + '">↶ Retry this move</button><button class="mini-btn ghost" data-act="replayBack">Back to game</button>' });
    });
  };
  ACT.replayBack = function () {
    Replay.stop();
    if (current === MODES.play && PL && PL.g) { PL.replaying = false; B3.sync(PL.g.fen()); B3.arrows([]); showCheck(PL.g); IX.enabled = !PL.over && PL.g.turn() === PL.color && !PL.thinking; }
    else if (current === MODES.puzzles && IX.game) { B3.sync(IX.game.fen()); B3.arrows([]); IX.enabled = !PZ.cur.done; }
    else if (current === MODES.review && RV) MODES.review.goto(RV.ply);
    else if ((current === MODES.lesson || current === MODES.opening) && IX.game) { B3.sync(IX.game.fen()); B3.arrows([]); B3.markers('last', []); IX.enabled = true; }
  };
  // Puzzles: why does my wrong move fail?
  ACT.pzWhy = function () {
    var w = PZ.cur && PZ.cur.lastWrong; if (!w) return;
    var after = new Game(w.fen); after.move(uciMv(w.uci));
    Eng.call('line', after.fen(), 2, 5, 600).then(function (line) {
      if (current !== MODES.puzzles) return;
      Replay.run(w.fen, [uciMv(w.uci)].concat(line || []), { me: new Game(w.fen).turn(), firstIsMine: true, missedMate: !!PZ.cur.p.mate, title: 'Why ' + w.san + ' does not work',
        actions: '<button class="mini-btn" data-act="replayBack">Try again</button>' });
    });
  };
  // Review: replay the punishment of a mistake
  ACT.rvShow = function (d) {
    var lg = RV && RV.log[+d.n - 1]; if (!lg || !lg.fen) return;
    var after = new Game(lg.fen); after.move(uciMv(lg.uci));
    Eng.call('line', after.fen(), 3, 5, 500).then(function (line) {
      if (current !== MODES.review) return;
      Replay.run(lg.fen, [uciMv(lg.uci)].concat(line || []), { me: RV.color, firstIsMine: true, title: 'Move ' + Math.ceil(+d.n / 2) + ': ' + lg.san,
        actions: '<button class="mini-btn" data-act="replayBest" data-n="' + d.n + '">▶ Show the better move</button><button class="mini-btn ghost" data-act="replayBack">Done</button>' });
    });
  };
  ACT.replayBest = function (d) {
    var lg = RV && RV.log[+d.n - 1]; if (!lg || !lg.best) return;
    var after = new Game(lg.fen); after.move(uciMv(lg.best));
    Eng.call('line', after.fen(), 3, 5, 500).then(function (line) {
      if (current !== MODES.review) return;
      Replay.run(lg.fen, [uciMv(lg.best)].concat(line || []), { me: RV.color, title: 'The better move: ' + lg.bestSan, actions: '<button class="mini-btn ghost" data-act="replayBack">Done</button>' });
    });
  };

  // ================= Practice Arena hub =================
  S.arena = S.arena || {}; S.bosses = S.bosses || {}; S.challenges = S.challenges || {};
  function bossOpen(i) {
    if (!stageUnlocked(i)) return false;
    if (stageCleared(i) || (i > 0 && S.band >= STAGES[i].min)) return true;
    return STAGES[i].lessons.filter(lessonDone).length >= Math.ceil(STAGES[i].lessons.length / 2);
  }
  function bossNeed(i) { return Math.max(0, Math.ceil(STAGES[i].lessons.length / 2) - STAGES[i].lessons.filter(lessonDone).length); }
  function bossFor(i) { return BOSSES.filter(function (b) { return b.stage === i; })[0]; }
  function bossAvatar(b, size) { return '<span class="boss-ava" style="--bc:' + b.color + ';width:' + size + 'px;height:' + size + 'px">' + pieceSVG(b.icon, 'b', Math.round(size * 0.62)) + '</span>'; }
  function stars(n) { return '<span class="st-stars" aria-label="' + n + ' of 3 stars">' + '★'.repeat(n) + '<span class="dim">' + '★'.repeat(3 - n) + '</span></span>'; }
  MODES.arena = {
    label: 'Practice Arena',
    enter: function () {
      setupBoard(Game.START, { drop: true, orient: 'w' });
      setTimeout(function () { if (current === MODES.arena) B3.idle(true); }, 1200);
      MODES.arena.render();
    },
    render: function () {
      var vis = VISION_GAMES.map(function (v) { var best = S.arena[v.id] || 0; return '<button class="ar-tile" data-act="vision" data-id="' + v.id + '"><span class="ar-ico">' + pieceSVG(v.icon, 'w', 24) + '</span><b>' + esc(v.name) + '</b><span class="ar-sub">' + esc(v.blurb) + '</span><span class="ar-best">' + (best ? 'Best ' + best : v.secs + ' sec') + '</span></button>'; }).join('');
      var ch = CHALLENGES.map(function (c) { var st = S.challenges[c.id] || 0; return '<button class="ch-card' + (st ? ' done' : '') + '" data-act="challenge" data-id="' + c.id + '"><span class="ch-top"><b>' + esc(c.title) + '</b>' + stars(st) + '</span><span class="ar-sub">' + esc(c.text) + '</span><span class="ch-goal">' + (c.goal === 'mate' ? 'Mate in ≤ ' + c.limit : c.goal === 'promote' ? 'Promote in ≤ ' + c.limit : 'Survive ' + c.limit + ' moves') + '</span></button>'; }).join('');
      var bosses = BOSSES.map(function (b) { var open = bossOpen(b.stage), beat = S.bosses[b.id], need = bossNeed(b.stage); return '<button class="boss-row' + (beat ? ' beat' : '') + '" data-act="boss" data-id="' + b.id + '" ' + (open ? '' : 'disabled') + '>' + bossAvatar(b, 40) + '<span class="br-txt"><b>' + esc(b.name) + '</b><span>' + esc(STAGES[b.stage].name) + ' · ~' + levelById(b.level).elo + (!open && stageUnlocked(b.stage) && need ? ' · after ' + need + ' more lesson' + (need > 1 ? 's' : '') : '') + '</span></span><span class="br-state">' + (beat ? '✓ Beaten' : open ? 'Fight →' : '🔒') + '</span></button>'; }).join('');
      setPanel('<div class="eyebrow">Practice Arena</div><h1 class="h1">Play it, don\'t read it</h1>' +
        '<p class="lede">Quick board-vision games, endgames to win against perfect defence, opening battles and the five bosses.</p>' +
        '<div class="sect-head"><h2>Quick games</h2><span class="muted small">beat your best</span></div><div class="ar-grid">' + vis + '</div>' +
        (beginnerMode() ? '<div class="placed-note"><span class="pn-ico">★</span><span><b>More unlocks as you learn.</b> Opening battles and the endgame challenges open once you finish Foundations. The quick games and Rookie Rex are ready now.</span></div>' : '<div class="sect-head"><h2>Opening battle</h2>' + (S.battleBest ? '<span class="pill-count">best streak ' + S.battleBest + '</span>' : '') + '</div>' +
        '<button class="battle-cta" data-act="battle"><span class="bc-ico">⚔</span><span><b>The coach slips once. Punish it.</b><span>A real opening from your repertoire. Somewhere in it the coach makes a mistake: find the move that wins.</span></span><span class="to-go">→</span></button>' +
        '<div class="sect-head"><h2>Win this position</h2><span class="muted small">against perfect defence</span></div><div class="ch-list">' + ch + '</div>') +
        '<div class="sect-head"><h2>Boss battles</h2><span class="muted small">beat one to clear its stage</span></div><div class="boss-list">' + bosses + '</div>');
    },
    leave: function () { B3.idle(false); }
  };
  ACT.arena = function () { go('arena'); };
  ACT.vision = function (d) { go('vision', d.id); };
  ACT.challenge = function (d) { var c = CHALLENGES.filter(function (x) { return x.id === d.id; })[0]; if (c) go('play', { spec: { kind: 'challenge', c: c, back: current === MODES.arena || (current === MODES.play && PL && PL.spec) ? 'arena' : 'goPath' } }); };
  ACT.boss = function (d) { var b = BOSSES.filter(function (x) { return x.id === d.id; })[0]; if (!b) return; if (!bossOpen(b.stage) && !S.bosses[b.id]) { toast('Finish ' + bossNeed(b.stage) + ' more lesson' + (bossNeed(b.stage) > 1 ? 's' : '') + ' in ' + STAGES[b.stage].name + ' first.'); return; } go('play', { spec: { kind: 'boss', b: b, back: current === MODES.arena ? 'arena' : 'goPath' } }); };
  ACT.battle = function () {
    var R = S.puzzle.rating, tier = openingTier(R), lines = allLines().filter(function (L) { return TIER[L.level] <= tier + 1 && L.moves.length >= 8 && !(L.family === 'Traps' && !L.def); });
    var L = lines[Math.floor(Math.random() * lines.length)];
    go('play', { spec: { kind: 'battle', line: L } });
  };

  // ================= Quick vision games =================
  var VG = null;
  function randomPosition(minPly, maxPly) {
    for (var tries = 0; tries < 40; tries++) {
      var g = new Game(), n = minPly + Math.floor(Math.random() * (maxPly - minPly));
      for (var i = 0; i < n; i++) { var ms = g._gen(); if (!ms.length) break; var caps = ms.filter(function (m) { return m.captured; }); var pick = caps.length && Math.random() < 0.35 ? caps[Math.floor(Math.random() * caps.length)] : ms[Math.floor(Math.random() * ms.length)]; g._make(pick); }
      var f = g.fen(), h = new Game(f);
      if (!h.gameOver() && !h.inCheck()) return h;
    }
    return new Game();
  }
  function freeTargets(g) {
    var out = {}, us = g.side, them = us ^ 8;
    g._gen().forEach(function (m) {
      if (!m.captured || m.captured === 'k') return;
      g._make(m); var safe = !g.attacked(m.t, them); g._undo();
      if (safe || VAL[m.captured] > VAL[m.piece]) out[Game.sqName(m.t)] = m.captured;
    });
    return out;
  }
  function checkMoves(g) { var out = {}; g.moves().forEach(function (m) { if (/[+#]$/.test(m.san)) out[m.from + m.to] = m.san; }); return out; }
  var GAMES = {
    squares: {
      intro: 'Every square has a name: its letter (a to h, left to right) and its number (1 to 8, from White\'s side). A name appears, you tap that square. A wrong tap costs 2 seconds.',
      setup: function () { setupBoard('8/8/8/8/8/8/8/8 w - - 0 1', { orient: VG.orient }); },
      next: function () { var t; do { t = 'abcdefgh'[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8)); } while (t === VG.target); VG.target = t; MODES.vision.render(); },
      tap: function (sq) { if (sq === VG.target) { VG.score++; B3.flash('good', [sq], 280); Sound.play('move'); GAMES.squares.next(); } else { B3.flash('bad', [sq], 280); Sound.play('bad'); VG.end -= 2000; } },
      prompt: function () { return '<div class="vg-target mono">' + VG.target + '</div><p class="muted small">You see the board from ' + (VG.orient === 'w' ? 'White' : 'Black') + '\'s side.</p>'; }
    },
    hanging: {
      intro: 'Tap every enemy piece you can capture and keep: undefended pieces, or pieces worth more than your attacker. A wrong tap costs 3 seconds.',
      setup: function () { },
      next: function () {
        var g, t, tries = 0;
        do { g = randomPosition(14, 40); t = freeTargets(g); tries++; } while ((Object.keys(t).length < 1 || Object.keys(t).length > 4) && tries < 60);
        VG.g = g; VG.targets = t; VG.found = {};
        setupBoard(g.fen(), { orient: g.turn() }); IX.enabled = false;
        MODES.vision.render();
      },
      tap: function (sq) {
        if (VG.targets[sq] && !VG.found[sq]) {
          VG.found[sq] = true; VG.score++; Sound.play('capture'); B3.markers('good', Object.keys(VG.found));
          if (Object.keys(VG.found).length === Object.keys(VG.targets).length) { B3.burst(sq); setTimeout(function () { if (VG && VG.running) GAMES.hanging.next(); }, 450); } else MODES.vision.render();
        } else if (!VG.found[sq]) { B3.flash('bad', [sq], 300); Sound.play('bad'); VG.end -= 3000; }
      },
      prompt: function () { var n = Object.keys(VG.targets).length, f = Object.keys(VG.found).length; return '<p class="vg-line"><b>' + (VG.g.turn() === 'w' ? 'White' : 'Black') + ' to move.</b> Tap the enemy pieces you can win.</p><div class="vg-pips">' + Array.apply(null, Array(n)).map(function (x, i) { return '<i class="' + (i < f ? 'on' : '') + '"></i>'; }).join('') + '</div><p class="muted small">' + (n - f) + ' left in this position</p>'; }
    },
    checks: {
      intro: 'Play every move that gives check. Each check counts, a move that is not check costs 3 seconds.',
      setup: function () { },
      next: function () {
        var g, c, tries = 0;
        do { g = randomPosition(16, 44); c = checkMoves(g); tries++; } while ((Object.keys(c).length < 2 || Object.keys(c).length > 6) && tries < 80);
        VG.fen = g.fen(); VG.checks = c; VG.found = {};
        var b = setupBoard(VG.fen, { orient: g.turn() });
        IX.enabled = true; IX.canMove = function (col) { return col === b.turn(); };
        IX.onMove = function (mv, uci) {
          var k = mv.from + mv.to;
          if (VG.checks[k] && !VG.found[k]) { VG.found[k] = true; VG.score++; Sound.play('check'); B3.arrows(Object.keys(VG.found).map(function (x) { return [x.slice(0, 2), x.slice(2, 4), 'g']; })); }
          else if (!VG.checks[k]) { Sound.play('bad'); B3.flash('bad', [mv.to], 300); VG.end -= 3000; }
          B3.sync(VG.fen);
          if (Object.keys(VG.found).length === Object.keys(VG.checks).length) { setTimeout(function () { if (VG && VG.running) GAMES.checks.next(); }, 450); }
          else { IX.enabled = true; MODES.vision.render(); }
        };
        MODES.vision.render();
      },
      prompt: function () { var n = Object.keys(VG.checks).length, f = Object.keys(VG.found).length; return '<p class="vg-line"><b>' + (new Game(VG.fen).turn() === 'w' ? 'White' : 'Black') + ' to move.</b> Find every check.</p><div class="vg-pips">' + Array.apply(null, Array(n)).map(function (x, i) { return '<i class="' + (i < f ? 'on' : '') + '"></i>'; }).join('') + '</div><p class="muted small">' + Object.keys(VG.found).map(function (k) { return VG.checks[k]; }).join(' · ') + '</p>'; }
    },
    knight: {
      intro: 'The knight jumps in an L: two squares one way, then one square to the side. Jump it to the star. The fewest possible jumps scores 3, otherwise 1. Dots show where it can land.',
      setup: function () { VG.at = 'b1'; },
      dist: function (a, b) { var seen = {}, q = [[a, 0]]; seen[a] = 1; while (q.length) { var c = q.shift(); if (c[0] === b) return c[1]; Collect.reach('n', c[0]).forEach(function (s) { if (!seen[s]) { seen[s] = 1; q.push([s, c[1] + 1]); } }); } return 9; },
      next: function () {
        var t, d; do { t = 'abcdefgh'[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8)); d = GAMES.knight.dist(VG.at, t); } while (d < 2 || d > 4);
        VG.target = t; VG.min = d; VG.jumps = 0;
        B3.setPosition(fenOf('n', VG.at)); B3.stars([t]); B3.markers('sel', [VG.at]); B3.markers('moves', beginnerMode() ? Collect.reach('n', VG.at).map(function (s) { return { sq: s }; }) : []);
        MODES.vision.render();
      },
      tap: function (sq) {
        if (VG.busy) return;
        if (Collect.reach('n', VG.at).indexOf(sq) < 0) { B3.flash('bad', [sq], 300); Sound.play('bad'); B3.markers('moves', Collect.reach('n', VG.at).map(function (s) { return { sq: s }; })); return; }
        VG.busy = true; VG.jumps++; var from = VG.at; VG.at = sq; B3.markers('moves', []); Sound.play('move');
        B3.animateMove({ from: from, to: sq, flags: 'n', color: 'w' }).then(function () {
          VG.busy = false; B3.markers('sel', [sq]); if (beginnerMode()) B3.markers('moves', Collect.reach('n', sq).map(function (s) { return { sq: s }; }));
          if (sq === VG.target) { B3.takeStar(sq); Sound.play('star'); VG.score += VG.jumps === VG.min ? 3 : 1; VG.lastPerfect = VG.jumps === VG.min; GAMES.knight.next(); }
          else MODES.vision.render();
        });
      },
      prompt: function () { return '<p class="vg-line">Reach the star. Fewest possible: <b>' + VG.min + '</b> jumps.</p><p class="muted small">Jumps so far: ' + VG.jumps + (VG.lastPerfect ? ' · last one was perfect!' : '') + '</p>'; }
    }
  };
  MODES.vision = {
    label: 'Quick game',
    enter: function (id) {
      var meta = VISION_GAMES.filter(function (v) { return v.id === id; })[0];
      VG = { id: id, meta: meta, score: 0, running: false, orient: 'w' };
      GAMES[id].setup(); if (id !== 'squares') setupBoard(Game.START, { orient: 'w' });
      IX.tap = null; MODES.vision.renderIntro();
    },
    renderIntro: function () {
      var best = S.arena[VG.id] || 0;
      setPanel('<button class="back" data-act="arena">← Arena</button><div class="eyebrow">Quick game · ' + VG.meta.secs + ' seconds</div><h1 class="h1">' + esc(VG.meta.name) + '</h1>' +
        '<p class="lede">' + esc(GAMES[VG.id].intro) + '</p>' + (best ? '<p class="muted small">Your best: <b>' + best + '</b></p>' : '') +
        (VG.id === 'squares' ? '<div class="seg">' + [['w', 'From White'], ['b', 'From Black']].map(function (o) { return '<button class="' + (VG.orient === o[0] ? 'on' : '') + '" data-act="vgOrient" data-o="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' : '') +
        '<div class="actions"><button class="btn primary big" data-act="vgStart">▶&nbsp; Start</button></div>');
    },
    start: function () {
      VG.score = 0; VG.running = true; VG.end = Date.now() + VG.meta.secs * 1000;
      document.body.dataset.layout = 'board';
      Voice.say([V('arena_start')], true);
      if (VG.id === 'squares') GAMES.squares.setup();
      IX.tap = GAMES[VG.id].tap || null;
      clearInterval(MODES.vision.timer);
      MODES.vision.timer = setInterval(function () {
        if (!VG || !VG.running || current !== MODES.vision) return;
        var el = $('#vg-time'), left = Math.max(0, VG.end - Date.now());
        if (el) { el.textContent = (left / 1000).toFixed(1); el.classList.toggle('low', left < 10000); }
        if (left <= 0) MODES.vision.finish();
      }, 100);
      GAMES[VG.id].next();
    },
    render: function () {
      if (!VG.running) return;
      setPanel('<div class="vg-head"><div><div class="eyebrow">' + esc(VG.meta.name) + '</div><div class="rating">' + VG.score + '</div></div><div class="vg-clock"><span class="mono" id="vg-time">' + (Math.max(0, VG.end - Date.now()) / 1000).toFixed(1) + '</span><span class="muted small">seconds</span></div></div>' +
        '<div class="coach-card vg-card">' + GAMES[VG.id].prompt() + '</div>' +
        '<div class="actions"><button class="btn ghost" data-act="vgStop">Stop</button></div>');
    },
    finish: function () {
      if (!VG.running) return;
      VG.running = false; clearInterval(MODES.vision.timer); IX.tap = null; IX.enabled = false; B3.arrows([]);
      var missed = '';
      if (VG.id === 'hanging' && VG.targets) { var mt = Object.keys(VG.targets).filter(function (q) { return !VG.found[q]; }); if (mt.length) { B3.markers('hint', mt); missed = 'Still free in the last position: ' + mt.map(function (q) { return 'the ' + PIECE_NAME[VG.targets[q]] + ' on ' + q; }).join(', ') + ' (green).'; } }
      if (VG.id === 'checks' && VG.checks) { var mc = Object.keys(VG.checks).filter(function (q) { return !VG.found[q]; }); if (mc.length) { B3.arrows(mc.map(function (q) { return [q.slice(0, 2), q.slice(2, 4), 'g']; })); missed = 'Checks you did not find in the last position: ' + mc.map(function (q) { return VG.checks[q]; }).join(', ') + ' (green arrows).'; } }
      var prev = S.arena[VG.id] || 0, best = VG.score > prev && VG.score > 0;
      if (best) S.arena[VG.id] = VG.score;
      addXP(Math.min(40, VG.score * 2)); save();
      if (best) { confetti(); Sound.play('win'); } else Sound.play('good');
      Voice.say([best && prev ? V('arena_best') : V('arena_end')]);
      document.body.dataset.layout = 'browse';
      setPanel('<button class="back" data-act="arena">← Arena</button><div class="eyebrow">' + esc(VG.meta.name) + ' · time</div><h1 class="h1">' + (best && prev ? 'New best!' : 'Round over') + '</h1>' +
        '<div class="rush-final"><div class="rating">' + VG.score + '</div><span class="muted">' + (best && prev ? 'previous best ' + prev : 'best ' + Math.max(prev, VG.score)) + '</span></div>' + (missed ? '<p class="muted small">' + esc(missed) + '</p>' : '') +
        '<div class="actions"><button class="btn primary big" data-act="vgAgain">▶&nbsp; Play again</button></div>' +
        '<div class="ar-grid small">' + VISION_GAMES.filter(function (v) { return v.id !== VG.id; }).map(function (v) { return '<button class="ar-tile" data-act="vision" data-id="' + v.id + '"><b>' + esc(v.name) + '</b><span class="ar-best">' + (S.arena[v.id] ? 'Best ' + S.arena[v.id] : v.secs + ' sec') + '</span></button>'; }).join('') + '</div>');
    },
    leave: function () { clearInterval(MODES.vision.timer); if (VG) VG.running = false; IX.tap = null; }
  };
  ACT.vgStart = function () { MODES.vision.start(); };
  ACT.vgAgain = function () { go('vision', VG.id); MODES.vision.start(); };
  ACT.vgStop = function () { MODES.vision.finish(); };
  ACT.vgOrient = function (d) { VG.orient = d.o; GAMES.squares.setup(); MODES.vision.renderIntro(); };

  // ================= Special coach games: bosses, challenges, opening battles =================
  function specIntro(spec) {
    if (spec.kind === 'boss') { var b = spec.b; return { eyebrow: 'Boss battle · ' + STAGES[b.stage].name, title: b.name, text: b.intro, ava: bossAvatar(b, 64), meta: b.title + ' · ~' + levelById(b.level).elo, cta: 'Fight ' + b.name.split(' ')[1] }; }
    if (spec.kind === 'challenge') { var c = spec.c; return { eyebrow: 'Win this position', title: c.title, text: c.text, meta: (c.goal === 'mate' ? 'Mate in ≤ ' + c.limit + ' moves' : c.goal === 'promote' ? 'Promote in ≤ ' + c.limit + ' moves' : 'Survive ' + c.limit + ' moves') + ' · 3 stars in ≤ ' + c.par, cta: 'Start the challenge' }; }
    var L = spec.line; return { eyebrow: 'Opening battle', title: L.def ? L.name : L.name, text: 'You play ' + (L.side === 'w' ? 'White' : 'Black') + '. The coach follows the ' + (L.base ? L.base.name : L.name) + ' and makes one mistake somewhere in the opening. Find the move that punishes it.', meta: (S.battleStreak ? 'Streak ' + S.battleStreak + ' · ' : '') + 'Best streak ' + (S.battleBest || 0), cta: 'Start the battle' };
  }
  MODES.play.renderSpecIntro = function () {
    var spec = PL.arg.spec, I = specIntro(spec);
    setPanel('<button class="back" data-act="' + (spec.back || 'arena') + '">← ' + (spec.back === 'goPath' ? 'Path' : 'Arena') + '</button><div class="spec-hero">' + (I.ava || '<span class="spec-ico">' + (spec.kind === 'battle' ? '⚔' : '★') + '</span>') + '<div><div class="eyebrow">' + esc(I.eyebrow) + '</div><h1 class="h1">' + esc(I.title) + '</h1><div class="muted small">' + esc(I.meta) + '</div></div></div>' +
      '<p class="lede">' + esc(I.text) + '</p>' +
      (spec.kind === 'boss' && S.bosses[spec.b.id] ? '<p class="placed-note"><span class="pn-ico">✓</span><span>You already beat ' + esc(spec.b.name) + '. A rematch is just for fun.</span></p>' : '') +
      '<div class="actions"><button class="btn primary big" data-act="startGame">▶&nbsp; ' + esc(I.cta) + '</button></div>');
    if (spec.kind === 'boss') Voice.say([V('boss_' + spec.b.id)]);
    else if (spec.kind === 'challenge') Voice.say([V('challenge_start')], true);
    else Voice.say([V('battle_start')], true);
  };
  function specBook(ids) { return ids.map(lineById).filter(Boolean); }
  function specProgress() {
    var sp = PL.spec; if (!sp) return '';
    if (sp.kind === 'challenge') return sp.c.goal === 'survive' ? 'Move ' + PL.chN + ' of ' + sp.c.limit : 'Moves used ' + PL.chN + ' / ' + sp.c.limit;
    if (sp.kind === 'battle') return PL.devDone ? 'The coach slipped. Punish it!' : 'Waiting for the slip…';
    return sp.b.title;
  }
  function specFen(sp) { return sp.kind === 'boss' ? (sp.b.fen || Game.START) : sp.kind === 'challenge' ? sp.c.fen : Game.START; }
  function specColor(sp) { return sp.kind === 'boss' ? 'w' : sp.kind === 'challenge' ? (sp.c.side || new Game(sp.c.fen).turn()) : sp.line.side; }
  function endPanel(tag, html, cls) { MODES.play.say(tag, html, cls); MODES.play.render(); }
  // Opening battle: did the player punish the slip?
  MODES.play.battleEnd = function (a, fenBefore, uci, res) {
    PL.judging = false;
    var ok = !!a && a.loss <= 50 && a.bestScore >= 80;
    PL.over = ok ? 'Mistake punished!' : 'The slip got away'; IX.enabled = false;
    S.battleStreak = ok ? (S.battleStreak || 0) + 1 : 0; S.battleBest = Math.max(S.battleBest || 0, S.battleStreak); addXP(ok ? 30 : 10); save();
    if (S.battleStreak >= 5) Badges.award('battle_5');
    PL.battle = { ok: ok, fen: fenBefore, best: a && a.best, bestSan: a && a.bestSan, mine: uci, san: res.san };
    if (ok) { Sound.play('win'); B3.burst(res.to); confetti(); Voice.say([V('battle_caught')]); }
    else { Sound.play('bad'); if (a && a.best) B3.arrows([[a.best.from, a.best.to, 'g']]); Voice.say([V('battle_missed')]); }
    PL.specActions = '<button class="btn primary" data-act="battleShow">▶ Show me the punishment</button><button class="btn" data-act="battle">⚔ Next battle</button><button class="btn ghost" data-act="arena">Arena</button>';
    endPanel(ok ? 'Punished' : 'Missed', ok ? '<strong>' + esc(res.san) + '</strong> ' + (a.playedScore > 90000 ? 'leads to checkmate.' : 'puts you about ' + Math.max(1, Math.round(a.playedScore / 100)) + ' pawn' + (Math.round(a.playedScore / 100) > 1 ? 's' : '') + ' ahead.') + ' Streak <strong>' + S.battleStreak + '</strong>.' : 'You played <strong>' + esc(res.san) + '</strong>. The punishment was <strong>' + esc(a && a.bestSan || '?') + '</strong> (green arrow).', ok ? 'good' : 'bad');
  };
  ACT.battleShow = function () {
    var B = PL && PL.battle; if (!B || !B.best) return;
    var after = new Game(B.fen); after.move(uciMv(B.best));
    Eng.call('line', after.fen(), 3, 5, 500).then(function (line) {
      if (!PL || current !== MODES.play) return;
      Replay.run(B.fen, [uciMv(B.best)].concat(line || []), { me: PL.color, title: 'The punishment: ' + B.bestSan, actions: '<button class="mini-btn" data-act="battle">⚔ Next battle</button>' });
    });
  };
  // Challenges finish here (bosses use the normal game end plus bossEnd)
  MODES.play.specFinish = function (result, msg) {
    var sp = PL.spec; PL.over = msg; IX.enabled = false;
    if (sp.kind === 'battle') { PL.specActions = '<button class="btn primary" data-act="battle">⚔ Next battle</button><button class="btn ghost" data-act="arena">Arena</button>'; return endPanel('Battle over', esc(msg), ''); }
    var c = sp.c, win = c.goal === 'survive' ? result !== 'loss' : result === 'win' && (c.goal !== 'mate' || /Checkmate/.test(msg));
    var st = !win ? 0 : c.goal === 'survive' || PL.chN <= c.par ? 3 : PL.chN <= c.par + Math.ceil((c.limit - c.par) / 2) ? 2 : 1;
    if (win) {
      S.challenges[c.id] = Math.max(S.challenges[c.id] || 0, st); addXP(20 + st * 10); save();
      if (st === 3) Badges.award('challenge_3');
      Sound.play('win'); confetti(); Voice.say([V('challenge_done')]);
    } else { Sound.play('bad'); Voice.say([V('challenge_fail')]); }
    PL.specActions = '<button class="btn primary" data-act="challenge" data-id="' + c.id + '">↻ ' + (win && st < 3 ? 'Go for 3 stars' : win ? 'Play again' : 'Try again') + '</button><button class="btn" data-act="chWatch">▶ Watch the technique</button><button class="btn ghost" data-act="arena">Arena</button>';
    endPanel(win ? 'Challenge complete' : 'Challenge failed', esc(msg) + (win ? ' ' + stars(st) + ' in ' + PL.chN + ' moves (3 stars in ≤ ' + c.par + ').' : c.goal === 'mate' && /Stalemate/.test(msg) ? ' Stalemate counts as a draw. Leave the king a square.' : ''), win ? 'good' : 'bad');
  };
  ACT.chWatch = function () {
    var c = PL && PL.spec && PL.spec.c; if (!c) return;
    toast('Calculating a clean finish…');
    Eng.call('line', c.fen, Math.min(31, c.par * 2 + 1), 6, 350).then(function (line) {
      if (!PL || current !== MODES.play) return;
      Replay.run(c.fen, line || [], { me: PL.color, title: c.title + ': the technique', actions: '<button class="mini-btn" data-act="challenge" data-id="' + c.id + '">↻ Try it yourself</button>' });
    });
  };
  MODES.play.bossEnd = function (result) {
    var b = PL.spec.b;
    if (result === 'win') {
      var first = !S.bosses[b.id];
      S.bosses[b.id] = true; S.cleared = S.cleared || {}; S.cleared[STAGES[b.stage].id] = true; save();
      Badges.award('boss_first'); if (BOSSES.every(function (x) { return S.bosses[x.id]; })) Badges.award('boss_all');
      if (first) Badges.award('stage_' + (b.stage + 1));
      setTimeout(function () { Voice.say([V('boss_beaten')]); }, 1800);
    } else setTimeout(function () { Voice.say([V('boss_lost')]); }, 1500);
    PL.specActions = '<button class="btn primary" data-act="reviewGame">★ Review this game</button><button class="btn" data-act="boss" data-id="' + b.id + '">↻ ' + (result === 'win' ? 'Rematch' : 'Challenge ' + esc(b.name.split(' ')[1]) + ' again') + '</button>' + (result === 'win' && bossFor(b.stage + 1) && stageUnlocked(b.stage + 1) ? '<button class="btn" data-act="boss" data-id="' + bossFor(b.stage + 1).id + '">Next boss: ' + esc(bossFor(b.stage + 1).name) + '</button>' : '') + '<button class="btn ghost" data-act="arena">Arena</button>';
  };
  ACT.bossStage = function (d) { var b = bossFor(+d.i); if (b) ACT.boss({ id: b.id }); };

  // ================= Progress =================
  MODES.progress = {
    label: 'Your progress',
    enter: function () {
      setupBoard(Game.START, { orient: 'w' });
      setTimeout(function () { if (current === MODES.progress) B3.idle(true); }, 600);
      var lessonsDone = Object.keys(S.lessons).filter(function (k) { return S.lessons[k].done; }).length, placedN = 0;
      STAGES.forEach(function (st, i) { if (placedOut(i)) st.lessons.forEach(function (id) { if (!lessonDone(id)) placedN++; }); });
      var opsMastered = OPENINGS.filter(function (o) { return mastery(o.id) >= 3; }).length;
      var solved = Object.keys(S.puzzle.solved).filter(function (k) { return S.puzzle.solved[k] > 1; }).length;
      var games = S.games, wins = games.filter(function (g) { return g.result === 'win'; }).length;
      var accs = games.filter(function (g) { return g.acc != null; }).slice(-10);
      var avgAcc = accs.length ? Math.round(accs.reduce(function (s, g) { return s + g.acc; }, 0) / accs.length) : null;
      var cells = '';
      var start = S.startDate ? new Date(S.startDate + 'T00:00:00') : new Date();
      for (var i = 0; i < 30; i++) {
        var d = new Date(start); d.setDate(d.getDate() + i);
        var rec = S.daily[dayKey(d)], n = rec ? Math.round(missionsDone(rec) / missionsTotal() * 4) : 0;
        var isToday = dayKey(d) === dayKey();
        cells += '<span class="cal-cell l' + n + (isToday ? ' today' : '') + '" title="Day ' + (i + 1) + '"><b>' + (i + 1) + '</b></span>';
      }
      var bestWinLevel = null;
      COACH_LEVELS.forEach(function (l) { if (games.some(function (g) { return g.result === 'win' && g.level === l.id; })) bestWinLevel = l; });
      setPanel('<div class="eyebrow">Day ' + Math.min(dayNumber(), 30) + ' of 30 · Streak ' + S.streak + '</div><h1 class="h1">Your progress</h1>' +
        '<div class="hero-stat"><div><div class="muted small">Training rating</div><div class="rating">' + Math.round(S.puzzle.rating) + '</div><div class="muted small">' + ratingBand(S.puzzle.rating) + ' · started at ' + S.band + '</div></div><canvas id="spark" width="220" height="64" aria-label="Rating history"></canvas></div>' +
        '<div class="stat-grid">' +
        stat('Lessons', (lessonsDone + placedN) + '/' + Object.keys(LESSONS).length + (placedN ? ' <span class="muted small">' + placedN + ' skipped</span>' : '')) + stat('Openings mastered', opsMastered + '/' + OPENINGS.length) +
        stat('Puzzles solved', solved + '/' + PUZZLES.length) + stat('Coach games', games.length + (games.length ? ' · ' + wins + ' won' : '')) +
        stat('Avg accuracy', avgAcc != null ? avgAcc + '%' : '–') + stat('Best win', bestWinLevel ? bestWinLevel.name + ' ~' + bestWinLevel.elo : '–') +
        '</div>' +
        '<div class="sect-head"><h2>30-day plan</h2><span class="muted small">missions per day</span></div><div class="cal">' + cells + '</div>' +
        '<div class="legend"><span><i class="cal-cell l0"></i>0</span><span><i class="cal-cell l2"></i>2</span><span><i class="cal-cell l4"></i>4 missions</span></div>' +
        '<div class="card tip"><strong>How the climb works.</strong> Ratings rise from fewer blunders, not more theory. Keep coach-game accuracy above 80%, beat the next coach level, and keep your puzzle rating rising. When you beat the Expert coach regularly, you are playing well above 1500.</div>' +
        '<div class="sect-head"><h2>Badges</h2><span class="muted small">' + Object.keys(S.badges).length + ' of ' + Object.keys(BADGES).length + '</span></div>' +
        '<div class="badge-grid">' + Object.keys(BADGES).map(function (k) { var b = BADGES[k], got = S.badges[k]; return '<div class="badge-tile ' + (got ? 'got' : '') + '" title="' + esc(b.text) + '"><span class="bt-ico">' + pieceSVG(b.icon, got ? 'w' : 'b', 30) + '</span><span class="bt-name">' + esc(b.name) + '</span></div>'; }).join('') + '</div>' +
        '<div class="sect-head"><h2>Your data</h2></div>' +
        '<p class="muted small">Progress is saved in this browser. Make a backup code to move it to another device or keep it safe.</p>' +
        '<div class="actions"><button class="btn" data-act="backup">Make backup code</button><button class="btn" data-act="restore">Restore from code</button><button class="btn ghost" data-act="askReset">Reset progress</button></div><div id="reset-zone"></div>');
      drawSpark($('#spark'), S.puzzle.hist.map(function (h) { return h[1]; }));
      function stat(k, v) { return '<div class="stat"><span class="muted small">' + k + '</span><b>' + v + '</b></div>'; }
    },
    leave: function () { B3.idle(false); }
  };
  function coachAvatar() {
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="cav" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4f8b"/><stop offset="1" stop-color="#4cc9f0"/></linearGradient></defs>' +
      '<circle cx="20" cy="20" r="20" fill="url(#cav)"/><path d="M8 38c1.5-7 6-10 12-10s10.5 3 12 10" fill="#1b2445"/><path d="M15.5 28.5l4.5 5 4.5-5" fill="#ffd23f"/>' +
      '<circle cx="20" cy="17" r="7.5" fill="#f2c9a5"/><path d="M12.4 16.2c-.3-5 3.2-8.4 7.8-8.4 4.4 0 7.7 2.9 7.5 7.6-1.4-1.9-3.6-3-6.7-3.2-3.3-.2-6.4 1.3-8.6 4z" fill="#2b1d16"/>' +
      '<circle cx="17.3" cy="17.6" r=".9" fill="#2b1d16"/><circle cx="22.7" cy="17.6" r=".9" fill="#2b1d16"/><path d="M17.6 20.6c1.4 1.1 3.4 1.1 4.8 0" stroke="#2b1d16" stroke-width="1" fill="none" stroke-linecap="round"/></svg>';
  }
  function openSettings() {
    var s = S.settings, m = $('#modal');
    m.classList.remove('intro');
    m.innerHTML = '<div class="modal-card settings" role="dialog" aria-modal="true" aria-labelledby="set-title"><div class="set-head"><span class="cb-avatar big">' + coachAvatar() + '</span><div><div class="eyebrow">Settings</div><h1 class="h1" id="set-title">Your coach</h1></div></div>' +
      '<label class="field"><span>Coach name</span><input id="set-name" type="text" maxlength="24" value="' + esc(s.coachName) + '"></label>' +
      '<div class="field"><span>Your level <span class="dim">· sets where the course starts</span></span><div class="seg wrap">' + BANDS.map(function (b) { return '<button class="' + (S.band === b.v ? 'on' : '') + '" data-band="' + b.v + '" title="' + esc(b.t) + '">' + b.v + '</button>'; }).join('') + '</div></div>' +
      '<label class="field"><span>Voice volume <b id="vol-v">' + Math.round(s.volume * 100) + '%</b></span><input id="set-vol" type="range" min="0" max="1" step="0.05" value="' + s.volume + '"></label>' +
      '<div class="field"><span>Voice speed</span><div class="seg">' + [[0.9, 'Calm'], [1, 'Normal'], [1.15, 'Quick']].map(function (r) { return '<button class="' + (s.rate === r[0] ? 'on' : '') + '" data-rate="' + r[0] + '">' + r[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><span>Coach style in games</span><div class="seg">' + COACH_STYLES.map(function (cs) { return '<button class="' + (coachStyle() === cs.id ? 'on' : '') + '" data-style="' + cs.id + '">' + cs.name + '</button>'; }).join('') + '</div></div>' +
      '<label class="toggle"><input type="checkbox" id="set-snd" ' + (S.sound ? 'checked' : '') + '> <span>Sound effects</span></label>' +
      '<label class="toggle"><input type="checkbox" id="set-sub" ' + (s.subtitles ? 'checked' : '') + '> <span>Show what the coach says on the board</span></label>' +
      '<label class="toggle"><input type="checkbox" id="set-2d" ' + (s.board2d ? 'checked' : '') + '> <span>Use a flat 2D board (lighter, faster on old phones)</span></label>' +
      '<label class="toggle"><input type="checkbox" id="set-cam" ' + (s.cameraFixed ? 'checked' : '') + '> <span>Keep the 3D camera fixed (no rotating)</span></label>' +
      '<label class="toggle"><input type="checkbox" id="set-eval" ' + (showEvalBar() ? 'checked' : '') + '> <span>Show the "who\'s winning" bar in games</span></label>' +
      '<div class="actions"><button class="btn ghost" data-set="test">▶ Test voice</button><button class="btn primary" data-set="close">Done</button></div></div>';
    m.hidden = false;
    $('#set-name').oninput = function (e) { s.coachName = e.target.value.trim() || 'Coach Leo'; save(); };
    $('#set-vol').oninput = function (e) { s.volume = +e.target.value; $('#vol-v').textContent = Math.round(s.volume * 100) + '%'; save(); };
    $('#set-sub').onchange = function (e) { s.subtitles = e.target.checked; save(); };
    $('#set-snd').onchange = function (e) { S.sound = e.target.checked; save(); renderTop(); if (S.sound) Sound.play('move'); };
    $('#set-2d').onchange = function (e) { s.board2d = e.target.checked; save(); try { location.reload(); } catch (x) { } };
    $('#set-cam').onchange = function (e) { s.cameraFixed = e.target.checked; save(); B3.setCameraFixed(s.cameraFixed); };
    $('#set-eval').onchange = function (e) { S.coach.evalbar = e.target.checked; save(); if (current === MODES.play && PL && PL.g) $('#evalbar').hidden = !e.target.checked; };
    m.onclick = function (e) {
      var b = e.target.closest('[data-rate],[data-style],[data-set],[data-band]'); if (!b) { if (e.target === m) { m.hidden = true; } return; }
      if (b.dataset.band) {
        var v = +b.dataset.band; S.band = v; S.coach.level = levelForRating(Math.max(S.puzzle.rating, v)); PATHUI.open = null;
        if (S.puzzle.hist.length <= 1) { S.puzzle.rating = v; S.puzzle.hist = [[dayKey(), S.puzzle.rating]]; }
        save(); renderTop(); openSettings(); if (current === MODES.path) MODES.path.enter(true); else if (current === MODES.progress) MODES.progress.enter();
        toast('Level set to ' + v + '. Your course starts at ' + STAGES[placementStage()].name + '.');
      }
      else if (b.dataset.rate) { s.rate = +b.dataset.rate; save(); openSettings(); Voice.say([V('good', 'good')]); }
      else if (b.dataset.style) { S.coach.style = b.dataset.style; save(); openSettings(); }
      else if (b.dataset.set === 'test') Voice.say([V('welcome_back')]);
      else { m.hidden = true; m.onclick = null; }
    };
  }
  ACT.settings = function () { openSettings(); };
  function encodeState() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  ACT.backup = function () {
    var code = 'CA1:' + encodeState();
    $('#reset-zone').innerHTML = '<div class="card"><p>Your backup code. Copy it somewhere safe (notes, email to yourself).</p><textarea id="bk-code" class="code-box" readonly>' + esc(code) + '</textarea><div class="actions"><button class="btn primary" data-act="copyBackup">Copy code</button></div></div>';
  };
  ACT.copyBackup = function () {
    var ta = $('#bk-code');
    try { navigator.clipboard.writeText(ta.value).then(function () { toast('Backup code copied.'); }, function () { ta.select(); toast('Select the code and copy it.'); }); }
    catch (e) { ta.select(); toast('Select the code and copy it.'); }
  };
  ACT.restore = function () {
    $('#reset-zone').innerHTML = '<div class="card"><p>Paste a backup code. This replaces the progress on this device.</p><textarea id="rs-code" class="code-box" placeholder="CA1:…"></textarea><div class="actions"><button class="btn primary" data-act="doRestore">Restore</button><button class="btn ghost" data-act="cancelReset">Cancel</button></div></div>';
  };
  ACT.doRestore = function () {
    var raw = ($('#rs-code').value || '').trim();
    try {
      if (raw.indexOf('CA1:') !== 0) throw new Error('code');
      var data = JSON.parse(decodeURIComponent(escape(atob(raw.slice(4)))));
      if (!data || typeof data !== 'object' || !data.puzzle) throw new Error('code');
      S = Object.assign(freshState(), data); save(); renderTop(); toast('Progress restored.'); go('progress');
    } catch (e) { toast('That code is not valid. Check that you copied all of it.', 'bad'); }
  };
  ACT.askReset = function () { $('#reset-zone').innerHTML = '<div class="card danger"><p>Erase all lessons, ratings and history on this device?</p><div class="actions"><button class="btn" data-act="cancelReset">Keep</button><button class="btn danger" data-act="doReset">Erase</button></div></div>'; };
  ACT.cancelReset = function () { $('#reset-zone').innerHTML = ''; };
  ACT.doReset = function () { S = freshState(); save(); renderTop(); onboard(); };

  // ================= Top bar and onboarding =================
  var lastMissions = null;
  function renderTop() {
    var d = today();
    var nm = missionsDone(d);
    if (lastMissions !== null && nm > lastMissions) setTimeout(function () { Voice.say([V(nm >= missionsTotal() ? 'all_missions' : 'mission_done')], true); }, 2600);
    lastMissions = nm;
    $('#top-day').textContent = 'Day ' + Math.min(dayNumber(), 30);
    $('#top-missions').textContent = missionsDone(d) + '/' + missionsTotal();
    $('#top-missions-bar').style.width = (missionsDone(d) / missionsTotal() * 100) + '%';
    var lv = Levels.of(S.xp);
    $('#top-level').textContent = lv.name; $('#top-level-bar').style.width = Math.round(lv.progress * 100) + '%';
    countTo($('#top-rating'), Math.round(S.puzzle.rating));
    $('#top-xp').textContent = S.xp;
    countTo($('#top-streak'), S.streak);
    $('#sound-btn').setAttribute('aria-pressed', S.sound ? 'true' : 'false');
    $('#sound-btn').classList.toggle('off', !S.sound);
    $('#voice-btn').setAttribute('aria-pressed', S.voice ? 'true' : 'false');
    $('#voice-btn').classList.toggle('off', !S.voice);
  }
  // Numbers in the top bar roll to their new value and glow briefly.
  function countTo(el, v) {
    var from = el._v == null ? v : el._v; el._v = v;
    if (from === v || REDUCED) { el.textContent = v; return; }
    var t0 = performance.now(), d = 750; el.classList.add('bump');
    (function f(t) {
      var k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (v - from) * e);
      if (k < 1) requestAnimationFrame(f); else setTimeout(function () { el.classList.remove('bump'); }, 250);
    })(t0);
  }
  function floatDelta(d) {
    var host = $('#top-rating'); if (!d || !host) return;
    var r = host.getBoundingClientRect(), f = document.createElement('div');
    f.className = 'delta-float ' + (d > 0 ? 'up' : 'down'); f.textContent = (d > 0 ? '+' : '') + d;
    f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.bottom + 6) + 'px';
    document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1500);
  }
  function confetti() {
    if (REDUCED) return;
    var c = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    c.className = 'confetti'; c.width = W * dpr; c.height = H * dpr; document.body.appendChild(c);
    var x = c.getContext('2d'); if (!x) { c.remove(); return; } x.scale(dpr, dpr);
    var cols = ['#ffd23f', '#ff4f8b', '#4cc9f0', '#3ddc97', '#f5f2ff'], P = [];
    for (var i = 0; i < 150; i++) P.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.4, vx: (Math.random() - 0.5) * 15, vy: -7 - Math.random() * 11, r: 5 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function f(t) {
      var k = (t - t0) / 2400; x.clearRect(0, 0, W, H);
      P.forEach(function (p) { p.vy += 0.36; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.globalAlpha = Math.max(0, 1 - k * k); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
      if (k < 1) requestAnimationFrame(f); else c.remove();
    })(t0);
  }
  var BANDS = [
    { v: 100, t: 'Brand new', s: 'I am learning how the pieces move.' },
    { v: 400, t: 'I know the rules', s: 'I play casually, around 200–500.' },
    { v: 800, t: 'Club beginner', s: 'About 600–1000 online.' },
    { v: 1200, t: 'Improving player', s: 'About 1000–1400 online.' },
    { v: 1600, t: 'Experienced', s: 'About 1400–1800 online.' }
  ];
  function onboard() {
    var m = $('#modal');
    m.classList.add('intro');
    m.innerHTML = '<div class="intro-card" role="dialog" aria-modal="true" aria-labelledby="ob-title">' +
      '<div class="coach-orb" aria-hidden="true"><span>' + pieceSVG('n', 'w', 50) + '</span></div>' +
      '<h1 class="intro-title" id="ob-title">Chess <em>Ascent</em></h1>' +
      '<p class="intro-tag">Your personal coach, from your very first move to 2000.</p>' +
      '<ul class="intro-points"><li>Bite-size lessons</li><li>Real openings &amp; gambits</li><li>A coach who reacts to every move</li></ul>' +
      '<button class="btn primary big" data-ob="meet">Meet your coach</button>' +
      '<p class="muted small">Sound on for the full experience.</p></div>';
    m.hidden = false;
    m.onclick = function (e) {
      var b = e.target.closest('[data-ob],[data-band]'); if (!b) return;
      if (b.dataset.ob === 'meet') {
        Sound.unlock(); Voice.say([C('welcome')]);
        m.querySelector('.intro-card').innerHTML =
          '<div class="coach-orb small" aria-hidden="true"><span>' + pieceSVG('n', 'w', 32) + '</span></div>' +
          '<div class="eyebrow">One quick question</div><h1 class="h1">Where are you starting?</h1>' +
          '<p class="lede">Pick the closest match. You can always revisit earlier lessons.</p>' +
          '<div class="bands">' + BANDS.map(function (bd) { return '<button class="band-btn" data-band="' + bd.v + '"><span class="bb-v">' + bd.v + '</span><span><span class="bb-t">' + bd.t + '</span><span class="bb-s">' + bd.s + '</span></span><span class="bb-go" aria-hidden="true">→</span></button>'; }).join('') + '</div>';
        return;
      }
      var v = +b.dataset.band;
      S.onboarded = true; S.band = v; S.startDate = S.startDate || dayKey(); S.puzzle.rating = v;
      S.coach.level = levelForRating(v); PATHUI.open = null;
      S.puzzle.hist = [[dayKey(), S.puzzle.rating]]; touchActivity();
      save(); m.hidden = true; m.onclick = null; m.classList.remove('intro');
      renderTop(); go('path');
      setTimeout(Tour.start, 700);
    };
  }

  // ================= Levels, badges, celebrations =================
  var Levels = (function () {
    var L = [{ name: 'Pawn', xp: 0, icon: 'p' }, { name: 'Knight', xp: 300, icon: 'n' }, { name: 'Bishop', xp: 800, icon: 'b' }, { name: 'Rook', xp: 1600, icon: 'r' }, { name: 'Queen', xp: 3000, icon: 'q' }, { name: 'King', xp: 5000, icon: 'k' }, { name: 'Grandmaster', xp: 8000, icon: 'k' }];
    return {
      list: L,
      of: function (xp) {
        var i = 0; while (i < L.length - 1 && xp >= L[i + 1].xp) i++;
        var next = L[i + 1] || null;
        return { i: i, name: L[i].name, icon: L[i].icon, next: next, progress: next ? (xp - L[i].xp) / (next.xp - L[i].xp) : 1 };
      }
    };
  })();
  var BADGES = {
    first_lesson: { name: 'First Step', text: 'Finished your first lesson.', icon: 'p' },
    stage_1: { name: 'Foundations Laid', text: 'Completed the Foundations stage. Openings and coach games are unlocked!', icon: 'r' },
    stage_2: { name: 'Piece Keeper', text: 'Completed Stop Losing Pieces.', icon: 'n' },
    stage_3: { name: 'Tactician', text: 'Completed Tactical Weapons.', icon: 'b' },
    stage_4: { name: 'Endgame Expert', text: 'Completed Endgames & Structure.', icon: 'q' },
    stage_5: { name: 'Master Mind', text: 'Completed the whole course.', icon: 'k' },
    brilliant: { name: 'Brilliancy', text: 'Played your first brilliant move.', icon: 'q' },
    comeback: { name: 'Never Give Up', text: 'Won a game you were losing.', icon: 'k' },
    beat_novice: { name: 'First Win', text: 'Beat the Novice coach.', icon: 'p' },
    beat_club: { name: 'Club Player', text: 'Beat the Club coach (~1000).', icon: 'n' },
    beat_strong: { name: 'Strong Player', text: 'Beat the Strong coach (~1400).', icon: 'b' },
    beat_expert: { name: 'Expert Slayer', text: 'Beat the Expert coach (~1800).', icon: 'r' },
    beat_master: { name: 'Master Slayer', text: 'Beat the Master coach (~2100).', icon: 'k' },
    streak_3: { name: 'On a Roll', text: '3-day training streak.', icon: 'p' },
    streak_7: { name: 'Week Warrior', text: '7-day training streak.', icon: 'n' },
    streak_14: { name: 'Unstoppable', text: '14-day training streak.', icon: 'r' },
    streak_30: { name: 'The Full Climb', text: '30-day training streak.', icon: 'k' },
    puzzles_10: { name: 'Puzzle Solver', text: 'Solved 10 puzzles.', icon: 'n' },
    puzzles_25: { name: 'Puzzle Hunter', text: 'Solved 25 puzzles.', icon: 'b' },
    perfect_drill: { name: 'Book Worm', text: 'A perfect opening drill.', icon: 'b' },
    opening_master: { name: 'Repertoire', text: 'Mastered your first opening.', icon: 'q' },
    rush_10: { name: 'Lightning', text: 'Scored 10 in Puzzle Rush.', icon: 'q' },
    boss_first: { name: 'Boss Slayer', text: 'Beat your first boss.', icon: 'k' },
    boss_all: { name: 'Champion', text: 'Beat all five bosses.', icon: 'k' },
    challenge_3: { name: 'Technician', text: 'Three stars in a Win this position challenge.', icon: 'r' },
    battle_5: { name: 'Punisher', text: 'Won five opening battles in a row.', icon: 'b' }
  };
  var Badges = {
    award: function (id) {
      if (!BADGES[id] || S.badges[id]) return;
      S.badges[id] = dayKey(); save(); addXP(40);
      var b = BADGES[id];
      Celebrate.show({ kind: 'badge', title: b.name, text: b.text, icon: b.icon, voice: /^stage_/.test(id) ? V('stage_done') : V('badge') });
      if (id === 'stage_1' && S.band < 400) setTimeout(function () { Voice.say([V('unlock')], true); }, 4200);
    }
  };
  var Celebrate = (function () {
    var queue = [], open = false;
    function next() {
      if (open || !queue.length) return;
      var c = queue.shift(); open = true;
      var m = document.createElement('div'); m.className = 'celebrate';
      m.innerHTML = '<div class="cel-card" role="dialog" aria-modal="true" aria-label="' + esc(c.title) + '"><div class="cel-ray" aria-hidden="true"></div>' +
        '<div class="medal ' + c.kind + '">' + pieceSVG(c.icon || 'k', 'w', 64) + '</div>' +
        '<div class="eyebrow">' + (c.kind === 'level' ? 'Level up' : 'Badge unlocked') + '</div><h2 class="cel-title">' + esc(c.title) + '</h2><p>' + esc(c.text) + '</p>' +
        '<button class="btn primary big" data-cel="ok">Awesome!</button></div>';
      document.body.appendChild(m);
      Sound.play('win'); confetti(); if (c.voice) Voice.say([c.voice]);
      m.addEventListener('click', function (e) { if (e.target.closest('[data-cel]')) { m.remove(); open = false; setTimeout(next, 250); } });
    }
    return { show: function (c) { queue.push(c); setTimeout(next, 500); }, pending: function () { return open || queue.length > 0; } };
  })();

  // ================= Welcome tour =================
  var Tour = (function () {
    var i = 0, el = null, steps = [];
    function close() { if (el) { el.remove(); el = null; } closeTools(); document.body.classList.remove('tour-tools'); window.removeEventListener('resize', place); Voice.stop(); S.toured = true; save(); }
    function place() {
      if (!el) return;
      var step = TOUR[steps[i]], spot = el.querySelector('.tour-spot'), card = el.querySelector('.tour-card');
      var target = step.sel ? document.querySelector(step.sel) : null;
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'nearest' });
      var r = target ? target.getBoundingClientRect() : null;
      if (r && r.width && r.height) {
        var pad = 6;
        spot.hidden = false;
        spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px';
        spot.style.width = (r.width + pad * 2) + 'px'; spot.style.height = (r.height + pad * 2) + 'px';
        var cw = Math.min(360, window.innerWidth - 32), ch = card.offsetHeight || 190;
        var left = Math.max(16, Math.min(window.innerWidth - cw - 16, r.left + r.width / 2 - cw / 2));
        var below = r.bottom + 14, above = r.top - ch - 14;
        var right = r.right + 14;
        var top;
        if (r.width < 120 && right + cw < window.innerWidth - 8) { left = right; top = Math.max(16, Math.min(window.innerHeight - ch - 16, r.top + r.height / 2 - ch / 2)); }
        else if (below + ch < window.innerHeight - 8) top = below;
        else if (above > 8) top = above;
        else top = Math.max(16, (window.innerHeight - ch) / 2);
        card.style.left = left + 'px'; card.style.top = top + 'px'; card.style.width = cw + 'px'; card.style.transform = 'none';
        el.classList.remove('center');
      } else {
        spot.hidden = true;
        card.style.left = '50%'; card.style.top = '50%'; card.style.width = Math.min(400, window.innerWidth - 32) + 'px'; card.style.transform = 'translate(-50%,-50%)';
        el.classList.add('center');
      }
    }
    function render() {
      var step = TOUR[steps[i]];
      // On phones the board tools sit behind the "..." button: open that menu for its tour step.
      var tb = document.querySelector('.board-tools'), tbtn = $('#tools-btn');
      var compact = (MQ && MQ.matches) || (window.matchMedia && matchMedia('(max-height: 520px) and (orientation: landscape)').matches);
      document.body.classList.toggle('tour-tools', step.sel === '.board-tools' && compact);
      if (step.sel === '.board-tools' && compact) { tb.classList.add('open'); tbtn.setAttribute('aria-expanded', 'true'); } else closeTools();
      el.querySelector('.tour-spot').classList.remove('pop'); void el.offsetWidth; el.querySelector('.tour-spot').classList.add('pop');
      el.querySelector('.tour-card').innerHTML =
        '<div class="eyebrow">' + (i + 1) + ' / ' + steps.length + '</div><h2 class="tour-title">' + esc(step.title) + '</h2><p>' + esc(step.text) + '</p>' +
        '<div class="actions">' + (i > 0 ? '<button class="btn ghost" data-tour="back">Back</button>' : '<button class="btn ghost" data-tour="skip">Skip tour</button>') +
        '<button class="btn primary" data-tour="next">' + (i === steps.length - 1 ? 'Start training' : 'Next') + '</button></div>';
      place(); requestAnimationFrame(place); setTimeout(place, 420);
      Voice.say([{ id: 'T-' + steps[i], text: step.text }]);
    }
    function start() {
      if (el) close();
      if (current !== MODES.path) go('path');
      i = 0;
      // brand-new players get the short version: welcome, board, path, puzzles, ready
      steps = beginnerMode() ? [0, 1, 4, 5, TOUR.length - 1] : TOUR.map(function (t, k) { return k; });
      el = document.createElement('div'); el.className = 'tour';
      el.innerHTML = '<div class="tour-spot"></div><div class="tour-card" role="dialog" aria-modal="true" aria-label="App tour"></div>';
      document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tour]'); if (!b) return;
        var a = b.dataset.tour;
        if (a === 'skip') close();
        else if (a === 'back') { i = Math.max(0, i - 1); render(); }
        else if (i >= steps.length - 1) { close(); }
        else { i++; render(); }
      });
      window.addEventListener('resize', place);
      render();
    }
    function key(k) {
      if (!el) return false;
      if (k === 'Escape') close();
      else if (k === 'ArrowRight' || k === 'Enter') { var n = el.querySelector('[data-tour="next"]'); if (n) n.click(); }
      else if (k === 'ArrowLeft') { var b = el.querySelector('[data-tour="back"]'); if (b) b.click(); }
      else return false;
      return true;
    }
    return { start: start, key: key };
  })();
  ACT.tour = function () { Tour.start(); };

  function webglOK() { try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } }

  // ================= Boot =================
  function boot() {
    panel = $('#panel');
    $('.brand-mark').innerHTML = pieceSVG('n', 'b', 24);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]');
      if (!a || a.disabled) return;
      var fn = ACT[a.dataset.act];
      if (fn) { e.preventDefault(); fn(a.dataset); }
    });
    document.querySelectorAll('.rail button').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.go); }); });
    $('#voice-btn').onclick = function () { S.voice = !S.voice; save(); renderTop(); if (!S.voice) Voice.stop(); else Voice.say([C('yourmove')]); };
    $('#replay-btn').onclick = function () { Voice.replay(); };
    $('#sound-btn').onclick = function () { S.sound = !S.sound; save(); renderTop(); if (S.sound) Sound.play('move'); };
    $('#view-btn').onclick = function () { var v = B3.toggleView(); $('#view-btn').textContent = v === '3d' ? 'Top view' : '3D view'; };
    $('#flip-btn').onclick = function () { B3.setOrientation(B3.orientation() === 'w' ? 'b' : 'w'); };
    $('#center-btn').onclick = function () { B3.recenter(); };
    $('#settings-btn').onclick = openSettings;
    $('#tools-btn').onclick = function (e) { e.stopPropagation(); var t = $('.board-tools'), open = !t.classList.contains('open'); t.classList.toggle('open', open); this.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    document.querySelectorAll('.board-tools button').forEach(function (b) { b.addEventListener('click', function () { setTimeout(closeTools, 150); }); });
    document.addEventListener('pointerdown', function (e) { if (!e.target.closest('.board-tools,#tools-btn')) closeTools(); });
    $('#coach-bubble').addEventListener('click', function () { Voice.replay(); });
    applyMob();
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target.closest && e.target.closest('input,textarea,select'))) return;
      var k = e.key;
      if (Tour.key(k)) { e.preventDefault(); return; }
      var cel = document.querySelector('.celebrate [data-cel]');
      if (cel) { if (k === 'Escape' || k === 'Enter') { e.preventDefault(); cel.click(); } return; }
      var m = $('#modal');
      if (!m.hidden) { if (k === 'Escape' && !m.classList.contains('intro')) { m.hidden = true; m.onclick = null; } return; }
      if (k === 'Escape') { closeTools(); deselect(); return; }
      if (k === 'f' || k === 'F') { $('#flip-btn').click(); return; }
      if (current === MODES.opening && OD && OD.mode === 'learn') {
        if (k === 'ArrowRight' && OD.ply < OD.o.moves.length) { e.preventDefault(); ACT.opNext(); }
        else if (k === 'ArrowLeft' && OD.ply > 0) { e.preventDefault(); ACT.opPrev(); }
      } else if (current === MODES.review && RV) {
        if (k === 'ArrowRight') { e.preventDefault(); MODES.review.goto(RV.ply + 1); }
        else if (k === 'ArrowLeft') { e.preventDefault(); MODES.review.goto(RV.ply - 1); }
        else if (k === 'Home') { e.preventDefault(); MODES.review.goto(0); }
        else if (k === 'End') { e.preventDefault(); MODES.review.goto(RV.moves.length); }
      }
    });
    if (MQ) { if (MQ.addEventListener) MQ.addEventListener('change', applyMob); else if (MQ.addListener) MQ.addListener(applyMob); }
    $('#coach-bubble .cb-avatar').innerHTML = coachAvatar();
    var use2d = !!S.settings.board2d || typeof THREE === 'undefined' || !THREE.OrbitControls || !webglOK();
    if (!use2d) {
      try { B3.init($('#three'), onBoardClick, onBoardHover); }
      catch (e) { console.error(e); use2d = true; }
    }
    if (use2d) {
      var B2 = BOARD2D_FACTORY();
      Object.keys(B3).forEach(function (k) { delete B3[k]; });
      Object.assign(B3, B2);
      $('#three').innerHTML = '';
      B3.init($('#three'), onBoardClick, onBoardHover);
      document.body.classList.add('board-2d');
    }
    B3.setDrag({ can: dragCan, start: dragStart, drop: dragDrop, fen: function () { if (IX.collect) return fenOf(IX.collect.piece, IX.collect.at); return IX.game ? IX.game.fen() : null; } });
    B3.setCameraFixed(S.settings.cameraFixed);
    renderTop();
    document.addEventListener('pointerdown', function greet() {
      document.removeEventListener('pointerdown', greet);
      if (S.onboarded && S.lastGreet !== dayKey() && S.toured) { S.lastGreet = dayKey(); save(); Voice.say([V('welcome_back')], true); }
    });
    if (!S.onboarded) { setupBoard(Game.START, { drop: true }); B3.idle(true); onboard(); }
    else { go('path'); if (!S.toured) setTimeout(Tour.start, 1500); }
    var sp = $('#splash');
    if (sp) requestAnimationFrame(function () { setTimeout(function () { sp.classList.add('out'); setTimeout(function () { sp.remove(); }, 700); }, 300); });
  }
  window.ChessAscent = { state: function () { return S; }, go: go, ACT: ACT, IX: IX, Game: Game, click: onBoardClick, drop: dragDrop, dbg: function () { return { LS: LS, PZ: PZ, PL: PL, OD: OD, ST: ST, VG: VG, RV: RV, E: LOCAL_ENGINE }; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
