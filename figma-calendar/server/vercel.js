import pg from 'pg';
import path from 'node:path';
import { loadConfiguration, loadAuthConfiguration, ConfigurationError, ROOT } from './config.js';
import { createAuthService } from './auth.js';
import { createSessionCipher } from './web-sessions.js';
import { createWebApplication } from './web-app.js';

let application;

function configure() {
  const origin = process.env.CALENDAR_ORIGIN ?? 'https://codex-vibecoding-seven.vercel.app';
  const url = new URL(origin);
  if (url.origin !== origin || url.protocol !== 'https:') throw new ConfigurationError('CALENDAR_ORIGIN에 허용된 HTTPS 출처를 설정하세요.');
  const secret = process.env.CALENDAR_SESSION_SECRET;
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) throw new ConfigurationError('CALENDAR_SESSION_SECRET에 32바이트 무작위 암호화 키를 설정하세요.');
  const db = loadConfiguration({ ...process.env, CALENDAR_DB_CA_CERT_PATH: path.join(ROOT, 'server/certs/prod-ca-2021.crt') });
  const configuration = loadAuthConfiguration();
  return createWebApplication({
    origin, siteKey: configuration.siteKey, auth: createAuthService(configuration), cipher: createSessionCipher(secret),
    async connect() {
      // Keep the existing role's four-connection ceiling. Release connections
      // before every response instead of keeping one pool per function warm.
      for (let attempt = 0; ; attempt++) {
        const client = new pg.Client({ ...db, connectionTimeoutMillis: 3000, application_name: 'calendar-vercel' });
        client.on('error', () => {});
        try { await client.connect(); return client; }
        catch (error) {
          await client.end().catch(() => {});
          if (!['53300', 'XX000'].includes(error.code) || attempt >= 2) throw error;
          await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1) + Math.random() * 100));
        }
      }
    },
  });
}

export default function handler(req, res) {
  try { application ??= configure(); }
  catch (error) {
    // Configuration diagnostics name variables only; credentials are never logged.
    console.error(error instanceof ConfigurationError ? error.message : 'Vercel 서버 설정을 확인하세요.');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ code: 'SERVER_CONFIGURATION', message: '서버 설정을 확인해 주세요.' }));
    return;
  }
  return application(req, res);
}
