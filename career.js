  // ================= Career mode: Ascent Town, a small 3D world you walk around =================
  // Everything is built from simple shapes (no downloads). Static scenery is merged into a handful of meshes with
  // vertex colours, so a phone draws the whole town in a few calls. Buildings open the existing training screens,
  // Coach Leo gives the next objective, and the stage bosses wait at the Arena as rivals.
  var CW = null;
  var CAREER_LOCS = [
    { id: 'academy', name: 'Leo\'s Academy', sub: 'Lessons', x: 0, z: -26, door: [0, -18.8], r: 7, line: 'lesson_go', icon: '🎓' },
    { id: 'tower', name: 'Puzzle Tower', sub: 'Puzzles · Daily puzzle', x: 26, z: -8, door: [21.4, -6.6], r: 4.2, line: 'tower', icon: '🧩' },
    { id: 'library', name: 'Opening Library', sub: 'Openings', x: -26, z: -8, door: [-20.4, -6.3], r: 5.6, line: 'library', icon: '📚' },
    { id: 'arena', name: 'The Arena', sub: 'Rivals · Challenges', x: 23, z: 23, door: [16.4, 16.4], r: 8.6, line: 'arena', icon: '⚔️' },
    { id: 'park', name: 'The Park', sub: 'Play a full game', x: -22, z: 22, door: [-16.2, 16.2], r: 0, line: 'park', icon: '🌳' },
    { id: 'home', name: 'Your Home', sub: 'Progress · 30-Day Ascent', x: 0, z: 33, door: [0, 27.6], r: 4.8, line: 'home', icon: '🏠' }
  ];
  var LOOK = {
    skin: ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e'],
    hair: ['short', 'spiky', 'long', 'bun', 'curly', 'bald'],
    hairC: ['#2b1d14', '#6d4c41', '#e1b382', '#d35400', '#111111', '#b0b6bb', '#ff4f8b', '#4cc9f0'],
    shirt: ['#c4ff3d', '#4cc9f0', '#ff4f8b', '#ffd23f', '#8e6cf0', '#3ddc97', '#ff8c42', '#ffffff', '#2d3142', '#e74c3c'],
    pants: ['#24304f', '#2d3436', '#6d4c41', '#1b1a22', '#3f6fd8', '#7f8c8d'],
    hat: [['none', 'None'], ['cap', 'Cap'], ['beanie', 'Beanie'], ['headband', 'Headband', 'rex'], ['bandana', 'Bandana', 'tess'], ['wizard', 'Wizard hat', 'tao'], ['tophat', 'Top hat', 'greta'], ['crown', 'Crown', 'gus']]
  };
  var LOOK_DEFAULT = { skin: '#f1c27d', hair: 'short', hairC: '#2b1d14', shirt: '#c4ff3d', pants: '#24304f', hat: 'none' };
  function myLook() { return Object.assign({}, LOOK_DEFAULT, S.careerSt && S.careerSt.look || {}); }

  function careerChapter() {
    for (var i = 0; i < STAGES.length; i++) {
      var b = BOSSES.filter(function (x) { return x.stage === i; })[0];
      if (!stageCleared(i) || (b && !S.bosses[b.id] && !placedOut(i))) return i;
    }
    return STAGES.length;
  }
  function careerQuest() {
    var C = S.careerSt || {};
    if (!C.met) return { t: 'Talk to Coach Leo', target: 'leo', line: 'welcome', name: 'Coach Leo' };
    var ch = careerChapter(), nl = nextLesson();
    if (ch >= STAGES.length) return { t: 'Free roam: every rival beaten', target: null, line: 'all_done' };
    var b = BOSSES.filter(function (x) { return x.stage === ch; })[0];
    var lessonHere = nl && stageOf(nl) === ch;
    if (b && !S.bosses[b.id] && bossOpen(ch) && !lessonHere) return { t: 'Beat ' + b.name + ' at the Arena', target: 'boss-' + b.id, line: 'boss_ready', boss: b, name: b.name };
    if (nl) return { t: 'Academy: ' + LESSONS[nl].title, target: 'academy', lesson: nl, line: 'lesson_go', name: 'Academy' };
    if (b && !S.bosses[b.id]) return { t: 'Beat ' + b.name + ' at the Arena', target: 'boss-' + b.id, line: 'boss_ready', boss: b, name: b.name };
    return { t: 'Explore the town', target: null, line: 'all_done' };
  }
  function careerProgress() {
    var ch = careerChapter(); if (ch >= STAGES.length) return '🏆 Every chapter cleared';
    var st = STAGES[ch], done = st.lessons.filter(lessonDone).length, b = BOSSES.filter(function (x) { return x.stage === ch; })[0];
    return '📘 ' + done + '/' + st.lessons.length + ' lessons' + (b ? ' · ⚔️ ' + b.name + (S.bosses[b.id] ? ' ✓' : bossOpen(ch) ? ' ready' : ' 🔒') : '');
  }
  function WL(k) { return { id: 'W-' + k, text: CAREER_TEXT[k] }; }
  function lin(c) { return new THREE.Color(c).convertSRGBToLinear(); }

  // ---------- geometry helpers: collect coloured parts, then merge them into one mesh per material
  function mergeParts(parts) {
    var T = THREE, n = 0, prepared = parts.map(function (p) {
      var g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); g.applyMatrix4(p.m); n += g.attributes.position.count; return { g: g, c: p.c };
    });
    var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), o = 0;
    prepared.forEach(function (p) {
      var a = p.g.attributes.position.array, b = p.g.attributes.normal.array, k = a.length / 3;
      pos.set(a, o * 3); nor.set(b, o * 3);
      for (var i = 0; i < k; i++) { col[(o + i) * 3] = p.c.r; col[(o + i) * 3 + 1] = p.c.g; col[(o + i) * 3 + 2] = p.c.b; }
      o += k; p.g.dispose();
    });
    var G = new T.BufferGeometry();
    G.setAttribute('position', new T.BufferAttribute(pos, 3)); G.setAttribute('normal', new T.BufferAttribute(nor, 3)); G.setAttribute('color', new T.BufferAttribute(col, 3));
    G.computeBoundingSphere(); return G;
  }
  function Kit() {
    var T = THREE, cache = {}, kit = { parts: { flat: [], smooth: [], glow: [] }, frame: new T.Matrix4() };
    kit.geo = function (key, make) { return cache[key] || (cache[key] = make()); };
    kit.box = function (w, h, d) { return kit.geo('b' + w + ',' + h + ',' + d, function () { return new T.BoxGeometry(w, h, d); }); };
    kit.cyl = function (a, b, h, s) { return kit.geo('c' + a + ',' + b + ',' + h + ',' + (s || 12), function () { return new T.CylinderGeometry(a, b, h, s || 12); }); };
    kit.sph = function (r, w, h) { return kit.geo('s' + r + ',' + (w || 12), function () { return new T.SphereGeometry(r, w || 12, h || 8); }); };
    kit.cone = function (r, h, s) { return kit.geo('k' + r + ',' + h + ',' + (s || 8), function () { return new T.ConeGeometry(r, h, s || 8); }); };
    kit.ico = function (r, d) { return kit.geo('i' + r + ',' + (d || 0), function () { return new T.IcosahedronGeometry(r, d || 0); }); };
    var tmp = new T.Object3D();
    // add(geometry, colour, [x,y,z], [rx,ry,rz], [sx,sy,sz], kind) in the current frame (a building's own space)
    kit.add = function (g, c, p, r, s, kind) {
      tmp.position.set(p[0], p[1], p[2]); tmp.rotation.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); tmp.scale.set(s ? s[0] : 1, s ? s[1] : 1, s ? s[2] : 1); tmp.updateMatrix();
      kit.parts[kind || 'flat'].push({ g: g, c: lin(c), m: new T.Matrix4().multiplyMatrices(kit.frame, tmp.matrix) });
    };
    kit.at = function (x, z, ry, y) { kit.frame.makeRotationY(ry || 0); kit.frame.setPosition(x, y || 0, z); };
    kit.reset = function () { kit.frame.identity(); };
    return kit;
  }
  function flipGeo(g) { // turn a shape inside out, so its faces point inwards
    g = g.index ? g.toNonIndexed() : g; var p = g.attributes.position.array, n = g.attributes.normal.array;
    for (var i = 0; i < p.length; i += 9) for (var k = 0; k < 3; k++) { var a = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = a; var b = n[i + 3 + k]; n[i + 3 + k] = n[i + 6 + k]; n[i + 6 + k] = b; }
    for (var j = 0; j < n.length; j++) n[j] = -n[j]; return g;
  }
  function knightShape() {
    var s = new THREE.Shape(), P = [[0.9, 0], [0.9, 0.25], [0.68, 0.36], [0.72, 1.0], [0.95, 1.55], [0.92, 2.0], [0.62, 2.38], [0.25, 2.6], [0.05, 2.5], [-0.2, 2.62], [-0.32, 2.3], [-0.6, 2.05], [-0.9, 1.72], [-0.84, 1.5], [-0.35, 1.52], [-0.4, 1.1], [-0.62, 0.36], [-0.9, 0.25], [-0.9, 0]];
    s.moveTo(P[0][0], P[0][1]); P.slice(1).forEach(function (q) { s.lineTo(q[0], q[1]); }); s.lineTo(P[0][0], P[0][1]);
    var g = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 }); g.translate(0, 0, -0.275); return g;
  }

  // ---------- people: six rigid parts each, vertex coloured, so a person costs six draw calls
  function personParts(L, lod) {
    var K = Kit(), P = {};
    function part(name, build) { K.parts = { flat: [], smooth: [], glow: [] }; K.reset(); build(K); P[name] = mergeParts(K.parts.smooth.concat(K.parts.flat)); }
    var dark = '#1e1e28', shoe = L.shoe || '#2a2a33';
    part('leg', function (k) { k.add(k.cyl(0.115, 0.1, 0.62, 10), L.pants, [0, -0.31, 0], null, null, 'smooth'); k.add(k.box(0.2, 0.12, 0.32), shoe, [0, -0.64, 0.05], null, null, 'smooth'); });
    part('arm', function (k) { k.add(k.cyl(0.085, 0.075, 0.5, 10), L.shirt, [0, -0.25, 0], null, null, 'smooth'); k.add(k.sph(0.085, 10), L.skin, [0, -0.54, 0], null, null, 'smooth'); });
    part('torso', function (k) {
      k.add(k.cyl(0.26, 0.3, 0.62, 14), L.shirt, [0, 1.17, 0], null, null, 'smooth');
      k.add(k.sph(0.27, 14), L.shirt, [0, 1.46, 0], null, [1.05, 0.42, 0.95], 'smooth');
      k.add(k.cyl(0.305, 0.305, 0.1, 14), L.pants, [0, 0.88, 0], null, null, 'smooth');
      k.add(k.cyl(0.08, 0.08, 0.14, 8), L.skin, [0, 1.6, 0], null, null, 'smooth');
      if (L.coat) { k.add(k.box(0.5, 0.5, 0.06), L.coat, [0, 1.12, 0.29], null, null, 'smooth'); }
      if (L.tie) k.add(k.box(0.07, 0.3, 0.04), L.tie, [0, 1.32, 0.29], null, null, 'smooth');
    });
    part('head', function (k) {
      k.add(k.sph(0.27, 16, 12), L.skin, [0, 0, 0], null, [1, 1.04, 0.96], 'smooth');
      if (!lod) {
        k.add(k.sph(0.062, 12), '#ffffff', [-0.1, 0.035, 0.222], null, [1, 1.2, 0.6], 'smooth'); k.add(k.sph(0.062, 12), '#ffffff', [0.1, 0.035, 0.222], null, [1, 1.2, 0.6], 'smooth');
        k.add(k.sph(0.036, 10), dark, [-0.098, 0.03, 0.258], null, null, 'smooth'); k.add(k.sph(0.036, 10), dark, [0.098, 0.03, 0.258], null, null, 'smooth');
        k.add(k.sph(0.012, 6), '#ffffff', [-0.088, 0.045, 0.29]); k.add(k.sph(0.012, 6), '#ffffff', [0.108, 0.045, 0.29]);
        k.add(k.box(0.075, 0.018, 0.025), L.hairC, [-0.1, 0.135, 0.245], [0, 0, -0.18]); k.add(k.box(0.075, 0.018, 0.025), L.hairC, [0.1, 0.135, 0.245], [0, 0, 0.18]);
        k.add(k.sph(0.035, 8), L.skin, [0, -0.035, 0.265], null, null, 'smooth');
        k.add(k.geo('smile', function () { return new THREE.TorusGeometry(0.055, 0.014, 6, 12, Math.PI); }), '#7a2e2e', [0, -0.1, 0.25], [0, 0, Math.PI]);
        k.add(k.sph(0.035, 8), '#ff9a9a', [-0.17, -0.06, 0.2], null, [1, 0.6, 0.4]); k.add(k.sph(0.035, 8), '#ff9a9a', [0.17, -0.06, 0.2], null, [1, 0.6, 0.4]);
        k.add(k.sph(0.06, 8), L.skin, [-0.27, 0, 0], null, [0.6, 1, 1], 'smooth'); k.add(k.sph(0.06, 8), L.skin, [0.27, 0, 0], null, [0.6, 1, 1], 'smooth');
        if (L.glasses) { k.add(k.box(0.13, 0.09, 0.02), '#222', [-0.1, 0.03, 0.27]); k.add(k.box(0.13, 0.09, 0.02), '#222', [0.1, 0.03, 0.27]); k.add(k.box(0.08, 0.02, 0.02), '#222', [0, 0.04, 0.27]); }
      } else {
        k.add(k.sph(0.04, 8), dark, [-0.1, 0.03, 0.245]); k.add(k.sph(0.04, 8), dark, [0.1, 0.03, 0.245]); k.add(k.geo('smile', function () { return new THREE.TorusGeometry(0.055, 0.016, 6, 10, Math.PI); }), '#7a2e2e', [0, -0.1, 0.25], [0, 0, Math.PI]);
      }
      var hc = L.hairC;
      if (L.hair !== 'bald') k.add(k.sph(0.285, 14, 10), hc, [0, 0.06, -0.03], null, [1.02, 0.8, 1.02], 'smooth');
      if (L.hair === 'long') k.add(k.box(0.5, 0.42, 0.14), hc, [0, -0.14, -0.2], null, null, 'smooth');
      if (L.hair === 'bun') k.add(k.sph(0.12, 10), hc, [0, 0.3, -0.14], null, null, 'smooth');
      if (L.hair === 'spiky') for (var i = 0; i < 7; i++) { var a = -1.2 + i * 0.4; k.add(k.cone(0.08, 0.26, 6), hc, [Math.sin(a) * 0.2, 0.24, Math.cos(a) * 0.05 - 0.04], [-0.3, 0, -a * 0.5]); }
      if (L.hair === 'curly') for (var j = 0; j < 9; j++) { var b = j / 9 * Math.PI * 2; k.add(k.sph(0.1, 8), hc, [Math.sin(b) * 0.2, 0.2 + (j % 2) * 0.05, Math.cos(b) * 0.18 - 0.04]); }
      if (L.beard) k.add(k.sph(0.2, 12), hc, [0, -0.17, 0.12], null, [1.1, 0.7, 0.8], 'smooth');
      var h = L.hat;
      if (h === 'cap') { k.add(k.sph(0.29, 14, 10), L.hatC || '#e74c3c', [0, 0.08, -0.02], null, [1, 0.7, 1], 'smooth'); k.add(k.box(0.36, 0.03, 0.22), L.hatC || '#e74c3c', [0, 0.1, 0.3]); }
      if (h === 'beanie') { k.add(k.sph(0.3, 14, 10), '#8e6cf0', [0, 0.1, -0.02], null, [1, 0.85, 1], 'smooth'); k.add(k.sph(0.08, 8), '#ffffff', [0, 0.37, -0.02]); }
      if (h === 'headband') k.add(k.cyl(0.285, 0.285, 0.07, 16), '#4cc9f0', [0, 0.12, 0]);
      if (h === 'bandana') { k.add(k.sph(0.29, 14, 10), '#ff4f8b', [0, 0.08, -0.02], null, [1.02, 0.72, 1.02], 'smooth'); k.add(k.cone(0.07, 0.2, 6), '#ff4f8b', [0, 0.02, -0.33], [-1.6, 0, 0]); }
      if (h === 'wizard') { k.add(k.cyl(0.42, 0.42, 0.04, 16), '#3f3cbb', [0, 0.16, 0]); k.add(k.cone(0.26, 0.62, 12), '#3f3cbb', [0, 0.48, 0], [-0.12, 0, 0]); k.add(k.ico(0.05), '#ffd23f', [0, 0.4, 0.2]); }
      if (h === 'tophat') { k.add(k.cyl(0.4, 0.4, 0.03, 16), '#1b1a22', [0, 0.17, 0]); k.add(k.cyl(0.22, 0.22, 0.4, 14), '#1b1a22', [0, 0.38, 0]); k.add(k.cyl(0.225, 0.225, 0.06, 14), '#c0392b', [0, 0.22, 0]); }
      if (h === 'crown') { k.add(k.cyl(0.24, 0.24, 0.14, 10), '#ffd23f', [0, 0.24, 0], null, null, 'smooth'); for (var c = 0; c < 5; c++) { var d = c / 5 * Math.PI * 2; k.add(k.cone(0.06, 0.16, 4), '#ffd23f', [Math.sin(d) * 0.22, 0.38, Math.cos(d) * 0.22]); } k.add(k.sph(0.04, 6), '#e74c3c', [0, 0.25, 0.24]); }
    });
    return P;
  }

  function careerBuild(host) {
    var T = THREE, mob = document.body.classList.contains('mob');
    var W = { host: host, t: 0, hits: [], col: [], npcs: [], walkers: [], anim: [], pawns: [], keys: {}, bub: [], mob: mob,
      camYaw: 0.18, camDist: mob ? 16 : 14.5, camH: mob ? 10 : 8.6, camMode: 'follow', q: 'high' };
    var r = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    W.pr = Math.min(window.devicePixelRatio || 1, mob ? 1.5 : 2); r.setPixelRatio(W.pr);
    r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.08;
    r.shadowMap.enabled = true; r.shadowMap.type = mob ? T.PCFShadowMap : T.PCFSoftShadowMap;
    host.appendChild(r.domElement); r.domElement.className = 'w-canvas';
    var sc = new T.Scene(); sc.fog = new T.Fog(lin('#cfe9f7'), 70, 210);
    var cam = new T.PerspectiveCamera(50, 1, 0.4, 420); W.r = r; W.sc = sc; W.cam = cam;
    // sky dome with a warm horizon and a soft sun
    var skyM = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color('#2f8fe0') }, mid: { value: new T.Color('#9fd4f5') }, bot: { value: new T.Color('#fbe7c6') }, sun: { value: new T.Vector3(-0.45, 0.55, 0.7).normalize() } },
      vertexShader: 'varying vec3 vd; void main(){ vd = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sun; varying vec3 vd; void main(){ float h = vd.y; vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(mid, bot, clamp(-h * 4.0, 0.0, 1.0)); c = mix(c, bot, smoothstep(0.18, 0.0, abs(h)) * 0.55); float s = max(dot(vd, sun), 0.0); c += vec3(1.0, 0.86, 0.6) * (pow(s, 600.0) * 1.6 + pow(s, 12.0) * 0.18); gl_FragColor = vec4(c, 1.0); }' });
    W.sky = new T.Mesh(new T.SphereGeometry(380, 24, 16), skyM); W.sky.renderOrder = -1; W.sky.frustumCulled = false; sc.add(W.sky);
    sc.add(new T.HemisphereLight(lin('#d6ecff'), lin('#5e8a3e'), 0.62));
    var sun = new T.DirectionalLight(lin('#fff0d4'), 1.25); sun.castShadow = true;
    sun.shadow.mapSize.set(mob ? 1024 : 2048, mob ? 1024 : 2048); var shc = sun.shadow.camera; shc.left = -32; shc.right = 32; shc.top = 32; shc.bottom = -32; shc.near = 1; shc.far = 120;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sc.add(sun); sc.add(sun.target); W.sun = sun;
    var fill = new T.DirectionalLight(lin('#bcd8ff'), 0.25); fill.position.set(30, 20, -30); sc.add(fill);

    var K = Kit(), add = K.add;
    // ---- the island, sea and distant hills
    var ground = new T.Mesh(new T.CircleGeometry(62, 96), new T.MeshLambertMaterial({ color: lin('#86cf5a') })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground); W.ground = ground;
    add(new T.RingGeometry(61.5, 65.5, 96, 1), '#f2deaa', [0, -0.04, 0], [-Math.PI / 2, 0, 0]);
    add(new T.CylinderGeometry(65.5, 60, 9, 48, 2, true), '#9a8466', [0, -4.5, 0]);
    var sea = new T.Mesh(new T.PlaneGeometry(900, 900, 60, 60), new T.MeshLambertMaterial({ color: lin('#2aa6d8'), transparent: true, opacity: 0.94 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.7; sc.add(sea);
    sea.material.onBeforeCompile = function (sh) { sh.uniforms.time = W.seaT = { value: 0 }; sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.z += sin(position.x * 0.06 + time * 0.9) * 0.35 + cos(position.y * 0.05 + time * 0.7) * 0.3;'); };
    var foam = new T.Mesh(new T.RingGeometry(65.4, 67.5, 96), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false })); foam.rotation.x = -Math.PI / 2; foam.position.y = -0.55; sc.add(foam); W.foam = foam;
    for (var hi = 0; hi < 9; hi++) { var ha = hi / 9 * Math.PI * 2 + 0.3, hd = 150 + (hi % 3) * 30; add(K.cone(26 + (hi % 4) * 7, 30 + (hi % 3) * 12, 7), hi % 2 ? '#6f9c6b' : '#7fae74', [Math.sin(ha) * hd, 4, Math.cos(ha) * hd]); add(K.cone(9, 9, 7), '#f4f6f8', [Math.sin(ha) * hd, 20 + (hi % 3) * 7, Math.cos(ha) * hd]); }
    // grass patches break up the flat green
    var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; } W.rnd = rnd;
    for (var gp = 0; gp < 70; gp++) { var ga = rnd() * Math.PI * 2, gd = 9 + rnd() * 50; add(new T.CircleGeometry(1.5 + rnd() * 3, 9), rnd() < 0.5 ? '#7cc451' : '#93d965', [Math.sin(ga) * gd, 0.012, Math.cos(ga) * gd], [-Math.PI / 2, 0, rnd() * 3]); }
    // ---- plaza with the giant board
    add(K.cyl(10.5, 10.8, 0.12, 40), '#e8dcc0', [0, 0.04, 0]);
    add(K.box(14.4, 0.16, 14.4), '#8a6a45', [0, 0.08, 0]);
    for (var bi = 0; bi < 8; bi++) for (var bj = 0; bj < 8; bj++) add(K.box(1.58, 0.1, 1.58), (bi + bj) % 2 ? '#f3e6c8' : '#7d5a3a', [(bi - 3.5) * 1.6, 0.17, (bj - 3.5) * 1.6]);
    // ---- roads with edge stones and lamps
    CAREER_LOCS.forEach(function (L) {
      var len = Math.hypot(L.door[0], L.door[1]) - 10.2, a = Math.atan2(L.door[0], L.door[1]), mid = 10.2 + len / 2;
      K.at(Math.sin(a) * mid, Math.cos(a) * mid, a);
      add(K.box(3.4, 0.06, len), '#e6d3a6', [0, 0.03, 0]);
      for (var s2 = -len / 2; s2 < len / 2; s2 += 1.1) { add(K.box(0.36, 0.12, 0.8), '#b9a47e', [-1.85, 0.06, s2]); add(K.box(0.36, 0.12, 0.8), '#b9a47e', [1.85, 0.06, s2]); }
      for (var lp = -len / 2 + 2, li = 0; L.id !== 'home' && lp < len / 2; lp += 6.5, li++) { var side = li % 2 ? -2.5 : 2.5; add(K.cyl(0.08, 0.12, 3.2, 8), '#2d3142', [side, 1.6, lp]); add(K.cyl(0.22, 0.26, 0.2, 8), '#2d3142', [side, 0.1, lp]); add(K.sph(0.3, 10), '#fff3c4', [side, 3.3, lp], null, null, 'glow'); add(K.cone(0.34, 0.2, 8), '#2d3142', [side, 3.6, lp]); }
      K.reset();
    });
    // plaza poles with bunting
    var poles = [[-8.6, -8.6], [8.6, -8.6], [8.6, 8.6], [-8.6, 8.6]];
    poles.forEach(function (p) { add(K.cyl(0.1, 0.12, 5, 8), '#f4f1ea', [p[0], 2.5, p[1]]); add(K.sph(0.18, 8), '#ffd23f', [p[0], 5.1, p[1]]); W.col.push({ x: p[0], z: p[1], r: 0.4 }); });
    var flagC = ['#ff4f8b', '#ffd23f', '#4cc9f0', '#3ddc97', '#8e6cf0', '#ff8c42'];
    for (var pi = 0; pi < 4; pi++) {
      var A = poles[pi], B = poles[(pi + 1) % 4];
      for (var f = 1; f < 14; f++) { var u = f / 14, x = A[0] + (B[0] - A[0]) * u, z = A[1] + (B[1] - A[1]) * u, y = 4.8 - Math.sin(u * Math.PI) * 1.2, ang = Math.atan2(B[0] - A[0], B[1] - A[1]);
        add(K.cone(0.22, 0.5, 3), flagC[f % 6], [x, y - 0.25, z], [Math.PI, ang + Math.PI / 2, 0], [1, 1, 0.25]); }
    }
    // giant statues on plinths beside the plaza
    function lathe(pts, col, x, z, s) { add(new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0] * s, p[1] * s); }), 22), col, [x, 0.5, z], null, null, 'smooth'); add(K.box(2.4, 0.5, 2.4), '#d9cdb0', [x, 0.25, z]); }
    var KING = [[0, 0], [0.62, 0], [0.62, 0.16], [0.5, 0.26], [0.36, 0.34], [0.26, 0.9], [0.22, 1.5], [0.36, 1.62], [0.38, 1.72], [0.24, 1.8], [0.3, 2.1], [0.12, 2.24], [0, 2.26]];
    var QUEEN = [[0, 0], [0.6, 0], [0.6, 0.16], [0.48, 0.26], [0.34, 0.34], [0.24, 0.9], [0.2, 1.4], [0.34, 1.52], [0.36, 1.6], [0.22, 1.68], [0.34, 2], [0.18, 2.04], [0.1, 2.14], [0, 2.18]];
    var PAWN = [[0, 0], [0.5, 0], [0.5, 0.14], [0.36, 0.24], [0.22, 0.4], [0.16, 0.78], [0.3, 0.86], [0.18, 0.94], [0.3, 1.14], [0.22, 1.34], [0, 1.4]];
    W.PAWN = PAWN;
    [[-11.6, -3.2, KING, '#f6efe0'], [11.6, -3.2, QUEEN, '#2d2d3c'], [-11.6, 3.6, PAWN, '#f6efe0'], [11.6, 3.6, PAWN, '#2d2d3c']].forEach(function (q) { lathe(q[2], q[3], q[0], q[1], 1.4); W.col.push({ x: q[0], z: q[1], r: 1.4 }); });
    add(K.box(0.18, 0.62, 0.18), '#f6efe0', [-11.6, 4, -3.2]); add(K.box(0.56, 0.18, 0.18), '#f6efe0', [-11.6, 4.05, -3.2]);
    // flower beds around the plaza ring
    for (var fb = 0; fb < 28; fb++) { var fa = fb / 28 * Math.PI * 2; if (CAREER_LOCS.some(function (L) { var a = Math.atan2(L.door[0], L.door[1]); return Math.abs(Math.atan2(Math.sin(fa - a), Math.cos(fa - a))) < 0.22; })) continue;
      add(K.sph(0.55, 8), '#4f9a3a', [Math.sin(fa) * 11.4, 0.25, Math.cos(fa) * 11.4], null, [1, 0.6, 1]); for (var fl = 0; fl < 3; fl++) add(K.sph(0.13, 6), ['#ff4f8b', '#ffd23f', '#ffffff', '#8e6cf0'][(fb + fl) % 4], [Math.sin(fa) * 11.4 + (fl - 1) * 0.3, 0.6, Math.cos(fa) * 11.4 + (fl % 2) * 0.2]); }

    var Lb = {}; CAREER_LOCS.forEach(function (L) { Lb[L.id] = L; });
    function face(L) { K.at(L.x, L.z, Math.atan2(L.door[0] - L.x, L.door[1] - L.z)); }
    function win(x, y, z, w, h) { add(K.box(w + 0.18, h + 0.18, 0.08), '#ffffff', [x, y, z]); add(K.box(w, h, 0.1), '#ffe2a0', [x, y, z + 0.01], null, null, 'glow'); add(K.box(w, 0.06, 0.12), '#ffffff', [x, y, z + 0.02]); }
    function doorAt(z, w, h, c) { add(K.box(w + 0.4, h + 0.3, 0.14), c || '#6b4430', [0, (h + 0.3) / 2, z]); add(K.box(w, h, 0.16), '#ffcf7a', [0, h / 2, z + 0.01], null, null, 'glow'); }
    function sign(L, y, k) { var s = label(L.name, L.sub, '#ffd23f', k || 1); s.position.set(L.door[0], y, L.door[1]); sc.add(s); }
    function hitBox(w, h, d, x, y, z, hit, parent) {
      var o = new T.Mesh(K.box(w, h, d), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      o.position.set(x, y, z); o.userData.hit = hit; (parent || sc).add(o); W.hits.push(o); return o;
    }
    function hitAt(L, w, h, d) { var o = hitBox(w, h, d, L.x, h / 2, L.z, { type: 'loc', id: L.id }); o.rotation.y = Math.atan2(L.door[0] - L.x, L.door[1] - L.z); }
    // academy: steps, columns, roof and a golden knight
    (function (L) {
      face(L);
      for (var s3 = 0; s3 < 3; s3++) add(K.box(15 - s3 * 0.8, 0.3, 10 - s3 * 0.8), '#e7dfcf', [0, 0.15 + s3 * 0.3, 0.6 - s3 * 0.2]);
      add(K.box(12.5, 6, 7), '#f6efe2', [0, 3.9, -0.6]);
      add(K.box(13.4, 0.5, 7.8), '#e1d6c2', [0, 7.1, -0.6]);
      var ped = new T.CylinderGeometry(1, 1, 1, 3); ped.rotateZ(Math.PI / 2); ped.rotateY(Math.PI / 2);
      add(ped, '#f6efe2', [0, 8.3, 2.6], null, [6.6, 2.4, 0.9]);
      add(K.box(14.2, 0.35, 8.6), '#3f6fd8', [-3.2, 8.4, -0.8], [0, 0, 0.34], [0.5, 1, 1]); add(K.box(14.2, 0.35, 8.6), '#3f6fd8', [3.2, 8.4, -0.8], [0, 0, -0.34], [0.5, 1, 1]);
      for (var c2 = -2.5; c2 <= 2.5; c2++) { var cx = c2 * 2.3; add(K.cyl(0.32, 0.36, 5.8, 12), '#ffffff', [cx, 3.9, 3.4], null, null, 'smooth'); add(K.box(0.9, 0.3, 0.9), '#e1d6c2', [cx, 6.95, 3.4]); add(K.box(0.9, 0.3, 0.9), '#e1d6c2', [cx, 1.05, 3.4]); }
      for (var wi = 0; wi < 4; wi++) { win(-4.5 + wi * 3, 3, 2.92, 1.1, 1.5); win(-4.5 + wi * 3, 5.4, 2.92, 1.1, 1.1); }
      doorAt(2.95, 2, 2.9);
      add(knightShape(), '#ffd23f', [0, 7.65, 3.15], null, [0.55, 0.55, 0.3], 'smooth');
      for (var fl2 = -1; fl2 <= 1; fl2 += 2) { add(K.cyl(0.06, 0.06, 3, 6), '#555555', [fl2 * 6, 9.4, -0.6]); add(K.box(1.6, 0.9, 0.04), '#3f6fd8', [fl2 * 6 + 0.8, 10.4, -0.6]); }
      for (var bsh = -1; bsh <= 1; bsh += 2) { add(K.ico(0.9), '#4f9a3a', [bsh * 7.6, 0.8, 3.6]); add(K.ico(0.7), '#58b15a', [bsh * 7.6, 0.7, 2]); }
      K.reset(); W.col.push({ x: L.x, z: L.z, r: L.r }); hitAt(L, 13, 10, 9); sign(L, 10.2, 1.1);
    })(Lb.academy);
    // puzzle tower
    (function (L) {
      face(L);
      add(K.cyl(4, 4.3, 1.2, 8), '#b9a47e', [0, 0.6, 0]);
      add(K.cyl(3, 3.4, 11, 8), '#8e6cf0', [0, 6.6, 0]);
      for (var ri = 0; ri < 5; ri++) add(K.cyl(3.1, 3.15, 0.18, 8), '#6f52d0', [0, 2.4 + ri * 2.2, 0]);
      add(K.cyl(3.8, 3.8, 0.5, 8), '#ffd23f', [0, 12.3, 0]);
      for (var cr = 0; cr < 8; cr++) { var ca = cr / 8 * Math.PI * 2; add(K.box(0.7, 0.8, 0.5), '#ffd23f', [Math.sin(ca) * 3.55, 12.9, Math.cos(ca) * 3.55], [0, ca, 0]); }
      add(K.cone(3.4, 4.6, 8), '#ff4f8b', [0, 15.3, 0]);
      for (var wy = 0; wy < 3; wy++) win(0, 3.8 + wy * 2.6, 3.02, 0.9, 1.2);
      doorAt(3.1, 1.5, 2.4);
      [[2.8, 0.5, 2.6, '#ff4f8b'], [-2.9, 0.5, 2.4, '#4cc9f0'], [3.3, 0.5, -1.4, '#ffd23f']].forEach(function (q) { add(K.box(0.9, 0.9, 0.9), q[3], [q[0], q[1], q[2]], [0, 0.5, 0]); add(K.cyl(0.18, 0.18, 0.3, 8), q[3], [q[0] + 0.5, q[1], q[2]], [0, 0, Math.PI / 2]); });
      K.reset(); W.col.push({ x: L.x, z: L.z, r: L.r }); hitAt(L, 8, 18, 8); sign(L, 7.6, 1.05);
    })(Lb.tower);
    // library: a stack of giant books with a quill
    (function (L) {
      face(L);
      ['#c0392b', '#2e86de', '#27ae60', '#f39c12', '#8e44ad'].forEach(function (c, k) { var w = 9 - k * 0.7, d = 6.4 - k * 0.35, y = 0.85 + k * 1.7, rot = (k % 2 ? 0.07 : -0.06), ox = k % 2 ? 0.3 : -0.3;
        add(K.box(w, 1.7, d), c, [ox, y, 0], [0, rot, 0]);
        add(K.box(w - 0.3, 1.4, 0.06), '#fff7e0', [ox, y, d / 2 + 0.01], [0, rot, 0]);
        add(K.box(w + 0.04, 0.2, d + 0.04), '#ffd23f', [ox, y + 0.55, 0], [0, rot, 0]); });
      add(K.cyl(0.08, 0.02, 6, 6), '#f5f5f5', [2.4, 10.2, -0.5], [0.3, 0, -0.4]); add(K.box(0.8, 3.2, 0.05), '#ffffff', [2.0, 10.8, -0.5], [0.3, 0, -0.4]);
      doorAt(3.25, 1.6, 2.4, '#5b3a29');
      for (var ln = -1; ln <= 1; ln += 2) { add(K.cyl(0.07, 0.1, 2.6, 6), '#2d3142', [ln * 3.2, 1.3, 4.2]); add(K.sph(0.26, 8), '#fff3c4', [ln * 3.2, 2.7, 4.2], null, null, 'glow'); }
      K.reset(); W.col.push({ x: L.x, z: L.z, r: L.r }); hitAt(L, 10, 10, 8); sign(L, 10.6, 1.05);
    })(Lb.library);
    // arena: wall with arches, tiers inside, torches at the gate
    (function (L) {
      face(L);
      add(new T.CylinderGeometry(7.6, 8, 4.6, 32, 1, true, 0.26, Math.PI * 2 - 0.52), '#d9534f', [0, 2.3, 0]);
      add(flipGeo(new T.CylinderGeometry(7.2, 7.2, 4.6, 32, 1, true, 0.26, Math.PI * 2 - 0.52)), '#b94541', [0, 2.3, 0]);
      add(new T.TorusGeometry(7.6, 0.35, 6, 32), '#ffd23f', [0, 4.6, 0], [Math.PI / 2, 0, 0]);
      for (var ar = 0; ar < 16; ar++) { var aa = ar / 16 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(aa), Math.cos(aa))) < 0.3) continue; add(K.box(1, 2.2, 0.2), '#7c2a28', [Math.sin(aa) * 8.02, 1.4, Math.cos(aa) * 8.02], [0, aa, 0]); }
      add(K.cyl(7, 7, 0.1, 32), '#e9d8ad', [0, 0.05, 0]);
      add(K.cyl(4.6, 4.6, 0.06, 32), '#f4e9c9', [0, 0.1, 0]);
      // stepped stands that rise towards the wall, open at the gate
      var stand = [[4.9, 0], [4.9, 0.6], [5.6, 0.6], [5.6, 1.2], [6.3, 1.2], [6.3, 1.8], [7.15, 1.8], [7.15, 0]].map(function (q) { return new T.Vector2(q[0], q[1]); });
      add(new T.LatheGeometry(stand, 32, 0.5, Math.PI * 2 - 1), '#a8a29a', [0, 0, 0]);
      add(K.box(3.4, 0.8, 1.6), '#ffd23f', [0, 4.9, 7.6]);
      add(K.box(0.6, 5, 0.6), '#7c2a28', [-1.9, 2.5, 7.8]); add(K.box(0.6, 5, 0.6), '#7c2a28', [1.9, 2.5, 7.8]);
      for (var tx2 = -1; tx2 <= 1; tx2 += 2) { add(K.cyl(0.1, 0.14, 1.6, 6), '#3b2a1e', [tx2 * 2.6, 2.6, 8.2]); add(K.cone(0.28, 0.6, 6), '#ff8c42', [tx2 * 2.6, 3.7, 8.2], null, null, 'glow'); }
      K.reset(); W.col.push({ x: L.x, z: L.z, r: L.r }); hitAt(L, 17, 7, 17); sign(L, 8.4, 1.1);
    })(Lb.arena);
    // park: pond with a fountain, chess tables, benches and a little fence
    (function (L) {
      var ro = 0.8, c = Math.cos(ro), s = Math.sin(ro);
      function wp(px, pz) { return { x: L.x + px * c + pz * s, z: L.z - px * s + pz * c }; }
      K.at(L.x, L.z, ro);
      add(new T.CircleGeometry(4.6, 28), '#4cb7e8', [-3, 0.05, 3], [-Math.PI / 2, 0, 0], null, 'smooth');
      add(new T.RingGeometry(4.5, 5.1, 28), '#c9b48a', [-3, 0.06, 3], [-Math.PI / 2, 0, 0]);
      add(K.cyl(0.9, 1.1, 0.6, 12), '#d9cdb0', [-3, 0.3, 3]); add(K.cyl(0.18, 0.24, 1.6, 8), '#d9cdb0', [-3, 1.1, 3]); add(K.cyl(0.7, 0.3, 0.3, 12), '#d9cdb0', [-3, 1.9, 3]);
      var tables = [[2.6, -2.2], [-1, -5.2], [4.4, 2.6]];
      tables.forEach(function (p) {
        add(K.cyl(0.95, 0.95, 0.12, 16), '#8a5a3a', [p[0], 1, p[1]]); add(K.cyl(0.15, 0.22, 1, 8), '#5b3a29', [p[0], 0.5, p[1]]);
        add(K.box(0.92, 0.04, 0.92), '#f2e3c4', [p[0], 1.08, p[1]]); for (var a2 = 0; a2 < 4; a2++) for (var b2 = 0; b2 < 4; b2++) if ((a2 + b2) % 2) add(K.box(0.23, 0.02, 0.23), '#7b5a3a', [p[0] + (a2 - 1.5) * 0.23, 1.11, p[1] + (b2 - 1.5) * 0.23]);
        add(K.cyl(0.35, 0.35, 0.5, 10), '#8a5a3a', [p[0] - 1.3, 0.25, p[1]]); add(K.cyl(0.35, 0.35, 0.5, 10), '#8a5a3a', [p[0] + 1.3, 0.25, p[1]]);
      });
      for (var bn = 0; bn < 2; bn++) { var bx = -6.5 + bn * 4; add(K.box(2.2, 0.12, 0.6), '#a0522d', [bx, 0.6, -2]); add(K.box(2.2, 0.6, 0.1), '#a0522d', [bx, 0.95, -2.3]); add(K.box(0.12, 0.6, 0.5), '#333333', [bx - 0.9, 0.3, -2]); add(K.box(0.12, 0.6, 0.5), '#333333', [bx + 0.9, 0.3, -2]); }
      var gate = Math.atan2(L.door[0] - L.x, L.door[1] - L.z) - ro;
      for (var fe = 0; fe < 26; fe++) { var fa2 = fe / 26 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(fa2 - gate), Math.cos(fa2 - gate))) < 0.4) continue; add(K.box(0.14, 0.8, 0.14), '#ffffff', [Math.sin(fa2) * 8.6, 0.4, Math.cos(fa2) * 8.6]); add(K.box(2.1, 0.1, 0.08), '#ffffff', [Math.sin(fa2 + 0.12) * 8.6, 0.65, Math.cos(fa2 + 0.12) * 8.6], [0, fa2 + Math.PI / 2, 0]); }
      K.reset();
      W.fountain = wp(-3, 3); W.col.push({ x: W.fountain.x, z: W.fountain.z, r: 5 });
      tables.forEach(function (p) { var q = wp(p[0], p[1]); W.col.push({ x: q.x, z: q.z, r: 1.6 }); });
      W.parkTables = [wp(2.6, -2.2), wp(4.4, 2.6)]; W.parkRot = ro;
      hitBox(14, 3, 14, L.x, 1.5, L.z, { type: 'loc', id: L.id }); sign(L, 5, 1);
    })(Lb.park);
    // home: cottage with a garden
    (function (L) {
      face(L);
      add(K.box(6.4, 4, 5.2), '#ffe2b8', [0, 2, 0]);
      add(K.box(6.8, 0.3, 5.6), '#d9b38c', [0, 0.15, 0]);
      add(K.box(7.4, 0.3, 3.8), '#c0392b', [0, 5, -1.25], [0.62, 0, 0]); add(K.box(7.4, 0.3, 3.8), '#c0392b', [0, 5, 1.25], [-0.62, 0, 0]);
      var gab = new T.CylinderGeometry(1, 1, 1, 3); gab.rotateZ(Math.PI / 2); add(gab, '#ffe2b8', [0, 4.65, 0], null, [6.2, 1.25, 2.1]);
      add(K.box(0.9, 2.2, 0.9), '#8d6e63', [1.8, 5.8, -0.9]);
      win(-1.8, 2.3, 2.62, 1.1, 1.1); win(1.8, 2.3, 2.62, 1.1, 1.1);
      add(K.box(1.3, 0.3, 0.3), '#8d6e63', [-1.8, 1.55, 2.75]); add(K.box(1.3, 0.3, 0.3), '#8d6e63', [1.8, 1.55, 2.75]);
      for (var wf = 0; wf < 4; wf++) { add(K.sph(0.12, 6), ['#ff4f8b', '#ffd23f'][wf % 2], [-2.2 + wf * 0.3, 1.78, 2.75]); add(K.sph(0.12, 6), ['#8e6cf0', '#ffffff'][wf % 2], [1.4 + wf * 0.3, 1.78, 2.75]); }
      doorAt(2.62, 1.3, 2.2, '#3f6fd8');
      add(K.cyl(0.07, 0.07, 1.1, 6), '#555555', [2.6, 0.55, 4]); add(K.box(0.5, 0.4, 0.7), '#3f6fd8', [2.6, 1.25, 4]);
      for (var gf = -4; gf <= 4; gf++) if (Math.abs(gf) > 1) add(K.box(0.12, 0.7, 0.12), '#ffffff', [gf * 0.95, 0.35, 4.6]);
      add(K.box(2.8, 0.08, 0.06), '#ffffff', [-2.85, 0.55, 4.6]); add(K.box(2.8, 0.08, 0.06), '#ffffff', [2.85, 0.55, 4.6]);
      K.reset(); W.col.push({ x: L.x, z: L.z, r: L.r }); hitAt(L, 7, 8, 6); sign(L, 8, 1);
      var a = Math.atan2(L.door[0] - L.x, L.door[1] - L.z); W.chimney = { x: L.x + Math.cos(a) * 1.8 - Math.sin(a) * 0.9, z: L.z - Math.sin(a) * 1.8 - Math.cos(a) * 0.9, y: 7 };
    })(Lb.home);
    // market stalls on the plaza: the Style Shop and a fruit stall
    function stall(x, z, c1, c2) {
      K.at(x, z, Math.atan2(-x, -z));
      add(K.box(3.2, 1, 1.2), '#a0522d', [0, 0.5, 0.4]); add(K.box(3.4, 0.12, 1.4), '#d2a679', [0, 1.05, 0.4]);
      for (var p2 = -1; p2 <= 1; p2 += 2) { add(K.box(0.12, 2.8, 0.12), '#5b3a29', [p2 * 1.6, 1.4, 1]); add(K.box(0.12, 2.8, 0.12), '#5b3a29', [p2 * 1.6, 1.4, -0.6]); }
      for (var s4 = 0; s4 < 6; s4++) add(K.box(0.62, 0.12, 2.4), s4 % 2 ? c1 : c2, [-1.55 + s4 * 0.62, 2.9, 0.2], [0.25, 0, 0]);
      K.reset(); W.col.push({ x: x, z: z, r: 1.9 });
    }
    stall(12.5, -12.5, '#ff4f8b', '#ffffff'); stall(-12.5, -12.5, '#3ddc97', '#ffffff');
    K.at(12.5, -12.5, Math.atan2(-12.5, 12.5)); ['#4cc9f0', '#ffd23f', '#8e6cf0', '#ff8c42'].forEach(function (c, k) { add(K.box(0.42, 0.5, 0.08), c, [-1 + k * 0.62, 1.5, 0.1]); }); K.reset();
    K.at(-12.5, -12.5, Math.atan2(12.5, 12.5)); [0, 1, 2, 3, 4].forEach(function (k) { add(K.sph(0.2, 8), ['#e74c3c', '#ffd23f', '#3ddc97', '#ff8c42', '#e74c3c'][k], [-1 + k * 0.5, 1.3, 0.3]); }); K.reset();
    var styleSign = label('Style Shop', 'Change your look', '#ff4f8b', 0.75); styleSign.position.set(12.5, 4.2, -12.5); sc.add(styleSign);

    // trees, bushes and rocks wherever there is room
    function free(x, z, m) {
      if (Math.hypot(x, z) < 12.5 || Math.hypot(x, z) > 59) return false;
      for (var k = 0; k < W.col.length; k++) if (Math.hypot(x - W.col[k].x, z - W.col[k].z) < W.col[k].r + m) return false;
      for (var q = 0; q < CAREER_LOCS.length; q++) { var L = CAREER_LOCS[q], a = Math.atan2(L.door[0], L.door[1]), d = x * Math.sin(a) + z * Math.cos(a), off = Math.abs(x * Math.cos(a) - z * Math.sin(a)); if (d > 0 && d < Math.hypot(L.door[0], L.door[1]) + 3 && off < 3.6) return false; }
      return true;
    }
    W.free = free;
    W.rivalSpot = function (k) { var AL = Lb.arena, a = Math.atan2(AL.door[0] - AL.x, AL.door[1] - AL.z) + 0.55 + k * 0.3; return { x: AL.x + Math.sin(a) * 12, z: AL.z + Math.cos(a) * 12, a: a }; };
    BOSSES.forEach(function (b, k) { var rs = W.rivalSpot(k); W.col.push({ x: rs.x, z: rs.z, r: 1.1 }); });
    [[3.6, -17.4, 0.6], [4.6, 9.4, 0.6], [10.6, -10.6, 0.6]].forEach(function (p) { W.col.push({ x: p[0], z: p[1], r: p[2] }); });
    var leafC = ['#3f9b47', '#58b15a', '#2f8a3c', '#6cbf4a'];
    for (var n = 0; n < 140; n++) {
      var a3 = rnd() * Math.PI * 2, d3 = 13 + rnd() * 46, tx = Math.sin(a3) * d3, tz = Math.cos(a3) * d3, kind = rnd();
      if (!free(tx, tz, kind < 0.6 ? 1.8 : 0.9)) continue;
      var sz = 0.8 + rnd() * 0.6;
      if (kind < 0.35) { add(K.cyl(0.2 * sz, 0.3 * sz, 1.8 * sz, 7), '#7a5230', [tx, 0.9 * sz, tz]); add(K.ico(1.5 * sz, 0), leafC[n % 4], [tx, 2.6 * sz, tz], [rnd(), rnd(), 0], [1, 1.1, 1]); add(K.ico(1.1 * sz, 0), leafC[(n + 1) % 4], [tx + 0.5 * sz, 3.3 * sz, tz - 0.3 * sz], [rnd(), 0, rnd()]); W.col.push({ x: tx, z: tz, r: 0.6 }); }
      else if (kind < 0.6) { add(K.cyl(0.18 * sz, 0.26 * sz, 1.2 * sz, 7), '#6b4426', [tx, 0.6 * sz, tz]); add(K.cone(1.5 * sz, 2.4 * sz, 7), '#2e7d4f', [tx, 2.2 * sz, tz]); add(K.cone(1.1 * sz, 2 * sz, 7), '#35905a', [tx, 3.3 * sz, tz]); W.col.push({ x: tx, z: tz, r: 0.6 }); }
      else if (kind < 0.85) { add(K.ico(0.7 * sz, 0), leafC[n % 4], [tx, 0.45 * sz, tz], [0, rnd() * 3, 0], [1.2, 0.75, 1]); if (rnd() < 0.6) add(K.sph(0.12, 6), ['#ff4f8b', '#ffd23f', '#ffffff'][n % 3], [tx + 0.3, 0.85 * sz, tz + 0.2]); }
      else add(K.ico(0.6 * sz, 0), '#a7a29a', [tx, 0.25 * sz, tz], [rnd() * 3, rnd() * 3, 0], [1.3, 0.7, 1]);
    }
    // merge all scenery: three meshes in total
    var mats = { flat: new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }), smooth: new T.MeshLambertMaterial({ vertexColors: true }), glow: new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }) };
    Object.keys(K.parts).forEach(function (k) { if (!K.parts[k].length) return; var m = new T.Mesh(mergeParts(K.parts[k]), mats[k]); m.castShadow = k !== 'glow'; m.receiveShadow = k !== 'glow'; sc.add(m); });

    // ---- clouds (each one merged)
    W.clouds = [];
    for (var c = 0; c < 10; c++) { var C2 = Kit(); for (var b3 = 0; b3 < 5; b3++) C2.add(C2.sph(1.6 + rnd() * 1.4, 10), '#ffffff', [b3 * 1.7 - 3.4, rnd() * 0.8, rnd() * 1.2], null, [1, 0.75, 1], 'smooth');
      var cm = new T.Mesh(mergeParts(C2.parts.smooth), new T.MeshLambertMaterial({ vertexColors: true, emissive: lin('#c9d9ec'), emissiveIntensity: 0.35 })); cm.position.set(-90 + rnd() * 180, 26 + rnd() * 12, -90 + rnd() * 180); sc.add(cm); W.clouds.push(cm); }
    // ---- moving bits: the tower gem, arena flags, fountain water, chimney smoke, birds, butterflies
    W.towerGem = new T.Mesh(new T.OctahedronGeometry(0.9), new T.MeshLambertMaterial({ color: lin('#ffd23f'), emissive: lin('#ffb000'), emissiveIntensity: 0.7 }));
    W.towerGem.position.set(Lb.tower.x, 19, Lb.tower.z); sc.add(W.towerGem);
    W.flags = [];
    var flagG = new T.BoxGeometry(1.3, 0.75, 0.04); flagG.translate(0.65, 0, 0);
    for (var fk = 0; fk < 6; fk++) { var fa3 = fk / 6 * Math.PI * 2 + 0.5, fx = Lb.arena.x + Math.sin(fa3) * 7.8, fz = Lb.arena.z + Math.cos(fa3) * 7.8;
      var pole = new T.Mesh(K.cyl(0.07, 0.07, 3, 5), new T.MeshLambertMaterial({ color: lin('#333333') })); pole.position.set(fx, 6.1, fz); sc.add(pole);
      var fg = new T.Mesh(flagG, new T.MeshLambertMaterial({ color: lin(flagC[fk]) })); fg.position.set(fx, 7.2, fz); sc.add(fg); W.flags.push(fg); }
    W.puffs = [];
    for (var pf = 0; pf < 6; pf++) { var pu = new T.Mesh(K.sph(0.45, 8), new T.MeshLambertMaterial({ color: lin('#eeeeee'), transparent: true, opacity: 0.7, depthWrite: false })); pu.userData.t = pf / 6; sc.add(pu); W.puffs.push(pu); }
    W.drops = [];
    var dropM = new T.MeshBasicMaterial({ color: lin('#bfe9ff'), transparent: true, opacity: 0.85 });
    for (var dp = 0; dp < 14; dp++) { var dr = new T.Mesh(K.sph(0.09, 6), dropM); dr.userData.t = dp / 14; dr.userData.a = dp * 2.4; sc.add(dr); W.drops.push(dr); }
    W.birds = [];
    var birdM = new T.MeshLambertMaterial({ color: lin('#ffffff'), side: T.DoubleSide }), wg = new T.BufferGeometry();
    wg.setAttribute('position', new T.BufferAttribute(new Float32Array([0, 0, 0.3, 0, 0, -0.3, 1.1, 0, 0]), 3)); wg.computeVertexNormals();
    for (var bd = 0; bd < 6; bd++) { var bg = new T.Group(), wl = new T.Mesh(wg, birdM), wr = new T.Mesh(wg, birdM); wr.scale.x = -1; bg.add(wl); bg.add(wr); bg.userData = { a: bd, r: 18 + bd * 5, h: 18 + bd * 1.5, s: 0.25 + bd * 0.03, wl: wl, wr: wr }; sc.add(bg); W.birds.push(bg); }
    W.flies = [];
    var flyM = ['#ffd23f', '#ff4f8b', '#4cc9f0'].map(function (c) { return new T.MeshBasicMaterial({ color: lin(c), side: T.DoubleSide }); }), wgm = new T.PlaneGeometry(0.22, 0.16); wgm.translate(0.11, 0, 0);
    for (var bf = 0; bf < 8; bf++) { var fgp = new T.Group(), w1 = new T.Mesh(wgm, flyM[bf % 3]), w2 = new T.Mesh(wgm, flyM[bf % 3]); w2.scale.x = -1; fgp.add(w1); fgp.add(w2);
      var ang2 = bf / 8 * Math.PI * 2 + 0.2; fgp.userData = { cx: Math.sin(ang2) * 11.4, cz: Math.cos(ang2) * 11.4, a: bf, w1: w1, w2: w2 }; sc.add(fgp); W.flies.push(fgp); }

    // ---- people
    var vcM = new T.MeshLambertMaterial({ vertexColors: true }), blobG = new T.CircleGeometry(0.5, 16), blobM = new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18, depthWrite: false });
    function person(L, o) {
      o = o || {}; var P = personParts(L, o.lod), g = new T.Group(), body = new T.Group(); g.add(body);
      function m(geo, parent) { var e = new T.Mesh(geo, vcM); e.castShadow = true; (parent || body).add(e); return e; }
      var lL = new T.Group(), lR = new T.Group(), aL = new T.Group(), aR = new T.Group(), hd = new T.Group();
      lL.position.set(-0.13, 0.86, 0); lR.position.set(0.13, 0.86, 0); aL.position.set(-0.36, 1.46, 0); aR.position.set(0.36, 1.46, 0); hd.position.set(0, 1.86, 0);
      [lL, lR, aL, aR, hd].forEach(function (x) { body.add(x); });
      m(P.leg, lL); m(P.leg, lR); m(P.arm, aL); m(P.arm, aR); m(P.torso); m(P.head, hd);
      var blob = new T.Mesh(blobG, blobM); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; g.add(blob);
      (o.parent || sc).add(g);
      return { g: g, body: body, lL: lL, lR: lR, aL: aL, aR: aR, hd: hd, ph: Math.random() * 6, speed: 0, look: L, act: null, parts: P };
    }
    function animate(p, dt) {
      p.ph += dt * (3 + p.speed * 1.8);
      var k = Math.min(1, p.speed / 4), s = Math.sin(p.ph) * 0.8 * k, t = W.t + p.g.id;
      p.lL.rotation.x = s; p.lR.rotation.x = -s; p.aL.rotation.x = -s * 0.9; p.aR.rotation.x = s * 0.9; p.aL.rotation.z = 0.08; p.aR.rotation.z = -0.08;
      p.body.position.y = (p.lift || 0) + Math.abs(Math.sin(p.ph)) * 0.08 * k + (k < 0.1 ? Math.sin(t * 2) * 0.012 : 0);
      p.body.rotation.x = k * 0.08; p.hd.rotation.y = k < 0.1 ? Math.sin(t * 0.5) * 0.35 : 0; p.hd.rotation.x = 0;
      if (p.act === 'wave') { p.aR.rotation.x = -2.7 + Math.sin(W.t * 9) * 0.3; p.aR.rotation.z = -0.3; }
      if (p.act === 'cheer') { var j = Math.abs(Math.sin(W.t * 7 + p.ph * 0.1)); p.body.position.y = (p.lift || 0) + j * 0.35; p.aL.rotation.x = p.aR.rotation.x = -2.9; p.aL.rotation.z = 0.4; p.aR.rotation.z = -0.4; }
      if (p.act === 'talk') { p.hd.rotation.x = Math.sin(W.t * 6) * 0.06; p.hd.rotation.y = 0; p.aR.rotation.x = -0.6 + Math.sin(W.t * 3) * 0.25; }
      if (p.act === 'sad') { p.hd.rotation.x = 0.45; p.hd.rotation.y = 0; p.aL.rotation.x = p.aR.rotation.x = 0.15; p.body.rotation.x = 0.12; }
      if (p.act === 'sit') { p.lL.rotation.x = p.lR.rotation.x = -1.5; p.body.position.y = (p.lift || 0) - 0.35; p.aL.rotation.x = p.aR.rotation.x = -0.9; p.hd.rotation.x = 0.35 + Math.sin(t) * 0.05; }
      if (p.act === 'cheerSit') { p.lL.rotation.x = p.lR.rotation.x = -1.5; p.body.position.y = (p.lift || 0) - 0.35 + Math.abs(Math.sin(W.t * 7 + p.ph)) * 0.25; p.aL.rotation.x = p.aR.rotation.x = -2.9; }
    }
    W.person = person; W.animate = animate; W.label = label;
    W.P = person(myLook()); W.P.g.position.set(0, 0, 12.5);
    function npc(id, name, sub, color, L, x, z, ry) {
      var p = person(L); p.g.position.set(x, 0, z); p.g.rotation.y = ry; p.home = ry; p.id = id; p.name = name; p.color = color;
      var lb = label(name, sub, color, 0.6); lb.position.y = 3.05; p.g.add(lb); p.lbl = lb;
      hitBox(2.2, 3.2, 2.2, 0, 1.5, 0, { type: 'npc', id: id }, p.g); W.npcs.push(p); return p;
    }
    npc('leo', 'Coach Leo', 'Your coach', '#c4ff3d', { skin: '#e0ac69', hair: 'short', hairC: '#b0b6bb', shirt: '#8b1e3f', pants: '#2b2b3a', beard: true, glasses: true, coat: '#6d1530', tie: '#ffd23f' }, 3.6, -17.4, 0.4);
    npc('gia', 'Gia', 'Plaza games', '#4cc9f0', { skin: '#c68642', hair: 'bun', hairC: '#111111', shirt: '#4cc9f0', pants: '#2d3142', hat: 'headband' }, 4.6, 9.4, -0.6);
    npc('tia', 'Tia', 'Style Shop', '#ff4f8b', { skin: '#ffdbac', hair: 'long', hairC: '#d35400', shirt: '#ff4f8b', pants: '#6d4c41' }, 10.6, -10.6, Math.atan2(-10.6, 10.6));
    var bossLook = [{ hair: 'spiky', hairC: '#1b1a22', hat: 'headband' }, { hair: 'long', hairC: '#111111', hat: 'bandana' }, { hair: 'short', hairC: '#111111', hat: 'wizard' }, { hair: 'bun', hairC: '#7f8c8d', hat: 'tophat', glasses: true }, { hair: 'short', hairC: '#ecf0f1', hat: 'crown', beard: true }];
    var platG = K.cyl(0.8, 0.9, 0.3, 18);
    BOSSES.forEach(function (b, k) {
      var rs = W.rivalSpot(k), bl = Object.assign({ skin: LOOK.skin[(k * 2 + 1) % 6], shirt: b.color, pants: '#1b1a22' }, bossLook[k] || {});
      var p = npc('boss-' + b.id, b.name, STAGES[b.stage].name, b.color, bl, rs.x, rs.z, rs.a + Math.PI);
      p.boss = b; p.lift = 0.3;
      var pl = new T.Mesh(platG, new T.MeshLambertMaterial({ color: lin(b.color) })); pl.position.y = 0.15; pl.receiveShadow = true; p.g.add(pl); p.plat = pl;
    });
    // townsfolk walking between the buildings, and four players at the park tables
    var spots = CAREER_LOCS.map(function (L) { return [L.door[0] * 0.82, L.door[1] * 0.82]; }).concat([[0, 11], [11, 0], [-11, 0], [0, -11], [8, 8], [-8, -8]]);
    W.spots = spots;
    ['#4cc9f0', '#ff8c42', '#f78fb3', '#a29bfe', '#55efc4', '#fdcb6e', '#e17055'].forEach(function (c, k) {
      var L = { skin: LOOK.skin[k % 6], hair: LOOK.hair[k % 5], hairC: LOOK.hairC[(k * 3) % 8], shirt: c, pants: LOOK.pants[k % 6], hat: k === 2 ? 'cap' : k === 5 ? 'beanie' : 'none' };
      var p = person(L, { lod: 1 }), s = spots[k % spots.length]; p.g.position.set(s[0] + 1, 0, s[1] + 1); p.goal = spots[(k + 3) % spots.length]; p.wait = k * 0.7; p.tipAt = 0; W.walkers.push(p);
    });
    W.parkTables.forEach(function (tb, k) {
      var c = Math.cos(W.parkRot), s = Math.sin(W.parkRot);
      for (var sd = -1; sd <= 1; sd += 2) { var ox = sd * 1.3 * c, oz = -sd * 1.3 * s;
        var p = person({ skin: LOOK.skin[(k * 2 + sd + 3) % 6], hair: LOOK.hair[(k + 2 + sd + 1) % 5], hairC: LOOK.hairC[(k + 4) % 8], shirt: ['#3ddc97', '#ff8c42', '#8e6cf0', '#ffd23f'][k * 2 + (sd + 1) / 2], pants: '#2d3436' }, { lod: 1 });
        p.g.position.set(tb.x + ox, 0.08, tb.z + oz); p.g.rotation.y = Math.atan2(-ox, -oz); p.act = 'sit'; W.anim.push(p); }
    });
    // ---- arena crowd on the tiers (they jump up during fights)
    W.crowd = []; var AL = Lb.arena, gateA = Math.atan2(AL.door[0] - AL.x, AL.door[1] - AL.z);
    for (var cr2 = 0; cr2 < 16; cr2++) { var tier = cr2 % 2, ca2 = gateA + 0.75 + (Math.floor(cr2 / 2) + tier * 0.5) / 8 * (Math.PI * 2 - 1.5), rr = 5.95 + tier * 0.75;
      var cp = person({ skin: LOOK.skin[cr2 % 6], hair: LOOK.hair[cr2 % 5], hairC: LOOK.hairC[cr2 % 8], shirt: flagC[cr2 % 6], pants: '#2d3436' }, { lod: 1 });
      cp.g.position.set(AL.x + Math.sin(ca2) * rr, 0.72 + tier * 0.6, AL.z + Math.cos(ca2) * rr); cp.g.rotation.y = ca2 + Math.PI; cp.g.scale.setScalar(0.92); cp.act = 'sit'; W.crowd.push(cp); }
    // ---- guidance: tap ring, quest star and beam, golden trail
    W.ring = new T.Mesh(new T.RingGeometry(0.35, 0.55, 24), new T.MeshBasicMaterial({ color: '#c4ff3d', transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); W.ring.rotation.x = -Math.PI / 2; W.ring.position.y = 0.25; sc.add(W.ring);
    W.star = new T.Mesh(new T.OctahedronGeometry(0.55), new T.MeshLambertMaterial({ color: lin('#ffd23f'), emissive: lin('#ffb000'), emissiveIntensity: 0.8 })); sc.add(W.star);
    W.beam = new T.Mesh(new T.CylinderGeometry(0.45, 0.9, 40, 16, 1, true), new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.14, depthWrite: false, side: T.DoubleSide, toneMapped: false })); sc.add(W.beam);
    var chev = new T.Shape(); chev.moveTo(-0.34, -0.2); chev.lineTo(0, 0.2); chev.lineTo(0.34, -0.2); chev.lineTo(0.2, -0.2); chev.lineTo(0, 0.02); chev.lineTo(-0.2, -0.2); chev.lineTo(-0.34, -0.2);
    W.trail = new T.InstancedMesh(new T.ShapeGeometry(chev), new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }), 40); W.trail.frustumCulled = false; W.trail.count = 0; sc.add(W.trail);
    W.dummy = new T.Object3D();
    // ---- mini-game pieces: the giant knight, stars and move dots
    var ivory = new T.MeshLambertMaterial({ color: lin('#f6efe0') });
    W.knight = new T.Group(); var kb = new T.Mesh(new T.LatheGeometry(PAWN.slice(0, 5).map(function (p) { return new T.Vector2(p[0] * 1.3, p[1] * 1.3); }), 20), ivory);
    var kh = new T.Mesh(knightShape(), ivory); kh.scale.set(0.55, 0.55, 0.6); kh.position.y = 0.45; kh.rotation.y = -Math.PI / 2;
    kb.castShadow = kh.castShadow = true; W.knight.add(kb); W.knight.add(kh); W.knight.scale.setScalar(1.45); W.knight.visible = false; sc.add(W.knight);
    W.mgStars = []; for (var ms = 0; ms < 4; ms++) { var sm = new T.Mesh(new T.OctahedronGeometry(0.6), W.star.material); sm.visible = false; sc.add(sm); W.mgStars.push(sm); }
    W.dots = new T.InstancedMesh(new T.RingGeometry(0.32, 0.55, 24), new T.MeshBasicMaterial({ color: '#c4ff3d', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }), 8); W.dots.frustumCulled = false; W.dots.count = 0; sc.add(W.dots);
    W.tileGlow = new T.Mesh(new T.PlaneGeometry(1.5, 1.5), new T.MeshBasicMaterial({ color: '#c4ff3d', transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); W.tileGlow.rotation.x = -Math.PI / 2; W.tileGlow.position.y = 0.24; sc.add(W.tileGlow);
    // board coordinates painted around the frame
    (function () {
      var c = document.createElement('canvas'); c.width = c.height = 1024; var x = c.getContext('2d'); x.fillStyle = '#fff6dc'; x.font = '800 40px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      var cell = 1024 * 1.6 / 14.4, edge = (1024 - cell * 8) / 2;
      for (var i = 0; i < 8; i++) { x.fillText('abcdefgh'[i], edge + cell * (i + 0.5), 1024 - edge / 2); x.fillText(String(8 - i), edge / 2, edge + cell * (i + 0.5)); }
      var tx3 = new T.CanvasTexture(c); tx3.encoding = T.sRGBEncoding; tx3.anisotropy = 4;
      var pl2 = new T.Mesh(new T.PlaneGeometry(14.4, 14.4), new T.MeshBasicMaterial({ map: tx3, transparent: true, depthWrite: false, toneMapped: false })); pl2.rotation.x = -Math.PI / 2; pl2.position.set(0, 0.23, 0); sc.add(pl2);
    })();
    // ---- confetti for wins and pickups
    var cg2 = new T.BufferGeometry(), cpos = new Float32Array(150 * 3), ccol = new Float32Array(150 * 3);
    for (var ci = 0; ci < 150; ci++) { var cc = lin(flagC[ci % 6]); ccol[ci * 3] = cc.r; ccol[ci * 3 + 1] = cc.g; ccol[ci * 3 + 2] = cc.b; cpos[ci * 3 + 1] = -50; }
    cg2.setAttribute('position', new T.BufferAttribute(cpos, 3)); cg2.setAttribute('color', new T.BufferAttribute(ccol, 3));
    W.confetti = new T.Points(cg2, new T.PointsMaterial({ size: 0.28, vertexColors: true })); W.confetti.visible = false; W.confetti.frustumCulled = false; sc.add(W.confetti); W.confV = [];
    // spotlights for the arena scenes
    W.spots3 = [];
    for (var sp2 = 0; sp2 < 3; sp2++) { var cn = new T.Mesh(new T.CylinderGeometry(0.15, 1.5, 12, 18, 1, true), new T.MeshBasicMaterial({ color: ['#ffffff', '#ffd23f', '#4cc9f0'][sp2], transparent: true, opacity: 0.07, depthWrite: false, side: T.DoubleSide, toneMapped: false })); cn.visible = false; sc.add(cn); W.spots3.push(cn); }
    W.ray = new T.Raycaster(); W.v2 = new T.Vector2(); W.v3 = new T.Vector3();
    W.Lb = Lb;
    return W;

    function label(text, sub, color, scale) {
      var c = document.createElement('canvas'), x = c.getContext('2d'); c.width = 512; c.height = sub ? 168 : 112;
      x.font = '800 54px system-ui, sans-serif'; var w1 = x.measureText(text).width; x.font = '600 34px system-ui, sans-serif'; var w2 = sub ? x.measureText(sub).width : 0;
      var w = Math.min(500, Math.max(w1, w2) + 60), rx = (512 - w) / 2, rh = c.height - 12;
      x.fillStyle = 'rgba(14,18,38,.84)'; x.beginPath(); x.moveTo(rx + 30, 6); x.arcTo(rx + w, 6, rx + w, 6 + rh, 30); x.arcTo(rx + w, 6 + rh, rx, 6 + rh, 30); x.arcTo(rx, 6 + rh, rx, 6, 30); x.arcTo(rx, 6, rx + w, 6, 30); x.fill();
      x.strokeStyle = color || '#c4ff3d'; x.lineWidth = 6; x.stroke();
      x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 54px system-ui, sans-serif'; x.fillText(text, 256, sub ? 62 : 58);
      if (sub) { x.font = '600 34px system-ui, sans-serif'; x.fillStyle = color || '#c4ff3d'; x.fillText(sub, 256, 124); }
      var tx = new T.CanvasTexture(c); tx.encoding = T.sRGBEncoding;
      var s = new T.Sprite(new T.SpriteMaterial({ map: tx, depthWrite: false, transparent: true, toneMapped: false }));
      var k = scale || 1; s.scale.set(5.2 * k, 5.2 * k * c.height / 512, 1); s.renderOrder = 5; return s;
    }
  }
  function careerRebuildPlayer() {
    var P = CW.P, pos = P.g.position.clone(), ry = P.g.rotation.y; CW.sc.remove(P.g);
    Object.keys(P.parts).forEach(function (k) { P.parts[k].dispose(); });
    CW.P = CW.person(myLook()); CW.P.g.position.copy(pos); CW.P.g.rotation.y = ry;
  }

  // daily golden pawns: five spots chosen by the date
  function careerPawns(W) {
    var T = THREE, day = dayKey(), st = S.careerSt; if (!st.pawns || st.pawns.day !== day) st.pawns = { day: day, got: [] };
    W.pawns.forEach(function (p) { if (p.m) W.sc.remove(p.m); }); W.pawns = [];
    var h = 0; for (var i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) % 100003;
    var g = W.pawnG || (W.pawnG = new T.LatheGeometry(W.PAWN.map(function (p) { return new T.Vector2(p[0] * 0.5, p[1] * 0.5); }), 16)), m = W.pawnM || (W.pawnM = new T.MeshLambertMaterial({ color: lin('#ffd23f'), emissive: lin('#c98a00'), emissiveIntensity: 0.6 }));
    for (var tries = 0; W.pawns.length < 5 && tries < 500; tries++) {
      h = (h * 16807 + 7) % 2147483647; var a = (h % 6283) / 1000; h = (h * 16807 + 7) % 2147483647; var d = 13 + (h % 4200) / 100;
      var x = Math.sin(a) * d, z = Math.cos(a) * d; if (!W.free(x, z, 1.2)) continue;
      var idx = W.pawns.length; if (st.pawns.got.indexOf(idx) >= 0) { W.pawns.push({ x: x, z: z, got: true }); continue; }
      var o = new T.Mesh(g, m); o.position.set(x, 0.5, z); o.castShadow = true; W.sc.add(o); W.pawns.push({ x: x, z: z, m: o });
    }
  }

  function careerHud(host) {
    host.insertAdjacentHTML('beforeend',
      '<div class="w-top"><div class="w-quest" id="w-quest"><span class="w-ch" id="w-ch"></span><div class="w-qrow"><i class="w-arrow" id="w-arrow" aria-hidden="true">➤</i><b id="w-qt"></b></div><div class="w-qrow2"><span class="w-qp" id="w-qp"></span><button class="w-go" data-wact="go" id="w-go">Go ▶</button></div></div>' +
      '<div class="w-side"><div class="w-btns"><span class="w-pawns" id="w-pawns" title="Golden pawns found today"></span><button class="w-btn" data-wact="look" aria-label="Change your look">👕</button><button class="w-btn" data-wact="list" aria-label="List view">☰</button></div><canvas class="w-map" id="w-map" width="200" height="200" aria-label="Town map"></canvas></div></div>' +
      '<div class="w-ptr" id="w-ptr" hidden><b id="w-ptr-t"></b><span>▼</span></div><div class="w-edge" id="w-edge" hidden>➤</div>' +
      '<div class="w-bubs" id="w-bubs"></div><div class="w-tut" id="w-tut" hidden></div>' +
      '<div class="w-card" id="w-card" hidden></div><div class="w-dlg" id="w-dlg" hidden></div><div class="w-note" id="w-note" hidden></div>' +
      '<div class="w-mg" id="w-mg" hidden></div><div class="w-ward" id="w-ward" hidden></div>' +
      '<div class="w-cine" id="w-cine" hidden><i class="w-bar t"></i><i class="w-bar b"></i><div class="w-title" id="w-title"></div><button class="w-skip" data-wact="skip">Skip ▸▸</button></div>' +
      '<div class="w-vs" id="w-vs" hidden></div><div class="w-fade" id="w-fade"></div>');
  }
  function careerLayout() {
    if (!CW) return;
    var top = $('.top').getBoundingClientRect().bottom, rail = $('.rail').getBoundingClientRect(), mob = document.body.classList.contains('mob');
    var box = CW.host.style; box.top = top + 'px'; box.left = (mob ? 0 : rail.right) + 'px'; box.right = '0'; box.bottom = (mob ? Math.max(0, innerHeight - rail.top) : 0) + 'px';
    var w = CW.host.clientWidth, h = CW.host.clientHeight; if (!w || !h) return;
    CW.r.setSize(w, h, false); CW.r.domElement.style.width = w + 'px'; CW.r.domElement.style.height = h + 'px';
    CW.cam.aspect = w / h; CW.cam.fov = w / h < 0.8 ? 60 : 48; CW.cam.updateProjectionMatrix(); CW.W = w; CW.H = h;
  }
  function careerNote(t, ms) { var n = $('#w-note'); if (!n) return; n.textContent = t; n.hidden = false; var q = $('#w-quest').getBoundingClientRect(), hb = CW.host.getBoundingClientRect(); n.style.top = Math.round((q.height ? q.bottom : hb.top + 60) - hb.top + 8) + 'px'; clearTimeout(careerNote._t); careerNote._t = setTimeout(function () { n.hidden = true; }, ms || 3200); }
  function careerTut(t) { var n = $('#w-tut'); if (!n) return; if (!t) { n.hidden = true; return; } n.innerHTML = '<span class="w-tut-n">TIP</span><span>' + t + '</span>'; n.hidden = false; }
  function careerBubble(p, text, ms) {
    CW.bub = CW.bub.filter(function (x) { if (x.p === p) { x.el.remove(); return false; } return true; });
    var el = document.createElement('div'); el.className = 'w-bub'; el.textContent = text; $('#w-bubs').appendChild(el);
    CW.bub.push({ p: p, el: el, until: CW.t + (ms || 3500) / 1000 });
  }

  // where a person in the world is on screen (for the guiding hand)
  function careerScreenPt(n, y) {
    return function () {
      if (!CW || !CW.on || CW.cine || CW.ward || CW.talking || CW.mg || current !== MODES.career) return null;
      var v = CW.v3.set(n.g.position.x, (n.lift || 0) + y, n.g.position.z).project(CW.cam); if (v.z > 1 || v.x < -1 || v.x > 1 || v.y < -1 || v.y > 1) return null;
      var hb = CW.host.getBoundingClientRect(); return { x: hb.left + (v.x + 1) / 2 * CW.W, y: hb.top + (1 - v.y) / 2 * CW.H };
    };
  }
  function careerTarget(id) {
    if (!id) return null;
    var n = CW.npcs.filter(function (x) { return x.id === id; })[0]; if (n) return { x: n.g.position.x, z: n.g.position.z, y: 3.9 + (n.lift || 0), name: n.name, npc: n };
    var L = CAREER_LOCS.filter(function (l) { return l.id === id; })[0]; return L ? { x: L.door[0], z: L.door[1], y: 3.4, name: L.name, loc: L } : null;
  }
  function careerRefresh() {
    var q = careerQuest(), ch = careerChapter(); CW.q = q;
    $('#w-ch').textContent = ch < STAGES.length ? 'Chapter ' + (ch + 1) + ' · ' + STAGES[ch].name : 'Ascent Town · cleared';
    $('#w-qt').textContent = q.t; $('#w-qp').textContent = S.careerSt.met ? careerProgress() : 'Your first step';
    var tg = careerTarget(q.target); CW.tg = tg; $('#w-arrow').style.visibility = tg ? 'visible' : 'hidden'; $('#w-go').hidden = !tg;
    var pw = S.careerSt.pawns; $('#w-pawns').textContent = '♟ ' + (pw ? pw.got.length : 0) + '/5';
    CW.npcs.forEach(function (n) {
      if (CW.talking !== n.id) n.act = q.target === n.id ? 'wave' : null;
      if (n.boss) { var open = bossOpen(n.boss.stage) || S.bosses[n.boss.id]; n.lbl.material.opacity = open ? 1 : 0.5; }
    });
    var C = S.careerSt; // first-visit tips
    if (!C.met && !CW.cine && !CW.ward && !CW.talking) Guide.show(careerScreenPt(CW.npcs[0], 1.1), 'Tap Coach Leo', { ms: 60000 });
    if (!C.met) careerTut(null);
    else if (!C.tut1) careerTut('Follow the <b>golden trail</b> to the Academy door, then tap the lesson.');
    else careerTut(null);
  }

  // ---------- talking and entering
  function careerLocCard(L) {
    var acts = [];
    if (L.id === 'academy') { var nl = nextLesson(); if (nl) acts.push(['lesson', '▶ ' + LESSONS[nl].title, nl, 1]); acts.push(['path', 'All lessons']); }
    if (L.id === 'tower') { var dd = dailyRec(dailyNo()); acts.push(['daily', 'Daily puzzle #' + dailyNo() + (dd ? ' ✓' : ''), null, !dd]); acts.push(['puzzles', 'Puzzle ladder', null, !!dd]); if (S.myPz && S.myPz.length) acts.push(['mine', 'My mistakes']); }
    if (L.id === 'library') acts.push(['openings', 'Learn openings', null, 1]);
    if (L.id === 'arena') acts.push(['arena', 'Enter the Arena', null, 1]);
    if (L.id === 'park') { acts.push(['play', 'Play the coach', null, 1]); acts.push(['friend', 'Play a friend']); }
    if (L.id === 'home') { acts.push(['progress', 'My progress', null, 1]); acts.push(['program', '30-Day Ascent']); acts.push(['mychess', 'My chess.com']); }
    if (L.id === 'academy' && !S.careerSt.tut1) setTimeout(function () { Guide.show('#w-card .btn.primary', 'Start your first lesson', { ms: 30000 }); }, 400);
    var c = $('#w-card');
    c.innerHTML = '<div class="w-card-h"><span class="w-ico">' + L.icon + '</span><b>' + esc(L.name) + '</b><span>' + esc(L.sub) + '</span></div><div class="w-card-a">' + acts.map(function (a) { return '<button class="btn ' + (a[3] ? 'primary' : 'ghost') + ' small" data-wact="enter" data-loc="' + L.id + '" data-m="' + a[0] + '"' + (a[2] ? ' data-arg="' + a[2] + '"' : '') + '>' + esc(a[1]) + '</button>'; }).join('') + '</div>';
    c.hidden = false;
  }
  function careerDialog(who, color, text, small, btns, avatar, closeLabel) {
    var d = $('#w-dlg'); clearInterval(careerDialog._i);
    d.innerHTML = '<div class="w-dhead"><span class="w-ava" style="--ac:' + (color || '#c4ff3d') + '">' + (avatar || '♞') + '</span><b class="w-who" style="color:' + (color || '#c4ff3d') + '">' + esc(who) + '</b></div><p class="w-say" id="w-say"></p>' + (small ? '<p class="w-small">' + small + '</p>' : '') + '<div class="w-card-a">' + (btns || '') + '<button class="btn ghost small" data-wact="close">' + (closeLabel || 'Bye') + '</button></div>';
    d.hidden = false; $('#w-card').hidden = true;
    var el = $('#w-say'), i = 0; // typewriter; tap the box to finish
    careerDialog._i = setInterval(function () { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(careerDialog._i); }, 22);
    d.onclick = function (e) { if (!e.target.closest('button')) { clearInterval(careerDialog._i); el.textContent = text; } };
  }
  function careerTalk(n) {
    var q = careerQuest(), btn = '', text, line, small = '';
    careerFace(n); n.act = 'talk'; CW.talking = n.id; CW.goal = null; CW.pend = null; Guide.hide();
    if (n.id === 'leo') {
      if (!S.careerSt.met) { S.careerSt.met = true; S.careerSt.ch = careerChapter(); save(); line = 'welcome'; }
      else line = q.line;
      text = CAREER_TEXT[line];
      if (q.lesson && line === 'lesson_go') { text = 'Next up: ' + LESSONS[q.lesson].title + '. ' + LESSONS[q.lesson].goal + ' Follow the golden trail to my Academy.'; btn = '<button class="btn primary small" data-wact="enter" data-loc="academy" data-m="lesson" data-arg="' + q.lesson + '">Start the lesson</button>'; }
      else if (q.boss) btn = '<button class="btn primary small" data-wact="walk" data-to="boss-' + q.boss.id + '">Walk me to ' + esc(q.boss.name.split(' ')[1] || q.boss.name) + '</button>';
      else if (line === 'welcome') btn = '<button class="btn primary small" data-wact="walk" data-to="academy">Show me the Academy</button>';
      careerDialog('Coach Leo', '#c4ff3d', text, '', btn, '🧔');
      if (line === 'welcome') setTimeout(function () { Guide.show('#w-dlg .btn.primary', 'Tap here', { ms: 25000 }); }, 1800);
      Voice.say([line === 'lesson_go' && q.lesson ? null : WL(line)].filter(Boolean));
      careerRefresh();
    } else if (n.id === 'gia') {
      var R = S.careerSt.mg || {};
      careerDialog('Gia · Plaza games', '#4cc9f0', CAREER_TEXT.gia, 'Best scores: Square Rush ' + (R.rush || 0) + ' · Knight Hop ' + (R.hop || 0),
        '<button class="btn primary small" data-wact="mg" data-k="rush">🏃 Square Rush</button><button class="btn primary small" data-wact="mg" data-k="hop">♞ Knight Hop</button>', '🎲', 'Later');
      Voice.say([WL('gia')]);
    } else if (n.id === 'tia') {
      careerDialog('Tia · Style Shop', '#ff4f8b', CAREER_TEXT.tia, '', '<button class="btn primary small" data-wact="look">👕 Change my look</button>', '✂️');
      Voice.say([WL('tia')]);
    } else {
      var b = n.boss, beat = S.bosses[b.id], open = bossOpen(b.stage), need = bossNeed(b.stage);
      text = beat ? CAREER_TEXT.boss_beaten : open ? CAREER_TEXT['boss_' + b.id] : CAREER_TEXT.boss_locked;
      small = open ? esc(b.intro) : need ? need + ' more lesson' + (need > 1 ? 's' : '') + ' in ' + esc(STAGES[b.stage].name) + ' unlock this fight.' : '';
      if (open) btn = '<button class="btn primary small" data-wact="fight" data-id="' + b.id + '">⚔️ ' + (beat ? 'Rematch' : 'Challenge ' + esc(b.name.split(' ')[1] || b.name)) + '</button>';
      careerDialog(b.name + ' · ' + b.title, b.color, text, small, btn, '⚔️');
      Voice.say([WL(beat ? 'boss_beaten' : open ? 'boss_' + b.id : 'boss_locked')]);
    }
  }
  function careerFace(n) { var p = CW.P.g.position, q = n.g.position; n.g.rotation.y = Math.atan2(p.x - q.x, p.z - q.z); CW.P.g.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); }
  function careerCloseTalk() { $('#w-dlg').hidden = true; clearInterval(careerDialog._i); var n = CW.npcs.filter(function (x) { return x.id === CW.talking; })[0]; CW.talking = null; if (n) { n.act = null; n.g.rotation.y = n.home; } careerRefresh(); }
  // walk around buildings: go to the plaza ring, follow it, then take the right road
  function careerRoute(fx, fz, tx, tz) {
    function blocked(ax, az, bx, bz) { return CW.col.some(function (c) { if (c.r < 1.3) return false; var dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / L2)); return Math.hypot(ax + dx * u - c.x, az + dz * u - c.z) < c.r + 0.6; }); }
    if (!blocked(fx, fz, tx, tz)) return [{ x: tx, z: tz }];
    var R = 9.4, af = Math.atan2(fx, fz), at = Math.atan2(tx, tz), pts = [];
    if (Math.hypot(fx, fz) > R) pts.push({ x: Math.sin(af) * R, z: Math.cos(af) * R });
    var d = Math.atan2(Math.sin(at - af), Math.cos(at - af)), n = Math.ceil(Math.abs(d) / 0.45);
    for (var i = 1; i < n; i++) { var a = af + d * i / n; pts.push({ x: Math.sin(a) * R, z: Math.cos(a) * R }); }
    if (Math.hypot(tx, tz) > R) pts.push({ x: Math.sin(at) * R, z: Math.cos(at) * R });
    pts.push({ x: tx, z: tz }); return pts;
  }
  function careerGo(x, z, auto) { var pts = careerRoute(CW.P.g.position.x, CW.P.g.position.z, x, z); CW.goal = pts.shift(); CW.path = pts; CW.auto = !!auto; }
  function careerWalkTo(id) {
    var t = careerTarget(id); if (!t) return;
    var p = CW.P.g.position, dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz) || 1, stop = t.npc ? 1.9 : 0.2;
    if (CW.talking) careerCloseTalk();
    careerGo(t.x + dx / d * stop, t.z + dz / d * stop, true); CW.pend = id; CW.nearKey = undefined;
  }
  function careerEnter(locId, mode, arg) {
    var L = CAREER_LOCS.filter(function (l) { return l.id === locId; })[0];
    S.careerSt.at = locId; if (locId === 'academy') S.careerSt.tut1 = 1; save();
    CW.pend = null; CW.goal = null; CW.busy = true; $('#w-card').hidden = true; $('#w-dlg').hidden = true;
    if (L) { var a = Math.atan2(L.x - L.door[0], L.z - L.door[1]); CW.goal = { x: L.door[0] + Math.sin(a) * 1.5, z: L.door[1] + Math.cos(a) * 1.5 }; }
    Sound.play('good'); $('#w-fade').classList.add('on');
    setTimeout(function () {
      CW.busy = false;
      if (mode === 'lesson') return go('lesson', arg);
      if (mode === 'path') { S.career = false; return go('path'); }
      go(mode, arg || undefined);
    }, 650);
  }

  // ---------- input
  function careerInput(W) {
    var el = W.r.domElement, down = null;
    el.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, yaw: W.camYaw, h: W.camH, moved: false, id: e.pointerId }; try { el.setPointerCapture(e.pointerId); } catch (x) { } if (Sound.unlock) Sound.unlock(); });
    el.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return; var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 9) down.moved = true;
      if (down.moved && W.camMode === 'follow' && !W.cine) { W.auto = false; W.camYaw = down.yaw - dx * 0.008; W.camH = Math.max(4.5, Math.min(22, down.h + dy * 0.04)); }
    });
    el.addEventListener('pointerup', function (e) {
      if (!down || e.pointerId !== down.id) return; var d = down; down = null; if (d.moved || W.cine) return;
      var rc = el.getBoundingClientRect(); W.v2.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      W.ray.setFromCamera(W.v2, W.cam);
      if (W.mg) { var gp = W.ray.intersectObject(W.ground, false)[0]; if (gp) careerMgTap(gp.point); return; }
      if (W.ward) return;
      // people are small on a phone: a tap within a finger's width of someone counts as tapping them
      var hb = el.getBoundingClientRect(), bestN = null, bestD = W.mob ? 46 : 34;
      W.npcs.forEach(function (n) { var v = W.v3.set(n.g.position.x, (n.lift || 0) + 1.2, n.g.position.z).project(W.cam); if (v.z > 1) return; var sx = (v.x + 1) / 2 * hb.width, sy = (1 - v.y) / 2 * hb.height, dd = Math.hypot(sx - (e.clientX - hb.left), sy - (e.clientY - hb.top)); if (dd < bestD) { bestD = dd; bestN = n; } });
      if (bestN) { careerWalkTo(bestN.id); careerNote('Walking to ' + bestN.name + '…', 1400); return; }
      var hits = W.ray.intersectObjects(W.hits, false), hit = hits.filter(function (x) { return x.object.userData.hit && x.object.userData.hit.type === 'npc'; })[0] || hits[0];
      if (hit && hit.object.userData.hit) { var h = hit.object.userData.hit, t = careerTarget(h.id); careerWalkTo(h.id); careerNote((h.type === 'npc' ? 'Walking to ' : 'Heading to ') + (t ? t.name : '') + '…', 1400); return; }
      var g = W.ray.intersectObject(W.ground, false)[0];
      if (g) { if (W.talking) careerCloseTalk(); careerGo(g.point.x, g.point.z, false); W.pend = null; W.ring.position.x = g.point.x; W.ring.position.z = g.point.z; W.ring.material.opacity = 1; }
    });
    el.addEventListener('wheel', function (e) { e.preventDefault(); W.camDist = Math.max(7, Math.min(28, W.camDist + e.deltaY * 0.01)); }, { passive: false });
    W.onKey = function (e) {
      if (current !== MODES.career || W.ward || W.cine) return; var k = e.key.toLowerCase(), dn = e.type === 'keydown';
      if (/^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright)$/.test(k)) { if (W.mg && W.mg.kind === 'hop') return; W.keys[k] = dn; e.preventDefault(); W.goal = null; W.pend = null; }
      if (dn && (k === 'e' || k === 'enter')) { var b = document.querySelector('#w-dlg:not([hidden]) .btn.primary, #w-card:not([hidden]) .btn.primary'); if (b) b.click(); }
      if (dn && k === 'escape' && W.talking) careerCloseTalk();
    };
    window.addEventListener('keydown', W.onKey); window.addEventListener('keyup', W.onKey);
    W.host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-wact]'); if (!b) return; var a = b.dataset.wact;
      if (a === 'enter') careerEnter(b.dataset.loc, b.dataset.m, b.dataset.arg);
      if (a === 'close') { if (W.victoryRestore) careerVictoryDone(); else if (W.talking) careerCloseTalk(); else $('#w-dlg').hidden = true; }
      if (a === 'walk') { careerWalkTo(b.dataset.to); if (!S.careerSt.walkHint) { S.careerSt.walkHint = 1; save(); setTimeout(function () { careerNote(W.mob ? '💡 You can also tap anywhere on the ground to walk there, and drag to look around.' : '💡 You can also click anywhere to walk (or use W A S D), and drag to look around.', 5500); }, 1200); } }
      if (a === 'go') { if (W.q && W.q.target) { careerWalkTo(W.q.target); careerNote('Walking to ' + (W.tg ? W.tg.name : '') + '…', 1500); } }
      if (a === 'talk') { var n = W.npcs.filter(function (x) { return x.id === b.dataset.id; })[0]; if (n) careerTalk(n); }
      if (a === 'fight') careerFight(b.dataset.id);
      if (a === 'skip') { if (W.cine) W.cine.skip(); }
      if (a === 'vsgo') careerFightGo();
      if (a === 'mg') { if (W.talking) careerCloseTalk(); careerMgStart(b.dataset.k); }
      if (a === 'mgquit') careerMgEnd(true);
      if (a === 'mgagain') careerMgStart(b.dataset.k);
      if (a === 'mgclose') $('#w-mg').hidden = true;
      if (a === 'look') { if (W.talking) careerCloseTalk(); careerWardrobe(true); }
      if (a === 'lookset') careerLookSet(b.dataset.k, b.dataset.v);
      if (a === 'lookdone') careerWardrobe(false);
      if (a === 'list') { S.career = false; save(); go('path'); }
      if (a === 'vclose') careerVictoryDone();
    });
  }

  // ---------- the frame loop
  function careerStep(dt) {
    var W = CW, P = W.P, p = P.g.position; W.t += dt;
    if (W.cine) W.cine.step(dt);
    var mx = 0, mz = 0, K = W.keys;
    if (!W.cine && !W.ward && !(W.mg && W.mg.kind === 'hop')) { if (K.w || K.arrowup) mz -= 1; if (K.s || K.arrowdown) mz += 1; if (K.a || K.arrowleft) mx -= 1; if (K.d || K.arrowright) mx += 1; }
    var vx = 0, vz = 0, sp = 6.4;
    if (mx || mz) { var cy = Math.cos(W.camYaw), sy = Math.sin(W.camYaw), l = Math.hypot(mx, mz); vx = (mx * cy + mz * sy) / l * sp; vz = (-mx * sy + mz * cy) / l * sp; }
    else if (W.goal && !W.cine) {
      var dx = W.goal.x - p.x, dz = W.goal.z - p.z, d = Math.hypot(dx, dz), more = W.path && W.path.length;
      if (d < (more ? 0.9 : 0.25)) { if (more) W.goal = W.path.shift(); else { W.goal = null; W.auto = false; if (W.pend) { var id = W.pend; W.pend = null; careerArrive(id); } } }
      else { var s2 = more ? sp : Math.min(sp, d * 3); vx = dx / d * s2; vz = dz / d * s2; }
    }
    if (!W.goal && !(mx || mz)) { W.path = null; }
    var V = W.vel = W.vel || { x: 0, z: 0 }, ka = Math.min(1, dt * 9); V.x += (vx - V.x) * ka; V.z += (vz - V.z) * ka; vx = V.x; vz = V.z;
    if (!W.cine) {
      var ox = p.x, oz = p.z;
      p.x += vx * dt; p.z += vz * dt;
      W.col.forEach(function (c) { var ex = p.x - c.x, ez = p.z - c.z, e = Math.hypot(ex, ez), m = c.r + 0.45; if (e < m && e > 0.0001) { p.x = c.x + ex / e * m; p.z = c.z + ez / e * m; } });
      var R = Math.hypot(p.x, p.z); if (R > 60) { p.x *= 60 / R; p.z *= 60 / R; }
      p.y = Math.abs(p.x) < 7.2 && Math.abs(p.z) < 7.2 ? 0.22 : Math.hypot(p.x, p.z) < 10.6 ? 0.1 : 0;
      var moved = Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-3);
      if (W.goal && moved < 0.3 && Math.hypot(vx, vz) > 1) { W.stuck = (W.stuck || 0) + dt; if (W.stuck > 0.6) { W.goal = null; W.stuck = 0; if (W.pend) { var id2 = W.pend; W.pend = null; careerArrive(id2); } } } else W.stuck = 0;
      P.speed = moved; if (moved > 0.2) { var want = Math.atan2(p.x - ox, p.z - oz), cur = P.g.rotation.y, df = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)); P.g.rotation.y = cur + df * Math.min(1, dt * 10);
        // on an auto-walk the camera swings in behind you, so you see where you are going
        if (W.auto && moved > 2 && W.camMode === 'follow') { var cy2 = want + Math.PI, dy2 = Math.atan2(Math.sin(cy2 - W.camYaw), Math.cos(cy2 - W.camYaw)); W.camYaw += dy2 * Math.min(1, dt * 1.3); } }
    }
    W.animate(P, dt);
    // townsfolk walk, stop for a chat and share a tip when you pass
    W.walkers.forEach(function (q) {
      var gp = q.g.position;
      if (q.wait > 0) { q.wait -= dt; q.speed = 0; }
      else {
        var dx2 = q.goal[0] - gp.x, dz2 = q.goal[1] - gp.z, d2 = Math.hypot(dx2, dz2);
        if (d2 < 0.5) { q.wait = 1.5 + Math.random() * 4; var s = W.spots[Math.floor(Math.random() * W.spots.length)]; q.goal = [s[0] + Math.random() * 3 - 1.5, s[1] + Math.random() * 3 - 1.5]; }
        else { var s3 = 2.2; gp.x += dx2 / d2 * s3 * dt; gp.z += dz2 / d2 * s3 * dt; q.g.rotation.y = Math.atan2(dx2, dz2); q.speed = s3; }
        W.col.forEach(function (c) { var ex = gp.x - c.x, ez = gp.z - c.z, e = Math.hypot(ex, ez), m = c.r + 0.4; if (e < m && e > 0.0001) { gp.x = c.x + ex / e * m; gp.z = c.z + ez / e * m; } });
        gp.y = Math.abs(gp.x) < 7.2 && Math.abs(gp.z) < 7.2 ? 0.22 : 0;
      }
      if (!W.cine && !W.mg && S.careerSt.met && W.t > q.tipAt && Math.hypot(gp.x - p.x, gp.z - p.z) < 3.4) { q.tipAt = W.t + 25 + Math.random() * 20; q.wait = 2.5; q.speed = 0; q.g.rotation.y = Math.atan2(p.x - gp.x, p.z - gp.z); careerBubble(q, CAREER_TIPS[Math.floor(Math.random() * CAREER_TIPS.length)], 3800); }
      W.animate(q, dt);
    });
    W.npcs.forEach(function (n) { n.speed = n.walk || 0; W.animate(n, dt); });
    W.anim.forEach(function (n) { W.animate(n, dt); });
    W.crowd.forEach(function (n) { W.animate(n, dt); });
    if (!W.cine && W.q && W.q.target === 'leo' && !W.talking && W.t > (W.leoCall || 2)) { W.leoCall = W.t + 7; careerBubble(W.npcs[0], CAREER_TEXT.leo_call, 3000); }
    // scenery life
    W.clouds.forEach(function (c, k) { c.position.x += dt * (0.7 + k * 0.05); if (c.position.x > 110) c.position.x = -110; });
    W.towerGem.rotation.y += dt * 1.5; W.towerGem.position.y = 19 + Math.sin(W.t * 1.5) * 0.3;
    W.flags.forEach(function (f, k) { f.rotation.y = Math.sin(W.t * 2.6 + k) * 0.5; });
    if (W.seaT) W.seaT.value = W.t; W.foam.material.opacity = 0.35 + Math.sin(W.t * 1.2) * 0.15;
    W.puffs.forEach(function (u) { var t = (W.t * 0.18 + u.userData.t) % 1; u.position.set(W.chimney.x + t * 1.2, W.chimney.y + t * 4, W.chimney.z - t * 0.6); u.scale.setScalar(0.5 + t * 1.4); u.material.opacity = 0.65 * (1 - t); });
    W.drops.forEach(function (u) { var t = (W.t * 0.9 + u.userData.t) % 1, a = u.userData.a; u.position.set(W.fountain.x + Math.sin(a) * t * 0.9, 2.1 + Math.sin(t * Math.PI) * 0.9 - t * 1.3, W.fountain.z + Math.cos(a) * t * 0.9); });
    W.birds.forEach(function (b) { var u = b.userData, a = W.t * u.s + u.a; b.position.set(Math.sin(a) * u.r, u.h + Math.sin(W.t + u.a) * 1.5, Math.cos(a) * u.r); b.rotation.y = a + Math.PI / 2; var fl = Math.sin(W.t * 9 + u.a) * 0.7; u.wl.rotation.z = fl; u.wr.rotation.z = -fl; });
    W.flies.forEach(function (f) { var u = f.userData, t = W.t * 0.8 + u.a; f.position.set(u.cx + Math.sin(t * 1.3) * 1.2, 0.9 + Math.sin(t * 2.1) * 0.3, u.cz + Math.cos(t) * 1.2); f.rotation.y = t; var fl = Math.sin(W.t * 18 + u.a) * 1.1; u.w1.rotation.y = fl; u.w2.rotation.y = -fl; });
    // golden pawns
    W.pawns.forEach(function (g, k) {
      if (g.got) return; g.m.rotation.y += dt * 2; g.m.position.y = 0.45 + Math.sin(W.t * 3 + k) * 0.12;
      if (!W.cine && Math.hypot(p.x - g.x, p.z - g.z) < 1.1) {
        g.got = true; W.sc.remove(g.m); var pw = S.careerSt.pawns; pw.got.push(k); addXP(5); Sound.play('star'); careerConfetti(g.x, 1, g.z, 40);
        if (pw.got.length >= 5) { addXP(25); careerNote('♟ All 5 golden pawns! +25 bonus XP', 4000); Voice.say([WL('pawns_all')]); } else careerNote('♟ Golden pawn ' + pw.got.length + ' of 5 · +5 XP', 2200);
        save(); $('#w-pawns').textContent = '♟ ' + pw.got.length + '/5';
      }
    });
    careerConfStep(dt);
    if (W.mg) careerMgStep(dt);
    // quest star, beam and the golden trail on the ground
    var showGuide = W.tg && !W.cine && !W.mg && !W.ward;
    W.star.visible = W.beam.visible = !!showGuide;
    var n2 = 0;
    if (showGuide) {
      W.star.position.set(W.tg.x, W.tg.y + Math.sin(W.t * 2.5) * 0.25, W.tg.z); W.star.rotation.y += dt * 2; W.beam.position.set(W.tg.x, 20, W.tg.z);
      var tx = W.tg.x - p.x, tz = W.tg.z - p.z, td = Math.hypot(tx, tz);
      if (td > 3.5) { var stepL = 1.3, ph = (W.t * 1.6) % 1; for (var s4 = 1.4 + ph * stepL; s4 < td - 1.5 && n2 < 40; s4 += stepL) {
        var px = p.x + tx / td * s4, pz = p.z + tz / td * s4, yy = Math.abs(px) < 7.2 && Math.abs(pz) < 7.2 ? 0.25 : Math.hypot(px, pz) < 10.6 ? 0.13 : 0.08, wv = Math.sin(s4 * 0.9 - W.t * 5), sc2 = 0.75 + 0.35 * wv * wv;
        W.dummy.position.set(px, yy, pz); W.dummy.rotation.set(-Math.PI / 2, 0, -Math.atan2(tx, tz) + Math.PI); W.dummy.scale.setScalar(sc2 * 1.2); W.dummy.updateMatrix(); W.trail.setMatrixAt(n2++, W.dummy.matrix); } }
    }
    W.trail.count = n2; W.trail.instanceMatrix.needsUpdate = true;
    if (W.ring.material.opacity > 0) { W.ring.material.opacity = Math.max(0, W.ring.material.opacity - dt * 1.4); var rs = 1 + (1 - W.ring.material.opacity) * 0.8; W.ring.scale.set(rs, rs, rs); }
    careerCam(dt);
    W.sun.position.set(p.x - 26, 44, p.z + 18); W.sun.target.position.set(p.x, 0, p.z); W.sky.position.copy(W.cam.position);
    careerGuides();
    var tut = $('#w-tut'); if (tut) tut.style.visibility = $('#w-card').hidden && $('#w-dlg').hidden ? '' : 'hidden';
    // what is close enough to talk to or enter
    if (!W.cine && !W.busy && !W.mg && !W.ward) {
      var near = null, best = 3.1;
      W.npcs.forEach(function (n) { var e = Math.hypot(p.x - n.g.position.x, p.z - n.g.position.z); if (e < best) { best = e; near = { npc: n }; } });
      if (!near) CAREER_LOCS.forEach(function (L) { var e = Math.hypot(p.x - L.door[0], p.z - L.door[1]); if (e < 3.3 && e < best) { best = e; near = { loc: L }; } });
      var key = near ? (near.npc ? near.npc.id : near.loc.id) : null;
      if (key !== W.nearKey) {
        W.nearKey = key;
        if (W.talking && W.talking !== key) careerCloseTalk();
        if (near && near.loc) careerLocCard(near.loc);
        else if (near && near.npc && !W.talking) { var c = $('#w-card'); c.innerHTML = '<div class="w-card-h"><span class="w-ico">💬</span><b>' + esc(near.npc.name) + '</b></div><div class="w-card-a"><button class="btn primary small" data-wact="talk" data-id="' + near.npc.id + '">Talk</button></div>'; c.hidden = false; }
        else if (!near) $('#w-card').hidden = true;
      }
    }
  }
  function careerArrive(id) {
    var t = careerTarget(id); if (!t) return;
    if (t.npc) return careerTalk(t.npc);
    CW.nearKey = t.loc.id; careerLocCard(t.loc); Voice.say([WL(t.loc.line)], true);
  }
  function careerCam(dt) {
    var W = CW, p = W.P.g.position, cam = W.cam, k = Math.min(1, dt * 4), want, look, V3 = THREE.Vector3;
    if (W.cine) { cam.position.copy(W.cine.cam.pos); cam.lookAt(W.cine.cam.look); W.look = W.cine.cam.look.clone(); return; }
    if (W.camMode === 'board') {
      var half = Math.tan(cam.fov * Math.PI / 360), d = Math.max(14, 8.4 / (half * Math.min(cam.aspect, 1.2)));
      want = new V3(0, d * 0.84, d * 0.54 + 0.6); look = new V3(0, 0, 0.8);
    } else if (W.camMode === 'close') {
      var ry = W.P.g.rotation.y; want = new V3(p.x + Math.sin(ry) * 3.6 + Math.cos(ry) * 0.7, 2.2, p.z + Math.cos(ry) * 3.6 - Math.sin(ry) * 0.7); look = new V3(p.x + Math.cos(ry) * 0.5, W.mob ? 1.05 : 1.3, p.z - Math.sin(ry) * 0.5);
    } else {
      want = new V3(p.x + Math.sin(W.camYaw) * W.camDist, W.camH, p.z + Math.cos(W.camYaw) * W.camDist);
      look = new V3(p.x - Math.sin(W.camYaw) * 4, 1.5, p.z - Math.cos(W.camYaw) * 4);
    }
    cam.position.lerp(want, k); if (!W.look) W.look = look.clone(); W.look.lerp(look, k); cam.lookAt(W.look);
  }
  // on-screen pointer, edge arrow, speech bubbles, compass and minimap
  function careerGuides() {
    var W = CW, p = W.P.g.position, cam = W.cam, v = W.v3, w = W.W, h = W.H;
    function proj(x, y, z) { v.set(x, y, z).project(cam); return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, on: v.z < 1 && v.x > -1 && v.x < 1 && v.y > -1 && v.y < 1 }; }
    var ptr = $('#w-ptr'), edge = $('#w-edge'), show = W.tg && !W.cine && !W.mg && !W.ward && !W.talking && !Guide.on();
    if (show && Math.hypot(W.tg.x - p.x, W.tg.z - p.z) > 2.6) {
      var s = proj(W.tg.x, W.tg.y + 1.3, W.tg.z);
      if (s.on && s.y > 70) { ptr.hidden = false; edge.hidden = true; ptr.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px) translate(-50%,-100%)'; $('#w-ptr-t').textContent = W.tg.name; }
      else {
        ptr.hidden = true; edge.hidden = false;
        var fx = -Math.sin(W.camYaw), fz = -Math.cos(W.camYaw), tx = W.tg.x - p.x, tz = W.tg.z - p.z, sx = tx * (-fz) + tz * fx, sy = tx * fx + tz * fz, ang = Math.atan2(sx, sy);
        var ex = w / 2 + Math.sin(ang) * (w / 2 - 34), ey = h / 2 - Math.cos(ang) * (h / 2 - 40); ey = Math.max(150, Math.min(h - 60, ey));
        edge.style.transform = 'translate(' + Math.round(ex) + 'px,' + Math.round(ey) + 'px) translate(-50%,-50%) rotate(' + (ang * 180 / Math.PI - 90) + 'deg)';
      }
    } else { ptr.hidden = true; edge.hidden = true; }
    W.bub = W.bub.filter(function (b) {
      if (W.t > b.until || W.cine) { b.el.remove(); return false; }
      var g = b.p.g.position, s2 = proj(g.x, (b.p.lift || 0) + 3.3 + g.y, g.z); b.el.style.display = s2.on ? '' : 'none';
      b.el.style.transform = 'translate(' + Math.round(s2.x) + 'px,' + Math.round(s2.y) + 'px) translate(-50%,-100%)'; return true;
    });
    if (W.tg) { var fx2 = -Math.sin(W.camYaw), fz2 = -Math.cos(W.camYaw), tx2 = W.tg.x - p.x, tz2 = W.tg.z - p.z; $('#w-arrow').style.transform = 'rotate(' + (Math.atan2(tx2 * (-fz2) + tz2 * fx2, tx2 * fx2 + tz2 * fz2) * 180 / Math.PI - 90) + 'deg)'; }
    if (W.t - (W.mapT || 0) > 0.15) { W.mapT = W.t; careerMap(); }
  }
  function careerMap() {
    var c = $('#w-map'); if (!c || c.offsetParent === null) return; var x = c.getContext('2d'), W = CW, p = W.P.g.position, k = 100 / 64, yaw = W.camYaw;
    x.clearRect(0, 0, 200, 200); x.save(); x.beginPath(); x.arc(100, 100, 98, 0, Math.PI * 2); x.clip();
    x.fillStyle = '#2aa6d8'; x.fillRect(0, 0, 200, 200);
    x.translate(100, 100); x.rotate(yaw); // the map turns with the camera, so up is the way you are looking
    x.fillStyle = '#86cf5a'; x.beginPath(); x.arc(0, 0, 62 * k, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#efe0b6'; x.lineWidth = 4; CAREER_LOCS.forEach(function (L) { x.beginPath(); x.moveTo(0, 0); x.lineTo(L.door[0] * k, L.door[1] * k); x.stroke(); });
    x.fillStyle = '#c9a777'; x.fillRect(-7.2 * k, -7.2 * k, 14.4 * k, 14.4 * k);
    x.font = '15px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle';
    CAREER_LOCS.forEach(function (L) { x.save(); x.translate(L.x * k, L.z * k); x.rotate(-yaw); x.fillStyle = 'rgba(14,18,38,.75)'; x.beginPath(); x.arc(0, 0, 12, 0, Math.PI * 2); x.fill(); x.fillText(L.icon, 0, 1); x.restore(); });
    if (W.tg) { x.fillStyle = '#ffd23f'; x.strokeStyle = '#1b1a22'; x.lineWidth = 2; x.beginPath(); x.arc(W.tg.x * k, W.tg.z * k, 6 + Math.sin(W.t * 5) * 1.5, 0, Math.PI * 2); x.fill(); x.stroke(); }
    x.save(); x.translate(p.x * k, p.z * k); x.rotate(-W.P.g.rotation.y + Math.PI); x.fillStyle = '#c4ff3d'; x.strokeStyle = '#1b1a22'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -8); x.lineTo(6, 6); x.lineTo(0, 3); x.lineTo(-6, 6); x.closePath(); x.fill(); x.stroke(); x.restore();
    x.restore(); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 4; x.beginPath(); x.arc(100, 100, 97, 0, Math.PI * 2); x.stroke();
  }

  // ---------- confetti
  function careerConfetti(x, y, z, n) {
    var W = CW; W.confetti.visible = true; var a = W.confetti.geometry.attributes.position.array; W.confV = [];
    for (var i = 0; i < 150; i++) { var on = i < (n || 150); a[i * 3] = x; a[i * 3 + 1] = on ? y : -50; a[i * 3 + 2] = z; W.confV.push(on ? [(Math.random() - 0.5) * 7, 4 + Math.random() * 6, (Math.random() - 0.5) * 7] : null); }
    W.confT = 2.6; W.confetti.geometry.attributes.position.needsUpdate = true;
  }
  function careerConfStep(dt) {
    var W = CW; if (!W.confetti.visible) return; W.confT -= dt; if (W.confT <= 0) { W.confetti.visible = false; return; }
    var a = W.confetti.geometry.attributes.position.array;
    for (var i = 0; i < 150; i++) { var v = W.confV[i]; if (!v) continue; v[1] -= 9 * dt; v[0] *= 0.98; v[2] *= 0.98; a[i * 3] += v[0] * dt; a[i * 3 + 1] = Math.max(0.1, a[i * 3 + 1] + v[1] * dt); a[i * 3 + 2] += v[2] * dt; }
    W.confetti.geometry.attributes.position.needsUpdate = true;
  }

  // ---------- scripted camera shots (intro fly-over, rival walk-in, victory)
  function careerCine(shots, opts) {
    var W = CW; opts = opts || {}; $('#w-cine').hidden = false; $('#w-card').hidden = true; $('#w-dlg').hidden = true; careerTut(null);
    CW.host.classList.add('w-hidetop');
    var i = 0, t = 0, ease = function (u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; };
    var V = function (a) { return new THREE.Vector3(a[0], a[1], a[2]); };
    W.cine = { cam: { pos: V(shots[0].from), look: V(shots[0].lookFrom || shots[0].look) },
      step: function (dt) {
        var s = shots[i]; if (!s) return; t += dt; var u = Math.min(1, t / s.dur), e = ease(u);
        this.cam.pos.copy(V(s.from)).lerp(V(s.to), e); this.cam.look.copy(V(s.lookFrom || s.look)).lerp(V(s.look), e);
        if (s.title != null && this.ti !== i) { this.ti = i; var tt = $('#w-title'); tt.innerHTML = s.title; tt.classList.remove('in'); void tt.offsetWidth; tt.classList.add('in'); }
        if (s.each) s.each(u, dt);
        if (u >= 1) { if (s.end) s.end(); i++; t = 0; if (i >= shots.length) this.done(); }
      },
      done: function () { if (W.cine !== this) return; W.cine = null; $('#w-cine').hidden = true; $('#w-title').innerHTML = ''; CW.host.classList.remove('w-hidetop'); W.look = null; if (opts.done) opts.done(); },
      skip: function () { this.done(); }
    };
  }
  function careerIntro() {
    var W = CW, A = W.Lb.arena, leo = W.npcs[0];
    careerCine([
      { from: [70, 46, 70], to: [-50, 40, 60], look: [0, 0, 0], dur: 3.6, title: '<small>Welcome to</small>ASCENT TOWN' },
      { from: [-30, 20, -2], to: [-12, 8, -10], lookFrom: [-26, 3, -8], look: [0, 3, -24], dur: 2.6, title: '<small>Learn at</small>LEO\'S ACADEMY' },
      { from: [9, 4, -11], to: [6.6, 2.6, -13.4], lookFrom: [2, 2, -18], look: [3.6, 1.8, -17.4], dur: 2.2, title: '<small>Your coach</small>COACH LEO', each: function () { leo.act = 'wave'; leo.g.rotation.y = 0.9; } },
      { from: [A.x + 8, 14, A.z + 12], to: [A.x - 9, 6, A.z + 8], look: [A.x, 2, A.z], dur: 2.4, title: '<small>Beat the rivals at</small>THE ARENA' },
      { from: [0, 9, 26], to: [0, W.camH, 12.5 + W.camDist], look: [0, 1.5, 8.5], dur: 2, title: '' }
    ], { done: function () { S.careerSt.intro = 1; save(); leo.g.rotation.y = leo.home; careerRefresh(); careerAfterIntro(); } });
  }
  function careerAfterIntro() {
    if (!S.careerSt.look) { careerNote(CAREER_TEXT.look_intro, 4500); careerWardrobe(true, true); return; }
    if (S.careerSt.met) careerNote(CW.mob ? CAREER_TEXT.hint_tap : CAREER_TEXT.hint_keys, 6000);
  }

  // rival walk-in: crowd on its feet, spotlights, both fighters walk to the middle, then a VS screen
  function careerFight(id) {
    var W = CW, b = BOSSES.filter(function (x) { return x.id === id; })[0], n = W.npcs.filter(function (x) { return x.id === 'boss-' + id; })[0]; if (!b || !n) return;
    if (W.talking) careerCloseTalk();
    S.careerSt.fight = { id: id, beat: !!S.bosses[id] }; S.careerSt.at = 'arena'; save();
    var A = W.Lb.arena, ga = Math.atan2(A.door[0] - A.x, A.door[1] - A.z), dx = Math.sin(ga), dz = Math.cos(ga), side = [-dz, dx];
    var saved = { p: W.P.g.position.clone(), r: W.P.g.rotation.y, n: n.g.position.clone(), nr: n.g.rotation.y };
    var pS = [A.x + dx * 6.4, A.z + dz * 6.4], pE = [A.x + dx * 1.7, A.z + dz * 1.7], nS = [A.x - dx * 4.4, A.z - dz * 4.4], nE = [A.x - dx * 1.7, A.z - dz * 1.7];
    W.restoreFight = function () { W.P.g.position.copy(saved.p); W.P.g.rotation.y = saved.r; n.g.position.copy(saved.n); n.g.rotation.y = saved.nr; n.lift = 0.3; n.plat.visible = true; n.lbl.visible = true; n.walk = 0; n.act = null; W.crowd.forEach(function (c) { c.act = 'sit'; }); W.spots3.forEach(function (s) { s.visible = false; }); };
    $('#w-fade').classList.add('on'); $('#w-card').hidden = true;
    setTimeout(function () {
      $('#w-fade').classList.remove('on');
      W.P.g.position.set(pS[0], 0.1, pS[1]); W.P.g.rotation.y = ga + Math.PI; n.g.position.set(nS[0], 0.1, nS[1]); n.g.rotation.y = ga; n.lift = 0; n.plat.visible = false; n.lbl.visible = false; n.act = null;
      W.crowd.forEach(function (c) { c.act = 'cheerSit'; });
      W.spots3.forEach(function (s, k) { s.visible = true; s.position.set(A.x + Math.sin(k * 2.1) * 2, 6, A.z + Math.cos(k * 2.1) * 2); });
      Sound.play('star');
      var walk = function (u) { var e = Math.min(1, u * 1.15); W.P.g.position.x = pS[0] + (pE[0] - pS[0]) * e; W.P.g.position.z = pS[1] + (pE[1] - pS[1]) * e; n.g.position.x = nS[0] + (nE[0] - nS[0]) * e; n.g.position.z = nS[1] + (nE[1] - nS[1]) * e; W.P.speed = e < 1 ? 3 : 0; n.walk = e < 1 ? 3 : 0; W.spots3.forEach(function (s, k) { s.rotation.z = Math.sin(W.t * 1.4 + k * 2) * 0.35; s.rotation.x = Math.cos(W.t * 1.1 + k) * 0.3; }); };
      var taunt = CAREER_TEXT['boss_' + b.id].split('. ').slice(1).join('. ') || CAREER_TEXT['boss_' + b.id];
      careerCine([
        { from: [A.x + dx * 9 + side[0] * 2, 5, A.z + dz * 9 + side[1] * 2], to: [A.x + side[0] * 4.4 + dx * 0.6, 3, A.z + side[1] * 4.4 + dz * 0.6], look: [A.x, 1.4, A.z], dur: 3.4, title: '<small>The Arena · ' + esc(STAGES[b.stage].name) + '</small>' + esc(playerName() || 'You') + ' <em>vs</em> ' + esc(b.name), each: walk, end: function () { careerConfetti(A.x, 4, A.z, 120); } },
        { from: [nE[0] + dx * 3.4 + side[0] * 0.8, 2.1, nE[1] + dz * 3.4 + side[1] * 0.8], to: [nE[0] + dx * 2.6, 1.9, nE[1] + dz * 2.6], look: [nE[0], 1.6, nE[1]], dur: 2.6, title: '<small>' + esc(b.title) + '</small>“' + esc(taunt) + '”', each: function () { n.act = 'cheer'; n.walk = 0; W.P.speed = 0; }, end: function () { n.act = null; } }
      ], { done: function () { careerVS(b); } });
      Voice.say([WL('boss_' + b.id)]);
    }, 450);
  }
  function careerVS(b) {
    var v = $('#w-vs'), lv = levelById(b.level);
    v.innerHTML = '<div class="vs-side me"><span class="vs-tag">Challenger</span><b>' + esc(playerName() || 'You') + '</b><span>Rating ' + Math.round(S.puzzle.rating) + '</span></div><div class="vs-mid">VS</div>' +
      '<div class="vs-side them" style="--bc:' + b.color + '"><span class="vs-tag">' + esc(b.title) + '</span><b>' + esc(b.name) + '</b><span>~' + (lv ? lv.elo : '') + ' · ' + esc(STAGES[b.stage].name) + '</span></div>' +
      '<button class="btn primary big vs-go" data-wact="vsgo">⚔️ Fight!</button>';
    v.hidden = false; v.classList.remove('in'); void v.offsetWidth; v.classList.add('in'); Sound.play('good'); CW.vsBoss = b;
    clearTimeout(careerVS._t); careerVS._t = setTimeout(function () { if (!v.hidden && current === MODES.career) careerFightGo(); }, 6000);
  }
  function careerFightGo() {
    var b = CW.vsBoss; if (!b) return; CW.vsBoss = null; clearTimeout(careerVS._t);
    $('#w-fade').classList.add('on');
    setTimeout(function () { $('#w-vs').hidden = true; if (CW.restoreFight) { CW.restoreFight(); CW.restoreFight = null; } ACT.boss({ id: b.id }); }, 500);
  }
  // back from a rival game: a victory celebration, or a word of encouragement
  function careerAfterFight() {
    var f = S.careerSt.fight; if (!f) return false; S.careerSt.fight = null; save();
    var W = CW, b = BOSSES.filter(function (x) { return x.id === f.id; })[0], n = W.npcs.filter(function (x) { return x.id === 'boss-' + f.id; })[0]; if (!b || !n) return false;
    if (!S.bosses[f.id] || f.beat) {
      setTimeout(function () { careerBubble(n, S.bosses[f.id] ? 'Good game! Again some time?' : 'Ha! Come back stronger.', 3800); if (!S.bosses[f.id]) { careerNote(CAREER_TEXT.lost, 5000); Voice.say([WL('lost')]); } }, 900);
      return false;
    }
    var A = W.Lb.arena, ga = Math.atan2(A.door[0] - A.x, A.door[1] - A.z), dx = Math.sin(ga), dz = Math.cos(ga), saved = { p: W.P.g.position.clone(), n: n.g.position.clone(), nr: n.g.rotation.y };
    W.P.g.position.set(A.x, 0.1, A.z); W.P.g.rotation.y = ga; W.P.act = 'cheer'; n.g.position.set(A.x - dx * 2.4, 0.1, A.z - dz * 2.4); n.g.rotation.y = ga; n.lift = 0; n.plat.visible = false; n.act = 'sad'; n.lbl.visible = false;
    W.crowd.forEach(function (c) { c.act = 'cheerSit'; }); W.spots3.forEach(function (s, k) { s.visible = true; s.position.set(A.x + Math.sin(k * 2.1) * 1.5, 7, A.z + Math.cos(k * 2.1) * 1.5); });
    careerConfetti(A.x, 5, A.z, 150); Sound.play('star'); Voice.say([WL('victory')]);
    W.victoryRestore = function () { W.P.act = null; W.P.g.position.copy(saved.p); n.g.position.copy(saved.n); n.g.rotation.y = saved.nr; n.lift = 0.3; n.plat.visible = true; n.act = null; n.lbl.visible = true; W.crowd.forEach(function (c) { c.act = 'sit'; }); W.spots3.forEach(function (s) { s.visible = false; }); };
    var hat = LOOK.hat.filter(function (h) { return h[2] === b.id; })[0];
    careerCine([{ from: [A.x + dx * 6, 2.4, A.z + dz * 6], to: [A.x + dx * 3.6 - dz * 1.5, 1.9, A.z + dz * 3.6 + dx * 1.5], look: [A.x, 1.5, A.z], dur: 3.4, title: '<small>' + esc(b.name) + ' is beaten</small>VICTORY!', each: function (u) { if (u > 0.5 && !W.conf2) { W.conf2 = 1; careerConfetti(A.x, 5, A.z, 150); } } }],
      { done: function () { W.conf2 = 0; careerDialog('Coach Leo', '#c4ff3d', CAREER_TEXT.victory, (stageCleared(b.stage) ? esc(STAGES[b.stage].name) + ' is cleared.' : 'Finish the last lessons of ' + esc(STAGES[b.stage].name) + ' to complete the chapter.') + (hat ? ' New at the Style Shop: the ' + esc(hat[1].toLowerCase()) + '!' : ''), '<button class="btn primary small" data-wact="vclose">Continue</button>', '🏆', 'Close'); } });
    return true;
  }
  function careerVictoryDone() { $('#w-dlg').hidden = true; if (CW.victoryRestore) { CW.victoryRestore(); CW.victoryRestore = null; } careerRefresh(); var ch = careerChapter(); if (ch < STAGES.length && ch > (S.careerSt.ch || 0)) { S.careerSt.ch = ch; save(); careerBanner(ch); } }
  function careerBanner(ch) {
    careerDialog('Chapter ' + (ch + 1) + ' unlocked', '#ffd23f', CAREER_TEXT['ch' + ch], '<b class="w-big">' + esc(STAGES[ch].name) + '</b>', '', '📜', 'Let\'s go');
    Sound.play('star'); Voice.say([WL('ch' + ch)]);
  }

  // ---------- mini-games on the giant board
  function sqPos(sq) { var i = sq.charCodeAt(0) - 97, r = +sq[1]; return { x: (i - 3.5) * 1.6, z: (3.5 - (r - 1)) * 1.6 }; }
  function posSq(x, z) { var i = Math.floor((x + 6.4) / 1.6), j = Math.floor((z + 6.4) / 1.6); if (i < 0 || i > 7 || j < 0 || j > 7) return null; return 'abcdefgh'[i] + (8 - j); }
  function knightMoves(sq) { var f = sq.charCodeAt(0) - 97, r = +sq[1] - 1, out = []; [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].forEach(function (d) { var a = f + d[0], b = r + d[1]; if (a >= 0 && a < 8 && b >= 0 && b < 8) out.push('abcdefgh'[a] + (b + 1)); }); return out; }
  function randSq() { return 'abcdefgh'[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8)); }
  function careerMgStart(kind) {
    var W = CW; $('#w-card').hidden = true; careerTut(null);
    W.mg = { kind: kind, t: kind === 'rush' ? 45 : 60, score: 0 }; W.camMode = 'board'; CW.host.classList.add('w-hidetop'); $('#w-ptr').hidden = $('#w-edge').hidden = true; W.goal = null; W.pend = null; W.look = null;
    if (kind === 'rush') { W.P.g.position.set(0, 0.22, 7.6); W.P.g.rotation.y = Math.PI; careerRushNext(); Voice.say([WL('rush_start')]); }
    else { W.P.g.position.set(-7.6, 0, 8.8); W.P.g.rotation.y = Math.PI * 0.8; W.knight.visible = true; W.mg.round = 0; careerHopRound(); Voice.say([WL('hop_start')]); }
    careerMgHud();
  }
  function careerRushNext() {
    var W = CW, cur = posSq(W.P.g.position.x, W.P.g.position.z), t; do { t = randSq(); } while (t === cur);
    W.mg.target = t; W.mg.since = 0; W.tileGlow.material.opacity = 0; var p = sqPos(t); W.tileGlow.position.x = p.x; W.tileGlow.position.z = p.z;
    if (W.mg.hud) careerMgHud();
  }
  function careerHopRound() {
    var W = CW, m = W.mg, start = randSq(), path = [start], at = start, stars = [];
    for (var i = 0; i < 3; i++) { var hops = 1 + Math.floor(Math.random() * 2); for (var h = 0; h < hops; h++) { var nx = knightMoves(at).filter(function (s) { return path.indexOf(s) < 0; }); if (!nx.length) break; at = nx[Math.floor(Math.random() * nx.length)]; path.push(at); } if (at !== start && stars.indexOf(at) < 0) stars.push(at); }
    m.at = start; m.stars = stars; m.round++;
    var p = sqPos(start); W.knight.position.set(p.x, 0.22, p.z);
    W.mgStars.forEach(function (o, k) { var s2 = stars[k]; o.visible = !!s2; if (s2) { var q = sqPos(s2); o.position.set(q.x, 1, q.z); } });
    careerHopDots();
  }
  function careerHopDots() {
    var W = CW, mv = W.mg.jump ? [] : knightMoves(W.mg.at); W.dots.count = mv.length;
    mv.forEach(function (s, k) { var p = sqPos(s); W.dummy.position.set(p.x, 0.25, p.z); W.dummy.rotation.set(-Math.PI / 2, 0, 0); W.dummy.scale.setScalar(1); W.dummy.updateMatrix(); W.dots.setMatrixAt(k, W.dummy.matrix); });
    W.dots.instanceMatrix.needsUpdate = true;
  }
  function careerMgTap(pt) {
    var W = CW, m = W.mg; if (!m || m.over) return; var sq = posSq(pt.x, pt.z);
    if (m.kind === 'rush') { W.goal = { x: pt.x, z: pt.z }; W.ring.position.x = pt.x; W.ring.position.z = pt.z; W.ring.material.opacity = 1; return; }
    if (!sq || m.jump) return;
    if (knightMoves(m.at).indexOf(sq) < 0) { Sound.play('bad'); careerNote('Knights jump in an L: two squares, then one to the side.', 1800); return; }
    m.jump = { a: sqPos(m.at), b: sqPos(sq), t: 0, sq: sq }; W.dots.count = 0; Sound.play('move');
  }
  function careerMgStep(dt) {
    var W = CW, m = W.mg, p = W.P.g.position;
    if (m.over) return;
    m.t -= dt; if (m.t <= 0) return careerMgEnd();
    if (m.kind === 'rush') {
      m.since += dt; W.tileGlow.material.opacity = m.since > 5 ? 0.35 + Math.sin(W.t * 6) * 0.2 : 0;
      var tp = sqPos(m.target);
      if (Math.abs(p.x - tp.x) < 0.72 && Math.abs(p.z - tp.z) < 0.72) { m.score++; Sound.play('star'); careerConfetti(tp.x, 0.8, tp.z, 30); careerRushNext(); careerMgHud(); }
    } else if (m.jump) {
      var j = m.jump; j.t += dt / 0.45; var u = Math.min(1, j.t);
      W.knight.position.set(j.a.x + (j.b.x - j.a.x) * u, 0.22 + Math.sin(u * Math.PI) * 2.2, j.a.z + (j.b.z - j.a.z) * u); W.knight.rotation.y = Math.atan2(j.b.x - j.a.x, j.b.z - j.a.z);
      if (u >= 1) {
        m.at = j.sq; m.jump = null; var k = m.stars.indexOf(j.sq);
        if (k >= 0) { m.stars[k] = null; W.mgStars[k].visible = false; m.score++; Sound.play('star'); careerConfetti(j.b.x, 1, j.b.z, 30); }
        if (m.stars.every(function (s) { return !s; })) { m.score += 2; careerNote('⭐ Round ' + m.round + ' cleared! +2', 1500); careerHopRound(); } else careerHopDots();
        careerMgHud();
      }
    }
    W.mgStars.forEach(function (o, k) { o.rotation.y += dt * 2; o.position.y = 1 + Math.sin(W.t * 3 + k) * 0.15; });
    if (W.t - (m.hudT || 0) > 0.25) { m.hudT = W.t; var t = $('#mg-t'); if (t) t.textContent = '⏱ ' + Math.ceil(m.t) + 's'; }
  }
  function careerMgHud() {
    var m = CW.mg, el = $('#w-mg'); if (!m) return; el.hidden = false; m.hud = 1;
    el.innerHTML = '<div class="mg-row"><span class="mg-t" id="mg-t">⏱ ' + Math.ceil(m.t) + 's</span><span class="mg-s">⭐ ' + m.score + '</span><button class="w-btn" data-wact="mgquit" aria-label="Stop the game">✕</button></div>' +
      (m.kind === 'rush' ? '<div class="mg-call">Run to <b>' + m.target + '</b></div><div class="mg-hint">Letter = column, number = row. Tap a square to run there.</div>' : '<div class="mg-call">Hop to the <b>stars</b></div><div class="mg-hint">Tap a glowing square to jump the knight.</div>');
  }
  function careerMgEnd(quit) {
    var W = CW, m = W.mg; if (!m) return; m.over = true;
    var R = S.careerSt.mg = S.careerSt.mg || {}, best = R[m.kind] || 0, rec = m.score > best; if (rec) R[m.kind] = m.score; if (m.score) addXP(m.score); save();
    W.knight.visible = false; W.mgStars.forEach(function (o) { o.visible = false; }); W.dots.count = 0; W.tileGlow.material.opacity = 0;
    W.mg = null; W.camMode = 'follow'; W.look = null; CW.host.classList.remove('w-hidetop'); W.P.g.position.set(3, 0.22, 10.4); W.nearKey = undefined; careerRefresh();
    if (quit && !m.score) { $('#w-mg').hidden = true; return; }
    $('#w-mg').innerHTML = '<div class="mg-end"><b>' + (m.kind === 'rush' ? '🏃 Square Rush' : '♞ Knight Hop') + '</b><div class="mg-big">⭐ ' + m.score + '</div><p>' + (rec ? '🏆 New best score!' : 'Best: ' + best) + ' · +' + m.score + ' XP</p><div class="w-card-a"><button class="btn primary small" data-wact="mgagain" data-k="' + m.kind + '">Play again</button><button class="btn ghost small" data-wact="mgclose">Done</button></div></div>';
    $('#w-mg').hidden = false; if (rec && m.score) { careerConfetti(0, 3, 0, 150); Sound.play('star'); } Voice.say([WL('mg_done')]);
  }

  // ---------- Style Shop: change your look
  function careerWardrobe(open, first) {
    var W = CW, el = $('#w-ward');
    if (!open) { el.hidden = true; W.ward = false; W.camMode = 'follow'; W.look = null; if (!S.careerSt.look) { S.careerSt.look = myLook(); save(); } if (W.wardFirst) W.wardFirst = false; careerRefresh(); return; }
    W.ward = true; W.wardFirst = !!first; W.camMode = 'close'; W.goal = null; W.pend = null; W.look = null; $('#w-card').hidden = true; careerTut(null);
    W.P.g.rotation.y = Math.atan2(W.cam.position.x - W.P.g.position.x, W.cam.position.z - W.P.g.position.z);
    careerWardRender('skin');
    if (first) setTimeout(function () { Guide.show('.lk-opts', 'Tap one to try it on', { ms: 9000, done: function () { setTimeout(function () { Guide.show('[data-wact="lookdone"]', 'Happy? Tap Done', { ms: 20000 }); }, 900); } }); }, 600);
  }
  function careerWardRender(tab) {
    var L = myLook(), el = $('#w-ward'); CW.wardTab = tab;
    var tabs = [['skin', 'Skin'], ['hair', 'Hair'], ['hairC', 'Hair colour'], ['shirt', 'Top'], ['pants', 'Trousers'], ['hat', 'Hat']], opts;
    if (tab === 'hair') opts = LOOK.hair.map(function (h) { return '<button class="lk-opt word' + (L.hair === h ? ' on' : '') + '" data-wact="lookset" data-k="hair" data-v="' + h + '">' + h.charAt(0).toUpperCase() + h.slice(1) + '</button>'; }).join('');
    else if (tab === 'hat') opts = LOOK.hat.map(function (h) { var who = h[2] && BOSSES.filter(function (b) { return b.id === h[2]; })[0], lock = who && !S.bosses[h[2]]; return '<button class="lk-opt word' + (L.hat === h[0] ? ' on' : '') + (lock ? ' locked' : '') + '" ' + (lock ? 'disabled' : 'data-wact="lookset" data-k="hat" data-v="' + h[0] + '"') + '>' + (lock ? '🔒 ' : '') + esc(h[1]) + (lock ? '<small>Beat ' + esc(who.name.split(' ')[1] || who.name) + '</small>' : '') + '</button>'; }).join('');
    else opts = LOOK[tab].map(function (c) { return '<button class="lk-opt sw' + (L[tab] === c ? ' on' : '') + '" style="--c:' + c + '" data-wact="lookset" data-k="' + tab + '" data-v="' + c + '" aria-label="Colour ' + c + '"></button>'; }).join('');
    el.innerHTML = '<div class="lk-head"><b>Your look</b><button class="btn primary small" data-wact="lookdone">Done</button></div><div class="lk-tabs">' + tabs.map(function (t) { return '<button class="' + (t[0] === tab ? 'on' : '') + '" data-lk="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div class="lk-opts">' + opts + '</div>';
    el.hidden = false;
    el.querySelectorAll('[data-lk]').forEach(function (b) { b.onclick = function () { careerWardRender(b.dataset.lk); }; });
  }
  function careerLookSet(k, v) { var L = myLook(); L[k] = v; S.careerSt.look = L; save(); careerRebuildPlayer(); CW.P.g.rotation.y = Math.atan2(CW.cam.position.x - CW.P.g.position.x, CW.cam.position.z - CW.P.g.position.z); CW.P.act = 'wave'; setTimeout(function () { if (CW.P) CW.P.act = null; }, 1200); Sound.play('move'); careerWardRender(CW.wardTab); }

  // ---------- loop, quality and the mode itself
  function careerLoop() {
    if (!CW || !CW.on) return;
    var now = performance.now(), dt = Math.min(0.1, (now - (CW.last || now)) / 1000) * (CW.ts || 1); CW.last = now; // ts: test speed-up only
    careerStep(dt); CW.r.render(CW.sc, CW.cam);
    // adaptive quality: if the device struggles, drop resolution first, then shadows
    var Q = CW.perf = CW.perf || { n: 0, s: 0 }; Q.n++; Q.s += dt;
    if (Q.n === 120) { var fps = Q.n / Q.s; if (fps < 32 && CW.q === 'high') { CW.q = 'mid'; CW.r.setPixelRatio(1); careerLayout(); } else if (fps < 26 && CW.q === 'mid') { CW.q = 'low'; CW.sun.castShadow = false; } Q.n = 0; Q.s = 0; }
    CW.raf = requestAnimationFrame(careerLoop);
  }
  MODES.career = {
    label: 'Career',
    enter: function () {
      if (!window.THREE || !THREE.WebGLRenderer) { toast('Career mode needs 3D graphics, which did not load. Here is the list view.'); S.career = false; return go('path'); }
      S.career = true; S.careerSt = S.careerSt || {}; save();
      if (!CW) {
        var host = $('#world'); if (!host) { host = document.createElement('div'); host.id = 'world'; document.body.appendChild(host); }
        host.hidden = false; host.innerHTML = '<div class="w-load"><span class="w-load-k">' + pieceSVG('n', 'w', 54) + '</span><b>Building Ascent Town…</b><i class="w-load-bar"><i></i></i></div>';
        var top = $('.top').getBoundingClientRect().bottom; host.style.top = top + 'px'; host.style.left = document.body.classList.contains('mob') ? '0' : $('.rail').getBoundingClientRect().right + 'px'; host.style.right = '0'; host.style.bottom = document.body.classList.contains('mob') ? Math.max(0, innerHeight - $('.rail').getBoundingClientRect().top) + 'px' : '0';
        setPanel('');
        setTimeout(function () {
          if (current !== MODES.career) return;
          try { host.innerHTML = ''; CW = careerBuild(host); } catch (e) { console.error(e); host.remove(); CW = null; toast('Career mode could not start 3D here. Here is the list view.'); S.career = false; return go('path'); }
          careerHud(host); careerInput(CW);
          window.addEventListener('resize', careerLayout); if (window.visualViewport) visualViewport.addEventListener('resize', careerLayout);
          MODES.career.show(true);
        }, 80);
        return;
      }
      MODES.career.show(false);
    },
    show: function (first) {
      CW.host.hidden = false; CW.on = true; CW.last = 0; careerLayout(); B3.pause(true);
      careerPawns(CW); setPanel('');
      var at = S.careerSt.at && CAREER_LOCS.filter(function (l) { return l.id === S.careerSt.at; })[0], p = CW.P.g.position;
      if (at) { // walk back out of the building you went into
        var a = Math.atan2(at.door[0] - at.x, at.door[1] - at.z); p.set(at.door[0] - Math.sin(a) * 0.6, 0, at.door[1] - Math.cos(a) * 0.6);
        CW.goal = { x: at.door[0] + Math.sin(a) * 4.5, z: at.door[1] + Math.cos(a) * 4.5 }; CW.P.g.rotation.y = a; CW.camYaw = a + 0.3; S.careerSt.at = null; save();
      }
      CW.cam.position.set(p.x + Math.sin(CW.camYaw) * CW.camDist, CW.camH, p.z + Math.cos(CW.camYaw) * CW.camDist); CW.look = null;
      CW.nearKey = undefined; CW.talking = null; CW.mg = null; CW.ward = false; CW.camMode = 'follow';
      ['#w-dlg', '#w-card', '#w-mg', '#w-vs', '#w-ward'].forEach(function (s) { $(s).hidden = true; });
      careerRefresh();
      var fade = $('#w-fade'); fade.classList.add('on'); setTimeout(function () { fade.classList.remove('on'); }, 60);
      if (!S.careerSt.intro) setTimeout(function () { if (current === MODES.career) careerIntro(); }, 300);
      else if (!careerAfterFight()) {
        var ch = careerChapter(), seen = S.careerSt.ch;
        if (S.careerSt.met && seen != null && ch > seen && ch < STAGES.length) { S.careerSt.ch = ch; save(); setTimeout(function () { careerBanner(ch); }, 700); }
        else if (first && !at) setTimeout(function () { if (current === MODES.career && S.careerSt.met) Voice.say([WL('welcome_back')], true); }, 900);
        if (!S.careerSt.pawnHint && S.careerSt.met) { S.careerSt.pawnHint = 1; save(); setTimeout(function () { if (current === MODES.career) careerNote('♟ ' + CAREER_TEXT.pawns_intro, 5000); }, 6000); }
      }
      cancelAnimationFrame(CW.raf); CW.raf = requestAnimationFrame(careerLoop);
    },
    leave: function () {
      B3.pause(false); if (!CW) { var h = $('#world'); if (h) h.hidden = true; return; }
      if (CW.cine) { CW.cine = null; $('#w-cine').hidden = true; CW.host.classList.remove('w-hidetop'); }
      if (CW.restoreFight) { CW.restoreFight(); CW.restoreFight = null; }
      if (CW.mg) careerMgEnd(true);
      CW.on = false; cancelAnimationFrame(CW.raf); CW.host.hidden = true; CW.keys = {}; $('#w-fade').classList.remove('on');
    }
  };
  document.addEventListener('visibilitychange', function () { if (!CW) return; if (document.hidden) cancelAnimationFrame(CW.raf); else if (CW.on) { CW.last = 0; CW.raf = requestAnimationFrame(careerLoop); } });
  ACT.career = function () { go('career'); };
