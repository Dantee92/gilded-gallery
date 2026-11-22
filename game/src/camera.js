// The wall cameras: the game's second threat, and the faster one. A camera never
// chases and never sleeps — it sweeps its red cone back and forth across the gallery
// and feeds the alarm meter whenever the thief is inside it. Smoke blinds a camera
// exactly like it blinds a guard: a thief inside a cloud, or a camera lens inside
// one, sees nothing.

import { CAMERA, TILE } from './config.js';
import { isSightBlocker, isVelvet, tileCenter } from './level.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when the straight line from (x0, y0) to (x1, y1) crosses no sight blocker. */
function lineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    if (isSightBlocker(grid, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

export function createCamera(def) {
  const at = tileCenter(def.tx, def.ty);
  return {
    x: at.x,
    y: at.y,
    base: def.base,
    sweep: def.sweep ?? CAMERA.sweep,
    speed: def.speed ?? CAMERA.speed,
    angle: def.base,
    time: 0,
    spotted: false,
  };
}

/** One fixed step: the cone sweeps around its base angle. */
export function stepCamera(camera, dt) {
  camera.time += dt;
  camera.angle = camera.base + Math.sin(camera.time * camera.speed) * camera.sweep;
}

/**
 * Can this camera see the player right now? Range, cone angle and line of sight must
 * all hold. A thief in a velvet alcove is invisible unless the camera is very close.
 * Sneaking does not fool a camera — only cover and smoke do.
 */
export function cameraSees(camera, grid, player, inSmoke) {
  if (inSmoke && (inSmoke(player.x, player.y) || inSmoke(camera.x, camera.y))) return false;
  const dx = player.x - camera.x;
  const dy = player.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA.range) return false;
  const inVelvet = isVelvet(grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  if (inVelvet && dist > CAMERA.velvetSpotRange) return false;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angle, camera.angle)) > CAMERA.halfAngle) return false;
  return lineOfSight(grid, camera.x, camera.y, player.x, player.y);
}
