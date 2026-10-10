import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import http from 'node:http';
import { createApplication, safeErrors } from '../server/app.js';
import { ChangeBus } from '../server/changes.js';
import { createRepository, verifyDatabase } from '../server/repository.js';
import { ConfigurationError, loadConfiguration } from '../server/config.js';
import { validateEvent } from '../server/validation.js';
import { mockAuth, testSiteKey } from './fixtures/auth.js';

let server, application, origin, cookie, csrf, repository, bus;
let clock;
const event = { id: '652c2950-86dd-4a70-9129-d8df9c7bb814', date: '2026-10-07', title: '테스트 일정' };

async function request(url, options = {}) {
  return fetch(origin + url, {
    ...options,
    headers: {
      'Sec-Fetch-Site': 'same-origin', Cookie: cookie ?? '',
      ...(options.method ? { Origin: origin, 'Content-Type': 'application/json', 'X-Calendar-CSRF': csrf ?? '' } : {}),
      ...options.headers,
    },
  });
}

beforeEach(async () => {
  clock = Date.now();
  repository = { list: vi.fn(async () => []), add: vi.fn(async (value) => value), remove: vi.fn(async () => true) };
  bus = new ChangeBus();
  server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  application = createApplication({ repository, bus, origin, now: () => clock, auth: mockAuth(() => clock), siteKey: testSiteKey });
  application.app.use((_req, res) => res.status(404).end());
  application.app.use(safeErrors);
  server.on('request', application.app);
  const response = await request('/api/session');
  cookie = response.headers.get('set-cookie').split(';')[0];
  csrf = (await response.json()).csrfToken;
  const authenticated = await request('/api/auth/anonymous', { method: 'POST', body: JSON.stringify({ captchaToken: 'fixture' }) });
  cookie = authenticated.headers.get('set-cookie').split(';')[0];
  csrf = (await authenticated.json()).csrfToken;
});

afterEach(async () => {
  application.close();
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  cookie = csrf = undefined;
});

