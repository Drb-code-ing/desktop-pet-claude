const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, screen } = require('electron');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

function createWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  const winW = 75;
  const winH = 80;

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
    },
  });

  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'pet.html'));

  const speed = 2;
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1],
  ];
  let dx = 1;
  let dy = 1;
  let lastDx = 1;

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

  setInterval(() => {
    if (Math.random() < 0.6) randomDir();
    sendDirection();
  }, 3000 + Math.random() * 4000);

  const moveTimer = setInterval(() => {
    if (win.isDestroyed()) {
      clearInterval(moveTimer);
      return;
    }
    const [x, y] = win.getPosition();
    let nx = x + dx * speed;
    let ny = y + dy * speed;

    // Bounce off screen edges
    if (nx <= 0) { nx = 0; dx = -dx; sendDirection(); }
    if (ny <= 0) { ny = 0; dy = -dy; }
    if (nx + winW >= screenW) { nx = screenW - winW; dx = -dx; sendDirection(); }
    if (ny + winH >= screenH) { ny = screenH - winH; dy = -dy; }

    win.setPosition(nx, ny);
  }, 33);

  win.on('closed', () => clearInterval(moveTimer));
}

app.whenReady().then(() => {
  if (!app.isPackaged) {
    const packagedExe = path.join(__dirname, 'dist', 'win-unpacked', 'electron.exe');
    if (fs.existsSync(packagedExe)) {
      app.setLoginItemSettings({ openAtLogin: true, path: packagedExe });
    } else {
      app.setLoginItemSettings({ openAtLogin: true });
    }
  } else {
    app.setLoginItemSettings({ openAtLogin: true });
  }
  createWindow();
});
app.on('window-all-closed', () => app.quit());
