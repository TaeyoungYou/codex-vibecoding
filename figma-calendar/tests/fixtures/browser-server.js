// QA only. No DB, no credentials, no persistence. Never imported by server/index.js.
import http from 'node:http';
import readline from 'node:readline';
import { createApplication, safeErrors } from '../../server/app.js';
import { ChangeBus } from '../../server/changes.js';
import { ApiError } from '../../server/validation.js';
import { mountClient } from '../../server/client.js';
import { mockAuth, testSiteKey } from './auth.js';

const events = new Map();
const bus = new ChangeBus();
bus.setStatus('connected');
const repository = {
  async list(date) { return [...events.values()].filter((event) => event.date === date); },
  async add(event) {
    const existing = events.get(event.id);
    if (existing && (existing.date !== event.date || existing.title !== event.title)) throw new ApiError(409, 'ID_CONFLICT', '저장 요청이 충돌했습니다.');
    events.set(event.id, event); bus.changed(); return existing ?? event;
  },
  async remove(date, id) {
    if (events.has(id) && events.get(id).date !== date) throw new ApiError(409, 'DATE_CONFLICT', '날짜가 변경되었습니다.');
    const removed = events.delete(id); bus.changed(); return removed;
  },
};
const dev = process.argv.includes('--dev');
let authOffset = 0;
let authUnavailable = false;
const auth = mockAuth(() => Date.now() + authOffset);
const authorize = auth.authorize;
auth.authorize = async (state) => {
  if (authUnavailable) throw new ApiError(503, 'AUTH_UNAVAILABLE', '인증 서비스 연결을 확인해 주세요.');
  return authorize(state);
};
const application = createApplication({ repository, bus, dev, auth, siteKey: testSiteKey, heartbeatMs: 250 });
const server = http.createServer(application.app);
const closeClient = await mountClient(application.app, server, dev);
application.app.use((_req, res) => res.status(404).end());
application.app.use(safeErrors);
server.listen(4175, '127.0.0.1', () => console.log('QA fixture only (NO DATABASE): http://127.0.0.1:4175'));
const commands = readline.createInterface({ input: process.stdin });
commands.on('line', (line) => {
  try {
    const command = JSON.parse(line);
    if (command.action === 'set') events.set(command.event.id, command.event);
    if (command.action === 'delete') events.delete(command.id);
    if (command.action === 'status') bus.setStatus(command.status);
    if (command.action === 'auth-expire') authOffset += 3600001;
    if (command.action === 'auth-unavailable') authUnavailable = command.value === true;
    if (command.action === 'stats') console.log(JSON.stringify({ streams: bus.listenerCount('change'), events: events.size }));
    else bus.changed();
  } catch { console.error('Invalid QA command'); }
});
let stopping = false;
async function stop() {
  if (stopping) return; stopping = true;
  commands.close(); application.close(); await closeClient();
  server.close(); server.closeAllConnections();
}
process.once('SIGINT', () => { void stop(); });
process.once('SIGTERM', () => { void stop(); });
