import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { ApiError } from './validation.js';

const required = () => new ApiError(401, 'AUTH_REQUIRED', '인증이 만료되었습니다. CAPTCHA를 다시 완료해 주세요.');
const unavailable = () => new ApiError(503, 'AUTH_UNAVAILABLE', '인증 서비스에 연결하지 못했습니다. 잠시 뒤 연결을 다시 확인해 주세요.');

function failure(error, signingIn = false) {
  if (error?.status === 429) return new ApiError(429, 'AUTH_RATE_LIMITED', '인증 요청이 너무 많습니다. 잠시 뒤 새 CAPTCHA로 다시 시도해 주세요.');
  if (!error?.status || error.status >= 500 || error.name === 'AuthRetryableFetchError') return unavailable();
  return signingIn
    ? new ApiError(400, 'CAPTCHA_REJECTED', 'CAPTCHA 검증에 실패했습니다. 새 CAPTCHA를 완료해 주세요.')
    : required();
}

// Every local session owns a client: refresh coordination must never cross users.
export function createAuthService({ url, key }, { now = Date.now, makeClient = createClient } = {}) {
  function clientFor(state) {
    state.client ??= makeClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `calendar-${randomBytes(16).toString('hex')}` },
      global: { fetch: (input, options = {}) => fetch(input, { ...options, signal: AbortSignal.any([state.controller.signal, AbortSignal.timeout(10000), ...(options.signal ? [options.signal] : [])]) }) },
    });
    return state.client;
  }
  return {
    createSession() { return { client: null, credentials: null, expires: 0, refreshing: null, closed: false, controller: new AbortController() }; },
    restoreSession(credentials, expires) {
      return { ...this.createSession(), credentials, expires };
    },
    async signIn(state, captchaToken) {
      if (state.closed) throw required();
      clientFor(state);
      let result;
      try { result = await state.client.auth.signInAnonymously({ options: { captchaToken } }); }
      catch { throw unavailable(); }
      if (result.error) throw failure(result.error, true);
      if (state.closed || !result.data?.session?.access_token || !result.data.session.refresh_token || result.data.user?.is_anonymous !== true) throw required();
      state.credentials = result.data.session;
      state.expires = now() + 3600000;
    },
    async authorize(state) {
      if (!state || state.closed || !state.credentials || state.expires <= now()) throw required();
      clientFor(state);
      if (state.credentials.expires_at * 1000 <= now() + 60000) {
        if (!state.refreshing) state.refreshing = (async () => {
          let result;
          try { result = await state.client.auth.refreshSession({ refresh_token: state.credentials.refresh_token }); }
          catch { throw unavailable(); }
          if (result.error) throw failure(result.error);
          if (state.closed || state.expires <= now() || !result.data?.session?.access_token || !result.data.session.refresh_token) throw required();
          state.credentials = result.data.session;
        })().finally(() => { state.refreshing = null; });
        await state.refreshing;
      }
      let result;
      try { result = await state.client.auth.getUser(state.credentials.access_token); }
      catch { throw unavailable(); }
      if (result.error) throw failure(result.error);
      if (state.closed || state.expires <= now() || result.data?.user?.is_anonymous !== true) throw required();
    },
    clear(state) {
      if (!state) return;
      state.closed = true;
      state.controller.abort();
      state.credentials = null;
      const client = state.client;
      state.client = null;
      // No network signOut on shutdown; tokens and SDK memory are discarded locally.
      void client?.auth.dispose().catch(() => {});
    },
  };
}
