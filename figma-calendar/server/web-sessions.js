import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { ApiError } from './validation.js';

export const sessionHash = (token) => createHash('sha256').update(token).digest('hex');

export function createSessionCipher(secret) {
  const key = Buffer.from(secret, 'base64url');
  if (key.length !== 32) throw new Error('INVALID_SESSION_KEY');
  return {
    seal(value, id) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(id));
      const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64url');
    },
    open(value, id) {
      const bytes = Buffer.from(value, 'base64url');
      const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
      decipher.setAAD(Buffer.from(id));
      decipher.setAuthTag(bytes.subarray(12, 28));
      return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    },
  };
}

export function readSessionToken(cookie = '') {
  const matches = cookie.split(';').map((part) => part.trim()).filter((part) => part.startsWith('calendar_session='));
  if (matches.length !== 1) return null;
  const token = matches[0].slice('calendar_session='.length);
  return /^[0-9a-f]{64}$/.test(token) ? token : null;
}

export function createWebSessionStore(client, cipher, now = Date.now) {
  return {
    async rate(scope, limit) {
      const minute = Math.floor(now() / 60000);
      const { rows: [row] } = await client.query(`INSERT INTO calendar_private.web_limits (bucket, hits, expires_at)
        VALUES ($1, 1, $2) ON CONFLICT (bucket) DO UPDATE SET hits = web_limits.hits + 1 RETURNING hits`,
      [`${scope}:${minute}`, new Date((minute + 2) * 60000)]);
      if (row.hits > limit) throw new ApiError(429, 'RATE_LIMITED', '요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.');
    },
    async cleanup() {
      await client.query(`DELETE FROM calendar_private.web_sessions WHERE id IN
        (SELECT id FROM calendar_private.web_sessions WHERE expires_at <= $1 ORDER BY expires_at LIMIT 128 FOR UPDATE SKIP LOCKED)`, [new Date(now())]);
      await client.query(`DELETE FROM calendar_private.web_limits WHERE bucket IN
        (SELECT bucket FROM calendar_private.web_limits WHERE expires_at <= $1 ORDER BY expires_at LIMIT 256 FOR UPDATE SKIP LOCKED)`, [new Date(now())]);
    },
    async load(token) {
      if (!token) return null;
      const { rows: [row] } = await client.query('SELECT id, csrf, auth_data, expires_at FROM calendar_private.web_sessions WHERE id = $1 AND expires_at > $2 FOR UPDATE', [sessionHash(token), new Date(now())]);
      if (!row) return null;
      let authentication = null;
      if (row.auth_data) {
        try { authentication = cipher.open(row.auth_data, row.id); }
        catch {
          await client.query('UPDATE calendar_private.web_sessions SET auth_data = NULL WHERE id = $1', [row.id]);
        }
      }
      return { id: row.id, token, csrf: row.csrf, expires: new Date(row.expires_at).getTime(), authentication };
    },
    async create() {
      const token = randomBytes(32).toString('hex');
      const session = { id: sessionHash(token), token, csrf: randomBytes(32).toString('hex'), expires: now() + 3600000, authentication: null };
      await client.query('INSERT INTO calendar_private.web_sessions (id, csrf, expires_at) VALUES ($1, $2, $3)', [session.id, session.csrf, new Date(session.expires)]);
      return session;
    },
    async save(session) {
      const encrypted = session.authentication ? cipher.seal(session.authentication, session.id) : null;
      await client.query('UPDATE calendar_private.web_sessions SET auth_data = $2 WHERE id = $1', [session.id, encrypted]);
    },
    async rotate(session) {
      const previous = session.id;
      session.token = randomBytes(32).toString('hex');
      session.id = sessionHash(session.token);
      session.csrf = randomBytes(32).toString('hex');
      session.expires = now() + 3600000;
      await client.query(`UPDATE calendar_private.web_sessions SET id = $2, csrf = $3, expires_at = $4, auth_data = $5 WHERE id = $1`,
        [previous, session.id, session.csrf, new Date(session.expires), cipher.seal(session.authentication, session.id)]);
    },
  };
}
