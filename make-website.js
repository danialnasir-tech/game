// Builds the folder you upload to your web host: out/chess-ascent-website/ (index.html + voice packs + settings),
// and a zip of it. Run after build.js:  node build.js && node make-website.js
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const OUT = 'out/chess-ascent-website';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync('dist/site.html', OUT + '/index.html');
const packs = fs.readdirSync('dist').filter(f => /^voice-pack-\d+\.mp3$/.test(f));
packs.forEach(f => fs.copyFileSync('dist/' + f, OUT + '/' + f));
// optional Google sign-in settings: shipped switched off (placeholder), so the game never asks for an account
fs.copyFileSync('chess-ascent-config.example.js', OUT + '/chess-ascent-config.js');
fs.writeFileSync(OUT + '/.htaccess', [
  '# Chess Ascent: correct file types, compression and caching (Apache / Hostinger / cPanel hosts)',
  'DirectoryIndex index.html',
  'AddType audio/mpeg .mp3',
  'AddType application/javascript .js',
  'AddDefaultCharset UTF-8',
  '<IfModule mod_deflate.c>',
  '  AddOutputFilterByType DEFLATE text/html application/javascript text/css',
  '</IfModule>',
  '<IfModule mod_expires.c>',
  '  ExpiresActive On',
  '  ExpiresByType audio/mpeg "access plus 30 days"',
  '  ExpiresByType text/html "access plus 0 seconds"',
  '</IfModule>',
  '<IfModule mod_headers.c>',
  '  <FilesMatch "\\.(html|js)$">',
  '    Header set Cache-Control "no-cache"',
  '  </FilesMatch>',
  '</IfModule>', ''].join('\n'));
fs.writeFileSync(OUT + '/READ-ME-FIRST.txt', [
  'CHESS ASCENT - how to put it on your website',
  '',
  '1. Upload EVERYTHING in this folder to your website (for example into public_html, or into a subfolder like public_html/chess).',
  '   Keep all files together in the same folder. Do not rename them.',
  '2. Open your website address in the browser. index.html is the start page, so https://yourdomain.com (or https://yourdomain.com/chess) opens the game.',
  '3. Done. Progress is saved in each player\'s browser.',
  '',
  'Files:',
  '  index.html               the whole game',
  '  voice-pack-1..' + packs.length + '.mp3       Coach Leo\'s voice (' + packs.length + ' files, loaded when needed)',
  '  .htaccess                makes the voice files load fast (hidden file: make sure your upload includes it)',
  '  chess-ascent-config.js   optional Google sign-in. Leave it as it is to keep sign-in switched off.',
  '',
  'Updating later: upload the new files over the old ones. Players keep their progress.',
  ''].join('\n'));
const mb = packs.reduce((s, f) => s + fs.statSync(OUT + '/' + f).size, fs.statSync(OUT + '/index.html').size) / 1048576;
// one zip of everything, plus two smaller parts (each under 30 MB) that unzip into the same folder
try {
  const packs = fs.readdirSync(OUT).filter(f => /^voice-pack-\d+\.mp3$/.test(f)).sort((a, b) => parseInt(a.slice(11)) - parseInt(b.slice(11)));
  const half = Math.ceil(packs.length / 2);
  execSync('cd out && rm -f chess-ascent-website*.zip && zip -qr chess-ascent-website.zip chess-ascent-website');
  execSync('cd ' + OUT + ' && zip -qX ../chess-ascent-website-part1.zip index.html .htaccess READ-ME-FIRST.txt chess-ascent-config.js ' + packs.slice(0, half).join(' '));
  execSync('cd ' + OUT + ' && zip -qX ../chess-ascent-website-part2.zip ' + packs.slice(half).join(' '));
} catch (e) { console.log('zip not available; upload the folder itself'); }
console.log('website folder', OUT, '| files', fs.readdirSync(OUT).length + 1, '| size', mb.toFixed(1) + ' MB');
