const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const koffi = require('koffi');
const net = require('net');
const { spawn } = require('child_process');

let mainwindow;
let hyperionlib = null;
let hyperioninitialize = null;
let hyperionattach = null;
let hyperionexecute = null;
let terminalserver = null;
let lspserver = null;

function createwindow() {
  mainwindow = new BrowserWindow({
    width: 850,
    height: 500,
    title: 'Xynor IDE',
    backgroundColor: '#0d0d15',
    frame: false,
    titleBarStyle: 'hidden',
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainwindow.loadFile('index.html');
}

app.whenReady().then(() => {
  try {
    const dllpath = path.join(__dirname, 'Hyperion.dll');
    hyperionlib = koffi.load(dllpath);
    hyperioninitialize = hyperionlib.func('Initialize', 'void', []);
    hyperionattach = hyperionlib.func('Attach', 'void', []);
    hyperionexecute = hyperionlib.func('Execute', 'void', ['str16']);
  } catch (error) {
    console.error('Failed to load Hyperion.dll:', error);
  }

  lspserver = spawn('node', [path.join(__dirname, 'lsp-server.js')]);

  createwindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createwindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (lspserver) {
    lspserver.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('dialog:openfile', async () => {
  const result = await dialog.showOpenDialog(mainwindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  const filepath = result.filePaths[0];
  const content = fs.readFileSync(filepath, 'utf-8');
  
  return { filepath, content };
});

ipcMain.handle('dialog:savefile', async (event, content) => {
  const result = await dialog.showSaveDialog(mainwindow, {
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return { success: false };
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filepath: result.filePath };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('window:close', () => {
  if (mainwindow) {
    mainwindow.close();
  }
});

ipcMain.on('window:minimize', () => {
  if (mainwindow) {
    mainwindow.minimize();
  }
});

ipcMain.on('window:maximize', () => {
  if (mainwindow) {
    if (mainwindow.isMaximized()) {
      mainwindow.unmaximize();
    } else {
      mainwindow.maximize();
    }
  }
});

ipcMain.handle('hyperion:initialize', async () => {
  try {
    if (hyperioninitialize) {
      hyperioninitialize();
      return { success: true };
    }
    return { success: false, error: 'Hyperion.dll not loaded' };
  } catch (error) {
    console.error('Initialize error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('hyperion:attach', async () => {
  try {
    if (hyperionattach) {
      hyperionattach();
      return { success: true };
    }
    return { success: false, error: 'Hyperion.dll not loaded' };
  } catch (error) {
    console.error('Attach error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('hyperion:execute', async (_event, code) => {
  try {
    if (hyperionexecute) {
      hyperionexecute(code);
      return { success: true };
    }
    return { success: false, error: 'Hyperion.dll not loaded' };
  } catch (error) {
    console.error('Execute error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal:start', async () => {
  try {
    if (terminalserver) {
      return { success: true, message: 'Server already running' };
    }

    terminalserver = net.createServer((socket) => {
      socket.on('data', (data) => {
        const message = data.toString();
        if (mainwindow) {
          mainwindow.webContents.send('terminal:data', message);
        }
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });

    terminalserver.listen(3456, 'localhost');

    terminalserver.on('error', (error) => {
      console.error('Server error:', error);
      terminalserver = null;
      return { success: false, error: error.message };
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to start terminal server:', error);
    return { success: false, error: error.message };
  }
});
