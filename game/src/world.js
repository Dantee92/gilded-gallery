// The game's rules and state, with no drawing and no browser in it: the thief, the
// guards, the wall cameras, the Star Sapphire, the roof door, the alarm meter, the
// smoke pellets, lives, score and the timer. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react (and play sounds)
// without the world knowing about screens or sound.

import { ALARM, LIVES, PAR, PLAYER, SCORE, SMOKE } from './config.js';
import { LEVELS, isVelvet, parseLevel, tileCenter } from './level.js';
import { createGuard, stepGuard } from './guard.js';
import { cameraSees, createCamera, stepCamera } from './camera.js';
import { createAlarm, inSmoke, stepAlarm, throwSmoke } from './alarm.js';
import { createPlayer, movePlayer } from './player.js';

export const EVENT_SAPPHIRE = 1;
export const EVENT_CLEAR = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_OVER = 32;
export const EVENT_CAMSEEN = 64;
export const EVENT_SMOKE = 128;

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    levelName: '',
    player: null,
    guards: [],
    cameras: [],
    sapphire: null,
    exit: null,
    grid: null,
    alarm: null,
    smokeLeft: SMOKE.perLevel,
    score: 0,
    lives: LIVES,
    elapsed: 0,
    levelTime: 0,
    ghost: true,
    sapphireTaken: false,
    exitOpen: false,
    status: 'playing',
    caughtBy: '',
    maxAlert: 0,
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    const parsed = parseLevel(level);
    state.levelIndex = index;
    state.levelName = level.name;
    state.grid = parsed.grid;
    const start = tileCenter(parsed.player.tx, parsed.player.ty);
    state.player = createPlayer(start.x, start.y);
    state.guards = level.patrols.map((wp) => createGuard(wp));
    state.cameras = level.cameras.map((def) => createCamera(def));
    const sapphireAt = tileCenter(parsed.sapphire.tx, parsed.sapphire.ty);
    state.sapphire = { x: sapphireAt.x, y: sapphireAt.y, taken: false };
    const exitAt = tileCenter(parsed.exit.tx, parsed.exit.ty);
    state.exit = { x: exitAt.x, y: exitAt.y, open: false };
    state.alarm = createAlarm();
    state.smokeLeft = SMOKE.perLevel;
    state.levelTime = 0;
    state.ghost = true;
    state.sapphireTaken = false;
    state.exitOpen = false;
    state.status = 'playing';
    state.caughtBy = '';
    state.maxAlert = 0;
  }

  function reset() {
    state.score = 0;
    state.lives = LIVES;
    state.elapsed = 0;
    loadLevel(0);
  }

  /** After being caught: same room again, patrols reset, alarm drained. */
  function retryLevel() {
    loadLevel(state.levelIndex);
  }

  /**
   * One fixed step. `move` is {x, y} (-1..1 each), `sneak` a boolean, `smoke` true
   * on the frame a pellet is thrown. With `harmless` set (the title screen's
   * backdrop) the guards patrol and the cameras sweep, but the thief is never seen,
   * nothing scores and nothing catches.
   */
  function step(dt, move, sneak, harmless, smoke) {
    if (state.status !== 'playing') return 0;
    let events = 0;
    state.elapsed += dt;
    state.levelTime += dt;

    const player = state.player;
    player.sneaking = sneak;
    if (!harmless && (move.x !== 0 || move.y !== 0)) {
      const len = Math.hypot(move.x, move.y) || 1;
      const speed = (sneak ? PLAYER.sneak : PLAYER.walk) * dt;
      movePlayer(player, state.grid, (move.x / len) * speed, (move.y / len) * speed);
    }

    // Smoke first: a fresh cloud hides the thief from this step's eyes.
    if (!harmless && smoke && state.smokeLeft > 0) {
      if (throwSmoke(state.alarm, player.x, player.y, state.smokeLeft)) {
        state.smokeLeft -= 1;
        events |= EVENT_SMOKE;
      }
    }

    const smokeAt = (x, y) => inSmoke(state.alarm, x, y);
    const farAway = { x: -9999, y: -9999, sneaking: false };

    let seenByGuard = false;
    let maxAlert = 0;
    for (const guard of state.guards) {
      const wasAlerted = guard.state === 'alerted';
      stepGuard(guard, state.grid, harmless ? farAway : player, dt, smokeAt);
      if (guard.state === 'alerted') {
        seenByGuard = true;
        state.ghost = false;
        if (!wasAlerted) events |= EVENT_SPOTTED;
      }
      maxAlert = Math.max(maxAlert, guard.alert);
    }
    state.maxAlert = maxAlert;

    let seenByCamera = false;
    for (const camera of state.cameras) {
      stepCamera(camera, dt);
      const sees = !harmless && cameraSees(camera, state.grid, player, smokeAt);
      if (sees && !camera.spotted) events |= EVENT_CAMSEEN;
      camera.spotted = sees;
      if (sees) seenByCamera = true;
    }

    // The alarm meter: cameras fill it faster than guards; quiet drains it.
    if (!harmless) {
      const lockdown = stepAlarm(state.alarm, seenByGuard, seenByCamera, dt);
      if (lockdown) {
        state.caughtBy = 'lockdown';
        state.lives -= 1;
        events |= EVENT_CAUGHT;
        if (state.lives <= 0) {
          state.status = 'over';
          events |= EVENT_OVER;
        } else {
          retryLevel();
        }
        return events;
      }
    }

    if (harmless) return events;

    // The sapphire: close enough and it is yours; the roof door swings open.
    if (!state.sapphire.taken && Math.hypot(player.x - state.sapphire.x, player.y - state.sapphire.y) < 30) {
      state.sapphire.taken = true;
      state.sapphireTaken = true;
      state.exit.open = true;
      state.exitOpen = true;
      state.score += SCORE.sapphire;
      events |= EVENT_SAPPHIRE;
    }

    // Caught: an alerted guard close enough to grab the thief.
    for (const guard of state.guards) {
      if (guard.state === 'alerted' && Math.hypot(player.x - guard.x, player.y - guard.y) < 26) {
        state.caughtBy = 'guard';
        state.lives -= 1;
        events |= EVENT_CAUGHT;
        if (state.lives <= 0) {
          state.status = 'over';
          events |= EVENT_OVER;
        } else {
          retryLevel();
        }
        return events;
      }
    }

    // The roof door: sapphire in hand and the thief slips out.
    if (state.exit.open && Math.hypot(player.x - state.exit.x, player.y - state.exit.y) < 30) {
      const timeBonus = Math.max(0, Math.round((PAR[state.levelIndex] - state.levelTime) * SCORE.timeBonus));
      state.score += SCORE.levelClear + timeBonus + (state.ghost ? SCORE.ghostBonus : 0);
      events |= EVENT_CLEAR;
      if (state.levelIndex + 1 >= LEVELS.length) {
        state.score += SCORE.win;
        state.status = 'won';
        events |= EVENT_WIN;
      } else {
        state.status = 'clear';
      }
      return events;
    }

    return events;
  }

  /** Advance to the next room after a clear. */
  function nextLevel() {
    loadLevel(state.levelIndex + 1);
  }

  function playerInVelvet() {
    const player = state.player;
    return isVelvet(state.grid, Math.floor(player.x / 40), Math.floor(player.y / 40));
  }

  reset();
  return { state, reset, step, nextLevel, retryLevel, loadLevel, playerInVelvet };
}
