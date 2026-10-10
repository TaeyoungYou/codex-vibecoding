import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { ApiError, validateDate, validateEvent, validateId } from './validation.js';
import { ORIGIN, ROOT } from './config.js';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createApplication({ repository, bus, auth, siteKey, origin = ORIGIN, dev = false, now = Date.now, heartbeatMs = 15000 }) {
  if (!auth || !siteKey) throw new Error('AUTH_CONFIGURATION_REQUIRED');
  const app = express();
  const sessions = new Map();
  let bootstrapWindow = { started: now(), count: 0 };
  const loginWindow = { started: now(), count: 0 };
  let closed = false;
  const host = new URL(origin).host;
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://challenges.cloudflare.com', ...(dev ? ["'unsafe-inline'"] : [])],
        frameSrc: ['https://challenges.cloudflare.com'],
        styleSrc: ["'self'", ...(dev ? ["'unsafe-inline'"] : [])],
        connectSrc: ["'self'", ...(dev ? ['ws://127.0.0.1:4175'] : [])],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"],
        formAction: ["'self'"], baseUri: ["'none'"], upgradeInsecureRequests: null,
      },
    },
    strictTransportSecurity: false,
    referrerPolicy: { policy: 'no-referrer' },
  }));
  app.use((req, res, next) => {
    if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== origin)) {
      return res.status(403).json({ code: 'FORBIDDEN_ORIGIN', message: '허용되지 않은 요청입니다.' });
    }
    next();
  });

  function getSession(req) {
    const matches = (req.headers.cookie ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith('calendar_session='));
    if (matches.length !== 1) return null;
    const token = matches[0].slice('calendar_session='.length);
    const session = sessions.get(token);
    if (!session || session.expires <= now()) { if (session) dropSession(session); return null; }
    return session;
  }

  function endStreams(session, authStatus = 'unauthenticated') {
    for (const stream of session.streams) {
      if (!stream.writableEnded && !stream.destroyed) stream.write(`event: auth\ndata: ${JSON.stringify({ authStatus })}\n\n`);
      stream.end();
    }
  }

  function dropSession(session) {
    auth.clear(session.auth);
    endStreams(session);
    sessions.delete(session.id);
  }

  function setCookie(res, session) {
    res.set('Set-Cookie', `calendar_session=${session.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`);
  }

  async function authStatus(session) {
    if (!session.authenticated) return 'unauthenticated';
    const state = session.auth;
    try { await auth.authorize(state); return session.authenticated && session.auth === state && session.expires > now() ? 'authenticated' : 'unauthenticated'; }
    catch (error) {
      // Another request may already have replaced this authentication state.
      // A late failure must never clear the newly authenticated session.
      if (session.auth !== state) return authStatus(session);
      if (error.status === 401) {
        auth.clear(session.auth);
        session.auth = auth.createSession();
        session.authenticated = false;
        endStreams(session);
        return 'unauthenticated';
      }
      return 'unavailable';
    }
  }

  function rateLimit(session, kind, limit) {
    const bucket = session[kind];
    if (now() - bucket.started >= 60000) { bucket.started = now(); bucket.count = 0; }
    if (++bucket.count > limit) throw new ApiError(429, 'RATE_LIMITED', '요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.');
  }

  // Fetch Metadata also protects read endpoints from cross-site requests without an Origin header.
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'POST', 'DELETE'].includes(req.method)) return next(new ApiError(405, 'METHOD_NOT_ALLOWED', '허용되지 않은 요청입니다.'));
    if (req.headers['sec-fetch-site'] !== 'same-origin') return next(new ApiError(403, 'FORBIDDEN_SITE', '허용되지 않은 요청입니다.'));
    if (req.method !== 'GET' && req.headers.origin !== origin) return next(new ApiError(403, 'FORBIDDEN_ORIGIN', '허용되지 않은 요청입니다.'));
    next();
  });

  app.get('/api/session', async (req, res) => {
    let session = getSession(req);
    if (!session) {
      for (const existing of sessions.values()) if (existing.expires <= now()) dropSession(existing);
      if (now() - bootstrapWindow.started >= 60000) bootstrapWindow = { started: now(), count: 0 };
      if (++bootstrapWindow.count > 30 || sessions.size >= 128) throw new ApiError(429, 'RATE_LIMITED', '잠시 뒤 다시 접속해 주세요.');
      const token = randomBytes(32).toString('hex');
      session = {
        id: token, auth: auth.createSession(), authenticated: false, login: null,
        csrf: randomBytes(32).toString('hex'), expires: now() + 3600000,
        read: { started: now(), count: 0 }, checks: { started: now(), count: 0 }, write: { started: now(), count: 0 }, attempts: { started: now(), count: 0 }, streams: new Set(),
      };
      sessions.set(token, session);
      setCookie(res, session);
    }
    rateLimit(session, 'checks', 120);
    res.json({ csrfToken: session.csrf, authStatus: await authStatus(session), turnstileSiteKey: siteKey });
  });

  app.use('/api', (req, _res, next) => {
    req.calendarSession = getSession(req);
    if (!req.calendarSession) return next(new ApiError(401, 'SESSION_REQUIRED', '로컬 연결을 다시 확인해 주세요.'));
    if (req.method === 'GET') rateLimit(req.calendarSession, 'read', 120);
    else {
      if (!safeEqual(req.headers['x-calendar-csrf'], req.calendarSession.csrf)) return next(new ApiError(403, 'CSRF_REQUIRED', '허용되지 않은 요청입니다.'));
      if (!req.is('application/json')) return next(new ApiError(415, 'JSON_REQUIRED', 'JSON 요청이 필요합니다.'));
      if (req.path !== '/auth/anonymous') rateLimit(req.calendarSession, 'write', 30);
    }
    next();
  });

  app.use('/api', express.json({ limit: '4kb', strict: true }));

  app.post('/api/auth/anonymous', async (req, res) => {
    const body = req.body;
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1
      || typeof body.captchaToken !== 'string' || !/^[A-Za-z0-9_.-]{1,2048}$/.test(body.captchaToken)) {
      throw new ApiError(400, 'INVALID_CAPTCHA', 'CAPTCHA를 다시 완료해 주세요.');
    }
    const session = req.calendarSession;
    if (!session.login) {
      rateLimit(session, 'attempts', 5);
      rateLimit({ attempts: loginWindow }, 'attempts', 10);
      session.login = (async () => {
        if (session.authenticated && await authStatus(session) === 'authenticated') return;
        await auth.signIn(session.auth, body.captchaToken);
        if (closed || session.expires <= now() || !sessions.has(session.id)) { auth.clear(session.auth); throw new ApiError(401, 'AUTH_REQUIRED', '로컬 세션이 만료되었습니다. 다시 접속해 주세요.'); }
        endStreams(session);
        sessions.delete(session.id);
        session.id = randomBytes(32).toString('hex');
        session.csrf = randomBytes(32).toString('hex');
        session.expires = now() + 3600000;
        session.authenticated = true;
        sessions.set(session.id, session);
      })().finally(() => { session.login = null; });
    }
    await session.login;
    setCookie(res, session);
    res.json({ csrfToken: session.csrf, authStatus: 'authenticated', turnstileSiteKey: siteKey });
  });

  app.use('/api', async (req, _res, next) => {
    const status = await authStatus(req.calendarSession);
    if (status === 'unauthenticated') throw new ApiError(401, 'AUTH_REQUIRED', 'CAPTCHA를 완료하고 익명으로 시작해 주세요.');
    if (status === 'unavailable') throw new ApiError(503, 'AUTH_UNAVAILABLE', '인증 서비스 연결을 확인하고 다시 시도해 주세요.');
    if (req.calendarSession.expires <= now()) throw new ApiError(401, 'AUTH_REQUIRED', '인증이 만료되었습니다. CAPTCHA를 다시 완료해 주세요.');
    next();
  });

  function dateQuery(req) {
    if (Object.keys(req.query).length !== 1 || !Object.hasOwn(req.query, 'date')) throw new ApiError(400, 'INVALID_QUERY', '날짜를 확인해 주세요.');
    return validateDate(req.query.date);
  }

  app.get('/api/events', async (req, res) => res.json({ events: await repository.list(dateQuery(req)) }));
  app.post('/api/events', async (req, res) => res.status(201).json({ event: await repository.add(validateEvent(req.body)) }));
  app.delete('/api/events/:id', async (req, res) => res.json({ removed: await repository.remove(dateQuery(req), validateId(req.params.id)) }));

  app.get('/api/changes', (req, res) => {
    const session = req.calendarSession;
    if (session.streams.size >= 4) throw new ApiError(429, 'STREAM_LIMIT', '열린 캘린더 탭 수를 줄여 주세요.');
    res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    session.streams.add(res);
    const send = (event, data) => {
      if (res.destroyed || res.writableEnded) return;
      if (res.writableLength > 65536) { res.end(); return; }
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const changed = () => send('change', {});
    const status = (value) => send('status', { status: value });
    bus.on('change', changed);
    bus.on('status', status);
    send('ready', { status: bus.status });
    let checking = false;
    const heartbeat = setInterval(async () => {
      if (checking || res.writableEnded || res.destroyed) return;
      checking = true;
      try {
        const status = session.expires <= now() ? 'unauthenticated' : await authStatus(session);
        if (res.writableEnded || res.destroyed) return;
        if (status !== 'authenticated') { send('auth', { authStatus: status }); res.end(); }
        else res.write(': heartbeat\n\n');
      } finally { checking = false; }
    }, heartbeatMs);
    heartbeat.unref();
    res.on('close', () => {
      clearInterval(heartbeat);
      session.streams.delete(res);
      bus.off('change', changed);
      bus.off('status', status);
    });
    res.on('error', () => res.destroy());
  });

  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', '요청을 찾을 수 없습니다.')));
  // Block secret/source paths before Vite or static serving, including encoded separators.
  app.use((req, res, next) => {
    let pathname;
    try { pathname = decodeURIComponent(req.path); } catch { return res.status(400).end(); }
    if (/(?:^|[\\/])(?:\.env[^\\/]*|\.git|\.certs|\.tools|\.cache|server|supabase|scripts|memory-bank)(?:[\\/]|$)/i.test(pathname)
      || pathname.includes('\\')) return res.status(404).end();
    if (pathname.startsWith('/@fs/')) {
      const dependencyPath = path.relative(path.join(ROOT, 'node_modules'), path.resolve(pathname.slice(5)));
      if (!dev || !dependencyPath || dependencyPath.startsWith('..') || path.isAbsolute(dependencyPath)) return res.status(404).end();
    }
    next();
  });

  const cleanup = setInterval(() => {
    for (const session of sessions.values()) if (session.expires <= now()) dropSession(session);
  }, 60000);
  cleanup.unref();
  return {
    app,
    close() {
      closed = true;
      clearInterval(cleanup);
      for (const session of sessions.values()) dropSession(session);
      sessions.clear();
    },
  };
}

export function safeErrors(error, _req, res, _next) {
  if (res.headersSent) { res.end(); return; }
  if (error instanceof ApiError) {
    if (error.status === 429) res.set('Retry-After', '60');
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  if (error.type === 'entity.too.large') return res.status(413).json({ code: 'BODY_TOO_LARGE', message: '입력 크기를 줄여 주세요.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ code: 'INVALID_JSON', message: '요청 형식을 확인해 주세요.' });
  return res.status(503).json({ code: 'DATABASE_UNAVAILABLE', message: '일정을 처리하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.' });
}
