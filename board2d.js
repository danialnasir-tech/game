// 2D board with the same API as the 3D board. Used when WebGL/Three.js is unavailable, or when the player picks "2D board".
function BOARD2D_FACTORY() {
  var api = {}, root, sqLayer, mkLayer, pcLayer, svgLayer, fxLayer, labels;
  var meshes = {}, stars = {}, cats = {}, orient = 'w', onClick = function () { }, hoverFn = function () { return false; }, dragFns = null, drag = null;
  var COL = { g: '#3ddc97', r: '#ff5d6c', b: '#4cc9f0', y: '#ffd23f' };
  var CAT = { hover: 'rgba(255,255,255,.12)', last: 'rgba(255,210,63,.38)', mark: 'rgba(76,201,240,.5)', sel: 'rgba(255,210,63,.6)', check: 'rgba(255,93,108,.7)', hint: 'rgba(61,220,151,.55)', bad: 'rgba(255,93,108,.6)', good: 'rgba(61,220,151,.6)' };
  function fr(sq) { var f = sq.charCodeAt(0) - 97, r = +sq[1] - 1; return orient === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r }; }
  function place(el, sq) { var p = fr(sq); el.style.left = (p.x * 12.5) + '%'; el.style.top = (p.y * 12.5) + '%'; }
  api.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function div(cls, parent) { var d = document.createElement('div'); d.className = cls; (parent || root).appendChild(d); return d; }
  api.init = function (el, clickCb, hCb) {
    onClick = clickCb; hoverFn = hCb;
    el.innerHTML = '';
    var wrap = div('b2-wrap', el); wrap.style.position = 'absolute'; wrap.style.inset = '0';
    root = div('b2-board', wrap);
    sqLayer = div('b2-squares', root); mkLayer = div('b2-layer', root); pcLayer = div('b2-layer', root); fxLayer = div('b2-layer', root);
    svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgLayer.setAttribute('viewBox', '0 0 8 8'); svgLayer.setAttribute('class', 'b2-svg'); root.appendChild(svgLayer);
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) { var s = div('b2-sq ' + ((x + y) % 2 ? 'dark' : 'light'), sqLayer); s.style.left = x * 12.5 + '%'; s.style.top = y * 12.5 + '%'; }
    labels = div('b2-labels', root);
    function fit() { var mob, w = el.clientWidth, h = el.clientHeight, mob = document.body.classList.contains('mob') || (window.matchMedia && matchMedia('(max-height: 520px) and (orientation: landscape)').matches), size = Math.max(160, mob ? Math.min(w - 20, h - 20) : Math.min(w - 24, h - 70)); root.style.width = root.style.height = size + 'px'; }
    new ResizeObserver(fit).observe(el); fit();
    drawLabels();
    root.addEventListener('pointerdown', down);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', function () { cancelDrag(); });
  };
  function drawLabels() {
    labels.innerHTML = '';
    for (var i = 0; i < 8; i++) {
      var f = div('b2-lab file', labels); f.textContent = 'abcdefgh'[orient === 'w' ? i : 7 - i]; f.style.left = (i * 12.5 + 11.2) + '%';
      var r = div('b2-lab rank', labels); r.textContent = orient === 'w' ? 8 - i : i + 1; r.style.top = (i * 12.5 + 0.6) + '%';
    }
  }
  function sqAt(e) {
    var rc = root.getBoundingClientRect(), x = Math.floor((e.clientX - rc.left) / rc.width * 8), y = Math.floor((e.clientY - rc.top) / rc.height * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    var f = orient === 'w' ? x : 7 - x, r = orient === 'w' ? 7 - y : y;
    return 'abcdefgh'[f] + (r + 1);
  }
  var downAt = null;
  function down(e) {
    var sq = sqAt(e); downAt = { x: e.clientX, y: e.clientY, sq: sq };
    if (typeof Sound !== 'undefined') try { Sound.unlock(); } catch (x) { }
    if (sq && dragFns && dragFns.can(sq) && meshes[sq]) { drag = { from: sq, el: meshes[sq], active: false }; try { root.setPointerCapture(e.pointerId); } catch (x) { } }
  }
  function move(e) {
    if (!drag) { if (e.pointerType === 'mouse') { var s = sqAt(e); root.style.cursor = s && hoverFn(s) ? 'pointer' : 'default'; } return; }
    if (!drag.active && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) { drag.active = true; drag.el.classList.add('dragging'); dragFns.start(drag.from); }
    if (!drag.active) return;
    var rc = root.getBoundingClientRect();
    drag.el.style.left = ((e.clientX - rc.left) / rc.width * 100 - 6.25) + '%';
    drag.el.style.top = ((e.clientY - rc.top) / rc.height * 100 - 6.25) + '%';
    var over = sqAt(e); api.markers('hover', over ? [over] : []);
  }
  function cancelDrag() { if (!drag) return; var d = drag; drag = null; d.el.classList.remove('dragging'); place(d.el, d.from); api.markers('hover', []); }
  function up(e) {
    if (drag && drag.active) {
      var d = drag; drag = null; d.el.classList.remove('dragging'); api.markers('hover', []);
      var to = sqAt(e), ok = false;
      try { ok = !!(to && to !== d.from && dragFns.drop(d.from, to)); } catch (x) { ok = false; }
      if (!ok) place(d.el, d.from);
      downAt = null; return;
    }
    drag = null;
    if (!downAt) return;
    var moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y); downAt = null;
    if (moved > 7) return;
    var sq = sqAt(e); if (sq) onClick(sq);
  }
  function makePiece(sq, type, color) {
    var p = div('b2-piece', pcLayer); p.innerHTML = pieceSVG(type, color, 100); p.dataset.t = type; p.dataset.c = color; place(p, sq); meshes[sq] = p; return p;
  }
  function parseFen(fen) {
    var out = {}, rows = fen.split(' ')[0].split('/');
    rows.forEach(function (row, ri) { var f = 0; for (var i = 0; i < row.length; i++) { var ch = row[i]; if (/\d/.test(ch)) { f += +ch; continue; } out['abcdefgh'[f] + (8 - ri)] = { type: ch.toLowerCase(), color: ch === ch.toLowerCase() ? 'b' : 'w' }; f++; } });
    return out;
  }
  api.setPosition = function (fen, opts) {
    Object.keys(meshes).forEach(function (k) { meshes[k].remove(); }); meshes = {};
    var map = parseFen(fen), n = 0;
    Object.keys(map).forEach(function (sq) { var p = makePiece(sq, map[sq].type, map[sq].color); if (opts && opts.drop) { p.style.animationDelay = (n++ * 12) + 'ms'; p.classList.add('drop'); } });
    return Promise.resolve();
  };
  api.sync = function (fen) {
    var map = parseFen(fen);
    Object.keys(meshes).forEach(function (sq) { var m = meshes[sq], w = map[sq]; if (!w || w.type !== m.dataset.t || w.color !== m.dataset.c) { m.remove(); delete meshes[sq]; } else place(m, sq); });
    Object.keys(map).forEach(function (sq) { if (!meshes[sq]) makePiece(sq, map[sq].type, map[sq].color); });
  };
  api.settle = function (fen) { api.sync(fen); };
  api.animateMove = function (mv, fenAfter) {
    var m = meshes[mv.from];
    if (!m) { if (fenAfter) api.sync(fenAfter); return Promise.resolve(); }
    var capSq = mv.flags === 'e' ? mv.to[0] + mv.from[1] : mv.to, victim = mv.captured ? meshes[capSq] : null;
    delete meshes[mv.from]; if (victim) delete meshes[capSq];
    meshes[mv.to] = m; m.classList.add('moving'); place(m, mv.to);
    if (mv.flags === 'k' || mv.flags === 'q') {
      var rank = mv.from[1], rf = (mv.flags === 'k' ? 'h' : 'a') + rank, rt = (mv.flags === 'k' ? 'f' : 'd') + rank, rm = meshes[rf];
      if (rm) { delete meshes[rf]; meshes[rt] = rm; place(rm, rt); }
    }
    return api.wait(mv.dropped ? 60 : 260).then(function () {
      m.classList.remove('moving');
      if (victim) { victim.classList.add('captured'); setTimeout(function () { victim.remove(); }, 250); }
      if (mv.promotion) { m.remove(); delete meshes[mv.to]; makePiece(mv.to, mv.promotion, mv.color); }
      if (fenAfter) api.sync(fenAfter);
    });
  };
  api.markers = function (cat, items) {
    (cats[cat] || []).forEach(function (d) { d.remove(); }); cats[cat] = [];
    (items || []).forEach(function (it) {
      var sq = typeof it === 'string' ? it : it.sq, d;
      if (cat === 'moves') d = div(it.cap ? 'b2-ring' : 'b2-dot', mkLayer);
      else { d = div('b2-mark', mkLayer); d.style.background = CAT[cat] || 'rgba(255,255,255,.2)'; }
      place(d, sq); cats[cat].push(d);
    });
  };
  api.flash = function (cat, sqs, ms) { api.markers(cat, sqs); setTimeout(function () { api.markers(cat, []); }, ms || 650); };
  api.arrows = function (list) {
    while (svgLayer.firstChild) svgLayer.removeChild(svgLayer.firstChild);
    (list || []).forEach(function (a) {
      var p0 = fr(a[0]), p1 = fr(a[1]), x0 = p0.x + 0.5, y0 = p0.y + 0.5, x1 = p1.x + 0.5, y1 = p1.y + 0.5;
      var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 0.1) return;
      var ux = dx / L, uy = dy / L, hx = x1 - ux * 0.38, hy = y1 - uy * 0.38;
      var c = COL[a[2] || 'g'] || COL.g;
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x0 + ux * 0.2); line.setAttribute('y1', y0 + uy * 0.2); line.setAttribute('x2', hx); line.setAttribute('y2', hy);
      line.setAttribute('stroke', c); line.setAttribute('stroke-width', '0.16'); line.setAttribute('stroke-linecap', 'round'); line.setAttribute('opacity', '0.85');
      var head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      head.setAttribute('points', [x1 - ux * 0.08, y1 - uy * 0.08, hx - uy * 0.26, hy + ux * 0.26, hx + uy * 0.26, hy - ux * 0.26].join(' '));
      head.setAttribute('fill', c); head.setAttribute('opacity', '0.85');
      svgLayer.appendChild(line); svgLayer.appendChild(head);
    });
  };
  api.stars = function (list) {
    Object.keys(stars).forEach(function (k) { stars[k].remove(); }); stars = {};
    (list || []).forEach(function (sq) { var s = div('b2-star', fxLayer); s.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" fill="#ffd23f" stroke="#c99a00" stroke-width="1"/></svg>'; place(s, sq); stars[sq] = s; });
  };
  api.takeStar = function (sq) { var s = stars[sq]; if (!s) return false; delete stars[sq]; s.classList.add('captured'); setTimeout(function () { s.remove(); }, 300); return true; };
  api.burst = function (sq) { if (!sq) return; var b = div('b2-burst', fxLayer); place(b, sq); setTimeout(function () { b.remove(); }, 700); };
  api.clearAll = function () { Object.keys(cats).forEach(function (c) { api.markers(c, []); }); api.arrows([]); api.stars([]); };
  api.setOrientation = function (c) { orient = c; drawLabels(); Object.keys(meshes).forEach(function (sq) { place(meshes[sq], sq); }); Object.keys(stars).forEach(function (sq) { place(stars[sq], sq); }); Object.keys(cats).forEach(function (k) { cats[k].forEach(function () { }); }); return Promise.resolve(); };
  api.orientation = function () { return orient; };
  api.toggleView = function () { return '2d'; };
  api.idle = function () { };
  api.recenter = function () { };
  api.setDrag = function (f) { dragFns = f; };
  var liftedEl = null;
  api.lift = function (sq) { if (liftedEl) liftedEl.classList.remove('lifted'); liftedEl = sq ? meshes[sq] || null : null; if (liftedEl) liftedEl.classList.add('lifted'); };
  api.setCameraFixed = function () { };
  api.is2D = true;
  return api;
}
