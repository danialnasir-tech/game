(function () {
  'use strict';
  var Game = CHESS_LIB();
  var LOCAL_ENGINE = ENGINE_FACTORY(Game);
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ================= Storage =================
  var STORE_KEY = 'chess-ascent-v1';
  function freshState() {
    return { onboarded: false, band: 100, startDate: null, xp: 0, streak: 0, lastActive: null, lessons: {}, openings: {}, puzzle: { rating: 400, solved: {}, hist: [] }, games: [], daily: {}, sound: true, voice: true, coach: { explain: true, threats: true, level: 'club', color: 'w', style: null, evalbar: null }, settings: { coachName: 'Coach Leo', volume: 1, rate: 1, subtitles: true, cameraFixed: false }, badges: {}, peek: {}, arena: {}, bosses: {}, challenges: {}, cleared: {}, missions: {} };
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
  // Erase everything Chess Ascent keeps in this browser (progress, account, settings).
  function wipeAll() { try { Object.keys(localStorage).forEach(function (k) { if (/^chess-ascent/.test(k)) localStorage.removeItem(k); }); } catch (e) { } }
  // Test link: opening the site with ?fresh (or #fresh) always starts like a brand-new player.
  try { if (/[?&#]fresh\b/.test(location.search + location.hash)) wipeAll(); } catch (e) { }
  var S = loadState();
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { } if (typeof Cloud !== 'undefined' && Cloud) Cloud.push(); }

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
    ].concat(!isLocked('play') ? [{ k: 'game', label: 'Coach game', sub: 'Any length', done: !!d.game, act: 'goPlay' }] : []);
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
    // First launch: download the start packs (lines the first session needs) with byte-level progress.
    var START_CLIP = /^(T-|C-)|^V-(correct|notquite|keepgoing|lesson_next|allstars|lessondone|welcome_back|mission_done|badge|level_up)-|^(L|K)-l-(board|rook|bishop-queen|knight)\b|^M-sq_|^V-quiz_|^H-/; // keep in sync with pack-voice.js
    function preloadStart(onProgress) {
      var size = {}, list = [];
      Object.keys(VOICE_FILES).forEach(function (id) { var e = VOICE_FILES[id]; size[e[0]] = Math.max(size[e[0]] || 0, e[1] + e[2]); if (START_CLIP.test(id) && list.indexOf(e[0]) < 0) list.push(e[0]); });
      var total = list.reduce(function (t, i) { return t + size[i]; }, 0), got = {};
      var report = function () { var g = 0; list.forEach(function (i) { g += got[i] || 0; }); onProgress(total ? g / total : 1, g, total); };
      return Promise.all(list.map(function (i) {
        if (packCache[i]) { got[i] = size[i]; report(); return packCache[i]; }
        packCache[i] = fetch('voice-pack-' + (i + 1) + '.mp3').then(function (r) {
          if (!r.ok) throw new Error('pack');
          if (!r.body || !r.body.getReader) return r.arrayBuffer().then(function (b) { got[i] = size[i]; report(); return b; });
          var rd = r.body.getReader(), chunks = [], n = 0;
          return (function pump() { return rd.read().then(function (c) {
            if (c.done) { var out = new Uint8Array(n), o = 0; chunks.forEach(function (ch) { out.set(ch, o); o += ch.length; }); got[i] = size[i]; report(); return out.buffer; }
            chunks.push(c.value); n += c.value.length; got[i] = Math.min(n, size[i]); report(); return pump(); }); })();
        }).catch(function () { delete packCache[i]; got[i] = size[i]; report(); return null; });
        return packCache[i];
      })).then(function () { return total; });
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
    return { say: say, stop: stop, prefetch: prefetch, preloadStart: preloadStart, replay: function () { if (last) say(last); }, hasClips: function () { return Object.keys(VOICE_FILES).length > 0; } };
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
    var winning = a.bestScore >= 150;
    if (b.captured && winning && { n: 1, b: 1, r: 1, q: 1 }[b.captured]) return ['why_wins', 'It wins the ' + PIECE_NAME[b.captured] + ' on ' + b.to + '.'];
    if (b.captured && winning && a.loss > 60) return ['why_wins', 'It wins the ' + PIECE_NAME[b.captured] + ' on ' + b.to + '.'];
    if (b.captured) return ['why_general', 'It captures on ' + b.to + ' and keeps the balance.'];
    if (a.reply && a.reply.captured && a.loss > 120) return ['why_safe', 'It does not give away your ' + PIECE_NAME[a.reply.captured] + '.'];
    if (/^O-O/.test(bestSan || '')) return ['why_castle', 'Castling gets your king to safety.'];
    if (/\+$/.test(bestSan || '')) return ['why_check', 'It is a check, so they must answer it and cannot stop your plan.'];
    if (ply <= 16 && (b.piece === 'n' || b.piece === 'b') && /[18]$/.test(b.from)) return ['why_develop', 'It develops a new piece.'];
    if (ply <= 16 && b.piece === 'p' && /^[cdef][3-5]$/.test(b.to)) return ['why_center', 'It fights for the centre.'];
    if (b.captured) return ['why_wins', 'It wins material.'];
    return ['why_general', 'It keeps your position stronger.'];
  }
  // one plain reason why a (good) move is good
  function moveReason(res, ply, a, fenBefore, uci) {
    if (/#$/.test(res.san)) return 'Checkmate!';
    if (res.flags === 'k' || res.flags === 'q') return 'Your king is safe in the corner and a rook joins the game.';
    if (res.captured) return 'It wins the ' + PIECE_NAME[res.captured] + ' on ' + res.to + '.';
    if (/\+$/.test(res.san)) return 'It is a check, so they must deal with it first.';
    if (ply <= 20 && (res.piece === 'n' || res.piece === 'b') && /[18]$/.test(res.from)) return 'It brings a new piece into the game.';
    if (ply <= 12 && res.piece === 'p' && /^[cdef][3-6]$/.test(res.to)) return 'It claims the centre and opens lines for your pieces.';
    if (a && a.best && (a.best.from + a.best.to) === (uci || '').slice(0, 4)) { var w = whyBest(a, a.bestSan, ply, fenBefore)[1]; if (!/keeps your position stronger/.test(w)) return w; }
    return 'It keeps every piece safe and improves your position.';
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
    function lathe(pts) { var g = new THREE.LatheGeometry(V(pts), 56); g.computeVertexNormals(); return g; }
    function buildGeometries() {
      GEO.p = lathe(BASE.concat([[0.2, 0.2], [0.14, 0.3], [0.11, 0.42], [0.19, 0.45], [0.19, 0.48], [0.1, 0.5]]).concat(arc(0, 0.62, 0.15, -1.1, Math.PI / 2, 12)));
      GEO.r = lathe(BASE.concat([[0.25, 0.2], [0.2, 0.3], [0.19, 0.55], [0.27, 0.6], [0.28, 0.8], [0.2, 0.8], [0.2, 0.74], [0, 0.74]]));
      GEO.b = lathe(BASE.concat([[0.22, 0.2], [0.15, 0.32], [0.12, 0.55], [0.21, 0.58], [0.21, 0.61], [0.12, 0.64], [0.16, 0.7], [0.175, 0.78], [0.14, 0.88], [0.07, 0.95], [0.035, 0.975]]).concat(arc(0, 1.01, 0.05, -0.8, Math.PI / 2, 8)));
      var QB = [[0, 0], [0.4, 0], [0.415, 0.03], [0.4, 0.08], [0.34, 0.12], [0.32, 0.16], [0.28, 0.2], [0.2, 0.32], [0.14, 0.6], [0.13, 0.78], [0.23, 0.82], [0.23, 0.855], [0.14, 0.88]];
      GEO.q = lathe(QB.concat([[0.17, 0.95], [0.26, 1.08], [0.2, 1.1], [0.08, 1.12]]).concat(arc(0, 1.17, 0.07, -0.9, Math.PI / 2, 8)));
      GEO.k = lathe(QB.map(function (p) { return [p[0], p[1] * 1.04]; }).concat([[0.18, 0.98], [0.23, 1.1], [0.2, 1.13], [0.1, 1.15], [0, 1.16]]));
      GEO.nBase = lathe(BASE.concat([[0.24, 0.2], [0.2, 0.28], [0.19, 0.36], [0, 0.37]]));
      var s = new THREE.Shape();
      // horse head: smooth spline outline (chest, muzzle, forehead, ears, mane), thick rounded bevel
      var hp = [[-0.22, 0.3], [0.17, 0.3], [0.14, 0.44], [0.1, 0.55], [0.2, 0.58], [0.3, 0.63], [0.33, 0.7], [0.28, 0.77], [0.17, 0.84], [0.1, 0.92], [0.07, 1.02], [0.02, 1.09], [-0.03, 1.02], [-0.08, 1.08], [-0.12, 0.98], [-0.2, 0.9], [-0.26, 0.76], [-0.29, 0.58], [-0.27, 0.42]];
      s.moveTo(hp[0][0], hp[0][1]);
      s.splineThru(hp.slice(1).map(function (q) { return new THREE.Vector2(q[0], q[1]); }));
      s.lineTo(hp[0][0], hp[0][1]);
      GEO.nHead = new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 5, curveSegments: 10 });
      GEO.nHead.translate(0, 0, -0.065);
      GEO.nHead.computeVertexNormals();
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
      GEO.felt = new THREE.CylinderGeometry(0.345, 0.345, 0.008, 40);
    }
    // Procedural wood: long wavy grain lines plus fine fibres and a soft sheen, drawn once to a canvas.
    function woodCanvas(base, dark, light, seed, size, rings) {
      var c = document.createElement('canvas'); c.width = c.height = size || 512;
      var x = c.getContext('2d'), W = c.width, rnd = seed || 1;
      function R() { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; }
      x.fillStyle = base; x.fillRect(0, 0, W, W);
      for (var i = 0; i < (rings || 70); i++) {
        var y0 = R() * W, amp = 3 + R() * 9, fq = 0.004 + R() * 0.01, ph = R() * 6.3;
        x.strokeStyle = R() < 0.6 ? dark : light; x.globalAlpha = 0.12 + R() * 0.3; x.lineWidth = 0.6 + R() * 2.6;
        x.beginPath();
        for (var px = 0; px <= W; px += 8) { var py = y0 + Math.sin(px * fq + ph) * amp + Math.sin(px * fq * 3.1 + ph) * amp * 0.3; if (px) x.lineTo(px, py); else x.moveTo(px, py); }
        x.stroke();
      }
      x.globalAlpha = 0.05;
      for (var k = 0; k < 900; k++) { x.fillStyle = R() < 0.5 ? dark : light; x.fillRect(R() * W, R() * W, 6 + R() * 30, 1); }
      x.globalAlpha = 1;
      return c;
    }
    function woodTex(cv, rx, ry, ox, oy, rot) {
      var t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.offset.set(ox || 0, oy || 0);
      if (rot) { t.center.set(0.5, 0.5); t.rotation = rot; }
      return t;
    }
    var WOOD = {};
    function buildMaterials() {
      WOOD.maple = woodCanvas('#d8b07a', '#a87440', '#ecd09e', 7, 512, 110);
      WOOD.walnut = woodCanvas('#6e3f22', '#3e200f', '#8f5a32', 13, 512, 110);
      WOOD.frame = woodCanvas('#3b2214', '#1f1009', '#5a3620', 29, 512, 80);
      WOOD.table = woodCanvas('#2a1a10', '#150b06', '#3c2617', 41, 512, 60);
      // ivory and ebony, lacquered
      MAT.w = new THREE.MeshPhysicalMaterial({ color: col(0xe6d2a8), roughness: 0.42, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0 });
      MAT.b = new THREE.MeshPhysicalMaterial({ color: col(0x1e1611), roughness: 0.3, metalness: 0.0, clearcoat: 0.85, clearcoatRoughness: 0.18 });
      MAT.light = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0 });
      MAT.dark = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0 });
      MAT.frame = new THREE.MeshPhysicalMaterial({ map: woodTex(WOOD.frame, 2, 1), roughness: 0.45, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3 });
      MAT.brass = new THREE.MeshStandardMaterial({ color: col(0xd4a64a), roughness: 0.32, metalness: 0.95 });
      MAT.felt = new THREE.MeshStandardMaterial({ color: col(0x1f4a32), roughness: 1, metalness: 0 });
      MAT.star = new THREE.MeshStandardMaterial({ color: col(0xffd23f), emissive: col(0xffb000), emissiveIntensity: 0.75, roughness: 0.3, metalness: 0.3 });
      MAT.glow = new THREE.MeshBasicMaterial({ color: col(0xffd23f), transparent: true, opacity: 0.38, depthWrite: false });
      // how strongly each surface picks up the studio reflections from buildEnvironment()
      MAT.w.envMapIntensity = 0.55; MAT.b.envMapIntensity = 1.1; MAT.light.envMapIntensity = 0.35; MAT.dark.envMapIntensity = 0.35; MAT.frame.envMapIntensity = 0.6; MAT.brass.envMapIntensity = 1.2; MAT.star.envMapIntensity = 0.8;
    }
    // A warm "study" (dark brown dome, a big window softbox, two warm lamp panels) baked into a
    // reflection map, so the lacquered pieces and brass trim catch believable highlights.
    function buildEnvironment() {
      try {
        var pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
        var dome = new THREE.SphereGeometry(20, 32, 16), p = dome.attributes.position, cols = [];
        var top = new THREE.Color(0x4a3524), bot = new THREE.Color(0x0c0705), c = new THREE.Color();
        for (var i = 0; i < p.count; i++) { c.copy(bot).lerp(top, (p.getY(i) / 20 + 1) / 2); cols.push(c.r, c.g, c.b); }
        dome.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        env.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
        [[0xfff4e2, -4, 15, 4, 12, 8], [0xffc98a, -13, 5, -9, 7, 3], [0xffe3b8, 13, 4, -7, 7, 3]].forEach(function (b) {
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
      x.fillStyle = color === 'w' ? '#f4e6c8' : '#1e1611'; x.fill();
      x.lineWidth = 6; x.strokeStyle = '#c99a3e'; x.stroke();
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
        head.rotation.y = color === 'w' ? Math.PI / 2 - 0.7 : -Math.PI / 2 - 0.7; // three-quarter profile toward the player
        g.add(head);
      } else {
        g.add(part(GEO[type], mat));
        if (type === 'r') for (i = 0; i < 4; i++) { var c = part(GEO.crenel, mat, 0.84); var a = i * Math.PI / 2 + Math.PI / 4; c.position.x = Math.cos(a) * 0.235; c.position.z = Math.sin(a) * 0.235; g.add(c); }
        if (type === 'q') for (i = 0; i < 8; i++) { var bd = part(GEO.bead, mat, 1.11); var b = i * Math.PI / 4; bd.position.x = Math.cos(b) * 0.24; bd.position.z = Math.sin(b) * 0.24; g.add(bd); }
        if (type === 'k') { g.add(part(GEO.crossV, mat, 1.27)); g.add(part(GEO.crossH, mat, 1.3)); }
      }
      var TOP = { p: 0.78, n: 1.1, b: 1.07, r: 0.79, q: 1.25, k: 1.33 };
      var decal = new THREE.Mesh(GEO.decal, glyphMat(type, color));
      decal.rotation.x = -Math.PI / 2; decal.rotation.z = orient === 'b' ? Math.PI : 0; decal.position.y = TOP[type] + 0.02; decal.renderOrder = 2;
      decal.userData.decal = true; decal.visible = false;
      g.add(decal); g.userData.decalMesh = decal;
      var felt = new THREE.Mesh(GEO.felt, MAT.felt); felt.position.y = 0.004; g.add(felt);
      g.userData.type = type; g.userData.color = color;
      return g;
    }

    // ---------- scene ----------
    function labelTexture(ch) {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var x = c.getContext('2d'); x.fillStyle = '#e9c98f'; x.font = '700 42px "JetBrains Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 34);
      var t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
    }
    api.init = function (el, clickCb, hoverCb) {
      container = el; onClick = clickCb; hoverFn = hoverCb;
      buildGeometries(); buildMaterials();
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x140c07);
      scene.fog = new THREE.Fog(0x140c07, 24, 48);
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 9.2, 9);
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
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

      scene.add(new THREE.HemisphereLight(0xfff3e0, 0x2a1a0e, 0.45));
      var key = new THREE.DirectionalLight(0xffeedd, 0.95);
      key.position.set(-4, 14, 3); key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      var sc = key.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 30;
      key.shadow.bias = -0.0006; key.shadow.radius = 4;
      scene.add(key);
      var fill = new THREE.DirectionalLight(0xffd9a8, 0.35); fill.position.set(7, 5, -5); scene.add(fill);
      var rim = new THREE.PointLight(0xffb066, 0.7, 30); rim.position.set(0, 5, -9); scene.add(rim);
      var lamp = new THREE.SpotLight(0xffe2b8, 0.35, 40, 0.6, 0.7); lamp.position.set(0, 16, 0); scene.add(lamp);

      // board squares: maple and walnut, every square cut from a different part of the plank
      var board = new THREE.Group();
      for (var f = 0; f < 8; f++) for (var r = 0; r < 8; r++) {
        var light = (f + r) % 2 === 1, h = Math.abs(Math.sin(f * 12.9898 + r * 78.233) * 43758.5453) % 1;
        var m = (light ? MAT.light : MAT.dark).clone();
        m.map = woodTex(light ? WOOD.maple : WOOD.walnut, 0.25, 0.25, h, (h * 7.3) % 1, (f + r * 3) % 2 ? Math.PI / 2 : 0);
        var sq = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 1), m);
        sq.position.set(f - 3.5, -0.04, 3.5 - r); sq.receiveShadow = true;
        board.add(sq);
      }
      // raised walnut frame with mitred-look sides, a brass inlay round the squares and a gold outer bead
      var frameSide = [new THREE.BoxGeometry(9.4, 0.46, 0.7), new THREE.BoxGeometry(0.7, 0.46, 9.4)];
      [[0, 4.35, 0], [0, -4.35, 0], [4.35, 0, 1], [-4.35, 0, 1]].forEach(function (t) {
        var fm = new THREE.Mesh(frameSide[t[2]], t[2] ? new THREE.MeshPhysicalMaterial({ map: woodTex(WOOD.frame, 1, 2, 0.3, 0, Math.PI / 2), roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.6 }) : MAT.frame);
        fm.position.set(t[2] ? t[0] : 0, -0.21, t[2] ? 0 : t[1]); fm.receiveShadow = true; fm.castShadow = true; board.add(fm);
      });
      var under = new THREE.Mesh(new THREE.BoxGeometry(8.02, 0.36, 8.02), MAT.frame); under.position.y = -0.26; board.add(under);
      var trimGeo = [new THREE.BoxGeometry(8.12, 0.05, 0.06), new THREE.BoxGeometry(0.06, 0.05, 8.12)];
      [[0, 4.03, 0], [0, -4.03, 0], [4.03, 0, 1], [-4.03, 0, 1]].forEach(function (t) {
        var tr = new THREE.Mesh(trimGeo[t[2]], MAT.brass); tr.position.set(t[2] ? t[0] : 0, 0.005, t[2] ? 0 : t[1]); board.add(tr);
      });
      var beadGeo = [new THREE.BoxGeometry(9.44, 0.05, 0.05), new THREE.BoxGeometry(0.05, 0.05, 9.44)];
      [[0, 4.7, 0], [0, -4.7, 0], [4.7, 0, 1], [-4.7, 0, 1]].forEach(function (t) {
        var bd = new THREE.Mesh(beadGeo[t[2]], MAT.brass); bd.position.set(t[2] ? t[0] : 0, 0.0, t[2] ? 0 : t[1]); board.add(bd);
      });
      var base = new THREE.Mesh(new THREE.BoxGeometry(9.7, 0.14, 9.7), MAT.frame);
      base.position.y = -0.5; base.receiveShadow = true; base.castShadow = true; board.add(base);
      var floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: woodTex(WOOD.table, 5, 5), color: 0x9a8070, roughness: 0.7, envMapIntensity: 0.25 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.58; floor.receiveShadow = true; board.add(floor);
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
      var dustGeo = new THREE.BufferGeometry(), N = 90, arr = new Float32Array(N * 3);
      for (var d = 0; d < N; d++) { arr[d * 3] = (Math.random() - 0.5) * 26; arr[d * 3 + 1] = Math.random() * 9; arr[d * 3 + 2] = (Math.random() - 0.5) * 26; }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.035, transparent: true, opacity: 0.22, depthWrite: false }));
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
      var base = viewMode === 'top' ? (aspect < 1.3 ? 15 : 13.5) : 12.6; // top view on phones: keep the corner squares clear of the menu button
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
        if (l.userData.kind === 'file') l.position.set(i - 3.5, 0.03, 4.33 * s);
        else l.position.set(-4.33 * s, 0.03, 3.5 - i);
        l.rotation.z = orient === 'w' ? 0 : Math.PI;
      });
    }
    api.setOrientation = function (c, animate) {
      if (c === orient && performance.now() < introUntil) return Promise.resolve(); // let the opening shot finish
      orient = c; placeLabels();
      pieceGroup.children.forEach(function (pc) { if (pc.userData.decalMesh) pc.userData.decalMesh.rotation.z = c === 'b' ? Math.PI : 0; });
      return moveCamera(animate !== false);
    };
    api.orientation = function () { return orient; };
    api.toggleView = function () { viewMode = viewMode === '3d' ? 'top' : '3d'; controls.autoRotate = false; moveCamera(true); return viewMode; };
    var paused = false;
    api.setActive = function (on) { paused = !on; if (on) { resize(); moveCamera(false); } };
    api.idle = function () { controls.autoRotate = false; };
    api.recenter = function () { moveCamera(true); };

    function loop(now) {
      requestAnimationFrame(loop);
      if (document.hidden || paused) return;
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
      bad: { color: 0xe2695c, op: 0.6, y: 0.008 }, good: { color: 0x73c48f, op: 0.6, y: 0.008 }, moves: { color: 0x10161e, op: 0.5, y: 0.01 },
      zoneA: { color: 0x4cc9f0, op: 0.5, y: 0.0045 }, zoneB: { color: 0xff5daa, op: 0.45, y: 0.0046 }, zoneC: { color: 0xffd23f, op: 0.5, y: 0.0047 }, spot: { color: 0xc4ff3d, op: 0.5, y: 0.0048 }
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
    api.tags = function () { };
    api.spot = function (sqs) { api.markers('spot', sqs || []); };

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
    panel.innerHTML = hintHtml() + html; panel.scrollTop = 0;
    if (PANEL_ANIM) { PANEL_ANIM = false; void panel.offsetWidth; panel.classList.add('enter'); clearTimeout(setPanel._t); setPanel._t = setTimeout(function () { panel.classList.remove('enter'); }, 900); }
  }
  function toast(msg, kind) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (kind || '');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = 'toast'; }, Math.max(2600, Math.min(6000, 1200 + msg.length * 45)));
  }
  function setStatus(text, kind) {
    var el = $('#status'); if (!el) return;
    el.innerHTML = text; el.className = 'status ' + (kind || '');
    if (text) { var pn = $('#panel'); setTimeout(function () { if (document.body.classList.contains('mob')) pn.scrollTop = pn.scrollHeight; else if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }, 40); }
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
    else if (!p && IX.enabled) toast('First tap one of your pieces, then the square you want it to go to.');
  }
  var MOVE_RULE = { r: 'Rooks move in straight lines: up, down, left or right.', b: 'Bishops move only diagonally.', q: 'The queen moves in straight lines or diagonally, without jumping.', n: 'Knights jump in an L: two squares one way, then one to the side.', k: 'The king moves one square at a time.', p: 'Pawns move straight forward and capture one square diagonally.' };
  function illegalWhy(g, piece, from, to) {
    if (piece.type === 'k' && from && to && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2 && from[1] === to[1]) {
      if (g.inCheck()) return 'You cannot castle while you are in check.';
      var rights = g.fen().split(' ')[2], side = to[0] === 'g' ? 'k' : 'q', key = piece.color === 'w' ? side.toUpperCase() : side;
      if (rights.indexOf(key) < 0) return 'You cannot castle on that side any more: the king or that rook has already moved.';
      return 'You cannot castle here. The squares between king and rook must be empty, and the king may not pass through or land on a square an enemy piece attacks.';
    }
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
    if (!legal.length) { var pc = g.get(from); Sound.play('bad'); if (pc) toast(illegalWhy(g, pc, from, to)); return false; }
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
  // ---- Lesson visuals: what the coach is talking about, drawn on the board ----
  // step fields: files ['e'], ranks [4], zones [[squares, 'A'|'B'|'C']], tags {sq: text}, spot 'n' (both colours) | 'N' (white) | 'n!' (black) | ['k','q'],
  // dots 'd4' (where the piece on d4 can go), demo ['g1f3', ...] (moves played out on the board), arrows, marks
  var ZONE = { A: 'zoneA', B: 'zoneB', C: 'zoneC' };
  function pieceSquares(fen, spec) {
    var out = [], rows = fen.split(' ')[0].split('/'), want = [].concat(spec);
    rows.forEach(function (row, ri) { var f = 0; for (var i = 0; i < row.length; i++) { var ch = row[i]; if (/\d/.test(ch)) { f += +ch; continue; }
      if (want.some(function (w) { return w === ch.toLowerCase() || w === ch + '!' || (w === ch && w !== w.toLowerCase()); })) out.push('abcdefgh'[f] + (8 - ri)); f++; } });
    return out;
  }
  function moveDots(fen, sq) {
    var parts = fen.split(' '), map = new Game(fen), pc = map.get(sq); if (!pc) return [];
    parts[1] = pc.color; parts[3] = '-'; var g = new Game(parts.join(' '));
    var ms = g.moves({ square: sq }), seen = {};
    return (ms || []).filter(function (m) { if (seen[m.to]) return false; seen[m.to] = 1; return true; }).map(function (m) { return { sq: m.to, cap: !!m.captured }; });
  }
  function showVisuals(step, fen) {
    fen = fen || step.fen; if (!fen) return;
    if (step.arrows) B3.arrows(step.arrows);
    if (step.marks) B3.markers('mark', step.marks);
    var zones = { zoneA: [], zoneB: [], zoneC: [] }, tags = {};
    (step.files || []).forEach(function (f) { for (var r = 1; r <= 8; r++) zones.zoneA.push(f + r); });
    (step.ranks || []).forEach(function (r) { 'abcdefgh'.split('').forEach(function (f) { zones.zoneB.push(f + r); }); });
    (step.zones || []).forEach(function (z) { zones[ZONE[z[1] || 'C']] = zones[ZONE[z[1] || 'C']].concat(z[0]); });
    Object.keys(zones).forEach(function (c) { B3.markers(c, zones[c]); });
    Object.keys(step.tags || {}).forEach(function (k) { tags[k] = step.tags[k]; });
    if (step.spot) B3.spot(pieceSquares(fen, step.spot)); else B3.spot(null);
    B3.tags(tags);
    if (step.dots) B3.markers('moves', [].concat(step.dots).reduce(function (a, sq) { return a.concat(moveDots(fen, sq)); }, []));
  }
  function playDemo(step, isLive) {
    if (!step.demo || !step.demo.length) return;
    var g = new Game(step.fen), i = 0;
    (function next() {
      if (!isLive()) return;
      if (i >= step.demo.length) { setTimeout(function () { if (!isLive()) return; B3.setPosition(step.fen); B3.arrows(step.arrows || []); showVisuals(step); }, 1600); return; }
      var u = step.demo[i++], m = g.move(uciObj(u)); if (!m) return;
      B3.arrows([[m.from, m.to, 'y']]); B3.markers('moves', []);
      B3.animateMove(m, g.fen()).then(function () { setTimeout(next, 900); });
    })();
  }

  function setupBoard(fen, opts) {
    opts = opts || {};
    deselect(); B3.clearAll(); IX.collect = null;
    var pr = $('#promo'); if (pr && !pr.hidden) { pr.hidden = true; pr.onclick = null; }
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
  var UNLOCK_AT = { play: 5, openings: 6 };
  function lessonsDone() { return Object.keys(S.lessons).filter(function (k) { return S.lessons[k] && S.lessons[k].done; }).length; }
  function isLocked(mode) { return !!LOCKABLE[mode] && beginnerMode() && !S.peek[mode] && lessonsDone() < UNLOCK_AT[mode]; }
  function lockedScreen(mode) {
    var st = STAGES[0], done = Math.min(lessonsDone(), UNLOCK_AT[mode]);
    setupBoard(Game.START, { orient: 'w' });
    setPanel('<div class="locked-screen"><div class="lock-orb" aria-hidden="true">' + pieceSVG(mode === 'play' ? 'k' : 'b', 'w', 54) + '</div>' +
      '<div class="eyebrow">Unlocks after ' + UNLOCK_AT[mode] + ' lesson' + (UNLOCK_AT[mode] > 1 ? 's' : '') + '</div><h1 class="h1">' + LOCKABLE[mode] + ' are almost ready</h1>' +
      '<p class="lede">' + (mode === 'play' ? 'As soon as you know how every piece moves, you will play full games against me, with tips on every move. Until then, the coach missions after each lesson are your games.' : 'After ' + UNLOCK_AT.openings + ' lessons you will learn real openings and traps, one move at a time.') + '</p>' +
      '<div class="lock-progress"><i style="width:' + Math.round(done / UNLOCK_AT[mode] * 100) + '%"></i></div><p class="muted small">' + done + ' of ' + UNLOCK_AT[mode] + ' lessons done</p>' +
      '<div class="actions"><button class="btn primary big" data-act="startNext">Continue learning</button></div>' +
      '<button class="link small" data-act="peek" data-m="' + mode + '">I already know the basics, let me in</button>' +
      '</div>');
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
    var tab = { drill: 'path', warmup: 'path', analyze: 'play', lesson: 'path', mission: 'path', stagetest: 'path', opening: 'openings', rush: 'puzzles', vision: 'arena', review: 'play', practice: 'play' }[mode] || mode;
    if (mode === 'play' && arg && arg.spec) tab = 'arena';
    document.querySelectorAll('.rail button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === tab); });
    $('#evalbar').hidden = true;
    B3.idle(false);
    IX.enabled = false; IX.onMove = null; IX.collect = null; IX.tap = null; Replay.stop();
    current = MODES[mode];
    document.body.dataset.mode = mode;
    S.visited = S.visited || {}; if (!S.visited[tab]) { S.visited[tab] = 1; save(); } markNewTabs(); firstHint(mode);
    PANEL_ANIM = true;
    current.enter(arg);
    $('#mode-label').textContent = current.label || '';
    setLayout();
  }
  // Phone layout: board-first screens get a full-width square board; browsing screens get a small board and more room.
  var BOARD_MODES = { drill: 1, warmup: 1, lesson: 1, opening: 1, puzzles: 1, rush: 1, review: 1, practice: 1, stagetest: 1, vision: 1, mission: 1 };
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
  // "New" dots on tabs the player has not opened yet, and a one-line hint the first time each area opens
  function markNewTabs() {
    if (!S.onboarded) return;
    S.visited = S.visited || {};
    document.querySelectorAll('.rail button[data-go]').forEach(function (b) { var m = b.dataset.go; b.classList.toggle('new', !S.visited[m] && !isLocked(m)); });
  }
  var HINTS = HINT_LINES_TEXT;

  var HINT = null;
  function firstHint(mode) {
    S.hinted = S.hinted || {}; HINT = null;
    var t = HINTS[mode];
    if (!t || S.hinted[mode] || !S.onboarded) return;
    S.hinted[mode] = 1; save();
    HINT = { mode: mode, text: t };
    setTimeout(function () { if (HINT && HINT.mode === mode) Voice.say([{ id: 'H-' + mode, text: t }], true); }, 900);
  }
  function hintHtml() { return HINT && document.body.dataset.mode === HINT.mode ? '<button class="first-hint" data-act="hintOk"><span class="fh-ico" aria-hidden="true">💡</span><span>' + esc(HINT.text) + '</span><span class="fh-x">Got it</span></button>' : ''; }
  ACT.hintOk = function () { HINT = null; var el = $('.first-hint'); if (el) { el.classList.add('out'); setTimeout(function () { el.remove(); }, 250); } };

  function closeTools() { var t = $('.board-tools'); if (t) t.classList.remove('open'); var tb = $('#tools-btn'); if (tb) tb.setAttribute('aria-expanded', 'false'); }

  // ================= Path (home) =================
  // Placement: the stage that matches the level picked at the start. Stages below it count as cleared,
  // and so does any stage the player tested out of.
  function placementStage(band) { var k = 0, b = band == null ? S.band : band; STAGES.forEach(function (st, i) { if (b > st.min) k = i; }); return Math.min(k, 3); } // endgames are never skipped by placement
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
    if (analyzeReady()) items.splice(3, 0, { m: 'analyze', ico: 'b', t: 'Analyze a game', s: 'From chess.com or PGN', act: 'goAnalyze' });
    return '<div class="sect-head"><h2>Explore</h2><span class="muted small">jump in anytime</span></div><div class="explore">' + items.map(function (it) {
      var lock = isLocked(it.m), need = lock ? UNLOCK_AT[it.m] - lessonsDone() : 0;
      return '<button class="ex-tile' + (lock ? ' locked' : '') + '" ' + (it.act ? 'data-act="' + it.act + '"' : 'data-act="goMode" data-m="' + it.m + '"') + '><span class="ex-ico">' + pieceSVG(it.ico, 'w', 24) + '</span><b>' + it.t + '</b><span>' + (lock ? '🔒 after ' + need + ' more lesson' + (need > 1 ? 's' : '') : it.s) + '</span></button>';
    }).join('') + '</div>';
  }
  ACT.goMode = function (d) { go(d.m); };
  // ===== First steps: a checklist that walks a new player through every part of the app =====
  var DISCOVER = [
    { k: 'lesson', ico: 'r', t: 'Take your first lesson', s: 'Learn the board, the pieces and how moves are written.', act: 'data-act="startNext"', done: function () { return lessonsDone() >= 1; } },
    { k: 'puzzle', ico: 'n', t: 'Solve a puzzle', s: 'Find the best move. Your rating goes up.', act: 'data-act="goPuzzles"', done: function () { return Object.keys(S.puzzle.solved || {}).length >= 1; } },
    { k: 'mission', ico: 'k', t: 'Beat a coach mission', s: 'A tiny challenge with me, right after a lesson.', act: 'data-act="mission" data-l="l-pieces" data-i="0"', done: function () { return Object.keys(S.missions || {}).length >= 1; } },
    { k: 'arena', ico: 'q', t: 'Play a 60-second game', s: 'Quick board games in the Arena.', act: 'data-act="goMode" data-m="arena"', done: function () { return Object.keys(S.arena || {}).some(function (x) { return S.arena[x] > 0; }); } },
    { k: 'play', ico: 'p', t: 'Play a game against me', s: 'A real game, with tips on every move.', act: 'data-act="goPlay"', lock: 'play', done: function () { return (S.games || []).length >= 1; } },
    { k: 'opening', ico: 'b', t: 'Learn an opening', s: 'The first moves the pros play.', act: 'data-act="goMode" data-m="openings"', lock: 'openings', done: function () { return Object.keys(S.openings || {}).length >= 1; } },
    { k: 'analyze', ico: 'n', t: 'Analyze a chess.com game', s: 'See your mistakes and how to fix them.', act: 'data-act="goAnalyze"', done: function () { return (S.anHist || []).length >= 1; } }
  ];
  // game analysis only makes sense once someone can play a full game
  function analyzeReady() { return S.band >= 800 || stageCleared(0) || lessonsDone() >= 6 || (S.anHist || []).length > 0; }
  function discList() { return DISCOVER.filter(function (x) { return x.k !== 'analyze' || analyzeReady(); }); }
  function discCount() { return discList().filter(function (x) { return x.done(); }).length; }
  function discAllDone() { return discCount() >= discList().length; }
  // reward each newly explored area once
  function discSync() {
    S.disc = S.disc || {}; var fresh = [];
    discList().forEach(function (x) { if (x.done() && !S.disc[x.k]) { S.disc[x.k] = dayKey(); fresh.push(x); } });
    if (!fresh.length) return;
    save(); addXP(20 * fresh.length);
    if (discAllDone()) Badges.award('explorer'); else toast('✓ +20 XP · ' + discCount() + ' of ' + discList().length + ' explored');
  }
  function discoverCard() {
    var L0 = discList(), n = discCount(), next = L0.filter(function (x) { return !x.done() && !(x.lock && isLocked(x.lock)); })[0];
    return '<section class="disc"><div class="disc-head"><div><div class="eyebrow">Your first steps</div><b class="disc-title">Try everything once</b></div><span class="disc-ring" style="--p:' + Math.round(n / L0.length * 100) + '"><b>' + n + '</b>/' + L0.length + '</span></div>' +
      '<div class="disc-list">' + L0.filter(function (x) { return !x.done(); }).concat(L0.filter(function (x) { return x.done(); })).map(function (x) {
        var ok = x.done(), lock = !ok && x.lock && isLocked(x.lock), need = lock ? UNLOCK_AT[x.lock] - lessonsDone() : 0;
        return '<button class="disc-item' + (ok ? ' done' : '') + (lock ? ' locked' : '') + (x === next ? ' next' : '') + '" ' + (lock ? 'data-act="goMode" data-m="' + x.lock + '"' : x.act) + '><span class="disc-ico">' + (ok ? '✓' : pieceSVG(x.ico, 'w', 18)) + '</span><span class="disc-t"><b>' + esc(x.t) + '</b><span>' + (lock ? '🔒 After ' + need + ' more lesson' + (need > 1 ? 's' : '') : esc(x.s)) + '</span></span>' + (x === next ? '<span class="disc-go">Try it →</span>' : ok ? '' : '<span class="disc-xp">+20</span>') + '</button>';
      }).join('') + '</div></section>';
  }
  MODES.path = {
    label: 'Training path',
    enter: function (rerender) {
      if (!rerender) {
        // the board previews the next lesson, so home is never a dead starting position; tap it to dive in
        var pl = nextLesson(), ps = pl && LESSONS[pl].steps[0];
        if (ps && ps.t === 'collect') { setupBoard(fenOf(ps.piece, ps.start), { drop: true, orient: 'w' }); B3.stars(ps.stars); }
        else if (ps && ps.fen) { setupBoard(ps.fen, { drop: true, orient: new Game(ps.fen).turn() }); showVisuals(ps); }
        else setupBoard(Game.START, { drop: true, orient: 'w' });
        if (pl) IX.tap = function () { ACT.startNext(); };
        setTimeout(function () { if (current === MODES.path) B3.idle(true); }, 1400);
      }
      var d = today(), day = Math.min(dayNumber(), 30), nl = nextLesson(), allClear = !nl;
      discSync(); var fresh = !discAllDone() && discCount() < 3 && lessonsDone() < 2; // newcomers get a short, focused home
      if (allClear) nl = STAGES[STAGES.length - 1].lessons[0];
      var L = LESSONS[nl], cur = allClear ? STAGES.length - 1 : stageOf(nl), placed = placementStage(), pend = allClear ? null : pendingFlow(nl);
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
        : pend ? '<h1 class="h1">Next up: ' + esc(pend.t) + '</h1>' +
          '<p class="lede">' + (pend.k === 'mission' ? 'Use what you learned in <b>' + esc(LESSONS[pend.lid].title) + '</b> against me, in a few quick challenges.' : 'Five puzzles that use exactly what you learned in <b>' + esc(LESSONS[pend.lid].title) + '</b>.') + '</p>' + flowChips(pend.lid) +
          '<button class="btn primary big" data-act="flowGo" data-l="' + pend.lid + '">▶&nbsp; ' + (pend.k === 'mission' ? 'Start the missions' : 'Start practice') + '</button>' +
          '<button class="btn ghost small hero-skip" data-act="startNext">Skip to the next lesson: ' + esc(L.title) + '</button>'
        : '<h1 class="h1">Next up: ' + esc(L.title) + '</h1>' +
          '<p class="lede">' + esc(L.goal) + '</p>' +
          '<button class="btn primary big" data-act="startNext">▶&nbsp; Start lesson · ' + lessonMins(L) + ' min</button>') +
        '</section>' +
        warmupCard() +
        (discAllDone() ? (analyzeReady() ? '<button class="an-home" data-act="goAnalyze"><span class="an-home-ico" aria-hidden="true">🔍</span><span class="an-home-t"><b>Analyze your chess.com game</b><span>Paste a link or your username. I find your mistakes and how to fix them.</span></span><span class="an-go" aria-hidden="true">→</span></button>' : '') : discoverCard()) +
        (placed > 0 ? '<div class="placed-note"><span class="pn-ico" aria-hidden="true">✓</span><span><b>Placed at ' + S.band + '.</b> ' + esc(STAGES.slice(0, placed).map(function (st) { return st.name; }).join(', ')) + (placed > 1 ? ' are' : ' is') + ' marked cleared, so your course starts at ' + esc(STAGES[placed].name) + '. Open a cleared stage any time to review it.</span></div>' : '') +
        (fresh ? '' : '<div class="ladder" aria-label="Your rating on the 100 to 2000 ladder">' +
        '<div class="ladder-track"><i style="width:' + pct + '%"></i><span class="ladder-me" style="left:' + pct + '%"><b>' + Math.round(R) + '</b></span></div>' +
        '<div class="ladder-marks">' + marks.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div></div>') +
        '<div class="sect-head"><h2>Today\'s missions</h2><span class="pill-count">' + missionsDone(d) + '/' + missionsTotal() + '</span></div>' +
        '<div class="mchips">' + missionList(d).map(function (m, i) { return chip(m.done, m.label, m.sub || esc(L.title), m.act, String(i + 1)); }).join('') + '</div>' +
        (fresh ? '' : exploreStrip()) +
        (fresh ? '' : (function () { var pool = MORE_POOLS.tip_day, i = (dayNumber() - 1 + (S.startDate ? S.startDate.length : 0)) % pool.length; return '<button class="tipday" data-act="sayTip" data-i="' + i + '"><span class="tip-ico" aria-hidden="true">▶</span><span>' + esc(pool[i]) + '</span></button>'; })()) +
        '<div class="sect-head"><h2>Your journey</h2><button class="link" data-act="tour">Replay tour</button></div>' +
        '<ol class="journey">' + STAGES.map(function (st, i) {
          var open = stageUnlocked(i), expanded = i === openStage && open;
          var doneN = st.lessons.filter(lessonDone).length, skipped = placedOut(i) && doneN < st.lessons.length;
          var state = doneN === st.lessons.length ? 'done' : skipped ? 'done placed' : i === cur && !allClear ? 'current' : open ? 'open' : 'locked';
          var how = skipped ? (i < placed ? 'Cleared · you placed above it' : S.bosses[(bossFor(i) || {}).id] ? 'Cleared · boss beaten' : 'Cleared · passed the stage test') : doneN + '/' + st.lessons.length + ' lessons';
          return '<li class="jstage ' + state + (expanded ? ' expanded' : '') + '">' +
            '<button class="jhead" data-act="toggleStage" data-i="' + i + '" ' + (open ? '' : 'disabled') + ' aria-expanded="' + expanded + '">' +
            '<span class="jdot" aria-hidden="true">' + (state === 'done' ? '✓' : state === 'locked' ? '🔒' : i + 1) + '</span>' +
            '<span class="jtext"><span class="jname">' + esc(st.name) + (skipped ? ' <em class="clear-pill">Cleared</em>' : '') + '</span><span class="jband">' + st.band + ' · ' + how + '</span></span>' +
            '<span class="jchev" aria-hidden="true">' + (open ? (expanded ? '−' : '+') : '') + '</span></button>' +
            (expanded ? '<p class="jblurb">' + esc(st.blurb) + '</p>' +
              (!stageCleared(i) && open && i < 3 && testPool(i).length >= 3 ? '<button class="test-out" data-act="stageTest" data-i="' + i + '"><span class="to-ico" aria-hidden="true">⚡</span><span><b>Know this already?</b><span>Solve 3 of 4 puzzles at ' + st.band + ' to clear the stage.</span></span><span class="to-go" aria-hidden="true">→</span></button>'
                : !stageCleared(i) && open && i >= 3 && bossFor(i) ? '<button class="test-out" data-act="boss" data-id="' + bossFor(i).id + '"><span class="to-ico" aria-hidden="true">⚔</span><span><b>Know this already?</b><span>Beat ' + esc(bossFor(i).name) + ' in a real game to clear the stage.</span></span><span class="to-go" aria-hidden="true">→</span></button>' : '') +
              '<div class="jlessons">' + st.lessons.map(function (id, k) {
              var L2 = LESSONS[id], rec = S.lessons[id], isNext = id === nl && !allClear, stops = stageStops(i);
              // after every second lesson (and at the end of the stage) an opening stop
              var stop = k % 2 === 1 && stops[(k - 1) / 2] ? stopHtml(stops[(k - 1) / 2]) : '';
              if (k === st.lessons.length - 1) stops.slice(Math.floor(st.lessons.length / 2)).forEach(function (sid) { stop += stopHtml(sid); }); // stops left over in short stages
              return '<button class="jlesson ' + (rec && rec.done ? 'done' : '') + (isNext ? ' next' : '') + '" data-act="lesson" data-id="' + id + '">' +
                '<span class="jl-num">' + (rec && rec.done ? '✓' : k + 1) + '</span><span class="jl-title">' + esc(L2.title) + '</span>' +
                '<span class="jl-meta">' + (rec && rec.done ? '★'.repeat(rec.stars || 3) : isNext ? 'Up next' : skipped ? 'Review' : lessonMins(L2) + ' min') + '</span></button>' +
                (rec && rec.done && MISSIONS[id] ? (function () { var n = coachMissionsDone(id), all = MISSIONS[id].length; return '<button class="jmission' + (n >= all ? ' done' : '') + '" data-act="mission" data-l="' + id + '" data-i="' + Math.min(n, all - 1) + '"><span class="jm-ico" aria-hidden="true">' + (n >= all ? '✓' : '⚑') + '</span><span class="jm-t">Coach missions</span><span class="jm-pips">' + MISSIONS[id].map(function (m) { return '<i class="' + (S.missions && S.missions[m.id] ? 'on' : '') + '"></i>'; }).join('') + '</span></button>'; })() : '') + stop + (k === st.lessons.length - 1 ? bossNode(i) : '');
            }).join('') + '</div>' : '') + '</li>';
        }).join('') + '</ol>';
      setPanel(html);
    },
    leave: function () { B3.idle(false); }
  };
  ACT.startNext = function () { var nl = nextLesson(); if (nl) { var pf = current === MODES.path && pendingFlow(nl); if (pf) { S.flowSkip = S.flowSkip || {}; S.flowSkip[pf.lid] = 1; save(); } go('lesson', nl); } else go('play'); };
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
      if (!ok && p.mate > 1 && !ST.altChecked) {
        IX.enabled = false;
        return altMate(t, p.mate - Math.floor(ST.ply / 2)).then(function (yes) {
          if (yes) return applyMove(g, mv).then(function () { B3.burst(mv.to); Sound.play('good'); return MODES.stagetest.result(true, '<strong>Solved.</strong> Your move forces mate too.'); });
          ST.altChecked = true; var r = MODES.stagetest.onMove(mv, uci); ST.altChecked = false; return r;
        });
      }
      if (!ok) {
        ST.busy = true; Sound.play('bad'); B3.flash('bad', [mv.to]);
        var u = p.sol[ST.ply]; B3.arrows([[u.slice(0, 2), u.slice(2, 4), 'g']]);
        return MODES.stagetest.result(false, '<strong>Missed.</strong> The winning move was ' + esc((new Game(g.fen()).move(uciObj(u)) || {}).san || u) + ' (green arrow). Next puzzle coming up.');
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
      return B3.wait(ok ? 1600 : 2800).then(function () { if (current === MODES.stagetest) { ST.k++; MODES.stagetest.load(); } });
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

  // Does the position (opponent to move) still lose to a forced mate within n of our moves?
  function altMate(gAfter, n) {
    if (gAfter.inCheckmate()) return Promise.resolve(true);
    return Eng.call('rootSearch', gAfter.fen(), Math.min(2 * n + 2, 14), 3000, 0).then(function (r) {
      return !!(r && r.moves && r.moves.length && r.moves[0].score <= -(100000 - 2 * n - 1));
    });
  }

  // ================= Lesson =================
  var LS = null;
  function quizBox(Q) { return '<div class="quiz' + (Q.done ? ' done' : '') + '"><span class="quiz-tag">' + (Q.done ? '✓ Nailed it' : 'Your turn') + '</span><span class="quiz-q">' + esc(Q.text.replace(/^Your turn\. /, '')) + '</span><span class="quiz-pips">' + Array.apply(null, Array(Q.need)).map(function (x, k) { return '<i class="' + (k < Q.found.length ? 'on' : '') + '"></i>'; }).join('') + '</span></div>'; }
  var PIECE_INFO = {
    k: { letter: 'K', value: 'Priceless' },
    q: { letter: 'Q', value: '9 points' },
    r: { letter: 'R', value: '5 points' },
    b: { letter: 'B', value: '3 points' },
    n: { letter: 'N', value: '3 points' },
    p: { letter: 'no letter', value: '1 point' }
  };
  function meetCard(t) {
    var I = PIECE_INFO[t];
    return '<div class="meet-card"><span class="meet-pc">' + pieceSVG(t, 'w', 64) + '</span><span class="meet-txt"><b>' + PIECE_NAME[t].charAt(0).toUpperCase() + PIECE_NAME[t].slice(1) + '</b><span>Letter: <b class="mono">' + I.letter + '</b> · Worth: ' + I.value + '</span></span></div>';
  }
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
      if (LS.quizI !== LS.i) { LS.quizI = LS.i; LS.quiz = QUIZ_OF(step); if (LS.quiz) { LS.quiz.found = []; LS.stepDone = false; } }
      var Q = LS.quiz;
      var kind = step.t === 'read' ? (Q ? 'Concept + try it' : 'Concept') : step.t === 'collect' ? 'Mini-game' : step.t === 'squares' || step.t === 'pieces' ? 'Board game' : 'Your move';
      var actions = '';
      if (step.t === 'read' && Q && !Q.done) actions = '<button class="btn ghost" data-act="quizShow">Show me again</button><button class="btn ghost" data-act="quizSkip">Skip</button>';
      else if (step.t === 'read') actions = (step.line ? '<button class="btn" data-act="playLine">Play the line</button>' : '') + (step.demo ? '<button class="btn" data-act="demoAgain">▶ Watch again</button>' : '') + '<button class="btn primary" data-act="nextStep">' + (LS.i === L.steps.length - 1 ? 'Finish lesson' : 'Next') + '</button>';
      else actions = '<button class="btn ghost" data-act="hint">Hint</button><button class="btn ghost" data-act="resetStep">Reset</button><button class="btn primary" data-act="nextStep" ' + (LS.stepDone ? '' : 'disabled') + '>' + (LS.i === L.steps.length - 1 ? 'Finish lesson' : 'Next') + '</button>';
      setPanel('<button class="back" data-act="goPath">← Path</button>' +
        '<div class="eyebrow">' + esc(st.name) + ' · ' + st.band + '</div>' +
        '<h1 class="h1">' + esc(L.title) + '</h1>' +
        '<p class="lede">' + esc(L.goal) + '</p>' +
        '<div class="dots" aria-label="Step ' + (LS.i + 1) + ' of ' + L.steps.length + '">' + dots + '</div>' +
        '<div class="coach-card"><div class="coach-tag">' + kind + ' · ' + (LS.i + 1) + '/' + L.steps.length + '</div>' + (step.meet && !(Q && Q.live && !Q.done) ? meetCard(step.meet) : '') + (Q && Q.live && !Q.done ? quizBox(Q) : '') + '<p class="coach-text">' + esc(step.text) + '</p>' +
        (step.t === 'collect' ? '<p class="collect-count" id="collect-count"></p>' : '') +
        (step.t === 'pieces' && LS.sq ? '<div class="sq-game"><span class="sq-ask">' + (LS.sq.i < step.targets.length ? 'Tap your <b>' + PIECE_NAME[step.targets[LS.sq.i]] + '</b> <span class="sq-glyph">' + pieceSVG(step.targets[LS.sq.i], 'w', 34) + '</span>' : '✓ All six found') + '</span><span class="quiz-pips">' + step.targets.map(function (t, k) { return '<i class="' + (k < LS.sq.i ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' : '') +
        (step.t === 'squares' && LS.sq ? '<div class="sq-game"><span class="sq-ask">' + (LS.sq.i < step.targets.length ? 'Tap <b class="mono">' + step.targets[LS.sq.i] + '</b>' : '✓ All found') + '</span><span class="quiz-pips">' + step.targets.map(function (t, k) { return '<i class="' + (k < LS.sq.i ? 'on' : '') + '"></i>'; }).join('') + '</span></div>' : '') +
        (Q && Q.done ? quizBox(Q) : '') +
        (step.t === 'move' ? '<p class="turn-note">' + (new Game(step.fen).turn() === 'w' ? 'White' : 'Black') + ' to move</p>' : '') +
        '</div>' +
        '<div id="status" class="status"></div>' +
        '<div class="actions">' + actions + '</div>');
    },
    loadStep: function () {
      var step = LS.L.steps[LS.i]; Replay.stop();
      LS.stepDone = step.t === 'read'; LS.ply = 0; LS.hintUsed = false;
      Voice.say([LS.i === 0 ? V('intro_' + LS.id) : LS.i > 0 && chance(0.4) ? V('lesson_next') : null, { id: 'L-' + LS.id + '-' + LS.i, text: step.text }]);
      if (step.t === 'collect') {
        Collect.start(step, function (stars, moves) {
          LS.stepDone = true; LS.stars = Math.min(LS.stars || 3, stars);
          B3.burst(step.stars[step.stars.length - 1] || 'e4'); Sound.play('good'); Voice.say([V('allstars', 'allstars')]);
          MODES.lesson.render();
          setStatus('<strong>All stars in ' + moves + ' moves.</strong> ' + (stars === 3 ? 'Perfect route!' : 'It can be done in ' + step.par + '. Tap Reset to try a shorter route.'), 'good');
        });
        Collect.refresh();
        return;
      }
      if (step.t === 'pieces') {
        setupBoard(step.fen, { orient: 'w' }); showVisuals(step);
        LS.sq = { i: 0, miss: 0 }; LS.stepDone = false; IX.tap = MODES.lesson.pieceTap; MODES.lesson.render();
        return;
      }
      if (step.t === 'squares') {
        setupBoard(step.fen, { orient: 'w' }); showVisuals(step);
        LS.sq = { i: 0, miss: 0 }; LS.stepDone = false; IX.tap = MODES.lesson.squareTap; MODES.lesson.render();
        setTimeout(function () { if (LS && LS.sq && LS.L.steps[LS.i] === step) Voice.say([M('sq_' + step.targets[0])], true); }, 5200);
        return;
      }
      var g = setupBoard(step.fen, { drop: LS.i === 0 || step.t === 'read', orient: step.t === 'read' && stageOf(LS.id) === 0 ? 'w' : new Game(step.fen).turn() });
      showVisuals(step);
      if (step.demo) { var dTok = LS.demoTok = (LS.demoTok || 0) + 1, dAt = LS.i; setTimeout(function () { playDemo(step, function () { return current === MODES.lesson && LS && LS.i === dAt && LS.demoTok === dTok; }); }, step.demoDelay || 2600); }
      var Q = LS.quizI === LS.i && LS.quiz;
      if (Q && !Q.done) {
        LS.stepDone = false; IX.tap = function () { toast('Watch the arrows first. Your turn comes in a moment.'); };
        var tok = LS.quizTok = (LS.quizTok || 0) + 1, at = LS.i;
        // let the explanation sink in, then clear the drawing and hand the board over
        setTimeout(function () { if (current !== MODES.lesson || !LS || LS.i !== at || LS.quizTok !== tok || Q.done) return; B3.arrows([]); B3.markers('mark', []); B3.markers('moves', []); B3.tags(null); B3.markers('sel', [Q.at]); IX.tap = MODES.lesson.quizTap; Q.live = true; MODES.lesson.render(); Voice.say([{ id: Q.id, text: Q.text }], true); }, 6000);
      }
      if (step.t === 'move') {
        IX.enabled = true;
        IX.canMove = function (c) { return c === g.turn(); };
        IX.onMove = MODES.lesson.onMove;
      }
    },
    pieceTap: function (sq) {
      var step = LS.L.steps[LS.i], Q = LS.sq; if (!Q || step.t !== 'pieces' || Q.i >= step.targets.length) return;
      var want = step.targets[Q.i], p = IX.game && IX.game.get(sq);
      var FACT = { k: 'The king. Protect him: if he is trapped, you lose.', q: 'The queen. Your strongest piece.', r: 'The rook. It looks like a castle tower.', b: 'The bishop. It has a pointed hat with a slit.', n: 'The knight. The horse. It jumps!', p: 'The pawn. You have eight of them.' };
      if (!p || p.color !== 'w' || p.type !== want) { Q.miss++; B3.flash('bad', [sq], 500); Sound.play('bad'); Voice.say([V('piece_wrong')], true); toast(p ? (p.color === 'b' ? 'That is a black piece. Yours are the white ones at the bottom.' : 'That is your ' + PIECE_NAME[p.type] + '. Find the ' + PIECE_NAME[want] + '.') : 'Tap one of your white pieces at the bottom.'); if (Q.miss >= 2) MODES.lesson.pieceHint(want); return; }
      Q.i++; Q.miss = 0; B3.flash('good', [sq], 700); Sound.play('star'); xpPop('✓', sq); toast(FACT[want]); if (Q.i < step.targets.length) Voice.say([V('piece_found_' + want)], true);
      if (Q.i >= step.targets.length) { LS.stepDone = true; IX.tap = null; Sound.play('good'); Voice.say([V('quiz_done')]); MODES.lesson.render(); setStatus('<strong>Correct.</strong> ' + esc(step.done || ''), 'good'); return; }
      MODES.lesson.render();
    },
    pieceHint: function (t) { var g = IX.game, hits = []; 'abcdefgh'.split('').forEach(function (f) { for (var r = 1; r <= 2; r++) { var p = g.get(f + r); if (p && p.type === t) hits.push(f + r); } }); B3.flash('hint', hits, 1500); },
    squareTap: function (sq) {
      var step = LS.L.steps[LS.i], Q = LS.sq; if (!Q || step.t !== 'squares' || Q.i >= step.targets.length) return;
      var want = step.targets[Q.i];
      if (sq !== want) { Q.miss++; Q.missed = true; LS.mistakes += 0.25; B3.flash('bad', [sq], 600); Sound.play('bad'); toast('That is ' + sq + '. Find the ' + want[0] + '-file (lit up in blue), then go up to rank ' + want[1] + '.'); B3.flash('zoneA', [1, 2, 3, 4, 5, 6, 7, 8].map(function (r) { return want[0] + r; }), 2200); if (Q.miss >= 2) B3.flash('zoneB', 'abcdefgh'.split('').map(function (f) { return f + want[1]; }), 2200); return; }
      Q.i++; Q.miss = 0; B3.flash('good', [sq], 700); Sound.play('star'); xpPop('✓', sq);
      if (Q.i >= step.targets.length) { LS.stepDone = true; IX.tap = null; Sound.play('good'); Voice.say([V('quiz_done')]); MODES.lesson.render(); setStatus('<strong>Correct.</strong> ' + esc(Q.missed ? 'All six found. Next time try it without a miss.' : step.done || ''), 'good'); return; }
      MODES.lesson.render(); Voice.say([M('sq_' + step.targets[Q.i])]);
    },
    quizTap: function (sq) {
      var Q = LS && LS.quiz; if (!Q || Q.done) return;
      if (sq === Q.at) { toast('That is where the ' + PIECE_NAME[Q.type] + ' stands. Tap a square it can move to.'); return; }
      if (Q.found.indexOf(sq) >= 0) return;
      if (Q.reach.indexOf(sq) < 0) { LS.mistakes += 0.5; B3.flash('bad', [sq], 500); Sound.play('bad'); toast(MOVE_RULE[Q.type]); if (chance(0.5)) Voice.say([V('quiz_wrong')], true); return; }
      Q.found.push(sq); B3.arrows([]); B3.markers('mark', []); B3.markers('good', Q.found.slice()); Sound.play('star'); xpPop('✓', sq);
      if (Q.found.length >= Q.need) {
        Q.done = true; LS.stepDone = true; IX.tap = null; addXP(5);
        B3.markers('good', []); B3.markers('hint', Q.reach); B3.markers('sel', [Q.at]); Sound.play('good'); Voice.say([V('quiz_done')]);
        setTimeout(function () { if (LS && LS.quiz === Q) B3.markers('hint', []); }, 2200);
      } else Voice.say([V('quiz_right')], true);
      MODES.lesson.render();
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
    LS.lineTok = (LS.lineTok || 0) + 1;
    if (LS.i < LS.L.steps.length - 1) { LS.i++; LS.stepDone = LS.L.steps[LS.i].t === 'read'; MODES.lesson.render(); MODES.lesson.loadStep(); return; }
    var stars = LS.mistakes === 0 ? 3 : LS.mistakes <= 2 ? 2 : 1;
    if (LS.hintsTotal) stars = Math.min(stars, LS.hintsTotal > 2 ? 1 : 2);
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
      '<p class="muted small">' + (stars === 3 ? 'Flawless: no slips, no hints.' : 'Not bad: ' + [LS.mistakes ? Math.ceil(LS.mistakes) + ' slip' + (LS.mistakes > 1 ? 's' : '') : '', LS.hintsTotal ? LS.hintsTotal + ' hint' + (LS.hintsTotal > 1 ? 's' : '') : '', LS.stars && LS.stars < 3 ? 'a star route with extra moves' : ''].filter(Boolean).join(', ') + '. Repeat it later for 3 stars.') + '</p>' +
      flowCta(LS.id) + whatNext(LS.id, nl, wasLocked) +
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
    var ms = MISSIONS[id], msDone = coachMissionsDone(id);
    if (ms) cards.push({ k: 'mission', ico: 'k', t: msDone >= ms.length ? 'Coach missions (replay)' : 'Coach missions: ' + ms.map(function (m) { return m.title; }).slice(0, 2).join(', ') + '…', s: msDone ? msDone + ' of ' + ms.length + ' done. Beat the coach in quick scenarios that use what you just learned.' : 'Three quick scenarios with me, easy to hard. Use what you just learned to beat them.', act: 'data-act="mission" data-l="' + id + '" data-i="' + Math.min(msDone, ms.length - 1) + '"' });
    if (!ms && !isLocked('play')) cards.push({ k: 'play', ico: 'k', t: st ? 'Play it out vs the coach' : 'Play a game vs the coach', s: st ? 'Same position, real opponent. Use what you just learned.' : 'A relaxed game at your level, with tips on every move.', act: st ? 'data-act="lessonPlay" data-fen="' + esc(st.fen) + '"' : 'data-act="wnPlay"', isNew: playNew });
    cards.push({ k: 'puzzle', ico: 'n', t: theme === 'all' ? 'Solve a few puzzles' : 'Puzzles: ' + theme, s: 'Spot the idea in real positions. Quick wins, rating points.', act: 'data-act="wnPuzzles" data-t="' + theme + '"' });
    var chal = CHALLENGES.filter(function (c) { return c.after === id && !S.challenges[c.id]; })[0];
    if (chal) cards.push({ k: 'challenge', ico: 'q', t: 'Challenge: ' + chal.title, s: chal.text.split('. ')[0].replace(/\.$/, '') + '. Play it against the engine.', act: 'data-act="challenge" data-id="' + chal.id + '"' });
    var stB = bossFor(stageOf(id));
    if (stB && stageComplete(stageOf(id)) && !S.bosses[stB.id]) cards.push({ k: 'boss', ico: stB.icon, t: 'Boss battle: ' + stB.name, s: 'Stage done. Now beat its boss in a real game.', act: 'data-act="boss" data-id="' + stB.id + '"' });
    var ns = nextStop();
    if (ns && (stageOf(id) > 0 || lessonDone('l-firstmoves')) && (nDone >= 2 || !isLocked('openings'))) cards.push({ k: 'opening', ico: 'b', t: ns.def ? 'Defend against the ' + ns.base.name : 'Opening: ' + ns.name, s: ns.def ? ns.idea.split('. ')[0].replace(/\.$/, '') + '.' : 'Every move explained, then drill it from memory.', act: 'data-act="openOp" data-id="' + ns.id + '"', isNew: opNew });
    else if (!isLocked('openings') && nDone >= 3) cards.push({ k: 'opening', ico: 'b', t: 'Learn an opening', s: 'Your first moves, with the reason behind each one.', act: 'data-act="wnOpening"', isNew: opNew });
    if (nl && nl !== id) cards.push({ k: 'lesson', ico: 'r', t: 'Next lesson', s: LESSONS[nl].title, act: 'data-act="lesson" data-id="' + nl + '"' });
    // Variety: after two lessons in a row, nudge toward doing instead of reading
    var pref = lessonsToday >= 2 || nDone % 2 === 1 ? (cards[0].k === 'play' ? 'play' : 'puzzle') : 'lesson';
    if (playNew) pref = 'play'; else if (opNew) pref = 'opening';
    if (cards.some(function (c) { return c.k === 'boss'; })) pref = 'boss'; else if (cards.some(function (c) { return c.k === 'challenge'; }) && lessonsToday >= 1) pref = 'challenge';
    if (ms && msDone < ms.length) pref = 'mission';
    if (!cards.some(function (c) { return c.k === pref; })) pref = cards[0].k;
    var fl = flowNext(id);
    if (fl) { cards = cards.filter(function (c) { return c.k !== fl.k && !(fl.k === 'drill' && c.k === 'puzzle'); }); pref = null; }
    if (!cards.length) return '';
    cards.sort(function (a, b) { return (b.k === pref) - (a.k === pref); });
    return '<div class="sect-head"><h2>' + (fl ? 'Or try something else' : 'What next?') + '</h2><span class="muted small">pick any, switch anytime</span></div><div class="wn-grid' + (fl ? ' quiet' : '') + '">' + cards.map(function (c) {
      return '<button class="wn-card' + (c.k === pref ? ' pref' : '') + '" ' + c.act + '><span class="wn-ico">' + pieceSVG(c.ico, 'w', 26) + '</span><span class="wn-txt"><b>' + esc(c.t) + (c.isNew ? ' <em class="new-tag">New</em>' : '') + (c.k === pref ? ' <em class="rec-tag">Suggested</em>' : '') + '</b><span>' + esc(c.s) + '</span></span></button>';
    }).join('') + '</div>';
  }
  ACT.wnPlay = function () { go('play'); };
  ACT.wnPuzzles = function (d) { go('puzzles', { theme: d.t || 'all' }); };
  ACT.wnOpening = function () { go('openings'); };
  ACT.lessonPlay = function (d) { var fen = d.fen; go('play', { fen: fen, color: new Game(fen).turn(), from: 'lesson position' }); };
  ACT.quizShow = function () { var step = LS && LS.L.steps[LS.i]; if (!step) return; showVisuals(step); setTimeout(function () { if (LS && LS.quiz && !LS.quiz.done) { B3.arrows([]); B3.markers('mark', []); B3.markers('moves', []); B3.tags(null); B3.markers('sel', [LS.quiz.at]); } }, 1800); };
  ACT.quizSkip = function () { var Q = LS && LS.quiz; if (!Q) return; Q.done = true; Q.skipped = true; LS.stepDone = true; IX.tap = null; B3.markers('hint', Q.reach); ACT.nextStep(); };
  ACT.demoAgain = function () { var step = LS && LS.L.steps[LS.i]; if (!step || !step.demo) return; var tok = LS.demoTok = (LS.demoTok || 0) + 1, at = LS.i; B3.setPosition(step.fen); showVisuals(step); Voice.say([V('demo_watch')], true); setTimeout(function () { playDemo(step, function () { return current === MODES.lesson && LS && LS.i === at && LS.demoTok === tok; }); }, 700); };
  ACT.resetStep = function () { if (LS) { LS.lineTok = (LS.lineTok || 0) + 1; LS.stepDone = LS.L.steps[LS.i].t === 'read'; MODES.lesson.render(); MODES.lesson.loadStep(); } };
  function lessonMins(L) { return L.minutes || Math.max(2, Math.round(L.steps.length * 1.2)); }
  ACT.hint = function () {
    var step = LS.L.steps[LS.i]; LS.hintsTotal = (LS.hintsTotal || 0) + 1;
    if (step.t === 'pieces' && LS.sq) { var pt = step.targets[LS.sq.i]; if (pt) { MODES.lesson.pieceHint(pt); setStatus('Look at the flashing square: that is your ' + PIECE_NAME[pt] + '.'); LS.hintUsed = true; } return; }
    if (step.t === 'squares' && LS.sq) { var w = step.targets[LS.sq.i]; if (w) { B3.flash('hint', [w], 1500); setStatus('Here it is: ' + w + '. Files are letters along the bottom, ranks are numbers up the side.'); LS.hintUsed = true; } return; }
    if (step.t === 'collect') {
      // point at a real move: a star in one jump if there is one, otherwise a square that reaches a star next
      var c = IX.collect, pc = step.piece;
      if (c && c.left && c.left.length) {
        var now = Collect.reach(pc, c.at), hit = now.filter(function (q) { return c.left.indexOf(q) >= 0; })[0], via = null;
        if (!hit) via = now.filter(function (q) { return Collect.reach(pc, q).some(function (z) { return c.left.indexOf(z) >= 0; }); })[0];
        var to = hit || via;
        if (to) { B3.arrows([[c.at, to, 'g']]); B3.flash('hint', [to], 2200); setStatus(hit ? 'The ' + PIECE_NAME[pc] + ' can grab the star on ' + to + ' right now.' : 'No star in one move. Go to ' + to + ' first: from there a star is one move away.'); LS.hintUsed = true; return; }
      }
      setStatus('Click the piece to see where it can go. Plan so each move lands on a star or sets up the next one.'); return;
    }
    var u = step.sol[LS.ply];
    if (LS.hintUsed) { B3.arrows([[u.slice(0, 2), u.slice(2, 4), 'g']]); setStatus('The arrow shows the move.'); }
    else { B3.markers('hint', [u.slice(0, 2)]); setStatus(esc(step.hint || 'Look at the highlighted piece.')); LS.hintUsed = true; }
    LS.mistakes += 0.5;
  };
  ACT.playLine = function () {
    var step = LS.L.steps[LS.i], my = LS.i, tok = LS.lineTok = (LS.lineTok || 0) + 1;
    var g = setupBoard(step.fen, {});
    var i = 0;
    setStatus('Watch the plan unfold…');
    (function nextMove() {
      if (i >= step.line.length || current !== MODES.lesson || LS.i !== my || LS.lineTok !== tok) return;
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
      return d._o || (d._o = { id: id, base: base, def: true, name: d.name, eco: d.eco || base.eco, side: d.side, family: base.family, level: base.level, gambit: false, idea: d.idea, moves: d.moves, notes: d.notes, vp: 'D-' + base.id });
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
    return '<button class="jlesson jboss' + (beat ? ' done' : '') + (open ? '' : ' locked') + '" data-act="boss" data-id="' + b.id + '" ' + (open || beat ? '' : 'disabled') + '>' + bossAvatar(b, 30) + '<span class="jl-title"><em class="op-kind boss">Boss</em> ' + esc(b.name) + '</span><span class="jl-meta">' + (beat ? '✓ Beaten' : !open ? '🔒 after ' + need + ' more' : stageCleared(i) ? 'Beat for the badge' : 'Beat to clear') + '</span></button>';
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
        var alt = bookMoves(g.fen()), altName = alt && alt[mv.from + mv.to];
        if (altName) {
          Sound.play('move');
          MODES.opening.renderDrill('<strong>Also a real move</strong>' + (altName !== 'many' && altName !== o.name && altName !== (o.base && o.base.name) ? ' (' + esc(altName) + ')' : '') + '. This drill follows the main line of the ' + esc(o.base ? o.base.name : o.name) + ': try the move it plays here. No mistake counted.', '');
          IX.enabled = true; return;
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
    if (beginnerMode() || S.puzzle.rating < 400) { // only pieces and ideas already taught
      var ok = taughtPieces(), easy = pool.filter(function (p) { return p.r <= Math.max(300, S.puzzle.rating + 150) && (p.theme !== 'mate' || lessonDone('l-check')) && p.theme !== 'endgame' && puzzlePieces(p).every(function (t) { return ok[t]; }); });
      pool = easy;
    }
    // most puzzles come from ideas the player has already learned in lessons
    if (PZ.theme === 'all' && !beginnerMode() && Math.random() < 0.7) {
      var learned = {}; Object.keys(LESSON_THEME).forEach(function (id) { if (lessonDone(id) && LESSON_THEME[id] !== 'all') learned[LESSON_THEME[id]] = 1; });
      var mine = pool.filter(function (p) { return learned[p.theme] && Math.abs(p.r - S.puzzle.rating) < 400; }); if (mine.length >= 6) pool = mine;
    }
    S.pzRecent = S.pzRecent || [];
    var fresh = pool.filter(function (p) { return S.pzRecent.indexOf(p.id) < 0; }); if (fresh.length) pool = fresh;
    var unsolved = pool.filter(function (p) { return !S.puzzle.solved[p.id]; });
    var src = unsolved.length ? unsolved : pool.slice().sort(function (a, b) { return (S.puzzle.solved[a.id] || 0) - (S.puzzle.solved[b.id] || 0); }).slice(0, 6);
    var R = S.puzzle.rating;
    src = src.slice().sort(function (a, b) { return Math.abs(a.r - R) - Math.abs(b.r - R); });
    var top = src.slice(0, Math.min(3, src.length));
    var choice = top[Math.floor(Math.random() * top.length)];
    if (PZ.cur && choice && choice.id === PZ.cur.p.id && src.length > 1) choice = src[1];
    return choice;
  }
  // which piece types a beginner has met in lessons; kings are always fine
  function taughtPieces() {
    var t = { k: 1 };
    if (lessonDone('l-rook')) t.r = 1; if (lessonDone('l-bishop-queen')) { t.b = 1; t.q = 1; } if (lessonDone('l-knight')) t.n = 1; if (lessonDone('l-king-pawn')) t.p = 1;
    if (stageCleared(0)) { t.r = t.b = t.q = t.n = t.p = 1; }
    return t;
  }
  function puzzlePieces(p) { if (p.pieces) return p.pieces; var f = puzzleFen(p).split(' ')[0].toLowerCase(), out = []; 'pnbrq'.split('').forEach(function (c) { if (f.indexOf(c) >= 0) out.push(c); }); return out; }
  // one plain sentence about why a puzzle move is wrong
  function puzzleWhyWrong(g, mv, p) {
    var t = new Game(g.fen()), r = t.move(mv); if (!r) return '';
    var name = PIECE_NAME[r.piece], hit = t.moves().filter(function (x) { return x.to === r.to && x.captured; })[0];
    if (p.theme === 'mate' && t.inCheck()) return 'That is check, but the king can still escape or be saved. Find the check that leaves no way out.';
    if (p.theme === 'mate') return 'That is not even check. Checkmate always starts with a check: try every check you have.';
    if (hit && VAL[r.piece] > (r.captured ? VAL[r.captured] : 0)) return 'After that, they can take your ' + name + ' with ' + hit.san.replace(/[+#]/g, '') + '.';
    if (p.theme === 'hanging' && !r.captured) return 'That does not take anything. Look for an enemy piece you can capture for free.';
    if (t.inCheck()) return 'A check, but it does not win anything here.';
    return 'Look for checks first, then captures.';
  }
  function ratingBand(r) { return r < 400 ? 'Beginner' : r < 800 ? 'Novice' : r < 1200 ? 'Club player' : r < 1600 ? 'Strong club' : r < 2000 ? 'Advanced' : 'Expert'; }
  MODES.puzzles = {
    label: 'Puzzle trainer',
    enter: function (arg) { if (arg && arg.theme) PZ.theme = arg.theme; MODES.puzzles.next(); },
    next: function () {
      Replay.stop(); var p = pickPuzzle();
      if (!p) { setupBoard(fenOf('r', 'd4'), { orient: 'w' }); setPanel('<div class="eyebrow">Puzzles</div><h1 class="h1">Your first puzzles are almost ready</h1><p class="lede">Puzzles use the pieces you have learned. Finish <b>The Rook</b> lesson and your first rook puzzles unlock right away.</p><div class="actions"><button class="btn primary wide" data-act="startNext">Continue learning →</button></div>'); return; }
      S.pzRecent = (S.pzRecent || []).concat([p.id]).slice(-12); save();
      var fen = puzzleFen(p);
      PZ.cur = { p: p, fen: fen, ply: 0, failed: false, done: false, hinted: 0 };
      var side = new Game(fen).turn(), flipped = PZ.lastSide && PZ.lastSide !== side; PZ.lastSide = side;
      var g = setupBoard(fen, { drop: true, orient: side });
      if (flipped) toast(side === 'b' ? 'You play Black this time. The board turned so your pieces are at the bottom.' : 'You play White again. The board turned back.');
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
        '<p class="coach-text"><strong>' + (turn === 'w' ? 'White' : 'Black') + ' to move.</strong> ' + (beginnerMode() || S.puzzle.rating < 800 ? esc(drillAsk(p, null)) : p.mate ? 'Find mate in ' + p.mate + '.' : 'Find the best move.') + '</p>' +
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
      if (!ok && p.mate > 1 && !c.altChecked) {
        IX.enabled = false;
        return altMate(t, p.mate - Math.floor(c.ply / 2)).then(function (yes) {
          if (yes) return applyMove(g, mv).then(function () { c.alt = true; MODES.puzzles.win(mv.to); });
          c.altChecked = true; var r = MODES.puzzles.onMove(mv, uci); c.altChecked = false; return r;
        });
      }
      if (!ok) {
        Sound.play('bad'); B3.flash('bad', [mv.to]);
        var d = !c.failed ? MODES.puzzles.grade(false) : 0; Voice.say([V('puzzlemiss', 'puzzlemiss')]);
        c.failed = true; c.lastWrong = { fen: g.fen(), uci: uci, san: (new Game(g.fen()).move(mv) || {}).san || uci };
        MODES.puzzles.render('<strong>Not the move.</strong> ' + esc(puzzleWhyWrong(g, mv, p)) + ' ' + (d ? 'Rating ' + d + '. ' : '') + 'Try again, or ask for a hint. <button class="link" data-act="pzWhy">▶ Show why it fails</button>', 'bad');
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
      if (c.failed || c.hinted) { today().puzzles++; S.puzzle.solved[c.p.id] = Date.now(); save(); }
      Voice.say([V('solved', 'solved'), { id: 'P-' + c.p.id, text: c.p.explain }]);
      B3.burst(sq); B3.markers('good', [sq]); Sound.play('good');
      MODES.puzzles.render('<strong>Solved!</strong> ' + (c.alt ? 'Your move forces mate too. ' : '') + (d ? 'Rating +' + d + '.' : c.hinted ? 'Solved with a hint, so no rating points this time.' : c.failed ? 'Solved after a miss, so no rating points this time.' : ''), 'good');
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
      var offered = a.reply && a.reply.to === res.to && a.reply.captured && VAL[res.piece] >= 3 && VAL[res.piece] - (res.captured ? VAL[res.captured] : 0) >= 2;
      if (offered && a.playedScore >= 150 && a.bestScore < 900 && (a.secondScore == null || a.bestScore - a.secondScore >= 80)) return { c: CLASS.brilliant };
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
        '<button class="test-out an-entry" data-act="goAnalyze"><span class="to-ico" aria-hidden="true">🔍</span><span><b>Played on chess.com?</b><span>Bring the game here: I check every move and show you what to fix.</span></span><span class="to-go" aria-hidden="true">→</span></button>' +
        (!lessonDone('l-firstmoves') && S.band < 800 ? '<button class="test-out an-entry" data-act="lesson" data-id="l-firstmoves"><span class="to-ico" aria-hidden="true">♟</span><span><b>New to full games?</b><span>Do "Your First Ten Moves" first: 4 minutes, and you will know how to start every game.</span></span><span class="to-go" aria-hidden="true">→</span></button>' : '') +
        '<div class="sect-head"><h2>Opponent</h2></div>' +
        '<div class="levels">' + COACH_LEVELS.map(function (l, n) { var mine = levelForRating(S.puzzle.rating), mi = COACH_LEVELS.indexOf(levelById(mine)); return '<button class="level ' + (c.level === l.id ? 'on' : '') + '" data-act="setLevel" data-id="' + l.id + '"><span class="lv-elo">~' + l.elo + (l.id === mine ? ' <em class="lv-tag">' + (S.puzzle.rating < 500 ? 'Start here' : 'Your level') + '</em>' : n === mi + 1 ? ' <em class="lv-tag up">Next challenge</em>' : n < mi ? ' <em class="lv-tag easy">Warm-up</em>' : '') + '</span><span class="lv-name">' + l.name + '</span><span class="lv-blurb">' + l.blurb + '</span></button>'; }).join('') + '</div>' +
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
        PL.devAt = at; PL.devAt0 = at;
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
        (PL.over && PL.specActions ? '<div class="actions over-actions">' + PL.specActions + '</div>' : PL.over ? '<div class="actions over-actions"><button class="btn primary" data-act="reviewGame">★ Review this game</button>' + (PL.bookSaid ? (function () { var L = PL.book, id = L.def ? L.id : DEFENCES[L.id] ? 'def-' + L.id : L.id, t = lineById(id); return '<button class="btn" data-act="openOp" data-id="' + id + '">' + (t.def && !L.def ? 'Learn: ' + esc(t.name) : L.def ? 'Study how to meet the ' + esc(L.base.name) : 'Study the ' + esc(t.name)) + '</button>'; })() : '') + '<button class="btn" data-act="rematch">Rematch</button>' + (PL.result === 'win' && nextLevel(PL.level) ? '<button class="btn" data-act="harder">Try ' + nextLevel(PL.level).name + ' (~' + nextLevel(PL.level).elo + ')</button>' : PL.result === 'loss' && prevLevel(PL.level) ? '<button class="btn" data-act="easier">Try ' + prevLevel(PL.level).name + ' (~' + prevLevel(PL.level).elo + ')</button>' : '') + '<button class="btn ghost" data-act="newGame">New setup</button></div>' : ''));
      var sc = $('.score'); if (sc) sc.scrollTop = sc.scrollHeight;
    },
    say: function (tag, html, cls, once) { PL.feed.push({ tag: tag, html: html, cls: cls || '', once: !!once }); },
    // Tell the player which line the coach is playing, once it is recognisable (the coach's 2nd book move)
    bookNote: function (g) {
      var L = PL.book, h = g.history(), n = h.length, cl = function (x) { return x.replace(/[+#!?]/g, ''); };
      if (!L || PL.bookSaid || n < 3) return;
      var still = allLines().filter(function (o) { return o.moves.length > n - 1 && h.every(function (m, i) { return cl(m) === cl(o.moves[i]); }); });
      var names = {}; still.forEach(function (o) { names[o.base ? o.base.name : o.name] = 1; });
      if (Object.keys(names).length > 1) return; // e.g. 1...c5 could still be the Dragon or the Najdorf
      PL.bookSaid = true;
      var trap = !L.def && (L.family === 'Traps' || L.gambit);
      MODES.play.say('Opening', L.def ? 'Your moves so far match the start of the <strong>' + esc(L.base.name) + '</strong>. Watch how I meet it: this is ' + esc(L.name) + ', and it is in Openings with every move explained.'
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
            MODES.play.say('Threat', t.kind === 'mate' ? 'Your opponent threatens <strong>checkmate</strong> on ' + t.to + '. Deal with it first.' : 'Your ' + PIECE_NAME[t.piece] + ' on ' + t.to + ' is under attack and not safe.', 'warn', true);
            MODES.play.render();
          });
        }
      } else {
        if (PL.judging) return;
        if (PL.spec && PL.spec.kind === 'challenge' && PL.spec.c.goal !== 'survive' && PL.chN >= PL.spec.c.limit) { MODES.play.finish('loss', 'Out of moves.'); return; }
        IX.enabled = false; PL.thinking = true; MODES.play.render();
        var t0 = Date.now(), fen = g.fen(), bm = bookMove(g), slip = PL.spec && PL.spec.kind === 'battle' && !PL.devDone && g.history().length >= PL.devAt;
        var job = slip ? Eng.call('mistake', fen, g.history().length >= PL.devAt0 + 4).then(function (m) { if (m) return { move: m, score: null, slip: true }; PL.devAt += 2; return bm ? { move: bm, score: null, book: true } : Eng.call('pickMove', fen, PL.level, prevFens(PL.startFen, g.history())); })
          : bm ? Promise.resolve({ move: bm, score: null, book: true }) : teachSlip(g) ? Promise.resolve({ move: teachSlip(g, true), score: null, teach: true }) : Eng.call('pickMove', fen, PL.level, prevFens(PL.startFen, g.history()));
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
              if (!PL.spec && !r.book) MODES.play.onPurpose(g);
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
      PL.retryArrow = null; PL.feed = PL.feed.filter(function (f) { return !f.once; });
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
        if (sp && sp.kind === 'battle' && !PL.devDone && !PL.leftBook) {
          var hh = g.history(), cl = function (x) { return x.replace(/[+#!?]/g, ''); };
          if (hh.some(function (m, i) { return !sp.line.moves[i] || cl(m) !== cl(sp.line.moves[i]); })) { PL.leftBook = true; toast('You left the ' + (sp.line.base ? sp.line.base.name : sp.line.name) + '. The coach will still slip soon.'); }
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
      PL.log[idx] = { drop: c.positive ? 0 : Math.max(0, winChance(a.bestScore) - winChance(a.playedScore)) * 100, cls: c.cls, label: c.label, loss: c.positive ? Math.min(a.loss, 10) : a.loss, best: a.best, bestSan: a.bestSan, key: c.key, fen: fenBefore, uci: uci, san: res.san, reply: a.replySan };
      if (c.key === 'brilliant') Badges.award('brilliant');
      var style = PL.style, quiet = style === 'quiet', keyOnly = style === 'key';
      var ply = idx + 1, best = a.best;
      setEval(PL.color === 'w' ? a.playedScore : -a.playedScore, true);
      MODES.play.trackSwing(a.playedScore);
      var html = '<strong>' + esc(res.san) + '</strong> ', spoken;
      if (c.positive) {
        var praise = '';
        if (c.key === 'book') praise = gr.opening === 'many' || gr.opening === 'a well-known opening' ? 'A standard opening move that strong players use.' : 'Straight out of the ' + esc(gr.opening) + ', a known opening.';
        else if (c.key === 'brilliant') praise = 'A real sacrifice, and it works! The piece is offered but taking it does not help them.';
        else if (c.key === 'great') praise = 'The only move that keeps your position together. Well found.';
        else if (res.flags === 'k' || res.flags === 'q') praise = 'King tucked away. Good habit.';
        else if (ply <= 16 && (res.piece === 'n' || res.piece === 'b') && /[18]$/.test(res.from)) praise = 'Developing a piece. Exactly what the opening wants.';
        else if (res.captured) praise = 'Good capture.';
        else if (/[+#]/.test(res.san)) praise = 'Strong check.';
        else if (c.key !== 'best' && a.bestSan && a.bestSan !== res.san) praise = 'Also strong was ' + esc(a.bestSan) + '.';
        if (!praise || c.key === 'book') praise = (praise ? praise.replace(/ That is (opening )?theory\./, '') + ' ' : '') + moveReason(res, ply, a, fenBefore, uci);
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
      var accs = mine.map(function (l) { return Math.max(0, Math.min(100, 103.17 * Math.exp(-0.04354 * (l.drop || 0)) - 3.17)); });
      var mean = accs.reduce(function (s, x) { return s + x; }, 0) / (accs.length || 1), harm = accs.length / accs.reduce(function (s, x) { return s + 1 / Math.max(5, x); }, 0);
      var acc = mine.length ? Math.round((mean + harm) / 2) : null;
      var count = function (k) { return mine.filter(function (l) { return l.label === k; }).length; };
      S.games.push({ d: dayKey(), level: PL.level.id, result: result, acc: acc, moves: PL.g.history().length });
      if (S.games.length > 200) S.games.shift();
      var plies = PL.g.history().length, real = plies >= 20 || result !== 'loss' || /Checkmate/.test(msg) || beginnerMode();
      if (real) today().game = true;
      var GR = S.grating || Math.max(100, S.band), E = 1 / (1 + Math.pow(10, (PL.level.elo - GR) / 400)), sc = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
      PL.gdelta = plies >= 6 && (PL.startFen === Game.START || plies >= 20) ? Math.round(32 * (sc - E)) : 0; S.grating = Math.max(100, GR + PL.gdelta);
      addXP(result === 'win' ? 60 : 30); save();
      var fullGame = PL.startFen === Game.START || plies >= 20;
      if (result === 'win' && fullGame) Badges.award('beat_' + PL.level.id);
      if (PL.toldComeback && result === 'win') Badges.award('comeback');
      PL.result = result; PL.acc = acc;
      if (result === 'win') { Sound.play('win'); B3.burst(kingSq(PL.g) || 'e4'); confetti(); }
      var endLine = result === 'win' ? 'win' : result === 'draw' ? 'draw' : /Checkmate/.test(msg) ? 'loss' : null;
      var easyWin = result === 'win' && !PL.spec && (PL.level.id === 'novice' || PL.level.id === 'club');
      if (easyWin) { Voice.say([V('coach_lost_easy', 'win')]); MODES.play.say('Coach Leo', 'You beat me! At ' + PL.level.name + ' level I play like a ~' + PL.level.elo + ' player on purpose: I leave pieces loose and miss threats so you can practise punishing them. ' + (nextLevel(PL.level) ? 'When this feels easy, try ' + nextLevel(PL.level).name + '.' : ''), 'good'); }
      else if (endLine) Voice.say([V(endLine, endLine)]);
      else Voice.say([V('resign')]);
      if (PL.spec && PL.spec.kind === 'boss') MODES.play.bossEnd(result);
      Celebrate.flush();
      MODES.play.say('Game over', esc(msg) + ' Coach-game rating <strong>' + S.grating + '</strong> (' + (PL.gdelta >= 0 ? '+' : '') + PL.gdelta + ').' + (!real ? ' Games shorter than 10 moves do not count for the daily mission.' : '') + (acc != null ? ' Accuracy <strong>' + acc + '%</strong>.<span class="summary-row">' + [['Brilliant', 'brill'], ['Great move', 'great'], ['Best', 'good'], ['Excellent', 'good'], ['Good', 'good'], ['Book move', 'book'], ['Could be better', 'warn'], ['Mistake', 'warn'], ['Blunder', 'bad']].filter(function (x) { return count(x[0]); }).map(function (x) { return '<span class="sum-chip ' + x[1] + '">' + count(x[0]) + ' ' + x[0] + '</span>'; }).join('') + '</span>' : '') + (count('Blunder') ? ' Review the red moves: most games under 1500 are decided by them.' : ''), result === 'win' ? 'good' : result === 'loss' ? 'bad' : '');
      MODES.play.render();
    },
    leave: function () { PL = null; }
  };
  // Novice coach in teaching mode: now and then leave a minor piece or rook loose on purpose, so a beginner
  // gets real chances to practise winning material (announced by onPurpose right after).
  function freeTakes(g) {
    var foe = g.side ^ 8, VALS = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    return g.moves().filter(function (m) { return m.captured && m.captured !== 'p' && m.captured !== 'q' && (!g.attacked(Game.sqIdx(m.to), foe) || VALS[m.captured] > VALS[m.piece]); });
  }
  function teachSlip(g, pick) {
    if (!pick) {
      if (!PL || PL.spec || PL.level.id !== 'novice' || PL.style !== 'teach' || g.history().length < 8 || (PL.slips || 0) >= 3) return false;
      if (g.history().length - (PL.lastSlip || 0) < 10 || !chance(0.3)) return false;
    }
    var cands = g.moves().filter(function (m) {
      if (m.piece === 'k' || m.piece === 'q' || m.captured) return false;
      g.move({ from: m.from, to: m.to, promotion: m.promotion }); var ok = !g.inCheck() && !g.gameOver() && freeTakes(g).length === 1 && freeTakes(g)[0].to === m.to; g.undo(); return ok;
    });
    if (!pick) { PL.slipPick = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null; return !!PL.slipPick; }
    var m = PL.slipPick; PL.slipPick = null; PL.slips = (PL.slips || 0) + 1; PL.lastSlip = g.history().length;
    return { from: m.from, to: m.to, promotion: m.promotion };
  }
  // At the easy levels the coach blunders by design. Say so, so it reads as training instead of a broken bot.
  MODES.play.onPurpose = function (g) {
    if (!PL || (PL.level.id !== 'novice' && PL.level.id !== 'club') || PL.style === 'quiet' || (PL.purposeN || 0) >= 3) return;
    var VALS = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    var free = freeTakes(g).sort(function (a, b) { return VALS[b.captured] - VALS[a.captured]; })[0];
    if (!free) return;
    PL.purposeN = (PL.purposeN || 0) + 1;
    var where = PL.level.id === 'novice' ? 'my ' + PIECE_NAME[free.captured] + ' on ' + free.to : 'something';
    PL.feed = PL.feed.filter(function (f) { return f.tag !== 'On purpose'; });
    MODES.play.say('On purpose', 'I left ' + where + ' loose on purpose. At ' + PL.level.name + ' level I make beginner mistakes so you can practise winning material. ' + (PL.level.id === 'novice' ? 'Can you take it safely?' : 'Can you find it?'), 'warn', true);
    if (PL.purposeN === 1) Voice.say([V('coach_onpurpose')], true);
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
  function prevLevel(l) { var i = COACH_LEVELS.indexOf(l); return i > 0 ? COACH_LEVELS[i - 1] : null; }
  ACT.easier = function () { var n = prevLevel(PL.level); if (n) { S.coach.level = n.id; save(); } ACT.rematch(); };
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
  ACT.pResign = function () {
    if (!PL || PL.over || !PL.g) return;
    var m = $('#modal'); m.classList.remove('intro');
    m.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true"><div class="eyebrow">Resign</div><h1 class="h1">Give up this game?</h1><p class="lede">It counts as a loss.</p><div class="actions"><button class="btn primary" data-rs="no">Keep playing</button><button class="btn danger" data-rs="yes">Resign</button></div></div>';
    m.hidden = false;
    m.onclick = function (e) { var b = e.target.closest('[data-rs]'); if (!b && e.target !== m) return; m.hidden = true; m.onclick = null; if (b && b.dataset.rs === 'yes' && PL && !PL.over) MODES.play.finish('loss', 'You resigned.'); };
  };
  ACT.pGuardBack = function () { if (!PL || !PL.guard) return; PL.guard = null; PL.feed.pop(); MODES.play.render(); IX.enabled = true; };
  ACT.pGuardGo = function () { if (!PL || !PL.guard) return; var gd = PL.guard; PL.guard = null; PL.feed.pop(); PL.guardOk = true; IX.enabled = false; MODES.play.userMove(gd.mv, gd.uci); PL.guardOk = false; };
  ACT.pUndo = function () {
    if (!PL || !PL.g || PL.thinking || PL.over) return;
    if (PL.spec) { toast('No takebacks in arena games.'); return; }
    var g = PL.g, n = 0;
    while (g.history().length && n < 2) { g.undo(); n++; if (g.turn() === PL.color) break; }
    PL.log.length = g.history().length; PL.minEval = null;
    deselect(); B3.sync(g.fen()); B3.markers('last', []); B3.arrows([]); showCheck(g);
    MODES.play.say('Takeback', 'Position restored. Find a better move.', '', true);
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
    MODES.play.say('Retry', 'Rewound to before your move. ' + (lg && lg.bestSan ? 'Try <strong>' + esc(lg.bestSan) + '</strong>, shown by the green arrow.' : ''), 'good', true);
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
      var hg = new Game(g.fen()), hm = hg.move({ from: r.move.from, to: r.move.to, promotion: r.move.promotion || undefined });
      MODES.play.say('Hint', 'Try your ' + PIECE_NAME[r.move.piece] + ' from ' + r.move.from + ' to ' + r.move.to + ' (the arrow). ' + (hm ? 'Why: ' + moveReason(hm, g.history().length + 1, null, g.fen(), '') : ''), 'good', true);
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
      setPanel((r.back === 'analyze' ? '<button class="back" data-act="goAnalyze">← Analyze another game</button>' : '<button class="back" data-act="goPlay">← New game</button>') + '<div class="eyebrow">Game review · vs ' + esc(r.level.name) + '</div>' +
        '<h1 class="h1">' + esc(r.over || 'Game review') + '</h1>' +
        '<div class="rv-hero"><div><div class="muted small">Your accuracy</div><div class="rating">' + (r.acc != null ? r.acc + '%' : '–') + '</div></div><div class="summary-row">' + chips + '</div></div>' +
        (r.report ? reportHtml(r) : '') +
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

  // ================= Coach missions: short hands-on scenarios right after a lesson =================
  var MS = null;
  var GOAL_TXT = { sequence: 'Play the written moves', check: 'Give check', capture: 'Win pieces', captureAll: 'Take every piece', mate: 'Checkmate', promote: 'Make a queen', castle: 'Castle', ep: 'Capture en passant' };
  function missionStars(m, n) { return n <= m.par ? 3 : n <= m.par + Math.ceil((m.limit - m.par) / 2) ? 2 : 1; }
  function coachMissionsDone(id) { return (MISSIONS[id] || []).filter(function (m) { return S.missions && S.missions[m.id]; }).length; }
  function missionGoalCount(m, g) { return m.goal === 'sequence' ? m.seq.length : m.goal === 'captureAll' ? missionMaterial(g, m.side === 'b' ? 'w' : 'b') : m.goal === 'capture' ? m.count || 1 : 1; }
  MODES.mission = {
    label: 'Coach mission',
    enter: function (arg) {
      var list = MISSIONS[arg.lesson] || [], m = list[arg.i || 0];
      if (!m) { go('path'); return; }
      MS = { lesson: arg.lesson, i: arg.i || 0, m: m, n: 0, st: { caps: 0 }, over: null, hint: 0 };
      MODES.mission.load();
      Voice.say([V('cm_start'), { id: 'N-' + m.id, text: m.text }]);
    },
    load: function () {
      Replay.stop(); var m = MS.m, side = m.side || 'w', g = setupBoard(m.fen, { drop: true, orient: side });
      MS.g = g; MS.n = 0; MS.st = { caps: 0 }; MS.over = null; MS.hint = 0; MS.total = missionGoalCount(m, g); MS.busy = false;
      IX.canMove = function (c) { return c === side && !MS.over && !MS.busy; }; IX.onMove = MODES.mission.onMove;
      IX.enabled = !m.pre;
      MODES.mission.render();
      if (m.pre) setTimeout(function () {
        if (!MS || MS.g !== g) return;
        applyMove(g, uciObj(m.pre)).then(function (r) { if (!MS || MS.g !== g) return; B3.flash('mark', [r.to], 1600); IX.enabled = true; MODES.mission.render(); });
      }, 1100);
    },
    onMove: function (mv) {
      var g = MS.g, m = MS.m;
      return applyMove(g, mv).then(function (r) {
        if (!r || !MS || MS.g !== g) return;
        MS.n++;
        if (r.captured) { B3.burst(r.to); xpPop('+5', r.to); }
        var res = missionCheck(m, g, r, MS.st);
        if (res === 'win') return MODES.mission.finish(true);
        if (res === 'wrong') return MODES.mission.finish(false, 'You played ' + MS.st.wrong + ', but the move written was ' + m.seq[MS.st.k || 0] + '. Read the letter, then the square.');
        if (res === 'stalemate') return MODES.mission.finish(false, 'Stalemate! My king has no legal move but is not in check, so it is a draw. Always leave me a move.');
        if (MS.n >= m.limit) return MODES.mission.finish(false, missionWhy(m, g, r, MS));
        MS.busy = true; MODES.mission.render();
        var fen = g.fen(), t0 = Date.now();
        var job = m.coach === 'defend' ? Eng.call('pickMove', fen, levelById('master'), []).then(function (x) { return x && x.move; }) : Promise.resolve(missionWander(g));
        return job.then(function (cm) {
          setTimeout(function () {
            if (!MS || MS.g !== g || MS.over) return;
            if (!cm) { MS.busy = false; return MODES.mission.finish(false, 'The game is over.'); }
            applyMove(g, { from: cm.from, to: cm.to, promotion: cm.promotion || undefined }).then(function (cr) {
              if (!MS || MS.g !== g) return;
              MS.busy = false; IX.enabled = true;
              if (cr && cr.captured && m.coach === 'defend') {
                var lost = 'My ' + PIECE_NAME[cr.piece] + ' took your ' + PIECE_NAME[cr.captured] + ' on ' + cr.to + ': nothing was protecting it.';
                if (g.isDraw() || g.gameOver()) return MODES.mission.finish(false, lost + ' With only kings left, nobody can win: it is a draw. Keep your king next to your ' + PIECE_NAME[cr.captured] + ' so it is protected.');
                return MODES.mission.finish(false, lost + ' Keep your pieces protected.');
              }
              if (g.gameOver()) return MODES.mission.finish(false, g.inCheckmate() ? 'That is checkmate against you.' : 'The game ended in a draw before the goal.');
              MODES.mission.render();
            });
          }, Math.max(0, 550 - (Date.now() - t0)));
        });
      });
    },
    finish: function (win, why) {
      var m = MS.m; MS.over = win ? 'win' : 'fail'; IX.enabled = false; MS.busy = false;
      if (win) {
        var stars = missionStars(m, MS.n), prev = S.missions && S.missions[m.id] || 0;
        if (MS.hint) stars = Math.min(stars, 2);
        S.missions = S.missions || {}; S.missions[m.id] = Math.max(prev, stars); MS.stars = stars;
        Sound.play('win'); confetti(); addXP(prev ? 5 : 20);
        Voice.say([V(stars === 3 ? 'cm_star3' : 'cm_done')]);
      } else {
        MS.why = why; Sound.play('bad'); Voice.say([V('cm_fail')]);
      }
      save(); MODES.mission.render(); Celebrate.flush();
    },
    render: function () {
      var m = MS.m, list = MISSIONS[MS.lesson], L = LESSONS[MS.lesson], left = m.limit - MS.n;
      var got = m.goal === 'sequence' ? (MS.st.k || 0) : m.goal === 'captureAll' ? MS.total - missionMaterial(MS.g, m.side === 'b' ? 'w' : 'b') : m.goal === 'capture' ? MS.st.caps : MS.over === 'win' ? 1 : 0;
      var steps = list.map(function (x, k) { var s = S.missions && S.missions[x.id]; return '<span class="ms-step' + (k === MS.i ? ' on' : '') + (s ? ' done' : '') + '">' + (s ? '★' : k + 1) + '</span>'; }).join('<i class="ms-link"></i>');
      var moves = ''; for (var k = 0; k < m.limit; k++) moves += '<i class="ms-mv' + (k < MS.n ? ' used' : '') + (k === m.par - 1 ? ' par' : '') + '"></i>';
      var body;
      if (MS.over === 'win') {
        var nx = list[MS.i + 1];
        body = '<div class="ms-result win"><div class="big-stars">' + '★'.repeat(MS.stars) + '<span class="dim">' + '★'.repeat(3 - MS.stars) + '</span></div><h2>Mission complete!</h2><p>' + esc(GOAL_TXT[m.goal]) + ' in ' + MS.n + ' move' + (MS.n > 1 ? 's' : '') + (MS.stars < 3 ? (MS.hint ? '. Without a hint it is worth 3 stars.' : '. ' + m.par + ' moves gets you 3 stars.') : '. Perfect.') + '</p></div>' +
          '<div class="actions">' + (nx ? '<button class="btn primary wide" data-act="mission" data-l="' + MS.lesson + '" data-i="' + (MS.i + 1) + '">Next mission: ' + esc(nx.title) + ' →</button>' : '<button class="btn primary wide" data-act="missionsDone">All missions done →</button>') +
          (MS.stars < 3 ? '<button class="btn" data-act="missionRetry">↻ Go for 3 stars</button>' : '') + '</div>';
      } else if (MS.over === 'fail') {
        body = '<div class="ms-result fail"><h2>Not this time</h2><p>' + esc(MS.why || '') + '</p></div><div class="actions"><button class="btn primary wide" data-act="missionRetry">↻ Try again</button><button class="btn ghost" data-act="missionHint">Show me a hint</button></div>';
      } else {
        body = '<div class="ms-track"><div class="ms-goal"><span class="ms-goal-ico">◎</span><b>' + esc(GOAL_TXT[m.goal]) + '</b>' + (MS.total > 1 ? '<span class="ms-count">' + got + ' / ' + MS.total + '</span>' : '') + '</div>' +
          '<div class="ms-moves"><span>' + (MS.busy ? 'Coach is moving…' : left + ' move' + (left === 1 ? '' : 's') + ' left') + '</span><span class="ms-mvs">' + moves + '</span></div>' +
          (MS.total > 1 ? '<div class="ms-bar"><i style="width:' + Math.round(got / MS.total * 100) + '%"></i></div>' : '') +
          (m.goal === 'sequence' ? '<div class="ms-seq">' + m.seq.map(function (x, k) { return '<span class="mono' + (k < got ? ' done' : k === got ? ' now' : '') + '">' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '</div>' +
          (MS.hint ? '<p class="ms-tip">💡 ' + esc(m.tip) + '</p>' : '') +
          '<div class="actions"><button class="btn ghost" data-act="missionHint">Hint</button><button class="btn ghost" data-act="missionRetry">↻ Restart</button></div>';
      }
      setPanel('<button class="back" data-act="lesson" data-id="' + MS.lesson + '">← ' + esc(L.title) + '</button>' +
        '<div class="ms-head"><div class="ms-steps">' + steps + '</div><div class="eyebrow">Coach mission ' + (MS.i + 1) + ' of ' + list.length + (m.coach === 'defend' ? ' · I defend for real' : ' · I play gently') + '</div><h1 class="h1">' + esc(m.title) + '</h1></div>' +
        (MS.over ? '' : '<div class="ms-coach"><span class="ms-ava">' + coachAvatar() + '</span><p>' + esc(m.text) + '</p></div>') + body);
      if (MS.over) { var pn = $('#panel'); setTimeout(function () { pn.scrollTop = pn.scrollHeight; }, 60); }
    },
    leave: function () { MS = null; }
  };
  function xpPop(txt, sq) {
    var el = document.createElement('div'); el.className = 'xp-pop'; el.textContent = txt;
    $('.stage').appendChild(el); setTimeout(function () { el.remove(); }, 1300);
  }
  // a reason for every failed mission, in plain words
  function missionWhy(m, g, r, ms) {
    var name = PIECE_NAME[r.piece];
    if (m.limit === 1) {
      if (m.goal === 'check') return 'Your ' + name + ' on ' + r.to + ' does not attack my king. Check means your piece could capture my king on the next move.';
      if (m.goal === 'mate') return g.inCheck() ? 'That is check, but my king can still escape or be protected. Checkmate leaves no way out.' : 'That is not even check. A checkmate always starts with a check.';
      if (m.goal === 'castle') return 'That is not castling. To castle, move the king two squares toward a rook.';
      if (m.goal === 'ep') return 'Not en passant. Your pawn takes diagonally, onto the square my pawn jumped over.';
      if (m.goal === 'capture') return 'That does not capture anything. Pick a piece of mine your pawn can take.';
      return 'That move does not reach the goal.';
    }
    if (m.goal === 'capture' || m.goal === 'captureAll') return 'Out of moves: you took ' + (ms.st.caps || 0) + ' of ' + ms.total + '. Plan a route where each move lines up the next capture.';
    if (m.goal === 'mate') return 'Out of moves before checkmate. Push my king to the edge first, then bring your king closer.';
    if (m.goal === 'promote') return 'Out of moves before your pawn reached the last rank. Push the pawn every move unless my king can take it.';
    return 'Out of moves. Look for a shorter route.';
  }
  ACT.mission = function (d) { go('mission', { lesson: d.l, i: +d.i || 0 }); };
  ACT.missionRetry = function () { if (!MS) return; MODES.mission.load(); };
  ACT.missionHint = function () {
    if (!MS) return; MS.hint++;
    if (MS.over === 'fail') MODES.mission.load(), MS.hint = 1;
    var g = MS.g, m = MS.m, side = m.side || 'w';
    if (MS.busy || g.turn() !== side) return MODES.mission.render();
    // search our own moves (the friendly coach mostly shuffles his king) for the quickest route to the goal
    function reach(depth, st) {
      var best = null;
      g.moves().some(function (mv) {
        var r = g.move({ from: mv.from, to: mv.to, promotion: mv.promotion }), st2 = { caps: st.caps, k: st.k }, res = missionCheck(m, g, r, st2), ok = res === 'win';
        if (!ok && res !== 'stalemate' && res !== 'wrong' && depth > 1 && !g.gameOver()) { var c = missionWander(g, function () { return 0.5; }); if (c) { g.move(c); ok = !!reach(depth - 1, st2); g.undo(); } }
        g.undo(); if (ok) best = mv; return ok;
      });
      return best;
    }
    var show = function (mv) { if (!mv || !MS || MS.g !== g) return; B3.arrows([[mv.from, mv.to, 'g']]); B3.flash('hint', [mv.from], 2200); };
    if (m.goal === 'sequence') { var nx = new Game(g.fen()).move(m.seq[MS.st.k || 0]); show(nx); }
    else if (m.coach === 'defend') Eng.call('pickMove', g.fen(), levelById('master'), []).then(function (x) { show(x && x.move); });
    else {
      // for capture goals, aim at the next capture; otherwise the whole goal. Fall back to the engine's move.
      if (m.goal === 'capture' || m.goal === 'captureAll') m = Object.assign({}, m, { goal: 'capture', count: (MS.st.caps || 0) + 1 });
      var mv = null; for (var d = 1; d <= 3 && !mv; d++) mv = reach(d, { caps: MS.st.caps || 0, k: MS.st.k });
      if (mv) show(mv); else Eng.call('pickMove', g.fen(), levelById('master'), []).then(function (x) { show(x && x.move); });
    }
    MODES.mission.render();
    var tip = $('.ms-tip'); if (tip && tip.scrollIntoView) tip.scrollIntoView({ block: 'nearest' });
  };
  ACT.missionsDone = function () { var lid = MS && MS.lesson, f = lid && flowNext(lid); if (f) return flowGo(f); go('path'); if (missionsDone() >= missionsTotal()) setTimeout(function () { toast('All of today\'s goals done. Great place to stop, or keep going!'); }, 600); };

  // ================= Lesson practice: puzzles that use exactly what the lesson just taught =================
  function pzHas(p, t) { return (p.pieces || puzzlePieces(p)).indexOf(t) >= 0; }
  function starter(p) { return /^s\d/.test(p.id); }
  var LESSON_DRILL = {
    'l-rook': { pick: function (p) { return starter(p) && p.theme === 'hanging' && p.pieces[0] === 'r'; }, ask: 'Your rook can capture a piece that nobody protects. Find it.', hint: 'Look along the straight lines from your rook: up, down, left and right.' },
    'l-bishop-queen': { pick: function (p) { return starter(p) && p.theme === 'hanging' && /[bq]/.test(p.pieces[0]); }, ask: 'Your bishop or queen can capture a piece that nobody protects. Find it.', hint: 'Bishops look along the diagonals. The queen looks along diagonals and straight lines.' },
    'l-knight': { pick: function (p) { return starter(p) && p.theme === 'hanging' && p.pieces[0] === 'n'; }, ask: 'Your knight can capture a piece that nobody protects. Find it.', hint: 'Count the L: two squares one way, then one to the side. Which landing square has a black piece?' },
    'l-king-pawn': { pick: function (p) { return (starter(p) && p.theme === 'hanging' && /[pk]/.test(p.pieces[0])) || p.theme === 'promotion' && /^g/.test(p.id); }, ask: 'Win something with your king or a pawn. Remember: pawns capture diagonally.', hint: 'Pawns take one square diagonally forward. A pawn on the 7th rank can become a queen.' },
    'l-check': { pick: function (p) { return (starter(p) && p.theme === 'mate') || p.backrank; }, ask: 'Find checkmate in one move: a check the king cannot escape.', hint: 'Try every check you have. For each one, ask: can the king step away, can something block, can something capture?' },
    'l-qmate': { pick: function (p) { return starter(p) && p.theme === 'mate' && p.pieces[0] === 'q'; }, ask: 'Checkmate in one with your queen. Watch out for stalemate!', hint: 'The king is near the edge. Find a queen check that also covers every square next to him.' },
    'l-rookmate': { pick: function (p) { return starter(p) && p.theme === 'mate' && p.pieces[0] === 'r'; }, ask: 'Checkmate in one with your rook.', hint: 'Check along the edge where the king is stuck. Your king covers the squares in front.' },
    'l-values': { pick: function (p) { return p.theme === 'hanging' && !starter(p) && p.r <= 520; }, ask: 'Something is undefended. Win it, and keep your own pieces safe.', hint: 'For each black piece, ask: is it attacked by me? Is it defended?' },
    'l-cct': { pick: function (p) { return (p.theme === 'hanging' || p.theme === 'mate') && !starter(p) && p.r <= 560; }, ask: 'Do the blunder check: checks, captures, threats. Then find the best move.', hint: 'Start with every check, then every capture.' },
    'l-traps': { pick: function (p) { return p.theme === 'mate' && p.sol.length === 1 && p.r <= 600; }, ask: 'Find checkmate in one.', hint: 'Look at the squares next to the king. Which check covers them all?' },
    'l-forks': { pick: function (p) { return p.theme === 'fork' && p.r <= 640; }, ask: 'Find a fork: one move that attacks two things at once.', hint: 'Look for a square where one of your pieces attacks two black pieces, or the king and a piece.' },
    'l-pins': { pick: function (p) { return p.theme === 'pin'; }, ask: 'Find a pin: attack a piece that has something more valuable behind it.', hint: 'Find two black pieces on the same line, with the more valuable one behind.' },
    'l-skewers': { pick: function (p) { return p.theme === 'skewer'; }, ask: 'Find a skewer: check the king so it must move, and win the piece behind it.', hint: 'Find a line with the black king in front and another piece behind him.' },
    'l-backrank': { pick: function (p) { return p.backrank || (p.theme === 'mate' && p.mate === 1 && p.r >= 380 && p.r <= 700); }, ask: 'The king is stuck behind his own pawns. Find the checkmate.', hint: 'Get a rook or queen to the back rank with check.' },
    'l-discovered': { pick: function (p) { return p.theme === 'discovered'; }, ask: 'Move one piece out of the way to uncover an attack by another.', hint: 'Find your rook, bishop or queen with one of your own pieces in front of it.' },
    'l-defender': { pick: function (p) { return p.theme === 'defender' || p.theme === 'combo' && p.r <= 900; }, ask: 'Remove or distract the defender, then win what it was guarding.', hint: 'Which black piece is guarding the one you want? Can you capture or chase it?' },
    'l-patterns': { pick: function (p) { return p.theme === 'mate' && p.sol.length <= 3 && p.r >= 600 && p.r <= 1300; }, ask: 'Find the mating pattern.', hint: 'Look at the king\'s escape squares. Which of your pieces can cover them?' },
    'l-smothered': { pick: function (p) { return p.theme === 'mate' && p.sol.length <= 3 && p.r >= 600 && p.r <= 1300; }, ask: 'Find the checkmate.', hint: 'Checks first. A knight check cannot be blocked.' },
    'l-kp': { pick: function (p) { return p.theme === 'endgame' || p.theme === 'promotion'; }, ask: 'Find the winning endgame move.', hint: 'Kings and pawns: who gets there first? Count the moves.' },
    'l-rook-end': { pick: function (p) { return p.theme === 'endgame'; }, ask: 'Find the winning endgame move.', hint: 'Active rook, active king. Look for checks first.' },
    'l-calc': { pick: function (p) { return (p.theme === 'combo' || p.theme === 'mate') && p.sol.length <= 5 && p.r >= 900 && p.r <= 1600; }, ask: 'Calculate: list your forcing moves and pick the one that works.', hint: 'Checks, captures, threats. Follow each line to the end.' },
    'l-convert': { pick: function (p) { return (p.theme === 'combo' || p.theme === 'hanging') && p.r >= 700; }, ask: 'You are better. Find the cleanest way to win more.', hint: 'Forcing moves first, even when you are winning.' }
  };
  function drillList(lid) {
    var D = LESSON_DRILL[lid]; if (!D) return null;
    var pool = PUZZLES.filter(D.pick); if (pool.length < 3) return null;
    var fresh = pool.filter(function (p) { return !S.puzzle.solved[p.id]; }); if (fresh.length >= 5) pool = fresh;
    pool = pool.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 5).sort(function (a, b) { return a.r - b.r; });
    return pool;
  }
  function hasDrill(lid) { var D = LESSON_DRILL[lid]; return !!(D && PUZZLES.filter(D.pick).length >= 3); }
  function drillDone(lid) { return !!(S.drills && S.drills[lid]); }
  // what comes after a lesson: its missions, then its practice, then the next lesson
  function flowNext(lid) {
    var ms = MISSIONS[lid];
    if (ms && coachMissionsDone(lid) < ms.length) return { k: 'mission', lid: lid, i: coachMissionsDone(lid), t: 'Coach missions', s: ms.length + ' quick challenges against me' };
    if (hasDrill(lid) && !drillDone(lid)) return { k: 'drill', lid: lid, t: 'Practice puzzles', s: '5 puzzles on ' + LESSONS[lid].title };
    var nl = nextLesson(); return nl ? { k: 'lesson', lid: nl, t: 'Next lesson', s: LESSONS[nl].title } : null;
  }
  function pendingFlow(nl) {
    var order = []; STAGES.forEach(function (st) { order = order.concat(st.lessons); });
    var i = order.indexOf(nl), prev = i > 0 ? order[i - 1] : null;
    if (!prev || !lessonDone(prev) || (S.flowSkip && S.flowSkip[prev])) return null;
    var f = flowNext(prev); return f && f.k !== 'lesson' ? f : null;
  }
  function flowGo(f) { if (!f) return go('path'); if (f.k === 'mission') return go('mission', { lesson: f.lid, i: f.i }); if (f.k === 'drill') return go('drill', f.lid); go('lesson', f.lid); }
  ACT.flowGo = function (d) { flowGo(flowNext(d.l)); };
  // three chips that show where this lesson's loop stands: learn, missions, practice
  function flowChips(lid) {
    var ms = MISSIONS[lid], items = [{ t: 'Learn', done: lessonDone(lid) }];
    if (ms) items.push({ t: 'Missions', done: coachMissionsDone(lid) >= ms.length });
    if (hasDrill(lid)) items.push({ t: 'Practice', done: drillDone(lid) });
    var cur = items.filter(function (x) { return !x.done; })[0];
    return '<div class="flow-chips">' + items.map(function (x) { return '<span class="fc' + (x.done ? ' done' : x === cur ? ' now' : '') + '">' + (x.done ? '✓ ' : '') + x.t + '</span>'; }).join('<i></i>') + '</div>';
  }
  function flowCta(lid) {
    var f = flowNext(lid); if (!f) return '';
    return '<div class="flow-cta">' + flowChips(lid) + '<button class="btn primary big wide" data-act="flowGo" data-l="' + lid + '">▶&nbsp; ' + (f.k === 'lesson' ? 'Next lesson: ' + esc(f.s) : esc(f.t) + ' · ' + esc(f.s)) + '</button></div>';
  }
  var DR = null;
  function drillAsk(p, D) {
    if (D && p.theme === 'hanging' && starter(p)) return D.ask;
    var T = { fork: 'Find a fork: one move that attacks two things at once.', pin: 'Find the pin.', skewer: 'Find the skewer.', discovered: 'Find the discovered attack.', promotion: 'Make a new queen, safely.', endgame: 'Find the winning move.', combo: 'Find the move that wins material.', hanging: 'Something is left unprotected. Win it.', defender: 'Remove the defender.' };
    if (p.theme === 'mate') return p.mate > 1 ? 'Find checkmate in ' + p.mate + ' moves.' : 'Find checkmate in one move.';
    return (D && D.ask) || T[p.theme] || 'Find the best move.';
  }
  MODES.drill = {
    label: 'Practice',
    enter: function (lid) {
      var list = drillList(lid); if (!list) return flowGo(flowNext(lid));
      DR = { lid: lid, D: LESSON_DRILL[lid], list: list, k: 0, res: [] };
      Voice.say([V('drill_start')], true);
      MODES.drill.load();
    },
    load: function () {
      var p = DR.list[DR.k], fen = puzzleFen(p), side = new Game(fen).turn();
      DR.ply = 0; DR.tries = 0; DR.hint = 0; DR.over = false;
      var g = setupBoard(fen, { drop: true, orient: side });
      IX.enabled = true; IX.canMove = function (c) { return c === g.turn() && !DR.over; }; IX.onMove = MODES.drill.onMove;
      MODES.drill.render();
    },
    render: function (msg, kind) {
      var p = DR.list[DR.k], L = LESSONS[DR.lid], turn = new Game(puzzleFen(p)).turn();
      var pips = DR.list.map(function (x, i) { var r = DR.res[i]; return '<i class="' + (r === true ? 'ok' : r === false ? 'miss' : i === DR.k ? 'cur' : '') + '"></i>'; }).join('');
      setPanel('<button class="back" data-act="lesson" data-id="' + DR.lid + '">← ' + esc(L.title) + '</button>' +
        '<div class="eyebrow">Practice · ' + esc(L.title) + '</div><h1 class="h1">Puzzle ' + (DR.k + 1) + ' of ' + DR.list.length + '</h1>' +
        '<div class="dr-pips">' + pips + '</div>' +
        '<div class="coach-card"><div class="coach-tag">' + (turn === 'w' ? 'White' : 'Black') + ' to move</div><p class="coach-text"><strong>' + esc(drillAsk(p, DR.D)) + '</strong></p>' +
        (DR.hint ? '<p class="ms-tip">💡 ' + esc(DR.D.hint) + '</p>' : '') + '</div>' +
        '<div id="status" class="status ' + (kind || '') + '">' + (msg || '') + '</div>' +
        '<div class="actions">' + (DR.over ? '<button class="btn primary wide" data-act="drillNext">' + (DR.k + 1 < DR.list.length ? 'Next puzzle →' : 'Finish practice →') + '</button>' : '<button class="btn ghost" data-act="drillHint">' + (DR.hint >= 2 ? 'Show the move' : 'Hint') + '</button>') + '</div>');
    },
    onMove: function (mv, uci) {
      var p = DR.list[DR.k], g = IX.game, t = new Game(g.fen()), r = t.move(mv);
      var ok = uci === p.sol[DR.ply] || (DR.ply === 0 && p.accept && p.accept.indexOf(uci) >= 0) || (r && t.inCheckmate());
      if (!ok) {
        DR.tries++; Sound.play('bad'); B3.flash('bad', [mv.to], 700);
        var why = puzzleWhyWrong(g, mv, p) || 'That move does not win anything.';
        if (DR.tries >= 2 && DR.hint < 1) DR.hint = 1;
        Voice.say([V('drill_wrong')]);
        MODES.drill.render('<strong>Not quite.</strong> ' + esc(why) + ' Try again.', 'bad');
        B3.sync(g.fen()); IX.enabled = true;
        return null;
      }
      IX.enabled = false;
      return applyMove(g, mv).then(function () {
        DR.ply++;
        if ((r && t.inCheckmate()) || DR.ply >= p.sol.length) return MODES.drill.win(mv.to);
        MODES.drill.render('Good. Keep going…', 'good');
        return B3.wait(450).then(function () { return applyMove(g, uciObj(p.sol[DR.ply])); }).then(function () {
          DR.ply++; if (DR.ply >= p.sol.length) return MODES.drill.win(); IX.enabled = true;
        });
      });
    },
    win: function (sq) {
      var p = DR.list[DR.k], clean = DR.tries === 0 && DR.hint < 3;
      DR.over = true; DR.res[DR.k] = clean; B3.burst(sq || p.sol[p.sol.length - 1].slice(2, 4)); Sound.play('good');
      S.puzzle.solved[p.id] = Date.now(); today().puzzles++; addXP(clean ? 10 : 4); save();
      Voice.say([V(clean ? 'drill_right' : 'drill_right_late'), { id: 'P-' + p.id, text: p.explain }]);
      MODES.drill.render('<strong>' + (clean ? 'Solved!' : 'Got it.') + '</strong> ' + esc(p.explain), 'good');
    },
    leave: function () { }
  };
  ACT.drillHint = function () {
    if (!DR || DR.over) return; var p = DR.list[DR.k], u = p.sol[DR.ply];
    DR.hint++;
    if (DR.hint === 2) B3.markers('hint', [u.slice(0, 2)]);
    if (DR.hint >= 3) { B3.arrows([[u.slice(0, 2), u.slice(2, 4), 'g']]); DR.res[DR.k] = false; }
    MODES.drill.render(DR.hint === 2 ? 'This piece is the one to move.' : DR.hint >= 3 ? 'Play the green arrow to see how it works.' : '', '');
  };
  ACT.drillNext = function () {
    if (!DR) return;
    if (DR.k + 1 < DR.list.length) { DR.k++; return MODES.drill.load(); }
    var okN = DR.res.filter(function (x) { return x === true; }).length, n = DR.list.length, lid = DR.lid;
    S.drills = S.drills || {}; S.drills[lid] = Math.max(S.drills[lid] || 0, okN); save();
    document.body.dataset.layout = 'browse'; IX.enabled = false;
    if (okN >= n - 1) { Sound.play('win'); confetti(); }
    Voice.say([V(okN >= n - 1 ? 'drill_done_great' : 'drill_done_ok')]);
    var f = flowNext(lid);
    setPanel('<button class="back" data-act="goPath">← Path</button><div class="eyebrow">Practice complete · ' + esc(LESSONS[lid].title) + '</div>' +
      '<h1 class="h1">' + okN + ' of ' + n + ' solved first time</h1>' +
      '<p class="lede">' + (okN >= n - 1 ? 'You really own this idea now.' : okN >= 2 ? 'Good work. Practise again any time to make it automatic.' : 'This one needs more practice. Try the set again, or repeat the lesson.') + '</p>' +
      flowChips(lid) +
      '<div class="actions">' + (f ? '<button class="btn primary big wide" data-act="flowGo" data-l="' + lid + '">▶&nbsp; ' + (f.k === 'lesson' ? 'Next lesson: ' + esc(f.s) : esc(f.t)) + '</button>' : '<button class="btn primary big wide" data-act="goPath">Back to the path</button>') + '</div>' +
      '<div class="actions plain"><button class="btn ghost" data-act="drillAgain" data-l="' + lid + '">↻ Practise again</button><button class="btn ghost" data-act="lesson" data-id="' + lid + '">Repeat lesson</button></div>');
  };
  ACT.drillAgain = function (d) { go('drill', d.l); };

  // ================= Analyze a game from chess.com (or any PGN) =================
  // PGN text -> { headers, sans, startFen } (comments, clocks, variations and NAGs are skipped).
  function parsePGN(text) {
    text = String(text || '').replace(/\r/g, '');
    var headers = {}, m, re = /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
    while ((m = re.exec(text))) headers[m[1]] = m[2];
    var body = text.replace(/^\s*\[[^\]]*\]\s*$/gm, ' ');
    var next = body.search(/\n\s*\[Event /); if (next > 0) body = body.slice(0, next); // only the first game of a paste
    body = body.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
    var depth = 0, out = '';
    for (var i = 0; i < body.length; i++) { var ch = body[i]; if (ch === '(') depth++; else if (ch === ')') depth = Math.max(0, depth - 1); else if (!depth) out += ch; }
    var toks = out.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter(function (t) { return t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t); });
    var startFen = headers.FEN && headers.SetUp !== '0' ? headers.FEN : Game.START, g = new Game(startFen), sans = [];
    for (var k = 0; k < toks.length; k++) {
      var t = toks[k].replace(/[!?]+$/, '').replace(/^\.+/, '');
      if (!t) continue;
      var mv = g.move(t);
      if (!mv) return { error: 'Move ' + (Math.floor(sans.length / 2) + 1) + ' ("' + toks[k] + '") is not legal here. Is this standard chess?', headers: headers, sans: sans };
      sans.push(mv.san);
    }
    if (!sans.length) return { error: 'No moves found. Paste the full PGN, including the moves.' };
    return { headers: headers, sans: sans, startFen: startFen };
  }
  // chess.com public API: free, no key, no account. It finds games by player and month, so a game link needs the player too.
  var CC = {
    base: 'https://api.chess.com/pub/player/',
    get: function (url) {
      return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
        if (r.status === 404) throw { code: 'nouser' };
        if (!r.ok) throw { code: 'http', status: r.status };
        return r.json();
      }, function () { throw { code: 'offline' }; });
    },
    archives: function (u) { return CC.get(CC.base + encodeURIComponent(u.toLowerCase()) + '/games/archives').then(function (j) { return (j.archives || []).slice().reverse(); }); },
    recent: function (u, n) {
      return CC.archives(u).then(function (list) {
        var out = [], k = 0;
        function step() {
          if (out.length >= n || k >= Math.min(list.length, 4)) return out.slice(0, n);
          return CC.get(list[k++]).then(function (j) { out = out.concat((j.games || []).filter(ccStandard).reverse()); return step(); });
        }
        return step();
      });
    },
    find: function (u, id) {
      return CC.archives(u).then(function (list) {
        var k = 0;
        function step() {
          if (k >= Math.min(list.length, 36)) throw { code: 'notfound' };
          return CC.get(list[k++]).then(function (j) { var hit = (j.games || []).filter(function (x) { return String(x.url || '').split('/').pop() === id; })[0]; return hit || step(); });
        }
        return step();
      });
    }
  };
  function ccStandard(x) { return x && x.pgn && (x.rules || 'chess') === 'chess'; }
  function ccUser(s) { s = String(s || '').trim(); var m = /chess\.com\/member\/([\w-]+)/i.exec(s); return (m ? m[1] : s).replace(/^@/, ''); }
  function ccLinkId(s) { var m = /chess\.com\/.*?(?:live|daily)\/(?:game\/)?(\d+)/i.exec(String(s || '')); return m ? m[1] : null; }
  function ccError(e) {
    var c = e && e.code;
    if (c === 'nouser') return 'chess.com has no player with that username. Check the spelling.';
    if (c === 'notfound') return 'That game is not in this player\'s archive. Make sure the username is one of the two players, or paste the PGN instead.';
    if (c === 'offline') return 'This page could not reach chess.com (no connection, or this host blocks it). Paste the PGN instead: on chess.com open the game, tap Share, then PGN, then Copy.';
    return 'chess.com did not answer (' + (e && e.status || 'error') + '). Try again in a minute, or paste the PGN.';
  }
  function openingName(h) {
    if (h.ECOUrl) { var n = decodeURIComponent(h.ECOUrl.split('/').pop()).replace(/-/g, ' ').replace(/\s\d.*$/, ''); return n.length > 60 ? n.slice(0, 60) + '…' : n; }
    return h.Opening || h.ECO || '';
  }
  // what the moved piece attacks right after a move (for fork detection): captures it could make if it moved again
  function forkTargets(fen, mv) {
    var g = new Game(fen); var r = g.move(mv); if (!r) return 0;
    var check = g.inCheck() ? 1 : 0, parts = g.fen().split(' '); parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
    var h = new Game(parts.join(' '));
    var hits = h.moves({ square: r.to }).filter(function (x) { return x.captured && VAL[x.captured] >= 3; }).length;
    return hits + check;
  }
  var PROBLEMS = {
    trap: { t: 'Fell into an opening trap', fix: 'Your opponent played a known trap and you took the bait. Learn the line once and it will never catch you again.', lesson: [], v: 'pr_trap' },
    allowedMate: { t: 'Missed your opponent\'s mating threat', fix: 'Before every move, ask: can my opponent give check, and is any of those checks mate?', lesson: ['l-backrank', 'l-cct'], v: 'pr_allowedmate' },
    hung: { t: 'Left pieces undefended', fix: 'After choosing a move, check that the piece you moved, and the ones it was guarding, are still safe.', lesson: ['l-values', 'l-cct'], v: 'pr_hung' },
    missedMate: { t: 'Missed a checkmate', fix: 'When the enemy king is short of squares, look at every check first.', lesson: ['l-patterns', 'l-qmate'], v: 'pr_missedmate' },
    missedFork: { t: 'Missed a fork', fix: 'Look for one move that attacks two valuable pieces at once, especially knight jumps and queen checks.', lesson: ['l-forks'], v: 'pr_missedfork' },
    missedWin: { t: 'Missed free material', fix: 'Every move, scan your opponent\'s pieces: is any of them attacked and not defended?', lesson: ['l-values', 'l-defender'], v: 'pr_missedwin' },
    slipped: { t: 'Let a winning position slip', fix: 'When you are ahead, trade pieces, stop counterplay and keep it simple.', lesson: ['l-convert'], v: 'pr_slipped' },
    kingCentre: { t: 'King stayed in the centre', fix: 'Castle in the first ten moves, before the position opens up.', lesson: ['l-special', 'l-principles'], v: 'pr_kingcentre' },
    earlyQueen: { t: 'Queen came out too early', fix: 'Develop knights and bishops first; an early queen gets chased and you lose time.', lesson: ['l-principles', 'l-traps'], v: 'pr_earlyqueen' },
    slowDev: { t: 'Pieces left at home', fix: 'Get every knight and bishop off the back rank before starting an attack.', lesson: ['l-principles'], v: 'pr_slowdev' },
    missedBetter: { t: 'Missed stronger moves', fix: 'In sharp positions, compare two or three candidate moves before you play.', lesson: ['l-calc', 'l-cct'], v: 'pr_missedbetter' }
  };
  function problemOf(l) {
    if (!l || !l.cls || (CLASS[l.key] && CLASS[l.key].positive) || l.key === 'inacc') return null;
    if (l.rs > 90000 || (l.ps < -90000 && l.bs > -90000)) return 'allowedMate';
    if (l.bs > 90000 && l.ps < 90000) return 'missedMate';
    if (l.rc && VAL[l.rc] >= 3 && l.loss >= 150) return 'hung';
    if (l.fork) return 'missedFork';
    if (l.best && l.best.captured && VAL[l.best.captured] >= 3 && l.loss >= 150) return 'missedWin';
    return 'missedBetter';
  }
  // Whole-game report: problems with examples, phase accuracy, opening.
  function gameReport(job) {
    var color = job.color, log = job.log, sans = job.sans, probs = {}, phase = { open: [], mid: [], end: [] };
    function add(k, ply) { (probs[k] = probs[k] || []).push(ply); }
    var g = new Game(job.startFen), castledAt = null, queenMoves = 0, peak = -Infinity, slipAt = null;
    for (var i = 0; i < sans.length; i++) {
      var mover = g.turn(), mv = g.move(sans[i]), myMoveNo = Math.floor(i / 2) + 1, l = log[i];
      if (mover !== color) continue;
      if (/^O-O/.test(mv.san) && castledAt == null) castledAt = myMoveNo;
      if (mv.piece === 'q' && myMoveNo <= 8) queenMoves++;
      if (myMoveNo === 10) {
        var home = 0; ['b', 'c', 'f', 'g'].forEach(function (f) { var p = g.get(f + (color === 'w' ? '1' : '8')); if (p && p.color === color && (p.type === 'n' || p.type === 'b')) home++; });
        if (home >= 2) add('slowDev', i);
      }
      if (myMoveNo === 12 && castledAt == null) { var k = g.get(color === 'w' ? 'e1' : 'e8'); var queens = /q/i.test(g.fen().split(' ')[0]); if (k && k.type === 'k' && queens) add('kingCentre', i); }
      if (!l || !l.cls) continue;
      var pk = problemOf(l); if (pk) add(pk, i);
      var nonPawn = 0; g.boardArray().forEach(function (row) { row.forEach(function (p) { if (p && p.type !== 'p' && p.type !== 'k') nonPawn += VAL[p.type]; }); });
      var acc = Math.max(0, Math.min(100, 103.17 * Math.exp(-0.04354 * (l.drop || 0)) - 3.17));
      (myMoveNo <= 12 ? phase.open : nonPawn <= 26 ? phase.end : phase.mid).push(acc);
      if (l.ps != null && l.ps < 90000) { if (l.ps > peak) peak = l.ps; if (peak >= 300 && l.ps < 80 && slipAt == null) slipAt = i; }
    }
    if (queenMoves >= 3) add('earlyQueen', 0);
    if (slipAt != null && job.result !== 'win') add('slipped', slipAt);
    var avg = function (a) { return a.length ? Math.round(a.reduce(function (s, x) { return s + x; }, 0) / a.length) : null; };
    var list = Object.keys(probs).map(function (k) { return { k: k, plies: probs[k], n: probs[k].length }; });
    var order = Object.keys(PROBLEMS);
    list.sort(function (a, b) { return (b.n - a.n) || (order.indexOf(a.k) - order.indexOf(b.k)); });
    // opening: how far the game followed a line the app teaches
    var best = null, cl = function (x) { return x.replace(/[+#!?]/g, ''); };
    if (job.startFen === Game.START) allLines().forEach(function (L) { var n = 0; while (n < L.moves.length && n < sans.length && cl(L.moves[n]) === cl(sans[n])) n++; if (n >= 4 && (!best || n > best.n)) best = { L: L, n: n }; });
    var book = best ? { id: best.L.id, name: best.L.base ? best.L.base.name : best.L.name, n: best.n, full: best.n >= best.L.moves.length, theirs: best.L.side !== color } : null;
    if (book && book.theirs) book.defId = best.L.def ? best.L.base.id : DEFENCES[best.L.id] ? 'def-' + best.L.id : best.L.id;
    if (book && book.theirs && (best.L.family === 'Traps' || best.L.gambit) && best.n >= best.L.moves.length - 1) {
      var D2 = lineById(book.defId), at = -1;
      if (D2 && D2.def) { var q = 0; while (q < D2.moves.length && q < sans.length && cl(D2.moves[q]) === cl(sans[q])) q++; if (q < sans.length && q < D2.moves.length) at = q; }
      if (at < 0) for (var z = Math.min(best.n, sans.length) - 1; z >= 0; z--) if ((new Game(job.startFen).turn() === 'w' ? z % 2 === 0 : z % 2 === 1) === (color === 'w')) { at = z; break; }
      list.unshift({ k: 'trap', plies: [Math.max(0, at)], n: 1 });
    }
    return { problems: list, phase: { open: avg(phase.open), mid: avg(phase.mid), end: avg(phase.end) }, opening: openingName(job.headers), book: book };
  }
  function lessonFor(p) { var ls = PROBLEMS[p].lesson; if (!ls.length) return null; return ls.filter(function (id) { return LESSONS[id] && !lessonDone(id); })[0] || ls.filter(function (id) { return LESSONS[id]; })[0]; }
  function resultFor(h, color) { var r = h.Result; if (r === '1/2-1/2') return 'draw'; if (r === '1-0') return color === 'w' ? 'win' : 'loss'; if (r === '0-1') return color === 'b' ? 'win' : 'loss'; return null; }
  function sideOf(h, user) { user = String(user || '').toLowerCase(); if (!user) return null; if (String(h.White || '').toLowerCase() === user) return 'w'; if (String(h.Black || '').toLowerCase() === user) return 'b'; return null; }

  var AN = null;
  MODES.analyze = {
    label: 'Analyze a game',
    enter: function (arg) {
      arg = arg || {};
      AN = { tab: arg.tab || 'cc', user: S.ccUser || '', games: null, busy: null, err: null, pgn: '', side: null, link: '' };
      if (!AN.job) setupBoard(Game.START, { orient: 'w' });
      MODES.analyze.render();
      if (arg.pgn) MODES.analyze.fromPgn(arg.pgn, arg.color);
    },
    render: function () {
      if (AN.job && !AN.job.done) return MODES.analyze.renderJob();
      if (AN.pat) return MODES.analyze.renderPatterns();
      var tab = AN.tab, hist = (S.anHist || []).slice(-4).reverse();
      var html = '<div class="eyebrow">Game analysis</div><h1 class="h1">Analyze a game</h1>' +
        '<p class="lede">Bring a game from chess.com, or any PGN. I check every one of your moves, then tell you what went wrong, why, and which lesson fixes it.</p>' +
        '<div class="seg an-tabs"><button class="' + (tab === 'cc' ? 'on' : '') + '" data-act="anTab" data-t="cc">chess.com</button><button class="' + (tab === 'pgn' ? 'on' : '') + '" data-act="anTab" data-t="pgn">Paste PGN</button></div>';
      if (tab === 'cc') {
        html += '<div class="an-form"><label class="an-lab">Your chess.com username<input id="an-user" class="an-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="e.g. MagnusCarlsen" value="' + esc(AN.user) + '"></label>' +
          '<label class="an-lab">Game link <span class="muted">(optional)</span><input id="an-link" class="an-in" autocomplete="off" spellcheck="false" placeholder="https://www.chess.com/game/live/…" value="' + esc(AN.link) + '"></label>' +
          '<div class="actions"><button class="btn primary" data-act="anFetch">' + (AN.busy === 'fetch' ? 'Loading…' : 'Find my games') + '</button><button class="btn" data-act="anPatterns">Find my patterns</button></div></div>';
        if (AN.games) html += '<div class="sect-head"><h2>Recent games</h2><span class="muted small">tap one to analyze</span></div><div class="an-games">' + (AN.games.length ? AN.games.map(function (x, k) {
          var me = String(x.white.username).toLowerCase() === AN.user.toLowerCase() ? 'w' : 'b', opp = me === 'w' ? x.black : x.white, mine = me === 'w' ? x.white : x.black;
          var res = mine.result === 'win' ? 'win' : /agreed|repetition|stalemate|insufficient|50move|timevsinsufficient/.test(mine.result) ? 'draw' : 'loss';
          var h = parsePGNHeaders(x.pgn), d = x.end_time ? new Date(x.end_time * 1000) : null;
          return '<button class="an-game ' + res + '" data-act="anPick" data-k="' + k + '"><span class="an-res">' + (res === 'win' ? 'W' : res === 'draw' ? '½' : 'L') + '</span><span class="an-gt"><b>vs ' + esc(opp.username) + ' <span class="muted">(' + (opp.rating || '?') + ')</span></b><span>' + (me === 'w' ? '♙ White' : '♟ Black') + ' · ' + esc(x.time_class || '') + (d ? ' · ' + d.toLocaleDateString() : '') + (openingName(h) ? ' · ' + esc(openingName(h)) : '') + '</span></span><span class="an-go">→</span></button>';
        }).join('') : '<p class="muted">No standard games found in the last few months.</p>') + '</div>';
      } else {
        var h = AN.pgn ? parsePGNHeaders(AN.pgn) : {};
        html += '<div class="an-form"><label class="an-lab">PGN<textarea id="an-pgn" class="an-in an-ta" spellcheck="false" placeholder="[Event &quot;Live Chess&quot;]&#10;…&#10;1. e4 e5 2. Nf3 Nc6 …">' + esc(AN.pgn) + '</textarea></label>' +
          '<p class="muted small">On chess.com: open the game, tap <b>Share</b>, then <b>PGN</b>, then <b>Copy</b>.</p>' +
          '<div class="an-side"><span class="muted small">You played</span><div class="seg">' + [['w', 'White' + (h.White ? ' (' + esc(h.White) + ')' : '')], ['b', 'Black' + (h.Black ? ' (' + esc(h.Black) + ')' : '')]].map(function (x) { var on = (AN.side || sideOf(h, S.ccUser) || 'w') === x[0]; return '<button class="' + (on ? 'on' : '') + '" data-act="anSide" data-c="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
          '<div class="actions"><button class="btn primary wide" data-act="anPgn">Analyze this game</button></div></div>';
      }
      if (AN.err) html += '<div class="status bad">' + esc(AN.err) + '</div>';
      if (hist.length) html += '<div class="sect-head"><h2>Analyzed before</h2></div><div class="an-hist">' + hist.map(function (x) { return '<div class="an-h"><b>vs ' + esc(x.opp) + '</b><span>' + (x.acc != null ? x.acc + '% · ' : '') + esc(x.top ? PROBLEMS[x.top].t : 'No big problems') + '</span></div>'; }).join('') + '</div>';
      setPanel(html);
      var u = $('#an-user'); if (u) u.oninput = function () { AN.user = ccUser(u.value); };
      var lk = $('#an-link'); if (lk) lk.oninput = function () { AN.link = lk.value.trim(); };
      var ta = $('#an-pgn'); if (ta) ta.oninput = function () { AN.pgn = ta.value; };
    },
    fromPgn: function (text, color) {
      var P = parsePGN(text);
      if (P.error) { AN.err = P.error; AN.tab = 'pgn'; MODES.analyze.render(); return; }
      color = color || sideOf(P.headers, S.ccUser) || AN.side || 'w';
      MODES.analyze.run({ sans: P.sans, startFen: P.startFen, headers: P.headers, color: color });
    },
    run: function (job) {
      AN.err = null; if (!job.fast) AN.pat = null;
      job.log = []; job.i = 0; job.done = false; job.tok = (AN.jtok = (AN.jtok || 0) + 1);
      job.result = resultFor(job.headers, job.color);
      job.opp = (job.color === 'w' ? job.headers.Black : job.headers.White) || 'Opponent';
      job.oppElo = job.color === 'w' ? job.headers.BlackElo : job.headers.WhiteElo;
      job.mine = job.sans.filter(function (s, i) { return (new Game(job.startFen).turn() === 'w' ? i % 2 === 0 : i % 2 === 1) === (job.color === 'w'); }).length;
      job.checked = 0;
      AN.job = job;
      setupBoard(job.startFen, { orient: job.color });
      if (!job.fast) { Voice.say([V('an_start')]); MODES.analyze.renderJob(); }
      var g = new Game(job.startFen);
      function step() {
        if (!AN || AN.job !== job || job.tok !== AN.jtok) return;
        if (job.i >= job.sans.length) return MODES.analyze.finish(job);
        var i = job.i, fenBefore = g.fen(), mover = g.turn(), res = g.move(job.sans[i]);
        job.i++;
        B3.sync(g.fen()); B3.markers('last', [res.from, res.to]);
        if (mover !== job.color) { job.log[i] = {}; return setTimeout(step, 0); }
        var uci = res.from + res.to + (res.promotion || '');
        Eng.call('analyzeMove', fenBefore, uci, 30, job.fast ? 300 : 900).then(function (a) {
          if (!AN || AN.job !== job) return;
          job.checked++;
          if (a) {
            var gr = grade(a, res, fenBefore, uci), c = gr.c;
            if (a.bestScore > 90000 && a.playedScore < 90000) c = CLASS.blunder;
            var e = { drop: c.positive ? 0 : Math.max(0, winChance(a.bestScore) - winChance(a.playedScore)) * 100, cls: c.cls, label: c.label, loss: c.positive ? Math.min(a.loss, 10) : a.loss, best: a.best, bestSan: a.bestSan, key: c.key, fen: fenBefore, uci: uci, san: res.san, reply: a.replySan,
              bs: a.bestScore, ps: a.playedScore, rs: a.reply ? a.reply.score : null, rc: a.reply && a.reply.captured || null };
            if (!c.positive) { var wb = whyBest(a, a.bestSan, i + 1, fenBefore); e.why = wb[0]; e.whyText = wb[1]; if (!a.best.captured && a.loss >= 150 && forkTargets(fenBefore, { from: a.best.from, to: a.best.to, promotion: a.best.promotion || undefined }) >= 2) e.fork = true; }
            job.log[i] = e;
          } else job.log[i] = {};
          if (!job.fast) MODES.analyze.renderJob();
          step();
        }, function () { job.log[i] = {}; step(); });
      }
      step();
    },
    renderJob: function () {
      document.body.dataset.layout = 'board';
      var job = AN.job, pct = job.mine ? Math.round(job.checked / job.mine * 100) : 0;
      var dots = job.log.map(function (l, i) { return l && l.cls ? '<i class="cdot ' + l.cls + '" title="' + esc(job.sans[i] + ' · ' + l.label) + '"></i>' : ''; }).join('');
      var last = job.log.filter(function (l) { return l && l.cls; }).pop();
      setPanel('<div class="eyebrow">Game analysis</div><h1 class="h1">vs ' + esc(job.opp) + '</h1>' +
        '<p class="muted">' + esc([openingName(job.headers), job.headers.Date && job.headers.Date.replace(/\./g, '-'), job.result ? { win: 'you won', loss: 'you lost', draw: 'draw' }[job.result] : ''].filter(Boolean).join(' · ')) + '</p>' +
        '<div class="an-prog"><div class="an-prog-top"><b>Checking move ' + Math.min(job.checked + 1, job.mine) + ' of ' + job.mine + '</b><span class="mono">' + pct + '%</span></div><div class="ms-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="an-dots">' + dots + '</div>' + (last ? '<p class="small an-last"><b>' + esc(last.san) + '</b> · ' + esc(last.label) + '</p>' : '') + '</div>' +
        '<div class="actions"><button class="btn ghost" data-act="anCancel">Cancel</button></div>');
    },
    finish: function (job) {
      job.done = true;
      var mine = job.log.filter(function (l) { return l && l.cls; });
      var accs = mine.map(function (l) { return Math.max(0, Math.min(100, 103.17 * Math.exp(-0.04354 * (l.drop || 0)) - 3.17)); });
      var mean = accs.reduce(function (s, x) { return s + x; }, 0) / (accs.length || 1), harm = accs.length / accs.reduce(function (s, x) { return s + 1 / Math.max(5, x); }, 0);
      job.acc = mine.length ? Math.round((mean + harm) / 2) : null;
      job.report = gameReport(job);
      if (job.onDone) return job.onDone(job);
      var top = job.report.problems[0];
      S.anHist = (S.anHist || []).concat([{ d: dayKey(), opp: job.opp, acc: job.acc, top: top ? top.k : null, res: job.result }]).slice(-30);
      addXP(15); save();
      var title = (job.result === 'win' ? 'You won' : job.result === 'loss' ? 'You lost' : job.result === 'draw' ? 'Draw' : 'Your game') + (job.report.opening ? ' · ' + job.report.opening : '');
      Voice.say([V('an_done'), top ? V(PROBLEMS[top.k].v) : V('an_clean')]);
      go('review', { log: job.log, startFen: job.startFen, moves: job.sans, color: job.color, result: job.result, acc: job.acc, level: { name: job.opp + (job.oppElo ? ' (' + job.oppElo + ')' : '') }, over: title, report: job.report, back: 'analyze' });
    },
    // Patterns across the last few games: problems found by the engine, plus results by opening and colour.
    patterns: function (user) {
      AN.busy = 'pat'; AN.err = null; MODES.analyze.render();
      AN.pat = { user: user, status: 'Downloading your games…', n: 0, total: 0, agg: {}, games: [], per: [] };
      MODES.analyze.renderPatterns();
      var tok = AN.tok = (AN.tok || 0) + 1;
      CC.recent(user, 40).then(function (list) {
        if (!AN || AN.tok !== tok) return;
        var P = AN.pat; P.games = list; P.total = Math.min(6, list.length);
        if (!list.length) { P.status = 'No standard games found.'; P.done = true; return MODES.analyze.renderPatterns(); }
        var k = 0;
        function next() {
          if (!AN || AN.tok !== tok) return;
          if (k >= P.total) { P.done = true; AN.busy = null; Voice.say([V('an_patterns')]); return MODES.analyze.renderPatterns(); }
          var x = list[k++], parsed = parsePGN(x.pgn), color = String(x.white.username).toLowerCase() === user.toLowerCase() ? 'w' : 'b';
          if (parsed.error) return next();
          P.status = 'Checking game ' + k + ' of ' + P.total + ' (vs ' + (color === 'w' ? x.black.username : x.white.username) + ')';
          MODES.analyze.renderPatterns();
          var job = { sans: parsed.sans, startFen: parsed.startFen, headers: parsed.headers, color: color, fast: true, onDone: function (j) {
            j.report.problems.forEach(function (p) { P.agg[p.k] = (P.agg[p.k] || 0) + p.n; });
            P.per.push({ opp: j.opp, acc: j.acc, res: j.result, top: j.report.problems[0] && j.report.problems[0].k, pgn: x.pgn, color: color });
            AN.job = null; next();
          } };
          MODES.analyze.run(job);
        }
        next();
      }, function (e) { if (!AN) return; AN.pat = null; AN.busy = null; AN.err = ccError(e); MODES.analyze.render(); });
    },
    renderPatterns: function () {
      var P = AN.pat, html = '<button class="back" data-act="anBack">← Analyze a game</button><div class="eyebrow">Your patterns · ' + esc(P.user) + '</div><h1 class="h1">What keeps costing you games</h1>';
      if (!P.done) {
        var pct = P.total ? Math.round(P.per.length / P.total * 100) : 3;
        html += '<div class="an-prog"><div class="an-prog-top"><b>' + esc(P.status) + '</b><span class="mono">' + pct + '%</span></div><div class="ms-bar"><i style="width:' + pct + '%"></i></div><p class="muted small">This takes a minute or two: every one of your moves in your last ' + (P.total || 6) + ' games is checked.</p></div><div class="actions"><button class="btn ghost" data-act="anCancel">Cancel</button></div>';
        return setPanel(html);
      }
      var agg = Object.keys(P.agg).map(function (k) { return { k: k, n: P.agg[k] }; }).sort(function (a, b) { return b.n - a.n; }), n = P.per.length || 1;
      var accs = P.per.filter(function (x) { return x.acc != null; }).map(function (x) { return x.acc; });
      html += '<div class="rv-hero"><div><div class="muted small">Average accuracy (' + P.per.length + ' games)</div><div class="rating">' + (accs.length ? Math.round(accs.reduce(function (s, x) { return s + x; }, 0) / accs.length) + '%' : '–') + '</div></div></div>';
      html += agg.length ? '<div class="sect-head"><h2>Your top problems</h2></div><div class="an-probs">' + agg.slice(0, 4).map(function (p, i) { var P2 = PROBLEMS[p.k], L = lessonFor(p.k); return '<div class="an-prob' + (i === 0 ? ' first' : '') + '"><div class="an-prob-h"><b>' + esc(P2.t) + '</b><span class="an-n">' + p.n + '× · ' + (p.n / n).toFixed(1) + ' per game</span></div><p>' + esc(P2.fix) + '</p>' + (p.k === 'trap' ? '<button class="mini-btn" data-act="goMode" data-m="openings">Fix it: learn the trap defences →</button>' : L ? '<button class="mini-btn" data-act="lesson" data-id="' + L + '">Fix it: ' + esc(LESSONS[L].title) + ' →</button>' : '') + '</div>'; }).join('') + '</div>'
        : '<p class="lede">No repeated problems found. Clean chess!</p>';
      // openings and colours from all downloaded games (no engine needed)
      var ops = {}, col = { w: [0, 0], b: [0, 0] };
      P.games.forEach(function (x) {
        var me = String(x.white.username).toLowerCase() === P.user.toLowerCase() ? 'w' : 'b', r = (me === 'w' ? x.white : x.black).result, win = r === 'win', draw = /agreed|repetition|stalemate|insufficient|50move|timevsinsufficient/.test(r);
        var name = openingName(parsePGNHeaders(x.pgn)) || 'Unknown'; name = name.split(' ').slice(0, 3).join(' ');
        var o = ops[name] = ops[name] || { w: 0, d: 0, l: 0 }; if (win) o.w++; else if (draw) o.d++; else o.l++;
        col[me][0]++; if (win) col[me][1]++;
      });
      var opl = Object.keys(ops).map(function (k) { var o = ops[k]; return { k: k, n: o.w + o.d + o.l, o: o }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
      html += '<div class="sect-head"><h2>Your openings</h2><span class="muted small">last ' + P.games.length + ' games</span></div><div class="an-ops">' + opl.map(function (x) { var s = Math.round((x.o.w + x.o.d / 2) / x.n * 100); return '<div class="an-op"><span class="an-op-n">' + esc(x.k) + '</span><span class="an-op-bar"><i class="w" style="width:' + (x.o.w / x.n * 100) + '%"></i><i class="d" style="width:' + (x.o.d / x.n * 100) + '%"></i><i class="l" style="width:' + (x.o.l / x.n * 100) + '%"></i></span><span class="mono small">' + s + '%</span></div>'; }).join('') + '</div>' +
        '<p class="muted small">As White you won ' + col.w[1] + ' of ' + col.w[0] + ', as Black ' + col.b[1] + ' of ' + col.b[0] + '.</p>';
      html += '<div class="sect-head"><h2>Games checked</h2><span class="muted small">tap for the full review</span></div><div class="an-games">' + P.per.map(function (x, k) { return '<button class="an-game ' + (x.res || '') + '" data-act="anPatGame" data-k="' + k + '"><span class="an-res">' + (x.res === 'win' ? 'W' : x.res === 'draw' ? '½' : 'L') + '</span><span class="an-gt"><b>vs ' + esc(x.opp) + '</b><span>' + (x.acc != null ? x.acc + '% accuracy' : '') + (x.top ? ' · ' + esc(PROBLEMS[x.top].t) : '') + '</span></span><span class="an-go">→</span></button>'; }).join('') + '</div>';
      setPanel(html);
    },
    leave: function () { AN = null; }
  };
  function parsePGNHeaders(text) { var h = {}, m, re = /\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]/g; while ((m = re.exec(text || ''))) h[m[1]] = m[2]; return h; }
  function readAnInputs() { var u = $('#an-user'), lk = $('#an-link'), ta = $('#an-pgn'); if (u) AN.user = ccUser(u.value); if (lk) AN.link = lk.value.trim(); if (ta) AN.pgn = ta.value; }
  ACT.goAnalyze = function () { go('analyze'); };
  ACT.anTab = function (d) { readAnInputs(); AN.tab = d.t; AN.err = null; MODES.analyze.render(); };
  ACT.anSide = function (d) { readAnInputs(); AN.side = d.c; MODES.analyze.render(); };
  ACT.anPgn = function () { readAnInputs(); if (!AN.pgn.trim()) { AN.err = 'Paste a PGN first.'; return MODES.analyze.render(); } var P = parsePGN(AN.pgn); MODES.analyze.fromPgn(AN.pgn, AN.side || (P.headers && sideOf(P.headers, S.ccUser)) || 'w'); };
  ACT.anFetch = function () {
    readAnInputs();
    var u = AN.user, id = ccLinkId(AN.link);
    if (!u) { AN.err = 'Type your chess.com username first' + (id ? ': chess.com finds games by player, so the link alone is not enough.' : '.'); return MODES.analyze.render(); }
    S.ccUser = u; save(); AN.err = null; AN.busy = 'fetch'; MODES.analyze.render();
    var tok = AN.tok = (AN.tok || 0) + 1;
    (id ? CC.find(u, id).then(function (x) { return [x]; }) : CC.recent(u, 15)).then(function (list) {
      if (!AN || AN.tok !== tok) return;
      AN.busy = null;
      if (id) { var x = list[0], P = parsePGN(x.pgn); if (P.error) { AN.err = P.error; return MODES.analyze.render(); } return MODES.analyze.run({ sans: P.sans, startFen: P.startFen, headers: P.headers, color: String(x.white.username).toLowerCase() === u.toLowerCase() ? 'w' : 'b' }); }
      AN.games = list; MODES.analyze.render();
    }, function (e) { if (!AN || AN.tok !== tok) return; AN.busy = null; AN.err = ccError(e); MODES.analyze.render(); });
  };
  ACT.anPick = function (d) { var x = AN.games[+d.k]; if (!x) return; var P = parsePGN(x.pgn); if (P.error) { AN.err = P.error; return MODES.analyze.render(); } MODES.analyze.run({ sans: P.sans, startFen: P.startFen, headers: P.headers, color: String(x.white.username).toLowerCase() === AN.user.toLowerCase() ? 'w' : 'b' }); };
  ACT.anPatterns = function () { readAnInputs(); if (!AN.user) { AN.err = 'Type your chess.com username first.'; return MODES.analyze.render(); } S.ccUser = AN.user; save(); MODES.analyze.patterns(AN.user); };
  ACT.anPatGame = function (d) { var x = AN.pat && AN.pat.per[+d.k]; if (!x) return; AN.pat = null; MODES.analyze.fromPgn(x.pgn, x.color); };
  ACT.anCancel = function () { if (!AN) return; AN.tok = (AN.tok || 0) + 1; AN.jtok = (AN.jtok || 0) + 1; AN.job = null; AN.pat = null; AN.busy = null; setupBoard(Game.START, { orient: 'w' }); MODES.analyze.render(); };
  ACT.anBack = function () { ACT.anCancel(); };
  ACT.rvJump = function (d) { MODES.review.goto(+d.n); };
  // The report shown at the top of a review of an imported game
  function reportHtml(r) {
    var R = r.report, ph = R.phase;
    var bar = function (label, v) { return '<div class="an-ph"><span>' + label + '</span><span class="an-ph-bar"><i style="width:' + (v || 0) + '%" class="' + (v == null ? '' : v >= 80 ? 'good' : v >= 60 ? 'warn' : 'bad') + '"></i></span><span class="mono small">' + (v == null ? '–' : v + '%') + '</span></div>'; };
    var html = '<div class="sect-head"><h2>Problems in this game</h2><span class="muted small">' + (R.problems.length ? 'worst first' : '') + '</span></div>';
    html += !R.problems.length ? '<p class="lede">No real problems found. Well played!</p>' : '<div class="an-probs">' + R.problems.slice(0, 5).map(function (p, i) {
      var P = PROBLEMS[p.k], L = lessonFor(p.k);
      return '<div class="an-prob' + (i === 0 ? ' first' : '') + '"><div class="an-prob-h"><b>' + esc(P.t) + '</b><span class="an-n">' + (p.n > 1 ? p.n + '×' : '') + '</span></div><p>' + esc(P.fix) + '</p><div class="an-ex">' +
        p.plies.slice(0, 4).map(function (ply) { return ply > 0 || p.k !== 'earlyQueen' ? '<button class="mini-btn ghost" data-act="rvJump" data-n="' + (ply + 1) + '">Move ' + (Math.floor(ply / 2) + 1) + (r.moves[ply] ? ': ' + esc(r.moves[ply]) : '') + '</button>' : ''; }).join('') +
        (p.k === 'trap' && R.book ? '<button class="mini-btn" data-act="openOp" data-id="' + esc(R.book.defId) + '">Fix it: learn the defence →</button>' : L ? '<button class="mini-btn" data-act="lesson" data-id="' + L + '">Fix it: ' + esc(LESSONS[L].title) + ' →</button>' : '') + '</div></div>';
    }).join('') + '</div>';
    if (R.book) html += '<p class="placed-note"><span class="pn-ico">📖</span><span>' + (R.book.theirs ? 'Your opponent played the ' + esc(R.book.name) + (R.book.full ? ' all the way.' : ' for ' + Math.ceil(R.book.n / 2) + ' moves.') + ' <button class="link" data-act="openOp" data-id="' + esc(R.book.defId) + '">Learn how to meet it</button>'
      : (R.book.full ? 'You played the whole ' + esc(R.book.name) + ' line I teach.' : 'You followed the ' + esc(R.book.name) + ' for ' + Math.ceil(R.book.n / 2) + ' moves, then left the line.') + ' <button class="link" data-act="openOp" data-id="' + esc(R.book.id) + '">Study it</button>') + '</span></p>';
    return html + '<div class="sect-head"><h2>Accuracy by phase</h2></div><div class="an-phases">' + bar('Opening', ph.open) + bar('Middlegame', ph.mid) + bar('Endgame', ph.end) + '</div>';
  }


  // ================= Daily warm-up: spaced review of finished lessons =================
  // Every lesson leaves small review items behind. Each one comes back after 1, 2, 4, 8, 16 days while you keep
  // getting it right, and the next day again when you miss it.
  var SRS_GAP = [1, 2, 4, 8, 16, 32];
  function dayPlus(n) { var d = new Date(); d.setDate(d.getDate() + n); return dayKey(d); }
  function srsItemsFor(lid) {
    var L = LESSONS[lid], out = [];
    L.steps.forEach(function (st, i) {
      var q = QUIZ_OF(st);
      if (q) out.push({ id: lid + ':' + i, lid: lid, kind: 'reach', type: q.type });
      else if (st.t === 'squares') out.push({ id: lid + ':' + i, lid: lid, kind: 'square' });
      else if (st.t === 'move' && st.sol && st.sol.length === 1) out.push({ id: lid + ':' + i, lid: lid, kind: 'move', step: st });
    });
    return out;
  }
  function srsAll() { var out = []; Object.keys(LESSONS).forEach(function (id) { if (lessonDone(id)) out = out.concat(srsItemsFor(id)); }); return out; }
  function srsDue() {
    S.srs = S.srs || {}; var today = dayKey();
    return srsAll().filter(function (it) { var r = S.srs[it.id]; if (!r) { S.srs[it.id] = { b: 0, due: dayPlus(1) }; return false; } return r.due <= today; });
  }
  function warmupCard() {
    if (lessonsDone() < 1 || (today().warm && today().warm >= 1)) return '';
    var due = srsDue(); save();
    if (!due.length) return '';
    var n = Math.min(5, due.length);
    return '<button class="warm-card" data-act="warmup"><span class="warm-ico" aria-hidden="true">🧠</span><span class="warm-t"><b>Daily warm-up</b><span>' + n + ' quick question' + (n > 1 ? 's' : '') + ' from your lessons · 1 minute · keeps them in your memory</span></span><span class="an-go" aria-hidden="true">→</span></button>';
  }
  var WU = null;
  MODES.warmup = {
    label: 'Daily warm-up',
    enter: function () {
      var due = srsDue();
      for (var k = due.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), t = due[k]; due[k] = due[j]; due[j] = t; }
      WU = { list: due.slice(0, 5), i: 0, ok: 0, res: [] };
      if (!WU.list.length) { go('path'); return; }
      Voice.say([V('cm_start')]);
      MODES.warmup.load();
    },
    load: function () {
      var it = WU.list[WU.i]; WU.done = false; WU.miss = 0; IX.tap = null; IX.onMove = null; IX.enabled = false;
      var PCN = { r: 'rook', b: 'bishop', q: 'queen', n: 'knight', k: 'king' };
      if (it.kind === 'reach') {
        var at = ['c3', 'd4', 'e5', 'f4', 'c6', 'e3', 'f5', 'd3'][Math.floor(Math.random() * 8)];
        var fen = fenOf(it.type, at); setupBoard(fen, { orient: 'w' });
        WU.reach = Collect.reach(it.type, at); WU.found = []; WU.need = Math.min(3, WU.reach.length); WU.at = at;
        WU.prompt = 'Tap ' + ['', 'one square', 'two squares', 'three squares'][WU.need] + ' the ' + PCN[it.type] + ' on ' + at + ' can move to.';
        IX.tap = MODES.warmup.tapReach;
      } else if (it.kind === 'square') {
        setupBoard('8/8/8/8/8/8/8/8 w - - 0 1', { orient: 'w' });
        var all = []; 'abcdefgh'.split('').forEach(function (f) { for (var r = 1; r <= 8; r++) all.push(f + r); });
        WU.target = all[Math.floor(Math.random() * 64)]; WU.prompt = 'Tap the square ' + WU.target + '.';
        IX.tap = MODES.warmup.tapSquare; Voice.say([M('sq_' + WU.target)], true);
      } else {
        var st = it.step, g = setupBoard(st.fen, { orient: new Game(st.fen).turn() });
        WU.prompt = st.text; WU.g = g;
        IX.enabled = true; IX.canMove = function (c) { return c === g.turn() && !WU.done; }; IX.onMove = MODES.warmup.onMove;
      }
      MODES.warmup.render();
    },
    render: function (msg, cls) {
      var it = WU.list[WU.i], L = LESSONS[it.lid];
      var pips = WU.list.map(function (x, k) { return '<i class="' + (k < WU.res.length ? (WU.res[k] ? 'on' : 'miss') : k === WU.i ? 'cur' : '') + '"></i>'; }).join('');
      setPanel('<button class="back" data-act="goPath">← Path</button><div class="eyebrow">Daily warm-up · ' + (WU.i + 1) + ' of ' + WU.list.length + '</div><h1 class="h1">Do you remember?</h1>' +
        '<div class="wu-pips">' + pips + '</div>' +
        '<div class="coach-card"><div class="coach-tag">From: ' + esc(L.title) + '</div><p class="coach-text">' + esc(WU.prompt) + '</p>' +
        (it.kind === 'reach' ? '<span class="quiz-pips">' + Array.apply(null, Array(WU.need)).map(function (x, k) { return '<i class="' + (k < WU.found.length ? 'on' : '') + '"></i>'; }).join('') + '</span>' : '') + '</div>' +
        '<div id="status" class="status ' + (cls || '') + '">' + (msg || '') + '</div>' +
        '<div class="actions">' + (WU.done ? '<button class="btn primary wide" data-act="wuNext">' + (WU.i < WU.list.length - 1 ? 'Next question →' : 'See my result') + '</button>' : '<button class="btn ghost" data-act="wuShow">I forgot, show me</button>') + '</div>');
    },
    answer: function (ok, msg) {
      var it = WU.list[WU.i], r = S.srs[it.id] || { b: 0 };
      if (ok) { r.b = Math.min(SRS_GAP.length - 1, (r.b || 0) + 1); r.due = dayPlus(SRS_GAP[r.b]); WU.ok++; Sound.play('good'); Voice.say([V('quiz_right')], true); }
      else { r.b = 0; r.due = dayPlus(1); Sound.play('bad'); }
      S.srs[it.id] = r; WU.res.push(ok); WU.done = true; IX.tap = null; IX.enabled = false; save();
      MODES.warmup.render((ok ? '<strong>Remembered.</strong> ' : '<strong>Here it is.</strong> ') + msg + (ok ? ' You will see this again in ' + SRS_GAP[r.b] + ' day' + (SRS_GAP[r.b] > 1 ? 's' : '') + '.' : ' It comes back tomorrow so it sticks.'), ok ? 'good' : 'bad');
    },
    tapReach: function (sq) {
      if (WU.done || sq === WU.at || WU.found.indexOf(sq) >= 0) return;
      if (WU.reach.indexOf(sq) < 0) { WU.miss++; B3.flash('bad', [sq], 500); if (WU.miss >= 2) { B3.markers('hint', WU.reach); return MODES.warmup.answer(false, MOVE_RULE[WU.list[WU.i].type] + ' The green squares are all of its moves.'); } toast(MOVE_RULE[WU.list[WU.i].type]); return; }
      WU.found.push(sq); B3.markers('good', WU.found.slice()); Sound.play('star');
      if (WU.found.length >= WU.need) { B3.markers('hint', WU.reach); return MODES.warmup.answer(WU.miss === 0, 'Every green square is a legal move for it.'); }
      MODES.warmup.render();
    },
    tapSquare: function (sq) {
      if (WU.done) return;
      if (sq === WU.target) { B3.flash('good', [sq], 900); return MODES.warmup.answer(WU.miss === 0, 'File ' + sq[0] + ', rank ' + sq[1] + '.'); }
      WU.miss++; B3.flash('bad', [sq], 500); toast('That is ' + sq + '.');
      if (WU.miss >= 2) { B3.flash('hint', [WU.target], 1600); MODES.warmup.answer(false, WU.target + ' is file ' + WU.target[0] + ' (the letter along the bottom), rank ' + WU.target[1] + ' (the number up the side).'); }
    },
    onMove: function (mv, uci) {
      var it = WU.list[WU.i], st = it.step, g = WU.g, test = new Game(g.fen()); test.move(mv);
      var ok = uci === st.sol[0] || (st.accept && st.accept.indexOf(uci) >= 0) || (st.anyMate && test.inCheckmate());
      return applyMove(g, mv).then(function () {
        if (ok) { B3.burst(mv.to); return MODES.warmup.answer(WU.miss === 0, esc(st.done || 'That is the move.')); }
        WU.miss++;
        if (WU.miss >= 2) { var s0 = st.sol[0]; B3.sync(st.fen); WU.g = setupBoard(st.fen, { orient: g.turn() }); B3.arrows([[s0.slice(0, 2), s0.slice(2, 4), 'g']]); return MODES.warmup.answer(false, esc(st.hint || '') + ' The arrow shows the move.'); }
        setTimeout(function () { if (!WU || WU.g !== g) return; g.undo(); B3.sync(g.fen()); IX.enabled = true; MODES.warmup.render('Not that one. ' + esc(st.hint || 'Look again.'), 'warn'); }, 700);
      });
    },
    finish: function () {
      var n = WU.list.length; today().warm = (today().warm || 0) + 1; addXP(10 + WU.ok * 3); save();
      if (WU.ok === n) { confetti(); Sound.play('win'); }
      document.body.dataset.layout = 'browse';
      setPanel('<button class="back" data-act="goPath">← Path</button><div class="eyebrow">Daily warm-up done · +' + (10 + WU.ok * 3) + ' XP</div><h1 class="h1">' + WU.ok + ' of ' + n + ' remembered</h1>' +
        '<p class="big-stars">' + '★'.repeat(WU.ok) + '<span class="dim">' + '★'.repeat(n - WU.ok) + '</span></p>' +
        '<p class="lede">' + (WU.ok === n ? 'Perfect memory. These come back later and later as they stick.' : 'The ones you missed come back tomorrow. That is how memory works: a little, often.') + '</p>' +
        '<div class="actions"><button class="btn primary wide" data-act="startNext">Continue learning →</button></div>');
    },
    leave: function () { WU = null; }
  };
  ACT.warmup = function () { go('warmup'); };
  ACT.wuNext = function () { if (!WU) return; if (WU.i < WU.list.length - 1) { WU.i++; MODES.warmup.load(); } else MODES.warmup.finish(); };
  ACT.wuShow = function () {
    if (!WU || WU.done) return; var it = WU.list[WU.i];
    if (it.kind === 'reach') { B3.markers('hint', WU.reach); return MODES.warmup.answer(false, MOVE_RULE[it.type] + ' The green squares are all of its moves.'); }
    if (it.kind === 'square') { B3.flash('hint', [WU.target], 1800); return MODES.warmup.answer(false, WU.target + ' is file ' + WU.target[0] + ', rank ' + WU.target[1] + '.'); }
    var s0 = it.step.sol[0]; B3.arrows([[s0.slice(0, 2), s0.slice(2, 4), 'g']]); MODES.warmup.answer(false, esc(it.step.hint || '') + ' The arrow shows the move.');
  };

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
          var sum = (opts.missedMate && !(mate && loser === 'them') ? 'No checkmate this way. ' : '') + (mate ? (loser === 'you' ? 'and that is checkmate against you.' : 'and that is checkmate.') : d <= -1 ? 'You end up ' + (-d) + ' point' + (-d > 1 ? 's' : '') + ' of material down.' : d >= 1 ? 'You end up ' + d + ' point' + (d > 1 ? 's' : '') + ' of material ahead.' : 'Nobody wins anything this way.');
          bar('<span class="rb-tag">Result</span><span class="rb-text">' + esc(sum) + '</span><span class="rb-actions">' + (opts.actions || '') + '<button class="mini-btn ghost" data-act="replayAgain">↻ Watch again</button></span>');
          Replay.last = { fen: fen, moves: moves, opts: opts };
          if (opts.done) opts.done(sum, g);
          return;
        }
        var mv = moves[i], mine = (g.turn() === me), t = new Game(g.fen()), dec = t.move(mv);
        if (!dec) { i = moves.length; return step(); }
        B3.arrows([[mv.from, mv.to, mine ? (first && i === 0 ? 'r' : 'g') : 'r']]);
        bar('<span class="rb-tag">' + (i + 1) + ' / ' + moves.length + '</span><span class="rb-text">' + (mine ? 'You move your ' : 'They move their ') + PIECE_NAME[dec.piece] + ' to ' + dec.to + ' <b class="mono">(' + esc(dec.san) + ')</b>' + (dec.captured ? ', taking the ' + PIECE_NAME[dec.captured] : '') + (/#$/.test(dec.san) ? '. Checkmate!' : /\+$/.test(dec.san) ? ', with check' : '') + '</span>');
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
    if (stageCleared(i) || (i > 0 && S.band >= STAGES[i].min) || placementStage() >= i) return true;
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
        '<p class="lede">Quick board-vision games, endgames to win against the engine, opening battles and the five bosses.</p>' +
        '<div class="sect-head"><h2>Quick games</h2><span class="muted small">beat your best</span></div><div class="ar-grid">' + vis + '</div>' +
        (beginnerMode() ? '<div class="placed-note"><span class="pn-ico">★</span><span><b>More unlocks as you learn.</b> Opening battles and the endgame challenges open once you finish Foundations. The quick games and Rookie Rex are ready now.</span></div>' : '<div class="sect-head"><h2>Opening battle</h2>' + (S.battleBest ? '<span class="pill-count">best streak ' + S.battleBest + '</span>' : '') + '</div>' +
        '<button class="battle-cta" data-act="battle"><span class="bc-ico">⚔</span><span><b>The coach slips once. Punish it.</b><span>Pick an opening you play. Somewhere in it the coach makes a mistake: find the move that wins.</span></span><span class="to-go">→</span></button>' +
        '<div class="sect-head"><h2>Win this position</h2><span class="muted small">against the engine</span></div><div class="ch-list">' + ch + '</div>') +
        '<div class="sect-head"><h2>Boss battles</h2><span class="muted small">beat one to clear its stage</span></div><div class="boss-list">' + bosses + '</div>');
    },
    leave: function () { B3.idle(false); }
  };
  ACT.arena = function () { go('arena'); };
  ACT.vision = function (d) { go('vision', d.id); };
  ACT.challenge = function (d) { var c = CHALLENGES.filter(function (x) { return x.id === d.id; })[0]; if (c) go('play', { spec: { kind: 'challenge', c: c, back: current === MODES.arena || (current === MODES.play && PL && PL.spec) ? 'arena' : 'goPath' } }); };
  ACT.boss = function (d) { var b = BOSSES.filter(function (x) { return x.id === d.id; })[0]; if (!b) return; if (!bossOpen(b.stage) && !S.bosses[b.id]) { toast('Finish ' + bossNeed(b.stage) + ' more lesson' + (bossNeed(b.stage) > 1 ? 's' : '') + ' in ' + STAGES[b.stage].name + ' first.'); return; } go('play', { spec: { kind: 'boss', b: b, back: current === MODES.arena ? 'arena' : 'goPath' } }); };
  function battleLines() { var tier = openingTier(S.puzzle.rating); return allLines().filter(function (L) { return TIER[L.level] <= tier && L.moves.length >= 8 && !(L.family === 'Traps' && !L.def); }); }
  ACT.battle = function (d) {
    var lines = battleLines(), pick = d && d.id ? lineById(d.id) : S.battlePick ? lineById(S.battlePick) : null;
    var L = pick && lines.indexOf(pick) >= 0 ? pick : lines[Math.floor(Math.random() * lines.length)];
    go('play', { spec: { kind: 'battle', line: L } });
  };
  ACT.battlePick = function (d) { S.battlePick = d.id === 'random' ? null : d.id; save(); ACT.battle(d.id === 'random' ? null : d); };

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
      VG.end = Date.now() + VG.meta.secs * 1000 + 600;
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
    var L = spec.line; return { eyebrow: 'Opening battle', title: L.def ? L.name : L.name, text: 'You play ' + (L.side === 'w' ? 'White' : 'Black') + '. The coach follows the ' + (L.base ? L.base.name : L.name) + ' and makes one mistake somewhere in the opening. Find the move that punishes it. Play the moves of the line; if you leave it, the coach still slips.', meta: (S.battleStreak ? 'Streak ' + S.battleStreak + ' · ' : '') + 'Best streak ' + (S.battleBest || 0), cta: 'Start the battle' };
  }
  MODES.play.renderSpecIntro = function () {
    var spec = PL.arg.spec, I = specIntro(spec);
    setPanel('<button class="back" data-act="' + (spec.back || 'arena') + '">← ' + (spec.back === 'goPath' ? 'Path' : 'Arena') + '</button><div class="spec-hero">' + (I.ava || '<span class="spec-ico">' + (spec.kind === 'battle' ? '⚔' : '★') + '</span>') + '<div><div class="eyebrow">' + esc(I.eyebrow) + '</div><h1 class="h1">' + esc(I.title) + '</h1><div class="muted small">' + esc(I.meta) + '</div></div></div>' +
      '<p class="lede">' + esc(I.text) + '</p>' +
      (spec.kind === 'battle' ? '<div class="sect-head"><h2>Your opening</h2><span class="muted small">pick the one you play</span></div><div class="chips battle-chips">' + (function () { var t = openingTier(S.puzzle.rating), ls = battleLines().filter(function (L) { return !L.def; }); ls.sort(function (x, y) { return Math.abs(TIER[x.level] - t) - Math.abs(TIER[y.level] - t); }); ls = ls.slice(0, 12); if (ls.indexOf(spec.line) < 0) ls.unshift(spec.line); return ls; })().map(function (L) { return '<button class="chip ' + (L === spec.line ? 'on' : '') + '" data-act="battlePick" data-id="' + L.id + '">' + (L.side === 'w' ? '♙ ' : '♟ ') + esc(L.def ? L.base.name + ' (' + (L.side === 'w' ? 'White' : 'Black') + ')' : L.name) + '</button>'; }).join('') + '<button class="chip" data-act="battlePick" data-id="random">Surprise me</button></div>' : '') +
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
    PL.judging = false; Celebrate.flush();
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
    var sp = PL.spec; PL.over = msg; IX.enabled = false; Celebrate.flush();
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
        (analyzeReady() ? '<button class="an-home" data-act="goAnalyze"><span class="an-home-ico" aria-hidden="true">🔍</span><span class="an-home-t"><b>Check your chess.com games</b><span>Find the mistakes you repeat and the lesson that fixes each one.</span></span><span class="an-go" aria-hidden="true">→</span></button>' : '') +
        '<div class="hero-stat"><div><div class="muted small">Training rating</div><div class="rating">' + Math.round(S.puzzle.rating) + '</div><div class="muted small">' + ratingBand(S.puzzle.rating) + ' · started at ' + S.band + '</div></div><canvas id="spark" width="220" height="64" aria-label="Rating history"></canvas></div>' +
        '<div class="stat-grid">' +
        stat('Lessons', (lessonsDone + placedN) + '/' + Object.keys(LESSONS).length + (placedN ? ' <span class="muted small">' + placedN + ' skipped</span>' : '')) + stat('Openings mastered', opsMastered + '/' + OPENINGS.length) +
        stat('Puzzles solved', solved + '/' + PUZZLES.length) + stat('Coach games', games.length + (games.length ? ' · ' + wins + ' won' : '')) + stat('Game rating', S.grating || '–') + stat('Bosses beaten', Object.keys(S.bosses || {}).length + '/' + BOSSES.length) +
        stat('Avg accuracy', avgAcc != null ? avgAcc + '%' : '–') + stat('Best win', bestWinLevel ? bestWinLevel.name + ' ~' + bestWinLevel.elo : '–') +
        '</div>' +
        '<div class="sect-head"><h2>30-day plan</h2><span class="muted small">missions per day</span></div><div class="cal">' + cells + '</div>' +
        '<div class="legend"><span><i class="cal-cell l0"></i>0</span><span><i class="cal-cell l2"></i>2</span><span><i class="cal-cell l4"></i>4 missions</span></div>' +
        '<div class="card tip"><strong>How the climb works.</strong> Ratings rise from fewer blunders, not more theory. Keep coach-game accuracy above 80%, beat the next coach level, and keep your puzzle rating rising. When you beat the Expert coach regularly, you are playing well above 1500.</div>' +
        '<div class="sect-head"><h2>Badges</h2><span class="muted small">' + Object.keys(S.badges).length + ' of ' + Object.keys(BADGES).length + '</span></div>' +
        '<div class="badge-grid">' + Object.keys(BADGES).map(function (k) { var b = BADGES[k], got = S.badges[k]; return '<div class="badge-tile ' + (got ? 'got' : '') + '" title="' + esc(b.text) + '"><span class="bt-ico">' + pieceSVG(b.icon, got ? 'w' : 'b', 30) + '</span><span class="bt-name">' + esc(b.name) + '</span></div>'; }).join('') + '</div>' +
        '<div class="sect-head"><h2>Your data</h2></div>' +
        '<p class="muted small">Progress is saved in this browser. Make a backup code to move it to another device or keep it safe.</p>' +
        '<div class="actions"><button class="btn" data-act="backup">Make backup code</button><button class="btn" data-act="restore">Restore from code</button><button class="btn ghost" data-act="askReset">Start over</button></div><div id="reset-zone"></div>');
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
  // ================= Google sign-in + cloud save =================
  // Uses an OAuth client ID from Google Cloud Console (Credentials > OAuth client ID > Web, with the site listed under
  // "Authorized JavaScript origins"). The ID lives in chess-ascent-config.js next to the page, never in this code.
  // Progress is saved in the player's own Google Drive, in a hidden app-only folder (scope drive.appdata).
  // Without the config file the app works exactly as before, saving in this browser only.
  var Cloud = (function () {
    var C = window.CHESS_ASCENT_CONFIG || {}, clientId = C.googleClientId || '', tokenClient = null, token = null, expires = 0, fileId = null, user = null, ready = null, pushT = null, applying = false, asking = false, pending = false;
    var FILE = 'chess-ascent-progress.json', SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.appdata', ACCT = 'chess-ascent-account';
    var st = { lastSync: 0, error: '', busy: false };
    try { user = JSON.parse(localStorage.getItem(ACCT) || 'null'); } catch (e) { user = null; }
    function enabled() { return /\.apps\.googleusercontent\.com$/.test(clientId) && !/PASTE/i.test(clientId); }
    function load(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = function () { rej(new Error('Could not reach Google sign-in.')); }; document.head.appendChild(s); }); }
    function init() {
      if (ready) return ready;
      if (!enabled()) return (ready = Promise.reject(new Error('Google sign-in is not set up')));
      ready = (window.google && google.accounts && google.accounts.oauth2 ? Promise.resolve() : load('https://accounts.google.com/gsi/client')).then(function () {
        tokenClient = google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: SCOPE, callback: onToken, error_callback: function (e) { asking = false; st.error = e && e.type === 'popup_closed' ? 'Sign-in was closed before it finished.' : 'Sign-in did not finish (' + (e && e.type || 'error') + ').'; refresh(); } });
      });
      ready.catch(function (e) { st.error = e.message; refresh(); });
      return ready;
    }
    function live() { return token && Date.now() < expires - 60000; }
    function ask(prompt) { if (!tokenClient || asking) return; asking = true; tokenClient.requestAccessToken({ prompt: prompt, login_hint: user && user.email || undefined }); }
    function api(url, opt) {
      opt = opt || {}; opt.headers = Object.assign({ Authorization: 'Bearer ' + token }, opt.headers || {});
      return fetch(url, opt).then(function (r) { if (r.status === 401) { token = null; throw new Error('expired'); } if (!r.ok) throw new Error('Google said ' + r.status); return r; });
    }
    function onToken(resp) {
      asking = false;
      if (!resp || resp.error || !resp.access_token) { st.error = 'Sign-in did not finish.'; refresh(); return; }
      if (!google.accounts.oauth2.hasGrantedAllScopes(resp, 'https://www.googleapis.com/auth/drive.appdata')) { st.error = 'Please allow saving to Google Drive, otherwise your progress cannot be stored.'; refresh(); return; }
      token = resp.access_token; expires = Date.now() + (resp.expires_in || 3600) * 1000; st.error = '';
      var first = !user;
      api('https://www.googleapis.com/oauth2/v3/userinfo').then(function (r) { return r.json(); }).then(function (u) {
        user = { name: u.name || '', email: u.email || '', picture: u.picture || '', sub: u.sub };
        try { localStorage.setItem(ACCT, JSON.stringify(user)); } catch (e) { }
        refresh(); return pull(first);
      }).catch(function (e) { st.error = 'Could not reach your Google account: ' + e.message; refresh(); });
    }
    function pull(first) {
      st.busy = true; refresh();
      var q = encodeURIComponent("name = '" + FILE + "'");
      return api('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,modifiedTime)&q=' + q).then(function (r) { return r.json(); }).then(function (j) {
        var f = (j.files || [])[0]; if (!f) return null;
        fileId = f.id;
        return api('https://www.googleapis.com/drive/v3/files/' + f.id + '?alt=media').then(function (r) { return r.json(); });
      }).then(function (data) {
        var cloud = null; try { cloud = data && data.state ? (typeof data.state === 'string' ? JSON.parse(data.state) : data.state) : null; } catch (e) { cloud = null; }
        var restored = mergeIn(cloud); st.busy = false; doPush();
        if (restored) toast('Welcome back, ' + (user.name || 'player').split(' ')[0] + '! Your progress is restored.');
        else if (first) toast('Signed in. Your progress now saves to your Google account.');
      }).catch(function (e) { st.busy = false; st.error = 'Could not read your saved progress: ' + e.message; refresh(); });
    }
    function rich(s) { return (s.xp || 0) + Object.keys(s.lessons || {}).length * 50 + Object.keys(s.puzzle && s.puzzle.solved || {}).length * 5; }
    // true when progress came from the account
    function mergeIn(c) {
      if (!c) return false;
      var localFresh = !S.onboarded || rich(S) === 0;
      applying = true;
      var base = localFresh || rich(c) > rich(S) ? c : JSON.parse(JSON.stringify(S)), other = base === c ? S : c;
      var M = Object.assign(freshState(), base);
      M.puzzle = Object.assign(freshState().puzzle, base.puzzle || {}); M.coach = Object.assign(freshState().coach, base.coach || {}); M.settings = Object.assign(freshState().settings, base.settings || {});
      if (!localFresh) { // nothing earned on either device is lost
        var maxMap = function (a, b, f) { a = a || {}; Object.keys(b || {}).forEach(function (k) { a[k] = a[k] == null ? b[k] : f(a[k], b[k]); }); return a; };
        M.lessons = maxMap(M.lessons, other.lessons, function (x, y) { return { done: x.done || y.done, stars: Math.max(x.stars || 0, y.stars || 0) }; });
        M.missions = maxMap(M.missions, other.missions, Math.max);
        M.arena = maxMap(M.arena, other.arena, Math.max);
        ['badges', 'bosses', 'challenges', 'cleared', 'disc', 'visited', 'hinted'].forEach(function (k) { M[k] = maxMap(M[k], other[k], function (x) { return x; }); });
        M.openings = maxMap(M.openings, other.openings, function (x, y) { return { drills: Math.max(x.drills || 0, y.drills || 0), perfect: Math.max(x.perfect || 0, y.perfect || 0) }; });
        M.puzzle.solved = maxMap(M.puzzle.solved, other.puzzle && other.puzzle.solved, Math.max);
        M.srs = maxMap(M.srs, other.srs, function (x, y) { return (x.b || 0) >= (y.b || 0) ? x : y; });
        M.xp = Math.max(M.xp || 0, other.xp || 0); M.streak = Math.max(M.streak || 0, other.streak || 0);
      }
      S = M; save(); applying = false; renderTop();
      var modal = $('#modal'); if (S.onboarded && modal && modal.classList.contains('intro')) { modal.hidden = true; modal.classList.remove('intro'); modal.onclick = null; }
      if (!current || current === MODES.path) go('path');
      return base === c;
    }
    function push(now) { if (!user || applying || st.busy) return; pending = true; clearTimeout(pushT); pushT = setTimeout(doPush, now ? 0 : 3000); }
    function doPush() {
      if (!user) return;
      if (!live()) { pending = true; refresh(); return; } // reconnects on the next tap
      pending = false;
      var body = JSON.stringify({
        app: 'chess-ascent', version: 1, updatedAt: new Date().toISOString(),
        profile: { name: user.name, email: user.email, picture: user.picture },
        summary: { xp: S.xp || 0, puzzleRating: Math.round(S.puzzle.rating), gameRating: S.grating || null, lessonsDone: lessonsDone(), streak: S.streak || 0, level: S.band, lastActive: S.lastActive || null, missions: Object.keys(S.missions || {}).length, gamesPlayed: (S.games || []).length },
        state: S
      });
      var req = fileId
        ? api('https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: body })
        : api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=cab' }, body: '--cab\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ name: FILE, parents: ['appDataFolder'] }) + '\r\n--cab\r\nContent-Type: application/json\r\n\r\n' + body + '\r\n--cab--' }).then(function (r) { return r.json(); }).then(function (j) { fileId = j.id; });
      Promise.resolve(req).then(function () { st.lastSync = Date.now(); st.error = ''; refresh(); }, function (e) { if (e.message === 'expired') pending = true; else st.error = 'Saving to your account failed: ' + e.message; refresh(); });
    }
    // Google needs a tap to hand out a fresh token: reconnect quietly on the first tap of a visit, or when it expires.
    document.addEventListener('pointerdown', function () { if (enabled() && user && !live() && tokenClient && !asking) ask(''); }, true);
    function signIn() {
      if (tokenClient) return ask(user ? '' : 'consent');
      init().then(function () { ask('consent'); });
    }
    function signOut() {
      try { if (token) google.accounts.oauth2.revoke(token, function () { }); } catch (e) { }
      token = null; user = null; fileId = null; try { localStorage.removeItem(ACCT); } catch (e) { }
      refresh(); toast('Signed out. Your progress stays saved in your Google account.');
    }
    function refresh() { var b = $('#settings-btn'); if (b) b.classList.toggle('signed-in', !!user); var a = $('#acct-box'); if (a) a.innerHTML = acctHtml(); }
    function acctHtml() {
      if (!enabled()) return '<div class="acct off"><b>Cloud save</b><span>Google sign-in is not set up on this site yet. Progress is saved in this browser only.</span></div>';
      if (!user) return '<div class="acct"><div class="acct-t"><b>Save your progress</b><span>Sign in to keep lessons, puzzles and games safe in your Google account and continue on any device.</span></div><button class="g-btn" data-set="gsign">' + G_ICON + ' Sign in with Google</button>' + (st.error ? '<p class="acct-err">' + esc(st.error) + '</p>' : '') + '</div>';
      return '<div class="acct on">' + (user.picture ? '<img class="acct-ava" src="' + esc(user.picture) + '" alt="" referrerpolicy="no-referrer">' : '<span class="acct-ava">' + esc((user.name || '?')[0]) + '</span>') +
        '<div class="acct-t"><b>' + esc(user.name || 'Signed in') + '</b><span>' + esc(user.email || '') + '</span><span class="acct-sync">' + (st.busy ? 'Syncing…' : st.error ? '⚠ ' + esc(st.error) : !live() ? 'Tap anywhere to reconnect and sync' : st.lastSync ? '✓ Saved to your Google account at ' + new Date(st.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '✓ Connected') + '</span></div>' +
        '<button class="btn ghost small-btn" data-set="gout">Sign out</button></div>';
    }
    var G_ICON = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
    return { enabled: enabled, init: init, signIn: signIn, signOut: signOut, push: push, user: function () { return user; }, html: acctHtml, refresh: refresh, gButton: function (label) { return '<button class="g-btn" data-ob="gsign">' + G_ICON + ' ' + esc(label) + '</button>'; } };
  })();

  function openSettings() {
    var s = S.settings, m = $('#modal');
    m.classList.remove('intro');
    m.innerHTML = '<div class="modal-card settings" role="dialog" aria-modal="true" aria-labelledby="set-title"><div class="set-head"><span class="cb-avatar big">' + coachAvatar() + '</span><div><div class="eyebrow">Settings</div><h1 class="h1" id="set-title">Your coach</h1></div></div>' +
      '<div id="acct-box">' + Cloud.html() + '</div>' +
      '<label class="field"><span>Coach name</span><input id="set-name" type="text" maxlength="24" value="' + esc(s.coachName) + '"></label>' +
      '<div class="field"><span>Your level <span class="dim">· sets where the course starts</span></span><div class="seg wrap">' + BANDS.map(function (b) { return '<button class="' + (S.band === b.v ? 'on' : '') + '" data-band="' + b.v + '" title="' + esc(b.t) + '">' + b.v + '</button>'; }).join('') + '</div></div>' +
      '<label class="field"><span>Voice volume <b id="vol-v">' + Math.round(s.volume * 100) + '%</b></span><input id="set-vol" type="range" min="0" max="1" step="0.05" value="' + s.volume + '"></label>' +
      '<div class="field"><span>Voice speed</span><div class="seg">' + [[0.9, 'Calm'], [1, 'Normal'], [1.15, 'Quick']].map(function (r) { return '<button class="' + (s.rate === r[0] ? 'on' : '') + '" data-rate="' + r[0] + '">' + r[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><span>Coach style in games</span><div class="seg">' + COACH_STYLES.map(function (cs) { return '<button class="' + (coachStyle() === cs.id ? 'on' : '') + '" data-style="' + cs.id + '">' + cs.name + '</button>'; }).join('') + '</div></div>' +
      '<label class="toggle"><input type="checkbox" id="set-snd" ' + (S.sound ? 'checked' : '') + '> <span>Sound effects</span></label>' +
      '<label class="toggle"><input type="checkbox" id="set-sub" ' + (s.subtitles ? 'checked' : '') + '> <span>Show what the coach says on the board</span></label>' +
      '<label class="toggle"><input type="checkbox" id="set-2d" ' + (s.board2d !== false ? 'checked' : '') + '> <span>Flat 2D board (switch to the classic 3D board any time from the board)</span></label>' +
      '<label class="toggle"><input type="checkbox" id="set-cam" ' + (s.cameraFixed ? 'checked' : '') + '> <span>Keep the 3D camera fixed (no rotating)</span></label>' +
      '<label class="toggle"><input type="checkbox" id="set-eval" ' + (showEvalBar() ? 'checked' : '') + '> <span>Show the "who\'s winning" bar in games</span></label>' +
      '<div class="field" id="set-over"><span>Start over <span class="dim">· erase progress on this device and begin again from the welcome screen</span></span><div class="actions"><button class="btn ghost" data-set="over">Start over</button></div></div>' +
      '<div class="actions"><button class="btn ghost" data-set="test">▶ Test voice</button><button class="btn primary" data-set="close">Done</button></div></div>';
    m.hidden = false;
    $('#set-name').oninput = function (e) { s.coachName = e.target.value.trim() || 'Coach Leo'; save(); };
    $('#set-vol').oninput = function (e) { s.volume = +e.target.value; $('#vol-v').textContent = Math.round(s.volume * 100) + '%'; save(); };
    $('#set-sub').onchange = function (e) { s.subtitles = e.target.checked; save(); };
    $('#set-snd').onchange = function (e) { S.sound = e.target.checked; save(); renderTop(); if (S.sound) Sound.play('move'); };
    $('#set-2d').onchange = function (e) { if (e.target.checked !== Board.is2D()) Board.toggle(); };
    $('#set-cam').onchange = function (e) { s.cameraFixed = e.target.checked; save(); B3.setCameraFixed(s.cameraFixed); };
    $('#set-eval').onchange = function (e) { S.coach.evalbar = e.target.checked; save(); if (current === MODES.play && PL && PL.g) $('#evalbar').hidden = !e.target.checked; };
    m.onclick = function (e) {
      var b = e.target.closest('[data-rate],[data-style],[data-set],[data-band]'); if (!b) { if (e.target === m) { m.hidden = true; } return; }
      if (b.dataset.set === 'gsign') { Cloud.signIn(); return; }
      if (b.dataset.set === 'over') { $('#set-over').innerHTML = '<span>Erase all lessons, ratings and history on this device and start like a brand-new player?</span><div class="actions"><button class="btn" data-set="overNo">Keep my progress</button><button class="btn danger" data-set="overYes">Erase and start over</button></div>'; return; }
      if (b.dataset.set === 'overNo') { openSettings(); return; }
      if (b.dataset.set === 'overYes') { ACT.doReset(); return; }
      if (b.dataset.set === 'gout') { Cloud.signOut(); return; }
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
  ACT.askReset = function () { $('#reset-zone').innerHTML = '<div class="card danger"><p>Start over like a brand-new player? This erases all lessons, ratings and history on this device, and shows the welcome and tour again.</p><div class="actions"><button class="btn" data-act="cancelReset">Keep</button><button class="btn danger" data-act="doReset">Erase and start over</button></div></div>'; };
  ACT.cancelReset = function () { $('#reset-zone').innerHTML = ''; };
  ACT.doReset = function () { wipeAll(); S = freshState(); try { location.reload(); } catch (e) { renderTop(); onboard(); } };

  // ================= Top bar and onboarding =================
  var lastMissions = null;
  function renderTop() {
    if (S.onboarded && !renderTop.busy) { renderTop.busy = true; try { discSync(); markNewTabs(); } finally { renderTop.busy = false; } }
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
      (Cloud.enabled() ? '<div class="ob-or"><span>Played before?</span>' + Cloud.gButton('Sign in with Google') + '</div>' : '') +
      '<p class="muted small">Sound on for the full experience.</p></div>';
    m.hidden = false;
    m.onclick = function (e) {
      var b = e.target.closest('[data-ob],[data-band]'); if (!b) return;
      if (b.dataset.ob === 'gsign') { Sound.unlock(); Cloud.signIn(); return; }
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
      S.xp = Math.max(S.xp || 0, { 800: 300, 1200: 800, 1600: 1600 }[v] || 0);
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
    explorer: { name: 'Explorer', text: 'Tried every part of Chess Ascent.', icon: 'n' },
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
      if (open || !queue.length || (current === MODES.mission && MS && !MS.over)) return;
      if (current === MODES.play && PL && PL.g && !PL.over) return; // never cover the board mid-game
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
    return { show: function (c) { queue.push(c); setTimeout(next, 500); }, flush: function () { setTimeout(next, 1200); }, pending: function () { return open || queue.length > 0; } };
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
      steps = [0, 1, TOUR.length - 1]; // the rest is explained in place, the first time each area opens
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

  // The 2D and the 3D board share one API. B3 becomes a thin front that remembers what is on the board
  // (position, markers, arrows, stars, orientation) so the player can switch between them mid-game.
  var Board = (function () {
    var impl3 = Object.assign({}, B3), impl2 = null, cur = null, ready3 = false, host2, host3;
    var BS = { fen: null, cats: {}, arrows: [], stars: [], orient: 'w', drag: null, camFixed: false, lift: null };
    function can3() { return typeof THREE !== 'undefined' && !!THREE.OrbitControls && !!impl3.init && webglOK(); }
    function moveFen(fen, mv) {
      if (!fen) return fen;
      var rows = fen.split(' ')[0].split('/').map(function (r) { return r.replace(/\d/g, function (d) { return '1'.repeat(+d); }).split(''); });
      function at(sq) { return [8 - +sq[1], sq.charCodeAt(0) - 97]; }
      var a = at(mv.from), b = at(mv.to), pc = rows[a[0]][a[1]];
      rows[a[0]][a[1]] = '1'; rows[b[0]][b[1]] = mv.promotion ? (mv.color === 'w' ? mv.promotion.toUpperCase() : mv.promotion) : pc;
      return rows.map(function (r) { return r.join('').replace(/1+/g, function (m) { return m.length; }); }).join('/') + fen.slice(fen.indexOf(' ') < 0 ? fen.length : fen.indexOf(' '));
    }
    var REC = {
      setPosition: function (a) { BS.fen = a[0]; },
      sync: function (a) { if (a[0]) BS.fen = a[0]; }, settle: function (a) { if (a[0]) BS.fen = a[0]; },
      animateMove: function (a) { BS.fen = a[1] || moveFen(BS.fen, a[0]); },
      markers: function (a) { BS.cats[a[0]] = a[1] || []; },
      arrows: function (a) { BS.arrows = (a[0] || []).slice(); },
      stars: function (a) { BS.stars = (a[0] || []).slice(); },
      takeStar: function (a) { BS.stars = BS.stars.filter(function (s) { return s !== a[0]; }); },
      clearAll: function () { BS.cats = {}; BS.arrows = []; BS.stars = []; BS.tags = null; BS.spot = null; },
      tags: function (a) { BS.tags = a[0] || null; }, spot: function (a) { BS.spot = a[0] || null; },
      setOrientation: function (a) { BS.orient = a[0]; },
      setDrag: function (a) { BS.drag = a[0]; }, setCameraFixed: function (a) { BS.camFixed = a[0]; }, lift: function (a) { BS.lift = a[0] || null; }
    };
    function front() {
      var keys = {}; Object.keys(impl3).forEach(function (k) { keys[k] = 1; });
      ['setPosition', 'sync', 'settle', 'animateMove', 'markers', 'flash', 'arrows', 'stars', 'takeStar', 'burst', 'clearAll', 'setOrientation', 'orientation', 'toggleView', 'idle', 'recenter', 'setDrag', 'lift', 'setCameraFixed', 'wait', 'tags', 'spot'].forEach(function (k) { keys[k] = 1; });
      Object.keys(B3).forEach(function (k) { delete B3[k]; });
      Object.keys(keys).forEach(function (k) {
        if (k === 'init' || k === 'setActive') return;
        B3[k] = function () { if (REC[k]) REC[k](arguments); var f = cur && cur[k]; return f ? f.apply(cur, arguments) : undefined; };
      });
      B3.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    }
    function use(two, first) {
      if (!two && !ready3) {
        try { impl3.init(host3, onBoardClick, onBoardHover); ready3 = true; }
        catch (e) { console.error(e); two = true; }
      }
      if (two && !impl2) { impl2 = BOARD2D_FACTORY(); impl2.init(host2, onBoardClick, onBoardHover); }
      if (cur && cur.setActive) cur.setActive(false);
      host2.style.display = two ? '' : 'none'; host3.style.display = two ? 'none' : '';
      cur = two ? impl2 : impl3;
      if (cur.setActive) cur.setActive(true);
      document.body.classList.toggle('board-2d', two);
      var bt = $('#dim-btn'); if (bt) bt.setAttribute('aria-label', two ? 'Switch to the 3D board' : 'Switch to the flat 2D board');
      if (first) return;
      if (BS.drag) cur.setDrag(BS.drag);
      cur.setCameraFixed(BS.camFixed);
      cur.setOrientation(BS.orient, false);
      if (BS.fen) cur.setPosition(BS.fen);
      cur.clearAll();
      Object.keys(BS.cats).forEach(function (c) { cur.markers(c, BS.cats[c]); });
      cur.arrows(BS.arrows); cur.stars(BS.stars); if (cur.tags) cur.tags(BS.tags); if (cur.spot) cur.spot(BS.spot);
      if (cur.lift) cur.lift(BS.lift);
      if (IX.game && !BS.fen) cur.sync(IX.game.fen());
    }
    return {
      setup: function () {
        var el = $('#three'); el.innerHTML = '';
        host3 = document.createElement('div'); host2 = document.createElement('div');
        host3.className = 'board-host'; host2.className = 'board-host'; el.appendChild(host3); el.appendChild(host2);
        front();
        var want2 = S.settings.board2d !== false || !can3();
        use(want2, true);
        if (!can3()) document.body.classList.add('no-3d');
      },
      is2D: function () { return cur === impl2; },
      can3: can3,
      toggle: function () {
        var two = !(cur === impl2);
        if (!two && !can3()) return toast('3D needs WebGL, which this browser has turned off.');
        S.settings.board2d = two; save(); use(two, false); Sound.play('move');
      }
    };
  })();
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
    $('#dim-btn').onclick = function () { Board.toggle(); };
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
    Board.setup();
    if (Cloud.enabled()) Cloud.init().catch(function () { });
    B3.setDrag({ can: dragCan, start: dragStart, drop: dragDrop, fen: function () { if (IX.collect) return fenOf(IX.collect.piece, IX.collect.at); return IX.game ? IX.game.fen() : null; } });
    B3.setCameraFixed(S.settings.cameraFixed);
    renderTop();
    document.addEventListener('pointerdown', function greet() {
      document.removeEventListener('pointerdown', greet);
      if (S.onboarded && S.lastGreet !== dayKey() && S.toured) { S.lastGreet = dayKey(); save(); Voice.say([V('welcome_back')], true); }
    });
    if (!S.onboarded) { setupBoard(Game.START, { drop: true }); B3.idle(true); onboard(); }
    else { go('path'); if (!S.toured) setTimeout(Tour.start, 1500); }
    // Launch screen: on the first visit download the coach's starter voice with real progress, then a Start tap
    // (which also unlocks sound); later visits just fade in.
    var SP = window.__splash;
    if (SP && $('#splash')) {
      SP.pieces(['p', 'n', 'b', 'r', 'q', 'k'].map(function (t) { return '<span>' + pieceSVG(t, 'w', 28) + '</span>'; }).join(''));
      var first = !S.voiceReady && Voice.hasClips(), mb = function (b) { return (b / 1048576).toFixed(1); }, finished = false;
      SP.set(14, 'Board ready');
      if (first) {
        var t0 = Date.now();
        setTimeout(function () { if (!finished) SP.skip(function () { finished = true; SP.done(false); }); }, 6000);
        Voice.preloadStart(function (f, got, tot) { if (!finished) SP.set(14 + f * 80, 'Loading Coach Leo\'s voice · ' + mb(got) + ' / ' + mb(tot) + ' MB'); })
          .then(function () { return document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]) : null; })
          .then(function () { if (finished) return; finished = true; S.voiceReady = true; save(); setTimeout(function () { SP.done(true, function () { Sound.unlock(); }); }, Math.max(0, 900 - (Date.now() - t0))); });
      } else { SP.set(100, 'Ready'); setTimeout(function () { SP.done(false); }, 500); }
    }
  }
  window.ChessAscent = { state: function () { return S; }, go: go, ACT: ACT, IX: IX, Game: Game, click: onBoardClick, drop: dragDrop, dbg: function () { return { DR: DR, LS: LS, PZ: PZ, PL: PL, OD: OD, ST: ST, VG: VG, RV: RV, E: LOCAL_ENGINE }; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
