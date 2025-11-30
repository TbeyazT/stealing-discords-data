const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: ipcRenderer.invoke,
  on: (channel, listener) => ipcRenderer.on(channel, listener),
});