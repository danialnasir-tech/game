  // ================= First-time experience: welcome, a first win, your plan, feature previews and a guiding hand =================
  // Show, don't tell: every step lets the player do the thing once and see the coach react.
  function WT(k) { return { id: 'W-' + k, text: CAREER_TEXT[k] }; }

  // A small self-contained board for demos (it never touches the main board)
  function MiniBoard(host) {
    var api = {}, pcs = {}, onTap = null;
    host.classList.add('mb');
    host.innerHTML = '<div class="mb-grid"></div><svg class="mb-arrows" viewBox="0 0 8 8" aria-hidden="true"></svg><div class="mb-pcs"></div><div class="mb-fx"></div>';
    var grid = host.querySelector('.mb-grid'), layer = host.querySelector('.mb-pcs'), svg = host.querySelector('.mb-arrows'), fx = host.querySelector('.mb-fx');
    for (var r = 8; r >= 1; r--) for (var f = 0; f < 8; f++) { var d = document.createElement('div'), sq = 'abcdefgh'[f] + r; d.className = 'mb-sq ' + ((f + r) % 2 ? 'l' : 'd'); d.dataset.sq = sq; if (f === 0) d.dataset.r = r; if (r === 1) d.dataset.f = 'abcdefgh'[f]; grid.appendChild(d); }
    function xy(sq) { return { x: sq.charCodeAt(0) - 97, y: 8 - +sq[1] }; }
    function place(el, sq) { var p = xy(sq); el.style.left = p.x * 12.5 + '%'; el.style.top = p.y * 12.5 + '%'; }
    api.set = function (fen) {
      layer.innerHTML = ''; svg.innerHTML = ''; fx.innerHTML = ''; pcs = {}; api.mark([], 'all');
      fen.split(' ')[0].split('/').forEach(function (row, i) { var f = 0; row.split('').forEach(function (ch) {
        if (/\d/.test(ch)) { f += +ch; return; }
        var sq = 'abcdefgh'[f] + (8 - i), el = document.createElement('span'); el.className = 'mb-pc'; el.innerHTML = pieceSVG(ch.toLowerCase(), ch === ch.toUpperCase() ? 'w' : 'b', 64); place(el, sq); layer.appendChild(el); pcs[sq] = el; f++;
      }); });
    };
    api.move = function (from, to) {
      var p = pcs[from]; if (!p) return; var cap = pcs[to];
      if (cap) { cap.classList.add('gone'); setTimeout(function () { cap.remove(); }, 320); }
      place(p, to); pcs[to] = p; delete pcs[from]; p.classList.add('moved'); setTimeout(function () { p.classList.remove('moved'); }, 400);
      try { Sound.play(cap ? 'capture' : 'move'); } catch (e) { }
    };
    api.arrow = function (list) {
      svg.innerHTML = (list || []).map(function (a) {
        var A = xy(a[0]), B = xy(a[1]), x1 = A.x + 0.5, y1 = A.y + 0.5, x2 = B.x + 0.5, y2 = B.y + 0.5, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, ex = x2 - ux * 0.32, ey = y2 - uy * 0.32;
        var c = a[2] === 'r' ? '#ff4f6d' : a[2] === 'g' ? '#3ddc97' : a[2] === 'b' ? '#4cc9f0' : '#ffd23f';
        return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + ex + '" y2="' + ey + '" stroke="' + c + '" stroke-width="0.17" stroke-linecap="round" opacity=".92"/>' +
          '<polygon points="' + x2 + ',' + y2 + ' ' + (ex - uy * 0.26) + ',' + (ey + ux * 0.26) + ' ' + (ex + uy * 0.26) + ',' + (ey - ux * 0.26) + '" fill="' + c + '" opacity=".95"/>';
      }).join('');
    };
    api.mark = function (sqs, cls) {
      grid.querySelectorAll('.mb-sq').forEach(function (d) { if (cls === 'all') d.classList.remove('dot', 'hl', 'bad', 'good', 'sel'); else d.classList.toggle(cls, sqs.indexOf(d.dataset.sq) >= 0); });
    };
    api.star = function (sq) { var s = document.createElement('span'); s.className = 'mb-star'; s.textContent = '⭐'; place(s, sq); fx.appendChild(s); return s; };
    api.pop = function (sq, text, cls) { var s = document.createElement('span'); s.className = 'mb-pop ' + (cls || ''); s.innerHTML = '<span>' + esc(text) + '</span>'; place(s, sq); fx.appendChild(s); setTimeout(function () { s.remove(); }, 2400); };
    api.clearFx = function () { fx.innerHTML = ''; svg.innerHTML = ''; };
    api.tap = function (fn) { onTap = fn; host.classList.toggle('live', !!fn); };
    grid.addEventListener('click', function (e) { var d = e.target.closest('.mb-sq'); if (d && onTap) onTap(d.dataset.sq); });
    return api;
  }
  // play a list of steps on a mini board: [from, to] moves, or functions; loops if asked
  function mbPlay(mb, fen, seq, opts) {
    opts = opts || {}; var timers = [], alive = true;
    function run() {
      if (!alive) return; mb.set(fen); var t = opts.lead || 700;
      seq.forEach(function (s) { timers.push(setTimeout(function () { if (!alive) return; if (typeof s === 'function') s(mb); else { mb.arrow([[s[0], s[1], s[2]]]); mb.move(s[0], s[1]); } }, t)); t += opts.gap || 900; });
      if (opts.loop) timers.push(setTimeout(run, t + (opts.hold || 2600)));
    }
    run();
    return { stop: function () { alive = false; timers.forEach(clearTimeout); } };
  }

  // ---------- the welcome flow (replaces the old modal and text tour)
  var Welcome = (function () {
    var el = null, st = {}, demo = null;
    var TRY = {
      100: { fen: '8/8/8/8/8/8/8/1N6 w - - 0 1', from: 'b1', to: 'c3', dots: ['a3', 'c3', 'd2'], star: 'c3', q: 'Move the knight to the ⭐', how: 'Tap the glowing square.', line: 'wl_try_100', good: 'wl_good_100', pop: '+10 XP',
        after: function (mb) { mb.arrow([['b1', 'b3', 'y'], ['b3', 'c3', 'y']]); } },
      400: { fen: '6k1/5ppp/3q4/8/8/8/5PPP/3R2K1 w - - 0 1', from: 'd1', to: 'd6', q: 'Win the free queen', how: 'Tap your rook, then the square it should go to.', hint: ['d1'], line: 'wl_try_400', good: 'wl_good_400', pop: '+9 points',
        after: function (mb) { mb.arrow([['d1', 'd6', 'g']]); } },
      800: { fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', from: 'b5', to: 'c7', q: 'Fork the king and the rook', how: 'Find one knight jump that attacks both.', hint: ['b5'], line: 'wl_try_800', good: 'wl_good_800', pop: 'Fork!',
        after: function (mb) { mb.arrow([['c7', 'e8', 'r'], ['c7', 'a8', 'r']]); } },
      1200: { fen: '4k3/8/8/8/3n4/8/8/R3K3 w - - 0 1', tapOnly: true, to: 'c2', q: 'Where does Black\'s knight fork you?', how: 'Tap the square it would jump to.', hint: ['d4'], line: 'wl_try_1200', good: 'wl_good_1200', pop: 'Threat spotted',
        after: function (mb) { mb.arrow([['d4', 'c2', 'b'], ['c2', 'e1', 'r'], ['c2', 'a1', 'r']]); } }
    };
    function dots(n) { return '<div class="wl-dots" aria-label="Step ' + (n + 1) + ' of 5">' + [0, 1, 2, 3, 4].map(function (i) { return '<i class="' + (i < n ? 'done' : i === n ? 'on' : '') + '"></i>'; }).join('') + '</div>'; }
    function coach(msg) { return '<div class="wl-coach"><span class="wl-ava" aria-hidden="true">' + pieceSVG('n', 'w', 30) + '</span><p class="wl-say">' + msg + '</p></div>'; }
    function screen(n, html) {
      if (demo) { demo.stop(); demo = null; }
      el.innerHTML = '<div class="wl-card" data-step="' + n + '">' + dots(n) + html + '</div>'; el.scrollTop = 0;
      var c = el.querySelector('.wl-card'); c.classList.remove('in'); void c.offsetWidth; c.classList.add('in');
    }
    function step0() {
      screen(0, '<h1 class="wl-title">Hi, I\'m <em>Coach Leo</em></h1>' + coach('I teach you chess one move at a time, and I react to <b>every move you make</b>. Watch:') +
        '<div class="wl-board" id="wl-board"></div><p class="wl-cap" id="wl-cap">The fastest checkmate in chess…</p>' +
        '<div class="wl-acts"><button class="btn primary big" data-wl="next">Let\'s start</button>' + (Cloud.enabled() ? Cloud.gButton('I have an account') : '') + '</div>');
      var mb = MiniBoard($('#wl-board')), cap = $('#wl-cap');
      demo = mbPlay(mb, Game.START, [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6'], function (m) { cap.textContent = 'Queen takes f7…'; m.arrow([['h5', 'f7', 'r'], ['c4', 'f7', 'r']]); }, ['h5', 'f7', 'r'],
        function (m) { m.pop('f7', 'Checkmate!', 'big'); m.mark(['e8'], 'bad'); cap.textContent = 'Checkmate in 4 moves. I\'ll teach you to play it, and to stop it.'; }], { loop: true, gap: 850, hold: 3200 });
      Voice.say([WT('wl_hi')]);
    }
    function step1() {
      screen(1, '<h1 class="wl-title">What should I call you?</h1>' + coach('I\'ll use your name in games, on your share cards and on your certificate.') +
        '<input class="wl-in" id="wl-name" maxlength="20" autocomplete="nickname" placeholder="Your name" value="' + esc(S.name || '') + '">' +
        '<div class="wl-acts"><button class="btn primary big" data-wl="name">Continue</button><button class="btn ghost" data-wl="noname">Skip</button></div>');
      var i = $('#wl-name'); setTimeout(function () { try { i.focus(); } catch (e) { } }, 300);
      i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); el.querySelector('[data-wl="name"]').click(); } });
      Voice.say([WT('wl_name')]);
    }
    function step2() {
      var ICON = { 100: '🌱', 400: '♟️', 800: '⚔️', 1200: '🎯', 1600: '🏆' };
      screen(2, '<h1 class="wl-title">' + (st.name ? 'Nice to meet you, ' + esc(st.name) + '! ' : '') + 'Where are you starting?</h1>' + coach('Pick the closest match. I\'ll set your lessons, puzzles and opponents to fit. You can change it any time.') +
        '<div class="wl-bands">' + BANDS.map(function (b) { return '<button class="wl-band" data-band="' + b.v + '"><span class="wb-ico">' + ICON[b.v] + '</span><span class="wb-t"><b>' + b.t + '</b><span>' + b.s + '</span></span><span class="wb-v">' + b.v + '</span></button>'; }).join('') + '</div>');
      Voice.say([WT('wl_level')]);
    }
    function step3() {
      var T = TRY[st.band >= 1200 ? 1200 : st.band] || TRY[100];
      screen(3, '<h1 class="wl-title">Try it: ' + esc(T.q) + '</h1>' + coach('<span id="wl-msg">' + esc(T.how) + '</span>') +
        '<div class="wl-board" id="wl-board"></div><div class="wl-acts"><button class="btn primary big" data-wl="next" id="wl-next" hidden>See my plan ▶</button><button class="btn ghost" data-wl="skiptry" id="wl-skip">Skip</button></div>');
      var mb = MiniBoard($('#wl-board')), msg = $('#wl-msg'), sel = null, done = false, miss = 0;
      mb.set(T.fen); if (T.star) mb.star(T.star); if (T.dots) mb.mark(T.dots, 'dot'); if (T.from) mb.mark([T.from], 'sel');
      mb.tap(function (sq) {
        if (done) return;
        if (!T.tapOnly && sq === T.from) { sel = sq; mb.mark([sq], 'sel'); return; }
        if (sq === T.to) {
          done = true; mb.tap(null); mb.mark([], 'all'); var stE = $('#wl-board .mb-star'); if (stE) stE.remove();
          if (!T.tapOnly) mb.move(T.from, T.to); else mb.mark([T.to], 'good');
          setTimeout(function () { T.after(mb); mb.pop(T.to, T.pop, 'big'); }, 380);
          msg.innerHTML = '<b>' + esc(CAREER_TEXT[T.good]) + '</b>'; el.querySelector('.wl-coach').classList.add('good');
          $('#wl-next').hidden = false; $('#wl-skip').hidden = true; Sound.play('good'); confettiSafe(); Voice.say([WT(T.good)]);
          st.tried = 1; return;
        }
        miss++; mb.mark([sq], 'bad'); setTimeout(function () { mb.mark([], 'bad'); }, 500); Sound.play('bad');
        msg.textContent = miss > 1 ? CAREER_TEXT.wl_wrong : T.how;
        if (T.hint) mb.mark(T.hint, 'sel');
        if (miss > 1) mb.mark([T.to].concat(T.dots || []), 'dot');
      });
      Voice.say([WT(T.line)]);
    }
    function confettiSafe() { try { confetti(); } catch (e) { } }
    function commit() {
      var v = st.band || 100;
      S.onboarded = true; S.band = v; S.startDate = S.startDate || dayKey(); S.puzzle.rating = v; S.toured = true;
      if (st.name) S.name = st.name;
      S.xp = Math.max(S.xp || 0, { 800: 300, 1200: 800, 1600: 1600 }[v] || 0) + (st.tried ? 10 : 0);
      S.coach.level = levelForRating(v); PATHUI.open = null;
      S.puzzle.hist = [[dayKey(), S.puzzle.rating]]; touchActivity();
      save(); renderTop();
    }
    function step4() {
      commit();
      var nl = nextLesson(), L = nl && LESSONS[nl], ch = nl ? stageOf(nl) : 0, boss = BOSSES.filter(function (b) { return b.stage === ch; })[0];
      screen(4, '<h1 class="wl-title">Your plan for today</h1>' + coach((st.name ? esc(st.name) + ', h' : 'H') + 'ere is Day 1 of 30. About <b>10 minutes</b>. Do it every day and you will feel the difference within a week.') +
        '<div class="wl-plan">' +
        '<div class="wl-tile"><span class="wt-n">1</span><span class="wt-i">🎓</span><span class="wt-t"><b>Learn</b><span>' + esc(L ? L.title : 'Your next lesson') + (L ? ' · ' + lessonMins(L) + ' min' : '') + '</span></span></div>' +
        '<div class="wl-tile"><span class="wt-n">2</span><span class="wt-i">🧩</span><span class="wt-t"><b>Practise</b><span>Puzzles that use what you just learned</span></span></div>' +
        '<div class="wl-tile"><span class="wt-n">3</span><span class="wt-i">⚔️</span><span class="wt-t"><b>Prove it</b><span>' + (boss ? 'Beat ' + esc(boss.name) + ' at the end of ' + esc(STAGES[ch].name) : 'Play a game against me') + '</span></span></div>' +
        '</div><p class="wl-chapter">You start in <b>Chapter ' + (ch + 1) + ' · ' + esc(STAGES[ch].name) + '</b></p>' +
        '<div class="wl-acts"><button class="btn primary big" data-wl="go">Start Day 1 ▶</button>' + (window.THREE ? '<button class="btn ghost" data-wl="list">I prefer a simple list</button>' : '') + '</div>');
      Voice.say([WT('wl_plan')]);
    }
    function close() { if (demo) { demo.stop(); demo = null; } if (el) { el.classList.add('out'); var e = el; setTimeout(function () { e.remove(); }, 380); el = null; } }
    function start() {
      if (el) el.remove(); st = { name: S.name || '' };
      el = document.createElement('div'); el.id = 'welcome'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-wl],[data-band],[data-ob]'); if (!b) return; Sound.unlock();
        if (b.dataset.ob === 'gsign') { Cloud.signIn(); return; }
        var a = b.dataset.wl;
        if (b.dataset.band) { st.band = +b.dataset.band; return step3(); }
        if (a === 'next') return el.querySelector('[data-step="0"]') ? step1() : step4();
        if (a === 'name') { st.name = ($('#wl-name').value || '').trim().slice(0, 20); return step2(); }
        if (a === 'noname') return step2();
        if (a === 'skiptry') return step4();
        if (a === 'go') { close(); if (window.THREE) go('career'); else ACT.startNext(); return; }
        if (a === 'list') { close(); S.career = false; save(); go('path'); setTimeout(function () { Guide.show('[data-act="startNext"]', 'Start your first lesson here'); }, 900); }
      });
      step0();
    }
    return { start: start };
  })();

  // ---------- feature previews: the first time an area opens, show it working, then let the player try it
  var FEATURES = {
    puzzles: { icon: '🧩', title: 'Puzzles: find the winning move', line: 'fi_puzzles', fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', seq: [function (m) { m.mark(['a1'], 'sel'); }, ['a1', 'a8', 'g'], function (m) { m.pop('a8', 'Checkmate · +12 rating', 'big'); m.mark(['g8'], 'bad'); }], guide: ['.b2-board', '#three canvas'], label: 'Your turn: tap a piece, then its square' },
    openings: { icon: '📖', title: 'Openings: start every game well', line: 'fi_openings', fen: Game.START, seq: [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], function (m) { m.pop('c4', 'Italian Game', 'big'); m.arrow([['c4', 'f7', 'r']]); }], guide: ['.rec-card', '.op-card'], label: 'Pick an opening to learn' },
    play: { icon: '🤝', title: 'Play me: feedback on every move', line: 'fi_play', fen: Game.START, seq: [['e2', 'e4'], function (m) { m.pop('e4', '✓ Good: takes the centre', 'good'); }, ['e7', 'e5'], ['d1', 'h5'], function (m) { m.pop('h5', '⚠ Early queen: she gets chased', 'warn'); }, ['b8', 'c6'], function (m) { m.pop('c6', '✓ Black develops with tempo', 'good'); }], guide: ['[data-act="startGame"]'], label: 'Choose a level, then start' },
    arena: { icon: '⚔️', title: 'The Arena: quick wins', line: 'fi_arena', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', seq: [['b5', 'c7'], function (m) { m.arrow([['c7', 'e8', 'r'], ['c7', 'a8', 'r']]); m.pop('c7', 'Fork! ⭐⭐⭐', 'big'); }], guide: ['.boss-row:not([disabled])', '.ar-tile', '.ex-tile'], label: 'Pick a challenge' },
    progress: { icon: '📈', title: 'Progress: see yourself improve', line: 'fi_progress', chart: true, guide: null }
  };
  var FeatureIntro = (function () {
    var el = null, demo = null;
    function close(tryIt, mode) {
      if (demo) { demo.stop(); demo = null; } if (!el) return; el.classList.add('out'); var e = el; setTimeout(function () { e.remove(); }, 300); el = null;
      var F = FEATURES[mode]; if (tryIt && F && F.guide) setTimeout(function () { Guide.show(F.guide.join(','), F.label); }, 350);
    }
    function show(mode) {
      var F = FEATURES[mode]; if (!F || el) return;
      el = document.createElement('div'); el.className = 'fi-wrap';
      el.innerHTML = '<div class="fi-card" role="dialog" aria-modal="true"><div class="fi-head"><span class="fi-ico">' + F.icon + '</span><b>' + esc(F.title) + '</b></div>' +
        (F.chart ? '<svg class="fi-chart" viewBox="0 0 300 120" aria-hidden="true"><path class="fi-line" d="M10 104 C 50 98, 70 92, 100 84 S 150 70, 180 60 S 240 30, 290 14" fill="none"/><circle cx="290" cy="14" r="6"/><text x="196" y="40">+180 in 30 days</text></svg>' : '<div class="fi-board" id="fi-board"></div>') +
        '<p class="fi-text">' + esc(CAREER_TEXT[F.line]) + '</p><div class="wl-acts"><button class="btn primary big" data-fi="try">' + (F.guide ? 'Try it now ▶' : 'Got it') + '</button></div></div>';
      document.body.appendChild(el);
      if (!F.chart) { var mb = MiniBoard($('#fi-board')); demo = mbPlay(mb, F.fen, F.seq, { loop: true, gap: 950, hold: 2600, lead: 500 }); }
      el.addEventListener('click', function (e) { if (e.target.closest('[data-fi]') || e.target === el) close(true, mode); });
      Voice.say([WT(F.line)]);
    }
    return { show: show, has: function (m) { return !!FEATURES[m]; }, open: function () { return !!el; } };
  })();

  // ---------- the guiding hand: points at what to tap next and goes away once it is tapped
  var Guide = (function () {
    var el = null, tgt = null, raf = 0, until = 0, cb = null;
    function find() {
      if (typeof tgt === 'function') { var p = tgt(); return p ? { left: p.x - 1, top: p.y - 1, width: 2, height: 2 } : null; }
      var sels = tgt.split(','); for (var k = 0; k < sels.length; k++) { var list = document.querySelectorAll(sels[k]); for (var i = 0; i < list.length; i++) { var r = list[i].getBoundingClientRect(); if (r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight) return r; } } return null;
    }
    function loop() {
      if (!el) return; var r = find();
      if (!r) el.style.opacity = '0';
      else {
        var x = r.left + r.width / 2, y = r.top + Math.min(r.height * 0.62, r.height - 6), up = y + 120 < innerHeight;
        el.classList.toggle('down', !up); el.style.opacity = '1';
        el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(up ? y : r.top + 6) + 'px)';
      }
      if (Date.now() > until) return hide();
      raf = requestAnimationFrame(loop);
    }
    function onDoc(e) {
      if (!el || typeof tgt === 'function') return;
      var list = document.querySelectorAll(tgt); for (var i = 0; i < list.length; i++) if (list[i].contains(e.target)) { var f = cb; hide(); if (f) f(); return; }
    }
    function show(target, label, opts) {
      hide(); opts = opts || {}; tgt = target; cb = opts.done || null; until = Date.now() + (opts.ms || 20000);
      el = document.createElement('div'); el.className = 'guide'; el.innerHTML = '<span class="g-hand" aria-hidden="true">👆</span>' + (label ? '<b class="g-label">' + esc(label) + '</b>' : '');
      if (typeof tgt === 'string') { var first = document.querySelector(tgt); if (first && first.scrollIntoView) { var rr = first.getBoundingClientRect(); if (rr.bottom > innerHeight - 70 || rr.top < 60) first.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
      document.body.appendChild(el); document.addEventListener('pointerdown', onDoc, true); loop();
    }
    function hide() { cancelAnimationFrame(raf); if (el) { el.remove(); el = null; } tgt = null; cb = null; document.removeEventListener('pointerdown', onDoc, true); }
    return { show: show, hide: hide, on: function () { return !!el; } };
  })();
  // once per player: a guided first tap on things that matter
  function guideOnce(key, target, label, opts) { S.guided = S.guided || {}; if (S.guided[key]) return false; S.guided[key] = 1; save(); Guide.show(target, label, opts); return true; }
