const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { listSessions, parseSession, sessionsDirectory } = require('../src/sessions');

let known = new Map();
let resumedId = '';

app.whenReady().then(async () => {
  ipcMain.handle('sessions:list', async () => {
    const sessions = await listSessions();
    known = new Map(sessions.map(session => [session.id, session]));
    return { directory: sessionsDirectory(), sessions };
  });
  ipcMain.handle('sessions:detail', (_event, id) => parseSession(known.get(id).filePath, true));
  ipcMain.handle('sessions:resume', (_event, id) => { resumedId = id; return { usedHomeDirectory: false }; });
  const window = new BrowserWindow({
    width: 1240,
    height: 820,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    ready = await window.webContents.executeJavaScript('document.querySelectorAll(".session-card").length > 0 && !!document.querySelector(".message-body")');
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('The session list or conversation preview did not render.');
  const summary = await window.webContents.executeJavaScript('({ count: document.querySelectorAll(".session-card").length, title: document.querySelector("#detail-title").textContent, messages: document.querySelectorAll(".message").length })');
  const moved = await window.webContents.executeJavaScript(`(() => {
    const first = document.querySelector('.session-card.selected').dataset.id;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const second = document.querySelector('.session-card.selected').dataset.id;
    return first !== second;
  })()`);
  if (!moved) throw new Error('ArrowDown did not move the selected session.');
  const selectedId = await window.webContents.executeJavaScript('document.querySelector(".session-card.selected").dataset.id');
  await window.webContents.executeJavaScript('document.querySelector("#resume-button").click()');
  for (let attempt = 0; attempt < 20 && !resumedId; attempt++) await new Promise(resolve => setTimeout(resolve, 50));
  if (resumedId !== selectedId) throw new Error('The resume button did not send the selected session ID.');
  console.log(JSON.stringify({ ...summary, keyboardNavigation: moved, resumeButton: true }));
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
