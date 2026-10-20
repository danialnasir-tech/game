# Coach engine: strength and calibration

All numbers measured in this repo's container (about 3-4x faster than a phone), 4 games in parallel.

## Engine upgrade (engine.js vs tests/engine/engine-v1.js, the previous engine)
| Test | Result |
| --- | --- |
| New evaluation only (PeSTO tapered tables) vs v1, 100 games @100 ms | 63.5/100, about +96 Elo |
| Full upgrade vs v1, 100 games @100 ms | 66.5/100, about +119 Elo |
| v1 vs Stockfish 17.1 limited to 2600, 40 games @400 ms | 12/40 |
| New vs Stockfish 17.1 limited to 2600, 40 games @400 ms | 26/40 |

What changed: tapered middlegame/endgame evaluation (PeSTO piece-square tables, precomputed per square), losing
captures ordered late and skipped in quiescence, logarithmic late-move reductions, late-move pruning at low depth,
aspiration windows at the root. Tried and rejected (no gain within noise): halved mobility (-70), tempo bonus (+7),
king-attack table (-24), stronger mobility (+24).

## Coach levels (fixed depth, so a level plays the same on every device)
Measured against Stockfish 17.1 with UCI_LimitStrength (20 games each, about ±150). Stockfish's Elo limit is
calibrated for slower games, so treat these as approximate.
| Level | depth / randomness | Measured |
| --- | --- | --- |
| Club ~1000 | 1 / 80 cp | ≈ 940-1000 (vs SF 1320: 2/20 at 100 cp) |
| Strong ~1400 | 2 / 45 cp | ≈ 1400-1500 |
| Expert ~1800 | 3 / 25 cp | ≈ 1870 |
| Master ~2200 | 5 / 0 | ≈ 2200 |
| Grandmaster | full, 3 s | ≈ 2700 |

## Re-running
    npm install stockfish@17.1.0        # anywhere; set SF to its src/stockfish-17.1-lite-single-*.js
    node tests/engine/match.js engine.js tests/engine/engine-v1.js 100 50          # A vs B, 100 games @100 ms
    DEPTH=3 MARGIN=25 SF=... node tests/engine/calibrate.js engine.js 2000 1800 10 400   # level vs Stockfish 1800
