# Architecture: audit of v2 and how v3 was added

## 1. What v2 was (audit)
- One offline page. `source/build.py` joins `shell.html` (markup and CSS), `three.min.js` (Three.js 0.160.1), the DONKI
  archive (`data/donki-daily.json`), then `spaceweather.js`, `model.js`, `story.js` and `game.js` into `index.html`.
- `model.js` holds every rule as plain functions on a plain state object (`initial`, `reason`, `desc`, `apply`, `end`).
  It has no DOM code, so Node can run it. This is the best part of the project and the reason bots can prove winnability.
- `spaceweather.js` turns DONKI records into Calm, Watch and Storm with one rule (`riskOf`) and picks the week.
  Live data is fetched only if the player chooses Live.
- `story.js` holds text, the cinematic and Web Audio sound made from oscillators (no audio files).
- `game.js` is one closure: 3D scene, walking, stations, HUD, panels, saving (localStorage), profile, crew turns.
- Strengths: clear split between rules and screen, honest data labels, good tests, accessibility options.
- Weak points found: `game.js` is one very large file with long lines; saves were loaded without checking them;
  one audio volume for everything; only four pads and nothing to do with a module after building it;
  the end of a sol looked the same as its start; nothing asked the player to decide under pressure except the storm.

## 2. Plan
Keep the split. Put every new rule in `model.js` so it can be tested without a browser. Give every new state field a
value that means "v2 behaviour", so the existing bots and saves behave exactly as before. Put the new screens in one new
file instead of growing `game.js` further. No new libraries.

## 3. What v3 changed, file by file
| File | Change |
|---|---|
| `model.js` | New state: `rp, tech, modLv, labs, flags, alerts, alertDone`. New actions `upgrade:<pad>`, `research:<id>`, `lab:<id>`. Tables `TECH`, `LABS`, `ALERTS`, `EXTRA`, `UPTEXT`. Helpers `lv, has, cap, role, padOpen`. `alertInfo` / `alertChoose`. `normalize` (save check). Pads 4 and 5, three modules, two sites. |
| `v3ui.js` (new) | Console and its four tabs, alert card, Pip moods and answers, achievements, science report, audio mix settings, keyboard. `build.py` pastes it into `game.js` at the marker `/*@V3UI@*/`, so it shares the closure and needs no globals. |
| `game.js` | About twenty one-line hooks (`v3After`, `v3HUD`, `v3Frame`, ...), new 3D models, rover wheels and tracks, dusk and stars, level rings, save check on load. |
| `story.js` | Three gain channels (music, ambience, effects), five effects, rover loop, `setMix`. |
| `shell.html` | Console markup, Control button, loading veil, v3 CSS, high-contrast rules for the new parts. |
| `build.py` | One line: the marker replacement. |

## 4. How the pieces talk
Player input -> `game.js` asks `M.reason(state,id)` -> if empty, `M.apply(state,id)` -> `syncWorld()` redraws 3D,
`updateHUD()` redraws bars, `v3After(id)` lets the v3 layer react (sound, Pip mood, achievements) -> `save()`.
The console never changes state itself: its buttons call the same `M.apply`, or `M.alertChoose` for alerts.

## 5. Data honesty
The only outside data is NASA DONKI. The Sun dashboard prints the same day records the rules use, labels each column
"NASA observation" or "our simplification", shows STATIC ARCHIVE or LIVE with its time, and prints "none recorded" or a
dash where a field is missing. A practice week with no NASA data says so in a warning box. Alerts, the map, lab models,
Mars weather events and research are game content and are described that way in the game and the teacher guide.

## 6. Saves
`localStorage` only. On load `M.normalize` rejects a save that is not a mission state and repairs one that is:
missing v3 fields are added, unknown modules, levels, technologies and sites are dropped, supplies are clamped.
A rejected save starts a new mission; profile, levels and badges are stored separately and are kept.

## 7. Performance
No post-processing. Textures are drawn on canvases at start. If frames are slow the game lowers the pixel ratio, then the
shadow map. Rover tracks reuse a fixed pool of 220 instanced decals. The console is plain HTML and pauses nothing in the 3D loop.
This has not been measured on real low-end hardware.

## 8. Debug handle
Opening `index.html#debug` exposes `window.__lm` (state, rules, redraw, open console) for testing. It does not exist otherwise.


## v4 additions

```
source/
  model.js        per-action rules. v4 hooks: water, wear, 7 modules, 6 technologies, 3 labs, FINDS, MODE_WIN, replanting
  model4.js       v4 rules beside it (no DOM): modes, missions and generator, score report, rover physics, sensors,
                  dashboard numbers, Pip answers, challenge rounds, journal, save envelope / export / import, perf profiles
  spaceweather.js + archiveSpan (long missions), practiceWeek
  game.js         engine. Calls the v4 hooks; contains the /*@V3UI@*/ and /*@V4@*/ markers
  v3ui.js         v3 layer. Console tabs now come from CON_TABS, CON_HTML, CON_BIND so v4 can add tabs
  v4/core.js      shared v4 state and every hook game.js calls; HUD extras; voice; performance meter
  v4/world.js     terrain carve, scenery for six environments, weather layers, module models, rover and Pip details, cinematics
  v4/rover.js     direct driving, markers, instruments, drive HUD, input
  v4/colony.js    Colony tab: dashboard, building table, build planner
  v4/science.js   3 experiments, method cards, Journal tab, NASA explorer tab, live-week cache
  v4/missions.js  title-screen menu, modes, side missions, Challenge, Mission Creator, score report
  v4/saves.js     slots, export/import, new-game guard, settings rows, #debug handle
  v4/v4.css       styles for all of the above
  test-v4.cjs     rule tests; tests/fixtures/ holds real v2 and v3 saves
```

**Build.** `build.py` joins `source/v4/*.js` in a fixed order and places them inside `game.js` at `/*@V4@*/`, after the v3 layer, so they share its closure and add no globals. `v4.css` is appended to the stylesheet. Output is still one offline `index.html`.

**Rule of thumb.** Numbers live in `model.js` / `model4.js` and are tested in Node. Files in `v4/` draw and call `M.apply`; they never change a supply themselves.

**Hooks called by game.js / v3ui.js:** `v4Week`, `v4New`, `v4Welcome`, `v4Reset`, `v4After`, `v4Night`, `v4HUD`, `v4Sync`, `v4Frame`, `v4Busy`, `v4Station`, `v4Speak`, `v4PipAnswer`, `v4Carve`, `v4LabCard`, `v4JournalHTML`, `v4JournalBind`, `v4ReportHTML`, `v4SettingsHTML`, `v4Settings`.

**State.** New fields are neutral by default (`water: null`, `cond: null`, `mode: 'storm'`), so an old save plays by old numbers. `M.normalize` repairs them. The autosave key and shape are unchanged; slots use a `format: 4` envelope.

**Not yet modular.** `game.js` itself is still one file. Suggested next split: world build, stations, HUD, input.
