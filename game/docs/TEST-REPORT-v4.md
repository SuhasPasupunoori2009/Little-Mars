# Little Mars v4: testing report (2026-11-15)

## Automated rule tests (Node, all run on the final source)
| Test | Result |
|---|---|
| `test-model.cjs` (existing) | PASS |
| `test-navigation.cjs` (existing, 289 routes) | PASS |
| `test-v3.cjs` (existing) | PASS, 150 checks |
| `test-camp.cjs` (existing) | PASS |
| `test-v4.cjs` (new) | PASS, 2,207 checks |

One existing assertion was changed: `test-v3.cjs` expected exactly five experiments. v4 has eight by design, so it now checks that the five v3 experiments still exist and the total is eight. No other existing test was edited.

### What `test-v4.cjs` covers
Original-campaign neutrality; the 7 modules; the 6 technologies; water; wear and repair; the 16 discoveries; free play; all modes; winnability of the two long modes; the mission generator (900 generated sets, every template completable); the score report; rover physics and collisions; sensors and clock; Pip's contextual answers; NASA data handling and offline fallback; save migration with real v2 and v3 files, damage handling, export/import; two-player turns; performance profiles; dashboard numbers.

### Winnability (simple bot, 120 real eight-day spans)
- Story Expedition: 115 / 120.
- Colony Builder: 117 / 120.

## Browser
| Check | Result |
|---|---|
| Built `index.html` parses (all 7 script blocks) | PASS |
| Loads in headless Chrome, no console errors | PASS |
| Title screen, mode chooser, Story Expedition start, HUD water/clock/chapters | Seen working |
| Driving, instruments, cutscenes, Colony / Journal / NASA explorer tabs, new experiments, Challenge, Creator, save screens, settings | **NOT TESTED** |
| Existing `test-smoke.cjs`, `test-e2e.cjs`, `test-clickall.cjs` | Passed on v3.1 before changes; **NOT RERUN on v4** |
| New v4 browser test file | **Not written** |

## Bugs found and fixed
1. Dune instance count could exceed the number built, drawing a giant dark shape over the base.
2. Driving could start while a message card was open.
3. Far mountains were too large and too near.
4. Prologue said "five days" in eight-sol modes.
5. Long modes could not be won with one harvest: the garden can now be replanted in missions over five sols, and a night in the shelter on an active-Sun day gives 5 Safety back.

## Performance
No frame-rate figures are reported. The only runs were in a software renderer, which says nothing about a real laptop. The game measures its own frame rate: Settings > Graphics performance shows it for your device.

## Known limitations
- Everything marked "untested in browser" in FEATURES-v4.md may have bugs.
- The old browser tests may need small updates (for example they may count console tabs or title-screen buttons).
- Formal human playtesting has not been done. One 12-year-old has played the game informally, and many changes came from that.
