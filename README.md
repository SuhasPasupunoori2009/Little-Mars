# Little Mars: An Outpost Adventure

**NASA Space Apps Challenge 2026 entry.** A browser game for ages 7 to 15 about keeping a small Mars base safe from space weather, using real records from NASA's DONKI database (Database Of Notifications, Knowledge, Information).

**Play it:** [suhaspasupunoori2009.github.io/Little-Mars](https://suhaspasupunoori2009.github.io/Little-Mars/). No install, no account. It also works offline: download `index.html` and double-click it.

## What the game is

You are the new commander of a tiny Mars base. Each Martian day (sol) you choose jobs for your astronaut and crew: grow food, repair air and power, collect rock samples, send science home. Some days the Sun is quiet. Some days it throws a solar flare or a coronal mass ejection, and you have to decide whether to shelter or take a risk. Every choice shows its cost before you make it.

The storms are not made up. Each week of play is built from a real week of Sun activity recorded by NASA (flare class, solar energetic particles, geomagnetic activity, CME speed). You can pick a specific real week, or let the game surprise you.

### What you can do

- **Walk, drive and look around.** Walk with WASD or by clicking or tapping. Drag with the mouse or one finger to turn and tilt the camera; use the wheel or a two-finger pinch to zoom. Drive the science rover yourself.
- **Customize your astronaut.** On the start screen: 11 helmets (fox, cat, bunny, bear, panda, frog, dino, owl, unicorn, alien, classic), suit, trim, visor and backpack colours, and a chest patch. Saved in your browser.
- **Seven game modes.** Original Storm Watch (the five-sol campaign), Story Expedition, Colony Builder, Free Exploration, Science Lab, Storm Watch Challenge (a quiz on real archive days), and Mission Creator.
- **Build and research.** Colony modules, 18 technologies, 8 experiments with method cards, and 16 discoveries to scan and photograph at five far sites.
- **Learn the Sun.** A "NASA explorer" view shows the real record next to the game level, so players can see what is data and what is game.

## How it uses NASA data

- The default weeks come from a saved copy of the DONKI archive: **670 days, 2024-01-01 to 2025-10-31**. It is built into the file, so the game needs no network.
- **Live NASA data is opt-in.** Choosing Live is the only thing that contacts NASA. If it fails, the game falls back to the saved archive.
- **Honest labels.** Screens say whether something is a NASA observation or a game simplification. Calm, Watch and Storm are the game's own levels, not NASA warnings, and the game rules simplify the real science.
- NASA dates and times are UTC. Times the player sees in the game are shown in New York time.

## For judges and teachers

- `game/docs/CHALLENGE-MATCH.md` maps the game to the challenge.
- [Teacher and parent guide](https://suhaspasupunoori2009.github.io/Little-Mars/teacher-guide.html): learning goals, a lesson plan and an answer key.
- `game/docs/CHANGELOG.md`, `FEATURES-v4.md` and `TESTING.md` describe what changed and what was checked.

## Accessibility

Text is at least 12 px, tap targets are at least 44 px, and meaning is never carried by colour alone. There are text-size, high-contrast and reduce-motion settings, and the game is playable by keyboard, mouse or touch.

## Status, stated plainly

- Automated checks pass: model, camp, navigation, v3 (152), v4 (2216), a headless-browser smoke test, a real-mouse end-to-end test, and a chores test. The smoke test has failed intermittently on a slow reload; it passes when run alone.
- **Playtested informally by a 12-year-old, and many changes came from that.** A formal playtest with more children has not been run. We have not measured frame rates on a range of devices and have not done a screen-reader pass.
- The sounds are synthesized in the browser and have not been reviewed by ear across devices.

## Build from source

One static file, no frameworks. Three.js 0.160.1 is bundled.

```
cd game/source
python build.py            # writes game/index.html from the sources
node test-model.cjs        # data against the risk rule
node test-v4.cjs           # v4 rules
```

Edit files in `game/source/`, not the generated `index.html`. The root `index.html` and `teacher-guide.html` are copies of the ones in `game/`, so GitHub Pages can serve them from the top level.

## Data and credits

- Space-weather records: NASA DONKI (public NASA data, `scripts/fetch_donki.py` refreshes the archive).
- 3D library: Three.js (MIT), see `game/THREE-LICENSE.txt`.
- Built by Team Vision for NASA Space Apps Challenge 2026.
