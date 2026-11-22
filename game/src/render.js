// The painter: everything the player sees, and nothing the game rules know about.
// The playfield is a fixed 1280x720 logical area (32 by 18 tiles of 40 px); the
// canvas is scaled to fit the window, so one frame always shows the whole room:
// marble floor, gold-trimmed walls, glass cases, statues, velvet alcoves, the
// guards' torch cones, the cameras' red cones, the thief, the Star Sapphire, the
// roof door, the alarm meter and the HUD — plus the title, pause, clear, caught
// and win panels. All colours come from config.js.

import { ALARM, COLS, FIELD, FONT, GUARD, CAMERA, PALETTE, ROWS, TILE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** A wedge of light: a filled sector centred on (x, y), facing `angle`. */
function wedge(ctx, x, y, range, angle, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

/** The two straight rims of a wedge, stroked so the cone's edge reads clearly. */
function wedgeRims(ctx, x, y, range, angle, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  /** Fit the 1280x720 field into the canvas, letterboxed and centred. */
  function frame() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, canvas.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    const pxW = Math.round(cssW * dpr);
    const pxH = Math.round(cssH * dpr);
    if (canvas.width !== pxW || canvas.height !== pxH) {
      canvas.width = pxW;
      canvas.height = pxH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, cssW, cssH);
    const scale = Math.min(cssW / FIELD.width, cssH / FIELD.height);
    const ox = (cssW - FIELD.width * scale) / 2;
    const oy = (cssH - FIELD.height * scale) / 2;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
  }

  /** Marble checkerboard floor with a faint grout line between tiles. */
  function paintFloor(grid) {
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        const ch = grid[ty][tx];
        if (ch === '#') continue;
        ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        ctx.strokeStyle = PALETTE.floorEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  /** Walls: dark navy blocks with a gold lip on the edge facing the room. */
  function paintWalls(grid) {
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        if (grid[ty][tx] !== '#') continue;
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        // The gold trim runs along the side that borders open floor.
        const below = ty + 1 < ROWS ? grid[ty + 1][tx] : '#';
        const above = ty - 1 >= 0 ? grid[ty - 1][tx] : '#';
        const right = tx + 1 < COLS ? grid[ty][tx + 1] : '#';
        const left = tx - 1 >= 0 ? grid[ty][tx - 1] : '#';
        ctx.fillStyle = PALETTE.wallTop;
        if (below !== '#') ctx.fillRect(tx * TILE, ty * TILE + TILE - 3, TILE, 3);
        if (above !== '#') ctx.fillRect(tx * TILE, ty * TILE, TILE, 3);
        if (right !== '#') ctx.fillRect(tx * TILE + TILE - 3, ty * TILE, 3, TILE);
        if (left !== '#') ctx.fillRect(tx * TILE, ty * TILE, 3, TILE);
      }
    }
  }

  /** A glass display case: gold frame, blue-grey glass, a glint across it. */
  function paintCase(x, y) {
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillStyle = PALETTE.caseFrame;
    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = PALETTE.caseGlass;
    ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
    ctx.strokeStyle = PALETTE.caseGlint;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(px + 9, py + TILE - 9);
    ctx.lineTo(px + TILE - 9, py + 9);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.sapphire;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** A marble statue: dark plinth with a pale bust on top. */
  function paintStatue(x, y) {
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillStyle = PALETTE.statueBase;
    roundRect(ctx, px + 5, py + TILE - 12, TILE - 10, 9, 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.statue;
    // Shoulders and head of the bust.
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + 14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 9, py + TILE - 10);
    ctx.quadraticCurveTo(px + TILE / 2, py + 16, px + TILE - 9, py + TILE - 10);
    ctx.closePath();
    ctx.fill();
  }

  /** A velvet shadow alcove: deep maroon drape with fold lines, a place to hide. */
  function paintVelvet(x, y) {
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillStyle = PALETTE.velvetDark;
    roundRect(ctx, px + 2, py + 2, TILE - 4, TILE - 4, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.velvet;
    roundRect(ctx, px + 5, py + 5, TILE - 10, TILE - 10, 5);
    ctx.fill();
    ctx.strokeStyle = PALETTE.velvetFold;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const fx = px + 11 + i * 9;
      ctx.beginPath();
      ctx.moveTo(fx, py + 7);
      ctx.quadraticCurveTo(fx + 3, py + TILE / 2, fx, py + TILE - 7);
      ctx.stroke();
    }
  }

  function paintFurniture(grid) {
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        const ch = grid[ty][tx];
        if (ch === 'D') paintCase(tx, ty);
        else if (ch === 'S') paintStatue(tx, ty);
        else if (ch === 'V') paintVelvet(tx, ty);
      }
    }
  }

  /** The roof door: a gold frame; open means lit and glowing, closed means dim. */
  function paintExit(exit) {
    const x = exit.x;
    const y = exit.y;
    if (exit.open) {
      const glow = ctx.createRadialGradient(x, y, 4, x, y, 46);
      glow.addColorStop(0, 'rgba(201, 162, 39, 0.55)');
      glow.addColorStop(1, 'rgba(201, 162, 39, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 46, 0, Math.PI * 2);
      ctx.fill();
      // A gold chevron above the open door points the way out.
      ctx.fillStyle = PALETTE.exit;
      ctx.beginPath();
      ctx.moveTo(x, y - 26);
      ctx.lineTo(x + 8, y - 36);
      ctx.lineTo(x - 8, y - 36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = exit.open ? PALETTE.exit : PALETTE.exitDim;
    roundRect(ctx, x - 15, y - 17, 30, 34, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(x - 10, y - 12, 20, 24);
    ctx.strokeStyle = exit.open ? PALETTE.exit : PALETTE.exitDim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x, y + 12);
    ctx.stroke();
    if (!exit.open) {
      ctx.fillStyle = PALETTE.exitDim;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** The Star Sapphire: a faceted blue diamond with a bright core and sparkles. */
  function paintSapphire(sapphire) {
    if (sapphire.taken) return;
    const x = sapphire.x;
    const y = sapphire.y;
    const halo = ctx.createRadialGradient(x, y, 2, x, y, 34);
    halo.addColorStop(0, 'rgba(77, 184, 255, 0.5)');
    halo.addColorStop(1, 'rgba(77, 184, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.sapphire;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 11, y);
    ctx.lineTo(x, y + 14);
    ctx.lineTo(x - 11, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.sapphireCore;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 7);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.sapphireCore;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 10);
    ctx.lineTo(x - 12, y - 10);
    ctx.moveTo(x - 15, y - 13);
    ctx.lineTo(x - 15, y - 7);
    ctx.moveTo(x + 14, y + 12);
    ctx.lineTo(x + 19, y + 12);
    ctx.moveTo(x + 16, y + 9);
    ctx.lineTo(x + 16, y + 15);
    ctx.stroke();
  }

  /** Smoke clouds: soft grey puffs that fade as their timer runs out. */
  function paintClouds(clouds) {
    for (const cloud of clouds) {
      const alpha = Math.min(1, cloud.t / 1.5);
      ctx.fillStyle = PALETTE.smoke;
      ctx.globalAlpha = 0.35 * alpha;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5 * alpha;
      ctx.beginPath();
      ctx.arc(cloud.x - cloud.r * 0.25, cloud.y - cloud.r * 0.2, cloud.r * 0.55, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.r * 0.3, cloud.y + cloud.r * 0.15, cloud.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** A guard's torch cone: warm gold, turning red as the guard grows suspicious. */
  function paintGuardCone(guard) {
    const hot = guard.alert > 0.35;
    const alerted = guard.state === 'alerted';
    const fill = alerted ? PALETTE.coneAlert : hot ? PALETTE.coneHot : PALETTE.cone;
    ctx.fillStyle = fill;
    wedge(ctx, guard.x, guard.y, GUARD.range, guard.angle, GUARD.halfAngle);
    ctx.fill();
    ctx.strokeStyle = alerted ? 'rgba(255, 84, 64, 0.5)' : 'rgba(255, 202, 106, 0.35)';
    ctx.lineWidth = 1.5;
    wedgeRims(ctx, guard.x, guard.y, GUARD.range, guard.angle, GUARD.halfAngle);
  }

  /** A camera's sweeping cone: red, brighter while it has the thief in sight. */
  function paintCameraCone(camera) {
    ctx.fillStyle = camera.spotted ? PALETTE.cameraConeHot : PALETTE.cameraCone;
    wedge(ctx, camera.x, camera.y, CAMERA.range, camera.angle, CAMERA.halfAngle);
    ctx.fill();
    ctx.strokeStyle = camera.spotted ? 'rgba(255, 59, 48, 0.6)' : 'rgba(255, 59, 48, 0.35)';
    ctx.lineWidth = 1.5;
    wedgeRims(ctx, camera.x, camera.y, CAMERA.range, camera.angle, CAMERA.halfAngle);
  }

  /** A guard: dark coat, pale face, torch flame toward where he looks, alert ring. */
  function paintGuard(guard) {
    const x = guard.x;
    const y = guard.y;
    const fx = Math.cos(guard.angle);
    const fy = Math.sin(guard.angle);
    // Torch flame, held out in front.
    ctx.fillStyle = PALETTE.torch;
    ctx.beginPath();
    ctx.arc(x + fx * 17, y + fy * 17, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 202, 106, 0.35)';
    ctx.beginPath();
    ctx.arc(x + fx * 17, y + fy * 17, 9, 0, Math.PI * 2);
    ctx.fill();
    // Coat and shoulders.
    ctx.fillStyle = PALETTE.guardCoat;
    ctx.beginPath();
    ctx.arc(x, y, guard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(x, y, guard.radius - 4, 0, Math.PI * 2);
    ctx.fill();
    // Face, turned toward the facing direction.
    ctx.fillStyle = PALETTE.playerFace;
    ctx.beginPath();
    ctx.arc(x + fx * 4, y + fy * 4, 5, 0, Math.PI * 2);
    ctx.fill();
    // Detection ring: fills as the guard's meter fills.
    if (guard.alert > 0.02) {
      ctx.strokeStyle = guard.alert >= 1 ? PALETTE.bad : PALETTE.warn;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, guard.radius + 6, -Math.PI / 2, -Math.PI / 2 + guard.alert * Math.PI * 2);
      ctx.stroke();
    }
    // Alerted: a red mark above the head; suspicious or investigating: a question.
    if (guard.state === 'alerted') {
      ctx.fillStyle = PALETTE.bad;
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', x, y - guard.radius - 12);
    } else if (guard.state === 'suspicious' || guard.state === 'investigate') {
      ctx.fillStyle = PALETTE.warn;
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y - guard.radius - 12);
    }
  }

  /** A wall camera: dark housing, red lens, a small bracket to the wall. */
  function paintCamera(camera) {
    const x = camera.x;
    const y = camera.y;
    ctx.strokeStyle = PALETTE.cameraBody;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(camera.base) * 12, y - Math.sin(camera.base) * 12);
    ctx.stroke();
    ctx.fillStyle = PALETTE.cameraBody;
    roundRect(ctx, x - 8, y - 8, 16, 16, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.cameraLens;
    ctx.beginPath();
    ctx.arc(x + Math.cos(camera.angle) * 4, y + Math.sin(camera.angle) * 4, 4, 0, Math.PI * 2);
    ctx.fill();
    if (camera.spotted) {
      ctx.strokeStyle = PALETTE.cameraLens;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** The thief: a hooded figure, crouched lower while sneaking. */
  function paintThief(player, grid) {
    const x = player.x;
    const y = player.y;
    const tileRow = grid[Math.floor(y / TILE)];
    const inVelvet = tileRow && tileRow[Math.floor(x / TILE)] === 'V';
    const r = player.sneaking ? player.radius - 2 : player.radius;
    // A soft shadow under the thief.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.8, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cloak.
    ctx.fillStyle = PALETTE.playerCloak;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(x, y, r - 4, 0, Math.PI * 2);
    ctx.fill();
    // Hood point and face, turned toward the facing direction.
    const fx = Math.cos(player.face);
    const fy = Math.sin(player.face);
    ctx.fillStyle = PALETTE.playerCloak;
    ctx.beginPath();
    ctx.moveTo(x + fx * (r + 2), y + fy * (r + 2));
    ctx.lineTo(x - fy * 5, y + fx * 5);
    ctx.lineTo(x + fy * 5, y - fx * 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.playerFace;
    ctx.beginPath();
    ctx.arc(x + fx * 3, y + fy * 3, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Hidden in velvet: a faint maroon shimmer says the eyes cannot find you.
    if (inVelvet) {
      ctx.strokeStyle = 'rgba(107, 26, 46, 0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /** Night vignette: the gallery's corners fall into shadow around the playfield. */
  function paintVignette() {
    const shade = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.95,
    );
    shade.addColorStop(0, 'rgba(6, 8, 16, 0)');
    shade.addColorStop(1, 'rgba(6, 8, 16, 0.42)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  /** Red edge glow while a guard's meter or the alarm is climbing. */
  function paintDangerGlow(state) {
    const heat = Math.max(state.maxAlert || 0, state.alarm.value / ALARM.max);
    if (heat <= 0.05) return;
    const alpha = Math.min(0.4, heat * 0.35);
    const glow = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
    );
    glow.addColorStop(0, 'rgba(255, 59, 48, 0)');
    glow.addColorStop(1, `rgba(255, 59, 48, ${alpha})`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  /** The alarm meter: a bar across the top that fills as the museum notices you. */
  function paintAlarmBar(value) {
    const w = 300;
    const h = 14;
    const x = (FIELD.width - w) / 2;
    const y = 10;
    const frac = value / ALARM.max;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    roundRect(ctx, x - 58, y - 3, w + 116, h + 6, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('ALARM', x - 8, y + h / 2);
    ctx.fillStyle = '#1c1c28';
    roundRect(ctx, x, y, w, h, 4);
    ctx.fill();
    const fill = frac < 0.5 ? PALETTE.good : frac < 0.7 ? PALETTE.warn : PALETTE.bad;
    if (frac > 0.01) {
      ctx.fillStyle = fill;
      roundRect(ctx, x, y, Math.max(6, w * frac), h, 4);
      ctx.fill();
    }
    ctx.strokeStyle = value >= ALARM.warning ? PALETTE.bad : PALETTE.panelEdge;
    ctx.lineWidth = value >= ALARM.warning ? 2 : 1;
    roundRect(ctx, x, y, w, h, 4);
    ctx.stroke();
    if (value >= ALARM.warning) {
      ctx.fillStyle = PALETTE.bad;
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('LOCKDOWN SOON', x + w + 8, y + h / 2);
    } else if (value > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `11px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('stirring', x + w + 8, y + h / 2);
    }
  }

  /** Lives as small hoods, smoke pellets as dots, score and clock at the edges. */
  function paintHud(state) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, 34);
    // Room name, top left.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${state.levelName}  ·  Room ${state.levelIndex + 1}/3`, 12, 17);
    // Score and clock on one line, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`Score ${state.score}  ·  ${fmtTime(state.levelTime)}`, FIELD.width - 12, 17);
    // Lives and smoke, bottom left.
    ctx.textAlign = 'left';
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText('Lives', 12, FIELD.height - 16);
    for (let i = 0; i < state.lives; i += 1) {
      ctx.fillStyle = PALETTE.playerCloak;
      ctx.beginPath();
      ctx.arc(58 + i * 20, FIELD.height - 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.playerFace;
      ctx.beginPath();
      ctx.arc(58 + i * 20, FIELD.height - 16, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.fillText('Smoke', 130, FIELD.height - 16);
    for (let i = 0; i < state.smokeLeft; i += 1) {
      ctx.fillStyle = PALETTE.smoke;
      ctx.beginPath();
      ctx.arc(178 + i * 16, FIELD.height - 16, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Ghost bonus still alive: a green tag at the bottom centre.
    if (state.ghost && !state.sapphireTaken) {
      ctx.fillStyle = PALETTE.good;
      ctx.textAlign = 'center';
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillText('GHOST — unseen so far', FIELD.width / 2, FIELD.height - 16);
    }
    // Objective hint, bottom right.
    ctx.fillStyle = PALETTE.muted;
    ctx.textAlign = 'right';
    ctx.font = `13px ${FONT}`;
    ctx.fillText(
      state.sapphireTaken ? 'Reach the roof door — unseen' : 'Steal the Star Sapphire',
      FIELD.width - 12,
      FIELD.height - 16,
    );
    paintAlarmBar(state.alarm.value);
  }

  /** A centred dark panel with a title and a few lines of text. */
  function paintPanel(title, lines, accent) {
    const w = 640;
    const lineH = 26;
    const h = 92 + lines.length * lineH;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    ctx.fillStyle = 'rgba(6, 8, 16, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    ctx.fillStyle = accent || PALETTE.text;
    ctx.font = `bold 34px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, FIELD.width / 2, y + 44);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, y + 82 + i * lineH);
    });
  }

  function paintTitle(state, best) {
    paintPanel('THE GILDED GALLERY', [
      'Steal the Star Sapphire from the museum at night,',
      'then slip out through the roof door — unseen.',
      'Guards patrol with torches. Cameras sweep red cones.',
      'Every eye feeds the ALARM meter. At 100 the museum locks down.',
      'Hide in the velvet alcoves. Sneak with Shift. Throw smoke with E.',
      `Best ${best}`,
      '',
      'Press Space or click to begin the heist',
    ]);
  }

  function paintPaused() {
    paintPanel('PAUSED', [
      'The guards wait. The cameras keep sweeping.',
      '',
      'Press P to keep stealing',
    ]);
  }

  function paintClear(state) {
    paintPanel('ROOM CLEAR', [
      `${state.levelName} cleared — the roof door is open.`,
      `Score ${state.score}`,
      '',
      'Press Space for the next room',
    ], PALETTE.good);
  }

  function paintOver(state, best) {
    const lockdown = state.caughtBy === 'lockdown';
    paintPanel(lockdown ? 'LOCKDOWN!' : 'CAUGHT!', [
      lockdown
        ? 'The alarm hit 100 — the museum sealed shut.'
        : 'A guard grabbed you in the dark.',
      `Score ${state.score}   ·   Best ${best}`,
      '',
      'Press Space to try again',
    ], PALETTE.bad);
  }

  function paintWin(state, best) {
    paintPanel('THE STAR SAPPHIRE IS YOURS', [
      'Three rooms, no cell — the perfect heist.',
      `Score ${state.score}   ·   Best ${best}`,
      '',
      'Press Space to steal it all over again',
    ], PALETTE.sapphire);
  }

  /** One frame: the room, the eyes, the thief, the HUD, then any panel. */
  function draw(state, screen, best) {
    frame();
    paintFloor(state.grid);
    paintWalls(state.grid);
    paintFurniture(state.grid);
    paintExit(state.exit);
    paintSapphire(state.sapphire);
    for (const guard of state.guards) paintGuardCone(guard);
    for (const camera of state.cameras) paintCameraCone(camera);
    paintClouds(state.alarm.clouds);
    for (const camera of state.cameras) paintCamera(camera);
    for (const guard of state.guards) paintGuard(guard);
    paintThief(state.player, state.grid);
    paintVignette();
    paintDangerGlow(state);
    if (screen !== SCREEN_TITLE) paintHud(state);
    if (screen === SCREEN_TITLE) paintTitle(state, best);
    else if (screen === SCREEN_PAUSED) paintPaused();
    else if (screen === SCREEN_CLEAR) paintClear(state);
    else if (screen === SCREEN_OVER) paintOver(state, best);
    else if (screen === SCREEN_WIN) paintWin(state, best);
    ctx.restore();
  }

  return { draw };
}
