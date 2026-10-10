import { test, expect, vi } from 'vitest';
import { createAuthService } from '../server/auth.js';
import { loadAuthConfiguration, ConfigurationError } from '../server/config.js';

function fixture() {
  let clock = Date.now();
  const clients = [];
  const credentials = () => ({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_at: Math.floor(clock / 1000) + 3600 });
  const makeClient = vi.fn(() => {
    const client = { auth: {
      signInAnonymously: vi.fn(async () => ({ data: { session: credentials(), user: { is_anonymous: true } }, error: null })),
      refreshSession: vi.fn(async () => ({ data: { session: { ...credentials(), refresh_token: 'fixture-rotated' } }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: { is_anonymous: true } }, error: null })),
      dispose: vi.fn(async () => {}),
    } };
    clients.push(client);
    return client;
  });
  const service = createAuthService({ url: 'https://fixture.invalid', key: 'fixture-key' }, { now: () => clock, makeClient });
  return { service, clients, makeClient, advance(ms) { clock += ms; } };
}

test('세션별 SDK를 격리하고 저장·자동 갱신·URL 감지를 끄며 getUser로 검증한다', async () => {
  const f = fixture(), first = f.service.createSession(), second = f.service.createSession();
  await f.service.signIn(first, 'fixture-captcha');
  await f.service.signIn(second, 'fixture-captcha-2');
  expect(f.makeClient).toHaveBeenCalledTimes(2);
  expect(first.client).not.toBe(second.client);
  const options = f.makeClient.mock.calls.map((call) => call[2].auth);
  expect(options[0]).toMatchObject({ persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
  expect(options[0].storageKey).not.toBe(options[1].storageKey);
  expect(first.client.auth.signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: 'fixture-captcha' } });
  await f.service.authorize(first);
  expect(first.client.auth.getUser).toHaveBeenCalledWith('fixture-access');
  f.service.clear(first); f.service.clear(second);
  expect(first.credentials).toBeNull();
  expect(first.client).toBeNull();
  expect(f.clients[0].auth.dispose).toHaveBeenCalledTimes(1);
});

test('동시 갱신은 한 번만 실행하고 회전된 토큰으로 검증하며 최대 한 시간은 연장하지 않는다', async () => {
  const f = fixture(), state = f.service.createSession();
  await f.service.signIn(state, 'captcha');
  const limit = state.expires;
  f.advance(3541000);
  let release;
  state.client.auth.refreshSession.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  const requests = [f.service.authorize(state), f.service.authorize(state)];
  release({ data: { session: { access_token: 'rotated-access', refresh_token: 'rotated-refresh', expires_at: Math.floor(limit / 1000) + 3600 } }, error: null });
  await Promise.all(requests);
  expect(state.client.auth.refreshSession).toHaveBeenCalledTimes(1);
  expect(state.client.auth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'fixture-refresh' });
  expect(state.client.auth.getUser).toHaveBeenCalledWith('rotated-access');
  expect(state.expires).toBe(limit);
  f.advance(60000);
  await expect(f.service.authorize(state)).rejects.toMatchObject({ status: 401 });
  f.service.clear(state);
});

test('비익명 사용자·폐기된 세션을 거부하고 장애·429·CAPTCHA 오류를 구분해 원본을 숨긴다', async () => {
  const f = fixture(), state = f.service.createSession();
  await f.service.signIn(state, 'captcha');
  state.client.auth.getUser.mockResolvedValueOnce({ data: { user: { is_anonymous: false } } });
  await expect(f.service.authorize(state)).rejects.toMatchObject({ status: 401 });
  state.client.auth.getUser.mockResolvedValueOnce({ error: { status: 503, message: 'private-upstream-message' } });
  await expect(f.service.authorize(state)).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' });
  for (const [status, expected] of [[429, 'AUTH_RATE_LIMITED'], [400, 'CAPTCHA_REJECTED'], [503, 'AUTH_UNAVAILABLE']]) {
    state.client.auth.signInAnonymously.mockResolvedValueOnce({ error: { status, message: 'private-upstream-message' } });
    await expect(f.service.signIn(state, 'captcha')).rejects.toMatchObject({ code: expected });
  }
  expect(state.client.auth.signInAnonymously).toHaveBeenCalledTimes(4);
  f.service.clear(state);
  await expect(f.service.authorize(state)).rejects.toMatchObject({ status: 401 });
});

test('종료 중 도착한 갱신 결과는 폐기된 세션의 토큰을 되살리지 않는다', async () => {
  const f = fixture(), state = f.service.createSession();
  await f.service.signIn(state, 'captcha');
  f.advance(3541000);
  let release;
  state.client.auth.refreshSession.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
  const request = f.service.authorize(state);
  f.service.clear(state);
  release({ data: { session: { access_token: 'late-access', refresh_token: 'late-refresh' } } });
  await expect(request).rejects.toMatchObject({ status: 401 });
  expect(state.credentials).toBeNull();
});

test('세션 폐기는 진행 중인 Auth fetch도 취소한다', async () => {
  const f = fixture(), state = f.service.createSession();
  await f.service.signIn(state, 'captcha');
  const originalFetch = globalThis.fetch;
  let signal;
  globalThis.fetch = vi.fn((_input, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  });
  try {
    const request = f.makeClient.mock.calls[0][2].global.fetch('https://fixture.invalid/auth');
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    f.service.clear(state);
    await rejected;
    expect(signal.aborted).toBe(true);
    expect(state.credentials).toBeNull();
  } finally { globalThis.fetch = originalFetch; }
});

test('Auth 설정 누락·다른 프로젝트·관리 키를 시작 전에 거부한다', () => {
  const env = { CALENDAR_SUPABASE_URL: 'https://fnqefwbxqtanhnfpxrml.supabase.co', CALENDAR_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_' + 'f'.repeat(24), CALENDAR_TURNSTILE_SITE_KEY: '0x4AAAAAAFQ0QgN6p9EFSCKh' };
  expect(loadAuthConfiguration(env).url).toBe(env.CALENDAR_SUPABASE_URL);
  expect(() => loadAuthConfiguration({})).toThrow(ConfigurationError);
  for (const override of [{ CALENDAR_SUPABASE_URL: 'https://another.supabase.co' }, { CALENDAR_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_' + 'f'.repeat(24) }, { CALENDAR_TURNSTILE_SITE_KEY: '' }]) {
    expect(() => loadAuthConfiguration({ ...env, ...override })).toThrow(ConfigurationError);
  }
});
