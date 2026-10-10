// @vitest-environment jsdom
import { afterEach, test, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { App } from '../client/src/App.jsx';
import { Turnstile, loadTurnstile } from '../client/src/AuthGate.jsx';

afterEach(() => { cleanup(); delete window.turnstile; });
const today = new Date(2026, 9, 7);
function fakeApi() {
  const data = new Map();
  const subscribers = new Set();
  const authListeners = new Set();
  let auth = { authStatus: 'authenticated', turnstileSiteKey: 'test-site' };
  return {
    data, subscribers, authListeners,
    observeAuth(listener) { authListeners.add(listener); listener(auth); return () => authListeners.delete(listener); },
    async session() { return auth; },
    signIn: vi.fn(async () => {}),
    setAuth(status) { auth = { ...auth, authStatus: status }; for (const listener of authListeners) listener(auth); },
    list: vi.fn(async (date) => [...(data.get(date) ?? [])]),
    add: vi.fn(async (date, title, id) => {
      const event = { id, date, title };
      data.set(date, [...(data.get(date) ?? []), event]);
      return event;
    }),
    remove: vi.fn(async (date, id) => { data.set(date, data.get(date).filter((event) => event.id !== id)); return true; }),
    subscribe(onChange, onStatus) {
      const listener = { onChange, onStatus };
      subscribers.add(listener);
      onStatus('connected');
      return () => subscribers.delete(listener);
    },
    notify() { for (const { onChange } of subscribers) onChange(); },
  };
}

test('초기 미선택·기존 저장 키만 삭제·월 이동 초기화·StrictMode 구독 정리', async () => {
  window.localStorage.setItem('figma-calendar.events.v1', 'old-private-data');
  window.localStorage.setItem('unrelated', 'keep');
  const api = fakeApi();
  const { unmount } = render(<StrictMode><App api={api} today={today} /></StrictMode>);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(window.localStorage.getItem('figma-calendar.events.v1')).toBeNull();
  expect(window.localStorage.getItem('unrelated')).toBe('keep');
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 7일 수요일' }));
  await waitFor(() => expect(screen.getByRole('textbox').disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }));
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(api.subscribers.size).toBe(1);
  unmount();
  expect(api.subscribers.size).toBe(0);
});

