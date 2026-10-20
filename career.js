  // ================= Career mode: Ascent Town, a small 3D world you walk around =================
  // Built from simple shapes, no downloads. Buildings open the existing training screens; Coach Leo gives the
  // next objective; the stage bosses wait at the Arena as rivals. Leaving any screen opened from town brings you back here.
  var CW = null;
  var CAREER_LOCS = [
    { id: 'academy', name: 'Leo\'s Academy', sub: 'Lessons', x: 0, z: -25, door: [0, -18.6], r: 6.2, line: 'lesson_go' },
    { id: 'tower', name: 'Puzzle Tower', sub: 'Puzzles · Daily puzzle', x: 25, z: -7, door: [20.6, -7], r: 3.8, line: 'tower' },
    { id: 'library', name: 'Opening Library', sub: 'Openings', x: -25, z: -7, door: [-19.4, -7], r: 5, line: 'library' },
    { id: 'arena', name: 'The Arena', sub: 'Rivals · Challenges', x: 21, z: 22, door: [15.2, 16.2], r: 7.4, line: 'arena' },
    { id: 'park', name: 'The Park', sub: 'Play a full game', x: -21, z: 21, door: [-16.5, 16.5], r: 0, line: 'park' },
    { id: 'home', name: 'Your Home', sub: 'Progress · 30-Day Ascent', x: 0, z: 31, door: [0, 26.4], r: 4.4, line: 'home' }
  ];
  function careerChapter() {
    for (var i = 0; i < STAGES.length; i++) {
      var b = BOSSES.filter(function (x) { return x.stage === i; })[0];
      if (!stageCleared(i) || (b && !S.bosses[b.id] && !placedOut(i))) return i;
    }
    return STAGES.length;
  }
  function careerQuest() {
    var C = S.careerSt || {};
    if (!C.met) return { t: 'Talk to Coach Leo', target: 'leo', line: 'welcome' };
    var ch = careerChapter(), nl = nextLesson();
    if (ch >= STAGES.length) return { t: 'Free roam: every rival beaten', target: null, line: 'all_done' };
    var b = BOSSES.filter(function (x) { return x.stage === ch; })[0];
    var lessonHere = nl && stageOf(nl) === ch;
    if (b && !S.bosses[b.id] && bossOpen(ch) && !lessonHere) return { t: 'Beat ' + b.name + ' at the Arena', target: 'boss-' + b.id, line: 'boss_ready', boss: b };
    if (nl) return { t: 'Academy: ' + LESSONS[nl].title, target: 'academy', lesson: nl, line: 'lesson_go' };
    if (b && !S.bosses[b.id]) return { t: 'Beat ' + b.name + ' at the Arena', target: 'boss-' + b.id, line: 'boss_ready', boss: b };
    return { t: 'Explore the town', target: null, line: 'all_done' };
  }
  function WL(k) { return { id: 'W-' + k, text: CAREER_TEXT[k] }; }

  function careerBuild(host) {
    var T = THREE, mob = document.body.classList.contains('mob');
    var W = { host: host, t: 0, hits: [], col: [], npcs: [], walkers: [], pawns: [], keys: {}, camYaw: 0.25, camDist: mob ? 17 : 15, camH: mob ? 10.5 : 9, mob: mob };
    var r = new T.WebGLRenderer({ antialias: !mob, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mob ? 1.5 : 2));
    r.outputEncoding = T.sRGBEncoding;
    r.shadowMap.enabled = !mob; r.shadowMap.type = T.PCFSoftShadowMap;
    host.appendChild(r.domElement); r.domElement.className = 'w-canvas';
    var sc = new T.Scene(); sc.background = lin('#7cc8f2'); sc.fog = new T.Fog(lin('#b5e0fa'), 55, 130);
    var cam = new T.PerspectiveCamera(50, 1, 0.5, 300);
    W.r = r; W.sc = sc; W.cam = cam;
    sc.add(new T.HemisphereLight(lin('#dff1ff'), lin('#4f7a34'), 0.75));
    var sun = new T.DirectionalLight(lin('#fff1d6'), 1.05); sun.position.set(-30, 50, 20);
    if (!mob) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); var sh = sun.shadow.camera; sh.left = -50; sh.right = 50; sh.top = 50; sh.bottom = -50; sh.far = 140; sun.shadow.bias = -0.0008; }
    sc.add(sun);
    var matCache = {};
    function lin(c) { return new T.Color(c).convertSRGBToLinear(); }
    function M(c, o) { var k = c + JSON.stringify(o || {}); if (!matCache[k]) { var oo = Object.assign({}, o || {}); if (oo.emissive) oo.emissive = lin(oo.emissive); matCache[k] = new T.MeshLambertMaterial(Object.assign({ color: lin(c) }, oo)); } return matCache[k]; }
    function mesh(g, m, x, y, z, parent, shadow) {
      var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0);
      if (shadow !== false) { o.castShadow = true; o.receiveShadow = true; }
      (parent || sc).add(o); return o;
    }
    function hitBox(w, h, d, x, y, z, hit, parent) {
      var o = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      o.position.set(x, y, z); o.userData.hit = hit; (parent || sc).add(o); W.hits.push(o); return o;
    }
    function label(text, sub, color, scale) {
      var c = document.createElement('canvas'), x = c.getContext('2d'); c.width = 512; c.height = sub ? 168 : 112;
      x.font = '800 54px system-ui, sans-serif'; var w = Math.min(500, Math.max(x.measureText(text).width, sub ? (x.font = '600 34px system-ui, sans-serif', x.measureText(sub).width) : 0) + 56);
      x.fillStyle = 'rgba(14,18,38,.82)'; var rx = (512 - w) / 2, rh = c.height - 12;
      x.beginPath(); x.moveTo(rx + 30, 6); x.arcTo(rx + w, 6, rx + w, 6 + rh, 30); x.arcTo(rx + w, 6 + rh, rx, 6 + rh, 30); x.arcTo(rx, 6 + rh, rx, 6, 30); x.arcTo(rx, 6, rx + w, 6, 30); x.fill();
      x.strokeStyle = color || '#c4ff3d'; x.lineWidth = 5; x.stroke();
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 54px system-ui, sans-serif'; x.fillText(text, 256, sub ? 62 : 58);
      if (sub) { x.font = '600 34px system-ui, sans-serif'; x.fillStyle = color || '#c4ff3d'; x.fillText(sub, 256, 124); }
      var tx = new T.CanvasTexture(c); tx.encoding = T.sRGBEncoding;
      var s = new T.Sprite(new T.SpriteMaterial({ map: tx, depthWrite: false, transparent: true }));
      var k = scale || 1; s.scale.set(5.2 * k, 5.2 * k * c.height / 512, 1); s.renderOrder = 5; return s;
    }
    W.label = label;

    // ---- ground, plaza, roads
    var ground = mesh(new T.CircleGeometry(70, 64), M('#7cc65a'), 0, 0, 0, sc); ground.rotation.x = -Math.PI / 2; ground.castShadow = false; W.ground = ground;
    var rim = mesh(new T.CylinderGeometry(70, 66, 4, 64, 1, true), M('#5a9a40', { side: T.DoubleSide }), 0, -2, 0); rim.castShadow = false;
    var tileG = new T.BoxGeometry(1.6, 0.12, 1.6);
    for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) mesh(tileG, M((i + j) % 2 ? '#7b5a3c' : '#f2e3c4'), (i - 3.5) * 1.6, 0.06, (j - 3.5) * 1.6).castShadow = false;
    mesh(new T.BoxGeometry(14.4, 0.1, 14.4), M('#c9b48a'), 0, 0.03, 0).castShadow = false;
    var road = M('#e9d8ad');
    function roadTo(x, z) {
      var len = Math.hypot(x, z) - 7, a = Math.atan2(x, z), cx = Math.sin(a) * (7 + len / 2), cz = Math.cos(a) * (7 + len / 2);
      var o = mesh(new T.BoxGeometry(3, 0.06, len), road, cx, 0.03, cz); o.rotation.y = a; o.castShadow = false;
      for (var k = 1; k < len / 6; k++) { var px = Math.sin(a) * (7 + k * 6), pz = Math.cos(a) * (7 + k * 6), ox = Math.cos(a) * 2.2, oz = -Math.sin(a) * 2.2; lamp(px + ox, pz + oz); }
    }
    function lamp(x, z) {
      mesh(new T.CylinderGeometry(0.07, 0.1, 3, 6), M('#2d3142'), x, 1.5, z);
      mesh(new T.SphereGeometry(0.28, 10, 8), M('#fff6c8', { emissive: '#ffe58a', emissiveIntensity: 0.8 }), x, 3.1, z);
    }
    CAREER_LOCS.forEach(function (L) { roadTo(L.door[0], L.door[1]); });

    // ---- giant pieces on the plaza corners
    function lathe(pts, col, x, z, s) {
      var g = new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0] * s, p[1] * s); }), 24);
      return mesh(g, M(col), x, 0.12, z);
    }
    var KING = [[0, 0], [0.62, 0], [0.62, 0.16], [0.5, 0.26], [0.36, 0.34], [0.26, 0.9], [0.22, 1.5], [0.36, 1.62], [0.38, 1.72], [0.24, 1.8], [0.3, 2.1], [0.12, 2.24], [0, 2.26]];
    var QUEEN = [[0, 0], [0.6, 0], [0.6, 0.16], [0.48, 0.26], [0.34, 0.34], [0.24, 0.9], [0.2, 1.4], [0.34, 1.52], [0.36, 1.6], [0.22, 1.68], [0.34, 2], [0.18, 2.04], [0.1, 2.14], [0, 2.18]];
    var PAWN = [[0, 0], [0.5, 0], [0.5, 0.14], [0.36, 0.24], [0.22, 0.4], [0.16, 0.78], [0.3, 0.86], [0.18, 0.94], [0.3, 1.14], [0.22, 1.34], [0, 1.4]];
    W.PAWN = PAWN;
    lathe(KING, '#f4ead2', -6.4, -6.4, 1.5); var kc = mesh(new T.BoxGeometry(0.16, 0.6, 0.16), M('#f4ead2'), -6.4, 3.85, -6.4); mesh(new T.BoxGeometry(0.5, 0.16, 0.16), M('#f4ead2'), 0, 0.1, 0, kc);
    lathe(QUEEN, '#2b2b3a', 6.4, -6.4, 1.5); lathe(PAWN, '#f4ead2', -6.4, 6.4, 1.5); lathe(PAWN, '#2b2b3a', 6.4, 6.4, 1.5);
    [[-6.4, -6.4], [6.4, -6.4], [-6.4, 6.4], [6.4, 6.4]].forEach(function (p) { W.col.push({ x: p[0], z: p[1], r: 1.2 }); });

    // ---- buildings
    function sign(L, y, z0, rot) { var s = label(L.name, L.sub, '#ffd23f', 1); s.position.set(L.door[0], y, L.door[1] + (z0 || 0)); sc.add(s); }
    function windows(parent, w, h, d, rows, cols, y0) {
      var g = new T.BoxGeometry(0.7, 0.8, 0.06), m = M('#ffe9a8', { emissive: '#ffd36b', emissiveIntensity: 0.35 });
      for (var a = 0; a < rows; a++) for (var b = 0; b < cols; b++) mesh(g, m, (b - (cols - 1) / 2) * (w / cols), y0 + a * 1.6, d / 2 + 0.02, parent, false);
    }
    function door(parent, z, w) { mesh(new T.BoxGeometry(w || 1.6, 2.4, 0.1), M('#5b3a29'), 0, 1.2, z + 0.03, parent, false); mesh(new T.BoxGeometry((w || 1.6) * 0.8, 1.9, 0.12), M('#ffcf70', { emissive: '#ffb340', emissiveIntensity: 0.5 }), 0, 1.05, z + 0.05, parent, false); }
    function face(g, L) { g.position.set(L.x, 0, L.z); g.rotation.y = Math.atan2(L.door[0] - L.x, L.door[1] - L.z); sc.add(g); }
    var Lb = {}; CAREER_LOCS.forEach(function (L) { Lb[L.id] = L; });
    // academy: wide hall with a blue roof and columns
    (function (L) {
      var g = new T.Group();
      mesh(new T.BoxGeometry(12, 6, 7), M('#f6efe2'), 0, 3, 0, g);
      var roof = mesh(new T.ConeGeometry(8.2, 3.2, 4), M('#3f6fd8'), 0, 7.6, 0, g); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.62);
      for (var k = -2; k <= 2; k++) mesh(new T.CylinderGeometry(0.28, 0.32, 5.6, 10), M('#ffffff'), k * 2.4, 2.8, 3.9, g);
      mesh(new T.BoxGeometry(12.6, 0.5, 2), M('#e1d6c2'), 0, 0.25, 4.2, g);
      windows(g, 10, 6, 7, 2, 4, 1.8); door(g, 3.5, 2);
      face(g, L); W.col.push({ x: L.x, z: L.z, r: L.r });
      hitBox(12, 8, 8, 0, 4, 0, { type: 'loc', id: L.id }, g);
      sign(L, 8.2, 0);
    })(Lb.academy);
    // puzzle tower
    (function (L) {
      var g = new T.Group();
      mesh(new T.CylinderGeometry(3, 3.4, 11, 8), M('#8e6cf0'), 0, 5.5, 0, g);
      mesh(new T.CylinderGeometry(3.5, 3.5, 0.6, 8), M('#ffd23f'), 0, 11.2, 0, g);
      mesh(new T.ConeGeometry(3.6, 4, 8), M('#ff4f8b'), 0, 13.5, 0, g);
      var q = mesh(new T.OctahedronGeometry(0.8), M('#ffd23f', { emissive: '#ffb000', emissiveIntensity: 0.6 }), 0, 16.6, 0, g); W.towerGem = q;
      windows(g, 3, 11, 6.4, 3, 1, 3.2); door(g, 3.15, 1.4);
      face(g, L); W.col.push({ x: L.x, z: L.z, r: L.r });
      hitBox(7, 15, 7, 0, 7, 0, { type: 'loc', id: L.id }, g); sign(L, 6.5, 0);
    })(Lb.tower);
    // library: book stack
    (function (L) {
      var g = new T.Group(), cols = ['#c0392b', '#2e86de', '#27ae60', '#f39c12'];
      cols.forEach(function (c, k) { var b = mesh(new T.BoxGeometry(8.5 - k * 0.6, 1.6, 6 - k * 0.3), M(c), (k % 2 ? 0.3 : -0.3), 0.8 + k * 1.6, 0, g); b.rotation.y = (k % 2 ? 0.06 : -0.05); mesh(new T.BoxGeometry(8.3 - k * 0.6, 1.3, 0.05), M('#fff7e0'), 0, 0, 3.02 - k * 0.15, b, false); });
      door(g, 2.95, 1.6);
      face(g, L); W.col.push({ x: L.x, z: L.z, r: L.r });
      hitBox(9, 7, 7, 0, 3.5, 0, { type: 'loc', id: L.id }, g); sign(L, 8, 0);
    })(Lb.library);
    // arena: open ring with flags
    (function (L) {
      var g = new T.Group();
      var ring = mesh(new T.CylinderGeometry(7, 7.6, 4, 24, 1, true), M('#d9534f', { side: T.DoubleSide }), 0, 2, 0, g);
      mesh(new T.TorusGeometry(7.1, 0.35, 6, 24), M('#ffd23f'), 0, 4, 0, g).rotation.x = Math.PI / 2;
      mesh(new T.CylinderGeometry(6.8, 6.8, 0.1, 24), M('#e9d8ad'), 0, 0.06, 0, g).castShadow = false;
      for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2, fx = Math.sin(a) * 7.3, fz = Math.cos(a) * 7.3; mesh(new T.CylinderGeometry(0.08, 0.08, 3, 5), M('#333'), fx, 5.5, fz, g); var fl = mesh(new T.BoxGeometry(1.2, 0.7, 0.04), M(['#4cc9f0', '#ff4f8b', '#ffd23f', '#3ddc97', '#8e6cf0', '#ff8c42'][k]), fx + 0.6, 6.6, fz, g); W.walkers.push({ flag: fl, ph: k }); }
      // gate gap facing the door
      mesh(new T.BoxGeometry(3.4, 0.6, 1.4), M('#ffd23f'), 0, 4.3, 7.2, g);
      face(g, L); W.col.push({ x: L.x, z: L.z, r: L.r });
      hitBox(15, 6, 15, 0, 3, 0, { type: 'loc', id: L.id }, g); sign(L, 7.4, 0);
    })(Lb.arena);
    // park: chess tables, benches, a pond
    (function (L) {
      var pond = mesh(new T.CircleGeometry(4.5, 28), M('#4cb7e8'), L.x - 3, 0.05, L.z + 3); pond.rotation.x = -Math.PI / 2; pond.castShadow = false; W.col.push({ x: L.x - 3, z: L.z + 3, r: 4.5 });
      [[2, -2], [-1, -5], [4, 3]].forEach(function (p) {
        var x = L.x + p[0], z = L.z + p[1];
        mesh(new T.CylinderGeometry(0.9, 0.9, 0.12, 16), M('#8a5a3a'), x, 1, z); mesh(new T.CylinderGeometry(0.15, 0.2, 1, 8), M('#5b3a29'), x, 0.5, z);
        var bd = mesh(new T.BoxGeometry(0.9, 0.04, 0.9), M('#f2e3c4'), x, 1.08, z); for (var a = 0; a < 4; a++) for (var b = 0; b < 4; b++) if ((a + b) % 2) mesh(new T.BoxGeometry(0.22, 0.02, 0.22), M('#7b5a3c'), (a - 1.5) * 0.225, 0.03, (b - 1.5) * 0.225, bd, false);
        W.col.push({ x: x, z: z, r: 1.2 });
      });
      sign(L, 4.5, 0); hitBox(12, 4, 12, L.x, 2, L.z, { type: 'loc', id: L.id });
    })(Lb.park);
    // home: cottage
    (function (L) {
      var g = new T.Group();
      mesh(new T.BoxGeometry(6, 4, 5), M('#ffe2b8'), 0, 2, 0, g);
      var rf = mesh(new T.ConeGeometry(5, 2.8, 4), M('#c0392b'), 0, 5.4, 0, g); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.85);
      mesh(new T.BoxGeometry(0.8, 2, 0.8), M('#8d6e63'), 1.6, 6, 0.6, g);
      windows(g, 5, 4, 5, 1, 2, 2.2); door(g, 2.5, 1.3);
      face(g, L); W.col.push({ x: L.x, z: L.z, r: L.r });
      hitBox(6.5, 7, 5.5, 0, 3.5, 0, { type: 'loc', id: L.id }, g); sign(L, 7.5, 0);
    })(Lb.home);

    // rivals stand in an arc beside the Arena gate (kept clear of trees)
    W.rivalSpot = function (k) { var AL = Lb.arena, a = Math.atan2(AL.door[0] - AL.x, AL.door[1] - AL.z) + 0.5 + k * 0.32; return { x: AL.x + Math.sin(a) * 11, z: AL.z + Math.cos(a) * 11, a: a }; };
    BOSSES.forEach(function (b, k) { var rs = W.rivalSpot(k); W.col.push({ x: rs.x, z: rs.z, r: 1 }); });
    // ---- trees and clouds
    var trunkG = new T.CylinderGeometry(0.22, 0.3, 1.6, 6), leafG = new T.IcosahedronGeometry(1.4, 0), pineG = new T.ConeGeometry(1.3, 3.2, 7);
    var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function free(x, z, m) {
      if (Math.hypot(x, z) < 10) return false;
      for (var k = 0; k < W.col.length; k++) if (Math.hypot(x - W.col[k].x, z - W.col[k].z) < W.col[k].r + m) return false;
      for (var q = 0; q < CAREER_LOCS.length; q++) { var L = CAREER_LOCS[q], a = Math.atan2(L.door[0], L.door[1]), d = x * Math.sin(a) + z * Math.cos(a), off = Math.abs(x * Math.cos(a) - z * Math.sin(a)); if (d > 0 && d < Math.hypot(L.door[0], L.door[1]) + 2 && off < 3.2) return false; }
      return true;
    }
    W.free = free;
    for (var n = 0; n < 70; n++) {
      var a = rnd() * Math.PI * 2, d = 12 + rnd() * 52, tx = Math.sin(a) * d, tz = Math.cos(a) * d; if (!free(tx, tz, 1.6)) continue;
      mesh(trunkG, M('#7a5230'), tx, 0.8, tz);
      if (rnd() < 0.5) mesh(leafG, M(['#3f9b47', '#58b15a', '#2f8a3c'][n % 3], { flatShading: true }), tx, 2.6, tz).scale.set(1, 1.1, 1);
      else mesh(pineG, M('#2e7d4f', { flatShading: true }), tx, 3, tz);
      W.col.push({ x: tx, z: tz, r: 0.7 });
    }
    W.clouds = [];
    for (var c = 0; c < 9; c++) {
      var cg = new T.Group(), cm = M('#ffffff');
      for (var b2 = 0; b2 < 4; b2++) mesh(new T.SphereGeometry(1.4 + rnd() * 1.2, 8, 6), cm, b2 * 1.6, rnd() * 0.6, rnd() * 0.8, cg, false);
      cg.position.set(-60 + rnd() * 120, 18 + rnd() * 8, -60 + rnd() * 120); sc.add(cg); W.clouds.push(cg);
    }

    // ---- people
    function person(o) {
      var g = new T.Group(), body = new T.Group(); g.add(body);
      var legG = new T.BoxGeometry(0.24, 0.8, 0.28); legG.translate(0, -0.4, 0);
      var armG = new T.BoxGeometry(0.18, 0.72, 0.2); armG.translate(0, -0.33, 0);
      var lL = mesh(legG, M(o.pants || '#2d3142'), -0.15, 0.82, 0, body), lR = mesh(legG, M(o.pants || '#2d3142'), 0.15, 0.82, 0, body);
      mesh(new T.BoxGeometry(0.66, 0.78, 0.38), M(o.shirt), 0, 1.22, 0, body);
      var aL = mesh(armG, M(o.shirt), -0.43, 1.56, 0, body), aR = mesh(armG, M(o.shirt), 0.43, 1.56, 0, body);
      var hd = mesh(new T.BoxGeometry(0.5, 0.5, 0.48), M(o.skin || '#f1c27d'), 0, 1.9, 0, body);
      mesh(new T.BoxGeometry(0.54, 0.18, 0.52), M(o.hair || '#3b2a1e'), 0, 0.25, -0.02, hd);
      if (o.hat) mesh(new T.CylinderGeometry(0.2, 0.34, 0.34, 10), M(o.hat), 0, 0.46, 0, hd);
      var eyeG = new T.BoxGeometry(0.07, 0.08, 0.02), eyeM = M('#1b1a22');
      mesh(eyeG, eyeM, -0.12, 0.03, 0.25, hd, false); mesh(eyeG, eyeM, 0.12, 0.03, 0.25, hd, false);
      if (o.beard) mesh(new T.BoxGeometry(0.42, 0.16, 0.06), M(o.hair), 0, -0.17, 0.25, hd, false);
      var blob = new T.Mesh(new T.CircleGeometry(0.55, 16), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
      blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; g.add(blob);
      sc.add(g);
      return { g: g, body: body, lL: lL, lR: lR, aL: aL, aR: aR, ph: Math.random() * 6, speed: 0 };
    }
    function animate(p, dt) {
      p.ph += dt * (4 + p.speed * 1.7);
      var k = Math.min(1, p.speed / 4), s = Math.sin(p.ph) * 0.75 * k;
      p.lL.rotation.x = s; p.lR.rotation.x = -s; p.aL.rotation.x = -s * 0.8; p.aR.rotation.x = s * 0.8;
      p.body.position.y = (p.lift || 0) + Math.abs(Math.sin(p.ph)) * 0.07 * k + (k < 0.1 ? Math.sin(W.t * 2 + p.g.id) * 0.012 : 0);
      if (p.wave) { p.aR.rotation.x = -2.6 + Math.sin(W.t * 8) * 0.35; p.aR.rotation.z = 0.2; } else p.aR.rotation.z = 0;
    }
    W.person = person; W.animate = animate;
    var P = person({ shirt: '#c4ff3d', pants: '#24304f', hair: '#2b1d14' });
    P.g.position.set(0, 0, 9); W.P = P;

    // Coach Leo, by the Academy door
    var leo = person({ shirt: '#8b1e3f', pants: '#2b2b3a', hair: '#9aa0a6', beard: true, skin: '#e0ac69' });
    leo.g.position.set(3.4, 0, -17.2); leo.g.rotation.y = 0.3; leo.id = 'leo'; leo.name = 'Coach Leo';
    var ll = label('Coach Leo', 'Your coach', '#c4ff3d', 0.62); ll.position.y = 3; leo.g.add(ll);
    hitBox(1.4, 2.6, 1.4, 0, 1.3, 0, { type: 'npc', id: 'leo' }, leo.g); W.npcs.push(leo); W.col.push({ x: 3.4, z: -17.2, r: 0.6 });
    // rivals in a semicircle in front of the Arena
    var AL = Lb.arena;
    BOSSES.forEach(function (b, k) {
      var rs = W.rivalSpot(k), x = rs.x, z = rs.z, base = rs.a;
      var p = person({ shirt: b.color, pants: '#1b1a22', hair: ['#1b1a22', '#d35400', '#111', '#7f8c8d', '#ecf0f1'][k] || '#222', hat: k === 4 ? '#1b1a22' : null, beard: k === 4 });
      p.g.position.set(x, 0, z); p.g.rotation.y = Math.atan2(-Math.sin(base), -Math.cos(base)) + Math.PI; p.id = 'boss-' + b.id; p.boss = b; p.name = b.name;
      mesh(new T.CylinderGeometry(0.8, 0.9, 0.3, 16), M(b.color), 0, 0.15, 0, p.g);
      p.body.position.y = 0.3; p.lift = 0.3;
      var lb = label(b.name, STAGES[b.stage].name, b.color, 0.62); lb.position.y = 3.3; p.g.add(lb); p.lbl = lb;
      hitBox(1.6, 2.8, 1.6, 0, 1.4, 0, { type: 'npc', id: p.id }, p.g); W.npcs.push(p);
    });
    // townsfolk walking between the buildings
    var spots = CAREER_LOCS.map(function (L) { return [L.door[0] * 0.8, L.door[1] * 0.8]; }).concat([[0, 8], [8, 0], [-8, 0], [0, -8]]);
    W.spots = spots;
    ['#4cc9f0', '#ff8c42', '#f78fb3', '#a29bfe', '#55efc4', '#fdcb6e'].forEach(function (c, k) {
      var p = person({ shirt: c, pants: ['#2d3436', '#6c5ce7', '#2d3142'][k % 3], hair: ['#2b1d14', '#e1b382', '#111', '#6d4c41'][k % 4], skin: ['#f1c27d', '#c68642', '#8d5524', '#ffdbac'][k % 4] });
      var s = spots[k % spots.length]; p.g.position.set(s[0] + 1, 0, s[1] + 1); p.goal = spots[(k + 2) % spots.length]; p.wait = k; W.walkers.push({ p: p });
    });
    // tap marker and quest star
    W.ring = new T.Mesh(new T.RingGeometry(0.35, 0.55, 24), new T.MeshBasicMaterial({ color: '#c4ff3d', transparent: true, opacity: 0, depthWrite: false })); W.ring.rotation.x = -Math.PI / 2; W.ring.position.y = 0.06; sc.add(W.ring);
    W.star = new T.Mesh(new T.OctahedronGeometry(0.55), new T.MeshLambertMaterial({ color: new T.Color('#ffd23f').convertSRGBToLinear(), emissive: new T.Color('#ffb000').convertSRGBToLinear(), emissiveIntensity: 0.7 })); sc.add(W.star);
    W.beam = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 30, 12, 1, true), new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide })); sc.add(W.beam);
    W.ray = new T.Raycaster(); W.v2 = new T.Vector2();
    return W;
  }

  // daily golden pawns: five spots chosen by the date
  function careerPawns(W) {
    var T = THREE, day = dayKey(), st = S.careerSt; if (!st.pawns || st.pawns.day !== day) st.pawns = { day: day, got: [] };
    W.pawns.forEach(function (p) { W.sc.remove(p.m); }); W.pawns = [];
    var h = 0; for (var i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) % 100003;
    var g = new T.LatheGeometry(W.PAWN.map(function (p) { return new T.Vector2(p[0] * 0.5, p[1] * 0.5); }), 16), m = new T.MeshLambertMaterial({ color: new T.Color('#ffd23f').convertSRGBToLinear(), emissive: new T.Color('#c98a00').convertSRGBToLinear(), emissiveIntensity: 0.55 });
    var tries = 0;
    for (var k = 0; W.pawns.length < 5 && tries < 400; k++, tries++) {
      h = (h * 16807 + 7) % 2147483647; var a = (h % 6283) / 1000; h = (h * 16807 + 7) % 2147483647; var d = 9 + (h % 3800) / 100;
      var x = Math.sin(a) * d, z = Math.cos(a) * d; if (!W.free(x, z, 1.2)) continue;
      var idx = W.pawns.length; if (st.pawns.got.indexOf(idx) >= 0) { W.pawns.push({ x: x, z: z, got: true }); continue; }
      var o = new T.Mesh(g, m); o.position.set(x, 0.5, z); W.sc.add(o); W.pawns.push({ x: x, z: z, m: o });
    }
  }

  function careerHud(host) {
    host.insertAdjacentHTML('beforeend',
      '<div class="w-top"><div class="w-quest"><span class="w-ch" id="w-ch"></span><span class="w-qt"><i class="w-arrow" id="w-arrow" aria-hidden="true">➤</i><b id="w-qt"></b></span></div>' +
      '<div class="w-btns"><span class="w-pawns" id="w-pawns" title="Golden pawns found today"></span><button class="w-btn" data-wact="list">☰ List</button></div></div>' +
      '<div class="w-card" id="w-card" hidden></div><div class="w-dlg" id="w-dlg" hidden></div><div class="w-note" id="w-note" hidden></div><div class="w-fade" id="w-fade"></div>');
  }

  function careerLayout() {
    if (!CW) return;
    var top = $('.top').getBoundingClientRect().bottom, rail = $('.rail').getBoundingClientRect(), mob = document.body.classList.contains('mob');
    var box = CW.host.style; box.top = top + 'px'; box.left = (mob ? 0 : rail.right) + 'px'; box.right = '0'; box.bottom = (mob ? Math.max(0, innerHeight - rail.top) : 0) + 'px';
    var w = CW.host.clientWidth, h = CW.host.clientHeight; if (!w || !h) return;
    CW.r.setSize(w, h, false); CW.r.domElement.style.width = w + 'px'; CW.r.domElement.style.height = h + 'px';
    CW.cam.aspect = w / h; CW.cam.fov = w / h < 0.8 ? 62 : 50; CW.cam.updateProjectionMatrix();
  }

  function careerNote(t, ms) { var n = $('#w-note'); if (!n) return; n.textContent = t; n.hidden = false; clearTimeout(careerNote._t); careerNote._t = setTimeout(function () { n.hidden = true; }, ms || 3200); }

  function careerTarget(id) {
    if (!id) return null;
    if (id === 'leo' || id.indexOf('boss-') === 0) { var p = CW.npcs.filter(function (n) { return n.id === id; })[0]; return p ? { x: p.g.position.x, z: p.g.position.z, y: 3.9 + (p.lift || 0) } : null; }
    var L = CAREER_LOCS.filter(function (l) { return l.id === id; })[0]; return L ? { x: L.door[0], z: L.door[1], y: 3.2 } : null;
  }
  function careerRefresh() {
    var q = careerQuest(), ch = careerChapter(); CW.q = q;
    $('#w-ch').textContent = ch < STAGES.length ? 'Chapter ' + (ch + 1) + ' · ' + STAGES[ch].name : 'Ascent Town · cleared';
    $('#w-qt').textContent = q.t;
    var tg = careerTarget(q.target); CW.tg = tg; CW.star.visible = CW.beam.visible = !!tg; $('#w-arrow').style.visibility = tg ? 'visible' : 'hidden';
    var pw = S.careerSt.pawns; $('#w-pawns').textContent = '♟ ' + (pw ? pw.got.length : 0) + '/5';
    CW.npcs.forEach(function (n) {
      if (!n.boss) return; var b = n.boss, beat = S.bosses[b.id], open = bossOpen(b.stage);
      n.wave = !beat && open && q.target === n.id; n.g.visible = true;
      n.lbl.material.opacity = open || beat ? 1 : 0.45;
    });
    var leo = CW.npcs[0]; leo.wave = q.target === 'leo';
  }

  // ---- what happens when you reach a building or a person
  function careerLocCard(L) {
    var acts = [];
    if (L.id === 'academy') { var nl = nextLesson(); if (nl) acts.push(['lesson', 'Next lesson: ' + LESSONS[nl].title, nl, 1]); acts.push(['path', 'All lessons']); }
    if (L.id === 'tower') { acts.push(['daily', 'Daily puzzle #' + dailyNo() + (dailyRec(dailyNo()) ? ' ✓' : ''), null, !dailyRec(dailyNo())]); acts.push(['puzzles', 'Puzzle ladder']); if (S.myPz && S.myPz.length) acts.push(['mine', 'Train my mistakes']); }
    if (L.id === 'library') acts.push(['openings', 'Learn openings', null, 1]);
    if (L.id === 'arena') { acts.push(['arena', 'Enter the Arena', null, 1]); }
    if (L.id === 'park') { acts.push(['play', 'Play the coach', null, 1]); acts.push(['friend', 'Play a friend on this phone']); }
    if (L.id === 'home') { acts.push(['progress', 'My progress', null, 1]); acts.push(['program', '30-Day Ascent']); acts.push(['mychess', 'My chess.com']); }
    var c = $('#w-card'); CW.cardFor = L.id;
    c.innerHTML = '<div class="w-card-h"><b>' + esc(L.name) + '</b><span>' + esc(L.sub) + '</span></div><div class="w-card-a">' + acts.map(function (a) { return '<button class="btn ' + (a[3] ? 'primary' : 'ghost') + ' small" data-wact="enter" data-loc="' + L.id + '" data-m="' + a[0] + '"' + (a[2] ? ' data-arg="' + a[2] + '"' : '') + '>' + esc(a[1]) + '</button>'; }).join('') + '</div>';
    c.hidden = false;
  }
  function careerTalk(n) {
    var d = $('#w-dlg'), q = careerQuest(), html, line, btn = '';
    careerFace(n);
    if (n.id === 'leo') {
      if (!S.careerSt.met) { S.careerSt.met = true; S.careerSt.ch = careerChapter(); save(); line = 'welcome'; setTimeout(careerRefresh, 50); }
      else line = q.line;
      var tx = CAREER_TEXT[line];
      if (q.lesson && line === 'lesson_go') { tx = 'Next up: ' + LESSONS[q.lesson].title + '. ' + LESSONS[q.lesson].goal + ' Step into the Academy when you are ready.'; btn = '<button class="btn primary small" data-wact="enter" data-loc="academy" data-m="lesson" data-arg="' + q.lesson + '">Start the lesson</button>'; }
      else if (q.boss) btn = '<button class="btn primary small" data-wact="walk" data-to="boss-' + q.boss.id + '">Walk me there</button>';
      else if (line === 'welcome') btn = '<button class="btn primary small" data-wact="walk" data-to="academy">Show me the Academy</button>';
      html = '<b class="w-who">Coach Leo</b><p>' + esc(tx) + '</p>';
      Voice.say([line === 'lesson_go' && q.lesson ? null : WL(line)].filter(Boolean));
    } else {
      var b = n.boss, beat = S.bosses[b.id], open = bossOpen(b.stage), need = bossNeed(b.stage);
      var t = beat ? CAREER_TEXT.boss_beaten : open ? CAREER_TEXT['boss_' + b.id] : CAREER_TEXT.boss_locked;
      html = '<b class="w-who" style="color:' + b.color + '">' + esc(b.name) + ' · ' + esc(b.title) + '</b><p>' + esc(t) + '</p>' + (open ? '<p class="w-small">' + esc(b.intro) + '</p>' : need ? '<p class="w-small">' + need + ' more lesson' + (need > 1 ? 's' : '') + ' in ' + esc(STAGES[b.stage].name) + ' to unlock this fight.</p>' : '');
      if (open) btn = '<button class="btn primary small" data-wact="boss" data-id="' + b.id + '">' + (beat ? 'Rematch' : 'Challenge ' + esc(b.name.split(' ')[1] || b.name)) + '</button>';
      Voice.say([WL(beat ? 'boss_beaten' : open ? 'boss_' + b.id : 'boss_locked')]);
    }
    d.innerHTML = html + '<div class="w-card-a">' + btn + '<button class="btn ghost small" data-wact="close">Bye</button></div>';
    d.hidden = false; $('#w-card').hidden = true; CW.talking = n.id;
  }
  function careerFace(n) { var p = CW.P.g.position, q = n.g.position; n.g.rotation.y = Math.atan2(p.x - q.x, p.z - q.z); CW.P.g.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); }
  function careerWalkTo(id) {
    var t = careerTarget(id); if (!t) return;
    var p = CW.P.g.position, dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz) || 1, stop = id.indexOf('boss-') === 0 || id === 'leo' ? 1.8 : 0.2;
    CW.goal = { x: t.x + dx / d * stop, z: t.z + dz / d * stop }; CW.pend = id; $('#w-dlg').hidden = true; CW.talking = null;
  }
  function careerEnter(locId, mode, arg) {
    var L = CAREER_LOCS.filter(function (l) { return l.id === locId; })[0];
    S.careerSt.at = locId; save();
    CW.pend = null; CW.goal = null; CW.entering = true; $('#w-card').hidden = true; $('#w-dlg').hidden = true;
    if (L) { var a = Math.atan2(L.x - L.door[0], L.z - L.door[1]); CW.goal = { x: L.door[0] + Math.sin(a) * 1.4, z: L.door[1] + Math.cos(a) * 1.4 }; }
    Sound.play('good'); $('#w-fade').classList.add('on');
    setTimeout(function () {
      CW.entering = false;
      if (mode === 'lesson') return go('lesson', arg);
      if (mode === 'path') { S.career = false; return go('path'); }
      go(mode, arg || undefined);
    }, 650);
  }

  function careerInput(W) {
    var el = W.r.domElement, down = null, pinch = null;
    el.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, yaw: W.camYaw, h: W.camH, moved: false, id: e.pointerId }; try { el.setPointerCapture(e.pointerId); } catch (x) { } Sound.unlock && Sound.unlock(); });
    el.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== down.id) return; var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 8) down.moved = true;
      if (down.moved) { W.camYaw = down.yaw - dx * 0.008; W.camH = Math.max(5, Math.min(22, down.h + dy * 0.04)); }
    });
    el.addEventListener('pointerup', function (e) {
      if (!down || e.pointerId !== down.id) return; var d = down; down = null; if (d.moved) return;
      var rc = el.getBoundingClientRect(); W.v2.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      W.ray.setFromCamera(W.v2, W.cam);
      var hit = W.ray.intersectObjects(W.hits, false)[0];
      if (hit && hit.object.userData.hit) { var h = hit.object.userData.hit; careerWalkTo(h.id); careerNote(h.type === 'npc' ? 'Walking over…' : 'Heading to ' + (CAREER_LOCS.filter(function (l) { return l.id === h.id; })[0] || {}).name + '…', 1400); return; }
      var g = W.ray.intersectObject(W.ground, false)[0];
      if (g) { W.goal = { x: g.point.x, z: g.point.z }; W.pend = null; W.ring.position.x = g.point.x; W.ring.position.z = g.point.z; W.ring.material.opacity = 1; W.ring.scale.set(1, 1, 1); $('#w-dlg').hidden = true; W.talking = null; }
    });
    el.addEventListener('wheel', function (e) { e.preventDefault(); W.camDist = Math.max(7, Math.min(26, W.camDist + e.deltaY * 0.01)); }, { passive: false });
    W.onKey = function (e) {
      if (current !== MODES.career) return; var k = e.key.toLowerCase(), down = e.type === 'keydown';
      if (/^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright)$/.test(k)) { W.keys[k] = down; e.preventDefault(); W.goal = null; W.pend = null; }
      if (down && (k === 'e' || k === 'enter')) { var b = document.querySelector('#w-dlg:not([hidden]) .btn.primary, #w-card:not([hidden]) .btn.primary'); if (b) b.click(); else if (W.near && W.near.npc) careerTalk(W.near.npc); }
      if (down && k === 'escape') { $('#w-dlg').hidden = true; W.talking = null; }
    };
    window.addEventListener('keydown', W.onKey); window.addEventListener('keyup', W.onKey);
    W.host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-wact]'); if (!b) return; var a = b.dataset.wact;
      if (a === 'enter') careerEnter(b.dataset.loc, b.dataset.m, b.dataset.arg);
      if (a === 'close') { $('#w-dlg').hidden = true; W.talking = null; }
      if (a === 'walk') careerWalkTo(b.dataset.to);
      if (a === 'boss') { S.careerSt.at = 'arena'; save(); $('#w-fade').classList.add('on'); setTimeout(function () { ACT.boss({ id: b.dataset.id }); }, 500); }
      if (a === 'list') { S.career = false; save(); go('path'); }
    });
  }

  function careerStep(dt) {
    var W = CW, P = W.P, p = P.g.position, T = THREE; W.t += dt;
    // movement: keys (relative to the camera) or walking to a goal
    var mx = 0, mz = 0, K = W.keys;
    if (K.w || K.arrowup) mz -= 1; if (K.s || K.arrowdown) mz += 1; if (K.a || K.arrowleft) mx -= 1; if (K.d || K.arrowright) mx += 1;
    var vx = 0, vz = 0, sp = 6.2;
    if (mx || mz) { var cy = Math.cos(W.camYaw), sy = Math.sin(W.camYaw), l = Math.hypot(mx, mz); vx = (mx * cy + mz * sy) / l * sp; vz = (-mx * sy + mz * cy) / l * sp; }
    else if (W.goal) {
      var dx = W.goal.x - p.x, dz = W.goal.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { W.goal = null; if (W.pend) { var id = W.pend; W.pend = null; careerArrive(id); } }
      else { var s2 = Math.min(sp, d * 4); vx = dx / d * s2; vz = dz / d * s2; }
    }
    var ox = p.x, oz = p.z; p.x += vx * dt; p.z += vz * dt;
    // keep out of buildings, trees and statues; slide along them
    W.col.forEach(function (c) { var ex = p.x - c.x, ez = p.z - c.z, e = Math.hypot(ex, ez), m = c.r + 0.45; if (e < m && e > 0.0001) { p.x = c.x + ex / e * m; p.z = c.z + ez / e * m; } });
    var R = Math.hypot(p.x, p.z); if (R > 62) { p.x *= 62 / R; p.z *= 62 / R; }
    var moved = Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-3);
    if (W.goal && moved < 0.3 && Math.hypot(vx, vz) > 1) { W.stuck = (W.stuck || 0) + dt; if (W.stuck > 0.6) { W.goal = null; W.stuck = 0; if (W.pend) { var id2 = W.pend; W.pend = null; careerArrive(id2); } } } else W.stuck = 0;
    P.speed = moved; if (moved > 0.2) { var want = Math.atan2(p.x - ox, p.z - oz), cur = P.g.rotation.y, df = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)); P.g.rotation.y = cur + df * Math.min(1, dt * 12); }
    W.animate(P, dt);
    // townsfolk
    W.walkers.forEach(function (w) {
      if (w.flag) { w.flag.rotation.y = Math.sin(W.t * 3 + w.ph) * 0.3; return; }
      var q = w.p, gp = q.g.position;
      if (q.wait > 0) { q.wait -= dt; q.speed = 0; } else {
        var dx2 = q.goal[0] - gp.x, dz2 = q.goal[1] - gp.z, d2 = Math.hypot(dx2, dz2);
        if (d2 < 0.4) { q.wait = 1.5 + Math.random() * 4; q.goal = W.spots[Math.floor(Math.random() * W.spots.length)]; q.goal = [q.goal[0] + Math.random() * 2 - 1, q.goal[1] + Math.random() * 2 - 1]; }
        else { var s3 = 2.1; gp.x += dx2 / d2 * s3 * dt; gp.z += dz2 / d2 * s3 * dt; q.g.rotation.y = Math.atan2(dx2, dz2); q.speed = s3; }
        W.col.forEach(function (c) { var ex = gp.x - c.x, ez = gp.z - c.z, e = Math.hypot(ex, ez), m = c.r + 0.4; if (e < m && e > 0.0001) { gp.x = c.x + ex / e * m; gp.z = c.z + ez / e * m; } });
      }
      W.animate(q, dt);
    });
    W.npcs.forEach(function (n) { n.speed = 0; W.animate(n, dt); });
    W.clouds.forEach(function (c, k) { c.position.x += dt * (0.6 + k * 0.05); if (c.position.x > 75) c.position.x = -75; });
    if (W.towerGem) W.towerGem.rotation.y += dt * 1.5;
    // golden pawns
    W.pawns.forEach(function (g, k) {
      if (g.got) return; g.m.rotation.y += dt * 2; g.m.position.y = 0.45 + Math.sin(W.t * 3 + k) * 0.12;
      if (Math.hypot(p.x - g.x, p.z - g.z) < 1.1) {
        g.got = true; W.sc.remove(g.m); var pw = S.careerSt.pawns; pw.got.push(k); addXP(5); Sound.play('star');
        if (pw.got.length >= 5) { addXP(25); careerNote('♟ All 5 golden pawns! +25 bonus XP', 4000); Voice.say([WL('pawns_all')]); } else careerNote('♟ Golden pawn ' + pw.got.length + ' of 5 · +5 XP', 2200);
        save(); $('#w-pawns').textContent = '♟ ' + pw.got.length + '/5';
      }
    });
    // quest star and arrow
    if (W.tg) { W.star.position.set(W.tg.x, W.tg.y + Math.sin(W.t * 2.5) * 0.25, W.tg.z); W.star.rotation.y += dt * 2; W.beam.position.set(W.tg.x, 15, W.tg.z); }
    if (W.ring.material.opacity > 0) { W.ring.material.opacity = Math.max(0, W.ring.material.opacity - dt * 1.4); var rs = 1 + (1 - W.ring.material.opacity) * 0.8; W.ring.scale.set(rs, rs, rs); }
    // camera follows from behind and above
    var cx = p.x + Math.sin(W.camYaw) * W.camDist, cz = p.z + Math.cos(W.camYaw) * W.camDist, k2 = Math.min(1, dt * 4);
    W.cam.position.x += (cx - W.cam.position.x) * k2; W.cam.position.z += (cz - W.cam.position.z) * k2; W.cam.position.y += (W.camH - W.cam.position.y) * k2;
    W.cam.lookAt(p.x - Math.sin(W.camYaw) * 4, 1.5, p.z - Math.cos(W.camYaw) * 4);
    if (W.tg) {
      var fx = -Math.sin(W.camYaw), fz = -Math.cos(W.camYaw), tx = W.tg.x - p.x, tz = W.tg.z - p.z, sx = tx * (-fz) + tz * fx, sy2 = tx * fx + tz * fz;
      var ar = $('#w-arrow'); if (ar) ar.style.transform = 'rotate(' + (Math.atan2(sx, sy2) * 180 / Math.PI - 90) + 'deg)';
    }
    // what is close enough to talk to or enter
    var near = null, best = 3;
    CW.npcs.forEach(function (n) { var e = Math.hypot(p.x - n.g.position.x, p.z - n.g.position.z); if (e < best) { best = e; near = { npc: n }; } });
    if (!near) CAREER_LOCS.forEach(function (L) { var e = Math.hypot(p.x - L.door[0], p.z - L.door[1]); if (e < 3.2 && e < best) { best = e; near = { loc: L }; } });
    if (!W.entering) {
      var key = near ? (near.npc ? near.npc.id : near.loc.id) : null;
      if (key !== W.nearKey) {
        W.nearKey = key;
        if (W.talking && W.talking !== key) { $('#w-dlg').hidden = true; W.talking = null; }
        if (near && near.loc) careerLocCard(near.loc);
        else if (near && near.npc && !W.talking) { var c = $('#w-card'); c.innerHTML = '<div class="w-card-h"><b>' + esc(near.npc.name) + '</b></div><div class="w-card-a"><button class="btn primary small" data-wact="talk">Talk</button></div>'; c.hidden = false; c.querySelector('[data-wact="talk"]').onclick = function () { careerTalk(near.npc); }; }
        else $('#w-card').hidden = true;
        if (!near && W.talking) { $('#w-dlg').hidden = true; W.talking = null; }
      }
    }
    W.near = near;
  }
  function careerArrive(id) {
    if (id === 'leo' || id.indexOf('boss-') === 0) { var n = CW.npcs.filter(function (x) { return x.id === id; })[0]; if (n) careerTalk(n); return; }
    var L = CAREER_LOCS.filter(function (l) { return l.id === id; })[0]; if (L) { CW.nearKey = L.id; careerLocCard(L); Voice.say([WL(L.line)], true); }
  }
  function careerLoop() {
    if (!CW || !CW.on) return;
    var now = performance.now(), dt = Math.min(0.1, (now - (CW.last || now)) / 1000); CW.last = now;
    careerStep(dt); CW.r.render(CW.sc, CW.cam);
    CW.raf = requestAnimationFrame(careerLoop);
  }

  MODES.career = {
    label: 'Career',
    enter: function () {
      if (!window.THREE || !THREE.WebGLRenderer) { toast('Career mode needs 3D graphics, which did not load. Here is the list view.'); S.career = false; return go('path'); }
      S.career = true; S.careerSt = S.careerSt || {}; save();
      var first = false;
      if (!CW) {
        var host = document.createElement('div'); host.id = 'world'; document.body.appendChild(host);
        try { CW = careerBuild(host); } catch (e) { host.remove(); CW = null; toast('Career mode could not start 3D here. Here is the list view.'); S.career = false; return go('path'); }
        careerHud(host); careerInput(CW); first = true;
        window.addEventListener('resize', careerLayout);
        if (window.visualViewport) visualViewport.addEventListener('resize', careerLayout);
      }
      CW.host.hidden = false; CW.on = true; CW.last = 0; careerLayout(); B3.pause(true);
      careerPawns(CW); careerRefresh();
      setPanel('');
      // come back out of the building you went into
      var at = S.careerSt.at && CAREER_LOCS.filter(function (l) { return l.id === S.careerSt.at; })[0], p = CW.P.g.position;
      if (at) {
        var a = Math.atan2(at.door[0] - at.x, at.door[1] - at.z); p.set(at.door[0] - Math.sin(a) * 0.6, 0, at.door[1] - Math.cos(a) * 0.6);
        CW.goal = { x: at.door[0] + Math.sin(a) * 4.5, z: at.door[1] + Math.cos(a) * 4.5 }; CW.P.g.rotation.y = a; CW.camYaw = a + 0.35; S.careerSt.at = null; save();
      }
      CW.cam.position.set(p.x + Math.sin(CW.camYaw) * CW.camDist, CW.camH, p.z + Math.cos(CW.camYaw) * CW.camDist);
      CW.nearKey = undefined; CW.talking = null; $('#w-dlg').hidden = true; $('#w-card').hidden = true;
      var fade = $('#w-fade'); fade.classList.add('on'); setTimeout(function () { fade.classList.remove('on'); }, 60);
      // chapter banner when a new chapter opens
      var ch = careerChapter(), seen = S.careerSt.ch;
      if (S.careerSt.met && seen != null && ch > seen && ch < STAGES.length) setTimeout(function () { careerBanner(ch); }, 700);
      S.careerSt.ch = ch; save();
      if (!S.careerSt.met) setTimeout(function () { if (current === MODES.career) { careerNote(CW.mob ? CAREER_TEXT.hint_tap : CAREER_TEXT.hint_keys, 6000); } }, 900);
      else if (first && !at) setTimeout(function () { if (current === MODES.career) Voice.say([WL('welcome_back')], true); }, 900);
      if (!S.careerSt.pawnHint && S.careerSt.met) { S.careerSt.pawnHint = 1; save(); setTimeout(function () { if (current === MODES.career) careerNote('♟ ' + CAREER_TEXT.pawns_intro, 5000); }, 7000); }
      cancelAnimationFrame(CW.raf); CW.raf = requestAnimationFrame(careerLoop);
    },
    leave: function () { B3.pause(false); if (!CW) return; CW.on = false; cancelAnimationFrame(CW.raf); CW.host.hidden = true; CW.keys = {}; $('#w-fade').classList.remove('on'); }
  };
  function careerBanner(ch) {
    var d = $('#w-dlg');
    d.innerHTML = '<b class="w-who">Chapter ' + (ch + 1) + ' unlocked</b><h2 class="w-big">' + esc(STAGES[ch].name) + '</h2><p>' + esc(CAREER_TEXT['ch' + ch]) + '</p><div class="w-card-a"><button class="btn primary small" data-wact="close">Let\'s go</button></div>';
    d.hidden = false; Sound.play('star'); Voice.say([WL('ch' + ch)]);
  }
  document.addEventListener('visibilitychange', function () { if (!CW) return; if (document.hidden) { cancelAnimationFrame(CW.raf); } else if (CW.on) { CW.last = 0; CW.raf = requestAnimationFrame(careerLoop); } });
  ACT.career = function () { go('career'); };
