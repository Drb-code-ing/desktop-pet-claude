// Claude Crab — interactive desktop pet
// Grid: 15×16 pixels

const COLORS = {
  M: '#DE886D',
  B: '#000000',
  W: '#FFFFFF',
  S: 'rgba(0,0,0,0.5)',
};

const SCALE = 4;
const CANVAS_W = 120;
const CANVAS_H = 130;

// Crab sprite (60×64 at scale 4), centered in 120×130 canvas
const CRAB_OX = 30;
const CRAB_OY = 33;

const TOP = [
  '...............',
  '...............',
  '...............',
  '...............',
  '...............',
  '...............',
  '..MMMMMMMMMMM..',
  '..MMMMMMMMMMM..',
];

const EYES_OPEN = [
  '..MBWMMMMMBWMM..',
  'MMMBWMMMMMBWMMM',
];

const EYES_CLOSED = [
  '..MMMMMMMMMMM..',
  'MMMMMMMMMMMMMMM',
];

const BOTTOM = [
  'MMMMMMMMMMMMMMM',
  '..MMMMMMMMMMM..',
  '..MMMMMMMMMMM..',
];

const LEGS = [
  ['...M.M...M.M...', '...M.M...M.M...'],
  ['..M...M.M...M..', '..M...M.M...M..'],
];

const SHADOW = ['...SSSSSSS...'];

// State
let facing = -1;
let walkFrame = 0;
let walkTimer = 0;
let blinkTimer = 0;
let blinking = false;
let blinkFrames = 0;
let resting = false;
let zParticles = [];
let bounceFrames = 0;
let dragging = false;
let pageHidden = false;
document.addEventListener('visibilitychange', () => {
  pageHidden = document.hidden;
});

const particlesEl = document.getElementById('particles');
const clickParticles = [];

function resetBlink() {
  blinkTimer = 40 + Math.floor(Math.random() * 80);
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

function setResting(state) {
  resting = state;
  if (!resting) zParticles = [];
}

function setDragging(state) {
  dragging = state;
  if (!state) walkTimer = 0;
}

function spawnParticle(x, y, vx, vy, life, char) {
  const el = document.createElement('span');
  el.className = 'particle';
  el.textContent = char;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  particlesEl.appendChild(el);
  clickParticles.push({ el, x, y, vx, vy, life, maxLife: life });
}

function handleClick() {
  bounceFrames = 8;
  window.crab.interact();
  const cx = CANVAS_W / 2;
  const cy = CRAB_OY + 16;
  for (let i = 0; i < 6; i++) {
    spawnParticle(
      cx + (Math.random() - 0.5) * 20, cy,
      (Math.random() - 0.5) * 5, -Math.random() * 6 - 3,
      80, ['❤️', '💕', '✨'][Math.floor(Math.random() * 3)]
    );
  }
}

function feed() {
  bounceFrames = 10;
  window.crab.interact();
  const cx = CANVAS_W / 2;
  const cy = CRAB_OY + 16;
  for (let i = 0; i < 10; i++) {
    spawnParticle(
      cx + (Math.random() - 0.5) * 30, cy,
      (Math.random() - 0.5) * 8, -Math.random() * 10 - 4,
      100, '🍪'
    );
  }
}

// Mouse events
const canvas = document.getElementById('c');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
canvas.style.width = CANVAS_W + 'px';
canvas.style.height = CANVAS_H + 'px';
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let mouseDown = false;
let dragActive = false;
let lastScreen = { x: 0, y: 0 };
let clickTimer = null;

canvas.addEventListener('mousedown', (e) => {
  mouseDown = true;
  lastScreen.x = e.screenX;
  lastScreen.y = e.screenY;
});

canvas.addEventListener('mousemove', (e) => {
  if (!mouseDown) return;
  const dx = e.screenX - lastScreen.x;
  const dy = e.screenY - lastScreen.y;
  if (!dragActive && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
    dragActive = true;
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    window.crab.dragStart();
  }
  if (dragActive) {
    window.crab.dragMove(dx, dy);
    lastScreen.x = e.screenX;
    lastScreen.y = e.screenY;
  }
});

canvas.addEventListener('mouseup', () => {
  if (dragActive) {
    window.crab.dragEnd();
    dragActive = false;
  } else if (mouseDown) {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      feed();
    } else {
      clickTimer = setTimeout(() => {
        handleClick();
        clickTimer = null;
      }, 250);
    }
  }
  mouseDown = false;
});

canvas.addEventListener('mouseleave', () => {
  if (dragActive) {
    window.crab.dragEnd();
    dragActive = false;
  }
  mouseDown = false;
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

let frameCounter = 0;
function tick() {
  if (pageHidden) {
    setTimeout(tick, 1000);
    return;
  }
  frameCounter++;
  if (frameCounter % 2 !== 0) {
    requestAnimationFrame(tick);
    return;
  }

  if (resting) {
    blinking = true;
    walkFrame = 0;
    if (Math.random() < 0.03) {
      zParticles.push({ x: 24 + Math.random() * 12, y: 16, life: 80 });
    }
    for (let i = zParticles.length - 1; i >= 0; i--) {
      zParticles[i].y -= 0.8;
      zParticles[i].life--;
      if (zParticles[i].life <= 0) zParticles.splice(i, 1);
    }
  } else if (dragging) {
    walkTimer++;
    if (walkTimer >= 2) { walkTimer = 0; walkFrame = 1 - walkFrame; }
    blinking = false;
    resetBlink();
  } else {
    walkTimer++;
    if (walkTimer >= 5) {
      walkTimer = 0;
      walkFrame = 1 - walkFrame;
    }
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
        blinkFrames = 2;
      }
    }
  }

  // Update DOM particles
  for (let i = clickParticles.length - 1; i >= 0; i--) {
    const p = clickParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.24;
    p.life--;
    p.el.style.left = p.x + 'px';
    p.el.style.top = p.y + 'px';
    p.el.style.opacity = p.life / p.maxLife;
    if (p.life <= 0) {
      p.el.remove();
      clickParticles.splice(i, 1);
    }
  }
  // Safety: cap particle count to prevent DOM bloat under lag
  while (clickParticles.length > 30) {
    const old = clickParticles.shift();
    old.el.remove();
  }

  draw();
  requestAnimationFrame(tick);
}

function draw() {
  try {
  const crab = getCrab();
  const w = crab[0].length * SCALE;
  const h = crab.length * SCALE;

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.save();
  const jx = dragging ? (Math.random() - 0.5) * 4 : 0;
  const jy = dragging ? (Math.random() - 0.5) * 4 : 0;
  ctx.translate(CRAB_OX + jx, CRAB_OY + jy);

  // Bounce
  let didBounceSave = false;
  if (bounceFrames > 0) {
    const bounceY = Math.sin((bounceFrames / 8) * Math.PI) * -5;
    ctx.save();
    ctx.translate(0, bounceY);
    bounceFrames--;
    didBounceSave = true;
  }

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

  if (resting) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 35, 6, 1);
    ctx.fillRect(41, 35, 6, 1);
  }

  if (facing === 1) ctx.restore();
  if (didBounceSave) ctx.restore();

  // Zzz
  for (const p of zParticles) {
    ctx.fillStyle = `rgba(180,180,255,${p.life / 80})`;
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Z', p.x, p.y);
  }

  ctx.restore();
  } catch (err) {
    // Reset canvas if context is corrupted
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.style.width = CANVAS_W + 'px';
    canvas.style.height = CANVAS_H + 'px';
    ctx.imageSmoothingEnabled = false;
  }
}

draw();
tick();
