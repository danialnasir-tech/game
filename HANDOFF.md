# Chess Ascent — project handoff

A 3D chess tutor (100 → 2000 rating) in one HTML page: Three.js board (2D fallback), a male voiced coach ("Coach Leo", ElevenLabs clips), 26 lessons, 23 opening lines, 99 puzzles, a coach you play against, review, Puzzle Rush, badges, 30-day plan.

## Layout of this folder
| File | What it is |
|---|---|
| `chesscore.js` | Own chess rules engine (0x88 board, Zobrist hashing, perft-verified). `CHESS_LIB()` returns `Game`. |
| `engine.js` | Coach engine: PVS alpha-beta, transposition table, null move, LMR, killers/history, quiescence, mobility + pawn-structure eval. API: `rootSearch`, `pickMove(fen, level, prevFens)`, `analyzeMove(fen, uci, depth, timeMs)`, `threat`, `evalPos`. Runs in a Web Worker. |
| `data.js` | STAGES, LESSONS (26), OPENINGS (23), PUZZLES (30 hand-made), COACH_LEVELS. |
| `puzzles2.js` | 69 extra puzzles mined from engine self-play, each re-verified (unique winning move). |
| `voicelines.js` | All coach lines + variation pools (no line repeats until all are used). |
| `icons.js` | Vector chess piece icons (no unicode glyphs — they broke on some servers). |
| `board2d.js` | Flat 2D board with the same API as the 3D board. |
| `app.js` | The whole app (modes, voice, 3D board, layout, coaching, badges…). |
| `template.html` | All CSS + markup. Phone layout = `@media (max-width:880px) and (orientation:portrait)`; body gets `data-mode` and `data-layout="board"|"browse"`. |
| `build.js` | Concatenates sources into `dist/chess-ascent.html` (artifact), `dist/site.html` (website, has viewport meta) and `dist/test.html` (THREE stub for headless tests). Needs `dist/voice-index.json` + `dist/voice-packs.json`. |
| `dist/voice-pack-1..15.mp3` | All 1410 voice clips, packed (32 kbps mono). Loaded on demand. |
| `pack-voice.js`, `ingest.sh` | Turn a voice zip from the user into packs: `sh ingest.sh chess-voice-v4.zip` (needs ffmpeg). The zip must contain ALL clips (the user's generator folder keeps old + new). |
| `build-kit.js`, `voice-kit/` | Builds the ElevenLabs generator the user runs on Windows. |
| `voice-kit-v4/` | Current generator for the user: voice ID `B52raBK48m23qWYbwchQ`, model eleven_v4, 1410 lines, all generated and packed. |
| `website/` | Download version: `serve.js` + `Start-Chess-Ascent.bat` (index.html = dist/site.html, plus the 15 packs). |
| `tests/` | `perft.js`, `validate.js` (checks every lesson/opening/puzzle), `bench.js` (engine match + tactics), `mine.js` (puzzle miner), Playwright scripts (`smoke.py`, `mob.py` phone screenshots, etc.). |

## Commands
```
node build.js                 # build everything into dist/
node tests/perft.js           # rules check
node tests/validate.js        # content check (must print "errors 0")
node build-kit.js             # regenerate voice generator lines
sh ingest.sh <voice-zip>      # add new voice clips, then rebuild
```
Tests reference `../chesscore.js` etc. from a `scratch/` folder — run them from a `scratch/` copy or fix the paths.

## Publishing
Publish `dist/chess-ascent.html` as an artifact and pass the 15 packs as supporting files
(`voice-pack-N.mp3` → `dist/voice-pack-N.mp3`). The page fetches them by relative path.

## Rules the user cares about
- Coach is **male**. Voice ID `B52raBK48m23qWYbwchQ`, ElevenLabs eleven_v4. Never fall back to another voice (it once wasted their credits).
- No paid services. No repeated voice lines.
- Phone and desktop must each look designed; phone = one screen, no page scroll.
- Never paste or reuse API keys.

## Release polish (added after the move)
- Launch screen (`#splash` in `template.html`) while Three.js downloads; it fades out at the end of `boot()`.
- 3D: studio reflection map (`buildEnvironment()` in `app.js`), opening camera sweep, the selected piece lifts (`B3.lift`, also in `board2d.js`).
- Screen changes animate the side panel in (`PANEL_ANIM` in `go()`); top-bar numbers roll (`countTo`); puzzle rating changes pop under the rating (`floatDelta`); confetti on lesson complete, wins, badges, level-ups and a Rush best.
- Phones vibrate with the sound effects (`BUZZ` in `Sound`).
- Keyboard: Esc closes dialogs and the tour, arrow keys step the tour, opening lessons and game review, F flips the board.
- Tour: the missions step points at `.mchips`; on phones the Board tools step opens the folded menu.
- Puzzles x29 and x35 accept every correct mating first move.
- Website build (`site.html`) gets an icon and share/home-screen meta tags.
- Fixed: leaving a game while the coach was thinking threw an error.

## Open items
1. All 1410 voice lines are generated and packed (15 packs). If lines are added later: `node build-kit.js`, re-apply the v4 settings to the generator (see `voice-kit-v4/`), user runs it, then `sh ingest.sh <zip>`.
2. The 3D board was only tested with a stub in headless Chrome; check it on a real phone.
3. Ideas offered: Stockfish (WASM, GPL) for the website build; accounts / cloud save on Hostinger.
