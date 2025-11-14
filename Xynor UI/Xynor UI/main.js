const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const koffi = require('koffi');
const net = require('net');
const { spawn, spawnSync } = require('child_process');

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

ipcMain.handle('file:write', async (_event, filepath, content) => {
  if (!filepath) {
    return { success: false, error: 'Missing path' };
  }
  try {
    fs.writeFileSync(filepath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dialog:opengitrepo', async () => {
  const result = await dialog.showOpenDialog(mainwindow, {
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return null;
  }

  return { path: result.filePaths[0] };
});

ipcMain.handle('git:listfiles', async (_event, repopath) => {
  if (!repopath) {
    return { success: false, error: 'Repository path required' };
  }

  const gitdir = path.join(repopath, '.git');
  if (!fs.existsSync(gitdir)) {
    return { success: false, error: 'Not a git repository' };
  }

  try {
    const listresult = spawnSync('git', ['ls-files'], { cwd: repopath, encoding: 'utf-8' });
    if (listresult.status !== 0) {
      return { success: false, error: listresult.stderr.trim() || 'Failed to list files' };
    }

    const files = listresult.stdout.split('\n').filter(Boolean);

    const statusresult = spawnSync('git', ['status', '--short'], { cwd: repopath, encoding: 'utf-8' });
    const branchresult = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repopath, encoding: 'utf-8' });

    const status = statusresult.stdout.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(/\s+/);
      const code = parts.shift();
      const filepath = parts.join(' ');
      return { path: filepath, status: code };
    });

    const detailed = files.map(file => {
      const fullpath = path.join(repopath, file);
      let size = 0;
      try {
        const stats = fs.statSync(fullpath);
        size = stats.size;
      } catch (error) {
        size = 0;
      }
      return { path: file, size };
    });

    return {
      success: true,
      branch: branchresult.stdout.trim(),
      files: detailed,
      status
    };
  } catch (error) {
    console.error('Git list error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:readfile', async (_event, repopath, relativepath) => {
  if (!repopath || !relativepath) {
    return { success: false, error: 'Path required' };
  }
  try {
    const target = path.join(repopath, relativepath);
    const content = fs.readFileSync(target, 'utf-8');
    return { success: true, content, filepath: target };
  } catch (error) {
    console.error('Git read error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:getuser', async () => {
  try {
    const nameresult = spawnSync('git', ['config', '--global', 'user.name'], { encoding: 'utf-8' });
    const emailresult = spawnSync('git', ['config', '--global', 'user.email'], { encoding: 'utf-8' });
    return {
      success: true,
      name: nameresult.stdout.trim(),
      email: emailresult.stdout.trim()
    };
  } catch (error) {
    console.error('Git config read error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:setuser', async (_event, name, email) => {
  try {
    if (typeof name === 'string' && name.trim()) {
      const nameresult = spawnSync('git', ['config', '--global', 'user.name', name.trim()]);
      if (nameresult.status !== 0) {
        return { success: false, error: nameresult.stderr.toString().trim() || 'Failed to update name' };
      }
    }
    if (typeof email === 'string' && email.trim()) {
      const emailresult = spawnSync('git', ['config', '--global', 'user.email', email.trim()]);
      if (emailresult.status !== 0) {
        return { success: false, error: emailresult.stderr.toString().trim() || 'Failed to update email' };
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Git config write error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:log', async (_event, repopath, limit = 5) => {
  if (!repopath) {
    return { success: false, error: 'Repository path required' };
  }
  try {
    const logresult = spawnSync('git', ['log', '-n', String(limit), '--pretty=format:%h|%an|%ad|%s', '--date=short'], { cwd: repopath, encoding: 'utf-8' });
    if (logresult.status !== 0) {
      return { success: false, error: logresult.stderr.trim() || 'Failed to read log' };
    }
    const commits = logresult.stdout.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|');
      const hash = parts.shift() || '';
      const author = parts.shift() || '';
      const date = parts.shift() || '';
      const message = parts.join('|');
      return { hash, author, date, message };
    });
    return { success: true, commits };
  } catch (error) {
    console.error('Git log error:', error);
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
