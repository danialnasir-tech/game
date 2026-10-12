// Regenerates the voice generator the user runs on their PC: voice-kit-v4/generate-v4-voices.js
// (voice B52raBK48m23qWYbwchQ, model eleven_v4). Clips already made are skipped by the generator itself.
const fs=require('fs');const D=require('./data.js');D.PUZZLES=D.PUZZLES.concat(require('./puzzles2.js'));
const X=require('./defences.js');D.OPENINGS=D.OPENINGS.concat(X.EXTRA_OPENINGS);
const V=require('./voicelines.js');
const MI=require('./missions.js');
const lines=V.VOICE_LINES(D).concat(V.TOUR_LINES(), V.VARIANT_LINES(), V.MOVE_LINES(), V.MORE_LINES(D), X.DEFENCE_LINES(), V.QUIZ_LINES(D), V.HINT_LINES(), Object.keys(MI.MISSIONS).flatMap(k=>MI.MISSIONS[k].map(m=>({id:'N-'+m.id,text:m.text,group:'more'}))));
const ids=new Set();lines.forEach(l=>{if(ids.has(l.id))throw new Error('duplicate id '+l.id);ids.add(l.id);});
const t=fs.readFileSync('voice-kit-v4/generate-v4-voices.template.js','utf8').replace('/*__LINES__*/[]',()=>JSON.stringify(lines,null,0).replace(/\},\{/g,'},\n  {'));
fs.writeFileSync('voice-kit-v4/generate-v4-voices.js',t);
const have=fs.existsSync('dist/voice-index.json')?JSON.parse(fs.readFileSync('dist/voice-index.json','utf8')):{};
const crypto=require('crypto'),man=fs.existsSync('dist/voice-manifest.json')?JSON.parse(fs.readFileSync('dist/voice-manifest.json','utf8')):{};
const h=t=>crypto.createHash('sha1').update('B52raBK48m23qWYbwchQ'+t).digest('hex').slice(0,12);
const missing=lines.filter(l=>!have[l.id]||(man[l.id]&&man[l.id]!==h(l.text))); // new lines, plus lines whose text changed
console.log('lines',lines.length,'already packed',lines.length-missing.length,'new',missing.length,'new characters',missing.reduce((s,l)=>s+l.text.length,0));
