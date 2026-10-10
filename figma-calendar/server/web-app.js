import express from 'express';
import helmet from 'helmet';
import { timingSafeEqual } from 'node:crypto';
import { createRepository, verifyDatabase } from './repository.js';
import { createWebSessionStore, readSessionToken } from './web-sessions.js';
import { safeErrors } from './app.js';
import { ApiError, validateDate, validateEvent, validateId } from './validation.js';

function equal(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

// One short-lived pooler connection and transaction per request. No LISTEN,
// process-local session map, or background timers are used by Vercel functions.
export function createWebApplication({ origin, siteKey, auth, cipher, connect, now = Date.now, secure = true, verify = verifyDatabase }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) {
      return next(new ApiError(403, 'FORBIDDEN_ORIGIN', '허용되지 않은 요청입니다.'));
    }
    if (req.headers['sec-fetch-site'] !== 'same-origin') return next(new ApiError(403, 'FORBIDDEN_SITE', '허용되지 않은 요청입니다.'));
    if (!['GET', 'POST', 'DELETE'].includes(req.method)) return next(new ApiError(405, 'METHOD_NOT_ALLOWED', '허용되지 않은 요청입니다.'));
    if (req.method !== 'GET' && req.headers.origin !== origin) return next(new ApiError(403, 'FORBIDDEN_ORIGIN', '허용되지 않은 요청입니다.'));
    if (req.method !== 'GET' && !req.is('application/json')) return next(new ApiError(415, 'JSON_REQUIRED', 'JSON 요청이 필요합니다.'));
    if (Number(req.headers['content-length']) > 4096) return next(new ApiError(413, 'BODY_TOO_LARGE', '입력 크기를 줄여 주세요.'));
    next();
  });
  app.use(express.json({ limit: '4kb', strict: true }));
  app.use((req, _res, next) => {
    // Vercel's /api runtime may have parsed JSON before calling Express.
    if (req.body !== undefined && Buffer.byteLength(JSON.stringify(req.body)) > 4096) return next(new ApiError(413, 'BODY_TOO_LARGE', '입력 크기를 줄여 주세요.'));
    next();
  });

  function cookie(res, session) {
    res.set('Set-Cookie', `calendar_session=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600${secure ? '; Secure' : ''}`);
  }

  async function status(session, store) {
    if (!session.authentication) return 'unauthenticated';
    const state = auth.restoreSession(session.authentication.credentials, session.authentication.expires);
    try {
      await auth.authorize(state);
      session.authentication = { credentials: state.credentials, expires: state.expires };
      await store.save(session);
      return 'authenticated';
    } catch (error) {
      if (error.status !== 401) return 'unavailable';
      session.authentication = null;
      await store.save(session);
      return 'unauthenticated';
    } finally { auth.clear(state); }
  }

  const sessionBody = (session, authStatus) => ({ csrfToken: session.csrf, authStatus, turnstileSiteKey: siteKey, syncMode: 'poll', pollIntervalMs: 5000 });

  function dateQuery(req) {
    // Node function helpers may add dynamic route parameters to req.query.
    // Validate the original query string, including duplicate date keys.
    const entries = [...new URL(req.originalUrl, origin).searchParams];
    if (entries.length !== 1 || entries[0][0] !== 'date') throw new ApiError(400, 'INVALID_QUERY', '날짜를 확인해 주세요.');
    return validateDate(entries[0][1]);
  }

  app.use('/api', async (req, res, next) => {
    let client;
    let transaction = false;
    let setCookie = false;
    let session;
    let response;
    let failure;
    try {
      // Reject unknown routes before opening a database connection.
      const path = req.path;
      const known = (req.method === 'GET' && ['/session', '/events', '/changes'].includes(path))
        || (req.method === 'POST' && ['/auth/anonymous', '/events'].includes(path))
        || (req.method === 'DELETE' && /^\/events\/[^/]+$/.test(path));
      if (!known) throw new ApiError(404, 'NOT_FOUND', '요청을 찾을 수 없습니다.');
      client = await connect();
      await verify(client);
      await client.query('BEGIN');
      transaction = true;
      await client.query("SET LOCAL idle_in_transaction_session_timeout = '20s'");
      const store = createWebSessionStore(client, cipher, now);
      session = await store.load(readSessionToken(req.headers.cookie));
      if (!session && req.method === 'GET' && path === '/session') {
        await store.rate('bootstrap', 30);
        await store.cleanup();
        const { rows: [capacity] } = await client.query('SELECT count(*)::int AS count FROM calendar_private.web_sessions');
        if (capacity.count >= 128) throw new ApiError(429, 'RATE_LIMITED', '잠시 뒤 다시 접속해 주세요.');
        session = await store.create();
        setCookie = true;
      }
      if (!session) throw new ApiError(401, 'SESSION_REQUIRED', '연결을 다시 확인해 주세요.');
      await store.rate(`${session.id}:${path === '/session' ? 'checks' : req.method === 'GET' ? 'read' : 'write'}`, req.method === 'GET' ? 120 : 30);
      if (req.method !== 'GET' && !equal(req.headers['x-calendar-csrf'], session.csrf)) throw new ApiError(403, 'CSRF_REQUIRED', '허용되지 않은 요청입니다.');

      if (req.method === 'GET' && path === '/session') {
        response = { body: sessionBody(session, await status(session, store)) };
      } else if (path === '/auth/anonymous') {
        const body = req.body;
        if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || typeof body.captchaToken !== 'string' || !/^[A-Za-z0-9_.-]{1,2048}$/.test(body.captchaToken)) throw new ApiError(400, 'INVALID_CAPTCHA', 'CAPTCHA를 다시 완료해 주세요.');
        await store.rate(`${session.id}:login`, 5);
        await store.rate('login', 10);
        if (await status(session, store) !== 'authenticated') {
          const state = auth.createSession();
          try {
            await auth.signIn(state, body.captchaToken);
            if (session.expires <= now()) throw new ApiError(401, 'AUTH_REQUIRED', '세션이 만료되었습니다. 다시 접속해 주세요.');
            session.authentication = { credentials: state.credentials, expires: state.expires };
            await store.rotate(session);
            setCookie = true;
          } finally { auth.clear(state); }
        }
        response = { body: sessionBody(session, 'authenticated') };
      } else {
        const authenticated = await status(session, store);
        if (authenticated === 'unauthenticated') throw new ApiError(401, 'AUTH_REQUIRED', 'CAPTCHA를 완료하고 익명으로 시작해 주세요.');
        if (authenticated === 'unavailable') throw new ApiError(503, 'AUTH_UNAVAILABLE', '인증 서비스 연결을 확인하고 다시 시도해 주세요.');
        const repository = createRepository(client);
        if (req.method === 'GET' && path === '/changes') response = { body: { status: 'connected' } };
        else if (req.method === 'GET') response = { body: { events: await repository.list(dateQuery(req)) } };
        else if (req.method === 'POST') response = { status: 201, body: { event: await repository.add(validateEvent(req.body)) } };
        else response = { body: { removed: await repository.remove(dateQuery(req), validateId(path.slice('/events/'.length))) } };
      }
      await client.query('COMMIT');
      transaction = false;
    } catch (error) {
      failure = error;
      if (transaction) {
        // Commit rejected requests' shared counters and revoked Auth state.
        // SQL/network failures roll back the complete operation.
        await client.query(error instanceof ApiError ? 'COMMIT' : 'ROLLBACK').catch(() => {});
      }
    } finally { await client?.end().catch(() => {}); }
    if (failure) return next(failure);
    if (setCookie) cookie(res, session);
    res.status(response.status ?? 200).json(response.body);
  });
  app.use((_req, res) => res.status(404).end());
  app.use(safeErrors);
  return app;
}
