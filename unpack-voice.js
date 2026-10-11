// Extract every clip already packed in dist/voice-pack-N.mp3 back into dist/voice/<id>.mp3,
// so a voice zip that only holds new clips can be merged with the existing ones.
const fs=require('fs');
const idx=JSON.parse(fs.readFileSync('dist/voice-index.json','utf8')), packs={};
fs.mkdirSync('dist/voice',{recursive:true});
let n=0;for(const [id,[p,off,len]] of Object.entries(idx)){ const b=packs[p]||(packs[p]=fs.readFileSync(`dist/voice-pack-${p+1}.mp3`)); fs.writeFileSync(`dist/voice/${id}.mp3`,b.subarray(off,off+len)); n++; }
console.log('unpacked',n,'existing clips');
