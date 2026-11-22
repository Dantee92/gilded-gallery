// The rooms: tile maps, guard patrols and camera placements. Tiles are 40 px; maps are
// COLS by ROWS. Legend: '#' wall, '.' marble floor, 'D' display case (solid, blocks
// line of sight), 'S' statue (solid, blocks line of sight), 'V' velvet shadow alcove
// (cover: hides the thief), 'P' thief start, 'O' the Star Sapphire (the thing to
// steal), 'E' the roof door (the exit). Guard patrols are lists of tile waypoints; a
// guard spawns at its first waypoint. Cameras sit on floor tiles by the wall and sweep.
// Case and statue blocks are filled solid: a hollow block would seal floor inside it.

import { COLS, ROWS } from './config.js';

export const LEVELS = [
  {
    name: 'Foyer',
    par: 75,
    map: [
      '################################',
      '#P.....V......D.......V.......O#',
      '#..............................#',
      '#..DDDD.....SSSS.....DDDD......#',
      '#..DDDD.....SSSS.....DDDD......#',
      '#..DDDD..V..SSSS..V..DDDD...V..#',
      '#..DDDD.....SSSS.....DDDD......#',
      '#..............................#',
      '#....V.......D.........V.......#',
      '#...........D..D...............#',
      '#..SSSS.....DDDD.....SSSS......#',
      '#..SSSS..V..DDDD..V..SSSS......#',
      '#..SSSS.....DDDD.....SSSS......#',
      '#..SSSS.....DDDD.....SSSS......#',
      '#..............................#',
      '#....V........D.......V........#',
      '#...........................E..#',
      '################################',
    ],
    patrols: [
      [[4, 2], [27, 2]],
      [[4, 16], [27, 16]],
    ],
    cameras: [
      { tx: 16, ty: 1, base: Math.PI / 2, sweep: 0.8, speed: 0.55 },
    ],
  },
  {
    name: 'Grand Hall',
    par: 100,
    map: [
      '################################',
      '#P.....V.......D......V.......O#',
      '#..............................#',
      '#..DDDDD....SSSS.....DDDDD.....#',
      '#..DDDDD....SSSS.....DDDDD.....#',
      '#..DDDDD..V.SSSS..V..DDDDD.....#',
      '#..DDDDD....SSSS.....DDDDD.....#',
      '#..DDDDD................DDDDD..#',
      '#..............................#',
      '#....V......DDDDD.....V........#',
      '#...........DDDDD..............#',
      '#..SSSS.....DDDDD.....SSSS.....#',
      '#..SSSS.....DDDDD.....SSSS.....#',
      '#..SSSS.....DDDDD.....SSSS.....#',
      '#..............................#',
      '#..V.........D.........V.......#',
      '#...........................E..#',
      '################################',
    ],
    patrols: [
      [[4, 2], [27, 2]],
      [[4, 8], [27, 8]],
      [[4, 16], [27, 16]],
    ],
    cameras: [
      { tx: 16, ty: 1, base: Math.PI / 2, sweep: 0.8, speed: 0.55 },
      { tx: 16, ty: 16, base: -Math.PI / 2, sweep: 0.8, speed: 0.5 },
    ],
  },
  {
    name: 'Vault Room',
    par: 130,
    map: [
      '################################',
      '#P....V.......D.......V.......O#',
      '#..............................#',
      '#..DDDDD....SSSS.....DDDDD.....#',
      '#..DDDDD....SSSS.....DDDDD.....#',
      '#..DDDDD..V.SSSS..V..DDDDD.....#',
      '#..DDDDD....SSSS.....DDDDD.....#',
      '#..DDDDD.....DDDD.....DDDDD....#',
      '#...........DDDDD..............#',
      '#....V......DDDDD......V.......#',
      '#..SSSS.....DDDDD.....SSSS.....#',
      '#..SSSS.....DDDDD.....SSSS.....#',
      '#..SSSS...............SSSS.....#',
      '#..SSSS.....DDDDD.....SSSS.....#',
      '#...........DDDDD..............#',
      '#..V........DDDDD........V.....#',
      '#...........................E..#',
      '################################',
    ],
    patrols: [
      [[4, 2], [27, 2]],
      [[10, 2], [10, 14]],
      [[19, 2], [19, 14]],
      [[4, 16], [27, 16]],
    ],
    cameras: [
      { tx: 15, ty: 1, base: Math.PI / 2, sweep: 0.8, speed: 0.55 },
      { tx: 16, ty: 16, base: -Math.PI / 2, sweep: 0.8, speed: 0.5 },
      { tx: 30, ty: 8, base: Math.PI, sweep: 0.7, speed: 0.6 },
    ],
  },
];

/** Parse one level's map into a grid plus the named spots. */
export function parseLevel(level) {
  const grid = level.map.map((row) => row.split(''));
  let player = null;
  let sapphire = null;
  let exit = null;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const ch = grid[y][x];
      if (ch === 'P') player = { tx: x, ty: y };
      else if (ch === 'O') sapphire = { tx: x, ty: y };
      else if (ch === 'E') exit = { tx: x, ty: y };
    }
  }
  return { grid, player, sapphire, exit };
}

export function tileAt(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return grid[ty][tx];
}

export function isWall(grid, tx, ty) {
  return tileAt(grid, tx, ty) === '#';
}

/** Display cases and statues are solid: nobody walks through them. */
export function isSolid(grid, tx, ty) {
  const ch = tileAt(grid, tx, ty);
  return ch === '#' || ch === 'D' || ch === 'S';
}

/** Cases, statues and walls all block a line of sight. */
export function isSightBlocker(grid, tx, ty) {
  return isSolid(grid, tx, ty);
}

export function isVelvet(grid, tx, ty) {
  return tileAt(grid, tx, ty) === 'V';
}

/** True when the tile is walkable (floor, velvet, start, sapphire or exit). */
export function isWalkable(grid, tx, ty) {
  return !isSolid(grid, tx, ty);
}

export function tileCenter(tx, ty) {
  return { x: tx * 40 + 20, y: ty * 40 + 20 };
}
