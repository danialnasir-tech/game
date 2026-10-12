# Chess Ascent — project handoff

A 3D chess tutor (100 → 2000 rating) in one HTML page: Three.js board (2D fallback), a male voiced coach ("Coach Leo", ElevenLabs clips), 26 lessons, 23 opening lines, 99 puzzles, a coach you play against, review, Puzzle Rush, badges, 30-day plan.

## Layout of this folder
| File | What it is |
|---|---|
| `chesscore.js` | Own chess rules engine (0x88 board, Zobrist hashing, perft-verified). `CHESS_LIB()` returns `Game`. |
| `engine.js` | Coach engine: PVS alpha-beta, transposition table, null move, LMR, killers/history, quiescence, mobility + pawn-structure eval. API: `rootSearch`, `pickMove(fen, level, prevFens)`, `analyzeMove(fen, uci, depth, timeMs)`, `threat`, `evalPos`. Runs in a Web Worker. |
| `data.js` | STAGES, LESSONS (26), OPENINGS (23), PUZZLES (30 hand-made), COACH_LEVELS. |
| `puzzles2.js` | 69 extra puzzles mined from engine self-play, each re-verified (unique winning move). |
| `defences.js` | DEFENCES (how to meet every opening from the other side), 2 extra trap openings (Stafford, Blackburne Shilling), STAGE_OPENINGS (opening stops on the Path), DEFENCE_LINES() voice lines `D-<id>-<n>`. |
| `arena.js` | BOSSES (one per stage, beating one clears it), CHALLENGES (win this position vs perfect defence), VISION_GAMES (Square Sprint, Hanging Hunt, Check Finder, Knight Race). |
| `voicelines.js` | All coach lines + variation pools (no line repeats until all are used). |
| `icons.js` | Vector chess piece icons (no unicode glyphs — they broke on some servers). |
| `board2d.js` | Flat 2D board with the same API as the 3D board. |
| `app.js` | The whole app (modes, voice, 3D board, layout, coaching, badges…). |
| `template.html` | All CSS + markup. Phone layout = `@media (max-width:880px) and (orientation:portrait)`; body gets `data-mode` and `data-layout="board"|"browse"`. |
| `build.js` | Concatenates sources into `dist/chess-ascent.html` (artifact), `dist/site.html` (website, has viewport meta) and `dist/test.html` (THREE stub for headless tests). Needs `dist/voice-index.json` + `dist/voice-packs.json`. |
| `dist/voice-pack-1..19.mp3` | All 1932 voice clips, packed (32 kbps mono). Packs 1-2 are the start packs (first-session lines) the launch screen downloads; the rest load on demand. `dist/voice-manifest.json` = generator hash per clip (stale clips stay silent). |
| `pack-voice.js`, `unpack-voice.js`, `ingest.sh` | Turn a voice zip (or a folder) from the user into packs: `sh ingest.sh chess-voice-v4.zip` (needs ffmpeg). It may hold only the new clips: `unpack-voice.js` restores the already packed ones first. A .rar must be extracted to a folder first (e.g. with the free `node-unrar-js`). |
| `build-kit.js` | Rebuilds `voice-kit-v4/generate-v4-voices.js` from `voice-kit-v4/generate-v4-voices.template.js` with every line (male voice, eleven_v4 only) and prints how many clips are new. `voice-kit/` is the old female template and is no longer used. |
| `voice-kit-v4/` | Current generator for the user: voice ID `B52raBK48m23qWYbwchQ`, model eleven_v4, 2032 lines (1932 packed, 100 waiting to be recorded). |
| `website/` | Download version: `serve.js` + `Start-Chess-Ascent.bat` (index.html = dist/site.html, plus the 15 packs). |
| `tests/` | `perft.js`, `validate.js` (checks every lesson/opening/puzzle), `bench.js` (engine match + tactics), `mine.js` (puzzle miner), Playwright scripts (`smoke.py`, `mob.py` phone screenshots, etc.). |

