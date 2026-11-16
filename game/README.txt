LITTLE MARS
===========
This is version 4. Everything from v3 (Storm Watch) is still here; the v3 notes follow below, unchanged.

IMPORTANT, PLEASE READ: STATUS OF THIS BUILD
  * The v4 RULES are finished and pass 2,207 automated checks, and the four older rule tests still pass.
  * The v4 SCREENS AND 3D FEATURES are written and the game loads in Chrome with no errors, but most of them have
    NOT been tested in a browser yet. Expect bugs there. See docs/TEST-REPORT-v4.md for exactly what was and was not checked.
  * The original v3.1 project is untouched in your own copy; keep it until you have played this one.

INSTALL AND PLAY
  1. Unzip the folder anywhere.
  2. Double-click index.html. It opens in Chrome, Edge, Firefox or Safari. No internet and no install needed.
  3. Pick an age, pick a game mode (button above the Start button), press Start.

WHAT IS NEW IN v4 (where to find each thing is in docs/FEATURES-v4.md)
  * Seven game modes: Original Storm Watch, Story Expedition, Colony Builder, Free Exploration, Science Lab,
    Storm Watch Challenge, Mission Creator.
  * Drive the rover yourself: walk to the Rover station, press "Drive the rover".
      W A S D or arrows = drive    Space = brake    E = use instrument / reach site    Esc = get out
      Drag the mouse = look around   Mouse wheel = zoom   On-screen pad for touch
  * 16 discoveries (rock scans, ground scans, photographs) at the five far sites, kept in a journal.
  * 7 new colony modules, 6 new technologies in 3 new fields, 3 new experiments (8 in all).
  * Water and module wear, only in the modes that say so. The original campaign plays by its old numbers.
  * Mission control has three new tabs: Colony (C), Journal (J), NASA explorer (H).
  * Save slots, export and import: title screen > Saved missions, or Settings.
  * Pip answers from the real game state ("What should I do today?", "Why is my power low?", "What did I discover?").
  * Settings: voice speed and volume, Stop reading, graphics performance (Automatic / High / Balanced / Performance).

REBUILD index.html AFTER EDITING SOURCE
  cd source
  python3 build.py          (needs Python 3 only)
  The build joins three.min.js, the NASA data, spaceweather.js, model.js, model4.js, story.js, game.js,
  v3ui.js and the files in source/v4/ into the single index.html.

RUN THE TESTS (needs Node 18 or newer)
  cd source
  node test-model.cjs && node test-navigation.cjs && node test-v3.cjs && node test-camp.cjs && node test-v4.cjs
  Browser tests (need Google Chrome): node test-smoke.cjs, test-e2e.cjs, test-clickall.cjs. These were NOT rerun on v4.

REFRESH THE NASA ARCHIVE (optional, needs internet)
  Unchanged from v3: see SETUP below and the scripts/ folder. Then rebuild.

DOCUMENTS
  docs/FEATURES-v4.md      every v4 feature and where to find it
  docs/TEST-REPORT-v4.md   what was tested, results, known gaps
  docs/ARCHITECTURE.md     how the code is organised
  docs/CHANGELOG.md        what changed
  docs/TESTING.md          how to run and extend the tests, and a browser checklist
  docs/PLAYTEST.md         supervised playtest protocol (no playtest has been run)
  teacher-guide.html       classroom guide

---------------------------------------------------------------------------------------------------------
THE v3 README FOLLOWS
---------------------------------------------------------------------------------------------------------

LITTLE MARS v3 — STORM WATCH
A 3D Mars exploration and colony game for ages 7–15, driven by real NASA space-weather data.

PLAY
1. Extract this ZIP completely.
2. Open index.html in a recent Chrome, Edge, Firefox or Safari browser.
3. Choose “Let’s land on Mars”. No installation, account or internet is required.
   The browser needs WebGL graphics enabled. NASA source links need internet.

