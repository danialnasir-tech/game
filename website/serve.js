// Tiny local server so the browser can load the voice packs. Needs Node.js.
const http = require('http'), fs = require('fs'), path = require('path'), { exec } = require('child_process');
const types = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.js': 'text/javascript' };
const port = 5173;
http.createServer((req, res) => {
  let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/index.html';
  const p = path.join(__dirname, path.normalize(f).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data);
  });
}).listen(port, () => {
  const url = 'http://localhost:' + port;
  console.log('Chess Ascent is running at ' + url + '  (close this window to stop)');
  exec((process.platform === 'win32' ? 'start "" ' : process.platform === 'darwin' ? 'open ' : 'xdg-open ') + url);
});
