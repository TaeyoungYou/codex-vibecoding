import path from 'node:path';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { loadConfiguration, ROOT } from '../server/config.js';
import { verifySecretFile } from '../server/secret-file.js';

const signalId = '2f05de6a-ce98-443d-b68c-17370568d013';
const missedId = 'b4b63c3a-b601-4087-bff1-a7a4627dc74a';
const signalTitle = 'Codex QA reconnect signal 17370568';
const missedTitle = 'Codex QA reconnect missed a7a4627d';
const date = '2026-10-07';
const dev = process.argv.includes('--dev');
const listenerOnly = process.argv.includes('--listener-only');
let server;
let client;
let output = '';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(check, timeout = 180000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (await check()) return; await pause(200); }
  throw new Error('QA_TIMEOUT');
}
async function start() {
  server = spawn(process.execPath, ['server/index.js', ...(dev ? ['--dev'] : [])], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  server.stdout.on('data', (data) => { output += data; });
  server.stderr.on('data', (data) => { output += data; });
  await wait(async () => {
    try { return (await fetch('http://127.0.0.1:4175/')).ok; } catch { return false; }
  }, 15000);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const closed = new Promise((resolve) => server.once('exit', resolve));
  server.kill();
  await closed;
}
try {
  verifySecretFile(path.join(ROOT, '.env.server.local'));
  process.loadEnvFile(path.join(ROOT, '.env.server.local'));
  const config = loadConfiguration();
  client = new pg.Client(config);
  await client.connect();
  if (!client.connection.stream.authorized) throw new Error('TLS_NOT_AUTHORIZED');
  await start();
  const privatePaths = ['/.env.server.local', '/server/index.js', '/scripts/provision.ps1', '/supabase/migrations/20261007215214_secure_calendar.sql', '/.certs/prod-ca-2021.crt', '/.tools/psql/bin/psql.exe', '/@fs/C:/Study/Codex/codex-vibecoding/figma-calendar/.env.server.local'];
  for (const resource of privatePaths) if ((await fetch('http://127.0.0.1:4175' + resource)).status !== 404) throw new Error('PRIVATE_PATH_EXPOSED');
  const csp = (await fetch('http://127.0.0.1:4175/')).headers.get('content-security-policy');
  if (!dev && (/unsafe-inline|ws:/.test(csp))) throw new Error('PRODUCTION_CSP');
  console.log(`QA_READY: verified TLS; real ${dev ? 'development' : 'production'} server started.`);
  await wait(async () => (await client.query('SELECT EXISTS (SELECT 1 FROM calendar_private.events WHERE id=$1 AND event_date=$2 AND title=$3) AS found', [signalId, date, signalTitle])).rows[0].found);
  if (listenerOnly) {
    const { rows } = await client.query("SELECT pid FROM pg_stat_activity WHERE usename=current_user AND query='LISTEN calendar_events_changed' AND pid<>pg_backend_pid()");
    if (rows.length !== 1) throw new Error('LISTENER_NOT_UNIQUE');
    await client.query('SELECT pg_terminate_backend($1)', [rows[0].pid]);
    await pause(200);
  } else {
    await stop();
    await pause(1500);
  }
  await client.query('INSERT INTO calendar_private.events (id,event_date,title) VALUES ($1,$2,$3)', [missedId, date, missedTitle]);
  if (!listenerOnly) await start();
  console.log('QA_RECONNECT: committed change during the controlled connection interruption.');
  await wait(async () => Number((await client.query('SELECT count(*) AS count FROM calendar_private.events WHERE id=ANY($1::uuid[])', [[signalId, missedId]])).rows[0].count) === 0);
  if (output.includes(config.password)) throw new Error('LOG_SECRET_FOUND');
  console.log('QA_PASS: test records cleaned; captured server logs contain no runtime password.');
} catch {
  console.error('QA_FAIL: integration verification did not complete; details and credentials redacted.');
  process.exitCode = 1;
} finally {
  await stop();
  if (client) {
    await client.query('DELETE FROM calendar_private.events WHERE id=ANY($1::uuid[]) AND event_date=$2', [[signalId, missedId], date]).catch(() => {});
    await client.end().catch(() => {});
  }
}
