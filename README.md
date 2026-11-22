# The Gilded Gallery

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Dantee92/gilded-gallery/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Dantee92/gilded-gallery/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A museum heist at night for make.fun's "Make the best heist game" bounty.

Steal the Star Sapphire from a museum after dark, then slip out through the
roof door — unseen. Night guards patrol with torches; wall cameras sweep red
cones that never sleep. Every eye that finds you feeds the ALARM meter, and at
100 the museum locks down. Hide in the velvet alcoves, sneak with Shift, and
throw smoke pellets with E to blind the eyes that have you.

## How to play

- **Move:** WASD or arrow keys, or click on the floor (click-to-move)
- **Sneak:** hold Shift (slower, quieter, harder to spot)
- **Smoke pellet:** E (2 per room — blinds guards and cameras for ~4 s)
- **Pause:** P or Esc
- **Start / continue:** Space, Enter, or click

Three rooms, each harder than the last: Foyer (2 guards, 1 camera), Grand Hall
(3 guards, 2 cameras), Vault Room (4 guards, 3 cameras). Grab the sapphire to
open the roof door, then reach it. Get grabbed by an alerted guard, or let the
alarm hit 100, and you lose a life and restart the room.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot scenes: `?shot=start|play|mid|end&seed=N`.

## Files

- `game/index.html` — the page; `game/src/` — one job per file:
  `config.js` (tuning + museum palette), `random.js` (seeded RNG),
  `level.js` (maps + patrols + cameras), `player.js` (movement + wall sliding),
  `guard.js` (torch vision cones + detection), `camera.js` (sweeping wall
  cameras), `alarm.js` (alarm meter + smoke clouds), `world.js` (rules),
  `render.js` (canvas + marble + lamplight), `audio.js` (WebAudio),
  `input.js` (keyboard + click-to-move + smoke), `shots.js` (screenshot
  autopilot), `main.js` (boot + loop).
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes the
  dossier with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's copy, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4bbk343w&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
