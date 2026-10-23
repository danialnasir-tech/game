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
    api.pop = function (sq, text, cls) { fx.querySelectorAll('.mb-pop').forEach(function (o) { o.remove(); }); var s = document.createElement('span'); s.className = 'mb-pop ' + (cls || ''); s.innerHTML = '<span>' + esc(text) + '</span>'; place(s, sq); fx.appendChild(s); setTimeout(function () { s.remove(); }, 2400); };
    api.clearFx = function () { fx.innerHTML = ''; svg.innerHTML = ''; };
    api.tap = function (fn) { onTap = fn; host.classList.toggle('live', !!fn); };
    grid.addEventListener('click', function (e) { var d = e.target.closest('.mb-sq'); if (d && onTap) onTap(d.dataset.sq); });
    // dragging a piece works too: press on one square, let go on another = tap both
    function sqAt(e) { var r = grid.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * 8), y = Math.floor((e.clientY - r.top) / r.height * 8); return x >= 0 && x < 8 && y >= 0 && y < 8 ? 'abcdefgh'[x] + (8 - y) : null; }
    var downSq = null;
    host.addEventListener('pointerdown', function (e) { downSq = onTap ? sqAt(e) : null; });
    host.addEventListener('pointerup', function (e) { var up = sqAt(e), d = downSq; downSq = null; if (onTap && d && up && up !== d) { onTap(d); if (onTap) onTap(up); } });
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

  // ---------- the opening stage: a small 3D scene behind the welcome cards. A floating board above a sea of clouds at
  // sunset, Coach Leo beside it, and a famous game played with real pieces. Everything is simple shapes, merged where
  // it can be, so a phone draws it in a few dozen calls. Without WebGL the flat welcome is used instead.
  var Stage = (function () {
    var X = null;
    var OPERA = { fen: '3rkb1r/p2nqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR3R w k - 3 13',
      seq: [['d1', 'd7', 'Rook takes d7! A sacrifice.'], ['d8', 'd7', 'Black takes the rook…'], ['h1', 'd1', 'The other rook joins in.'], ['e7', 'e6', 'Black defends.'], ['b5', 'd7', 'Bishop takes. Check!', 1], ['f6', 'd7', 'The knight takes back…'], ['b3', 'b8', 'Queen sacrifice!!', 1, '!!'], ['d7', 'b8', 'Black has to take the queen…'], ['d1', 'd8', 'Rook d8. Checkmate!', 2, 'Checkmate!']] };
    var LEVEL_PC = { 100: 'p', 400: 'n', 800: 'b', 1200: 'r', 1600: 'q' };
    function can() {
      if (!window.THREE) return false;
      try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
    }
    function now() { return performance.now() / 1000; }
    function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
    function sqPos(sq, y) { return new THREE.Vector3(sq.charCodeAt(0) - 97 - 3.5, y == null ? 0.16 : y, 3.5 - (+sq[1] - 1)); }
    function softDot() { var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); var t = new THREE.CanvasTexture(c); return t; }

    function pieceGeos() {
      var T = THREE, G = {};
      function V(a) { return a.map(function (p) { return new T.Vector2(p[0], p[1]); }); }
      function arc(cx, cy, r, a0, a1, n) { var o = []; for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; }
      function lathe(p) { return new T.LatheGeometry(V(p), 28); }
      var BASE = [[0, 0], [0.36, 0], [0.375, 0.025], [0.365, 0.07], [0.31, 0.1], [0.3, 0.14], [0.26, 0.17]];
      var QB = [[0, 0], [0.4, 0], [0.415, 0.03], [0.4, 0.08], [0.34, 0.12], [0.32, 0.16], [0.28, 0.2], [0.2, 0.32], [0.14, 0.6], [0.13, 0.78], [0.23, 0.82], [0.23, 0.855], [0.14, 0.88]];
      G.p = [lathe(BASE.concat([[0.2, 0.2], [0.14, 0.3], [0.11, 0.42], [0.19, 0.45], [0.19, 0.48], [0.1, 0.5]]).concat(arc(0, 0.62, 0.15, -1.1, Math.PI / 2, 10)))];
      G.r = [lathe(BASE.concat([[0.25, 0.2], [0.2, 0.3], [0.19, 0.55], [0.27, 0.6], [0.28, 0.8], [0.2, 0.8], [0.2, 0.74], [0, 0.74]]))];
      G.b = [lathe(BASE.concat([[0.22, 0.2], [0.15, 0.32], [0.12, 0.55], [0.21, 0.58], [0.21, 0.61], [0.12, 0.64], [0.16, 0.7], [0.175, 0.78], [0.14, 0.88], [0.07, 0.95], [0.035, 0.975]]).concat(arc(0, 1.01, 0.05, -0.8, Math.PI / 2, 6)))];
      G.q = [lathe(QB.concat([[0.17, 0.95], [0.26, 1.08], [0.2, 1.1], [0.08, 1.12]]).concat(arc(0, 1.17, 0.07, -0.9, Math.PI / 2, 6)))];
      var kc1 = new T.BoxGeometry(0.06, 0.24, 0.06); kc1.translate(0, 1.28, 0); var kc2 = new T.BoxGeometry(0.18, 0.06, 0.06); kc2.translate(0, 1.3, 0);
      G.k = [lathe(QB.map(function (p) { return [p[0], p[1] * 1.04]; }).concat([[0.18, 0.98], [0.23, 1.1], [0.2, 1.13], [0.1, 1.15], [0, 1.16]])), kc1, kc2];
      var nh = knightShape(); nh.scale(0.3, 0.3, 0.42); nh.translate(0, 0.3, 0);
      G.n = [lathe(BASE.concat([[0.24, 0.2], [0.2, 0.28], [0.19, 0.36], [0, 0.37]])), nh];
      return G;
    }

    function build(host) {
      var T = THREE, mob = innerWidth < 700 || document.body.classList.contains('mob');
      var r = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mob ? 1.5 : 2)); r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.domElement.className = 'wl-stage'; host.insertBefore(r.domElement, host.firstChild);
      var sc = new T.Scene(); sc.fog = new T.Fog(lin('#f08f8a'), 80, 360);
      var cam = new T.PerspectiveCamera(42, 1, 0.3, 900);
      X = { r: r, sc: sc, cam: cam, mob: mob, host: host, at: {}, tw: [], fx: [], pops: [], timers: [], t0: now(), view: null, cur: null, region: null, shake: 0, alive: true };
      // sunset sky with stars above
      var sun = new T.Vector3(-0.35, 0.06, -1).normalize(); X.sunDir = sun;
      var sky = new T.Mesh(new T.SphereGeometry(600, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false,
        uniforms: { sun: { value: sun } },
        vertexShader: 'varying vec3 vd; void main(){ vd = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform vec3 sun; varying vec3 vd; void main(){ float h = vd.y; vec3 top = vec3(0.07, 0.05, 0.2), mid = vec3(0.36, 0.19, 0.55), hor = vec3(1.0, 0.56, 0.38), low = vec3(0.92, 0.5, 0.55);' +
          ' vec3 c = h > 0.0 ? mix(mix(hor, mid, smoothstep(0.0, 0.22, h)), top, smoothstep(0.22, 0.85, h)) : mix(hor, low, smoothstep(0.0, -0.2, h)); float s = max(dot(vd, sun), 0.0);' +
          ' c += vec3(1.0, 0.78, 0.45) * (pow(s, 1200.0) * 2.5 + pow(s, 60.0) * 0.55 + pow(s, 8.0) * 0.22); gl_FragColor = vec4(c, 1.0); }' }));
      sky.renderOrder = -2; sky.frustumCulled = false; sc.add(sky); X.sky = sky;
      var sp = []; for (var i = 0; i < 420; i++) { var a = Math.random() * Math.PI * 2, e = 0.32 + Math.random() * 1.2, R = 560; sp.push(Math.cos(e) * Math.sin(a) * R, Math.sin(e) * R, Math.cos(e) * Math.cos(a) * R); }
      var sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
      X.stars = new T.Points(sg, new T.PointsMaterial({ color: '#ffffff', size: mob ? 1.6 : 2, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false, depthWrite: false })); sc.add(X.stars);
      // lights: warm low sun behind the board, cool fill from the front
      sc.add(new T.HemisphereLight(lin('#cbb8ff'), lin('#ff9a78'), 0.75));
      var key = new T.DirectionalLight(lin('#ffc58a'), 1.55); key.position.set(-7, 9, -13); key.castShadow = true; key.shadow.mapSize.set(mob ? 1024 : 2048, mob ? 1024 : 2048);
      var kc = key.shadow.camera; kc.left = -8; kc.right = 8; kc.top = 8; kc.bottom = -8; kc.near = 2; kc.far = 40; key.shadow.bias = -0.0008; key.shadow.normalBias = 0.05; sc.add(key);
      var fill = new T.DirectionalLight(lin('#9db8ff'), 0.55); fill.position.set(9, 7, 11); sc.add(fill);
      // the sea of clouds
      var CK = Kit(), rnd = function () { return Math.random(); }, cc = ['#ffd3d8', '#f6b4c6', '#e9a5c8', '#cf9ad8', '#ffe0c9'];
      for (var c = 0; c < (mob ? 60 : 90); c++) { var ca = rnd() * Math.PI * 2, cd = 16 + Math.pow(rnd(), 0.7) * 230, cr = 3 + rnd() * 5 + cd * 0.025, cy = -9 - rnd() * 4 - cd * 0.02, cx = Math.sin(ca) * cd, cz = Math.cos(ca) * cd;
        for (var pf = 0; pf < 4; pf++) { var po = (pf - 1.5) * cr * 0.7, ps = cr * (pf === 1 || pf === 2 ? 1 : 0.7); CK.add(CK.sph(1, 10, 7), cc[(c + pf) % 5], [cx + Math.cos(ca) * po, cy + (pf === 1 || pf === 2 ? cr * 0.18 : 0), cz - Math.sin(ca) * po], null, [ps, ps * 0.6, ps], 'smooth'); } }
      X.clouds = new T.Mesh(mergeParts(CK.parts.smooth), new T.MeshLambertMaterial({ vertexColors: true, emissive: lin('#d98fb0'), emissiveIntensity: 0.62 })); sc.add(X.clouds);
      // the floating island with the board
      var K = Kit(), add = K.add;
      add(K.cone(7.4, 9.5, 9), '#7a5a64', [0, -5.05, 0], [Math.PI, 0.2, 0]);
      add(K.cone(4.2, 6, 7), '#5f4552', [1.2, -9.2, 0.6], [Math.PI, 0.6, 0.1]);
      for (var hr = 0; hr < 7; hr++) { var ha = hr / 7 * Math.PI * 2; add(K.ico(0.9 + (hr % 3) * 0.4, 0), '#6c4f5c', [Math.sin(ha) * 6.2, -1.2 - (hr % 2) * 0.8, Math.cos(ha) * 6.2], [hr, hr * 2, 0]); }
      add(K.cyl(7.5, 7.3, 0.7, 40), '#5fae5a', [0, -0.45, 0], null, null, 'smooth');
      add(K.cyl(6.7, 6.9, 0.3, 48), '#efe2c6', [0, -0.15, 0], null, null, 'smooth');
      add(K.cyl(6.95, 6.95, 0.06, 48), '#e7b54a', [0, -0.02, 0], null, null, 'smooth');
      add(K.box(9.3, 0.3, 9.3), '#4a2f22', [0, -0.03, 0]);
      add(K.box(9.42, 0.06, 9.42), '#e7b54a', [0, -0.12, 0]);
      for (var f = 0; f < 8; f++) for (var g = 0; g < 8; g++) add(K.box(0.995, 0.1, 0.995), (f + g) % 2 ? '#f3e7cc' : '#8b5e3c', [f - 3.5, 0.11, g - 3.5], null, null, 'smooth');
      [[-5.6, -5.6], [5.6, -5.6], [-5.6, 5.6], [5.6, 5.6]].forEach(function (q) { add(K.cyl(0.09, 0.13, 2.4, 8), '#3a2c3f', [q[0], 1.2, q[1]]); add(K.cone(0.3, 0.22, 8), '#3a2c3f', [q[0], 2.62, q[1]]); add(K.sph(0.22, 10), '#ffd98a', [q[0], 2.42, q[1]], null, null, 'glow'); });
      for (var b2 = 0; b2 < 10; b2++) { var ba = b2 / 10 * Math.PI * 2 + 0.3; if (Math.abs(Math.sin(ba)) > 0.75 && Math.cos(ba) > 0) continue; var bx = Math.sin(ba) * 7.05, bz = Math.cos(ba) * 7.05;
        if (bz > 3) continue; add(K.ico(0.55, 0), b2 % 2 ? '#4f9d4c' : '#63b25a', [bx, 0.15, bz], [b2, b2, 0], [1.2, 0.8, 1]); add(K.sph(0.09, 6), ['#ff7eb6', '#ffd23f', '#ffffff'][b2 % 3], [bx + 0.2, 0.55, bz + 0.1]); }
      [[-5.8, -3.6], [6.2, -2.8], [-6.3, 1.4]].forEach(function (q, i) { add(K.cyl(0.14, 0.2, 1.2, 7), '#6b4426', [q[0], 0.6, q[1]]); add(K.cone(0.95, 1.7, 7), i % 2 ? '#2e8a55' : '#36a05f', [q[0], 1.9, q[1]]); add(K.cone(0.7, 1.4, 7), '#3fae68', [q[0], 2.7, q[1]]); });
      // distant floating islands, and Ascent Town far away
      function island(x, y, z, s, town) {
        K.at(x, z, 0, y);
        add(K.cone(3 * s, 4.5 * s, 8), '#7a5a64', [0, -2.4 * s, 0], [Math.PI, 0, 0]); add(K.cyl(3.1 * s, 3 * s, 0.5 * s, 16), '#5fae5a', [0, 0, 0]);
        if (!town) { add(K.cone(0.9 * s, 2 * s, 7), '#2e8a55', [0.8 * s, 1.1 * s, 0]); add(K.cone(0.7 * s, 1.6 * s, 7), '#36a05f', [-0.9 * s, 0.9 * s, 0.6 * s]); }
        else {
          add(K.box(3.4 * s, 0.25 * s, 2.2 * s), '#e9dcc0', [-0.4 * s, 0.35 * s, -0.8 * s]); add(K.box(3 * s, 1.3 * s, 1.8 * s), '#f4ecdc', [-0.4 * s, 1.1 * s, -0.8 * s]);
          for (var ci = 0; ci < 5; ci++) add(K.cyl(0.11 * s, 0.11 * s, 1.3 * s, 8), '#ffffff', [(-1.6 + ci * 0.6) * s, 1.1 * s, 0.18 * s]);
          add(K.cone(2.2 * s, 0.9 * s, 4), '#3f6fd8', [-0.4 * s, 2.2 * s, -0.8 * s], [0, Math.PI / 4, 0], [1.05, 1, 0.62]);
          add(K.cyl(0.55 * s, 0.65 * s, 3.6 * s, 10), '#8e6cf0', [2.1 * s, 2 * s, -1.2 * s]); add(K.cone(0.8 * s, 1.3 * s, 10), '#ff4f8b', [2.1 * s, 4.45 * s, -1.2 * s]); add(K.sph(0.3 * s, 10), '#ffd23f', [2.1 * s, 5.3 * s, -1.2 * s], null, null, 'glow');
          add(K.cyl(1.1 * s, 1.1 * s, 0.7 * s, 16), '#c0392b', [1.6 * s, 0.55 * s, 1.4 * s]); add(K.cyl(0.85 * s, 0.85 * s, 0.72 * s, 16), '#e8d9b5', [1.6 * s, 0.56 * s, 1.4 * s]);
          for (var ti = 0; ti < 5; ti++) { var ta = ti * 1.3 + 2.4; add(K.cone(0.42 * s, 1 * s, 7), ti % 2 ? '#2e8a55' : '#3fae68', [Math.sin(ta) * 2.4 * s, 0.8 * s, Math.cos(ta) * 2.3 * s]); }
          add(K.box(1.4 * s, 0.06, 1.4 * s), '#f3e7cc', [-1.4 * s, 0.28 * s, 1.3 * s]);
          for (var wi = 0; wi < 3; wi++) add(K.box(0.4 * s, 0.5 * s, 0.05), '#ffd98a', [(wi - 1) * 0.9 * s - 0.4 * s, 1.15 * s, 0.11 * s], null, null, 'glow');
        }
        K.reset();
      }
      island(-48, 2, -60, 1.3); island(56, -3, -36, 1.1); island(-70, -6, 18, 1.5); island(42, 6, -110, 1.4); island(-20, 10, -150, 1.6);
      X.townPos = new T.Vector3(10, 7, -95); island(X.townPos.x, X.townPos.y, X.townPos.z, 2.2, true);
      var mats = { flat: new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }), smooth: new T.MeshLambertMaterial({ vertexColors: true }), glow: new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }) };
      Object.keys(K.parts).forEach(function (k) { if (!K.parts[k].length) return; var m = new T.Mesh(mergeParts(K.parts[k]), mats[k]); m.receiveShadow = k !== 'glow'; m.castShadow = k === 'flat'; sc.add(m); });
      // magic ring around the platform and drifting light motes
      var dot = softDot();
      X.ring = new T.Mesh(new T.RingGeometry(7.0, 7.35, 72), new T.MeshBasicMaterial({ color: '#7af0ff', transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide })); X.ring.rotation.x = -Math.PI / 2; X.ring.position.y = -0.06; sc.add(X.ring);
      var mp = [], mn = mob ? 90 : 150; for (var m2 = 0; m2 < mn; m2++) mp.push((Math.random() - 0.5) * 22, Math.random() * 9 - 1, (Math.random() - 0.5) * 22);
      var mg = new T.BufferGeometry(); mg.setAttribute('position', new T.Float32BufferAttribute(mp, 3));
      X.motes = new T.Points(mg, new T.PointsMaterial({ color: '#ffe0a0', size: 0.16, map: dot, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); sc.add(X.motes);
      X.dot = dot;
      // pieces
      X.geo = pieceGeos();
      X.mat = { w: new T.MeshPhongMaterial({ color: lin('#f6eddb'), specular: 0x3a3a3a, shininess: 55 }), b: new T.MeshPhongMaterial({ color: lin('#2c2536'), specular: 0x6a6a7a, shininess: 80 }) };
      X.glowM = new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
      // Coach Leo, beside the board
      X.leo = rigPerson(LEO_LOOK); X.leo.g.position.set(5.75, 0, 1.6); X.leo.g.rotation.y = -0.9; sc.add(X.leo.g);
      X.leo.g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      // a bridge of light to the town, built when the plan is shown
      var bc = new T.QuadraticBezierCurve3(new T.Vector3(0, 0.1, -6.5), new T.Vector3(4, 12, -50), X.townPos.clone().add(new T.Vector3(0, 0.6, 6)));
      X.bridgeCurve = bc; X.bridge = new T.InstancedMesh(new T.BoxGeometry(1.3, 0.05, 0.55), new T.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), 60); X.bridge.count = 0; X.bridge.frustumCulled = false; sc.add(X.bridge);
      // pools for effects
      X.dust = []; for (var d = 0; d < 6; d++) { var dm = new T.Mesh(new T.RingGeometry(0.22, 0.38, 28), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); dm.rotation.x = -Math.PI / 2; sc.add(dm); X.dust.push(dm); }
      X.wave = new T.Mesh(new T.RingGeometry(0.8, 1.0, 48), new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide })); X.wave.rotation.x = -Math.PI / 2; sc.add(X.wave);
      X.beam = new T.Mesh(new T.CylinderGeometry(0.42, 0.55, 14, 20, 1, true), new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide })); sc.add(X.beam);
      X.v3 = new T.Vector3();
      window.addEventListener('resize', resize); resize();
      return true;
    }
    function resize() { if (!X) return; var w = innerWidth, h = innerHeight; X.r.setSize(w, h); X.cam.aspect = w / h; X.cam.updateProjectionMatrix(); }

    // ---------- pieces on the board
    function makePiece(ch) {
      var T = THREE, col = ch === ch.toUpperCase() ? 'w' : 'b', t = ch.toLowerCase(), g = new T.Group();
      X.geo[t].forEach(function (geo) { var m = new T.Mesh(geo, X.mat[col]); m.castShadow = true; m.receiveShadow = true; g.add(m); });
      if (t === 'n') g.rotation.y = col === 'w' ? -Math.PI / 2 : Math.PI / 2;
      g.userData = { t: t, c: col }; X.sc.add(g); return g;
    }
    function clear() { Object.keys(X.at).forEach(function (k) { X.sc.remove(X.at[k]); }); X.at = {}; X.extra && X.extra.forEach(function (g) { X.sc.remove(g); }); X.extra = []; }
    function setFen(fen, drop) {
      clear(); var t = now();
      fen.split(' ')[0].split('/').forEach(function (row, i) { var f = 0; row.split('').forEach(function (ch) {
        if (/\d/.test(ch)) { f += +ch; return; }
        var sq = 'abcdefgh'[f] + (8 - i), g = makePiece(ch); g.position.copy(sqPos(sq)); X.at[sq] = g; f++;
        if (drop) { var d = (f + i) * 0.03; g.position.y = 6; tween(0.55, function (k) { g.position.y = 0.16 + (1 - k) * (1 - k) * 6; }, d, function () { dust(sq, 0.6); }); }
      }); });
    }
    function tween(dur, fn, delay, done) { X.tw.push({ t0: now() + (delay || 0), dur: dur, fn: fn, done: done }); }
    function dust(sq, s) { var d = X.dust.shift(); X.dust.push(d); var p = typeof sq === 'string' ? sqPos(sq, 0.18) : sq.clone().setY(0.18); d.position.copy(p); var t0 = now(); d.userData = { t0: t0, s: s || 1 }; X.fx.push(d); }
    function move(from, to, o) {
      o = o || {}; var p = X.at[from]; if (!p) return; var cap = X.at[to]; delete X.at[from]; X.at[to] = p;
      var A = sqPos(from), B = sqPos(to), h = p.userData.t === 'n' ? 1.3 : 0.55 + A.distanceTo(B) * 0.06;
      tween(0.55, function (k) { var e = ease(k); p.position.lerpVectors(A, B, e); p.position.y = 0.16 + Math.sin(Math.PI * k) * h; p.rotation.x = Math.sin(Math.PI * k) * 0.15 * (B.z - A.z > 0 ? 1 : -1); }, 0, function () {
        p.rotation.x = 0; dust(to, cap ? 1.5 : 1);
        try { Sound.play(cap ? 'capture' : o.check ? 'check' : 'move'); } catch (e) { }
        if (cap) { // the taken piece is knocked off the board
          var dx = B.x - A.x, dz = B.z - A.z, l = Math.hypot(dx, dz) || 1, vx = dx / l * 3.2, vz = dz / l * 3.2, vy = 5.5, P0 = cap.position.clone(), sx = (Math.random() - 0.5) * 9;
          X.extra.push(cap); tween(1.4, function (k) { var t = k * 1.4; cap.position.set(P0.x + vx * t, P0.y + vy * t - 4.9 * t * t, P0.z + vz * t); cap.rotation.z = sx * t; cap.rotation.x = 3 * t; }, 0, function () { X.sc.remove(cap); });
          spark(B, '#ffd9a0', 22);
        }
        if (o.check) { var kq = Object.keys(X.at).filter(function (s) { var u = X.at[s].userData; return u.t === 'k' && u.c !== p.userData.c; })[0]; if (kq) pulse(kq, '#ff4f6d'); }
        if (o.pop) pop(to, o.pop, o.mate ? 'mate' : 'big');
        if (o.mate) mate();
      });
    }
    function pulse(sq, color) { var w = X.wave; w.material.color.set(color); w.position.copy(sqPos(sq, 0.2)); w.userData = { t0: now(), dur: 0.7, s: 1.4 }; if (X.fx.indexOf(w) < 0) X.fx.push(w); }
    function spark(at, color, n) {
      var T = THREE, pos = [], vel = []; for (var i = 0; i < n; i++) { pos.push(at.x, at.y + 0.4, at.z); var a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3; vel.push(Math.cos(a) * s, 2 + Math.random() * 4, Math.sin(a) * s); }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      var pts = new T.Points(g, new T.PointsMaterial({ color: color, size: 0.35, map: X.dot, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      pts.userData = { t0: now(), vel: vel, burst: true }; X.sc.add(pts); X.fx.push(pts);
    }
    function mate() {
      var kq = Object.keys(X.at).filter(function (s) { var u = X.at[s].userData; return u.t === 'k' && u.c === 'b'; })[0]; if (!kq) return; var K = X.at[kq], P = K.position.clone();
      setTimeout(function () { if (!X) return;
        tween(0.9, function (k) { var e = k < 0.7 ? Math.pow(k / 0.7, 2) : 1 - Math.sin((k - 0.7) / 0.3 * Math.PI) * 0.06; K.rotation.z = e * 1.5; K.position.x = P.x + Math.sin(e * 1.5) * 0.36; K.position.y = P.y + (1 - Math.cos(e * 1.5)) * 0.12; });
        X.shake = 0.5; pulse(kq, '#ffd23f'); X.wave.userData.s = 6; X.wave.userData.dur = 1.1; spark(P, '#ffd23f', 40); spark(P, '#ff7eb6', 24);
        X.beam.position.set(P.x, 7, P.z); X.beam.userData = { t0: now(), dur: 2.4 }; if (X.fx.indexOf(X.beam) < 0) X.fx.push(X.beam);
        try { Sound.play('mate'); if (navigator.vibrate) navigator.vibrate([30, 40, 60]); } catch (e) { }
      }, 260);
    }
    // labels that float over a square
    function pop(sq, text, cls) { var e = document.createElement('div'); e.className = 'st-pop ' + (cls || ''); e.innerHTML = '<span>' + esc(text) + '</span>'; X.host.appendChild(e); X.pops.push({ el: e, p: sqPos(sq, 1.6), t0: now(), life: cls === 'mate' ? 3.2 : 2 }); }

    // ---------- the camera: named views, fitted into the part of the screen the card leaves free
    var VIEWS = {
      board: { t: [0.3, 0.2, 0.6], d: [0.18, 0.72, 0.67], R: 6.2 },
      leo: { t: [5.4, 1.75, 1.6], d: [0.35, 0.18, 0.92], R: 1.7 },
      lineup: { t: [0, 1.1, 1.2], d: [0, 0.3, 0.95], R: 4.2 },
      try: { t: [4.2, 1.4, 1.4], d: [0.55, 0.3, 0.78], R: 2.9 },
      plan: { t: [7, 5, -62], d: [-0.12, 0.2, 0.97], R: 24 }
    };
    function viewOf(n) { var v = VIEWS[n], T = THREE; return { t: new T.Vector3().fromArray(v.t), d: new T.Vector3().fromArray(v.d).normalize(), R: v.R }; }
    function setView(n) { X.view = n; X.want = viewOf(n); if (!X.cur) X.cur = viewOf(n); }
    function region() { // the screen area not covered by the welcome card
      var W = innerWidth, H = innerHeight, c = X.host.querySelector('.wl-card'), r = { x: 0, y: 0, w: W, h: H };
      if (c && !X.host.classList.contains('intro')) { var b = c.getBoundingClientRect(); if (b.left > W * 0.4) r.w = Math.max(200, b.left); else r.h = Math.max(160, b.top); }
      return r;
    }
    function camera(dt) {
      var cam = X.cam, W = innerWidth, H = innerHeight, rg = region(), R0 = X.rg || (X.rg = rg), k = Math.min(1, dt * 3);
      ['x', 'y', 'w', 'h'].forEach(function (q) { R0[q] += (rg[q] - R0[q]) * k; });
      cam.setViewOffset(W, H, W / 2 - (R0.x + R0.w / 2), H / 2 - (R0.y + R0.h / 2), W, H);
      var t = now() - X.t0;
      if (X.path) { // a scripted flight
        var pk = Math.min(1, (now() - X.path.t0) / X.path.dur), e = X.path.ease ? X.path.ease(pk) : ease(pk);
        cam.position.copy(X.path.pos.getPoint(e)); var lk = X.path.look(e); cam.lookAt(lk);
        if (pk >= 1) { var cb = X.path.done; X.path = null; if (cb) cb(); }
      } else if (X.want) {
        var C = X.cur, Wv = X.want, kk = Math.min(1, dt * 1.6);
        C.t.lerp(Wv.t, kk); C.d.lerp(Wv.d, kk).normalize(); C.R += (Wv.R - C.R) * kk;
        var tv = Math.tan(cam.fov * Math.PI / 360), half = Math.atan(tv * Math.min(R0.h, R0.w * 1) / H), dist = C.R / Math.sin(half);
        var sway = Math.sin(t * 0.13) * 0.07, cs = Math.cos(sway), sn = Math.sin(sway), dx = C.d.x * cs + C.d.z * sn, dz = -C.d.x * sn + C.d.z * cs;
        cam.position.set(C.t.x + dx * dist, C.t.y + C.d.y * dist + Math.sin(t * 0.21) * 0.08 * C.R, C.t.z + dz * dist); cam.lookAt(C.t);
      }
      if (X.shake > 0) { X.shake -= dt; var s = X.shake * 0.25; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; }
    }
    function fly(posPts, lookFn, dur, done, ez) { var T = THREE; X.path = { pos: new T.CatmullRomCurve3(posPts.map(function (p) { return new T.Vector3().fromArray(p); })), look: lookFn, dur: dur, t0: now(), done: done, ease: ez }; }
    function fitPos(n) { // where the camera ends up for a view, so a flight can land exactly there
      var v = viewOf(n), H = innerHeight, rg = region(), tv = Math.tan(X.cam.fov * Math.PI / 360), half = Math.atan(tv * Math.min(rg.h, rg.w) / H), d = v.R / Math.sin(half);
      return v.t.clone().add(v.d.clone().multiplyScalar(d));
    }

    // ---------- the frame loop
    function loop() {
      if (!X || !X.alive) return; X.raf = requestAnimationFrame(loop);
      var t = now(), rdt = Math.min(0.5, t - (X.last || t)), dt = Math.min(0.1, rdt); X.last = t;
      var tw = X.tw; X.tw = []; // a tween's done() may start a new tween (a captured piece flying off): keep those
      tw = tw.filter(function (w) { if (t < w.t0) return true; var k = Math.min(1, (t - w.t0) / w.dur); w.fn(k); if (k >= 1) { if (w.done) w.done(); return false; } return true; });
      X.tw = tw.concat(X.tw);
      X.fx = X.fx.filter(function (o) {
        var u = o.userData, a = t - u.t0;
        if (u.burst) { var p = o.geometry.attributes.position.array; for (var i = 0; i < p.length; i += 3) { p[i] += u.vel[i] * dt; p[i + 1] += u.vel[i + 1] * dt; p[i + 2] += u.vel[i + 2] * dt; u.vel[i + 1] -= 9 * dt; } o.geometry.attributes.position.needsUpdate = true; o.material.opacity = Math.max(0, 1 - a / 1.2); if (a > 1.2) { X.sc.remove(o); o.geometry.dispose(); o.material.dispose(); return false; } return true; }
        if (o === X.beam) { var bk = a / u.dur; o.material.opacity = bk < 0.15 ? bk / 0.15 * 0.5 : Math.max(0, 0.5 * (1 - (bk - 0.15) / 0.85)); o.scale.set(1 + bk * 0.6, 1, 1 + bk * 0.6); return bk < 1; }
        var dur = u.dur || 0.55, k = a / dur, sc = (u.s || 1) * (0.6 + k * 1.6); o.scale.set(sc, sc, sc); o.material.opacity = Math.max(0, 0.75 * (1 - k)); return k < 1;
      });
      // motes drift up and around
      var mp = X.motes.geometry.attributes.position.array; for (var m = 0; m < mp.length; m += 3) { mp[m + 1] += dt * (0.25 + (m % 7) * 0.04); mp[m] += Math.sin(t * 0.5 + m) * dt * 0.1; if (mp[m + 1] > 9) mp[m + 1] = -1; } X.motes.geometry.attributes.position.needsUpdate = true;
      X.clouds.rotation.y = t * 0.004; X.ring.rotation.z = t * 0.1; X.ring.material.opacity = 0.4 + Math.sin(t * 1.6) * 0.15;
      if (X.glowPc) { X.glowPc.forEach(function (g, i) { var on = g.userData.on, y0 = g.userData.y0; g.position.y += ((on ? y0 + 0.45 + Math.sin(t * 3) * 0.06 : y0) - g.position.y) * Math.min(1, dt * 8); g.rotation.y += dt * (on ? 1.6 : 0); }); }
      if (X.bridgeN != null && X.bridge.count < 60 && t > X.bridgeT) { X.bridgeT = t + 0.035; var i2 = X.bridge.count, u0 = i2 / 59, P = X.bridgeCurve.getPoint(u0), P2 = X.bridgeCurve.getPoint(Math.min(1, u0 + 0.01)), D = new THREE.Object3D(); D.position.copy(P); D.lookAt(P2); D.updateMatrix(); X.bridge.setMatrixAt(i2, D.matrix); X.bridge.count = i2 + 1; X.bridge.instanceMatrix.needsUpdate = true; if (i2 % 6 === 0) try { Sound.play('tick', i2 / 6); } catch (e) { } }
      animPerson(X.leo, dt, t - X.t0);
      camera(rdt);
      // floating labels follow their square
      var W = innerWidth, H = innerHeight; X.pops = X.pops.filter(function (p) { var a = t - p.t0; if (a > p.life) { p.el.remove(); return false; } X.v3.copy(p.p).project(X.cam); p.el.style.transform = 'translate(' + Math.round((X.v3.x + 1) / 2 * W) + 'px,' + Math.round((1 - X.v3.y) / 2 * H - a * 14) + 'px) translate(-50%,-100%)'; p.el.style.opacity = a > p.life - 0.4 ? (p.life - a) / 0.4 : 1; return true; });
      X.r.render(X.sc, X.cam);
    }
    function later(fn, ms) { var id = setTimeout(function () { if (X) fn(); }, ms); X.timers.push(id); return id; }
    function stopTimers() { if (X) { X.timers.forEach(clearTimeout); X.timers = []; } }

    // ---------- what the welcome flow asks for
    var api = {
      can: can,
      on: function () { return !!X; },
      start: function (host, onIntroEnd) {
        if (!can()) return false;
        try { build(host); } catch (e) { X = null; return false; }
        setFen(OPERA.fen); setView('board');
        host.classList.add('intro');
        var ov = document.createElement('div'); ov.className = 'wl-intro'; ov.innerHTML = '<i class="wi-bar t"></i><i class="wi-bar b"></i><div class="wi-title"><small>Welcome to</small>Chess <em>Ascent</em><span>A coach that reacts to every move you make</span></div><button class="wi-skip" data-wl="skipintro">Skip ▸▸</button>'; host.appendChild(ov); X.ov = ov;
        var end = function () { if (!X || !X.ov) return; X.path = null; var o = X.ov; X.ov = null; o.classList.add('out'); setTimeout(function () { o.remove(); }, 700); host.classList.remove('intro'); if (onIntroEnd) onIntroEnd(); };
        X.endIntro = end;
        if (REDUCED) { later(end, 600); }
        else {
          var bp = fitPos('board'), lt = new THREE.Vector3(0.3, 0.2, 0.6);
          var far = new THREE.Vector3(-30, 22, -120);
          fly([[-60, 46, 150], [-26, 22, 64], [22, 10, 26], bp.toArray()], function (e) { return far.clone().lerp(lt, Math.min(1, e * 1.25)); }, 5.2, end);
          try { Sound.play('whoosh', 2.4); Sound.play('sting'); } catch (e) { }
          later(function () { setFen(OPERA.fen, true); }, 3200);
        }
        X.raf = requestAnimationFrame(loop);
        return true;
      },
      skipIntro: function () { if (X && X.endIntro) X.endIntro(); },
      _pieces: function () { if (!X) return null; var on = 0; X.sc.traverse(function (o) { if (o.userData && o.userData.t && o.userData.c && o.parent === X.sc) on++; }); return { board: Object.keys(X.at).length, inScene: on, extra: X.extra.length }; }, // for tests
      view: function (n) { if (X) setView(n); },
      // the famous finish, with captions; loops while the first screen is up
      demo: function (cap) {
        if (!X) return; stopTimers();
        var run = function () {
          setFen(OPERA.fen); X.leo.act = null; var t = 900;
          OPERA.seq.forEach(function (s, i) { later(function () { move(s[0], s[1], { check: s[3] === 1, mate: s[3] === 2, pop: s[4] }); if (cap) cap(s[2], i); if (i === 6) { X.leo.act = 'point'; later(function () { X.leo.act = null; }, 1600); } if (s[3] === 2) later(function () { X.leo.act = 'cheer'; later(function () { X.leo.act = null; }, 2200); }, 600); }, t); t += i === 5 ? 1600 : 1150; });
          later(function () { if (cap) cap(null, 99); }, t + 1200);
          later(run, t + 6200);
        };
        run();
      },
      stopDemo: function () { stopTimers(); },
      leo: function (act, ms) { if (!X) return; X.leo.act = act; if (ms) later(function () { X.leo.act = null; }, ms); },
      // five pieces stand for the five starting levels
      levels: function () {
        if (!X) return; stopTimers(); clear(); var T = THREE; X.glowPc = [];
        [100, 400, 800, 1200, 1600].forEach(function (v, i) { var g = makePiece(LEVEL_PC[v].toUpperCase()); g.scale.setScalar(1.35); g.rotation.y = 0; g.position.set((i - 2) * 1.5, 0.16, 1.2); g.userData.y0 = 0.16; g.userData.v = v; X.glowPc.push(g); X.extra.push(g);
          var dl = i * 0.12; g.position.y = 5; tween(0.5, function (k) { g.position.y = 0.16 + (1 - k) * (1 - k) * 5; }, dl, function () { dust(g.position, 1.1); try { Sound.play('move'); } catch (e) { } }); });
        setView('lineup');
      },
      hover: function (v) { if (X && X.glowPc) X.glowPc.forEach(function (g) { g.userData.on = g.userData.v === v; }); },
      pick: function (v) { if (!X || !X.glowPc) return; var g = X.glowPc.filter(function (x) { return x.userData.v === v; })[0]; if (!g) return; api.hover(v); spark(g.position, '#c4ff3d', 30); try { Sound.play('star'); } catch (e) { } },
      cheer: function () { if (!X) return; api.leo('cheer', 2600); var p = X.leo.g.position; spark(new THREE.Vector3(p.x, 1.6, p.z), '#ffd23f', 34); spark(new THREE.Vector3(p.x, 1.6, p.z), '#c4ff3d', 20); },
      plan: function () { if (!X) return; stopTimers(); setView('plan'); X.bridgeN = 0; X.bridge.count = 0; X.bridgeT = now() + 1.2; api.leo('point', 3000); },
      // fly along the bridge to the town, then hand over
      launch: function (done) {
        if (!X || REDUCED) { if (done) done(); return; }
        stopTimers(); X.bridge.count = 60; var c = X.bridgeCurve, pts = [X.cam.position.toArray()]; [0.1, 0.35, 0.6, 0.78].forEach(function (u) { pts.push(c.getPoint(u).add(new THREE.Vector3(0, 3.6, 0)).toArray()); });
        X.want = null; var tp = X.townPos.clone();
        fly(pts, function (e) { return c.getPoint(Math.min(1, e * 0.8 + 0.15)).lerp(tp, e); }, 2.6, null, function (k) { return k * k * (3 - 2 * k); });
        try { Sound.play('whoosh', 2.6); } catch (e) { }
        var fl = document.createElement('div'); fl.className = 'wl-flash'; X.host.appendChild(fl);
        later(function () { fl.classList.add('on'); }, 1700);
        later(function () { if (done) done(); }, 2500);
      },
      stop: function () {
        if (!X) return; stopTimers(); X.alive = false; cancelAnimationFrame(X.raf); window.removeEventListener('resize', resize);
        X.pops.forEach(function (p) { p.el.remove(); });
        try { X.sc.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); }); X.r.dispose(); if (X.r.forceContextLoss) X.r.forceContextLoss(); } catch (e) { }
        X.r.domElement.remove(); X = null;
      },
      dbg: function () { return X; }
    };
    return api;
  })();

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
    function coach(msg) { return '<div class="wl-coach"><span class="wl-ava" aria-hidden="true">' + coachAvatar() + '</span><p class="wl-say">' + msg + '</p></div>'; }
    function screen(n, html) {
      if (demo) { demo.stop(); demo = null; }
      st.step = n; if (st.stage && n) { Stage.skipIntro(); Stage.stopDemo(); }
      var prev = el.querySelector('.wl-card'); if (prev) prev.remove(); // keep the 3D stage, swap only the card
      el.insertAdjacentHTML('beforeend', '<div class="wl-card" data-step="' + n + '">' + dots(n) + html + '</div>'); el.scrollTop = 0;
      var c = el.querySelector('.wl-card'); c.classList.remove('in'); void c.offsetWidth; c.classList.add('in');
    }
    function step0() {
      screen(0, '<h1 class="wl-title">Hi, I\'m <em>Coach Leo</em></h1>' + coach('I teach you chess one move at a time, and I react to <b>every move you make</b>. Watch:') +
        (st.stage ? '<p class="wl-cap" id="wl-cap">Paris, 1858. Paul Morphy has White. Watch…</p>' : '<div class="wl-board" id="wl-board"></div><p class="wl-cap" id="wl-cap">The fastest checkmate in chess…</p>') +
        '<div class="wl-acts"><button class="btn primary big" data-wl="next">Let\'s start</button>' + (Cloud.enabled() ? Cloud.gButton('I have an account') : '') + '</div>');
      if (st.stage) { // the 3D stage plays a famous finish instead of the flat board
        var go0 = function () { if (st.step !== 0) return; Voice.say([WT('wl_hi')]); Stage.leo('wave', 2200); Stage.view('board');
          Stage.demo(function (text, i) { var c = $('#wl-cap'); if (!c) return; c.textContent = text || 'Two sacrifices, then mate. Moves like this are what I will teach you to see.'; c.classList.toggle('hot', i === 6 || i === 8); }); };
        if (st.introDone) go0(); else st.afterIntro = go0;
        return;
      }
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
      if (st.stage) { Stage.view('leo'); Stage.leo('talk', 2400); }
      Voice.say([WT('wl_name')]);
    }
    function step2() {
      var ICON = { 100: '🌱', 400: '♟️', 800: '⚔️', 1200: '🎯', 1600: '🏆' };
      screen(2, '<h1 class="wl-title">' + (st.name ? 'Nice to meet you, ' + esc(st.name) + '! ' : '') + 'Where are you starting?</h1>' + coach('Pick the closest match. I\'ll set your lessons, puzzles and opponents to fit. You can change it any time.') +
        '<div class="wl-bands">' + BANDS.map(function (b) { return '<button class="wl-band" data-band="' + b.v + '"><span class="wb-ico">' + ICON[b.v] + '</span><span class="wb-t"><b>' + b.t + '</b><span>' + b.s + '</span></span><span class="wb-v">' + b.v + '</span></button>'; }).join('') + '</div>');
      if (st.stage) { Stage.levels(); el.querySelectorAll('.wl-band').forEach(function (b) { var v = +b.dataset.band, on = function () { Stage.hover(v); }; b.addEventListener('pointerenter', on); b.addEventListener('focus', on); }); }
      Voice.say([WT('wl_level')]);
    }
    function step3() {
      var T = TRY[st.band >= 1200 ? 1200 : st.band] || TRY[100];
      screen(3, '<h1 class="wl-title">Try it: ' + esc(T.q) + '</h1>' + coach('<span id="wl-msg">' + esc(T.how) + '</span>') +
        '<div class="wl-board" id="wl-board"></div><div class="wl-acts"><button class="btn primary big" data-wl="next" id="wl-next" hidden>See my plan ▶</button><button class="btn ghost" data-wl="skiptry" id="wl-skip">Skip</button></div>');
      var mb = MiniBoard($('#wl-board')), msg = $('#wl-msg'), sel = null, done = false, miss = 0;
      if (st.stage) { Stage.view('try'); Stage.leo('talk', 2000); }
      mb.set(T.fen); if (T.star) mb.star(T.star); if (T.dots) mb.mark(T.dots, 'dot'); if (T.from) mb.mark([T.from], 'sel');
      mb.tap(function (sq) {
        if (done) return;
        if (!T.tapOnly && sq === T.from) { sel = sq; mb.mark([sq], 'sel'); return; }
        if (sq === T.to) {
          done = true; mb.tap(null); mb.mark([], 'all'); var stE = $('#wl-board .mb-star'); if (stE) stE.remove();
          if (!T.tapOnly) mb.move(T.from, T.to); else mb.mark([T.to], 'good');
          setTimeout(function () { T.after(mb); mb.pop(T.to, T.pop, 'big'); }, 380);
          msg.innerHTML = '<b>' + esc(CAREER_TEXT[T.good]) + '</b>'; el.querySelector('.wl-coach').classList.add('good');
          $('#wl-next').hidden = false; $('#wl-skip').hidden = true; Sound.play('good'); confettiSafe(); Voice.say([WT(T.good)]); if (st.stage) Stage.cheer();
          st.tried = 1; return;
        }
        miss++; mb.mark([sq], 'bad'); setTimeout(function () { mb.mark([], 'bad'); }, 500); Sound.play('bad'); if (st.stage) Stage.leo('sad', 900);
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
      S.prog = { start: S.startDate, mins: 20, days: {}, base: null, baseTrain: v }; // day 1 of the 30-day plan starts now
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
      if (st.stage) Stage.plan();
      Voice.say([WT('wl_plan')]);
    }
    function close() { if (demo) { demo.stop(); demo = null; } Stage.stop(); if (el) { el.classList.add('out'); var e = el; setTimeout(function () { e.remove(); }, 380); el = null; } }
    function start() {
      if (el) el.remove(); st = { name: S.name || '' };
      el = document.createElement('div'); el.id = 'welcome'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-wl],[data-band],[data-ob]'); Sound.unlock();
        if (!b) { if (el.classList.contains('intro')) Stage.skipIntro(); return; }
        if (b.dataset.ob === 'gsign') { Cloud.signIn(); return; }
        var a = b.dataset.wl;
        if (b.dataset.band) { st.band = +b.dataset.band; if (st.stage) { Stage.pick(st.band); b.classList.add('picked'); return setTimeout(step3, 420); } return step3(); }
        if (a === 'skipintro') return Stage.skipIntro();
        if (a === 'next') return el.querySelector('[data-step="0"]') ? step1() : step4();
        if (a === 'name') { st.name = ($('#wl-name').value || '').trim().slice(0, 20); return step2(); }
        if (a === 'noname') return step2();
        if (a === 'skiptry') return step4();
        if (a === 'go') { if (st.stage) { b.disabled = true; el.classList.add('launch'); Stage.launch(function () { close(); go('career'); }); return; } close(); if (window.THREE) go('career'); else ACT.startNext(); return; }
        if (a === 'list') { close(); S.career = false; save(); go('path'); setTimeout(function () { Guide.show('[data-act="startNext"]', 'Start your first lesson here'); }, 900); }
      });
      st.stage = !S.settings.board2d && Stage.start(el, function () { st.introDone = true; if (st.afterIntro) { var f = st.afterIntro; st.afterIntro = null; f(); } });
      if (st.stage) el.classList.add('has-stage');
      step0();
    }
    return { start: start };
  })();

  // ---------- feature previews: the first time an area opens, show it working, then let the player try it
  var FEATURES = {
    puzzles: { icon: '🧩', title: 'Puzzles: find the winning move', line: 'fi_puzzles', fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', seq: [function (m) { m.mark(['a1'], 'sel'); }, ['a1', 'a8', 'g'], function (m) { m.pop('a8', 'Checkmate · +12 rating', 'big'); m.mark(['g8'], 'bad'); }], guide: ['.b2-board', '#three canvas'], label: 'Your turn: tap a piece, then its square' },
    openings: { icon: '📖', title: 'Openings: start every game well', line: 'fi_openings', fen: Game.START, seq: [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], function (m) { m.pop('c4', 'Italian Game', 'big'); m.arrow([['c4', 'f7', 'r']]); }], guide: ['.rec-card', '.op-card'], label: 'Pick an opening to learn' },
    play: { icon: '🤝', title: 'Play me: feedback on every move', line: 'fi_play', fen: Game.START, seq: [['e2', 'e4'], function (m) { m.pop('e4', '✓ Good: takes the centre', 'good'); }, ['e7', 'e5'], ['d1', 'h5'], function (m) { m.pop('h5', '⚠ Early queen: she can be chased', 'warn'); }, ['b8', 'c6'], function (m) { m.pop('c6', '✓ Black develops and guards e5', 'good'); }], guide: ['[data-act="startGame"]'], label: 'Choose a level, then start' },
    arena: { icon: '⚔️', title: 'The Arena: quick wins', line: 'fi_arena', fen: 'r3k3/8/8/8/8/8/8/3QK3 w - - 0 1', seq: [['d1', 'a4'], function (m) { m.arrow([['a4', 'e8', 'r'], ['a4', 'a8', 'r']]); m.pop('a4', 'Queen fork! ⭐⭐⭐', 'big'); }], guide: ['.boss-row:not([disabled])', '.ar-tile', '.ex-tile'], label: 'Pick a challenge' },
    progress: { icon: '📈', title: 'Progress: see yourself improve', line: 'fi_progress', chart: true, guide: null }
  };
  var FeatureIntro = (function () {
    var el = null, demo = null;
    function close(tryIt, mode) {
      if (demo) { demo.stop(); demo = null; } if (!el) return; el.classList.add('out'); var e = el; setTimeout(function () { e.remove(); }, 300); el = null;
      var F = FEATURES[mode]; if (tryIt && F && F.guide) setTimeout(function () { glow(F.guide.join(',')); toast(F.label); }, 350);
    }
    function show(mode) {
      var F = FEATURES[mode]; if (!F || el) return;
      el = document.createElement('div'); el.className = 'fi-wrap';
      el.innerHTML = '<div class="fi-card" role="dialog" aria-modal="true"><div class="fi-head"><span class="fi-ico">' + F.icon + '</span><b>' + esc(F.title) + '</b></div>' +
        (F.chart ? '<svg class="fi-chart" viewBox="0 0 300 120" aria-hidden="true"><path class="fi-line" d="M10 104 C 50 98, 70 92, 100 84 S 150 70, 180 60 S 240 30, 290 14" fill="none"/><circle cx="290" cy="14" r="6"/><text x="286" y="40" text-anchor="end">your rating, day by day</text></svg>' : '<div class="fi-board" id="fi-board"></div>') +
        '<p class="fi-text">' + esc(CAREER_TEXT[F.line]) + '</p><div class="wl-acts"><button class="btn primary big" data-fi="try">' + (F.guide ? 'Try it now ▶' : 'Got it') + '</button><button class="link small" data-fi="notips">Skip all tips</button></div></div>';
      document.body.appendChild(el);
      if (!F.chart) { var mb = MiniBoard($('#fi-board')); demo = mbPlay(mb, F.fen, F.seq, { loop: true, gap: 1200, hold: 2600, lead: 500 }); }
      el.addEventListener('click', function (e) { var b = e.target.closest('[data-fi]'); if (b && b.dataset.fi === 'notips') { S.noTips = true; save(); return close(false, mode); } if (b || e.target === el) close(true, mode); });
      Voice.say([WT(F.line)]);
    }
    return { show: show, has: function (m) { return !!FEATURES[m]; }, open: function () { return !!el; } };
  })();

  // a soft pulsing outline on the first visible match, for a few seconds
  function glow(sel) {
    var list = document.querySelectorAll(sel), t = null;
    for (var i = 0; i < list.length && !t; i++) { var r = list[i].getBoundingClientRect(); if (r.width > 4 && r.height > 4 && r.top < innerHeight && r.bottom > 0) t = list[i]; }
    if (!t) return; t.classList.add('g-glow'); setTimeout(function () { t.classList.remove('g-glow'); }, 4500);
  }
  // ---------- the guiding hand: points at what to tap next and goes away once it is tapped
  var Guide = (function () {
    var el = null, tgt = null, raf = 0, until = 0, cb = null;
    function find() {
      if (typeof tgt === 'function') { var p = tgt(); return p ? { left: p.x - 1, top: p.y - 1, width: 2, height: 2 } : null; }
      var sels = tgt.split(','); for (var k = 0; k < sels.length; k++) { var list = document.querySelectorAll(sels[k]); for (var i = 0; i < list.length; i++) { var r = list[i].getBoundingClientRect(); if (r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight) return r; } } return null;
    }
    function loop() {
      if (!el) return; var sp = document.getElementById('splash'), r = sp && !sp.classList.contains('out') ? null : find(); // never point through the splash
      if (!r) el.style.opacity = '0';
      else {
        var x = r.left + r.width / 2, y = r.top + Math.min(r.height * 0.62, r.height - 6), up = y + 120 < innerHeight;
        el.classList.toggle('down', !up); el.style.opacity = '1';
        el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(up ? y : r.top + 6) + 'px)';
        var lb = el.querySelector('.g-label'); if (lb) { var hw = lb.offsetWidth / 2 + 8, sh = Math.min(0, innerWidth - hw - x) + Math.max(0, hw - x); lb.style.marginLeft = sh + 'px'; } // keep the label on screen
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
