# Changelog

Times and dates in these docs are New York time. Times shown inside the game (data fetched, save slots) are New York time too; NASA records and their dates stay in UTC.


## v4.2: astronaut customizer and camera

- **Customize your astronaut** on the start screen: 11 helmets (classic, fox, cat, bunny, bear, panda, frog, dino, owl, unicorn, alien), suit, trim, visor and backpack colours, and a chest patch (star, heart, rocket, planet). "Surprise me" and "Start over" are included. The choice is saved in the profile (`look`) and only whitelisted ids are loaded, so old saves and imports still work. Code: `v4/look.js`, rules in `model4.js`.
- **Camera**: drag with the mouse or one finger to turn and tilt, wheel or two-finger pinch to zoom. A quick click or tap still sends the astronaut there. Rover drive mode keeps its own camera.
- Tests: 9 new look checks in `test-v4.cjs` (2216 v4 checks).

## v4.1 (2026-11-16) fixes after review of the v4 build
Changed: `source/game.js`, `model.js`, `v4/rover.js`, `v4/core.js`, `v4/world.js`, `v4/v4.css`, `test-model.cjs`.
- Info boxes (alerts, report tiles, checkpoint panel) are dark graphite with readable text.
- Far rover sites can be picked in the Colony panel; the rover HUD then shows distance and compass direction to the marked site.
- Colony plan opens at the end of a run as a read-only final colony.
- Rock finds made with the rover count as Earth-link samples, so "Send discoveries" unlocks after 3.
- Canyon pillars sit on the flat rim and on the ground. A dry river valley now runs from the Dry riverbed site to the canyon.
- Ring decals removed; far craters pushed outward with rim and ejecta rocks; the ice site is a real bowl.
- Speed: pad modules not yet built skip matrix updates; small meshes no longer cast shadows (1,476 to 1,121 casters). Draw calls are unchanged at about 709.
- Times players see ("fetched", "retrieved", save slots) are shown in New York time with EST or EDT; the NASA records and week dates stay in UTC. Change is in `spaceweather.js` (`nyTime`), `game.js`, `v4/saves.js`.
- Security: live NASA flare text is accepted only if it is a real flare class (for example M5.2 or X17.2) and is escaped where it is shown (`spaceweather.js` `cleanFlare`, `v3ui.js`, `v4/missions.js`, `v4/science.js`). Two checks added to `test-v3.cjs`.
- Floating fixes: canyon rock pillars now stand on a plinth sunk to the lowest ground under their base, and the frost patches in the ice crater are now soft-edged and lie on the bowl, point by point, so they neither hang in the air nor sink into the slope. A scan of every scene object against the ground found nothing else floating except Pip, who hovers on purpose.
- Six new synthesized sounds, modelled on what Mars missions recorded (game sounds, not NASA audio), each with a caption: laser snap on rock finds, wheel crunch while driving off sand, dust-devil gust on the Solar crisis alert, marsquake rumble and bloop on the Geological find alert, helicopter hum on photo finds, instrument motor whir when observing the sky. Files: `story.js`, `v4/core.js`, `v4/rover.js`, `v3ui.js`.
- Checked: all test files pass. Frame rate on the owner's laptop is not measured. Missions were not fully reviewed against the design scope.

## v4.0 (2026-11-15) The Living Red Planet
Rules finished and tested; screens and 3D written but mostly untested in a browser (see TEST-REPORT-v4.md).
- New files: `source/model4.js`, `source/v4/*`, `source/test-v4.cjs`, `source/tests/fixtures/*`, `docs/FEATURES-v4.md`, `docs/TEST-REPORT-v4.md`.
- Changed: `model.js`, `game.js` (hook calls only), `v3ui.js` (tab tables, hook calls, counts), `spaceweather.js`, `story.js` (3 sounds, one sentence), `shell.html` (title, one marker), `build.py`, `test-v3.cjs` (one count).
- Seven game modes; direct rover driving with instruments and 16 discoveries; canyon and site scenery; 7 modules, 6 technologies, 3 experiments; water and wear in selected modes; Colony, Journal and NASA explorer tabs; mission generator and six designed missions; explained score; save slots, export, import; voice and performance settings.
- Original campaign: same rules and numbers. v2 and v3 saves load.
- Not built: external AI for Pip, splitting `game.js`, site interiors.

