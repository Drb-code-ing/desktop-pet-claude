const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crab', {
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: (dx, dy) => ipcRenderer.send('drag-move', dx, dy),
  dragEnd: () => ipcRenderer.send('drag-end'),
  showMenu: () => ipcRenderer.send('show-menu'),
  interact: () => ipcRenderer.send('interact'),
});
