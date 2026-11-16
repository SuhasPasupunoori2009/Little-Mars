# Testing: what is automated, what is not

Run from `game/source`. Needs Node 22+; the smoke test also needs Chrome or Edge (no npm packages).

| Command | What it proves |
|---|---|
| `node test-model.cjs` | Archive data matches the risk rule; a sensible bot wins 592/592 archive runs and a colony bot 444/444; the shield is required; radiation trade-offs exist. |
| `node test-navigation.cjs` | 289 station-to-station routes avoid obstacles. |
| `node test-v3.cjs` | 152 checks on the v3 rules: a v2-shaped save plays by v2 numbers; save repair; upgrades and level caps; storage cap; expansion pads; all 12 technologies change the rule they claim; lab points; site unlocks; every alert changes nothing until answered, has a free choice and cannot end a mission; crew roles. The v2 player answering alerts wins 296/296 real weeks with free choices, with bold choices, and while using the lab and research. |
| `node test-camp.cjs` | Scratch camp, easy/normal/hard winnability, level-1 commander winnable on every week, split power score, unlocks, expert missions reachable, age/guide rules. |
| `node test-smoke.cjs` | Real headless browser: page loads, no script errors, **nothing contacts NASA until Live is chosen**, age picker, warm-up, data labels (STATIC ARCHIVE, curated, NASA-vs-game explanation), panels open, every visible control has an accessible name, message cards are labelled dialogs that take and keep focus. |
| `node test-chores.cjs` | Playwright real mouse: choose garden size, build and test a wall, solve the hidden pipe puzzle, guess a harvest. |
| `node test-e2e.cjs` | Playwright with REAL mouse input (needs `npm i playwright-core`): story cards, all four warm-up answers, Journal, Aa settings, Pip and Colony panels, for ages 8 and 12. |

## Hard mode: the 23 failures (investigated)
With a walking-only bot, 421 of 444 hard runs win. All 23 failures stall at 2 of 3 samples on harsh weeks: outdoor trips cost too much Safety to walk. A bot that uses the rover on risky days wins 444/444, so hard mode is fully winnable with good play. Hard is meant to need planning. The 85 percent threshold in `test-camp.cjs` for the walker is deliberate.

## Bugs found by testing
- Every message card (warm-up, story cards) ignored real mouse clicks: the card had the class `top`, which also styles the HUD bar with `pointer-events:none`. Programmatic `.click()` tests could not see it; the Playwright test can. Fixed by renaming the card class to `ontop`.
- Message cards were marked `inert` (the selector `.top` also matched the card), so keyboard and screen-reader users could not reach them. Fixed.

## v3 browser checks
The unedited smoke test (28 checks) and end-to-end test (9 checks for age 8, 9 for age 12) pass on the v3 build.
The v3 screens were also driven in headless Chrome through the `#debug` handle: each console tab renders, an experiment adds
points, research changes a cost on screen, an alert card resolves, storage shows "/130" in the HUD, Esc and the M key work,
zero script errors. That drive is a one-off script, not a test file in this folder.
Under software rendering the end-to-end test needs longer click timeouts than the 3 seconds in the file (v2 needed this too).

## Not done (be honest about this)
- v3: no automated test clicks through every console control with a real mouse; no test covers audio output; the dusk scene
  and rover tracks were checked by screenshot only.
- No real screen-reader pass (NVDA, VoiceOver, TalkBack). Only the automated checks above.
- No performance benchmarks on weak laptops or tablets. Headless Chrome with software rendering loads and runs, which is not a measurement.
- Only one informal playtest (a 12-year-old), no supervised playtest and no measured learning gain: see `PLAYTEST.md`. The built-in warm-up and science check make a before/after comparison possible, but it is a self-check, not a validated instrument.
- The smoke test does not play a full mission through the interface; the model bots do that without the interface.


## v4

Run from `source/`: `node test-v4.cjs` (Node only, about 10 seconds). It must print `PASS: 2216 v4 rule checks.`
Run it together with the four older rule tests after any change to `model.js`, `model4.js` or `spaceweather.js`.

Adding a rule: put the number in `model.js` or `model4.js`, add a check in the matching numbered section of `test-v4.cjs`, rebuild.

`index.html#debug` exposes `window.__lm4` (drive, use, perf, setMode, slots, marks and more) for browser tests.

### Browser checklist for v4 (not yet done; tick as you go, with the console open for errors)
1. Title: Game mode opens, each of 7 modes selects, card closes. Journal, Science database, Saved missions, Credits open and close.
2. Original Storm Watch: play Sol 1 as before. Missions book shows 3 side missions.
3. Rover station > Drive the rover. W/A/S/D, Space, mouse drag, wheel. Hit a rock. Drive to the canyon edge. Esc leaves.
4. Drive to a beam of light, press E: site reached, short cutscene, Skip works. Then E at each of the 3 markers.
5. Press C, J, H: each tab draws. Colony planner: pick pad, pick module, Confirm. NASA explorer: change month, pick a day, pin, compare.
6. Press L: open Greenhouse growth, Thermal insulation, Energy storage; move sliders; answer; log.
7. Build each new module once (Free Exploration is quickest) and look at it. Use Observe, Exchange, Analyse.
8. Colony Builder: play 3 sols, watch condition fall, repair.
9. Storm Watch Challenge: all 8 days, final score.
10. Mission Creator: add objectives, save, play.
11. Saved missions: save to a slot, load, delete, export, import the file. Start a new game with a save present: the warning appears.
12. Settings: voice sample, Stop, each performance profile, read the measured frame rate.
13. Reduce Motion, High contrast, keyboard-only, and a touch device.
14. Then run `node test-smoke.cjs`, `test-e2e.cjs`, `test-clickall.cjs` and fix or update what they report.