test('동일 제목은 독립적으로 저장·삭제되고 HTML 형태의 제목은 텍스트로 렌더링된다', async () => {
  const api = fakeApi();
  render(<App api={api} today={today} />);
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 7일 수요일' }));
  const input = screen.getByRole('textbox');
  await waitFor(() => expect(input.disabled).toBe(false));
  for (let count = 0; count < 2; count++) {
    fireEvent.change(input, { target: { value: '<img src=x onerror=alert(1)>' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(api.add).toHaveBeenCalledTimes(count + 1));
    await waitFor(() => expect(input.disabled).toBe(false));
  }
  expect(api.add.mock.calls[0][2]).not.toBe(api.add.mock.calls[1][2]);
  expect(document.querySelector('.Schedule__Title img')).toBeNull();
  fireEvent.click(screen.getAllByRole('button', { name: '<img src=x onerror=alert(1)> 삭제' })[0]);
  await waitFor(() => expect(screen.getAllByRole('button', { name: '<img src=x onerror=alert(1)> 삭제' })).toHaveLength(1));
});

test('추가 실패에서 입력·목록을 보존하고 재시도 UUID를 재사용한다', async () => {
  const api = fakeApi();
  api.add.mockRejectedValueOnce(new Error('저장 실패'));
  render(<App api={api} today={today} />);
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 7일 수요일' }));
  const input = screen.getByRole('textbox');
  await waitFor(() => expect(input.disabled).toBe(false));
  fireEvent.change(input, { target: { value: '공부하기' } });
  fireEvent.submit(document.querySelector('form'));
  await screen.findByText('저장 실패');
  expect(input.value).toBe('공부하기');
  fireEvent.submit(document.querySelector('form'));
  await waitFor(() => expect(api.add).toHaveBeenCalledTimes(2));
  expect(api.add.mock.calls[0][2]).toBe(api.add.mock.calls[1][2]);
});

test('이전 날짜의 늦은 응답이 새 날짜의 목록을 덮지 않는다', async () => {
  const api = fakeApi();
  let resolveOld;
  api.list.mockImplementation((date) => date === '2026-10-07' ? new Promise((resolve) => { resolveOld = resolve; }) : Promise.resolve([{ id: 'new', title: '새 날짜 일정' }]));
  render(<App api={api} today={today} />);
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 7일 수요일' }));
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 8일 목요일' }));
  await screen.findByText('새 날짜 일정');
  await act(async () => resolveOld([{ id: 'old', title: '이전 날짜 일정' }]));
  expect(screen.queryByText('이전 날짜 일정')).toBeNull();
});

test('조회 실패는 빈 상태와 구분되고 다시 불러오기로 복구한다', async () => {
  const api = fakeApi();
  api.list.mockRejectedValueOnce(new Error('조회 실패'));
  render(<App api={api} today={today} />);
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 7일 수요일' }));
  await screen.findByText('조회 실패');
  expect(screen.getByText('등록된 일정이 없습니다').hidden).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
  await screen.findByText('등록된 일정이 없습니다');
});

test('DB 알림 재조회는 입력·선택·초점을 유지하며 연속 알림을 합친다', async () => {
  const api = fakeApi();
  render(<StrictMode><App api={api} today={today} /></StrictMode>);
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 7일 수요일' }));
  const input = screen.getByRole('textbox');
  await waitFor(() => expect(input.disabled).toBe(false));
  input.focus();
  fireEvent.change(input, { target: { value: '입력 중인 제목' } });
  api.data.set('2026-10-07', [{ id: 'external', title: 'DB에서 추가한 일정' }]);
  const count = api.list.mock.calls.length;
  act(() => { api.notify(); api.notify(); api.notify(); });
  await screen.findByText('DB에서 추가한 일정');
  expect(api.list.mock.calls.length).toBe(count + 1);
  expect(input.value).toBe('입력 중인 제목');
  expect(document.activeElement).toBe(input);
});

test('자동 재조회 실패와 복구 중에도 기존 목록·초안·입력 초점을 유지한다', async () => {
  const api = fakeApi();
  api.data.set('2026-10-07', [{ id: 'existing', title: '기존 일정' }]);
  render(<StrictMode><App api={api} today={today} /></StrictMode>);
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 7일 수요일' }));
  await screen.findByText('기존 일정');
  const input = screen.getByRole('textbox');
  input.focus();
  fireEvent.change(input, { target: { value: '작성 중인 일정' } });
  api.list.mockRejectedValueOnce(new Error('자동 조회 실패'));
  act(() => api.notify());
  await screen.findByText('자동 조회 실패');
  expect(input.disabled).toBe(false);
  expect(document.activeElement).toBe(input);
  expect(screen.getByText('기존 일정')).toBeTruthy();
  expect(screen.getByRole('button', { name: '추가' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: '기존 일정 삭제' }).disabled).toBe(true);
  fireEvent.change(input, { target: { value: '계속 작성한 일정' } });
  api.data.set('2026-10-07', [{ id: 'recovered', title: '복구된 일정' }]);
  act(() => api.notify());
  await screen.findByText('복구된 일정');
  expect(screen.queryByText('자동 조회 실패')).toBeNull();
  expect(input.value).toBe('계속 작성한 일정');
  expect(document.activeElement).toBe(input);
  expect(document.querySelector('[aria-pressed="true"]').dataset.date).toBe('2026-10-07');
});

function TestWidget({ onToken, onError }) {
  return <><button type="button" onClick={() => onToken('fixture-captcha')}>테스트 CAPTCHA 완료</button>
    <button type="button" onClick={() => onError('CAPTCHA가 만료되었습니다.')}>테스트 CAPTCHA 만료</button></>;
}

test('입장 전 목록·SSE가 없고 CAPTCHA 이후 중복 클릭에도 로그인은 한 번이다', async () => {
  const api = fakeApi(); api.setAuth('unauthenticated');
  let complete;
  api.signIn.mockImplementationOnce(() => new Promise((resolve) => { complete = () => { api.setAuth('authenticated'); resolve(); }; }));
  render(<StrictMode><App api={api} today={today} Widget={TestWidget} /></StrictMode>);
  expect(screen.queryByText('October 2026')).toBeNull();
  expect(api.subscribers.size).toBe(0); expect(api.list).not.toHaveBeenCalled();
  const button = screen.getByRole('button', { name: '익명으로 시작' }); expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '테스트 CAPTCHA 완료' }));
  expect(button.disabled).toBe(false);
  fireEvent.submit(document.querySelector('form')); fireEvent.submit(document.querySelector('form'));
  expect(api.signIn).toHaveBeenCalledTimes(1);
  await act(async () => complete());
  expect(screen.getByText('October 2026')).toBeTruthy(); expect(api.subscribers.size).toBe(1);
});

test('인증 만료·장애 동안 초안·선택을 보존하고 복구 후 목록을 다시 읽는다', async () => {
  const api = fakeApi();
  render(<App api={api} today={today} Widget={TestWidget} />);
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 7일 수요일' }));
  await waitFor(() => expect(screen.getByRole('textbox').disabled).toBe(false));
  const input = screen.getByRole('textbox'); input.focus();
  fireEvent.change(input, { target: { value: '인증 중 유지할 초안' } });
  const reads = api.list.mock.calls.length;
  act(() => api.setAuth('unauthenticated'));
  expect(api.subscribers.size).toBe(0); expect(input.value).toBe('인증 중 유지할 초안');
  expect(document.querySelector('[aria-pressed="true"]').dataset.date).toBe('2026-10-07');
  fireEvent.click(screen.getByRole('button', { name: '테스트 CAPTCHA 완료' }));
  fireEvent.click(screen.getByRole('button', { name: '테스트 CAPTCHA 만료' }));
  expect(screen.getByRole('button', { name: '익명으로 시작' }).disabled).toBe(true);
  act(() => api.setAuth('unavailable'));
  expect(screen.getByRole('button', { name: '연결 다시 확인' })).toBeTruthy();
  api.data.set('2026-10-07', [{ id: 'new', title: '인증 복구 후 일정' }]);
  act(() => api.setAuth('authenticated'));
  await screen.findByText('인증 복구 후 일정');
  expect(api.list.mock.calls.length).toBeGreaterThan(reads);
  expect(input.value).toBe('인증 중 유지할 초안');
  expect(document.activeElement).toBe(input);
});

