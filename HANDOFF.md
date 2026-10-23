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
| `voice-kit-v4/` | Current generator for the user: voice ID `B52raBK48m23qWYbwchQ`, model eleven_v4, 2032 lines (2204 packed in 25 packs). |
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
Publish `dist/chess-ascent.html` as an artifact and pass all 25 packs as supporting files
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

## The Board lesson, notation missions, smarter hints
- `l-board` is now the first Foundations lesson: files a–h, ranks 1–8, square names, the starting setup ("light on the right"), and how moves are written (K Q R B N, no letter for pawns, x + # O-O). Step type `squares` is a tap-the-named-square game (spoken with the `M-sq_*` clips). It ends with two moves played from their written names.
- Missions for `l-board` use goal `sequence` (play the written moves in order; a wrong move fails with an explanation). The friendly coach never gives check now, so it can't interrupt a sequence.
- Hints: the star-collecting hint draws an arrow to a star or to a square one step from a star; the mission hint searches for the quickest route (next capture for capture goals) and falls back to the engine.
- Game analysis is hidden from beginners until they can play (`analyzeReady()`: band ≥ 800, Foundations cleared, 6+ lessons, or an earlier analysis). It lives in the Coach tab, Progress and Explore, not on a beginner's home screen.
- First-visit hints are also spoken (`H-<mode>` clips; texts in `HINT_LINES_TEXT`, voicelines.js).
- More puzzles: `node tests/mine.js <seed> <count> scratch/mined-<seed>.json`, then `node tests/merge2.js scratch/mined-*.json` (new ids `y001…`, old ones untouched).

## Learner-bot round (simulated beginners)
- Testers: scratchpad `testers/BRIEF.md` (personas play the real app via Playwright and take a post-test). Findings and fixes: starter puzzles (`puzzles-starter.js`, `tests/starter.js`, only pieces already taught, `taughtPieces()`), lesson 1 in 9 short steps incl. "meet the pieces" (`pieces` step), notation symbols taught where used, "Your First Ten Moves" lesson + `develop`/`castle` missions, K+Q method practised step by step, rook capture step, blunder check moved to stage 2 and given an unprompted position, Daily warm-up (`MODES.warmup`, spaced review in `S.srs`).
- Feedback: every wrong puzzle move gets a plain reason (`puzzleWhyWrong`), every good coach-game move a reason (`moveReason`), refused moves including castling are explained (`illegalWhy`), mission failures explain themselves (`missionWhy`). Stars drop for hints and mistakes.
- Layout: on phones the button row no longer floats over content; results replace the instructions and scroll into view. Coach games unlock after 5 lessons (every piece taught), openings after 6.

## Google sign-in and cloud save
- `Cloud` (app.js): Google Identity Services token client + Google Drive `appDataFolder` (scope `drive.appdata`). One file per player, `chess-ascent-progress.json` = {profile, summary, state}. Merge on sign-in keeps the richer save and unions lessons, stars, missions, badges, solved puzzles, openings, review schedule.
- Client ID comes from `chess-ascent-config.js` next to the page (gitignored; template `chess-ascent-config.example.js`, copied into dist by build.js). No config = feature hidden. Setup steps for Google Cloud Console: `GOOGLE-SIGN-IN.md`.
- Tested with a mocked Google (scratchpad `pw/gs.js`): upload from device A, restore on a fresh device B from the welcome screen.

## Open items
1. Voice: 1932 clips packed. 100 new lines (pools `cm_*`, `coach_onpurpose`, `coach_lost_easy`, `quiz_*`, `an_*`, `pr_*`, mission intros `N-…`, quiz prompts `Q-…`) are in `out/chess-voice-kit-v4.zip`; until the user records them those spots are silent (text still shows). Then `sh ingest.sh <zip>`, rebuild, republish.
2. The 3D board was only tested with a stub in headless Chrome; check it on a real phone.
3. Ideas offered: Stockfish (WASM, GPL) for the website build; accounts / cloud save on Hostinger.

## Website folder (upload to your own hosting)
`node build.js && node make-website.js` creates `out/chess-ascent-website/` and `out/chess-ascent-website.zip`. The folder holds `index.html` (the whole game), `voice-pack-1..25.mp3`, `chess-ascent-config.js` (placeholder, so Google sign-in stays off), `.htaccess` (Apache: index page, mp3 type, caching) and `READ-ME-FIRST.txt`. Upload everything in the folder to `public_html` (or a subfolder). Re-run both commands after every change, including new voice clips.

## Teaching round 2: show it on the board, practise exactly what was taught
- **Board visuals** (`showVisuals` in app.js, `tags`/`spot` in board2d.js, zone colours in both boards). Lesson step fields:
  `files: ['e']` (blue column), `ranks: [4]` (pink row), `zones: [[squares, 'A'|'B'|'C']]`, `tags: { d4: 'd4' }` (labels; they sit above a piece),
  `spot: 'n'` (lights up that piece type, dims the rest; `'N'` white only, `'n!'` black only), `dots: 'd4'` (where that piece can go),
  `demo: ['g1f3']` (played out on the board after `demoDelay` ms, with a "Watch again" button), `meet: 'k'` (piece card in the panel).
  Every explanation step in every lesson now has at least one of these.
- **Lesson 1 split** into *The Board* (files, ranks, square names, centre, two tap-the-square rounds) and *Meet the Pieces* (each piece introduced
  and lit up before the tap quiz, then notation). The written-move missions moved from `l-board` to `l-pieces`.
- **Lesson loop**: Learn → Coach missions → Practice (5 puzzles) → Next lesson. `flowNext(lid)` decides the next step; the lesson-complete
  screen, the end of the missions and the end of practice all show one big Continue button, with Learn/Missions/Practice chips.
  The home hero shows unfinished missions/practice of the last lesson first (with "Skip to the next lesson").
- **Practice mode** (`MODES.drill`, `LESSON_DRILL`): per-lesson puzzle filters and goal sentences; wrong moves explain why and let you retry;
  hint 1 = tip, 2 = highlight the piece, 3 = arrow. Results in `S.drills[lid]`.
- **Themed puzzles**: `node tests/themed.js` writes `puzzles-themed.js` (ids g001…): forks, pins, skewers, discovered attacks, back-rank
  mates and promotions, each verified by a material search (one winning move, clear margin). Their explanations are voiced (P- ids).
- **Desktop layout**: panel `clamp(380px, 40vw, 600px)` with larger type; 2D board capped at 680px.
- **Voice**: new pools `drill_*`, `piece_found_*`, `piece_wrong`, `demo_watch`, `intro_<lesson>` (said when a lesson starts).

## Phone: one screen, no scrolling
- `phoneFit()` (app.js) sets `--app-h` from the real visible height (100dvh is wrong in some in-app browsers, e.g. the Claude app),
  drops the notch padding when framed, and moves the board tools ("…", with a 2D/3D item) into the top bar.
- On board screens the board resizes for every panel change (MutationObserver): it starts at full width and shrinks only by what the
  instructions need (minimum about 31% of the height). Lesson, practice and mission screens keep their buttons pinned at the bottom.
- Phone home shows the "Next up" card, the next first step and a "Course map, today's goals and your rating" button; the rest opens on tap.
- Checked at 393x750, 390x844, 360x740 and 375x667 (every Foundations lesson step, practice, mission, home).

## Growth features: daily puzzle, challenge links, play a friend, installable app
- **Daily puzzle** (`MODES.daily`): `dailyNo()` counts days from 1 Oct 2026; `dailyPuzzle(n)` picks the same puzzle for everyone
  (easy-to-medium tactic, lowest hash of id+day). Results in `S.dailyPz[n]`, `dailyStreak()`. Result screen: Wordle-style squares,
  share text, a 1080x1350 PNG share card (`shareCard()`, drawn on a canvas), WhatsApp button, copy link, save picture.
- **Challenge links**: `challengeLink()` puts the puzzle (fen, solution, explanation), the sender's name and tries in the link
  (`#c=` + base64url JSON), so no server is needed. Opening one goes straight to `MODES.challenge` (before onboarding for new
  visitors), then "You beat Sara!" and a "Learn chess free with Coach Leo" button. Practice and Puzzle-trainer screens get
  "Challenge a friend" after a solve. The link uses `shareUrl` from chess-ascent-config.js (falls back to the current address).
- **Play a friend** (`MODES.friend`): pass-and-play with names, optional coach tips for both sides (engine `analyzeMove` +
  `grade()`), board turns to the mover, take back, resign/draw, checkmate/stalemate detection, rematch with swapped colours, share.
- **Installable app**: `pwa/` holds the manifest, icons and `sw.template.js`; make-website.js copies them and writes `sw.js` with a
  version hash. Offline: the page and voice packs are cached. Install button in Settings and a home card after the first lesson
  (Android/desktop prompt; iPhone gets Share → Add to Home Screen steps).
- Voice pools: `daily_*`, `challenge_*`, `friend_*`.

## Rating-based learning (every band, 100 to 2000)
- **New step types** in lessons: `choice` (A/B candidate moves drawn on the board; `options: [{u, why}]`, `best`) and `threat`
  (opponent to move, board shown from the defender's side; tap `targets`; `show` = the threat move, drawn after).
- **lessons2.js** is generated by `node tests/lessons2-build.js`: 9 lessons for 400–2000 (What Does My Opponent Want?, Which
  Capture?, Loose Pieces Drop Off, Two-Move Combinations, Attack the King, Candidate Moves, Defend Like a Pro, Win the Endgame,
  Deep Calculation). Hand-written concept steps + steps generated from the puzzle bank by theme and rating. The engine checks
  every step: A/B gaps of 1.5+ pawns, threats that really win material or mate, "safe move" answers that are really safe.
  Prompts rotate so the coach never repeats a sentence. Puzzles used in a lesson are kept out of that band's practice sets.
- **RATING_GUIDE** (data.js): the typical mistakes of each band, each linked to the lesson that fixes it. Shown as "Your level"
  on Progress and home. Level = tracked chess.com rating, else coach-game rating, else training rating.
- **chess.com rating tracker** (Progress): records the rating on the day it is linked and shows the change since then
  (rapid, blitz, bullet, daily). Refreshes in the background every 6 hours.
- Coach missions with a full board now use real opening replies (`replies`), and the coach's gentle moves never attack your pieces.
- `node tests/audit-moves.js` lists every requested move that lands on an attacked square.

## My chess.com, my mistakes, 30-Day Ascent
- **My chess.com** (`MODES.mychess`, Progress tab → card, Coach tab → "Played on chess.com?"): one input accepts a username, @name or
  profile link (`ccParse`); a game link alone gets a clear message. Loads the profile and ratings, then **every monthly archive**
  (`mcLoadAll`), cached in IndexedDB (`IDB`, key `m:<archive url>`; past months are downloaded once, the current month refreshes after
  an hour). Tabs: Overview (totals, rating chart per time control, plain-language insights from `mcInsights`), Games (filters, tap for a
  full engine review), Mistakes (chess DNA).
- **Find my mistakes** (`scanGames`): engine-checks your last 20 rated games in the background (about 10 s a game), records phase
  accuracy and problem types (`problemOf`) in `S.dna`, and saves up to 4 mistakes per game as personal puzzles in `S.myPz`.
- **Train my mistakes** (`MODES.mine`): your position, what you played and how it was punished; any move within 0.7 pawns of the
  engine's best counts. Spaced repetition: 1, 3, 7, 16, 35 days.
- **30-Day Ascent** (`MODES.program`, home card after two lessons): 15/20/30 minutes a day; daily tasks are Warm-up, Learn (your
  biggest weakness from the DNA or the rating guide), Fix your mistakes (or puzzles), Play (every third day a rated chess.com game).
  Tasks tick off automatically (`progMark` hooks in lessons, practice, warm-up, games, mistakes). Weekly check-ins on days 7/14/21/28;
  day 30 shows the summit screen with a shareable certificate (rating before → after).
- Errors: in the claude.ai preview chess.com cannot be reached (the page may not contact other sites); the app says so. On a real
  website the chess.com public API works without any key.
- Reset (Settings → Start over) also clears the IndexedDB game cache.

## Interactive lessons: answer, tap and play instead of pressing Next
- **Questions on concept steps** (`interactive.js`, merged into `LESSONS` at load): a read step can carry `ask` (multiple choice:
  `q`, `options`, `a`, `why`, `wrong[]`) or `tap` (find squares on the board: `q`, `targets`, `need`, `why`, `wrong`). Targets take
  squares or shortcuts `@dark`, `@light`, `@file:e`, `@rank:4`, `@centre`. Next stays hidden until it is answered; feedback (wrong
  reason, hint, the explanation) shows inside the question box; found squares stay marked. First-try answers build a combo streak
  (`LS.combo`, toasts at 3/5/8/12).
- **Longer lessons**: `tests/lessons2-more.js` adds a second half to every short lesson (now 5 to 12 steps each): more teaching
  with questions and taps, then engine-verified practice from the puzzle bank. Appended after the existing steps so recorded clip
  numbers do not move. `node tests/lessons2-build.js` regenerates `lessons2.js` and checks every hand-written move (legal, best or
  mate, `teach: 1` skips the "best" check for opening/technique moves) and every question (must print `problems 0`).
- Practice sets no longer repeat puzzles the lesson just used (`fresh2` in `drillList`).
- Phone: when the board is only a picture (reading or answering), it may shrink to 23% of the screen height instead of 31%
  (`body[data-passive]`, read by `fitBoard`). Small phones get tighter lesson text.
- **Voice, same text = one clip** (`voice-dedupe.js`): the kit asks for each sentence once; the site build points every other id
  with identical text at that recording.

## Career mode: Ascent Town (3D)
- `career.js` (inlined into app.js at `/*__CAREER__*/` by build.js) and `career-data.js` (dialog text, voice ids `W-...`).
- A small low-poly town built from Three.js shapes (no downloads): plaza with giant pieces, Leo's Academy (lessons), Puzzle
  Tower (daily puzzle, ladder, my mistakes), Opening Library, the Arena (arena + the five stage bosses as rivals standing outside),
  the Park (coach game, play a friend), Your Home (progress, 30-Day Ascent, chess.com). Townsfolk walk between buildings.
- Controls: tap/click to walk, tap a building or person to walk there and talk/enter, drag to turn the camera, WASD/arrows + E on
  desktop. Five golden pawns are hidden each day (+5 XP each, +25 for all five).
- Story: chapter = current stage; objective (gold star, beam and HUD arrow) comes from `careerQuest`: meet Leo → next lesson at
  the Academy → the stage rival at the Arena when the stage is done → next chapter (banner + line).
- While career mode is on (`S.career`), every "back to path" goes back to town (`go('path')` is redirected) and back buttons
  read "← Town"; you walk out of the building you entered. The Path tab or the List button turns it off.
- The 3D board stops drawing while in town (`B3.pause`). Phones: no shadow maps, pixel ratio 1.5.

## Ascent Town 2.0: livelier town, guidance, rival walk-ins, plaza games, your own look
- Graphics: sky shader, animated sea and foam, distant hills, soft sun shadows that follow you, ACES tone mapping, detailed
  buildings, flowers, bunting, lamps, stalls, fountain, chimney smoke, birds, butterflies, clouds. All scenery is merged into three
  vertex-coloured meshes (`Kit` + `mergeParts`), people are six merged parts each: the whole town is about 80-100 draw calls.
  Adaptive quality: below ~32 fps the pixel ratio drops to 1, below ~26 fps shadows switch off.
- Guidance: first visit plays a fly-over intro (skippable), then the wardrobe, then tips. Quest panel with chapter progress and a
  Go button (auto-walk), golden chevron trail on the ground, pointer over the target or an edge arrow when it is off screen,
  rotating minimap, Leo calls "Over here!", townsfolk stop and share tips (`CAREER_TIPS`), dialogs type out with an avatar.
- Rivals: Challenge → arena walk-in (crowd cheers on the stands, spotlights, both fighters walk to the middle, rival's taunt) →
  VS screen → the real boss game. Coming back after a win plays the victory scene (`careerAfterFight`); a loss gets a taunt and
  advice. Each rival unlocks a hat at the Style Shop.
- Plaza games with Gia: Square Rush (run to the called square, 45 s) and Knight Hop (jump a giant knight onto stars, 60 s).
  Best scores in `S.careerSt.mg`; XP per point.
- Style Shop (Tia, or the 👕 button): skin, hair style, hair colour, top, trousers, hat. Saved in `S.careerSt.look`.
- Test hooks: `ChessAscent.dbg().CW.ts` speeds the world up (tests only), `dbg().mgTap(point)`, `dbg().fight(id)`.

## First-time experience (welcome.js, inlined at `/*__WELCOME__*/`)
- `Welcome` replaces the old modal + text tour. Five screens: Coach Leo with a live mini board playing Scholar's Mate →
  name → level (with icons) → **try it**: a one-move challenge matched to the level (knight to the star / win the free queen /
  fork king and rook / spot the knight fork) with the coach reacting, arrows and XP → **your plan** for Day 1 (learn, practise,
  prove it) → "Start Day 1" goes into the town (or the first lesson if 3D is missing); "I prefer a simple list" goes to Path.
- `MiniBoard` + `mbPlay`: a small self-contained demo board (SVG pieces, arrows, pops, taps) used by the welcome and previews.
- `FeatureIntro`: the first time Puzzles, Openings, Coach, Arena or Progress opens, a sheet shows the feature working on a mini
  board (or a rating chart), says what it does for you, and "Try it now" hands over to the guiding hand.
- `Guide` / `guideOnce`: a pointing hand + label on the exact thing to tap (selector, or a function giving a screen point for
  3D targets). Disappears when that thing is tapped. Used for Leo, his dialog button, the Academy door card, the wardrobe, the
  first lesson question/tap/move, and the Start button on the list home.
- Town: taps near a person count as tapping them; walking follows the plaza ring around buildings (`careerRoute`), with
  acceleration and the camera swinging behind you on auto-walks; a loading screen while the town builds; townsfolk stay quiet
  until you have met Leo. Bottom bar shows one recommended dot instead of one per tab.

## Market polish round 1
- Five tabs: Home (town or list, per `S.career`; Settings → Home screen), Puzzles, Play (coach games, with Arena, friend and
  chess.com entries at the top; beginners who have not unlocked coach games land in the Arena), Openings, Progress.
- One Coach Leo everywhere (`coachAvatar()` now matches the 3D Leo: grey hair, beard, glasses, maroon jacket).
- Phones: no empty preview board on Arena, Openings and the coach-game setup; the Start game button sticks to the bottom.
- Settings shows "Saved automatically on this device" instead of developer setup text. Header reads "0/4 today".

## Stronger coach engine and honest levels (see tests/engine-calibration.md)
- engine.js: PeSTO tapered evaluation, late ordering/qsearch skipping of losing captures, log LMR, late-move pruning,
  root aspiration windows. +119 Elo over the previous engine (kept as tests/engine/engine-v1.js); vs Stockfish 17.1 limited
  to 2600 it scores 26/40 where the old one scored 12/40.
- Levels now use a fixed search depth (same strength on every device) calibrated against Stockfish's Elo limit:
  Club d1, Strong d2, Expert d3, Master d5, and a new Grandmaster (full strength, 3 s; badge `beat_gm`). Defend missions
  use Grandmaster. levelForRating gives Grandmaster from 2400.

## Fun pass: juice on every core loop
- Board (board2d `shatter`, `shake`, `kingFall`, forwarded by B3; the 3D board falls back to `burst`): capture shards,
  a small shake for rook/queen captures, a pulsing red check square, and on checkmate a toppling king + big shake.
- Sounds (`Sound.play(kind, n)`): `combo` rises in pitch with the streak, `mate`, `stamp`, `chest`, `tick`; move clicks vary.
- Puzzles: stamps on the board (⚡ LIGHTNING under 12 s, PERFECT first try, SOLVED otherwise); combo meter with XP ×1.25…×2
  (`comboMult`), a "🔥 n IN A ROW / ON FIRE / UNSTOPPABLE" pop, and "combo lost" when a streak of 3+ breaks.
- Coach games: "!! BRILLIANT" / "! GREAT MOVE" stamps live; a result card at the end (`resultCard`): VICTORY / DEFEAT / DRAW,
  accuracy ring that counts up, rating and XP, animated bars of move quality, Review / Rematch.
- Lessons: the stars pop in one by one with rising chimes.
- Daily chest (`dailyChest`, home and town, once a day after the first lesson): XP, every third chest a streak shield
  (max 2; `touchActivity` spends one to cover a single missed day), a golden chest on every 7th streak day.

## 3D polish: new characters and a cinematic opening
- Characters (career.js `personParts`, `rigPerson`, `animPerson`): slightly chibi proportions, lathe-shaped torso/limbs,
  sneakers, big eyes with iris and highlights, hair caps with fringes, a baked-in ink outline (inside-out shell, no extra draw
  calls), soft three-step toon shading with a warm rim (`personMat`). Eyelids blink; idle breathing, weight shift and glances;
  walk cycle with bob, sway and lean; townsfolk turn their heads to watch you pass. New acts: `bow`, `point`.
  Shared Leo look: `LEO_LOOK`. The player wears a pawn emblem.
- Town: vertex-coloured ground gradient, ~1,600 grass tufts in one instanced draw, drifting pollen, a soft vignette.
- Opening (welcome.js `Stage`): a floating board above a sea of clouds at sunset. First-run players get a 5 s flight in with
  the title, then Coach Leo beside the board while the finish of Morphy's Opera Game (1858) plays out with real pieces:
  captures knocked off the board, a queen sacrifice, the king toppling on mate. The welcome cards sit over the scene; the
  camera fits each view into the free part of the screen (`region`, `setViewOffset`). Level choice shows five pieces
  (hover lifts one); the try-it step has Leo react; the plan builds a bridge of light to Ascent Town and "Start Day 1"
  flies along it into the town. Falls back to the flat welcome without WebGL. Sounds: `whoosh`, `sting`, `boom`.
- Testing note: headless software rendering runs at ~2 fps, so the intro finishes before a test sees it; stepping the
  flight by hand (`ChessAscent.dbg().Stage.dbg().path`) shows the frames. Tests that skip onboarding should call
  `ChessAscent.dbg().Stage.stop()` so the scene does not keep rendering behind them.

## Playtest round (three first-time personas: beginner phone, ~700 laptop, ~1300 small phone)
- Launch: the welcome now starts after the splash is dismissed (it used to run underneath it, so the splash reappeared
  after "Start Day 1"). Splash tips match the player's level. The guide hand never points through the splash.
- Town first visit: shorter fly-over, the player starts next to Leo, Leo's first button starts the first lesson directly,
  and the wardrobe opens after that first lesson instead of before anything. Minimap opens a travel menu; the golden-pawn
  counter explains itself. "All lessons" opens the course list without switching the home screen off the town.
- Chess text: tests/fix-explain.js rewrote 35 puzzle explanations that wrongly said "undefended" (they now say what
  really happens) and made titles honest; lesson prompts no longer say "two things at once" without a fork.
  Feature demos fixed (Play card: "develops and guards e5"; Arena uses a queen fork).
- Coach games: a mistake with no concrete reason is shown as "Could be better"; better reasons for the best move
  (rescues a piece / attacks a piece); "Show me" plays 5 plies and explains when material stays level; recaptures are not
  "the only move"; no Brilliant/Great medal for a move the arrow showed after Retry; old Retry buttons cannot rewind a
  game that moved on. Coach plays main-line openings from the library (never trap lines) for its first moves; levels
  up to depth 3 avoid early queen trips; depth ≤ 2 never walks into mate in one.
- Puzzles: another clearly winning move (engine within 0.7 pawns of best and ≥ +2.5) is accepted.
- Rivals: fights are never blocked by the coach-games lock; outside the town a rival gets a VS entrance (`vsFlash`).
- Celebrations close on any tap, auto-close after 5 s, and wait for the result card. Daily chest only on home screens.
- Players at 800+ (or who tap "Skip all tips") get no per-tab intro popup; "Try it now" glows the target instead of a hand.
- Lesson done screen: stars text celebrates first, one primary next step with alternatives folded under "More options".
- Progress: rating sources labelled, chart green when climbing, placed-out lessons shown as "already known".
- Tests: harness `H.start(page)` taps through the splash like a person (the old `#sp-go` click no longer starts the welcome).

## Phone lesson polish
- Steady board: on phones each lesson lays out every step once before it starts (`phoneFit.pre`) and picks one board size
  that fits the busiest step; afterwards the board only shrinks for a reading step that truly needs it, and grows back.
  Measured over 120 steps at 375x667 and 393x750: 0 size changes, 0 overflow (tests in pw/bsz.js).
- Short text: step text over ~95 characters shows a short lead and a "More ▸" tap on phones (`shortText`); desktop shows
  everything. The voice still reads the whole text.
- Coach missions are now "Leo's challenges": a dare line (`dare` in missions.js), "You beat my challenge!", and the
  Meet the Pieces set is Leo Says / x Marks the Take / Lightning Reader (no opening names on day 1).
  tests/missions.js plays scripted replies for sequence challenges.
- Town: speech bubbles stay on screen and step around the quest card, map, buttons and each other; signs fade out when
  the camera is right next to them.

## Fun lessons: every lesson is a score run
- `funHit(clean)` / `funMiss()` are called at every right/wrong point in lessons (questions, taps, moves, A/B picks,
  piece and square games, star collecting). A step done first try builds a combo: points = 10 × comboMult, +5 for an
  answer within 9 s (⚡), +30 for passing the final test first try. Score flies up from the counter (`.ls-float`).
- The lesson header row holds the step dots plus a HUD (`funHud`): Leo's face with a mood emoji (thinking, happy, wow,
  on fire, oops, proud) that pops when you answer, the score, the combo and your best for this lesson.
- The last question of each lesson (`lessonFinal`) is the FINAL TEST: a short full-screen banner and a gold card frame.
- Lesson complete: score counts up, personal best ("New best!", stored in `S.lessonBest`), bonus XP = score / 10, and a
  chess card flips over (`funCard`: 40 fun facts in `CARDS`; common, rare at 3 stars, gold at 3 stars with no slips).
  Badges wait until the card has been revealed (`Celebrate.hold`). The album is on the Progress tab (`cardAlbum`);
  the course list shows each lesson's best score.

## Curriculum review: one plan, right placement, real practice
- One daily plan. The top bar "x/4 today", the home card, the 30-day page and the town all show the same list
  (`missionList`). The 30-day plan starts on your first day for everyone (`progEnsure`, also set in the welcome);
  the 30-day page is that list plus the calendar (filled from `S.daily`) and a bonus item when reviews are due.
  "Career mode" is now called "Ascent Town (3D)": the same course as a 3D world.
- Placement: "I know the rules" (400) starts at Stop Losing Pieces, not at "The Board" (`placementStage`).
- The rook checkmate lesson moved to the end of Stop Losing Pieces (400-800). l-check gained a step on the other draws
  (repetition, 50 moves, insufficient material, agreement). `lessonFinal` prefers the last board task.
- Play-it-out practice games (practice.js, built and verified by tests/practice-build.js): 29 games for every lesson from
  400 to 1200. New challenge goals: `gain` (win N points of material and still have it after the coach answers) and
  `survive` with `strict` (play N moves without losing any material). Coach ~1000 for 400-800, ~1400 for 800-1200,
  full strength when defending against mate. Each lesson's flow is now Learn → Practice puzzles → Play it out.
- Removed the invented "+180 in 30 days" from the Progress intro chart.

## Beginners, real opponents, clocks, 1200+ practice, course map
- New lesson "Taking Pieces" (l-capture, after l-king-pawn): how capturing works for every piece, the pawn's diagonal
  capture, "you can't take your own pieces", and "is it safe to take?". Coach missions cap-snack / cap-hop / cap-sweep
  and a 5-puzzle drill.
- Guided first game (`go('play', {guided:true})`, `ACT.guidedGame`): Leo draws two good moves every turn (green and
  blue arrows, with a reason each from `explainMove`) and explains each of his own moves. Offered after l-firstmoves
  (`flowNext` step `guided`) and on the Play setup under 900. Sets `S.guidedDone`.
- Celebrations are top ribbons (`.cel-rib`) that never cover an end screen.
- Human-style coach: levels with `human: { miss, max }` (Novice 20% / 360 cp, Club 7% / 240 cp) weight moves by how
  tempting they look (captures, checks, development, castling, central pawns; aimless king and rook moves less), and
  sometimes "miss" your threat by playing a natural move that loses up to `max`. Never walks into mate in one, never
  hangs the queen-sized amount. See `natural()` and `pickMove` in engine.js.
- Clock games: Play setup has Clock (No clock, 10 min, 5|3, 3|2), stored in `S.coach.clock`. Each side's clock runs only
  on its own turn (`clkRun`/`clkStop`, increment added after each move), 0:00 loses (`clkFlag`), under 30 s turns red and
  Leo warns once. On the clock the coach takes human-like time per move. Not used in arena, practice or guided games.
- Practice games now cover 1200+ lessons too (tests/practice-build.js): mate puzzles for candidates / calc / deep,
  survive games for defence / pro-threats / outposts / structure / the Philidor rook ending, promote games for king and
  pawn endings (verified with a deeper search, `deep`), and mate-with-extra-material for convert. Mating the coach also
  counts in a survive game.
- Course map: the open stage on Home is a winding road (`drawMap`, `.cmap`): big round lesson nodes, diamond nodes for
  openings and play-it-out games (now listed under each finished lesson), a pulsing START node, and the road painted
  green up to where you are. Redrawn on resize and when the full home list opens.

## Typewriter text and the missing-voice kit
- `Typer` (app.js): when Leo says a line, the matching text on screen (lesson text, game feed, intro text, subtitle
  bubble…) types itself out at speaking pace (about 58 ms a letter when a clip plays, 22 ms when there is no clip).
  Unrevealed letters are invisible but still laid out, so nothing moves; tap the text to show it all; off with
  reduced motion. The phone board fitter ignores the typing updates (`twOnly`), or it would never get to run.
- New voiced lines: guided-game intro, clock intros (10 / 5|3 / 3|2), clock warning and flag lines, and the intro text
  of every challenge and practice game (`G-<id>`, spoken on its intro screen).
- build-kit.js now puts only the missing clips in voice-kit-v4/generate-v4-voices.js, so running it from a fresh
  folder never pays again for clips the app already has. ingest.sh merges the new clips with the packed ones.

## Release polish pass
- Safety net (`oops` in app.js): any error in a button action, a script error or a failed promise saves progress and
  shows a small banner "Oops, something went wrong. Your progress is saved." with Home / Reload, at most once per 20 s.
- Town: townsfolk standing right next to the camera are hidden (no giant head in the corner); when you talk to
  someone you step to their side so their face is never covered.
- Phones: the top bar no longer wraps "Day / 0/4 / today" onto three lines on board screens; on short phones the
  puzzle screen shows the rating on one line so the screen fits without scrolling.
- Lesson complete: the next-step button comes right under the stars, and on phones the board is hidden on that screen
  (`body.ls-done`), so the button, score and new chess card all fit without scrolling.
- Day done: when today's plan is complete, Home opens with a "Day N complete" card (streak, and what is waiting
  tomorrow: the next lesson, a new daily puzzle and a fresh chest). It replaces the plan card; on short phones the
  share and install cards wait behind the "Course map…" button.

## Town chat, E to talk, calmer easy coach
- Everyone in town can be talked to: Leo, Gia, Tia, the rivals and the seven walkers, who now have names and
  personalities (`TOWN_FOLK` in career-data.js). The talk dialog has a chat log, quick replies and a text box;
  `careerReply` matches what you type (greetings, how are you, who are you, rating, tips, rules, pieces, where is…,
  let's play, jokes, favourites, compliments, rude words, what should I do next) to lines in `CHAT`, in each person's
  own way. Replies can carry a button: walk somewhere, challenge the rival, start the next lesson, Gia's games, Tia's
  wardrobe. No internet or AI service is used.
- PC: walk up to anyone and a "E 💬 Talk to …" chip appears; press E (phones: tap the chip). In a chat, E focuses the
  text box; WASD never moves you while typing; Esc closes. Walkers stop while you talk to them.
- The easy coach blundered too often: Novice now misses your threat 8% of moves (was 20%), Club 3% (was 7%), and the
  town rivals never give pieces away on purpose. Practice games re-verified: 46.

## Meet the Pieces: how each piece moves, then capture with it
- l-pieces no longer asks "tap the white bishop". After the starting position, each piece gets one move step: its card
  (name, letter, worth), dots showing where it can go, one sentence on how it moves, and a capture to make (king takes
  a pawn, queen a knight across the board, rook a bishop, bishop a rook, knight jumps over pawns, pawn takes
  diagonally). Then the notation steps as before. INTERACT['l-pieces'] re-indexed (0, 7, 8).
- Phones: `shortText` keeps the last sentence of a board task on screen (highlighted) so "what to do" is never behind
  "More". The typewriter leaves buttons whole. The first-time "Tap a piece…" hint now goes away after 5 s or on Next.
