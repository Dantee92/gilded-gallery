// The screenshot scenes behind ?shot=start|play|mid|end. Each one plays the real rules
// forward from a fresh world, steered by an autopilot that pathfinds on the tile grid
// (breadth-first, solid tiles blocked, velvet passable), waits when a guard's torch
// cone or a camera's red cone covers its next step, flees to the nearest velvet
// alcove when spotted, and throws a smoke pellet when the alarm climbs — so the
// frame is what a careful game really looks like and the same seed always gives the
// same frame.

import { FIELD, STEP, TILE } from './config.js';
import { isWalkable, tileCenter } from './level.js';
import { guardSees } from './guard.js';
import { cameraSees } from './camera.js';
import { inSmoke } from './alarm.js';
import { EVENT_CLEAR, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const MID_SECONDS = 30;
const END_LIMIT_SECONDS = 90;

/** Breadth-first path of tile centres from (sx, sy) to (tx, ty); [] when unreachable. */
function findPath(grid, sx, sy, tx, ty) {
  const cols = grid[0].length;
  const rows = grid.length;
  const key = (x, y) => y * cols + x;
  const prev = new Map();
  const seen = new Set([key(sx, sy)]);
  const queue = [[sx, sy]];
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (x === tx && y === ty) {
      const path = [];
      let cur = key(tx, ty);
      let cx = tx;
      let cy = ty;
      while (cur !== key(sx, sy)) {
        path.unshift(tileCenter(cx, cy));
        const [px, py] = prev.get(cur);
        cx = px;
        cy = py;
        cur = key(cx, cy);
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (!isWalkable(grid, nx, ny) || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      prev.set(key(nx, ny), [x, y]);
      queue.push([nx, ny]);
    }
  }
  return [];
}

/** The nearest velvet tile centre to (x, y), or null when the room has none. */
function nearestVelvet(grid, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (let ty = 0; ty < grid.length; ty += 1) {
    for (let tx = 0; tx < grid[0].length; tx += 1) {
      if (grid[ty][tx] !== 'V') continue;
      const c = tileCenter(tx, ty);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
  }
  return best;
}

function tileOf(x, y) {
  return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
}

/** Would any guard or camera see the point (x, y) right now? */
function pointSeen(state, x, y) {
  const probe = { x, y, sneaking: false };
  const smokeAt = (sx, sy) => inSmoke(state.alarm, sx, sy);
  if (state.guards.some((guard) => guardSees(guard, state.grid, probe, smokeAt))) return true;
  return state.cameras.some((camera) => cameraSees(camera, state.grid, probe, smokeAt));
}

/** Is the player seen by any guard or camera right now? */
function playerSeen(state) {
  const smokeAt = (x, y) => inSmoke(state.alarm, x, y);
  if (state.guards.some((guard) => guardSees(guard, state.grid, state.player, smokeAt))) return true;
  return state.cameras.some((camera) => cameraSees(camera, state.grid, state.player, smokeAt));
}

function nearGuard(state, range) {
  return state.guards.some((guard) => Math.hypot(guard.x - state.player.x, guard.y - state.player.y) < range);
}

/**
 * One autopilot step: returns the move {x, y, sneak, smoke} for this frame. The pilot
 * walks its path toward the objective, waits when a cone covers the next step, flees
 * to the nearest velvet alcove when spotted, and throws smoke when the alarm climbs
 * while it is seen.
 */
function autopilot(world) {
  const state = world.state;
  const player = state.player;
  const target = state.sapphireTaken ? state.exit : state.sapphire;
  const from = tileOf(player.x, player.y);
  const to = tileOf(target.x, target.y);

  let path = findPath(state.grid, from.tx, from.ty, to.tx, to.ty);
  let goal = path.length > 0 ? path[0] : { x: target.x, y: target.y };

  // Spotted: run for the nearest velvet alcove — at full walking speed, because a
  // guard chases faster than a sneaking thief — and throw smoke at once when a
  // pellet is left, so the eyes go blind while the thief runs for cover.
  if (playerSeen(state)) {
    const smoke = state.smokeLeft > 0;
    const velvet = nearestVelvet(state.grid, player.x, player.y);
    if (velvet) {
      const vpath = findPath(state.grid, from.tx, from.ty, tileOf(velvet.x, velvet.y).tx, tileOf(velvet.x, velvet.y).ty);
      if (vpath.length > 0) goal = vpath[0];
      else goal = velvet;
    }
    const moved = steerToward(player, goal, false);
    return { x: moved.x, y: moved.y, sneak: moved.sneak, smoke };
  }

  // A cone covers the next step: wait, crouched, until it sweeps past.
  if (path.length > 0 && pointSeen(state, path[0].x, path[0].y)) {
    return { x: 0, y: 0, sneak: true, smoke: false };
  }
  const moved = steerToward(player, goal, nearGuard(state, 260));
  return { x: moved.x, y: moved.y, sneak: moved.sneak, smoke: false };
}

function steerToward(player, goal, sneak) {
  const dx = goal.x - player.x;
  const dy = goal.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) return { x: 0, y: 0, sneak };
  return { x: dx / dist, y: dy / dist, sneak };
}

/**
 * Set `world` to the named scene (start, play, mid or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  if (name !== 'play' && name !== 'mid' && name !== 'end') {
    world.reset();
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, false, true, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  const levelIndex = name === 'mid' ? 1 : name === 'end' ? 2 : 0;
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'mid' ? MID_SECONDS : PLAY_SECONDS;
  world.reset();
  world.loadLevel(levelIndex);
  let events = 0;
  for (let i = 0; i < limit / STEP; i += 1) {
    const move = autopilot(world);
    events = world.step(STEP, { x: move.x, y: move.y }, move.sneak, false, move.smoke);
    if (events & (EVENT_OVER | EVENT_WIN | EVENT_CLEAR)) break;
  }
  if (state.status === 'won') return { screen: SCREEN_WIN, best: state.score };
  if (state.status === 'over') return { screen: SCREEN_OVER, best: state.score };
  return { screen: SCREEN_PLAY, best: state.score };
}
