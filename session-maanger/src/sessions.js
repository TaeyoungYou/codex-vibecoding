const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const readline = require('node:readline');

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function sessionsDirectory() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  return path.join(codexHome, 'sessions');
}

async function findSessionFiles(directory) {
  const files = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    let entries;
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(fullPath);
    }
  }
  return files;
}

function displayText(content) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .filter(part => ['input_text', 'output_text', 'text'].includes(part?.type))
    .map(part => typeof part.text === 'string' ? part.text : '')
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function isContextMessage(text) {
  const value = text.trim();
  return value.startsWith('<environment_context>') ||
    value.startsWith('<permissions instructions>') ||
    value.startsWith('<collaboration_mode>');
}

function compact(text, limit = 180) {
  const value = text.replace(/\s+/g, ' ').trim();
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function sessionTitle(text) {
  const firstLine = text.split(/\r?\n/).map(line => line.trim()).find(Boolean) || text;
  return compact(firstLine.replace(/^[-*•]\s+/, ''), 68);
}

async function parseSession(filePath, full = false) {
  const stat = await fs.promises.stat(filePath);
  const result = {
    id: path.basename(filePath).match(UUID)?.[0] || '',
    filePath,
    cwd: '',
    source: '',
    createdAt: '',
    updatedAt: stat.mtime.toISOString(),
    title: '',
    preview: '',
    messageCount: 0,
    searchText: '',
    messages: full ? [] : undefined
  };
  let latestUser = '';
  let latestAssistant = '';
  let latestFinal = '';
  const searchParts = [];
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (!line) continue;
      let row;
      try { row = JSON.parse(line); } catch { continue; }
      const payload = row.payload;
      if (row.type === 'session_meta' && payload) {
        result.id = payload.id || payload.session_id || result.id;
        result.cwd = typeof payload.cwd === 'string' ? payload.cwd : result.cwd;
        result.source = typeof payload.source === 'string' ? payload.source : result.source;
        result.createdAt = payload.timestamp || row.timestamp || result.createdAt;
      }
      if (row.type !== 'response_item' || payload?.type !== 'message') continue;
      const role = payload.role;
      if (role !== 'user' && role !== 'assistant') continue;
      const body = displayText(payload.content);
      if (!body || (role === 'user' && isContextMessage(body))) continue;
      if (role === 'user') {
        if (!result.title) result.title = sessionTitle(body);
        latestUser = body;
      } else {
        latestAssistant = body;
        if (payload.phase === 'final_answer' || payload.phase === 'final') latestFinal = body;
      }
      result.messageCount++;
      searchParts.push(compact(body, 500));
      if (full) result.messages.push({
        role,
        phase: payload.phase || '',
        text: body,
        timestamp: row.timestamp || ''
      });
    }
  } finally {
    lines.close();
    stream.destroy();
  }
  result.title ||= '제목 없는 세션';
  result.preview = compact(latestFinal || latestAssistant || latestUser || '대화 내용이 없습니다.', 220);
  result.searchText = [result.id, result.cwd, result.title, ...searchParts].join(' ').toLocaleLowerCase();
  return result;
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      try { output[index] = await worker(items[index]); }
      catch { output[index] = null; }
    }
  }));
  return output.filter(Boolean);
}

async function listSessions(directory = sessionsDirectory()) {
  const files = await findSessionFiles(directory);
  const sessions = await mapLimit(files, 6, file => parseSession(file));
  return sessions
    .filter(session => UUID.test(session.id))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

module.exports = { sessionsDirectory, findSessionFiles, parseSession, listSessions, displayText, compact, sessionTitle };
