# Little Mars v4: feature report

Status key: **Rules tested** = covered by `source/test-v4.cjs` (Node). **Seen working** = observed in headless Chrome.
**Untested in browser** = code is written and loads without errors, but nobody has used it yet.

## Game modes (title screen > "Game mode" button above Start)
| Mode | What it is | How you win | Status |
|---|---|---|---|
| Original Storm Watch | The v3 five-sol campaign, same numbers, plus 3 optional side missions | Shelter, harvest, 3 samples, Earth's reply | Rules tested; start seen working |
| Story Expedition | 8 sols of real NASA weather, water tracked, six chapters | The four goals and at least 4 chapters | Rules tested (bot wins 115/120 weeks); start seen working |
| Colony Builder | 8 sols, water, module wear and repair, cheaper builds | 5 modules and sustainability score 60+ | Rules tested (bot wins 117/120); untested in browser |
| Free Exploration | No goals. Supplies off (nothing runs out) or on (12 practice sols) | Cannot lose with supplies off | Rules tested; untested in browser |
| Science Lab | All 8 experiments free, no clock | No losing | Rules tested; untested in browser |
| Storm Watch Challenge | Quiz on 8 real archive days: name the level, choose the careful action | Score out of 16 | Round picking tested; screen untested |
| Mission Creator | Pick up to 3 objectives, play them over 5 sols; saved on the device | Finish every objective | Rules tested; screen untested |

"Scientific Explorer" and "Challenge Mode" from the brief are covered by Free Exploration + Science Lab and by the Storm Watch Challenge.

## Rover (walk to the Rover station > "Drive the rover")
- Direct driving with acceleration, braking, steering, turning circle, slopes, four ground types, collisions, world edge, optional steering assist. Physics **rules tested** (frame-rate independent). Driving on screen **untested in browser**.
- Automated trips from the map are unchanged and still work alongside.
- Instruments (press E at a marker): rock scanner (class, look, minerals, explanation), ground scanner, camera. 16 spots: 3 at each far site, 1 near the base. Each costs supplies through the normal rules and gives research points. **Rules tested.**
- Environment sensors panel while driving: temperature, pressure, wind, visibility (labelled as game simulation) and the Sun level (labelled with its NASA record date). **Rules tested.**
- Rover model: suspension arms, camera mast, robot arm, antennas, power unit, light bar, dust that builds up. **Untested by eye.**

## World
- A canyon cut into the terrain north of the Canyon rim, far mountains, mesas, dunes.
- Scenery at each site: Ice crater wall and frost, Lava tube mound and cave mouth with a dim light, Dry riverbed channel with pebbles and sand bars (a dead river valley runs from it to the canyon), Canyon rim rock pillars and edge markers, Old lander parachute and debris, crates and a windsock at the landing zone.
- Weather: a second dust layer and ground streaks in dust storms, frost in cold snaps, the dust devil puffs at the solar field, night lights. All respect Reduce Motion.
- Status: loads without errors; one visual bug (a giant dark shape) was found and fixed; the rest is **untested by eye**.

## Colony
- 7 new modules (build at any pad, or Mission control > Colony > Build planner): Water extractor, Greenhouse wing, Power hub, Medical bay, Observatory, Comms centre, Sample lab. Each changes a rule. **Rules tested.**
- New actions on those pads: Observe the sky, Science exchange with Earth, Analyse samples, Repair. **Rules tested.**
- Colony tab (press C): every supply with how it is made, used and stored; building table with condition; build planner with a before/after preview and a Confirm button; construction history. Numbers **rules tested**; screen **untested in browser**.
- Construction scaffold and crane, condition masts on pads (round = good, diamond = worn, cross = offline). **Untested by eye.**

## Research and science
- 18 technologies in 9 fields (12 kept, 6 new: Ice drill, Water recycling, Field spectrometer, Ground radar, Panel-cleaning robot, Maintenance robots). Mission control > Research. **Rules tested.**
- 8 experiments (5 kept, 3 new: Greenhouse growth, Thermal insulation, Energy storage). Each has a method card: question, equipment, variables, Mars link, limits. Mission control > Science lab. New ones **untested in browser**.

## NASA data
- NASA explorer tab (press H): any month of the bundled archive, a timeline of days, details per day, compare two days, how the game level is worked out. Missing values print as "none recorded". **Untested in browser.**
- Long missions use real consecutive archive days; eased days are marked. **Rules tested against the archive.**
- A live week is fetched once and kept for 3 hours. **Untested.**

## Pip
- Answers built from the game state: plan for today, power, water, CME, flares, discoveries, location, repairs, missions, sensors, score. **Rules tested.** Falls back to the v3 answers otherwise.
- Voice speed, voice volume, Stop reading button (Settings). Fan blades and floating. **Untested in browser.**
- NOT built: the optional external AI endpoint. Pip is offline only.

## Missions and scoring
- Mission generator (13 templates, constrained by level, mode and difficulty) and six designed missions. Shown in the Missions book. **Rules tested.**
- Score report out of 100 with a reason for each of seven parts, shown on the results card. Outdoor work in a solar storm loses points. **Rules tested.**

## Interface
- Title screen: Game mode, Exploration journal, Science database, Saved missions, Credits. Mode chooser **seen working**.
- HUD: water gauge (when tracked), clock, simulated temperature, mode name, chapter counter. **Seen working.**
- Exploration journal: Mission control > Journal (press J) or the title screen. Kept between missions.

## Saves
- Autosave format unchanged, so v2 and v3 saves load. **Tested with real old save files.**
- 3 slots, export to a file, import with validation, confirmation before any replace or delete, a warning before a new game replaces a saved one, damaged saves set aside. Logic **rules tested**; screens **untested in browser**.

## Performance
- Profiles in Settings: Automatic, High, Balanced, Performance (pixel ratio, shadow size, scenery, particles).
- A real frame-time meter; Settings shows the measured frame rate on your device.

## Not done
- External AI endpoint for Pip.
- Splitting the old `game.js` into modules (only new code is modular).
- Explorable interiors such as inside the lava tube.
- Multiple campaign slots running at once (slots are copies; one mission is active).
- Two-player mode: unchanged apart from role bonuses applying to the new actions.
- Human playtesting: one informal playtest with a 12-year-old; the formal protocol has not been run.

## Astronaut customizer and camera (v4.2)

- Start screen button "Customize your astronaut": helmets (classic, fox, cat, bunny, bear, panda, frog, dino, owl, unicorn, alien), suit, trim, visor and backpack colours, chest patch. A close-up view turns with a drag or the turn buttons. Saved as `profile.look`.
- Camera: drag to turn and tilt, wheel or pinch to zoom, quick tap still walks there.
