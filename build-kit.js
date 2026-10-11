const fs=require('fs');const D=require('./data.js');D.PUZZLES=D.PUZZLES.concat(require('./puzzles2.js'));const V=require('./voicelines.js');
const lines=V.VOICE_LINES(D).concat(V.TOUR_LINES(), V.VARIANT_LINES(), V.MOVE_LINES(), V.MORE_LINES(D));
fs.mkdirSync('dist/kit',{recursive:true});
const t=fs.readFileSync('voice-kit/generate-voices.template.js','utf8').replace('/*__LINES__*/[]',()=>JSON.stringify(lines,null,0).replace(/\},\{/g,'},\n  {'));
fs.writeFileSync('dist/kit/generate-voices.js',t);
fs.writeFileSync('dist/kit/Run-Windows.bat','@echo off\r\ncd /d "%~dp0"\r\nwhere node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org then double-click this file again. & pause & exit /b)\r\nnode generate-voices.js\r\n');
const g=k=>lines.filter(l=>l.group===k).reduce((s,l)=>s+l.text.length,0);
console.log('lines',lines.length,'coach',g('coach'),'lessons',g('lessons'),'puzzles',g('puzzles'),'openings',g('openings'));
