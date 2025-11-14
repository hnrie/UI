const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronapi', {
  openfile: () => ipcRenderer.invoke('dialog:openfile'),
  savefile: (content) => ipcRenderer.invoke('dialog:savefile', content),
  writefile: (filepath, content) => ipcRenderer.invoke('file:write', filepath, content),
  closewindow: () => ipcRenderer.send('window:close'),
  minimizewindow: () => ipcRenderer.send('window:minimize'),
  maximizewindow: () => ipcRenderer.send('window:maximize'),
  hyperioninitialize: () => ipcRenderer.invoke('hyperion:initialize'),
  hyperionattach: () => ipcRenderer.invoke('hyperion:attach'),
  hyperionexecute: (code) => ipcRenderer.invoke('hyperion:execute', code),
  startterminalserver: () => ipcRenderer.invoke('terminal:start'),
  onterminaldata: (callback) => ipcRenderer.on('terminal:data', (_event, data) => callback(data)),
  opengitrepo: () => ipcRenderer.invoke('dialog:opengitrepo'),
  listgitfiles: (repopath) => ipcRenderer.invoke('git:listfiles', repopath),
  readgitfile: (repopath, relativepath) => ipcRenderer.invoke('git:readfile', repopath, relativepath),
  getgituser: () => ipcRenderer.invoke('git:getuser'),
  setgituser: (name, email) => ipcRenderer.invoke('git:setuser', name, email),
  gitlog: (repopath, limit) => ipcRenderer.invoke('git:log', repopath, limit)
});
