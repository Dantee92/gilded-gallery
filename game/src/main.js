// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, play, paused, room clear, game
// over and win. A mouse click sets a walk target; any key steering cancels it. E
// throws a smoke pellet.
//
// ?seed=N fixes the patrols' jitter. ?shot=start|play|mid|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_CAMSEEN,
  EVENT_CAUGHT,
  EVENT_CLEAR,
  EVENT_OVER,
  EVENT_SAPPHIRE,
  EVENT_SMOKE,
  EVENT_SPOTTED,
  EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let clickTarget = null;
  let stepTimer = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    clickTarget = null;
    screen = SCREEN_PLAY;
    announce('Playing. Steal the Star Sapphire, then reach the roof door unseen.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(world.state.caughtBy === 'lockdown'
      ? `Lockdown! The museum sealed shut. Score ${world.state.score}. Best ${best}.`
      : `Caught. Score ${world.state.score}. Best ${best}.`);
  }

  function winGame() {
    screen = SCREEN_WIN;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`The Star Sapphire is yours. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    const clicked = input.takeClickTarget();
    if (clicked) {
      clickTarget = clicked;
      audio.unlock();
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_CLEAR) {
        world.nextLevel();
        screen = SCREEN_PLAY;
        announce('Playing. Next room.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  /** Click-to-move target in playfield coordinates, or null. */
  function clickMove() {
    if (!clickTarget) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    // The renderer scales the 1280x720 field to fit; invert that mapping.
    const fieldScale = Math.min(canvas.width / 1280, canvas.height / 720);
    const offsetX = (canvas.width - 1280 * fieldScale) / 2;
    const offsetY = (canvas.height - 720 * fieldScale) / 2;
    const fx = (clickTarget.x * scaleX - offsetX) / fieldScale;
    const fy = (clickTarget.y * scaleY - offsetY) / fieldScale;
    const dx = fx - world.state.player.x;
    const dy = fy - world.state.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) {
      clickTarget = null;
      return { x: 0, y: 0 };
    }
    return { x: dx / dist, y: dy / dist };
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, true, false);
      return;
    }
    let move = input.vector();
    if (move.x === 0 && move.y === 0 && !input.hasKeys()) move = clickMove();
    else clickTarget = null;
    const smoke = input.takeSmoke();
    const events = world.step(STEP, move, input.sneaking(), false, smoke);
    if (world.state.player.moving) {
      stepTimer -= STEP;
      if (stepTimer <= 0) {
        audio.step(input.sneaking());
        stepTimer = input.sneaking() ? 0.45 : 0.32;
      }
    }
    if (events & EVENT_SPOTTED) {
      audio.alert();
      announce('Spotted! Break line of sight!');
    } else if (events & EVENT_CAMSEEN) {
      audio.camBeep();
      announce('Camera! The alarm is climbing!');
    } else if (events & EVENT_SMOKE) {
      audio.smoke();
      announce('Smoke out — their eyes are blind.');
    } else if (events & EVENT_SAPPHIRE) {
      audio.pickup();
      announce('The Star Sapphire is yours. Reach the roof door!');
    } else if (events & EVENT_CAUGHT) {
      audio.caught();
      if (world.state.caughtBy === 'lockdown') audio.alarm();
      if (world.state.status === 'over') endGame();
      else announce(world.state.caughtBy === 'lockdown'
        ? 'Lockdown! Back to the start of this room.'
        : 'Caught! Back to the start of this room.');
    } else if (events & EVENT_CLEAR) {
      audio.clear();
      if (world.state.status === 'won') winGame();
      else {
        screen = SCREEN_CLEAR;
        announce('Room clear.');
      }
    } else if (events & EVENT_OVER) {
      endGame();
    } else if (events & EVENT_WIN) {
      winGame();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting a guard catch the
  // thief unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Gilded Gallery. Press Space or click to begin the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