## v3.2 (2026-11-15) landing sequence
Changed file: `source/game.js` only. Rules, data and saves untouched.
- New crew lander model: foil-wrapped descent stage with four propellant tanks, a five-engine cluster, four braced legs with
  dished footpads, a boarding ladder, a pressure cabin with windows, hatch, porch and handrails, thruster pods, a docking ring,
  a dish antenna and a beacon.
- Landing: the lander now flies in sideways, leaning back to brake, straightens up and lowers itself slowly for the last metres.
  Layered engine plume, a light from the engines on the ground, dust blown outward that thickens near the surface, a small
  camera shake, and the legs settle at touchdown.
- The lander no longer turns into the habitat. It lands beside the base and stays parked there as the ride home
  (it replaces the old distant rocket). The habitat inflates from its cargo pack while the commander looks on.
- Checked: smoke test (28) and the age 12 end-to-end test, which plays the cinematic, pass. Reduce motion still skips it.

## v3.1 (2026-11-15) graphics pass, realistic look
Rules, data, saves and tests are untouched. Changed files: `source/game.js` (scene) and `source/shell.html` (skin CSS).
- Ground: a generated height field now makes both the colour texture and a normal map, so sand ripples and pebbles catch the light.
  Muted Mars colours instead of bright orange. 480 boulders in two rock types and 900 loose stones.
- Sky and light: butterscotch daytime sky with a dusty horizon band, a blue glow round the Sun that grows as the Sun gets low
  (as seen by Mars rovers), matching fog and softer warm-white sunlight.
- Hardware: off-white hull with panel seams, rivets and dust staining; gold foil skirts; near-black solar cells; supply tanks,
  handrails and a roof antenna on the habitat; power cables from the habitat to each station; rover wheels with treads and spokes.
- Astronaut: rebuilt with adult proportions, a gold visor, helmet lamps, chest unit, life-support backpack, gloves and boots.
  Knees and elbows now bend when walking. The crewmate is full size.
- Pip: rebuilt as a small free-flying helper drone with two fan pods, a sensor pod and an antenna. Same face and moods.
- Interface: graphite panels, thin rules, square corners, monospace read-outs, amber as the one accent colour, flat buttons,
  call-out style place labels. High-contrast mode is unchanged.
- Checked: all rules tests, smoke test (28) and end-to-end test (ages 8 and 12) pass. Not measured: frame rate on real hardware.
  The scene has more triangles than before; the game still lowers resolution and shadow detail by itself if frames are slow.

## v3 (2026-11-15)
Added
- Mission control console (`#console`): Mars map, research tree, science lab, Sun dashboard. Keys M, R, L, N; Esc closes.
- Research: 12 technologies in 6 fields, research points, prerequisites. Each technology changes a rule in `model.js`.
- Science lab: 5 experiments with a slider model, an observation and a question. Research points once per mission.
- Colony: pads 5 and 6 (open at 2 and 4 modules), Storage depot, Research lab, Comms tower, module levels 1 to 3.
- Rover sites: Old lander, Canyon rim (exposed ground costs more Safety on active-Sun days).
- Mission alerts: 6 kinds, 3 per mission from Sol 2, every one has a no-cost choice.
- 9 extra missions, 10 achievements, a science report on the results card.
- Pip: moods, blink and idle movement, typed questions with built-in answers.
- World: dusk and stars, rover wheels and tracks, new module models, level rings, loading veil.
- Audio: music, ambience and effects channels with their own volume, Mute all, 5 new effects, rover hum.
- Two-player roles: Engineer (odd sols) and Scientist (even sols).
- `M.normalize`: saved games are checked and repaired on load; v2 saves gain the new fields with neutral values.
- `test-v3.cjs`: 138 checks. `docs/ARCHITECTURE.md`.

Changed
- Unlock levels: storage 2, lab 3, tower 5; lander site 2, canyon 4. Older unlocks unchanged.
- Supplies can be stored above 100 only with a Storage depot.
- Navigation test now covers 289 routes (was 225) because of the two new pads.
- Welcome title reads "Little Mars v3: Storm Watch".

Not changed
- The five-sol campaign, the NASA risk rule, the archive, the score, v2 costs and gains for anything a v2 player could do.
  `test-model.cjs`, `test-navigation.cjs`, `test-camp.cjs`, `test-smoke.cjs` and `test-e2e.cjs` are unedited and pass.

## v2
Visual rebuild of the 3D world and interface skin. Rules untouched.

## v1
Original Storm Watch: five-sol mission on real DONKI weeks, colony pads, rover, levels, badges, crew mode, teacher guide.
