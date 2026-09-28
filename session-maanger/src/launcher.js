const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function windowsCodexPath() {
  const candidates = [
    process.env.CODEX_CLI_PATH,
    process.env.APPDATA && path.join(process.env.APPDATA, 'npm', 'codex.cmd'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'nodejs', 'codex.cmd')
  ].filter(Boolean);
  const pathEntries = (process.env.PATH || '').split(path.delimiter);
  for (const directory of pathEntries) candidates.push(path.join(directory, 'codex.cmd'));
  return candidates.find(candidate => fs.existsSync(candidate));
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function appleScriptQuote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function openMacTerminal(sessionId, cwd) {
  const command = `cd ${shellQuote(cwd)} && codex resume ${shellQuote(sessionId)}`;
  const script = `tell application "Terminal" to do script ${appleScriptQuote(command)}\ntell application "Terminal" to activate`;
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], error => error ? reject(error) : resolve());
  });
}

function openWindowsTerminal(sessionId, cwd) {
  const codex = windowsCodexPath();
  if (!codex) throw new Error('Codex CLI를 찾을 수 없습니다. Codex CLI를 설치한 뒤 앱을 다시 실행해 주세요.');
  const command = windowsResumeCommand(codex, sessionId);
  return launchWindowsTerminal(command, cwd);
}

function windowsResumeCommand(codex, sessionId) {
  return `"${codex}" resume ${sessionId}`;
}

function runProcess(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'ignore', windowsHide: false, ...options });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${executable} 실행에 실패했습니다 (${code}).`)));
  });
}

async function launchWindowsTerminal(command, cwd) {
  try {
    // -w new makes a separate visible window even when Terminal is configured to reuse tabs.
    await runProcess('wt.exe', ['-w', 'new', 'new-tab', '-d', cwd, 'cmd.exe', '/k', command], { cwd });
    return;
  } catch {
    // Windows Terminal may be missing or its app execution alias may be disabled.
  }
  const escaped = value => String(value).replace(/'/g, "''");
  const script = `$process = Start-Process -FilePath $env:ComSpec -ArgumentList @('/k', '${escaped(command)}') -WorkingDirectory '${escaped(cwd)}' -WindowStyle Normal -PassThru; if (-not $process) { exit 1 }`;
  await runProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { cwd, windowsHide: true });
}

async function resumeSession(session) {
  if (!UUID.test(session?.id || '')) throw new Error('올바르지 않은 세션 ID입니다.');
  const savedCwd = session.cwd;
  const cwd = savedCwd && fs.existsSync(savedCwd) && fs.statSync(savedCwd).isDirectory()
    ? savedCwd
    : os.homedir();
  if (process.platform === 'win32') await openWindowsTerminal(session.id, cwd);
  else if (process.platform === 'darwin') await openMacTerminal(session.id, cwd);
  else throw new Error('현재 운영체제의 터미널 실행은 지원되지 않습니다.');
  return { usedHomeDirectory: cwd !== savedCwd };
}

module.exports = { resumeSession, windowsCodexPath, shellQuote, appleScriptQuote, windowsResumeCommand };
