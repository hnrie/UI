const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronapi', {
  openfile: () => ipcRenderer.invoke('dialog:openfile'),
  savefile: (content) => ipcRenderer.invoke('dialog:savefile', content),
  closewindow: () => ipcRenderer.send('window:close'),
  minimizewindow: () => ipcRenderer.send('window:minimize'),
  maximizewindow: () => ipcRenderer.send('window:maximize'),
  hyperioninitialize: () => ipcRenderer.invoke('hyperion:initialize'),
  hyperionattach: () => ipcRenderer.invoke('hyperion:attach'),
  hyperionexecute: (code) => ipcRenderer.invoke('hyperion:execute', code),
  startterminalserver: () => ipcRenderer.invoke('terminal:start'),
  onterminaldata: (callback) => ipcRenderer.on('terminal:data', (_event, data) => callback(data))
});
