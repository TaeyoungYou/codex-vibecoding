import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api as defaultApi } from './api.js';
import { getMonthCells, localDate, parseDateKey, shiftMonth } from './dates.js';
import { AuthGate } from './AuthGate.jsx';

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const dateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function Calendar({ month, selected, onSelect, onMove }) {
  return <section className="Calendar" aria-labelledby="calendar-month">
    <header className="Calendar__Header">
      <h2 className="Calendar__Month" id="calendar-month" lang="en">{monthFormat.format(localDate(month.year, month.month))}</h2>
      <div className="Calendar__Navigation" aria-label="월 이동">
        {[-1, 1].map((direction) => <button key={direction} className="Calendar__NavButton" type="button" data-direction={direction}
          aria-label={direction === -1 ? '이전 달' : '다음 달'} onClick={() => onMove(direction)}
          disabled={direction === -1 ? month.year === 1 && month.month === 0 : month.year === 9999 && month.month === 11}>
          <img className={`Calendar__NavIcon${direction === 1 ? ' Calendar__NavIcon--Next' : ''}`} src="/assets/chevron.svg" alt="" width="14" height="14" />
          <img className={`Calendar__NavIcon Calendar__NavIcon--Disabled${direction === 1 ? ' Calendar__NavIcon--Next' : ''}`} src="/assets/chevron-disabled.svg" alt="" width="14" height="14" />
        </button>)}
      </div>
    </header>
    <div className="Calendar__Weekdays" aria-hidden="true" lang="en">{weekdays.map((day) => <span key={day} className="Calendar__Weekday">{day}</span>)}</div>
    <div className="Calendar__Dates" id="calendar-dates" role="group" aria-labelledby="calendar-month">
      {getMonthCells(month.year, month.month).map((cell) => cell.isCurrentMonth
        ? <button key={cell.key} className={`Calendar__Day${selected === cell.key ? ' Calendar__Day--Selected' : ''}`} type="button"
          data-date={cell.key} aria-label={dateFormat.format(parseDateKey(cell.key))} aria-pressed={selected === cell.key} onClick={() => onSelect(cell.key)}>{cell.day}</button>
        : <span key={cell.key} className="Calendar__Day Calendar__Day--Outside" aria-hidden="true">{cell.day}</span>)}
    </div>
  </section>;
}

