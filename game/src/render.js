// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Torch cones are drawn additively so overlapping light brightens,
// like real lamplight; camera cones are red. Text that holds a number is rebuilt
// only when it changes.

import { ALARM, CAMERA, FIELD, FONT, GUARD, LIVES, PALETTE, SMOKE, TILE } from './config.js';
import { isVelvet, isWall } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 680, top: 150, line: 34, bottom: 76 };
const LIFE_SIZE = 18;
const LIFE_GAP = 8;

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('');
  const timeLabel = cachedLabel('');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const smokeLabel = cachedLabel('Smoke ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawTiles(state) {
    const grid = state.grid;
    for (let ty = 0; ty < 18; ty += 1) {
      for (let tx = 0; tx < 32; tx += 1) {
        const x = tx * TILE;
        const y = ty * TILE;
        const ch = grid[ty][tx];
        if (ch === '#') {
          context.fillStyle = PALETTE.wall;
          context.fillRect(x, y, TILE, TILE);
          context.fillStyle = PALETTE.wallTop;
          context.fillRect(x, y, TILE, 4);
          context.fillStyle = 'rgba(0,0,0,0.25)';
          context.fillRect(x, y + TILE - 4, TILE, 4);
        } else if (ch === 'D') {
          // A glass display case: dark glass, gold frame, a pale glint.
          context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
          context.fillRect(x, y, TILE, TILE);
          context.fillStyle = PALETTE.caseGlass;
          context.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          context.strokeStyle = PALETTE.caseFrame;
          context.lineWidth = 2;
          context.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
          context.fillStyle = PALETTE.caseGlint;
          context.beginPath();
          context.moveTo(x + 9, y + 30);
          context.lineTo(x + 16, y + 9);
          context.lineTo(x + 21, y + 9);
          context.lineTo(x + 14, y + 30);
          context.closePath();
          context.fill();
        } else if (ch === 'S') {
          // A marble statue on its plinth.
          context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
          context.fillRect(x, y, TILE, TILE);
          context.fillStyle = PALETTE.statueBase;
          context.fillRect(x + 8, y + 26, TILE - 16, 10);
          context.fillStyle = PALETTE.statue;
          context.beginPath();
          context.arc(x + 20, y + 14, 7, 0, Math.PI * 2);
          context.fill();
          context.fillRect(x + 15, y + 18, 10, 9);
        } else {
          context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
          context.fillRect(x, y, TILE, TILE);
          // Marble veining: a faint gold grout line along the bottom edge.
          context.fillStyle = PALETTE.floorEdge;
          context.fillRect(x, y + TILE - 1, TILE, 1);
          if (ch === 'V') {
            // A velvet shadow alcove: deep maroon drapes, a place to vanish.
            context.fillStyle = PALETTE.velvetDark;
            context.beginPath();
            context.arc(x + 14, y + 22, 13, 0, Math.PI * 2);
            context.arc(x + 27, y + 16, 11, 0, Math.PI * 2);
            context.arc(x + 22, y + 30, 10, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = PALETTE.velvet;
            context.beginPath();
            context.arc(x + 13, y + 20, 10, 0, Math.PI * 2);
            context.arc(x + 26, y + 15, 9, 0, Math.PI * 2);
            context.arc(x + 21, y + 28, 8, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = PALETTE.velvetFold;
            context.beginPath();
            context.arc(x + 12, y + 18, 4, 0, Math.PI * 2);
            context.arc(x + 25, y + 13, 3, 0, Math.PI * 2);
            context.arc(x + 20, y + 26, 3, 0, Math.PI * 2);
            context.fill();
          }
        }
      }
    }
  }

  function drawExit(state) {
    const exit = state.exit;
    const open = exit.open;
    context.save();
    context.translate(exit.x, exit.y);
    context.fillStyle = open ? PALETTE.exit : PALETTE.exitDim;
    context.fillRect(-16, -18, 32, 36);
    context.fillStyle = '#101623';
    context.fillRect(-11, -13, 22, 26);
    context.strokeStyle = open ? PALETTE.exit : PALETTE.exitDim;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-11, -13);
    context.lineTo(11, -13);
    context.moveTo(-11, 0);
    context.lineTo(11, 0);
    context.moveTo(-11, 13);
    context.lineTo(11, 13);
    context.stroke();
    if (open) {
      context.globalCompositeOperation = 'lighter';
      const glow = context.createRadialGradient(0, 0, 4, 0, 0, 46);
      glow.addColorStop(0, 'rgba(201, 162, 39, 0.55)');
      glow.addColorStop(1, 'rgba(201, 162, 39, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(0, 0, 46, 0, Math.PI * 2);
      context.fill();
      context.globalCompositeOperation = 'source-over';
    }
    context.restore();
  }

  function drawSapphire(state) {
    if (state.sapphire.taken) return;
    const gem = state.sapphire;
    const t = Date.now() / 1000;
    const pulse = 0.75 + Math.sin(t * 2.4) * 0.25;
    context.save();
    context.translate(gem.x, gem.y);
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(0, 0, 2, 0, 0, 46 * pulse);
    glow.addColorStop(0, 'rgba(77, 184, 255, 0.6)');
    glow.addColorStop(1, 'rgba(77, 184, 255, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 46 * pulse, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    // A faceted star sapphire: a diamond with a bright core.
    context.fillStyle = PALETTE.sapphire;
    context.beginPath();
    context.moveTo(0, -14);
    context.lineTo(10, 0);
    context.lineTo(0, 14);
    context.lineTo(-10, 0);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.sapphireCore;
    context.beginPath();
    context.moveTo(0, -6);
    context.lineTo(5, 0);
    context.lineTo(0, 6);
    context.lineTo(-5, 0);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawGuardCone(guard) {
    const range = GUARD.range;
    const half = GUARD.halfAngle;
    context.save();
    context.globalCompositeOperation = 'lighter';
    const hot = guard.state === 'alerted';
    const grad = context.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, range);
    grad.addColorStop(0, hot ? 'rgba(255, 84, 64, 0.5)' : 'rgba(255, 202, 106, 0.4)');
    grad.addColorStop(1, 'rgba(255, 202, 106, 0)');
    context.fillStyle = grad;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.arc(guard.x, guard.y, range, guard.angle - half, guard.angle + half);
    context.closePath();
    context.fill();
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = hot ? PALETTE.coneAlert : PALETTE.cone;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.arc(guard.x, guard.y, range, guard.angle - half, guard.angle + half);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawGuard(guard) {
    drawGuardCone(guard);
    context.save();
    context.translate(guard.x, guard.y);
    // Torchlight around the guard.
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(0, 0, 2, 0, 0, 34);
    glow.addColorStop(0, 'rgba(255, 202, 106, 0.5)');
    glow.addColorStop(1, 'rgba(255, 202, 106, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 34, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    // Body: coat, head, cap, torch in hand.
    context.rotate(guard.angle);
    context.fillStyle = PALETTE.guardCoat;
    context.beginPath();
    context.arc(0, 0, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(4, 0, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.torch;
    context.beginPath();
    context.arc(14, 6, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
    // Alert marker above an alerted or suspicious guard.
    if (guard.state === 'alerted') {
      text('!', guard.x, guard.y - 22, 26, PALETTE.bad, 'center');
    } else if (guard.state === 'suspicious' || guard.state === 'investigate') {
      text('?', guard.x, guard.y - 22, 24, PALETTE.warn, 'center');
    }
  }

  function drawCameraCone(camera) {
    const range = CAMERA.range;
    const half = CAMERA.halfAngle;
    context.save();
    context.globalCompositeOperation = 'lighter';
    const grad = context.createRadialGradient(camera.x, camera.y, 10, camera.x, camera.y, range);
    grad.addColorStop(0, camera.spotted ? 'rgba(255, 59, 48, 0.55)' : 'rgba(255, 59, 48, 0.35)');
    grad.addColorStop(1, 'rgba(255, 59, 48, 0)');
    context.fillStyle = grad;
    context.beginPath();
    context.moveTo(camera.x, camera.y);
    context.arc(camera.x, camera.y, range, camera.angle - half, camera.angle + half);
    context.closePath();
    context.fill();
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = camera.spotted ? PALETTE.cameraConeHot : PALETTE.cameraCone;
    context.beginPath();
    context.moveTo(camera.x, camera.y);
    context.arc(camera.x, camera.y, range, camera.angle - half, camera.angle + half);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawCamera(camera) {
    drawCameraCone(camera);
    context.save();
    context.translate(camera.x, camera.y);
    // Wall-mounted unit: dark box, red lens, blinking when it has the thief.
    context.rotate(camera.angle);
    context.fillStyle = PALETTE.cameraBody;
    context.fillRect(-8, -6, 16, 12);
    context.fillStyle = camera.spotted ? '#ff8a80' : PALETTE.cameraLens;
    context.beginPath();
    context.arc(8, 0, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (camera.spotted) {
      text('!', camera.x, camera.y - 20, 24, PALETTE.bad, 'center');
    }
  }

  function drawSmoke(state) {
    for (const cloud of state.alarm.clouds) {
      const fade = Math.min(1, cloud.t / 1.5);
      context.save();
      context.globalAlpha = 0.4 * fade;
      context.fillStyle = PALETTE.smoke;
      context.beginPath();
      context.arc(cloud.x - 28, cloud.y + 8, 34, 0, Math.PI * 2);
      context.arc(cloud.x + 22, cloud.y - 12, 38, 0, Math.PI * 2);
      context.arc(cloud.x + 6, cloud.y + 22, 30, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    const hidden = isVelvet(state.grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
    context.save();
    context.translate(player.x, player.y);
    // Moonlight pool around the thief.
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(0, 0, 2, 0, 0, 40);
    glow.addColorStop(0, 'rgba(207, 228, 255, 0.20)');
    glow.addColorStop(1, 'rgba(207, 228, 255, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 40, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = hidden ? 0.45 : 1;
    context.rotate(player.face || 0);
    // Hooded cloak, drawn smaller while sneaking.
    const s = player.sneaking ? 0.85 : 1;
    context.scale(s, s);
    context.fillStyle = PALETTE.playerCloak;
    context.beginPath();
    context.moveTo(14, 0);
    context.lineTo(-8, -10);
    context.lineTo(-12, 0);
    context.lineTo(-8, 10);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.playerFace;
    context.beginPath();
    context.arc(4, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (hidden) text('HIDDEN', player.x, player.y - 24, 15, PALETTE.good, 'center');
    else if (player.sneaking) text('sneaking', player.x, player.y - 24, 14, PALETTE.muted, 'center');
  }

  function drawField(state) {
    drawTiles(state);
    drawExit(state);
    drawSapphire(state);
    for (const camera of state.cameras) drawCamera(camera);
    for (const guard of state.guards) drawGuard(guard);
    drawSmoke(state);
    drawPlayer(state);
    // Night vignette: darken the corners so the torchlight reads.
    const vig = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
    );
    vig.addColorStop(0, 'rgba(4, 6, 12, 0)');
    vig.addColorStop(1, 'rgba(4, 6, 12, 0.5)');
    context.fillStyle = vig;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  /** The alarm meter: a bar that fills green to red as the museum notices the thief. */
  function drawAlarm(state) {
    const alarm = state.alarm.value;
    const cx = FIELD.width / 2;
    const cy = 30;
    const width = 300;
    const height = 16;
    const color = alarm < ALARM.warning * 0.5 ? PALETTE.good : alarm < ALARM.warning ? PALETTE.warn : PALETTE.bad;
    const flashing = alarm >= ALARM.warning && Math.floor(Date.now() / 300) % 2 === 0;
    context.save();
    text('ALARM', cx - width / 2 - 8, cy + 13, 15, flashing ? PALETTE.bad : PALETTE.muted, 'right');
    context.fillStyle = 'rgba(255,255,255,0.14)';
    context.fillRect(cx - width / 2, cy, width, height);
    context.fillStyle = color;
    context.fillRect(cx - width / 2, cy, (width * alarm) / ALARM.max, height);
    context.strokeStyle = flashing ? PALETTE.bad : 'rgba(255,255,255,0.35)';
    context.lineWidth = 1;
    context.strokeRect(cx - width / 2, cy, width, height);
    const label = alarm < 1 ? 'quiet' : alarm < ALARM.warning ? 'stirring' : 'LOCKDOWN IMMINENT';
    text(label, cx + width / 2 + 8, cy + 13, 15, color, 'left');
    context.restore();
  }

  function drawHud(state, screen) {
    context.textBaseline = 'top';
    const objective = state.sapphireTaken
      ? 'Reach the roof door — unseen'
      : 'Steal the Star Sapphire';
    text(objective, 24, 18, 24, PALETTE.text, 'left');
    text(levelLabel(state.levelName), FIELD.width - 24, 18, 24, PALETTE.text, 'right');
    drawAlarm(state);
    const mins = Math.floor(state.levelTime / 60);
    const secs = Math.floor(state.levelTime % 60);
    const timeText = `${mins}:${String(secs).padStart(2, '0')}`;
    text(timeLabel(timeText), 24, 52, 20, PALETTE.muted, 'left');
    text(scoreLabel(state.score), FIELD.width - 24, 52, 20, PALETTE.muted, 'right');
    // Lives: small sapphire dots, top-left under the objective.
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.sapphire : 'rgba(255,255,255,0.14)';
      context.beginPath();
      context.arc(32 + life * (LIFE_SIZE + LIFE_GAP), 92, 7, 0, Math.PI * 2);
      context.fill();
    }
    // Smoke pellets left, under the lives.
    text(smokeLabel(`${state.smokeLeft} left (E)`), 24, 108, 17, PALETTE.muted, 'left');
    if (screen === SCREEN_PLAY && state.exitOpen) {
      text('The roof door is open — go!', FIELD.width / 2, FIELD.height - 34, 22, PALETTE.exit, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.sapphire, 'center');
  }

  const TITLE_LINES = [
    'Steal the Star Sapphire from the museum at night,',
    'then slip out through the roof door — unseen.',
    'Guards patrol with torches. Cameras sweep red cones.',
    'Every eye feeds the ALARM meter. At 100 the museum locks down.',
    'Hide in the velvet alcoves. Sneak with Shift. Throw smoke with E.',
    '',
  ];
  const PAUSED_LINES = ['The guards wait in the dark. The cameras keep sweeping.'];
  const CLEAR_LINES = ['', ''];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('THE GILDED GALLERY', TITLE_LINES, 'Press Space or click to begin the heist');
      return;
    }
    drawHud(state, screen);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to keep stealing');
    } else if (screen === SCREEN_CLEAR) {
      CLEAR_LINES[0] = `${state.levelName} cleared — Score ${state.score}`;
      CLEAR_LINES[1] = state.ghost ? 'Ghost: never chased. +300' : 'Seen, but the sapphire is yours.';
      drawPanel('Room clear', CLEAR_LINES, 'Press Space for the next room');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      const title = state.caughtBy === 'lockdown' ? 'LOCKDOWN — the museum sealed shut' : 'Caught in the torchlight';
      drawPanel(title, OVER_LINES, 'Press Space to try again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(state.score);
      WIN_LINES[1] = bestLabel(best);
      drawPanel('The Star Sapphire is yours', WIN_LINES, 'Press Space to steal it all over again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
