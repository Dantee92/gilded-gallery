// The global alarm meter and the smoke pellets. The meter rises while any guard or
// camera sees the thief — cameras fill it faster — and decays while nobody does.
// At the top the museum locks down and the thief is caught. Smoke pellets are the
// countermeasure: a thrown pellet blooms into a cloud that blinds every eye inside
// it for a few seconds, at the cost of one of a scarce few pellets per room.

import { ALARM, SMOKE } from './config.js';

export function createAlarm() {
  return { value: 0, clouds: [] };
}

/** One fixed step of the meter. Returns true when the alarm hits the top. */
export function stepAlarm(alarm, seenByGuard, seenByCamera, dt) {
  // Ticking the clouds down first: a cloud that just expired stops hiding.
  for (const cloud of alarm.clouds) cloud.t -= dt;
  alarm.clouds = alarm.clouds.filter((cloud) => cloud.t > 0);

  let rate = 0;
  if (seenByCamera) rate += ALARM.cameraRate;
  if (seenByGuard) rate += ALARM.guardRate;
  if (rate > 0) alarm.value = Math.min(ALARM.max, alarm.value + rate * dt);
  else alarm.value = Math.max(0, alarm.value - ALARM.decay * dt);
  return alarm.value >= ALARM.max;
}

/** Throw a pellet at (x, y): a cloud blooms there. Returns false when none is left. */
export function throwSmoke(alarm, x, y, left) {
  if (left <= 0) return false;
  alarm.clouds.push({ x, y, t: SMOKE.duration, r: SMOKE.radius });
  return true;
}

/** True when the point (x, y) is inside any live smoke cloud. */
export function inSmoke(alarm, x, y) {
  for (const cloud of alarm.clouds) {
    const dx = x - cloud.x;
    const dy = y - cloud.y;
    if (dx * dx + dy * dy < cloud.r * cloud.r) return true;
  }
  return false;
}
