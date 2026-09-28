const path = require('node:path');
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { sessionsDirectory, listSessions, parseSession } = require('./sessions');
const { resumeSession } = require('./launcher');

let knownSessions = new Map();
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 790,
    minHeight: 560,
    backgroundColor: '#0b1018',
    title: 'Codex Session Manager',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('sessions:list', async () => {
    const sessions = await listSessions();
    knownSessions = new Map(sessions.map(session => [session.id, session]));
    return { directory: sessionsDirectory(), sessions };
  });

  ipcMain.handle('sessions:detail', async (_event, id) => {
    const selected = knownSessions.get(id);
    if (!selected) throw new Error('세션을 찾을 수 없습니다. 목록을 새로고침해 주세요.');
    return parseSession(selected.filePath, true);
  });

  ipcMain.handle('sessions:resume', async (_event, id) => {
    const selected = knownSessions.get(id);
    if (!selected) throw new Error('세션을 찾을 수 없습니다. 목록을 새로고침해 주세요.');
    return resumeSession(selected);
  });

  ipcMain.handle('sessions:open-directory', () => shell.openPath(sessionsDirectory()));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
