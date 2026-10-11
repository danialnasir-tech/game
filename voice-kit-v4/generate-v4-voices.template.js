#!/usr/bin/env node
// Chess Ascent voice generator. Needs Node.js 18 or newer, nothing else.
// Run:  node generate-voices.js        (or double-click Run-Windows.bat)
// Clips that already exist are skipped, so running it again never pays twice.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { execSync } = require('child_process');

const VOICE_ID = 'B52raBK48m23qWYbwchQ';
const VOICE_NAME = 'your chosen voice (B52raBK48m23qWYbwchQ)';
// Always the same voice and model, so every clip sounds the same. No other voice or model is ever used.
const MODEL_ID = 'eleven_v4';
const FORMAT = 'mp3_44100_64';
const LINES = /*__LINES__*/[];
const DIR = __dirname;
const OUT = path.join(DIR, 'chess-voice-v4');
const KEY_FILE = path.join(DIR, '.elevenlabs-key-v4');
const MANIFEST = path.join(OUT, 'manifest.json');

function ask(q) {
  if (process.env.CHESS_ANSWER !== undefined) { console.log(q + process.env.CHESS_ANSWER); return Promise.resolve(process.env.CHESS_ANSWER); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim()); }));
}
const hash = t => crypto.createHash('sha1').update(VOICE_ID + t).digest('hex').slice(0, 12);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  if (fs.existsSync(KEY_FILE)) return fs.readFileSync(KEY_FILE, 'utf8').trim();
  console.log('Paste your ElevenLabs API key (elevenlabs.io > Profile > API Keys).');
  const k = await ask('API key: ');
  if (!k) { console.log('No key entered.'); process.exit(1); }
  fs.writeFileSync(KEY_FILE, k);
  console.log('Saved the key next to this script so you will not be asked again.\n');
  return k;
}

async function credits(key) {
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } });
    if (r.status === 401) { try { fs.unlinkSync(KEY_FILE); } catch (e) { } console.log('That API key was rejected. Run again and paste a valid key.'); process.exit(1); }
    if (!r.ok) return null;
    const j = await r.json();
    return j.character_limit - j.character_count;
  } catch (e) { return null; }
}

async function tts(key, text) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: MODEL_ID })
    });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const body = await r.text();
    if (r.status === 429 && !/quota/i.test(body)) { await sleep(1500 * attempt); continue; }
    if (r.status >= 500) { await sleep(1500 * attempt); continue; }
    const e = new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
    e.kind = /quota_exceeded|insufficient|not enough credits/i.test(body) ? 'credits'
      : /missing_permissions/i.test(body) ? 'permission'
      : (r.status === 402 || /library|payment_required|subscription|upgrade/i.test(body)) ? 'voice'
      : r.status === 401 ? 'key' : 'other';
    throw e;
  }
  throw new Error('Too many retries');
}

function zip() {
  const zipPath = path.join(DIR, 'chess-voice-v4.zip');
  try { fs.unlinkSync(zipPath); } catch (e) { }
  try {
    if (process.platform === 'win32') execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${OUT}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'ignore' });
    else execSync(`cd "${OUT}" && zip -qr "${zipPath}" .`, { stdio: 'ignore' });
    return zipPath;
  } catch (e) { return null; }
}

(async () => {
  if (typeof fetch !== 'function') { console.log('Please install Node.js 18 or newer from https://nodejs.org'); process.exit(1); }
  console.log('\n  Chess Ascent  ·  coach voice generator\n');
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const key = await getKey();
  const left = await credits(key);

  const todo = LINES.filter(l => !(manifest[l.id] === hash(l.text) && fs.existsSync(path.join(OUT, l.id + '.mp3'))));
  const chars = todo.reduce((s, l) => s + l.text.length, 0);
  const rate = 1; // eleven_v4: one credit per character
  if (todo.length) console.log(`  Voice: ${VOICE_NAME}\n  Model: Eleven v4`);
  const cost = arr => Math.ceil(arr.reduce((s, l) => s + l.text.length, 0) * rate);
  let plan = todo;
  // Core lines first; opening notes only if the credits cover them.
  if (left != null && cost(todo) > left) {
    plan = todo.filter(l => l.group !== 'openings');
    if (cost(plan) > left) {
      const sorted = []; let sum = 0;
      for (const l of plan) { const c = Math.ceil(l.text.length * rate); if (sum + c > left - 50) break; sorted.push(l); sum += c; }
      plan = sorted;
    }
  }
  const done = LINES.length - todo.length;
  console.log(`  Clips already made: ${done}/${LINES.length}`);
  if (left != null) console.log(`  Credits available:  ${left}`);
  if (!plan.length) {
    console.log(todo.length ? '\n  Not enough credits for the next clip.' : '\n  Everything is already generated.');
  } else {
    if (plan.length < todo.length) console.log(`  Not enough credits for everything: making the ${plan.length} most important clips now (opening notes last). Run again after topping up to finish.`);
    const ans = await ask(`\n  Generate ${plan.length} clips for about ${cost(plan)} credits? [Y/n] `);
    if (/^n/i.test(ans)) process.exit(0);
    // Probe the first clip alone so a voice/permission problem is caught before anything else runs.
    let i = 0, ok = 0, stop = false;
    async function one(l) {
      try { return await tts(key, l.text); }
      catch (e) {
        throw e;
      }
    }
    try {
      const buf = await one(plan[0]);
      fs.writeFileSync(path.join(OUT, plan[0].id + '.mp3'), buf);
      manifest[plan[0].id] = hash(plan[0].text); ok++; i = 1;
      fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
    } catch (e) {
      console.log('\n  ElevenLabs refused the request:\n  ' + e.message);
      if (e.kind === 'voice') console.log('\n  ElevenLabs will not let this account use this voice through the API. Nothing was charged.\n  On the free plan, voices from the Voice Library cannot be used through the API: a Starter plan fixes this,\n  or use a voice you designed or cloned yourself in this account.');
      if (e.kind === 'permission') console.log('\n  Your API key needs the "Text to Speech" permission. Edit the key on elevenlabs.io (or make a new one with it), delete the .elevenlabs-key file here, and run again.');
      if (e.kind === 'credits') console.log('\n  Your account is out of credits for this month.');
      if (e.kind === 'key') { try { fs.unlinkSync(KEY_FILE); } catch (x) { } console.log('\n  The key was rejected. Run again and paste a valid key.'); }
      if (process.platform === 'win32') await ask('\n  Press Enter to close.');
      process.exit(1);
    }
    const worker = async () => {
      while (!stop && i < plan.length) {
        const l = plan[i++];
        try {
          const buf = await tts(key, l.text);
          fs.writeFileSync(path.join(OUT, l.id + '.mp3'), buf);
          manifest[l.id] = hash(l.text); ok++;
          fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
          process.stdout.write(`\r  ${ok}/${plan.length} done  `);
        } catch (e) {
          if (e.kind === 'credits') { if (!stop) console.log('\n  Out of credits. Progress is saved; run again later to continue.'); stop = true; }
          else console.log(`\n  Skipped ${l.id}: ${e.message}`);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    console.log('');
  }
  const z = zip();
  try { fs.writeFileSync(path.join(OUT, 'voice.txt'), VOICE_NAME + ' ' + VOICE_ID); } catch (e) { }
  console.log(z ? `\n  Ready: ${z}\n  Attach chess-voice-v4.zip in the Claude chat and the coach will start talking.\n`
    : `\n  Clips are in ${OUT}. Zip that folder and attach it in the Claude chat.\n`);
  if (process.platform === 'win32') await ask('  Press Enter to close.');
})();