CONTROLS
- Click a place’s label, or choose a destination in Places: your astronaut walks there.
- WASD / arrow keys: walk. E: interact with a nearby station.
- Camera: drag with the mouse or one finger to turn and tilt. Mouse wheel or two-finger pinch zooms. The arrow and + / − buttons do the same. A quick click or tap still sends the astronaut there.
- Customize your astronaut on the start screen: 11 helmets (animals and an alien), suit, trim, visor and backpack colours, and a chest patch. It is saved in the browser.
- Touch controls and a following camera are provided for small screens.
- Help explains the rules. Read-aloud instructions and sound are optional.
- Pause → Retry this sol restores the current day’s starting supplies.

WHAT IS NEW IN VERSION 3
Everything from version 2 is kept: the five-sol mission, NASA DONKI data, levels, badges, two-player turns, saves and the
accessibility settings. Old saves load. Version 3 adds, all wired to real game rules:
- Mission control (the Control button, or keys M, R, L, N): four screens.
  M  Mars map: the base, six pads and five rover sites, with locked places, explored places and exposed (hazard) ground marked.
     Pick a place to see what it gives and to walk or drive there.
  R  Research tree: 12 technologies in six fields (solar power, oxygen, radiation protection, rovers, greenhouses,
     communications). Each one changes a rule of the game. Bought with research points.
  L  Science lab: five hands-on experiments (shielding, solar energy, water from ice, splitting water for oxygen, rock types).
     Each gives research points once per mission.
  N  Sun dashboard: the week's NASA observations beside the game's Calm, Watch and Storm levels, with the source and time.
- Research points come from scanning rocks (1), rover trips, experiments (2), Earth's reply and a Research lab module.
- Colony: six pads (East terrace opens at 2 modules, Sunrise shelf at 4). Three new modules: Storage depot (+30 air and food
  storage), Research lab, Comms tower. Every module can be upgraded to Level 2, and to Level 3 once its technology is researched.
- Rover: two new sites. Old lander (research points) and Canyon rim (research points, exposed ground).
- Mission alerts: three per mission from Sol 2 on (rescue, solar fault, radio failure, buried ice, rockfall, cargo).
  Each shows its costs first, always has one choice that costs nothing, and Pip says which one it would pick.
- Nine extra missions and ten achievements in the Mission book. A science report at the end lists what you studied.
- Pip: a face with moods, idle movement, and answers to typed questions (built in, works offline).
- World: day turns to dusk with stars after the sol's work, rover wheels turn and leave tracks, new module models, level rings.
- Sound: separate Music, Mars wind and Effects volumes plus Mute all; new radio, alarm, build and research sounds; rover hum.
- Two players: on odd sols the Engineer builds and upgrades for 1 less power, on even sols the Scientist earns 1 more
  research point from scans and experiments.

GRAPHICS PASS (version 3.1)
A realistic look: muted Mars colours, pebbled and rippled ground with real surface relief, a butterscotch sky with the blue
glow real Mars shows round the Sun, detailed hardware (panel seams, foil, cables, tanks), a rebuilt astronaut with a gold
visor and bending knees and elbows, Pip as a small helper drone, and a flight-console style interface.
Nothing in the rules changed. See docs/CHANGELOG.md.

SETUP
Play:     open index.html. Nothing to install. Works offline (the Live week option needs internet).
Rebuild:  cd source && python3 build.py     (Python 3 only; writes ../index.html)
Test:     cd source && node test-model.cjs && node test-navigation.cjs && node test-camp.cjs && node test-v3.cjs
          node test-smoke.cjs               (needs Chrome or Edge)
          npm i playwright-core && node test-e2e.cjs
Refresh the NASA archive (optional): python3 scripts/fetch_donki.py, then rebuild.
More: docs/ARCHITECTURE.md (how it is put together), docs/CHANGELOG.md, docs/TESTING.md, teacher-guide.html.

