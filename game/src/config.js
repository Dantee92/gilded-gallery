// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area (32 by 18 tiles of 40 px); the renderer scales it to the window, so no rule below
// depends on the screen size. The Gilded Gallery is a museum at night: marble floors,
// gold-trimmed walls, glass display cases, marble statues and velvet shadow alcoves.

export const FIELD = { width: 1280, height: 720 };

/** Tile size in pixels; the maps are COLS by ROWS tiles. */
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walk: 182,
  sneak: 96,
};

export const GUARD = {
  radius: 13,
  patrol: 72,
  investigate: 120,
  chase: 208,
  /** How far a guard can see, in pixels. */
  range: 198,
  /** Half of the vision cone's angle, in radians (~37 degrees each side). */
  halfAngle: 0.65,
  /** Pause at each patrol waypoint, in seconds. */
  waypointPause: 0.9,
  /** Seconds a guard looks around at the last-seen spot before giving up. */
  lookAround: 2.2,
};

/** Wall cameras: they never chase and never sleep, but they sweep. */
export const CAMERA = {
  /** How far a camera can see, in pixels. */
  range: 224,
  /** Half of the camera cone's angle, in radians. */
  halfAngle: 0.5,
  /** How far the cone sweeps each side of its base angle, in radians. */
  sweep: 0.8,
  /** Sweep speed, in radians per second (multiplied inside the sine). */
  speed: 0.55,
  /** A player hidden in velvet is invisible to a camera unless this close, in pixels. */
  velvetSpotRange: 55,
};

/** Detection meter: 0 is unseen, 1 is fully spotted (per guard). */
export const DETECT = {
  /** Alert level where a guard grows suspicious and turns to look. */
  suspicious: 0.35,
  /** Alert level where a guard gives chase. */
  alerted: 1,
  /** Alert gained per second while the player is seen (near, walking, in the open). */
  nearRate: 1.35,
  farRate: 0.5,
  /** Multiplier while the player sneaks. */
  sneakFactor: 0.45,
  /** Alert lost per second while the player is unseen. */
  decay: 0.22,
  /** A guard only spots a player hidden in velvet this close, in pixels. */
  velvetSpotRange: 55,
};

/** The global alarm meter: 0 is quiet, 100 is lockdown. */
export const ALARM = {
  max: 100,
  /** Alarm gained per second while any guard sees the thief. */
  guardRate: 20,
  /** Alarm gained per second while any camera sees the thief (cameras are faster). */
  cameraRate: 34,
  /** Alarm lost per second while nobody sees the thief. */
  decay: 14,
  /** Alarm level where the HUD starts flashing a warning. */
  warning: 70,
};

/** Smoke pellets: the thief's tool, bought with scarcity. */
export const SMOKE = {
  perLevel: 2,
  /** Radius of a smoke cloud, in pixels. */
  radius: 120,
  /** How long a cloud lasts, in seconds. */
  duration: 4,
};

export const LIVES = 3;

export const SCORE = {
  sapphire: 600,
  levelClear: 300,
  /** Bonus per second under par on a cleared level. */
  timeBonus: 10,
  /** Bonus for clearing a level without ever being chased. */
  ghostBonus: 300,
  win: 1000,
};

/** Par time per level, in seconds, for the time bonus. */
export const PAR = [75, 100, 130];

export const PALETTE = {
  backdrop: '#0a0a14',
  floor: '#2e2a33',
  floorAlt: '#332e38',
  floorEdge: '#453e4d',
  wall: '#1a1a2e',
  wallTop: '#c9a227',
  caseGlass: '#2a3442',
  caseFrame: '#c9a227',
  caseGlint: '#8fb8d8',
  statue: '#d8d2c4',
  statueBase: '#6b6558',
  velvet: '#4a1020',
  velvetDark: '#2e0a14',
  velvetFold: '#6b1a2e',
  sapphire: '#4db8ff',
  sapphireCore: '#dff3ff',
  exit: '#c9a227',
  exitDim: '#6b5a1e',
  guard: '#2a2118',
  guardCoat: '#4a3520',
  torch: '#ffca6a',
  cone: 'rgba(255, 202, 106, 0.20)',
  coneHot: 'rgba(255, 190, 80, 0.34)',
  coneAlert: 'rgba(255, 84, 64, 0.30)',
  cameraBody: '#1e1e26',
  cameraLens: '#ff3b30',
  cameraCone: 'rgba(255, 59, 48, 0.20)',
  cameraConeHot: 'rgba(255, 59, 48, 0.38)',
  smoke: 'rgba(200, 200, 210, 0.35)',
  player: '#1a1a24',
  playerCloak: '#3a3a4d',
  playerFace: '#e8dcc8',
  moon: '#cfe4ff',
  panel: '#101623',
  panelEdge: '#3a2f5a',
  text: '#eef1f5',
  muted: '#93a0b5',
  good: '#7ee2a0',
  warn: '#ffca6a',
  bad: '#ff6a5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gilded-gallery.best';
