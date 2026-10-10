import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_REF = 'fnqefwbxqtanhnfpxrml';
export const POOLER_HOST = 'aws-1-ca-central-1.pooler.supabase.com';
export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const ORIGIN = 'http://127.0.0.1:4175';

export class ConfigurationError extends Error {}

export function loadAuthConfiguration(env = process.env) {
  const names = ['CALENDAR_SUPABASE_URL', 'CALENDAR_SUPABASE_PUBLISHABLE_KEY', 'CALENDAR_TURNSTILE_SITE_KEY'];
  if (names.some((name) => !env[name]?.trim())) throw new ConfigurationError('Auth 설정 누락: CALENDAR_SUPABASE_URL / CALENDAR_SUPABASE_PUBLISHABLE_KEY / CALENDAR_TURNSTILE_SITE_KEY를 설정하세요.');
  if (env.CALENDAR_SUPABASE_URL !== `https://${PROJECT_REF}.supabase.co`
    || !/^sb_publishable_[A-Za-z0-9_-]{15,}$/.test(env.CALENDAR_SUPABASE_PUBLISHABLE_KEY)
    || !/^0x[A-Za-z0-9_-]{20,}$/.test(env.CALENDAR_TURNSTILE_SITE_KEY)) {
    throw new ConfigurationError('calendar-app의 프로젝트 URL·publishable key·Turnstile site key를 확인하세요. 관리자·secret·service-role key는 사용할 수 없습니다.');
  }
  return { url: env.CALENDAR_SUPABASE_URL, key: env.CALENDAR_SUPABASE_PUBLISHABLE_KEY, siteKey: env.CALENDAR_TURNSTILE_SITE_KEY };
}

export function loadConfiguration(env = process.env) {
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new ConfigurationError('NODE_TLS_REJECT_UNAUTHORIZED를 제거하세요. TLS 검증을 비활성화할 수 없습니다.');
  const publicSecrets = Object.keys(env).filter((name) => /^VITE_.*(?:PASSWORD|SECRET|TOKEN|API_KEY|SERVICE_ROLE|DATABASE)/i.test(name));
  if (publicSecrets.length) throw new ConfigurationError(`공개 환경 변수에서 민감 설정을 제거하세요: ${publicSecrets.join(', ')}.`);
  const required = ['CALENDAR_DB_HOST', 'CALENDAR_DB_PORT', 'CALENDAR_DB_USER', 'CALENDAR_DB_PASSWORD'];
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) throw new ConfigurationError(`서버 설정 누락: ${missing.join(', ')}. npm run setup으로 설정해 주세요.`);
  if (env.CALENDAR_DB_HOST !== POOLER_HOST
    || env.CALENDAR_DB_PORT !== '5432'
    || env.CALENDAR_DB_USER !== `calendar_runtime.${PROJECT_REF}`) {
    throw new ConfigurationError('CALENDAR_DB_HOST / CALENDAR_DB_PORT / CALENDAR_DB_USER를 확인해 주세요. calendar-app의 session pooler와 전용 계정만 사용할 수 있습니다.');
  }
  let ca;
  if (env.CALENDAR_DB_CA_CERT_PATH) {
    try { ca = fs.readFileSync(path.resolve(ROOT, env.CALENDAR_DB_CA_CERT_PATH), 'utf8'); }
    catch { throw new ConfigurationError('CALENDAR_DB_CA_CERT_PATH 인증서 파일을 확인해 주세요.'); }
    if (!ca.includes('-----BEGIN CERTIFICATE-----')) throw new ConfigurationError('CALENDAR_DB_CA_CERT_PATH에 올바른 공개 CA 인증서가 필요합니다.');
  }
  return {
    host: env.CALENDAR_DB_HOST,
    port: 5432,
    user: env.CALENDAR_DB_USER,
    password: env.CALENDAR_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    connectionTimeoutMillis: 10000,
    statement_timeout: 5000,
    application_name: 'calendar-local',
    max: 2,
  };
}