HONEST LIMITS OF VERSION 3
- Two-player is still two people taking turns on one screen. There is no online play.
- Pip's answers are written into the game. No AI service is contacted and there are no keys in the code. A school can point
  window.LITTLE_MARS_PIP_ENDPOINT at its own server if it wants one; that is off unless someone sets it.
- The Mars map is a drawing of the game's own site, not a NASA map. The lab experiments are simple teaching models.
- Research and upgrades last for one mission. Levels, badges and achievements are kept between missions.
- Tested with automated rules tests and a headless browser. Not measured: frame rate on real laptops and tablets.
  Not done: a full mission played by hand, a screen-reader pass, a classroom trial.

COLONY (new)
Colony button: build on four pads (North ridge, East flats, South hollow, West dunes).
Modules: Solar array, Nuclear battery, Battery bank, Garden bed, Air recycler, Crew quarters.
Each pad holds one module; pads differ in sunlight, dust and safety.
Science rover: Places → Science rover → Ice crater (+air), Lava tube (+Safety), Dry riverbed (+food).
Weather events (dust storm, dust devil, cold snap) hit some sols; the Outlook says which.
Eight short bonus missions and checkpoints are in the Mission book.
At the end, Pip scores how sustainable your colony is (100 points, eight parts).
Difficulty (Easy, Normal, Hard) is chosen on the welcome card. It changes the rules,
not only the supplies: radiation cost, air use, morning power and whether Pip warns you.

AGE, CAMPS AND REWARDS (new)
The welcome card asks the commander's age first.
- Under 10: pre-built camp, friendlier bonus missions, Easy preselected, and Pip plans each sol step by step.
- 10 and up: a bare landing site with survey markers. A short cinematic shows the lander arriving, then the player
  sets up the solar field, greenhouse, air maker and radio dish (and builds the shelter) before using them.
- Every mission gives XP and a badge. XP builds ten levels and five wristband tiers (Dust, Copper, Silver, Gold, Aurora),
  shown in the top bar and the Mission book. Badges turn silver and gold on repeat. Progress stays on the device.
- Pip's help setting (welcome card) is separate from age: Automatic, Step-by-step (guided sols, friendlier bonus goals) or Light.
- Ask Pip (Pip button or the P key): next step, today's plan, why today is Calm, Watch or Storm, and a plain-words glossary.
- Pip's science check at the end: five questions, one drawn from the player's own week of NASA data (XP and a badge).
- Crew mode: two commanders take turns, one sol each, on one screen. Pick Players on the welcome card.
- Aa button (and Settings on the welcome card): text size, high contrast, reduce motion, sound captions, volume, read-aloud.
- teacher-guide.html (next to index.html): learning goals, lesson plan, answer key and what is real versus simplified.
Space weather comes from NASA DONKI: a static archive (2024-01-01 to 2025-10-31, retrieved 2026-11-15) or, only if you choose Live, the last 5 days.
- NASA observation vs. game interpretation: DONKI provides real observations. The game converts them into simplified Calm, Watch and Storm levels
  (X flare or particle event = Storm; M flare or a 1,500 km/s cloud = Watch; otherwise Calm). These are educational game levels, not NASA safety warnings.
- Curated archive: 148 of 666 possible five-day windows were selected so a mission never starts on a Storm and never has two Storms in a row.
- Gameplay adjustment: some live observations may be shown as Watch instead of Storm to keep missions playable. The forecast says when this happens.
- Level unlocks: Level 2 battery, 3 riverbed trip, 4 recycler, 5 lava tube trip, 6 quarters, 7 Grid master, 8 nuclear battery, 9 Storm chaser, 10 Legend's challenge.
- Sustainability score: generation, storage and reliability of power are scored separately (the card explains each part).
- Warm-up and science check: the same four space-weather questions early (offered at the start of Sol 2, skippable) and after play.

