// Claude Crab with directional eyes + walk animation + blinking
// Grid: 15×16 pixels, viewBox "0 0 15 16"

const COLORS = {
  M: '#DE886D',           // body
  B: '#000000',           // pupil / closed eye
  W: '#FFFFFF',           // eye white
  S: 'rgba(0,0,0,0.5)',  // ground shadow
};

const SCALE = 6;

// Padding + body above eyes (rows 0-7)
const TOP = [
  '...............',
  '...............',
  '...............',
  '...............',
  '...............',
  '...............',
  '..MMMMMMMMMMM..',  // row 6
  '..MMMMMMMMMMM..',  // row 7
];

// Eye rows — asymmetric, pupils on left side of each 2px-wide eye.
// Canvas flip for right-facing will mirror them to look right.
const EYES_OPEN = [
  '..MBWMMMMMBWMM..',   // row 8: left eye=(B,W) at 3-4, right eye=(B,W) at 10-11
  'MMMBWMMMMMBWMMM',    // row 9: same with arms
];

// Eyes closed (body color only)
const EYES_CLOSED = [
  '..MMMMMMMMMMM..',    // row 8
  'MMMMMMMMMMMMMMM',    // row 9
];

// Body below eyes (rows 10-12)
const BOTTOM = [
  'MMMMMMMMMMMMMMM',    // row 10: arms + torso
  '..MMMMMMMMMMM..',    // row 11
  '..MMMMMMMMMMM..',    // row 12
];

// Leg frames (rows 13-14)
const LEGS = [
  ['...M.M...M.M...', '...M.M...M.M...'],  // frame 0
  ['..M...M.M...M..', '..M...M.M...M..'],  // frame 1
];

const SHADOW = ['...SSSSSSS...'];

let facing = -1;       // -1 = left, 1 = right
let walkFrame = 0;
let walkTimer = 0;
let blinkTimer = 0;    // countdown to next blink
let blinking = false;
let blinkFrames = 0;   // remaining blink frames

function resetBlink() {
  blinkTimer = 80 + Math.floor(Math.random() * 160); // ~2.5-8s
}

resetBlink();

function getCrab() {
  const eyes = blinking ? EYES_CLOSED : EYES_OPEN;
  return [...TOP, ...eyes, ...BOTTOM, ...LEGS[walkFrame], ...SHADOW];
}

function setDirection(dx) {
  if (dx < 0) facing = -1;
  else if (dx > 0) facing = 1;
}

function tick() {
  // Walk cycle
  walkTimer++;
  if (walkTimer >= 8) {
    walkTimer = 0;
    walkFrame = 1 - walkFrame;
  }

  // Blink logic
  if (blinking) {
    blinkFrames--;
    if (blinkFrames <= 0) {
      blinking = false;
      resetBlink();
    }
  } else {
    blinkTimer--;
    if (blinkTimer <= 0) {
      blinking = true;
      blinkFrames = 3; // ~100ms blink
    }
  }

  draw();
  requestAnimationFrame(tick);
}

function draw() {
  const canvas = document.getElementById('c');
  const crab = getCrab();
  const w = crab[0].length * SCALE;
  const h = crab.length * SCALE;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  // Flip canvas for right-facing (mirrors the left-facing eyes to look right)
  if (facing === 1) {
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  for (let row = 0; row < crab.length; row++) {
    for (let col = 0; col < crab[row].length; col++) {
      const ch = crab[row][col];
      if (ch === '.') continue;
      ctx.fillStyle = COLORS[ch];
      ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE);
    }
  }

  if (facing === 1) {
    ctx.restore();
  }
}

draw();
tick();
