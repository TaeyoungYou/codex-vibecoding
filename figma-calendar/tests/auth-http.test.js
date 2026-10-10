import http from 'node:http';
import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import { createApplication, safeErrors } from '../server/app.js';
import { ChangeBus } from '../server/changes.js';
import { ApiError } from '../server/validation.js';
import { mockAuth, testSiteKey } from './fixtures/auth.js';

let application, server, origin, cookie, csrf, auth, repository, clock, bus;
async function request(url, options = {}) {
  return fetch(origin + url, { ...options, headers: {
    'Sec-Fetch-Site': 'same-origin', Cookie: cookie ?? '',
    ...(options.method ? { Origin: origin, 'Content-Type': 'application/json', 'X-Calendar-CSRF': csrf } : {}), ...options.headers,
  } });
}
async function session(fresh = false) {
  if (fresh) cookie = '';
  const response = await request('/api/session');
  if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  const data = await response.json(); csrf = data.csrfToken; return data;
}
async function signIn(token = 'fixture-captcha') {
  const response = await request('/api/auth/anonymous', { method: 'POST', body: JSON.stringify({ captchaToken: token }) });
  if (response.ok) { cookie = response.headers.get('set-cookie').split(';')[0]; csrf = (await response.clone().json()).csrfToken; }
  return response;
}
beforeEach(async () => {
  clock = Date.now(); auth = mockAuth(() => clock);
  auth.signIn = vi.fn(auth.signIn); auth.authorize = vi.fn(auth.authorize); auth.clear = vi.fn(auth.clear);
  repository = { list: vi.fn(async () => []), add: vi.fn(), remove: vi.fn() }; bus = new ChangeBus();
  server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  application = createApplication({ repository, bus, auth, siteKey: testSiteKey, origin, now: () => clock, heartbeatMs: 25 });
  application.app.use(safeErrors); server.on('request', application.app);
  await session();
});
afterEach(async () => { application.close(); await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); });

test('CAPTCHA 전 일정·SSE 접근을 모두 거부하고 성공 시 쿠키와 CSRF를 교체한다', async () => {
  expect((await session()).authStatus).toBe('unauthenticated');
  const oldCookie = cookie, oldCsrf = csrf;
  expect((await request('/api/events?date=2026-10-07')).status).toBe(401);
  expect((await request('/api/events', { method: 'POST', body: '{}' })).status).toBe(401);
  expect((await request('/api/events/id?date=2026-10-07', { method: 'DELETE', body: '{}' })).status).toBe(401);
  expect((await request('/api/changes')).status).toBe(401);
  const response = await signIn();
  expect(response.status).toBe(200); expect(cookie).not.toBe(oldCookie); expect(csrf).not.toBe(oldCsrf);
  expect(await response.text()).not.toContain('fixture-auth-only');
  expect((await session()).authStatus).toBe('authenticated');
  expect((await request('/api/events?date=2026-10-07')).status).toBe(200);
  expect((await request('/api/events?date=2026-10-07', { headers: { Cookie: oldCookie } })).status).toBe(401);
});

test('동시 로그인은 계정 생성 한 번·동일 쿠키 교체를 공유한다', async () => {
  let release;
  const original = auth.signIn.getMockImplementation();
  auth.signIn.mockImplementationOnce(async (...args) => { await new Promise((resolve) => { release = resolve; }); await original(...args); });
  const first = signIn(), second = signIn();
  await vi.waitFor(() => expect(auth.signIn).toHaveBeenCalledTimes(1));
  await new Promise((resolve) => setTimeout(resolve, 40)); release();
  const results = await Promise.all([first, second]);
  expect(auth.signIn).toHaveBeenCalledTimes(1);
  expect(results[0].headers.get('set-cookie')).toBe(results[1].headers.get('set-cookie'));
});

test('CAPTCHA 입력·CSRF·Origin·크기·위조·만료·재사용을 거부한다', async () => {
  expect((await request('/api/auth/anonymous', { method: 'POST', body: JSON.stringify({ captchaToken: 'fixture' }), headers: { 'X-Calendar-CSRF': '' } })).status).toBe(403);
  expect((await request('/api/auth/anonymous', { method: 'POST', body: JSON.stringify({ captchaToken: 'fixture' }), headers: { Origin: 'https://attacker.invalid' } })).status).toBe(403);
  for (const body of [{}, { captchaToken: 'fixture', sql: 'select 1' }, { captchaToken: ['fixture'] }, { captchaToken: ' ' }]) {
    expect((await request('/api/auth/anonymous', { method: 'POST', body: JSON.stringify(body) })).status).toBe(400);
  }
  expect((await request('/api/auth/anonymous', { method: 'POST', body: JSON.stringify({ captchaToken: 'x'.repeat(5000) }) })).status).toBe(413);
  expect(auth.signIn).not.toHaveBeenCalled();
  for (const token of ['forged', 'expired', 'reused']) expect((await signIn(token)).status).toBe(400);
});

test('로그인 한도는 세션 5회·서버 10회이며 다음 분에 복구한다', async () => {
  for (let n = 0; n < 5; n++) expect((await signIn('forged')).status).toBe(400);
  expect((await signIn()).status).toBe(429);
  await session(true);
  for (let n = 0; n < 5; n++) expect((await signIn('forged')).status).toBe(400);
  await session(true); expect((await signIn()).status).toBe(429);
  clock += 60001; expect((await signIn()).status).toBe(200);
});

test('Auth 장애는 503으로 차단하고 복구 후 재사용하며 한 시간 뒤 다시 인증한다', async () => {
  await signIn();
  const authorize = auth.authorize.getMockImplementation();
  auth.authorize.mockImplementation(async () => { throw new ApiError(503, 'AUTH_UNAVAILABLE', 'safe error'); });
  expect((await session()).authStatus).toBe('unavailable');
  expect((await request('/api/events?date=2026-10-07')).status).toBe(503);
  expect(repository.list).not.toHaveBeenCalled();
  auth.authorize.mockImplementation(authorize);
  expect((await session()).authStatus).toBe('authenticated');
  clock += 3600001; expect((await session()).authStatus).toBe('unauthenticated');
  expect(auth.clear).toHaveBeenCalled();
});

test('SSE heartbeat가 Auth를 검증하고 만료 안내와 함께 구독을 종료한다', async () => {
  await signIn();
  const response = await request('/api/changes'); const reader = response.body.getReader();
  await reader.read(); clock += 3600001;
  let text = '';
  while (true) { const part = await reader.read(); if (part.done) break; text += new TextDecoder().decode(part.value); }
  expect(text).toContain('event: auth'); expect(text).toContain('unauthenticated');
  await vi.waitFor(() => expect(bus.listenerCount('change')).toBe(0));
});

test('이전 인증의 늦은 401은 재인증으로 교체한 세션을 폐기하지 않는다', async () => {
  await signIn();
  let rejectOld;
  auth.authorize.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }));
  const pending = request('/api/events?date=2026-10-07');
  await vi.waitFor(() => expect(rejectOld).toBeTypeOf('function'));
  auth.authorize.mockRejectedValueOnce(new ApiError(401, 'AUTH_REQUIRED', '다시 인증해 주세요.'));
  expect((await session()).authStatus).toBe('unauthenticated');
  expect((await signIn('new-captcha')).status).toBe(200);
  rejectOld(new ApiError(401, 'AUTH_REQUIRED', '이전 인증입니다.'));
  expect((await pending).status).toBe(200);
  expect((await session()).authStatus).toBe('authenticated');
});
