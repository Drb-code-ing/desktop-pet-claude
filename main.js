const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {

function createWindow() {
  let screenW, screenH;
  function updateScreenBounds() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    screenW = width;
    screenH = height;
  }
  updateScreenBounds();
  screen.on('display-metrics-changed', updateScreenBounds);
  const screenBoundsTimer = setInterval(updateScreenBounds, 10000);

  const winW = 120;
  const winH = 130;

  const win = new BrowserWindow({
    width: winW,
    height: winH,
    x: screenW - winW - 40,
    y: Math.round((screenH - winH) / 2),
    transparent: true,
    frame: false,
    alwaysOnTop: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'pet.html'));
  win.webContents.on('context-menu', (e) => e.preventDefault());

  // Auto-reload renderer on crash (fixes context menu reappearing during lag)
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer crashed:', details.reason, details.exitCode);
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.loadFile(path.join(__dirname, 'pet.html'));
      }
    }, 500);
  });

  const bubbleW = 200;
  const bubbleH = 36;
  const bubble = new BrowserWindow({
    width: bubbleW,
    height: bubbleH,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  bubble.setIgnoreMouseEvents(true, { forward: true });
  bubble.loadFile(path.join(__dirname, 'bubble.html'));

  const CHAT = [
    '今天天气不错 ☀️',
    '有点无聊... 🦀',
    '好安静啊 🍃',
    '肚子有点饿了 🍔',
    '有人看到我的钳子吗 🦞',
    '今天的桌面真宽 🖥️',
    '又是美好的一天 ✨',
    '嗯...在想什么 🤔',
    '啦啦啦 🎵',
    '想出去走走 🌿',
  ];
  const REST_MSG = ['好累... 💤', '休息一下 😪', '打个盹... 😴', 'ZZzzz... 💤'];
  const WAKE_MSG = ['睡饱了 ☀️', '嗯...精神了！✨', '继续散步~ 🚶', '刚才做了个好梦 🍪'];
  const HAPPY_CHAT = ['嘿嘿 😆', '好开心 🎵', '今天状态超好 ⚡', '啦啦啦~ 🎶'];
  const LONELY_CHAT = ['好无聊... 😞', '没人理我... 🥺', '想出去走走 🚶', '好孤单... 💧'];

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1],
  ];
  let dx = 1;
  let dy = 1;
  let lastDx = 1;
  let isResting = false;
  let isPaused = false;
  let pauseTimer = null;
  let interactionScore = 20;
  let cornerStuckCounter = 0;
  let restTimeout = null;
  let directionTimer, restTimer, moodTimer, chatTimer;

  function getMood() {
    if (interactionScore > 30) return 'happy';
    if (interactionScore < 10) return 'lonely';
    return 'neutral';
  }

  function getSpeed() {
    const mood = getMood();
    if (mood === 'happy') return 3;
    if (mood === 'lonely') return 1;
    return 2;
  }

  function randomDir() {
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    dx = d[0];
    dy = d[1];
  }

  function sendDirection() {
    if (dx !== lastDx) {
      lastDx = dx;
      win.webContents.executeJavaScript(`setDirection(${dx})`).catch(() => {});
    }
  }

  // Direction change timer (recursive setTimeout, 3-7s)
  function scheduleDirection() {
    const delay = 3000 + Math.random() * 4000;
    directionTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      if (Math.random() < 0.6) randomDir();
      sendDirection();
      scheduleDirection();
    }, delay);
  }
  scheduleDirection();

  // Rest check timer (recursive setTimeout, 4-6 min)
  function scheduleRestCheck() {
    const delay = 240000 + Math.random() * 120000;
    restTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      if (!isResting) {
        const prob = getMood() === 'happy' ? 0.25 : 0.5;
        if (Math.random() < prob) startRest();
      }
      scheduleRestCheck();
    }, delay);
  }
  scheduleRestCheck();

  // Mood decay timer (recursive setTimeout, 60s)
  function scheduleMoodDecay() {
    moodTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      interactionScore = Math.max(0, interactionScore - 3);
      scheduleMoodDecay();
    }, 60000);
  }
  scheduleMoodDecay();

  // Chat timer (recursive setTimeout, 15-25s)
  function scheduleChat() {
    const delay = 15000 + Math.random() * 10000;
    chatTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      if (!isResting) {
        const mood = getMood();
        const prob = mood === 'happy' ? 0.35 : mood === 'lonely' ? 0.2 : 0.3;
        if (Math.random() < prob) {
          const pool = mood === 'happy' ? [...CHAT, ...HAPPY_CHAT]
            : mood === 'lonely' ? LONELY_CHAT : CHAT;
          showBubble(pool[Math.floor(Math.random() * pool.length)]);
        }
      }
      scheduleChat();
    }, delay);
  }
  scheduleChat();

  let bubbleTimer = null;
  function showBubble(msg) {
    const safe = msg.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    bubble.webContents.executeJavaScript(`show("${safe}")`).catch(() => {});
    const [cx, cy] = win.getPosition();
    const bx = Math.max(0, Math.round(cx + (winW - bubbleW) / 2));
    bubble.setPosition(bx, cy - bubbleH - 4);
    bubble.show();
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.hide(), 4000);
  }

  function startRest() {
    isResting = true;
    showBubble(REST_MSG[Math.floor(Math.random() * REST_MSG.length)]);
    win.webContents.executeJavaScript('setResting(true)').catch(() => {});
    const duration = Math.random() < 0.6
      ? 30000 + Math.random() * 30000
      : 60000 + Math.random() * 30000;
    clearTimeout(restTimeout);
    restTimeout = setTimeout(() => {
      if (win.isDestroyed()) return;
      isResting = false;
      showBubble(WAKE_MSG[Math.floor(Math.random() * WAKE_MSG.length)]);
      win.webContents.executeJavaScript('setResting(false)').catch(() => {});
    }, duration);
  }

  // Cursor proximity detection
  let cursorNear = false;
  let cursorNearTimer = null;

  const moveTimer = setInterval(() => {
    if (win.isDestroyed()) {
      clearInterval(moveTimer);
      return;
    }
    try {
      if (isResting || isPaused) return;

      const [x, y] = win.getPosition();
      const spd = getSpeed();
      let nx = x + dx * spd;
      let ny = y + dy * spd;

      // Bounce off screen edges
      if (nx <= 0) { nx = 0; dx = -dx; sendDirection(); }
      if (ny <= 0) { ny = 0; dy = -dy; }
      if (nx + winW >= screenW) { nx = screenW - winW; dx = -dx; sendDirection(); }
      if (ny + winH >= screenH) { ny = screenH - winH; dy = -dy; }

      // Edge/corner stuck detection: force escape if trapped
      const atEdge =
        nx <= 0 || nx + winW >= screenW ||
        ny <= 0 || ny + winH >= screenH;
      if (atEdge) {
        cornerStuckCounter++;
        if (cornerStuckCounter > 8) {
          const cx = Math.round(screenW / 2);
          const cy = Math.round(screenH / 2);
          dx = cx > nx + winW / 2 ? 1 : -1;
          dy = cy > ny + winH / 2 ? 1 : -1;
          sendDirection();
          cornerStuckCounter = 0;
        }
      } else {
        cornerStuckCounter = 0;
      }

      win.setPosition(nx, ny);
      if (!bubble.isDestroyed() && bubble.isVisible()) {
        const bx = Math.max(0, Math.round(nx + (winW - bubbleW) / 2));
        bubble.setPosition(bx, ny - bubbleH - 4);
      }
    } catch (err) {
      console.error('Movement loop error:', err);
    }
  }, 100);

  // Cursor proximity check — separate 1000ms interval
  const cursorCheckTimer = setInterval(() => {
    if (win.isDestroyed()) {
      clearInterval(cursorCheckTimer);
      return;
    }
    if (isResting || isPaused) return;
    const [x, y] = win.getPosition();
    const cursor = screen.getCursorScreenPoint();
    const dist = Math.hypot(cursor.x - (x + winW / 2), cursor.y - (y + winH / 2));
    if (dist < 80) {
      if (!cursorNear) {
        cursorNear = true;
        cursorNearTimer = setTimeout(() => {
          if (cursorNear && !isResting) showBubble('别挡着我呀 😠');
        }, 3000);
      }
    } else {
      cursorNear = false;
      clearTimeout(cursorNearTimer);
    }
  }, 1000);

  // IPC: drag
  ipcMain.on('drag-start', () => {
    win.webContents.executeJavaScript('setDragging(true)').catch(() => {});
  });
  ipcMain.on('drag-move', (e, dx, dy) => {
    const [x, y] = win.getPosition();
    win.setPosition(x + dx, y + dy);
  });
  ipcMain.on('drag-end', () => {
    win.webContents.executeJavaScript('setDragging(false)').catch(() => {});
  });
  ipcMain.on('interact', () => {
    isPaused = true;
    interactionScore = Math.min(50, interactionScore + 8);
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => { isPaused = false; }, 1500);
  });

  // Toggle visibility shortcut
  let hidden = false;
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (hidden) {
      win.show();
      hidden = false;
    } else {
      win.hide();
      bubble.hide();
      hidden = true;
    }
  });

  win.on('closed', () => {
    clearInterval(moveTimer);
    clearInterval(cursorCheckTimer);
    clearInterval(screenBoundsTimer);
    clearTimeout(bubbleTimer);
    clearTimeout(cursorNearTimer);
    clearTimeout(directionTimer);
    clearTimeout(restTimer);
    clearTimeout(moodTimer);
    clearTimeout(chatTimer);
    clearTimeout(pauseTimer);
    clearTimeout(restTimeout);
    ipcMain.removeAllListeners('drag-start');
    ipcMain.removeAllListeners('drag-move');
    ipcMain.removeAllListeners('drag-end');
    ipcMain.removeAllListeners('interact');
    globalShortcut.unregisterAll();
    screen.removeAllListeners('display-metrics-changed');
    if (!bubble.isDestroyed()) bubble.close();
  });
}

app.whenReady().then(() => {
  if (!app.isPackaged) {
    const packagedExe = path.join(__dirname, 'dist', 'win-unpacked', 'electron.exe');
    if (fs.existsSync(packagedExe)) {
      app.setLoginItemSettings({ openAtLogin: true, path: packagedExe, name: 'ClaudeCrab' });
    } else {
      app.setLoginItemSettings({ openAtLogin: true, name: 'ClaudeCrab' });
    }
  } else {
    app.setLoginItemSettings({ openAtLogin: true, name: 'ClaudeCrab' });
  }
  createWindow();
});
app.on('window-all-closed', () => app.quit());
}
