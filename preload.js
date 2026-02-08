const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onStatusUpdate: (cb) => ipcRenderer.on('status-update', (_e, text) => cb(text)),
  onLogLine:      (cb) => ipcRenderer.on('log-line', (_e, text) => cb(text)),
  onError:        (cb) => ipcRenderer.on('error', (_e, text) => cb(text)),
  retry:          ()   => ipcRenderer.send('retry'),
});
