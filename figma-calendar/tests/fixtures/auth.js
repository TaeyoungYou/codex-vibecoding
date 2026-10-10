import { ApiError } from '../../server/validation.js';

// Isolated local test service. Never imported by the application entry point.
export function mockAuth(now = Date.now) {
  return {
    createSession: () => ({ credentials: null, expires: 0 }),
    async signIn(state, token) {
      if (token === 'forged' || token === 'expired' || token === 'reused') throw new ApiError(400, 'CAPTCHA_REJECTED', '새 CAPTCHA를 완료해 주세요.');
      state.credentials = { marker: 'fixture-auth-only' };
      state.expires = now() + 3600000;
    },
    async authorize(state) { if (!state.credentials || state.expires <= now()) throw new ApiError(401, 'AUTH_REQUIRED', '다시 인증해 주세요.'); },
    clear(state) { state.credentials = null; },
  };
}

export const testSiteKey = '1x00000000000000000000AA';