## Commands
```
node build.js                 # build everything into dist/
node tests/perft.js           # rules check
node tests/validate.js        # content check (must print "errors 0")
node tests/missions.js        # every coach mission winnable (must print "missions errors 0")
node build-kit.js             # regenerate voice generator lines
sh ingest.sh <voice-zip>      # add new voice clips, then rebuild
```
Tests reference `../chesscore.js` etc. from a `scratch/` folder — run them from a `scratch/` copy or fix the paths.

## Publishing
Publish `dist/chess-ascent.html` as an artifact and pass all 19 packs as supporting files
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

## Level-aware course
- `placementStage()` maps the starting level (`S.band`) to a stage; stages below it are "Cleared" (still open for review). `nextLesson()` skips cleared stages and returns null when everything is cleared.
- Stage test (`MODES.stagetest`): 4 puzzles from the stage's rating band, 3 needed; passing sets `S.cleared[stageId]` and awards the stage badge.
- Openings are sorted for the player's rating and tagged "Your level" / "Basics"; the coach starts at `levelForRating()` and setup shows Warm-up / Your level / Next challenge.
- Settings has a "Your level" picker to change the starting point later.

## Openings in the course and defence lines
- Every opening has a "Play it / Defend against it" switch (`sideSwitch`), its defence is opened with id `def-<openingId>` (`lineById`).
- The Path shows opening stops between lessons (`stageStops`, `stopHtml`); the daily Opening mission and "What next?" go to the next undrilled stop (`nextStop`).
- In coach games the coach often plays a real line or trap (`pickBookLine`, `bookMove`), announces it in the feed, and offers a study button after the game.
- The 467 defence / trap-opening lines are generated and packed (user's run, verified against the generator manifest).

## Practice Arena (hands-on modes)
- `MODES.arena` hub; `MODES.vision` runs the 4 timed games (`GAMES` in app.js; board taps go through `IX.tap`).
- Bosses, challenges and opening battles are coach games with `PL.spec` (`kind` boss / challenge / battle): see `specFen`, `specColor`, `battleEnd`, `specFinish`, `bossEnd`. Bosses pick a favourite book line that fits your moves (`PL.bookPool`).
- "Show me" replays (`Replay.run`) play out the engine's line (`line()` in engine.js) after a mistake in games, puzzles, review and battles; `mistake()` in engine.js chooses the coach's slip in battles.
- 55 voice lines for these modes (`MORE_POOLS` batch 6) are in the generator; until generated they are silent and the text still shows.

## Launch screen
- `#splash` in template.html with an inline script (sparkles canvas, progress ring and bar, piece row, tips) exposed as `window.__splash`.
- First visit: `Voice.preloadStart` downloads the start packs with byte progress, then a Start tap (unlocks sound). `S.voiceReady` skips this later. Keep `START_CLIP` (app.js) and `START` (pack-voice.js) in sync.

## Classic boards, 2D default, live 2D/3D switch
- 3D: procedural maple/walnut squares (`woodCanvas`/`woodTex`), walnut frame with brass inlay and bead, felt pads, lacquered ivory/ebony pieces, warm "study" lighting and reflection map. No more pink/cyan neon in the scene.
- 2D: classic cream/brown squares, wood-and-brass frame, labels coloured per square. Phone gets a 34px strip above the 2D board for the 2D/3D pill and the ⋯ menu.
- `Board` (app.js) keeps both implementations behind the `B3` front: it records position, markers, arrows, stars, orientation and drag hooks and replays them on the other board when the player taps the **2D | 3D** pill (`#dim-btn`). 3D is only built on first use; its render loop pauses (`setActive`) while 2D is shown. `S.settings.board2d !== false` means 2D (the default for everyone).

## Coach missions, lesson quizzes, "on purpose" framing
- `missions.js`: three missions per Foundations lesson (easy → hard): check, capture / captureAll, mate, promote, castle, en passant. `coach: 'wander'` = the coach only walks his king and never captures; `'defend'` = engine at full strength. `node tests/missions.js` proves each one is winnable inside its limit (must print `missions errors 0`). After a Foundations lesson the "What next?" card is the missions (replacing "Play it out"); done lessons show a mission row with pips on the path.
- Lesson quizzes: a Concept step that shows one lone piece becomes "Your turn: tap N squares it can reach" (`QUIZ_OF` in voicelines.js, voice ids `Q-…`). Next unlocks when found; Skip is allowed.
- Novice coach in teaching mode leaves a minor piece or rook loose up to 3 times a game (`teachSlip`), and `onPurpose` says so ("I left my knight on c6 loose on purpose…"). Beating Novice/Club gets a "I play like a beginner on purpose" message instead of looking like a broken bot.
- The home board previews the next lesson; tapping it starts the lesson.

## Game analysis (chess.com / PGN)
- `MODES.analyze` (app.js, "Analyze a game" in Explore and at the top of the Coach setup). Sources: chess.com username → recent games list; username + game link → that game (the free public API finds games by player and month, so the link alone is not enough; archives are searched newest first, up to 36 months); or a pasted PGN (`parsePGN`, first game only, clocks/comments/variations skipped).
- Every move of the player's side runs `analyzeMove` (900 ms; 300 ms in pattern scans), graded with the same `grade()` as coach games, then `gameReport()` builds: problems (`PROBLEMS`: trap, allowedMate, hung, missedMate, missedFork, missedWin, slipped, kingCentre, earlyQueen, slowDev, missedBetter) with example moves and a "Fix it" lesson, phase accuracy, and the opening line it matched. The result opens in the normal review with the report on top.
- "Find my patterns": the last 6 games are scanned, problems summed, plus results by opening and colour from up to 40 games. `S.ccUser` remembers the username, `S.anHist` the last 30 analyses.
- Not testable from the build container (chess.com is blocked there); tests mock `api.chess.com`. Whether the claude.ai artifact page may call chess.com depends on its network policy; if blocked, the app says so and points to PGN paste. The self-hosted site build has no such limit.

## Brand v3 look
- The last block in template.html's second `<style>` ("Brand v3") restyles everything on top of the older rules: midnight background with drifting aurora blobs and a faint grid, acid-lime primary (`--brass` now means lime; stars use `--gold`), hot gradients (`--grad-hot`, `--grad-cool`, `--grad-acid`), glass top bar / rail / panel, pill buttons with a shine sweep, colourful sticker tiles in Explore and the Arena, an animated gradient edge on the home hero, and a floating tab bar on phones. Respects reduced motion. The chess boards keep their classic wood look.
- Avoid the class name `.top` for anything but the header bar.

## First-time experience
- `DISCOVER` (app.js): a "Your first steps · Try everything once" checklist on the home screen (lesson, puzzle, coach mission, Arena game, coach game, opening, analysis). Each first try gives +20 XP and a toast; all seven award the `explorer` badge. Done items move to the bottom; the next one is highlighted.
- Newcomers (fewer than 3 explored and fewer than 2 lessons) get a short home: lesson card, checklist, today's missions and the journey. The ladder, Explore strip and tip appear later.
- Pink "new" dots on tabs not opened yet (`S.visited`), and a one-line "Got it" hint at the top of the panel the first time each area opens (`HINTS`, `S.hinted`).
- Background motion was toned down (slower, dimmer aurora; shine only on the hero button).

## Open items
1. Voice: 1932 clips packed. 100 new lines (pools `cm_*`, `coach_onpurpose`, `coach_lost_easy`, `quiz_*`, `an_*`, `pr_*`, mission intros `N-…`, quiz prompts `Q-…`) are in `out/chess-voice-kit-v4.zip`; until the user records them those spots are silent (text still shows). Then `sh ingest.sh <zip>`, rebuild, republish.
2. The 3D board was only tested with a stub in headless Chrome; check it on a real phone.
3. Ideas offered: Stockfish (WASM, GPL) for the website build; accounts / cloud save on Hostinger.
