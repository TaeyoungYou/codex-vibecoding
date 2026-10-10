import { afterEach, test, expect, vi } from 'vitest';
import { createApi } from '../client/src/api.js';

afterEach(() => vi.useRealTimers());
const token = 'c'.repeat(64);
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const authenticated = { csrfToken: token, authStatus: 'authenticated', turnstileSiteKey: 'test-site' };

test('동시 요청은 세션을 공유하고 세션 만료 시 같은 UUID로 한 번 재시도한다', async () => {
  const fetcher = vi.fn(async (url) => url === '/api/session' ? json(authenticated) : json({ events: [] }));
  const api = createApi(fetcher);
  await Promise.all([api.list('2026-10-07'), api.list('2026-10-08')]);
  expect(fetcher.mock.calls.filter(([url]) => url === '/api/session')).toHaveLength(1);
  fetcher.mockResolvedValueOnce(json({ code: 'SESSION_REQUIRED' }, 401))
    .mockResolvedValueOnce(json(authenticated))
    .mockResolvedValueOnce(json({ event: { id: 'request-id' } }));
  const result = await api.add('2026-10-07', '제목', 'request-id');
  expect(result.id).toBe('request-id');
  const posts = fetcher.mock.calls.filter(([url]) => url === '/api/events');
  expect(posts[0][1].body).toBe(posts[1][1].body);
  expect(posts[0][1].headers['X-Calendar-CSRF']).toBe(token);
  expect(posts[0][1].credentials).toBe('same-origin');
});

test('구독자들이 SSE 하나를 공유하고 마지막 구독 해제와 StrictMode 재구독을 정리한다', async () => {
  const sources = [];
  const makeSource = () => {
    const listeners = new Map();
    const source = { close: vi.fn(), addEventListener: (name, fn) => listeners.set(name, fn), emit: (name, data = {}) => listeners.get(name)?.({ data: JSON.stringify(data) }) };
    sources.push(source);
    return source;
  };
  const api = createApi(async () => json(authenticated), makeSource);
  const first = vi.fn(), second = vi.fn(), status = vi.fn();
  const stopFirst = api.subscribe(first, status);
  const stopSecond = api.subscribe(second, status);
  await vi.waitFor(() => expect(sources).toHaveLength(1));
  sources[0].emit('ready', { status: 'connected' });
  sources[0].emit('change');
  expect(first).toHaveBeenCalledTimes(2);
  expect(second).toHaveBeenCalledTimes(2);
  stopFirst();
  expect(sources[0].close).not.toHaveBeenCalled();
  stopSecond();
  expect(sources[0].close).toHaveBeenCalledTimes(1);
  const stop = api.subscribe(first, status);
  stop();
  await Promise.resolve();
  expect(sources).toHaveLength(1);
});

test('SSE 재연결은 지수 지연을 사용하고 재연결 시 누락 변경을 재조회하며 종료 시 취소한다', async () => {
  vi.useFakeTimers();
  const sources = [];
  const api = createApi(async () => json(authenticated), () => {
    const listeners = new Map();
    const source = { close: vi.fn(), addEventListener: (key, fn) => listeners.set(key, fn), emit: (key, data) => listeners.get(key)?.({ data: JSON.stringify(data) }) };
    sources.push(source); return source;
  });
  const change = vi.fn(), status = vi.fn();
  const stop = api.subscribe(change, status);
  await vi.advanceTimersByTimeAsync(0);
  sources[0].onerror();
  expect(status).toHaveBeenLastCalledWith('disconnected');
  await vi.advanceTimersByTimeAsync(999);
  expect(sources).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(sources).toHaveLength(2);
  sources[1].emit('ready', { status: 'connected' });
  expect(change).toHaveBeenCalledTimes(1);
  sources[1].onerror();
  stop();
  await vi.advanceTimersByTimeAsync(30000);
  expect(sources).toHaveLength(2);
});

test('401 미인증은 자동 로그인·쓰기 재시도 없이 입장 화면에 알린다', async () => {
  const fetcher = vi.fn(async (url) => url === '/api/session'
    ? json({ ...authenticated, authStatus: 'unauthenticated' }) : json({ code: 'AUTH_REQUIRED', message: '다시 인증' }, 401));
  const api = createApi(fetcher), changed = vi.fn();
  const stop = api.observeAuth(changed);
  await expect(api.add('2026-10-07', '제목', 'id')).rejects.toMatchObject({ status: 401 });
  expect(fetcher.mock.calls.filter(([url]) => url === '/api/events')).toHaveLength(1);
  expect(fetcher.mock.calls.some(([url]) => url === '/api/auth/anonymous')).toBe(false);
  expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ authStatus: 'unauthenticated' })); stop();
});

test('다른 탭의 CSRF 교체는 동일 CAPTCHA로 안전하게 한 번 재시도하고 로그인 요청을 합친다', async () => {
  const rotated = { ...authenticated, csrfToken: 'd'.repeat(64) };
  const fetcher = vi.fn().mockResolvedValueOnce(json({ ...authenticated, authStatus: 'unauthenticated' }))
    .mockResolvedValueOnce(json({ code: 'CSRF_REQUIRED' }, 403)).mockResolvedValueOnce(json(rotated)).mockResolvedValueOnce(json(rotated));
  const api = createApi(fetcher);
  const first = api.signIn('fixture-captcha'), second = api.signIn('fixture-captcha');
  expect(first).toBe(second); await first;
  const posts = fetcher.mock.calls.filter(([url]) => url === '/api/auth/anonymous');
  expect(posts).toHaveLength(2); expect(posts[0][1].body).toBe(posts[1][1].body);
  expect(posts[1][1].headers['X-Calendar-CSRF']).toBe(rotated.csrfToken);
});

test('서버 재시작 후 CAPTCHA 소비 전 SESSION_REQUIRED는 새 로컬 세션으로 한 번 재시도한다', async () => {
  const unauthenticated = { ...authenticated, authStatus: 'unauthenticated' };
  const rotated = { ...unauthenticated, csrfToken: 'e'.repeat(64) };
  const fetcher = vi.fn().mockResolvedValueOnce(json(unauthenticated))
    .mockResolvedValueOnce(json({ code: 'SESSION_REQUIRED' }, 401))
    .mockResolvedValueOnce(json(rotated)).mockResolvedValueOnce(json(authenticated));
  const api = createApi(fetcher);
  await expect(api.signIn('unconsumed-captcha')).resolves.toMatchObject({ authStatus: 'authenticated' });
  const posts = fetcher.mock.calls.filter(([url]) => url === '/api/auth/anonymous');
  expect(posts).toHaveLength(2);
  expect(posts[0][1].body).toBe(posts[1][1].body);
  expect(posts[1][1].headers['X-Calendar-CSRF']).toBe(rotated.csrfToken);
});

test('인증 API의 다른 401은 CAPTCHA를 다시 제출하지 않는다', async () => {
  const unauthenticated = { ...authenticated, authStatus: 'unauthenticated' };
  const fetcher = vi.fn().mockResolvedValueOnce(json(unauthenticated))
    .mockResolvedValueOnce(json({ code: 'AUTH_REQUIRED' }, 401)).mockResolvedValueOnce(json(unauthenticated));
  await expect(createApi(fetcher).signIn('captcha')).rejects.toMatchObject({ status: 401 });
  expect(fetcher.mock.calls.filter(([url]) => url === '/api/auth/anonymous')).toHaveLength(1);
});
