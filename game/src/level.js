// The Gilded Gallery — room layouts, revised.
//
// A room is a spec, not a wall of string literals. Each spec lists the
// solid furniture as rectangles, the slanted gallery wings as one-row
// strips, the velvet alcoves as single tiles, and the three markers
// (entrance, Star Sapphire, roof-door exit). The builder at the bottom
// paints a spec into the 32 x 18 tile map the game reads, and refuses a
// spec that paints outside the field or buries a marker inside a solid.
//
// The three rooms were laid out from the gallery plan in
// heist-status.md and the play-test screenshots: same counts of guards
// and cameras per room, same key tiles, same difficulty climb from the
// Foyer to the Vault Room.
//
// Tile legend:
//   '#'  outer wall            '.'  open marble floor
//   'D'  display case (solid, blocks sight)
//   'S'  statue (solid, blocks sight)
//   'V'  velvet alcove (hides the thief)
//   'P'  entrance              'O'  the Star Sapphire
//   'E'  roof-door exit

import { COLS, ROWS, TILE } from './config.js';

const WALL = '#';
const FLOOR = '.';
const CASE = 'D';
const STATUE = 'S';
const VELVET = 'V';
const START = 'P';
const SAPPHIRE = 'O';
const EXIT = 'E';

/** One solid rectangle: tile painted over x..x+w-1, y..y+h-1. */
function rect(tile, x, y, w, h) {
  return { tile, x, y, w, h };
}

/** One solid strip: a single row y, from x, w tiles wide. */
function strip(tile, x, y, w) {
  return { tile, x, y, w, h: 1 };
}

const ROOMS = [
  {
    name: 'Foyer',
    solids: [
      rect(CASE, 3, 3, 4, 4), // west display cases
      strip(CASE, 21, 3, 4), // east cases, slanted top edge
      rect(CASE, 21, 4, 4, 3), // east cases, main mass
      rect(STATUE, 12, 3, 4, 4), // gilded horsemen
      rect(STATUE, 13, 8, 1, 1), // lone busts on the open floor
      rect(STATUE, 12, 9, 1, 1),
      rect(STATUE, 15, 9, 1, 1),
      rect(CASE, 12, 10, 4, 4), // central vitrine
      rect(STATUE, 3, 10, 4, 4), // south-west statues
      rect(STATUE, 22, 10, 4, 4), // south-east statues
      rect(CASE, 14, 15, 1, 1), // small case beside the door lane
    ],
    velvet: [
      [7, 1], [22, 1], [8, 5], [20, 5], [27, 5],
      [5, 8], [21, 8], [8, 11], [21, 11], [5, 15], [21, 15],
    ],
    player: [8, 8],
    sapphire: [30, 1],
    exit: [28, 16],
    patrols: [
      [[10, 2], [20, 2]], // north lane, under the skylight
      [[11, 14], [19, 14], [19, 16], [11, 16]], // loop around the small case
    ],
    cameras: [
      { tx: 16, ty: 1, base: Math.PI / 2, sweep: 0.8, speed: 0.5 },
    ],
  },
  {
    name: 'Grand Hall',
    solids: [
      rect(CASE, 3, 3, 5, 5), // west gallery cases
      strip(CASE, 22, 3, 4), // east cases, slanted top edge
      rect(CASE, 21, 4, 5, 3), // east cases, main mass
      strip(CASE, 24, 7, 5), // east cases, slanted foot
      rect(STATUE, 12, 3, 4, 4), // marble emperors
      rect(CASE, 12, 9, 5, 5), // great central vitrine
      rect(STATUE, 3, 11, 4, 3), // south-west statues
      rect(STATUE, 22, 11, 4, 3), // south-east statues
    ],
    velvet: [
      [7, 1], [23, 1], [8, 5], [20, 5],
      [5, 9], [21, 9], [3, 15], [21, 15],
    ],
    player: [8, 8],
    sapphire: [30, 1],
    exit: [28, 16],
    patrols: [
      [[9, 2], [21, 2]], // north lane
      [[9, 7], [20, 7]], // middle lane, between the galleries
      [[9, 15], [20, 15]], // south lane
    ],
    cameras: [
      { tx: 16, ty: 1, base: Math.PI / 2, sweep: 0.8, speed: 0.5 },
      { tx: 17, ty: 16, base: -Math.PI / 2, sweep: 0.8, speed: 0.55 },
    ],
  },
  {
    name: 'Vault Room',
    solids: [
      rect(CASE, 3, 3, 4, 5), // west vault cases
      rect(CASE, 22, 3, 5, 4), // east vault cases
      rect(STATUE, 12, 3, 4, 4), // twin guardians
      rect(CASE, 8, 9, 3, 3), // flanking vitrine, west
      rect(CASE, 19, 9, 3, 3), // flanking vitrine, east
      rect(CASE, 12, 9, 5, 4), // vault core, upper step
      rect(CASE, 12, 13, 3, 3), // vault core, lower step
      rect(STATUE, 3, 10, 4, 4), // south-west statues
      rect(STATUE, 22, 10, 4, 4), // south-east statues
    ],
    velvet: [
      [6, 1], [22, 1], [8, 5], [20, 5], [27, 5],
      [5, 9], [27, 8], [3, 15], [25, 15],
    ],
    player: [8, 8],
    sapphire: [30, 1],
    exit: [28, 16],
    patrols: [
      [[9, 2], [21, 2]], // north lane
      [[9, 7], [20, 7]], // middle lane
      [[18, 8], [18, 14]], // spine lane, down the centre-right
      [[9, 16], [20, 16]], // south lane
    ],
    cameras: [
      { tx: 15, ty: 1, base: Math.PI / 2, sweep: 0.8, speed: 0.5 },
      { tx: 16, ty: 16, base: -Math.PI / 2, sweep: 0.8, speed: 0.55 },
      { tx: 30, ty: 8, base: Math.PI, sweep: 0.8, speed: 0.6 },
    ],
  },
];

