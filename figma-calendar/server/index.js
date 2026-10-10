import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import pg from 'pg';
import { ConfigurationError, loadConfiguration, loadAuthConfiguration, ORIGIN, ROOT } from './config.js';
import { createAuthService } from './auth.js';
import { createApplication, safeErrors } from './app.js';
import { createRepository, verifyDatabase } from './repository.js';
import { ChangeBus, listenForChanges } from './changes.js';
import { verifySecretFile } from './secret-file.js';
import { mountClient } from './client.js';

const dev = process.argv.includes('--dev');
let pool;
let httpServer;
let application;
let closeClient;
let stopListener;

async function start() {
  const envPath = path.join(ROOT, '.env.server.local');
  verifySecretFile(envPath);
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
  const config = loadConfiguration();
  const authConfig = loadAuthConfiguration();
  pool = new pg.Pool(config);
  pool.on('error', () => { console.error('DB 연결 오류: 서버 설정과 네트워크를 확인해 주세요.'); });
  await verifyDatabase(pool);
  const bus = new ChangeBus();
  bus.setMaxListeners(520);
  application = createApplication({ repository: createRepository(pool), bus, dev, auth: createAuthService(authConfig), siteKey: authConfig.siteKey });
  httpServer = http.createServer(application.app);
  httpServer.requestTimeout = 15000;
  httpServer.headersTimeout = 10000;
  httpServer.maxHeadersCount = 32;
  closeClient = await mountClient(application.app, httpServer, dev);
  application.app.use(safeErrors);
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(4175, '127.0.0.1', resolve);
  });
  stopListener = listenForChanges(() => new pg.Client({ ...config, application_name: 'calendar-listener' }), bus);
  console.log(`Calendar: ${ORIGIN}`);
}

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  application?.close();
  await stopListener?.();
  await closeClient?.();
  if (httpServer?.listening) await new Promise((resolve) => { httpServer.close(resolve); httpServer.closeAllConnections(); });
  await pool?.end();
}

process.once('SIGINT', () => { void stop(); });
process.once('SIGTERM', () => { void stop(); });
start().catch(async (error) => {
  console.error(error instanceof ConfigurationError ? error.message : '시작 실패: 전용 DB 계정·권한·TLS 인증서·연결 상태를 확인해 주세요.');
  await stop();
  process.exitCode = 1;
});