function Schedule({ date, api, announce, enabled }) {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef();
  const list = useRef();
  const alive = useRef(false);
  const mounted = useRef(false);
  const requests = useRef({ sequence: 0, controller: null });
  const mutation = useRef(false);
  const pendingAdd = useRef();
  const pendingFocus = useRef();
  const authFocus = useRef(false);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useLayoutEffect(() => {
    if (enabled && authFocus.current) input.current?.focus();
  }, [enabled]);

  const refresh = useCallback(async (foreground = false) => {
    const state = requests.current;
    const request = ++state.sequence;
    state.controller?.abort();
    state.controller = new AbortController();
    if (foreground) setLoading(true);
    try {
      const result = await api.list(date, state.controller.signal);
      if (!alive.current || request !== state.sequence) return false;
      setEvents(result);
      setReadError('');
      return true;
    } catch (failure) {
      if (alive.current && request === state.sequence && failure.name !== 'AbortError') setReadError(failure.message);
      return false;
    } finally { if (alive.current && request === state.sequence) setLoading(false); }
  }, [api, date]);

  useEffect(() => {
    const state = requests.current;
    if (!enabled) return;
    alive.current = true;
    void refresh(events.length === 0 && title === '');
    let timer;
    const requestRefresh = () => { clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 150); };
    const unsubscribe = api.subscribe(requestRefresh, () => {});
    const visible = () => { if (document.visibilityState === 'visible') requestRefresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      alive.current = false;
      state.sequence++;
      state.controller?.abort();
      clearTimeout(timer);
      unsubscribe();
      document.removeEventListener('visibilitychange', visible);
    };
  // Keep the mounted schedule's draft/list while auth is paused; they are not
  // effect dependencies because typing must never reconnect or requery.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, refresh, enabled]);

  useLayoutEffect(() => {
    if (!pendingFocus.current || busy) return;
    const index = pendingFocus.current.index;
    pendingFocus.current = null;
    const buttons = list.current?.querySelectorAll('button') ?? [];
    (buttons[index] ?? buttons[index - 1] ?? input.current)?.focus();
  }, [events, busy]);

  async function add(event) {
    event.preventDefault();
    if (mutation.current) return;
    const cleanTitle = title.trim();
    if (!cleanTitle || [...cleanTitle].length > 200) { setError('일정 제목을 1~200자로 입력해 주세요.'); input.current.focus(); return; }
    if (pendingAdd.current?.title !== cleanTitle) pendingAdd.current = { title: cleanTitle, id: crypto.randomUUID() };
    mutation.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await api.add(date, cleanTitle, pendingAdd.current.id);
      if (!alive.current) return;
      pendingAdd.current = null;
      setTitle('');
      setEvents((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
      announce('일정이 추가되었습니다.');
      await refresh();
    } catch (failure) { if (alive.current) setError(failure.message); }
    finally {
      mutation.current = false;
      if (mounted.current) setBusy(false);
      if (alive.current) requestAnimationFrame(() => { if (alive.current) input.current?.focus(); });
    }
  }

  async function remove(item, index) {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError('');
    try {
      await api.remove(date, item.id);
      if (!alive.current) return;
      pendingFocus.current = { index };
      setEvents((current) => current.filter((event) => event.id !== item.id));
      announce('일정이 삭제되었습니다.');
      await refresh();
    } catch (failure) { if (alive.current) setError(failure.message); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  }

  return <section className="Schedule" id="schedule" aria-labelledby="schedule-date" aria-busy={loading || busy}>
    <h2 className="Schedule__Date" id="schedule-date">{dateFormat.format(parseDateKey(date))}</h2>
    <form className="Schedule__Form" id="schedule-form" onSubmit={add} noValidate>
      <label className="Schedule__Label" htmlFor="schedule-title">일정 제목</label>
      <div className="Schedule__InputRow">
        <input ref={input} className="Schedule__Input" id="schedule-title" name="title" type="text" placeholder="어떤 일정을 기록할까요?"
          autoComplete="off" aria-describedby="schedule-error" aria-invalid={Boolean(error)} disabled={busy || loading}
          value={title} onFocus={() => { authFocus.current = true; }} onBlur={() => { if (enabled) authFocus.current = false; }}
          onChange={(event) => { setTitle(event.target.value); setError(''); if (pendingAdd.current?.title !== event.target.value.trim()) pendingAdd.current = null; }} />
        <button className="Schedule__AddButton" type="submit" disabled={busy || loading || Boolean(readError)}>{busy ? '처리 중…' : '추가'}</button>
      </div>
      <p className="Schedule__Error" id="schedule-error" role="alert" hidden={!error}>{error}</p>
    </form>
    {readError && <div className="Schedule__ReadError" role="alert"><p>{readError}</p><button className="Schedule__RetryButton" type="button" disabled={busy || loading} onClick={() => { void refresh(true); }}>다시 불러오기</button></div>}
    <ul ref={list} className="Schedule__List" id="schedule-list" aria-label="선택한 날짜의 일정">
      {events.map((item, index) => <li key={item.id} className="Schedule__Item">
        <span className="Schedule__Title">{item.title}</span>
        <button className="Schedule__DeleteButton" type="button" data-event-id={item.id} aria-label={`${item.title} 삭제`}
          disabled={busy || loading || Boolean(readError)} onClick={() => { void remove(item, index); }}>삭제</button>
      </li>)}
    </ul>
    <p className="Schedule__Empty" id="schedule-empty" hidden={events.length > 0 || Boolean(readError)}>{loading ? '일정을 불러오는 중입니다…' : '등록된 일정이 없습니다'}</p>
  </section>;
}

export function App({ api = defaultApi, today = new Date(), Widget }) {
  const [month, setMonth] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [selected, setSelected] = useState(null);
  const [connection, setConnection] = useState('connecting');
  const [storageError, setStorageError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [auth, setAuth] = useState({ authStatus: 'checking' });
  const [entered, setEntered] = useState(false);
  const authenticated = auth.authStatus === 'authenticated';

  useEffect(() => api.observeAuth((data) => {
    setAuth(data);
    if (data.authStatus === 'authenticated') setEntered(true);
  }), [api]);

  useEffect(() => {
    let channel;
    try {
      if (typeof window.BroadcastChannel === 'function') {
        channel = new window.BroadcastChannel('figma-calendar.auth');
        channel.onmessage = (event) => { if (event.data === 'auth-changed') void api.session(true).catch(() => {}); };
      }
    } catch { /* Tab focus still restores auth when BroadcastChannel is unavailable. */ }
    const visible = () => { if (document.visibilityState === 'visible') void api.session(true).catch(() => {}); };
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    // An idle tab without an SSE can still notice the one-hour expiry.
    const timer = setInterval(visible, 30000);
    return () => { channel?.close(); clearInterval(timer); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); };
  }, [api]);

  useEffect(() => {
    try { window.localStorage.removeItem('figma-calendar.events.v1'); }
    catch { setStorageError('기존 브라우저 일정을 삭제하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요. 일정은 서버에 저장됩니다.'); }
  }, [api]);

  useEffect(() => { if (authenticated) return api.subscribe(() => {}, setConnection); }, [api, authenticated]);

  const notifyAuthenticated = () => {
    try {
      if (typeof window.BroadcastChannel === 'function') {
        const channel = new window.BroadcastChannel('figma-calendar.auth');
        channel.postMessage('auth-changed');
        channel.close();
      }
    } catch { /* Focus/visibility synchronization is also available. */ }
  };

  const move = (direction) => {
    setMonth((current) => shiftMonth(current.year, current.month, direction));
    setSelected(null);
  };

  return <main className="CalendarApp" aria-label="캘린더와 날짜별 일정">
    <h1 className="CalendarApp__ScreenReaderOnly">캘린더</h1>
    {!authenticated && <AuthGate api={api} status={auth.authStatus} siteKey={auth.turnstileSiteKey} onAuthenticated={notifyAuthenticated} Widget={Widget} />}
    {entered && <div className="CalendarApp__Content" hidden={!authenticated}>
    <Calendar month={month} selected={selected} onSelect={setSelected} onMove={move} />
    <p className="CalendarApp__Connection" role="status">{connection === 'connected' ? '자동 동기화 연결됨' : connection === 'connecting' ? '자동 동기화 연결 중…' : '자동 동기화 연결이 끊겼습니다. 다시 연결하는 중입니다.'}</p>
    {storageError && <p className="CalendarApp__StorageError" id="storage-error" role="alert">{storageError}</p>}
    {selected && <Schedule key={selected} date={selected} api={api} announce={setAnnouncement} enabled={authenticated} />}
    </div>}
    <p className="CalendarApp__ScreenReaderOnly" id="app-status" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </main>;
}
