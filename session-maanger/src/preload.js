const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sessionManager', {
  list: () => ipcRenderer.invoke('sessions:list'),
  detail: id => ipcRenderer.invoke('sessions:detail', id),
  resume: id => ipcRenderer.invoke('sessions:resume', id),
  openDirectory: () => ipcRenderer.invoke('sessions:open-directory')
});
