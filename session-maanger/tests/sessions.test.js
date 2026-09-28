const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseSession, listSessions, sessionsDirectory } = require('../src/sessions');
const { shellQuote, appleScriptQuote, windowsResumeCommand } = require('../src/launcher');

const ID_A = '12345678-1234-1234-1234-123456789abc';
const ID_B = 'abcdefab-cdef-cdef-cdef-abcdefabcdef';

function fixture(directory, id, rows) {
  const file = path.join(directory, `rollout-2026-09-27T10-00-00-${id}.jsonl`);
  fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n{incomplete', 'utf8');
  return file;
}

test('parses a conversation and skips environment context and non-display items', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sessions-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = fixture(directory, ID_A, [
    { type: 'session_meta', payload: { id: ID_A, cwd: '/work/my-project', source: 'cli', timestamp: '2026-09-27T10:00:00Z' } },
    { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '<environment_context>\n<cwd>/work</cwd>\n</environment_context>' }] } },
    { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Create a desktop app.' }] }, timestamp: '2026-09-27T10:01:00Z' },
    { type: 'response_item', payload: { type: 'function_call', name: 'shell' } },
    { type: 'response_item', payload: { type: 'message', role: 'assistant', phase: 'final_answer', content: [{ type: 'output_text', text: 'The app is ready.' }] }, timestamp: '2026-09-27T10:02:00Z' }
  ]);
  const session = await parseSession(file, true);
  assert.equal(session.id, ID_A);
  assert.equal(session.cwd, '/work/my-project');
  assert.equal(session.title, 'Create a desktop app.');
  assert.equal(session.preview, 'The app is ready.');
  assert.equal(session.messageCount, 2);
  assert.deepEqual(session.messages.map(message => message.role), ['user', 'assistant']);
  assert.equal(session.messages[1].timestamp, '2026-09-27T10:02:00Z');
});

test('finds nested sessions and sorts newest first', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sessions-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const nested = path.join(directory, '2026', '09', '27');
  fs.mkdirSync(nested, { recursive: true });
  const older = fixture(directory, ID_A, [{ type: 'session_meta', payload: { id: ID_A } }]);
  const newer = fixture(nested, ID_B, [{ type: 'session_meta', payload: { id: ID_B } }]);
  const now = new Date();
  fs.utimesSync(older, new Date(now.getTime() - 60000), new Date(now.getTime() - 60000));
  fs.utimesSync(newer, now, now);
  const sessions = await listSessions(directory);
  assert.deepEqual(sessions.map(session => session.id), [ID_B, ID_A]);
});

test('uses CODEX_HOME when set', () => {
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = path.join(os.tmpdir(), 'another-codex-home');
  try { assert.equal(sessionsDirectory(), path.join(process.env.CODEX_HOME, 'sessions')); }
  finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
});

test('quotes macOS shell and AppleScript strings', () => {
  assert.equal(shellQuote("a'b"), "'a'\\''b'");
  assert.equal(appleScriptQuote('a"b\\c'), '"a\\"b\\\\c"');
});

test('builds a Command Prompt resume command with a spaced CLI path', () => {
  assert.equal(
    windowsResumeCommand('C:\\Program Files\\Codex CLI\\codex.cmd', ID_A),
    '"C:\\Program Files\\Codex CLI\\codex.cmd" resume 12345678-1234-1234-1234-123456789abc'
  );
});
