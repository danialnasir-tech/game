const fs=require('fs');
let js=['chesscore.js','engine.js','data.js','lessons2.js','interactive.js','career-data.js','puzzles2.js','puzzles-starter.js','puzzles-themed.js','defences.js','arena.js','practice.js','briefs.js','missions.js','voicelines.js','icons.js','board2d.js','app.js'].filter(f=>fs.existsSync(f)).map(f=>{const t=fs.readFileSync(f,'utf8');return f==='app.js'?t.replace('/*__CAREER__*/',()=>fs.readFileSync('career.js','utf8')).replace('/*__WELCOME__*/',()=>fs.readFileSync('welcome.js','utf8')):t;}).join('\n;\n');
const t=fs.readFileSync('template.html','utf8');
const vf=fs.existsSync('dist/voice-index.json')?JSON.parse(fs.readFileSync('dist/voice-index.json','utf8')):{};
// A clip whose line text has changed since it was recorded stays silent (text only) until it is re-recorded.
// dist/voice-manifest.json holds the generator's hash (voice id + text) for every recorded clip.
function briefLines(){ const BR=require('./briefs.js').BRIEFS; return Object.keys(BR).flatMap(id=>BR[id].map((x,k)=>({id:'B-'+id+'-'+k,text:x.text,group:'more'}))); }
(function(){ if(!fs.existsSync('dist/voice-manifest.json')) return;
  const crypto=require('crypto'), man=JSON.parse(fs.readFileSync('dist/voice-manifest.json','utf8'));
  const D=require('./data.js');(function(){const X2=require('./lessons2.js');Object.assign(D.LESSONS,X2.LESSONS2);Object.keys(X2.LESSONS2_EXT||{}).forEach(k=>{if(D.LESSONS[k])D.LESSONS[k].steps=D.LESSONS[k].steps.concat(X2.LESSONS2_EXT[k]);});const IA=require('./interactive.js');Object.keys(IA).forEach(id=>{const L=D.LESSONS[id];if(!L)return;Object.keys(IA[id]).forEach(i=>{const st=L.steps[+i];if(st&&st.t==='read')Object.assign(st,IA[id][i]);});});})();D.PUZZLES=D.PUZZLES.concat(require('./puzzles2.js'),require('./puzzles-starter.js'),fs.existsSync('./puzzles-themed.js')?require('./puzzles-themed.js'):[]);const X=require('./defences.js');D.OPENINGS=D.OPENINGS.concat(X.EXTRA_OPENINGS);const V=require('./voicelines.js');
  const MI=require('./missions.js');
  const lines=V.VOICE_LINES(D).concat(V.TOUR_LINES(),V.VARIANT_LINES(),V.MOVE_LINES(),V.MORE_LINES(D),X.DEFENCE_LINES(),require('./career-data.js').CAREER_LINES,V.QUIZ_LINES(D),V.HINT_LINES(),Object.keys(MI.MISSIONS).flatMap(k=>MI.MISSIONS[k].map(m=>({id:'N-'+m.id,text:m.text}))),briefLines());
  const h=t=>crypto.createHash('sha1').update('B52raBK48m23qWYbwchQ'+t).digest('hex').slice(0,12); let stale=[];
  lines.forEach(l=>{ if(vf[l.id]&&man[l.id]&&man[l.id]!==h(l.text)){ delete vf[l.id]; stale.push(l.id); } });
  if(stale.length) console.log('clips waiting for a new recording (text changed):',stale.length,stale.join(' '));
  // same text, same clip: an id without its own recording plays the one recorded for the identical sentence
  const DD=require('./voice-dedupe.js')(lines,vf,()=>true); let shared=0;
  Object.keys(DD.alias).forEach(id=>{ if(!vf[id]&&vf[DD.alias[id]]){ vf[id]=vf[DD.alias[id]]; shared++; } });
  if(shared) console.log('ids sharing a clip with an identical sentence:',shared);
})();
js=js.replace('/*__VOICEFILES__*/{}', JSON.stringify(vf)).replace('/*__VOICEPACKS__*/2', fs.existsSync('dist/voice-packs.json')?fs.readFileSync('dist/voice-packs.json','utf8'):'2'); console.log('voice clips', Object.keys(vf).length);
const OUT=process.env.OUT||'dist'; // e.g. OUT=/tmp/preview node build.js to build somewhere else
fs.mkdirSync(OUT,{recursive:true});
const out=t.replace('/*__APP__*/', ()=>js);
fs.writeFileSync(OUT+'/chess-ascent.html', out);
fs.copyFileSync('chess-ascent-config.example.js', OUT+'/chess-ascent-config.example.js');
// Standalone website build: a complete HTML document (doctype, lang, charset, mobile viewport)
// Home-screen / tab icon for the website build
const ICON="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#ff4f8b'/><stop offset='.5' stop-color='#ffd23f'/><stop offset='1' stop-color='#4cc9f0'/></linearGradient></defs><rect width='64' height='64' rx='16' fill='url(#g)'/><g transform='translate(9.5 8)' fill='#1b1a22' stroke='#f7efdc' stroke-width='1.5' stroke-linejoin='round'><path d='M14 36l.8-7.4c.8-4.6 3.8-7.3 6.5-9.6-2.4.3-5 1.6-6.9 3.6l-3.6-2.4c1.4-4.3 4.7-8.1 9.1-10.4l1.2-3.6 2.3 3.1c7 .7 11.4 6.5 11.4 14.2 0 4.8-1.3 9.3-3.3 12.5z'/><path d='M11.5 36.5h22a1.5 1.5 0 0 1 1.5 1.5v.5a1.5 1.5 0 0 1-1.5 1.5h-22A1.5 1.5 0 0 1 10 38.5V38a1.5 1.5 0 0 1 1.5-1.5z'/></g></svg>";
const cut=out.indexOf('<div id="app">');
const site='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#0b1020">\n<meta name="description" content="Chess Ascent: a 3D chess coach that takes you from your first move to 2000.">\n<meta property="og:title" content="Chess Ascent">\n<meta property="og:description" content="A 3D chess coach that takes you from your first move to 2000, with a voiced coach, lessons, openings and puzzles.">\n<meta property="og:type" content="website">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Chess Ascent">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,'+encodeURIComponent(ICON)+'">\n'+out.slice(0,cut)+'\n</head>\n<body>\n'+out.slice(cut)+'\n</body>\n</html>\n';
fs.writeFileSync(OUT+'/site.html', site);
// test build with a THREE stub instead of CDN
const stub=`<script>(function(){function mk(){var f=function(){};var p=new Proxy(f,{get:function(t,k){if(k===Symbol.iterator)return function*(){};if(k===Symbol.toPrimitive)return function(){return 0};if(k==='length')return 0;if(k==='then')return undefined;if(k in t&&k!=='prototype')return t[k];if(!t.__c)t.__c={};if(!(k in t.__c))t.__c[k]=mk();return t.__c[k]},set:function(t,k,v){if(!t.__c)t.__c={};t.__c[k]=v;return true},apply:function(){return mk()},construct:function(){return mk()}});return p}window.THREE=mk();
var orig=window.THREE; window.THREE=new Proxy({},{get:function(t,k){ if(k==='Vector3'||k==='Vector2'||k==='Color') return function(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;this.set=function(a,b,c){this.x=a;this.y=b;this.z=c;return this};this.copy=function(v){this.x=v.x;this.y=v.y;this.z=v.z;return this};this.clone=function(){return new THREE.Vector3(this.x,this.y,this.z)};this.distanceTo=function(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)};this.offsetHSL=function(){};this.length=function(){return Math.hypot(this.x,this.y,this.z)};this.convertSRGBToLinear=function(){return this};this.setScalar=function(){}}; if(k==='WebGLRenderer') return function(){var o=mk(); o.domElement=document.createElement('canvas'); return o;}; if(k==='Group'||k==='Mesh'||k==='Scene'||k==='Points') return function(){var o=mk(); return o;}; return orig[k];}});})();</script>`;
fs.writeFileSync(OUT+'/test.html', out.replace(/<script src="https:\/\/cdnjs[^>]*><\/script>\s*<script src="https:\/\/cdn.jsdelivr[^>]*><\/script>/, stub));
console.log('built', (out.length/1024).toFixed(0)+'KB');