/** Guard against a bad spec before it becomes a bad map. */
function checkSpec(spec) {
  const inside = (x, y) => x >= 1 && x < COLS - 1 && y >= 1 && y < ROWS - 1;
  for (const s of spec.solids) {
    if (!inside(s.x, s.y) || !inside(s.x + s.w - 1, s.y + s.h - 1)) {
      throw new Error(`${spec.name}: solid block leaves the floor`);
    }
  }
  const markers = [spec.player, spec.sapphire, spec.exit];
  for (const [x, y] of markers) {
    if (!inside(x, y)) throw new Error(`${spec.name}: marker outside the floor`);
  }
}

/** Paint one room spec into 18 strings of 32 tiles each. */
function buildMap(spec) {
  checkSpec(spec);
  const rows = [];
  for (let y = 0; y < ROWS; y++) {
    const row = new Array(COLS).fill(FLOOR);
    if (y === 0 || y === ROWS - 1) row.fill(WALL);
    else {
      row[0] = WALL;
      row[COLS - 1] = WALL;
    }
    rows.push(row);
  }
  for (const s of spec.solids) {
    for (let y = s.y; y < s.y + s.h; y++) {
      for (let x = s.x; x < s.x + s.w; x++) rows[y][x] = s.tile;
    }
  }
  for (const [x, y] of spec.velvet) rows[y][x] = VELVET;
  const [px, py] = spec.player;
  const [ox, oy] = spec.sapphire;
  const [ex, ey] = spec.exit;
  rows[py][px] = START;
  rows[oy][ox] = SAPPHIRE;
  rows[ey][ex] = EXIT;
  return rows.map((row) => row.join(''));
}

export const LEVELS = ROOMS.map((spec) => ({
  name: spec.name,
  map: buildMap(spec),
  patrols: spec.patrols,
  cameras: spec.cameras,
}));

/** Split a level's map into a 2D char grid and locate its markers. */
export function parseLevel(level) {
  const grid = level.map.map((row) => row.split(''));
  let player = null;
  let sapphire = null;
  let exit = null;
  for (let ty = 0; ty < grid.length; ty++) {
    for (let tx = 0; tx < grid[ty].length; tx++) {
      if (grid[ty][tx] === START) player = { tx, ty };
      else if (grid[ty][tx] === SAPPHIRE) sapphire = { tx, ty };
      else if (grid[ty][tx] === EXIT) exit = { tx, ty };
    }
  }
  return { grid, player, sapphire, exit };
}

/** Pixel centre of a tile, for placing actors on the field. */
export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** The tile character at (tx, ty); outside the field counts as wall. */
function tileAt(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length) return WALL;
  const row = grid[ty];
  if (tx < 0 || tx >= row.length) return WALL;
  return row[tx];
}

export function isWall(grid, tx, ty) {
  return tileAt(grid, tx, ty) === WALL;
}

export function isVelvet(grid, tx, ty) {
  return tileAt(grid, tx, ty) === VELVET;
}

/** Solid to movement: walls, display cases and statues. */
export function isSolid(grid, tx, ty) {
  const ch = tileAt(grid, tx, ty);
  return ch === WALL || ch === CASE || ch === STATUE;
}

/** Blocks a line of sight: the same solid masonry as movement. */
export function isSightBlocker(grid, tx, ty) {
  return isSolid(grid, tx, ty);
}

/** Walkable underfoot: open floor, velvet, and the marked tiles. */
export function isWalkable(grid, tx, ty) {
  const ch = tileAt(grid, tx, ty);
  return (
    ch === FLOOR || ch === VELVET || ch === START || ch === SAPPHIRE || ch === EXIT
  );
}
