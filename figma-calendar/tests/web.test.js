import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { expect, test, vi } from 'vitest';
import { createSessionCipher, readSessionToken, sessionHash } from '../server/web-sessions.js';
import { createWebApplication } from '../server/web-app.js';
import { createApi } from '../client/src/api.js';

test('저장된 Auth 토큰은 암호화되며 다른 세션·변조·다른 키로 복호화할 수 없다', () => {
  const cipher = createSessionCipher(randomBytes(32).toString('base64url'));
  const payload = { credentials: { access_token: 'fixture-access', refresh_token: 'fixture-refresh' }, expires: 1234 };
  const first = cipher.seal(payload, 'session-a');
  expect(first).not.toContain('fixture-access');
  expect(first).not.toBe(cipher.seal(payload, 'session-a'));
  expect(cipher.open(first, 'session-a')).toEqual(payload);
  expect(() => cipher.open(first, 'session-b')).toThrow();
  const bytes = Buffer.from(first, 'base64url'); bytes[30] ^= 1;
  expect(() => cipher.open(bytes.toString('base64url'), 'session-a')).toThrow();
  expect(() => createSessionCipher(randomBytes(32).toString('base64url')).open(first, 'session-a')).toThrow();
});

test('세션 쿠키는 정확히 하나의 무작위 ID만 허용하고 DB 키는 단방향 해시다', () => {
  const token = 'a'.repeat(64);
  expect(readSessionToken(`calendar_session=${token}`)).toBe(token);
  expect(readSessionToken(`calendar_session=${token}; calendar_session=${token}`)).toBeNull();
  expect(readSessionToken('calendar_session=invalid')).toBeNull();
  expect(sessionHash(token)).not.toBe(token);
});

test('공개 API는 잘못된 Host·Origin·Fetch Metadata·본문 크기를 DB 연결 전 거부한다', async () => {
  const connect = vi.fn();
  const app = createWebApplication({ origin: 'https://calendar.example', connect, auth: {}, cipher: {}, siteKey: 'test' });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const request = (headers, method = 'GET', body) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: '/api/session', method, headers }, (res) => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject); req.end(body);
  });
  try {
    expect(await request({ Host: 'evil.example', 'Sec-Fetch-Site': 'same-origin' })).toBe(403);
    expect(await request({ Host: 'calendar.example', 'Sec-Fetch-Site': 'cross-site' })).toBe(403);
    expect(await request({ Host: 'calendar.example', Origin: 'https://evil.example', 'Sec-Fetch-Site': 'same-origin' })).toBe(403);
    expect(await request({ Host: 'calendar.example', Origin: 'https://calendar.example', 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json', 'Content-Length': '4097' }, 'POST', 'x'.repeat(4097))).toBe(413);
    expect(connect).not.toHaveBeenCalled();
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('Vercel 조회 구독은 한 타이머를 공유하고 5초마다 갱신하며 구독 해제 후 멈춘다', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ csrfToken: 'a'.repeat(64), authStatus: 'authenticated', syncMode: 'poll' }) }));
  const source = vi.fn();
  const api = createApi(fetcher, source), first = vi.fn(), second = vi.fn();
  const stopFirst = api.subscribe(first, vi.fn());
  const stopSecond = api.subscribe(second, vi.fn());
  try {
    await vi.advanceTimersByTimeAsync(0);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(first).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(source).not.toHaveBeenCalled();
    stopFirst(); stopSecond();
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  } finally { stopFirst(); stopSecond(); vi.useRealTimers(); }
});

test('삭제는 플랫폼의 route query 대신 원래 날짜를 검증하고 중복·추가 쿼리를 거부한다', async () => {
  const token = 'a'.repeat(64), csrf = 'b'.repeat(64);
  const id = '7bc150cd-b8f1-4a6d-9053-b5caf1f40258';
  const cipher = createSessionCipher(randomBytes(32).toString('base64url'));
  const hash = sessionHash(token);
  const query = vi.fn(async (sql) => {
    if (sql.startsWith('SELECT id, csrf')) return { rows: [{ id: hash, csrf, auth_data: cipher.seal({ credentials: {}, expires: Date.now() + 10000 }, hash), expires_at: new Date(Date.now() + 10000) }] };
    if (sql.startsWith('INSERT INTO calendar_private.web_limits')) return { rows: [{ hits: 1 }] };
    if (sql.startsWith('DELETE FROM calendar_private.events')) return { rows: [{ id }] };
    return { rows: [] };
  });
  const client = { query, end: vi.fn(async () => {}) };
  const auth = { restoreSession: (credentials, expires) => ({ credentials, expires }), authorize: async () => {}, clear: () => {} };
  const app = createWebApplication({ origin: 'https://calendar.example', connect: async () => client, verify: async () => {}, auth, cipher, siteKey: 'test' });
  const server = http.createServer((req, res) => {
    Object.defineProperty(req, 'query', { value: { id, date: '2099-10-09' }, configurable: true });
    app(req, res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const request = (search) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: `/api/events/${id}${search}`, method: 'DELETE', headers: { Host: 'calendar.example', Origin: 'https://calendar.example', 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json', 'Content-Length': '2', 'X-Calendar-CSRF': csrf, Cookie: `calendar_session=${token}` } }, (res) => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject); req.end('{}');
  });
  try {
    expect(await request('?date=2099-10-09')).toBe(200);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM calendar_private.events'), [id, '2099-10-09']);
    expect(await request(`?date=2099-10-09&id=${id}`)).toBe(200);
    expect(await request(`?id=${id}&date=2099-10-09`)).toBe(200);
    expect(await request('?date=2099-10-09&id=7bc150cd-b8f1-4a6d-9053-b5caf1f40259')).toBe(400);
    expect(await request(`?date=2099-10-09&id=${id}&id=${id}`)).toBe(400);
    expect(await request('?date=2099-10-09&date=2099-10-10')).toBe(400);
    expect(await request('?date=2099-10-09&extra=1')).toBe(400);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