test('저장 중 인증이 중단되어도 재인증 후 입력과 같은 UUID 재시도가 잠기지 않는다', async () => {
  const api = fakeApi();
  let rejectWrite;
  api.add.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
  render(<App api={api} today={today} Widget={TestWidget} />);
  fireEvent.click(screen.getByRole('button', { name: '2026년 10월 7일 수요일' }));
  const input = screen.getByRole('textbox');
  await waitFor(() => expect(input.disabled).toBe(false));
  fireEvent.change(input, { target: { value: '다시 저장할 초안' } });
  fireEvent.submit(document.querySelector('.Schedule__Form'));
  act(() => api.setAuth('unauthenticated'));
  await act(async () => rejectWrite(new Error('다시 인증해 주세요.')));
  act(() => api.setAuth('authenticated'));
  await waitFor(() => expect(input.disabled).toBe(false));
  expect(input.value).toBe('다시 저장할 초안');
  fireEvent.submit(document.querySelector('.Schedule__Form'));
  await waitFor(() => expect(api.add).toHaveBeenCalledTimes(2));
  expect(api.add.mock.calls[0][2]).toBe(api.add.mock.calls[1][2]);
  await waitFor(() => expect(input.value).toBe(''));
});

test('Turnstile 스크립트는 공유하고 StrictMode에서 위젯 생성·제거를 정리한다', async () => {
  const renderWidget = vi.fn(() => 'widget-fixture'), remove = vi.fn();
  window.turnstile = { render: renderWidget, remove };
  const onToken = vi.fn(), onError = vi.fn();
  const { unmount } = render(<StrictMode><Turnstile siteKey="test-site" onToken={onToken} onError={onError} /></StrictMode>);
  await waitFor(() => expect(renderWidget).toHaveBeenCalledTimes(1));
  const callbacks = renderWidget.mock.calls[0][1];
  act(() => callbacks.callback('fixture-captcha')); expect(onToken).toHaveBeenLastCalledWith('fixture-captcha');
  act(() => callbacks['expired-callback']()); expect(onToken).toHaveBeenLastCalledWith(''); expect(onError).toHaveBeenCalledWith(expect.stringContaining('만료'));
  act(() => callbacks['error-callback']()); expect(onError).toHaveBeenCalledWith(expect.stringContaining('검증'));
  unmount(); expect(remove).toHaveBeenCalledTimes(1);
  act(() => callbacks.callback('late-token')); expect(onToken).not.toHaveBeenLastCalledWith('late-token');
});

test('Turnstile 스크립트 로딩 실패를 알려주고 재시도용 스크립트 하나만 만든다', async () => {
  const first = loadTurnstile(), second = loadTurnstile();
  expect(first).toBe(second);
  const script = document.querySelector('script[src*="challenges.cloudflare.com"]');
  script.dispatchEvent(new Event('error'));
  await expect(first).rejects.toThrow('스크립트');
  const retry = loadTurnstile();
  expect(document.querySelectorAll('script[src*="challenges.cloudflare.com"]')).toHaveLength(1);
  document.querySelector('script[src*="challenges.cloudflare.com"]').dispatchEvent(new Event('error'));
  await expect(retry).rejects.toThrow('스크립트');
});

test('화면 폭 변경 시 CAPTCHA를 다시 만들고 이전 토큰과 callback을 폐기한다', async () => {
  const originalWidth = window.innerWidth;
  const widgets = [];
  window.turnstile = {
    render: vi.fn((_container, options) => { widgets.push(options); return `widget-${widgets.length}`; }),
    remove: vi.fn(),
  };
  const onToken = vi.fn(), onError = vi.fn();
  try {
    window.innerWidth = 1280;
    render(<Turnstile siteKey="test-site" onToken={onToken} onError={onError} />);
    await waitFor(() => expect(widgets).toHaveLength(1));
    act(() => widgets[0].callback('old-token'));
    act(() => { window.innerWidth = 320; window.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(widgets).toHaveLength(2));
    expect(window.turnstile.remove).toHaveBeenCalledWith('widget-1');
    expect(widgets[1].size).toBe('compact');
    expect(onToken).toHaveBeenLastCalledWith('');
    act(() => widgets[0].callback('late-token'));
    expect(onToken).toHaveBeenLastCalledWith('');
  } finally { window.innerWidth = originalWidth; }
});
