export class RequestError extends Error {
  constructor(message, status = 0, code = 'NETWORK_ERROR') { super(message); this.status = status; this.code = code; }
}

export function createApi(fetcher = (...args) => fetch(...args), makeSource = (url) => new EventSource(url)) {
  let csrf;
  let bootstrap;
  let sessionData;
  let signingIn;
  let authRevision = 0;
  const authListeners = new Set();
  const subscribers = new Set();
  let transport;
  let connectionStatus = 'connecting';

  async function readResponse(response) {
    let data;
    try { data = await response.json(); } catch { throw new RequestError('서버 응답을 확인하지 못했습니다. 다시 시도해 주세요.'); }
    if (!response.ok) throw new RequestError(data.message || '요청을 처리하지 못했습니다.', response.status, data.code);
    return data;
  }

  function publish(data) {
    sessionData = data;
    csrf = data.csrfToken;
    if (data.authStatus !== 'authenticated') { transport?.(); transport = null; }
    for (const listener of authListeners) listener(data);
  }

  async function session(force = false) {
    if (!force && csrf) return sessionData;
    if (!bootstrap) bootstrap = (async () => {
      const revision = authRevision;
      try {
        const data = await readResponse(await fetcher('/api/session', { credentials: 'same-origin', cache: 'no-store' }));
        if (!/^[0-9a-f]{64}$/.test(data.csrfToken)) throw new RequestError('로컬 연결을 확인하지 못했습니다.');
        if (!['authenticated', 'unauthenticated', 'unavailable'].includes(data.authStatus)) throw new RequestError('인증 상태를 확인하지 못했습니다.');
        if (revision === authRevision) publish(data);
        return sessionData;
      } catch (error) {
        if (revision === authRevision) publish({ ...sessionData, authStatus: 'unavailable' });
        throw error;
      } finally { bootstrap = null; }
    })();
    return bootstrap;
  }

  async function request(url, options = {}, retry = true) {
    try {
      const { csrfToken: token } = await session();
      const response = await fetcher(url, {
        credentials: 'same-origin', cache: 'no-store', ...options,
        headers: { ...(options.method ? { 'Content-Type': 'application/json', 'X-Calendar-CSRF': token } : {}), ...options.headers },
      });
      if (response.status === 401 && retry) {
        const error = await readResponse(response).catch((failure) => failure);
        const data = await session(true);
        // SESSION_REQUIRED is rejected before the CAPTCHA is consumed. After a
        // server restart, bootstrap a fresh local session and submit it once.
        if (data.authStatus === 'authenticated' || (url === '/api/auth/anonymous' && error.code === 'SESSION_REQUIRED')) return request(url, options, false);
        throw error;
      }
      // A different tab can rotate the cookie/CSRF before this request. The server
      // rejects CSRF before consuming a CAPTCHA or executing a write, so retry once.
      if (response.status === 403 && retry) {
        const data = await readResponse(response).catch((error) => error);
        if (data.code === 'CSRF_REQUIRED') { await session(true); return request(url, options, false); }
        throw data;
      }
      if (response.status === 503) {
        const error = await readResponse(response).catch((failure) => failure);
        if (error.code === 'AUTH_UNAVAILABLE') publish({ ...sessionData, authStatus: 'unavailable' });
        throw error;
      }
      return await readResponse(response);
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof RequestError) throw error;
      throw new RequestError('서버에 연결하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
    }
  }

  function openTransport() {
    let source;
    let retryTimer;
    let stopped = false;
    let attempt = 0;
    const status = (value) => {
      if (stopped) return;
      connectionStatus = value;
      for (const listener of subscribers) listener.onStatus(value);
    };
    const changed = () => { if (!stopped) for (const listener of subscribers) listener.onChange(); };
    const receiveStatus = (event, ready = false) => {
      if (stopped) return;
      try {
        const value = JSON.parse(event.data).status;
        if (!['connecting', 'connected', 'disconnected'].includes(value)) throw new Error();
        attempt = 0;
        status(value);
        if (ready || value === 'connected') changed();
      } catch { reconnect(); }
    };
    async function connect() {
      if (stopped) return;
      try {
        const data = await session(true);
        if (data.authStatus !== 'authenticated') return;
        if (stopped) return;
        source = makeSource('/api/changes');
        source.addEventListener('ready', (event) => receiveStatus(event, true));
        source.addEventListener('change', changed);
        source.addEventListener('status', receiveStatus);
        source.addEventListener('auth', (event) => {
          try {
            const value = JSON.parse(event.data).authStatus;
            if (!['unauthenticated', 'unavailable'].includes(value)) throw new Error();
            publish({ ...sessionData, authStatus: value });
          } catch { reconnect(); }
        });
        source.onerror = reconnect;
      } catch { reconnect(); }
    }
    function reconnect() {
      source?.close();
      source = null;
      if (stopped || retryTimer) return;
      status('disconnected');
      retryTimer = setTimeout(() => { retryTimer = null; void connect(); }, Math.min(1000 * 2 ** attempt++, 30000));
    }
    status('connecting');
    void connect();
    return () => { stopped = true; clearTimeout(retryTimer); source?.close(); };
  }

  return {
    session,
    observeAuth(listener) {
      authListeners.add(listener);
      if (sessionData) listener(sessionData);
      void session().catch(() => {});
      return () => authListeners.delete(listener);
    },
    signIn(captchaToken) {
      if (!signingIn) signingIn = request('/api/auth/anonymous', { method: 'POST', body: JSON.stringify({ captchaToken }) })
        .then((data) => { authRevision++; publish(data); return data; }).finally(() => { signingIn = null; });
      return signingIn;
    },
    async list(date, signal) { return (await request(`/api/events?date=${encodeURIComponent(date)}`, { signal })).events; },
    async add(date, title, id) { return (await request('/api/events', { method: 'POST', body: JSON.stringify({ id, date, title }) })).event; },
    async remove(date, id) { return (await request(`/api/events/${encodeURIComponent(id)}?date=${encodeURIComponent(date)}`, { method: 'DELETE', body: '{}' })).removed; },
    subscribe(onChange, onStatus) {
      const listener = { onChange, onStatus };
      subscribers.add(listener);
      if (!transport) transport = openTransport();
      else onStatus(connectionStatus);
      return () => {
        subscribers.delete(listener);
        if (!subscribers.size) { transport?.(); transport = null; }
      };
    },
  };
}

export const api = createApi();