VISUAL UPGRADE (version 2)
Rules, missions, data, saves and accessibility options are unchanged; source/model.js, spaceweather.js, story.js and every test file are untouched.
Changed files: source/game.js (3D world, camera, weather visuals) and source/shell.html (interface skin, welcome card).
- World: real terrain with dunes, mesas, craters and boulders; a Mars sky with haze; the Sun crosses the sky as daylight minutes are spent.
- Models: every station, the six colony modules, build pads, rover, lander, rocket, astronauts and Pip are rebuilt with rounded shapes
  and metal, foil and glass materials. Solar panels (field and pad arrays) turn to face the Sun.
- State you can see: grow lights glow when on, soil bags appear on the shelter, scanned rocks get a green flag and ring, radio rings
  rise from the dish while a reply is travelling, survey crates mark stations that are not set up yet.
- Weather you can see: Storm days tint the sky violet with falling sparkles and a pulsing screen edge; dust storms bring thick haze;
  cold snaps turn the light pale; the dust devil is a spinning column. Reduce motion switches the moving effects off.
- Camera: perspective view with smooth zoom; the landing cinematic ends in the new game view. Footsteps kick up dust.
- Interface: glass panels, colour-coded supply bars, clearer place labels, dock icons, pressable buttons.
  High-contrast mode keeps its own plain styling.
- Welcome card: week, difficulty, Pip's help, players and read-aloud are folded into "Mission options" so the Start button is always in view.
- Slow computers: the game lowers its render resolution, then shadow detail, if frames take too long.
Checked for this version: test-model, test-navigation, test-camp and test-smoke pass; test-e2e passes for ages 8 and 12 with longer
click timeouts under software rendering. Not checked: frame rate on real laptops and tablets, and a hand-played full mission.

PRIVACY
Little Mars does not upload player names, ages or gameplay progress to our servers. Profiles and progress are stored locally in the browser on the
device being used. Clearing browser data may erase saved progress. Only if you choose Live does the game contact NASA's DONKI service to retrieve public
space-weather observations; that request does not include the player's name, age or progress. The archive works offline once the page has loaded.
NASA OSDR data is not used.

MISSION
Keep the crew supplied for five sols (Mars days). Build a storm shelter,
grow and harvest food, scan three different rocks, and receive Earth’s reply.
Tasks show costs before completion. Walking and reading do not advance time.
The crew uses 18 air and 12 food each night. Power is shared between machines.
Plants need two powered nights; return to switch the grow lights on again.
On Sol 3, rest in the shielded shelter before mission minute 60.
A radio reply takes 40 mission minutes after sending, including time overnight.
Progress saves on this device when browser storage is available.

SCIENCE
Mission book → Real NASA science explains and links the sources.
The storm is inspired by an archived May 20, 2024 Curiosity observation.
The communication scenario uses a 20-minute one-way light travel time.
Resource points, crop growth, work times and shielding are teaching models,
not engineering predictions or live NASA data. The story and sample sites are fictional.
Independent educational prototype, not endorsed by NASA.

EDITABLE SOURCE (optional; not needed to play)
source/shell.html — interface and styles
source/game.js — 3D world, movement, tasks and learning flow
source/model.js — mission rules and resource accounting
source/three.min.js — bundled Three.js 0.160.1 graphics library
source/build.py — rebuild index.html using Python 3 (finds the data folder next to source, or two levels up)
source/test-model.cjs, test-navigation.cjs and test-camp.cjs — checks using Node.js
source/test-smoke.cjs — real-browser smoke test (Chrome or Edge, Node 22+, no packages): node test-smoke.cjs
source/test-e2e.cjs — Playwright real-mouse click-through (npm i playwright-core; Edge or Chrome): node test-e2e.cjs
Run tests from the source directory. The Three.js license is included.

VERIFICATION
Checked a winning five-sol mission, resource limits, crop care, storm rules,
rescue, delayed communications across sols, and 225 obstacle-avoiding routes, a base-game bot (592 runs) and a colony bot (444 runs).
Browser-tested movement and planting, scanning, air, cleaning, building,
harvesting, shelter, daily learning questions and sending a radio report.
