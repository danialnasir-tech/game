// Small, topic-grouped voice packs so the app downloads only what the current activity needs.
const fs=require('fs');
const SRC='dist/voice', LIMIT=1.6*1024*1024;
const files=fs.readdirSync(SRC).filter(f=>f.endsWith('.mp3')).sort();
fs.readdirSync('dist').filter(f=>/^voice-pack-\d+\.mp3$/.test(f)).forEach(f=>fs.unlinkSync('dist/'+f));
// Lines the very first session needs (tour, core coach phrases, lesson feedback, first three lessons) go into
// their own small "start" packs, which the first-launch loading screen downloads. Keep in sync with START_CLIP in app.js.
const START=/^(T-|C-)|^V-(correct|notquite|keepgoing|lesson_next|allstars|lessondone|welcome_back|mission_done|badge|level_up)-|^(L|K)-l-(board|rook|bishop-queen|knight)\b|^M-sq_|^V-quiz_|^H-/;
const groupOf=id=>START.test(id)?'00start':/^T-/.test(id)?'0tour':/^(C|M)-/.test(id)?'1core':/^V-(best|good|inacc|okay|mistake|blunder|brilliant|great|excellent|book|hang_|missed_|allows_|better_was|why_|castle|develop|capture|check_|coach_|threat_|gamestart|win|loss|draw|resign|takeback|comeback|tip_)/.test(id)?'2game':/^V-/.test(id)?'3misc':/^K-|^L-/.test(id)?'4lessons':/^P-/.test(id)?'5puzzles':'6openings';
const ids=files.map(f=>f.slice(0,-4)).sort((a,b)=>groupOf(a).localeCompare(groupOf(b))||a.localeCompare(b,undefined,{numeric:true}));
const index={}, packs=[], sizes=[]; let curGroup=null;
for(const id of ids){ const b=fs.readFileSync(`${SRC}/${id}.mp3`); const g=groupOf(id);
  if(!packs.length||g!==curGroup||sizes[sizes.length-1]+b.length>LIMIT){packs.push([]);sizes.push(0);curGroup=g;}
  const p=packs.length-1; index[id]=[p,sizes[p],b.length]; packs[p].push(b); sizes[p]+=b.length; }
packs.forEach((b,i)=>fs.writeFileSync(`dist/voice-pack-${i+1}.mp3`,Buffer.concat(b)));
fs.writeFileSync('dist/voice-index.json',JSON.stringify(index));
// each pack's content fingerprint goes in the URL, so a browser or the offline cache can never mix an old pack with new offsets
const crypto=require('crypto');
fs.writeFileSync('dist/voice-packs.json',JSON.stringify(packs.map(b=>crypto.createHash('sha1').update(Buffer.concat(b)).digest('hex').slice(0,10))));
console.log('packs',packs.length,'total MB',(sizes.reduce((a,b)=>a+b,0)/1048576).toFixed(1),'sizes KB',sizes.map(s=>Math.round(s/1024)).join(' '));
