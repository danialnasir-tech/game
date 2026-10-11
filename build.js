const fs=require('fs');
let js=['chesscore.js','engine.js','data.js','puzzles2.js','voicelines.js','icons.js','board2d.js','app.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n;\n');
const t=fs.readFileSync('template.html','utf8');
const vf=fs.existsSync('dist/voice-index.json')?JSON.parse(fs.readFileSync('dist/voice-index.json','utf8')):{};
js=js.replace('/*__VOICEFILES__*/{}', JSON.stringify(vf)).replace('/*__VOICEPACKS__*/2', fs.existsSync('dist/voice-packs.json')?fs.readFileSync('dist/voice-packs.json','utf8'):'2'); console.log('voice clips', Object.keys(vf).length);
fs.mkdirSync('dist',{recursive:true});
const out=t.replace('/*__APP__*/', ()=>js);
fs.writeFileSync('dist/chess-ascent.html', out);
// Standalone website build: a complete HTML document (doctype, lang, charset, mobile viewport)
const cut=out.indexOf('<div id="app">');
const site='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#0b1020">\n<meta name="description" content="Chess Ascent: a 3D chess coach that takes you from your first move to 2000.">\n'+out.slice(0,cut)+'\n</head>\n<body>\n'+out.slice(cut)+'\n</body>\n</html>\n';
fs.writeFileSync('dist/site.html', site);
// test build with a THREE stub instead of CDN
const stub=`<script>(function(){function mk(){var f=function(){};var p=new Proxy(f,{get:function(t,k){if(k===Symbol.iterator)return function*(){};if(k===Symbol.toPrimitive)return function(){return 0};if(k==='length')return 0;if(k==='then')return undefined;if(k in t&&k!=='prototype')return t[k];if(!t.__c)t.__c={};if(!(k in t.__c))t.__c[k]=mk();return t.__c[k]},set:function(t,k,v){if(!t.__c)t.__c={};t.__c[k]=v;return true},apply:function(){return mk()},construct:function(){return mk()}});return p}window.THREE=mk();
var orig=window.THREE; window.THREE=new Proxy({},{get:function(t,k){ if(k==='Vector3'||k==='Vector2'||k==='Color') return function(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;this.set=function(a,b,c){this.x=a;this.y=b;this.z=c;return this};this.copy=function(v){this.x=v.x;this.y=v.y;this.z=v.z;return this};this.clone=function(){return new THREE.Vector3(this.x,this.y,this.z)};this.distanceTo=function(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)};this.offsetHSL=function(){};this.length=function(){return Math.hypot(this.x,this.y,this.z)};this.convertSRGBToLinear=function(){return this};this.setScalar=function(){}}; if(k==='WebGLRenderer') return function(){var o=mk(); o.domElement=document.createElement('canvas'); return o;}; if(k==='Group'||k==='Mesh'||k==='Scene'||k==='Points') return function(){var o=mk(); return o;}; return orig[k];}});})();</script>`;
fs.writeFileSync('dist/test.html', out.replace(/<script src="https:\/\/cdnjs[^>]*><\/script>\s*<script src="https:\/\/cdn.jsdelivr[^>]*><\/script>/, stub));
console.log('built', (out.length/1024).toFixed(0)+'KB');