test('세션은 HttpOnly·SameSite 쿠키이고 기존 세션의 CSRF 토큰을 재사용한다', async () => {
  const response = await request('/api/session');
  expect((await response.json()).csrfToken).toBe(csrf);
  expect(response.headers.get('cache-control')).toBe('no-store');
  cookie = undefined;
  const fresh = await request('/api/session');
  expect(fresh.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Strict');
  expect(fresh.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  expect(fresh.headers.get('content-security-policy')).not.toContain('unsafe-inline');
});

test('유효한 세션과 CSRF로 날짜별 조회·추가·삭제를 수행한다', async () => {
  expect((await request('/api/events?date=2026-10-07')).status).toBe(200);
  const added = await request('/api/events', { method: 'POST', body: JSON.stringify(event) });
  expect(added.status).toBe(201);
  expect((await added.json()).event).toEqual(event);
  expect((await request(`/api/events/${event.id}?date=${event.date}`, { method: 'DELETE', body: '{}' })).status).toBe(200);
  expect(repository.remove).toHaveBeenCalledWith(event.date, event.id);
});

test.each([
  ['외부 Origin', { Origin: 'https://attacker.example' }],
  ['cross-site 읽기', { 'Sec-Fetch-Site': 'cross-site' }],
  ['Fetch Metadata 누락', { 'Sec-Fetch-Site': '' }],
])('%s 요청을 차단한다', async (_label, headers) => {
  expect((await request('/api/events?date=2026-10-07', { headers })).status).toBe(403);
  expect(repository.list).not.toHaveBeenCalled();
});

test('DNS rebinding Host 요청을 차단한다', async () => {
  // Node fetch replaces Host; use a real HTTP request to exercise the supplied header.
  const status = await new Promise((resolve, reject) => {
    const req = http.get(origin + '/api/events?date=2026-10-07', {
      headers: { Host: 'attacker.example', 'Sec-Fetch-Site': 'same-origin', Cookie: cookie },
    }, (res) => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject);
  });
  expect(status).toBe(403);
  expect(repository.list).not.toHaveBeenCalled();
});

test('세션·CSRF·Origin 누락과 잘못된 Content-Type을 차단한다', async () => {
  expect((await request('/api/events?date=2026-10-07', { headers: { Cookie: '' } })).status).toBe(401);
  expect((await request('/api/events', { method: 'POST', body: JSON.stringify(event), headers: { 'X-Calendar-CSRF': '' } })).status).toBe(403);
  expect((await request('/api/events', { method: 'POST', body: JSON.stringify(event), headers: { Origin: '' } })).status).toBe(403);
  expect((await request('/api/events', { method: 'POST', body: JSON.stringify(event), headers: { 'Content-Type': 'text/plain' } })).status).toBe(415);
});

test('잘못된 날짜·SQL 삽입·추가 필드·JSON·과대 본문을 거부한다', async () => {
  for (const date of ['2025-02-29', "2026-10-07'; DROP TABLE events;--"]) {
    expect((await request(`/api/events?date=${encodeURIComponent(date)}`)).status).toBe(400);
  }
  expect((await request('/api/events?date=2026-10-07&table=auth.users')).status).toBe(400);
  expect((await request('/api/events', { method: 'POST', body: JSON.stringify({ ...event, table: 'auth.users' }) })).status).toBe(400);
  expect((await request('/api/events', { method: 'POST', body: '{broken' })).status).toBe(400);
  expect((await request('/api/events', { method: 'POST', body: JSON.stringify({ ...event, title: 'x'.repeat(5000) }) })).status).toBe(413);
  expect(repository.add).not.toHaveBeenCalled();
});

test('제목 검증은 Unicode 200자·공백·제어문자를 다루며 마크업은 텍스트로 보존한다', () => {
  expect(validateEvent({ ...event, title: '😀'.repeat(200) }).title).toHaveLength(400);
  for (const title of [' ', '\n\t', 'x'.repeat(201), 'x\u0000']) expect(() => validateEvent({ ...event, title })).toThrow();
  expect(validateEvent({ ...event, title: '<img src=x onerror=alert(1)>' }).title).toBe('<img src=x onerror=alert(1)>');
});

test('조회 120회·쓰기 30회 한도를 적용하고 다음 분에 복구한다', async () => {
  for (let count = 0; count < 120; count++) expect((await request('/api/events?date=2026-10-07')).status).toBe(200);
  expect((await request('/api/events?date=2026-10-07')).status).toBe(429);
  for (let count = 0; count < 30; count++) expect((await request('/api/events', { method: 'POST', body: JSON.stringify(event) })).status).toBe(201);
  expect((await request('/api/events', { method: 'POST', body: JSON.stringify(event) })).status).toBe(429);
  clock += 60001;
  expect((await request('/api/events?date=2026-10-07')).status).toBe(200);
});

test('DB 오류는 자격 증명·SQL·일정 내용 대신 일반 오류로 응답한다', async () => {
  repository.list.mockRejectedValue(new Error('sentinel-private-password SELECT auth.users sensitive title'));
  const response = await request('/api/events?date=2026-10-07');
  expect(response.status).toBe(503);
  expect(await response.text()).not.toMatch(/sentinel|SELECT|auth\.users|sensitive/);
});

test.each(['/.env.server.local', '/server/config.js', '/supabase/migrations/file.sql', '/.git/config', '/scripts/setup.ps1', '/@fs/C:/secret', '/%2eenv.server.local', '/.tools/psql/bin/psql.exe', '/.certs/prod-ca-2021.crt', '/.cache/postgresql-17.11-windows.zip'])('%s 파일을 HTTP로 노출하지 않는다', async (url) => {
  expect((await request(url)).status).toBe(404);
});

test('SSE는 일정 데이터 없이 변경 상태만 보내고 종료 시 구독을 정리한다', async () => {
  bus.setStatus('connected');
  const abort = new AbortController();
  const response = await request('/api/changes', { signal: abort.signal });
  const reader = response.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  expect(first).toContain('event: ready');
  expect(first).toContain('connected');
  bus.changed();
  expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: change\ndata: {}');
  abort.abort();
  await vi.waitFor(() => expect(bus.listenerCount('change')).toBe(0));
});

test('설정 누락·관리자·다른 프로젝트·transaction pooler를 거부한다', () => {
  const env = { CALENDAR_DB_HOST: 'aws-1-ca-central-1.pooler.supabase.com', CALENDAR_DB_PORT: '5432', CALENDAR_DB_USER: 'calendar_runtime.fnqefwbxqtanhnfpxrml', CALENDAR_DB_PASSWORD: 'fixture-password-not-a-real-secret' };
  expect(() => loadConfiguration({})).toThrow(ConfigurationError);
  for (const invalid of [{ CALENDAR_DB_USER: 'postgres.fnqefwbxqtanhnfpxrml' }, { CALENDAR_DB_USER: 'calendar_runtime.another' }, { CALENDAR_DB_PORT: '6543' }, { CALENDAR_DB_HOST: 'attacker.example' }]) {
    expect(() => loadConfiguration({ ...env, ...invalid })).toThrow(ConfigurationError);
  }
  expect(loadConfiguration(env).ssl.rejectUnauthorized).toBe(true);
  expect(() => loadConfiguration({ ...env, NODE_TLS_REJECT_UNAUTHORIZED: '0' })).toThrow(ConfigurationError);
  expect(() => loadConfiguration({ ...env, VITE_DB_PASSWORD: 'fixture' })).toThrow(ConfigurationError);
  expect(() => loadConfiguration({ ...env, CALENDAR_DB_CA_CERT_PATH: 'missing-certificate.crt' })).toThrow(ConfigurationError);
});

test('저장소는 매개변수 쿼리를 사용하고 UUID 재시도·다른 날짜 삭제를 구별한다', async () => {
  const pool = { query: vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [event] }) };
  const repo = createRepository(pool);
  expect(await repo.add(event)).toEqual(event);
  expect(pool.query.mock.calls[0][1]).toEqual([event.id, event.date, event.title]);
  expect(pool.query.mock.calls[0][0]).not.toContain(event.title);
  pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: event.id }] });
  await expect(repo.remove('2026-10-08', event.id)).rejects.toMatchObject({ code: 'DATE_CONFLICT' });
  pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
  expect(await repo.remove(event.date, event.id)).toBe(false);
});

test('실제 계정이 관리자·RLS 우회·추가 역할 멤버이면 서버 시작을 거부한다', async () => {
  for (const flags of [{ rolsuper: true }, { rolbypassrls: true }, { memberships: true }, { name: 'postgres' }]) {
    const pool = { query: vi.fn(async () => ({ rows: [{ name: 'calendar_runtime', ...flags }] })) };
    await expect(verifyDatabase(pool)).rejects.toThrow('UNSAFE_ROLE');
  }
});
