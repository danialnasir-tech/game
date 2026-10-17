// Chess Ascent offline support. The version changes with every build, so players get updates on their next visit.
var VERSION = '__VERSION__';
var CORE = './', SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'chess-ascent-config.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open('ca-shell-' + VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('ca-shell-') === 0 && k !== 'ca-shell-' + VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // the page itself: newest version when online, the saved copy when offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) { var cp = r.clone(); caches.open('ca-shell-' + VERSION).then(function (c) { c.put('index.html', cp); }); return r; })
      .catch(function () { return caches.match('index.html', { ignoreSearch: true }); }));
    return;
  }
  // voice packs and the 3D engine never change: keep them once downloaded
  if (/voice-pack-\d+\.mp3$/.test(url.pathname) || /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open('ca-media').then(function (c) {
      return c.match(req).then(function (hit) { return hit || fetch(req).then(function (r) { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }); });
    }));
    return;
  }
  if (url.origin === location.origin) e.respondWith(fetch(req).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
});
